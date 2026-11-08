package az.it25patok.assignment;

import az.it25patok.auth.AuthUser;
import az.it25patok.common.ApiException;
import az.it25patok.common.AuditService;
import az.it25patok.common.Db;
import az.it25patok.common.Text;
import az.it25patok.common.Time;
import az.it25patok.file.FileDto;
import az.it25patok.file.FileRepository;
import az.it25patok.file.FileService;
import az.it25patok.file.StoredFile;
import az.it25patok.group.Group;
import az.it25patok.group.GroupRepository;
import az.it25patok.subject.Subject;
import az.it25patok.subject.SubjectRepository;
import az.it25patok.submission.Submission;
import az.it25patok.submission.SubmissionRepository;
import az.it25patok.user.User;
import az.it25patok.user.UserRepository;
import org.owasp.html.HtmlPolicyBuilder;
import org.owasp.html.PolicyFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class AssignmentService {
    private static final PolicyFactory HTML_POLICY = new HtmlPolicyBuilder()
            .allowElements("p", "br", "strong", "b", "em", "i", "u", "s", "ul", "ol", "li",
                    "h1", "h2", "h3", "blockquote", "code", "pre", "a")
            .allowAttributes("href").onElements("a")
            .allowUrlProtocols("https", "http", "mailto")
            .requireRelNofollowOnLinks()
            .toFactory();

    private final AssignmentRepository assignments;
    private final SubmissionRepository submissions;
    private final SubjectRepository subjects;
    private final GroupRepository groups;
    private final UserRepository users;
    private final FileService files;
    private final FileRepository fileRepository;
    private final AuditService audit;

    public AssignmentService(AssignmentRepository assignments, SubmissionRepository submissions,
                             SubjectRepository subjects, GroupRepository groups, UserRepository users,
                             FileService files, FileRepository fileRepository, AuditService audit) {
        this.assignments = assignments;
        this.submissions = submissions;
        this.subjects = subjects;
        this.groups = groups;
        this.users = users;
        this.files = files;
        this.fileRepository = fileRepository;
        this.audit = audit;
    }

    public AssignmentDtos.DetailDto create(AuthUser auth, AssignmentDtos.CreateRequest request) {
        requireTeacher(auth);
        List<String> groupIds = cleanGroups(request.groupIds());
        validateTeaching(auth.id(), request.subjectId(), groupIds);
        String description = request.description() == null ? null : HTML_POLICY.sanitize(request.description());
        String id = assignments.create(auth.id(), request.subjectId(), request.type(),
                Text.clean(request.title(), 200), description, request.deadline(), request.maxScore(),
                request.allowLate() == null || request.allowLate(), groupIds);
        audit.log("ASSIGNMENT_CREATED", "ASSIGNMENT", id, Map.of("title", Text.clean(request.title(), 200)));
        return detail(id, auth);
    }

    public AssignmentDtos.DetailDto update(String id, AuthUser auth, AssignmentDtos.UpdateRequest request) {
        requireTeacher(auth);
        Assignment assignment = requireOwned(id, auth);
        List<String> groupIds = cleanGroups(request.groupIds());
        validateTeaching(auth.id(), request.subjectId(), groupIds);
        String description = request.description() == null ? null : HTML_POLICY.sanitize(request.description());
        assignments.update(id, request.subjectId(), request.type(), Text.clean(request.title(), 200),
                description, request.deadline(), request.maxScore(),
                request.allowLate() == null || request.allowLate(),
                request.archived() != null && request.archived(), groupIds);
        audit.log("ASSIGNMENT_UPDATED", "ASSIGNMENT", id);
        return detail(id, auth);
    }

    public void archive(String id, boolean archived, AuthUser auth) {
        requireTeacher(auth);
        requireOwned(id, auth);
        assignments.setArchived(id, archived);
        audit.log(archived ? "ASSIGNMENT_ARCHIVED" : "ASSIGNMENT_RESTORED", "ASSIGNMENT", id);
    }

    public void delete(String id, AuthUser auth) {
        requireTeacher(auth);
        requireOwned(id, auth);
        if (submissions.countForAssignment(id) > 0) {
            throw ApiException.conflict("HAS_SUBMISSIONS",
                    "Təhvili olan tapşırıq silinə bilməz. Onu arxivləşdirin.");
        }
        for (StoredFile file : fileRepository.listByAssignment(id)) {
            files.storage().delete(file.driveFileId());
            fileRepository.markDeleted(file.id());
        }
        assignments.delete(id);
        audit.log("ASSIGNMENT_DELETED", "ASSIGNMENT", id);
    }

    public AssignmentDtos.DetailDto detail(String id, AuthUser auth) {
        Assignment assignment = assignments.findById(id);
        if (assignment == null) throw ApiException.notFound("Tapşırıq tapılmadı.");
        if (!"ADMIN".equals(auth.role()) && !assignment.teacherId().equals(auth.id())) {
            throw ApiException.forbidden("Bu tapşırığa baxmaq icazəniz yoxdur.");
        }
        return new AssignmentDtos.DetailDto(toDto(assignment, true, null, null, null),
                files.attachments(id));
    }

    public AssignmentDtos.SubmissionsPayload teacherSubmissions(String assignmentId, String groupId,
                                                                 AuthUser auth) {
        Assignment assignment = requireOwned(assignmentId, auth);
        List<String> groupIds = assignments.findGroupIds(assignmentId);
        if (groupId != null && !groupId.isBlank() && !groupIds.contains(groupId)) {
            throw ApiException.badRequest("INVALID_GROUP", "Bu qrup tapşırığa aid deyil.");
        }
        List<Map<String, Object>> rows = submissions.listForAssignment(assignmentId,
                groupId == null || groupId.isBlank() ? null : groupId);
        List<AssignmentDtos.SubmissionRowDto> items = rows.stream().map(row -> {
            String status = Db.str(row, "status");
            if (status == null) status = "MISSING";
            return new AssignmentDtos.SubmissionRowDto(
                    Db.str(row, "student_id"),
                    Db.str(row, "first_name") + " " + Db.str(row, "last_name"),
                    Db.str(row, "email"), Db.str(row, "group_id"), Db.str(row, "group_code"),
                    Db.str(row, "avatar_file_id"), Db.str(row, "submission_id"), status,
                    Db.lng(row, "submitted_at"), Db.str(row, "comment"), Db.dblOrNull(row, "score"),
                    Db.str(row, "teacher_feedback"), Db.integer(row, "file_count", 0));
        }).toList();
        int submitted = (int) items.stream().filter(i -> !"MISSING".equals(i.status())).count();
        List<Group> groupList = groupIds.stream().map(groups::findById).filter(g -> g != null).toList();
        return new AssignmentDtos.SubmissionsPayload(items, items.size(), submitted, groupList);
    }

    public AssignmentDtos.SubmissionDetailDto submissionDetail(String submissionId, AuthUser auth) {
        Submission submission = submissions.findById(submissionId);
        if (submission == null) throw ApiException.notFound("Təhvil tapılmadı.");
        Assignment assignment = requireOwned(submission.assignmentId(), auth);
        User student = users.findActiveById(submission.studentId());
        Group group = student == null || student.groupId() == null ? null : groups.findById(student.groupId());
        return new AssignmentDtos.SubmissionDetailDto(submission.id(), assignment.id(), assignment.title(),
                submission.studentId(), student == null ? "" : student.fullName(),
                group == null ? null : group.code(), submission.status().name(), submission.comment(),
                submission.score(), submission.teacherFeedback(), submission.submittedAt(),
                files.submissionFiles(submission.id()));
    }

    public AssignmentDtos.SubmissionDetailDto grade(String submissionId, AuthUser auth,
                                                    AssignmentDtos.GradeRequest request) {
        Submission submission = submissions.findById(submissionId);
        if (submission == null) throw ApiException.notFound("Təhvil tapılmadı.");
        Assignment assignment = requireOwned(submission.assignmentId(), auth);
        if (request.score() != null && assignment.maxScore() != null
                && request.score() > assignment.maxScore()) {
            throw ApiException.badRequest("SCORE_TOO_HIGH", "Bal maksimum baldan çox ola bilməz.");
        }
        submissions.grade(submissionId, request.score(), Text.clean(request.feedback(), 5000));
        audit.log("SUBMISSION_GRADED", "SUBMISSION", submissionId,
                Map.of("score", request.score() == null ? "" : request.score()));
        return submissionDetail(submissionId, auth);
    }

    public az.it25patok.common.PageResponse<AssignmentDtos.AssignmentDto> teacherAssignments(
            AuthUser auth, String subjectId, AssignmentType type, Boolean archived, String search,
            int page, int size) {
        requireTeacher(auth);
        var result = assignments.listForTeacher(auth.id(), subjectId, type, archived, search,
                Math.max(1, page), Math.min(Math.max(1, size), 50));
        List<AssignmentDtos.AssignmentDto> items = result.items().stream()
                .map(a -> toDto(a, false, null, null, null)).toList();
        return az.it25patok.common.PageResponse.of(items, result.total(), result.page(), result.size());
    }

    public az.it25patok.common.PageResponse<AssignmentDtos.AssignmentDto> studentAssignmentsPage(
            AuthUser auth, String subjectId, AssignmentType type, String search, int page, int size) {
        User student = requireStudent(auth);
        var result = assignments.listForStudent(student.groupId(), subjectId, type, search,
                Math.max(1, page), Math.min(Math.max(1, size), 50));
        List<String> ids = result.items().stream().map(Assignment::id).toList();
        Map<String, Map<String, Object>> statuses = submissions.statusesForStudent(student.id(), ids);
        List<AssignmentDtos.AssignmentDto> items = result.items().stream().map(a -> {
            Map<String, Object> status = statuses.get(a.id());
            return toDto(a, false, status == null ? null : Db.str(status, "status"),
                    status == null ? null : Db.lng(status, "submitted_at"),
                    status == null ? null : Db.dblOrNull(status, "score"));
        }).toList();
        return az.it25patok.common.PageResponse.of(items, result.total(), result.page(), result.size());
    }

    public AssignmentDtos.StudentDetailDto studentDetail(String id, AuthUser auth) {
        User student = requireStudent(auth);
        Assignment assignment = assignments.findById(id);
        if (assignment == null || assignment.archived()) throw ApiException.notFound("Tapşırıq tapılmadı.");
        if (!assignments.findGroupIds(id).contains(student.groupId())) {
            throw ApiException.forbidden("Bu tapşırıq sizin qrupunuza aid deyil.");
        }
        Submission submission = submissions.findByAssignmentAndStudent(id, student.id());
        Map<String, Object> status = submissions.studentStatus(id, student.id());
        AssignmentDtos.SubmissionDto submissionDto = null;
        if (submission != null) {
            submissionDto = new AssignmentDtos.SubmissionDto(submission.id(), submission.assignmentId(),
                    submission.studentId(), student.fullName(), submission.status().name(),
                    submission.comment(), submission.score(), submission.teacherFeedback(),
                    submission.submittedAt(), fileRepository.countBySubmission(submission.id()),
                    files.submissionFiles(submission.id()));
        }
        return new AssignmentDtos.StudentDetailDto(toDto(assignment, true,
                status == null ? null : Db.str(status, "status"),
                status == null ? null : Db.lng(status, "submitted_at"),
                status == null ? null : Db.dblOrNull(status, "score")),
                files.attachments(id), submissionDto);
    }

    public List<AssignmentDtos.StudentSubjectDto> studentSubjects(AuthUser auth) {
        User student = requireStudent(auth);
        List<Subject> subjectList = subjects.findForGroup(student.groupId());
        List<AssignmentDtos.StudentSubjectDto> result = new ArrayList<>();
        for (Subject subject : subjectList) {
            long total = assignments.countActiveForGroupSubject(student.groupId(), subject.id());
            long submitted = submissions.countSubmittedForStudentSubject(student.id(), student.groupId(), subject.id());
            result.add(new AssignmentDtos.StudentSubjectDto(subject.id(), subject.name(), subject.code(),
                    subject.description(), total, Math.min(submitted, total), Math.max(0, total - submitted)));
        }
        return result;
    }

    public List<AssignmentDtos.MissingGroupDto> studentMissing(AuthUser auth) {
        User student = requireStudent(auth);
        List<AssignmentRepository.MissingRow> rows = assignments.missingRows(null, student.id(), student.groupId());
        return groupMissing(rows);
    }

    public AssignmentDtos.StudentDashboardDto studentDashboard(AuthUser auth) {
        User student = requireStudent(auth);
        long total = assignments.countActiveForGroup(student.groupId());
        long submitted = submissions.countSubmittedForStudentInGroup(student.id(), student.groupId());
        List<AssignmentRepository.MissingRow> missingRows = assignments.missingRows(null, student.id(), student.groupId());
        long overdue = missingRows.stream().filter(r -> r.deadline() != null && r.deadline() < Time.now()).count();
        long subjectCount = subjects.findForGroup(student.groupId()).size();
        long now = Time.now();
        List<Assignment> upcomingAssignments = assignments.upcomingForGroup(student.groupId(), now, now + 7L * 24 * 60 * 60 * 1000);
        Map<String, Map<String, Object>> statuses = submissions.statusesForStudent(student.id(),
                upcomingAssignments.stream().map(Assignment::id).toList());
        List<AssignmentDtos.AssignmentDto> upcoming = upcomingAssignments.stream().map(a -> {
            Map<String, Object> status = statuses.get(a.id());
            return toDto(a, false, status == null ? null : Db.str(status, "status"),
                    status == null ? null : Db.lng(status, "submitted_at"),
                    status == null ? null : Db.dblOrNull(status, "score"));
        }).toList();
        List<AssignmentDtos.MissingItemDto> missingItems = missingRows.stream()
                .sorted(Comparator.comparing(AssignmentRepository.MissingRow::deadline,
                        Comparator.nullsLast(Comparator.naturalOrder())))
                .limit(8).map(this::missingItem).toList();
        return new AssignmentDtos.StudentDashboardDto(total, Math.min(submitted, total),
                Math.max(0, total - submitted), overdue, subjectCount, upcoming, missingItems);
    }

    public AssignmentDtos.TeacherDashboardDto teacherDashboard(AuthUser auth) {
        requireTeacher(auth);
        List<String> groupIds = subjects.groupIdsForTeacher(auth.id());
        List<User> students = users.findActiveStudentsByGroups(groupIds);
        List<AssignmentRepository.MissingRow> missing = assignments.missingRows(auth.id(), null, null);
        var recentResult = assignments.listForTeacher(auth.id(), null, null, false, null, 1, 5);
        List<AssignmentDtos.AssignmentDto> recent = recentResult.items().stream()
                .map(a -> toDto(a, false, null, null, null)).toList();
        List<Group> groupList = groupIds.stream().map(groups::findById).filter(g -> g != null).toList();
        return new AssignmentDtos.TeacherDashboardDto(assignments.countActiveByTeacher(auth.id()),
                students.size(), missing.size(), recent, groupList);
    }

    public List<AssignmentDtos.TeacherSubjectDto> teacherSubjects(AuthUser auth) {
        requireTeacher(auth);
        List<Subject> subjectList = subjects.findForTeacher(auth.id());
        List<AssignmentDtos.TeacherSubjectDto> result = new ArrayList<>();
        for (Subject subject : subjectList) {
            List<String> groupIds = subjects.findTeachingAssignments(auth.id(), null).stream()
                    .filter(ta -> ta.subjectId().equals(subject.id()))
                    .map(az.it25patok.subject.TeachingAssignment::groupId).distinct().toList();
            List<Group> groupList = groupIds.stream().map(groups::findById).filter(g -> g != null).toList();
            result.add(new AssignmentDtos.TeacherSubjectDto(subject, groupList));
        }
        return result;
    }

    public List<Group> teacherGroups(AuthUser auth) {
        requireTeacher(auth);
        return subjects.groupIdsForTeacher(auth.id()).stream().map(groups::findById)
                .filter(g -> g != null).toList();
    }

    public List<AssignmentDtos.MissingGroupDto> teacherStudentMissing(String studentId, AuthUser auth) {
        requireTeacher(auth);
        User student = users.findActiveById(studentId);
        if (student == null || student.groupId() == null) throw ApiException.notFound("Tələbə tapılmadı.");
        if (!subjects.groupIdsForTeacher(auth.id()).contains(student.groupId())) {
            throw ApiException.forbidden("Bu tələbə sizin qruplarınızda deyil.");
        }
        return groupMissing(assignments.missingRows(auth.id(), studentId, null));
    }

    public List<AssignmentDtos.StudentMissingSummary> teacherMissingOverview(AuthUser auth) {
        requireTeacher(auth);
        List<AssignmentRepository.MissingRow> rows = assignments.missingRows(auth.id(), null, null);
        Map<String, List<AssignmentRepository.MissingRow>> byStudent = rows.stream()
                .collect(Collectors.groupingBy(AssignmentRepository.MissingRow::studentId, LinkedHashMap::new,
                        Collectors.toList()));
        List<AssignmentDtos.StudentMissingSummary> result = new ArrayList<>();
        byStudent.forEach((studentId, items) -> {
            AssignmentRepository.MissingRow first = items.get(0);
            List<AssignmentDtos.MissingItemDto> dtos = items.stream()
                    .sorted(Comparator.comparing(AssignmentRepository.MissingRow::deadline,
                            Comparator.nullsLast(Comparator.naturalOrder())))
                    .map(this::missingItem).toList();
            result.add(new AssignmentDtos.StudentMissingSummary(studentId, first.studentName(),
                    first.groupId(), first.groupCode(), items.size(), dtos));
        });
        result.sort(Comparator.comparingLong(AssignmentDtos.StudentMissingSummary::count).reversed()
                .thenComparing(AssignmentDtos.StudentMissingSummary::studentName));
        return result;
    }

    private List<AssignmentDtos.MissingGroupDto> groupMissing(List<AssignmentRepository.MissingRow> rows) {
        Map<String, List<AssignmentRepository.MissingRow>> bySubject = rows.stream()
                .collect(Collectors.groupingBy(AssignmentRepository.MissingRow::subjectId,
                        LinkedHashMap::new, Collectors.toList()));
        List<AssignmentDtos.MissingGroupDto> groupsResult = new ArrayList<>();
        bySubject.forEach((subjectId, items) -> groupsResult.add(new AssignmentDtos.MissingGroupDto(
                subjectId, items.get(0).subjectName(),
                items.stream().sorted(Comparator.comparing(AssignmentRepository.MissingRow::deadline,
                                Comparator.nullsLast(Comparator.naturalOrder())))
                        .map(this::missingItem).toList())));
        groupsResult.sort(Comparator.comparing(AssignmentDtos.MissingGroupDto::subjectName));
        return groupsResult;
    }

    private AssignmentDtos.MissingItemDto missingItem(AssignmentRepository.MissingRow row) {
        long now = Time.now();
        String status = row.deadline() != null && row.deadline() < now ? "OVERDUE" : "MISSING";
        long daysLate = row.deadline() == null || row.deadline() >= now ? 0
                : Math.max(0, (now - row.deadline()) / (24L * 60 * 60 * 1000));
        return new AssignmentDtos.MissingItemDto(row.assignmentId(), row.title(), row.type(),
                row.subjectId(), row.subjectName(), row.deadline(), status, daysLate);
    }

    private AssignmentDtos.AssignmentDto toDto(Assignment a, boolean includeGroupIds, String myStatus,
                                               Long mySubmittedAt, Double myScore) {
        return new AssignmentDtos.AssignmentDto(a.id(), a.teacherId(), a.teacherName(), a.subjectId(),
                a.subjectName(), a.type(), a.title(), a.description(), a.deadline(), a.maxScore(),
                a.archived(), a.allowLate(),
                includeGroupIds ? assignments.findGroupIds(a.id()) : List.of(),
                a.groupCodeList(), a.attachmentCount(), a.submittedCount(), myStatus, mySubmittedAt,
                myScore, a.createdAt());
    }

    private Assignment requireOwned(String id, AuthUser auth) {
        Assignment assignment = assignments.findById(id);
        if (assignment == null) throw ApiException.notFound("Tapşırıq tapılmadı.");
        if (!"ADMIN".equals(auth.role()) && !assignment.teacherId().equals(auth.id())) {
            throw ApiException.forbidden("Bu tapşırıq sizə aid deyil.");
        }
        return assignment;
    }

    private void validateTeaching(String teacherId, String subjectId, List<String> groupIds) {
        Subject subject = subjects.findById(subjectId);
        if (subject == null) throw ApiException.notFound("Fənn tapılmadı.");
        if (!subjects.teacherTeaches(teacherId, subjectId, groupIds)) {
            throw ApiException.forbidden("Bu fənn/qrup kombinasiyası sizə təyin olunmayıb.");
        }
    }

    private static List<String> cleanGroups(List<String> groupIds) {
        return groupIds == null ? List.of() : groupIds.stream().filter(Text::isNotBlank).distinct().toList();
    }

    private static void requireTeacher(AuthUser auth) {
        if (!"TEACHER".equals(auth.role())) throw ApiException.forbidden("Bu əməliyyat müəllim üçündür.");
    }

    private User requireStudent(AuthUser auth) {
        if (!"STUDENT".equals(auth.role())) throw ApiException.forbidden("Bu əməliyyat tələbə üçündür.");
        User student = users.findActiveById(auth.id());
        if (student == null || student.groupId() == null) {
            throw ApiException.forbidden("Tələbənin qrupu təyin olunmayıb.");
        }
        return student;
    }
}
