package az.it25patok.submission;

import az.it25patok.assignment.Assignment;
import az.it25patok.assignment.AssignmentDtos;
import az.it25patok.assignment.AssignmentRepository;
import az.it25patok.auth.AuthUser;
import az.it25patok.common.ApiException;
import az.it25patok.common.AuditService;
import az.it25patok.common.Text;
import az.it25patok.common.Time;
import az.it25patok.file.FileDto;
import az.it25patok.file.FileRepository;
import az.it25patok.file.FileService;
import az.it25patok.file.StoredFile;
import az.it25patok.group.Group;
import az.it25patok.group.GroupRepository;
import az.it25patok.user.User;
import az.it25patok.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class SubmissionService {
    private static final int MAX_FILES = 10;

    private final AssignmentRepository assignments;
    private final SubmissionRepository submissions;
    private final UserRepository users;
    private final GroupRepository groups;
    private final FileService files;
    private final FileRepository fileRepository;
    private final AuditService audit;

    public SubmissionService(AssignmentRepository assignments, SubmissionRepository submissions,
                             UserRepository users, GroupRepository groups, FileService files,
                             FileRepository fileRepository, AuditService audit) {
        this.assignments = assignments;
        this.submissions = submissions;
        this.users = users;
        this.groups = groups;
        this.files = files;
        this.fileRepository = fileRepository;
        this.audit = audit;
    }

    public AssignmentDtos.SubmissionDto submit(String assignmentId, AuthUser auth, String comment,
                                               List<MultipartFile> uploads) {
        if (!"STUDENT".equals(auth.role())) throw ApiException.forbidden("Bu əməliyyat tələbə üçündür.");
        User student = users.findActiveById(auth.id());
        if (student == null || student.groupId() == null) {
            throw ApiException.forbidden("Tələbənin qrupu təyin olunmayıb.");
        }
        Assignment assignment = assignments.findById(assignmentId);
        if (assignment == null || assignment.archived()) throw ApiException.notFound("Tapşırıq tapılmadı.");
        if (!assignments.findGroupIds(assignmentId).contains(student.groupId())) {
            throw ApiException.forbidden("Bu tapşırıq sizin qrupunuza aid deyil.");
        }
        long now = Time.now();
        boolean late = assignment.deadline() != null && now > assignment.deadline();
        if (late && !assignment.allowLate()) {
            throw ApiException.forbidden("Gecikmiş təhvil bu tapşırıq üçün qəbul edilmir.");
        }
        Submission existing = submissions.findByAssignmentAndStudent(assignmentId, student.id());
        if (existing != null && existing.status() == SubmissionStatus.GRADED) {
            throw ApiException.badRequest("ALREADY_GRADED", "Qiymətləndirilmiş təhvili dəyişmək olmaz.");
        }
        List<MultipartFile> list = uploads == null ? List.of() : uploads.stream()
                .filter(f -> f != null && !f.isEmpty()).toList();
        int existingCount = existing == null ? 0 : fileRepository.countBySubmission(existing.id());
        if (existing == null && list.isEmpty()) {
            throw ApiException.badRequest("FILE_REQUIRED", "Təhvil üçün ən azı bir fayl yükləyin.");
        }
        if (existingCount + list.size() > MAX_FILES) {
            throw ApiException.badRequest("TOO_MANY_FILES", "Bir təhvil üçün maksimum " + MAX_FILES + " fayl yüklənə bilər.");
        }
        String cleanComment = Text.clean(comment, 5000);
        SubmissionStatus status = late ? SubmissionStatus.LATE : SubmissionStatus.SUBMITTED;
        String submissionId;
        boolean created = false;
        if (existing == null) {
            submissionId = submissions.insert(assignmentId, student.id(), status, cleanComment, now);
            created = true;
        } else {
            submissionId = existing.id();
            submissions.updateContent(submissionId, status, cleanComment, now);
        }
        List<StoredFile> uploaded = new ArrayList<>();
        try {
            if (!list.isEmpty()) {
                Group group = groups.findById(student.groupId());
                List<String> folders = List.of(
                        group == null ? "qrup" : group.code(),
                        assignment.subjectName() == null ? "fenn" : assignment.subjectName(),
                        Text.safeFileName(assignment.title() + "_" + assignment.id()),
                        Text.safeFileName(student.fullName() + "_" + student.id())
                );
                for (MultipartFile file : list) {
                    uploaded.add(files.upload(file, student.id(), "SUBMISSION", assignmentId,
                            submissionId, folders));
                }
            }
        } catch (RuntimeException e) {
            for (StoredFile file : uploaded) {
                files.storage().delete(file.driveFileId());
                fileRepository.markDeleted(file.id());
            }
            if (created) submissions.delete(submissionId);
            throw e;
        }
        audit.log("SUBMISSION_UPLOADED", "SUBMISSION", submissionId,
                Map.of("assignmentId", assignmentId, "files", uploaded.size()));
        Submission submission = submissions.findById(submissionId);
        return new AssignmentDtos.SubmissionDto(submission.id(), assignmentId, student.id(), student.fullName(),
                submission.status().name(), submission.comment(), submission.score(),
                submission.teacherFeedback(), submission.submittedAt(),
                fileRepository.countBySubmission(submissionId), files.submissionFiles(submissionId));
    }

    public void deleteFile(String submissionId, String fileId, AuthUser auth) {
        if (!"STUDENT".equals(auth.role())) throw ApiException.forbidden("Bu əməliyyat tələbə üçündür.");
        Submission submission = submissions.findById(submissionId);
        if (submission == null || !submission.studentId().equals(auth.id())) {
            throw ApiException.forbidden("Bu təhvil sizə aid deyil.");
        }
        StoredFile file = fileRepository.findById(fileId);
        if (file == null || !submissionId.equals(file.submissionId())) {
            throw ApiException.notFound("Fayl tapılmadı.");
        }
        files.delete(fileId, auth);
    }

    public List<FileDto> submissionFiles(String submissionId, AuthUser auth) {
        Submission submission = submissions.findById(submissionId);
        if (submission == null) throw ApiException.notFound("Təhvil tapılmadı.");
        if (!submission.studentId().equals(auth.id()) && !"ADMIN".equals(auth.role())) {
            throw ApiException.forbidden("Bu təhvilə baxmaq icazəniz yoxdur.");
        }
        return files.submissionFiles(submissionId);
    }
}
