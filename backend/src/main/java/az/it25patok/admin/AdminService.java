package az.it25patok.admin;

import az.it25patok.assignment.AssignmentDtos;
import az.it25patok.assignment.AssignmentRepository;
import az.it25patok.auth.AuthUser;
import az.it25patok.auth.CurrentUser;
import az.it25patok.auth.TokenRepository;
import az.it25patok.chat.ChatRepository;
import az.it25patok.common.ApiException;
import az.it25patok.common.AuditService;
import az.it25patok.common.Db;
import az.it25patok.common.PageResponse;
import az.it25patok.common.SettingsService;
import az.it25patok.common.Text;
import az.it25patok.common.Time;
import az.it25patok.d1.D1Client;
import az.it25patok.file.FileRepository;
import az.it25patok.file.StoredFile;
import az.it25patok.group.Group;
import az.it25patok.group.GroupRepository;
import az.it25patok.notification.MailService;
import az.it25patok.notification.NotificationLogRepository;
import az.it25patok.subject.Subject;
import az.it25patok.subject.SubjectRepository;
import az.it25patok.subject.TeachingAssignment;
import az.it25patok.submission.SubmissionRepository;
import az.it25patok.user.Role;
import az.it25patok.user.User;
import az.it25patok.user.UserDto;
import az.it25patok.user.UserRepository;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVPrinter;
import org.apache.commons.csv.CSVRecord;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.StringReader;
import java.io.StringWriter;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.text.Normalizer;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
@PreAuthorize("hasRole('ADMIN')")
public class AdminService {
    private static final int MAX_IMPORT_ROWS = 500;
    private static final long MAX_IMPORT_BYTES = 2L * 1024 * 1024;
    private static final String LOWER = "abcdefghijkmnopqrstuvwxyz";
    private static final String UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    private static final String DIGITS = "23456789";
    private static final String SYMBOLS = "!@#$%&*?";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserRepository users;
    private final GroupRepository groups;
    private final SubjectRepository subjects;
    private final AssignmentRepository assignments;
    private final SubmissionRepository submissions;
    private final FileRepository files;
    private final ChatRepository chat;
    private final NotificationLogRepository notifications;
    private final MailService mail;
    private final SettingsService settings;
    private final AuditService audit;
    private final PasswordEncoder passwordEncoder;
    private final TokenRepository tokens;
    private final CurrentUser currentUser;
    private final D1Client d1;

    public AdminService(UserRepository users, GroupRepository groups, SubjectRepository subjects,
                        AssignmentRepository assignments, SubmissionRepository submissions,
                        FileRepository files, ChatRepository chat, NotificationLogRepository notifications,
                        MailService mail, SettingsService settings, AuditService audit,
                        PasswordEncoder passwordEncoder, TokenRepository tokens,
                        CurrentUser currentUser, D1Client d1) {
        this.users = users;
        this.groups = groups;
        this.subjects = subjects;
        this.assignments = assignments;
        this.submissions = submissions;
        this.files = files;
        this.chat = chat;
        this.notifications = notifications;
        this.mail = mail;
        this.settings = settings;
        this.audit = audit;
        this.passwordEncoder = passwordEncoder;
        this.tokens = tokens;
        this.currentUser = currentUser;
        this.d1 = d1;
    }

    // ------------------------------------------------------------------ users

    public PageResponse<UserDto> listUsers(String search, Role role, String groupId, Boolean active,
                                           int page, int size, String sort) {
        PageResponse<User> result = users.search(search, role, groupId, active,
                Math.max(1, page), Math.min(Math.max(1, size), 100), sort);
        Map<String, String> groupCodes = groupCodes();
        List<UserDto> items = result.items().stream()
                .map(user -> UserDto.from(user, groupCodes.get(user.groupId())))
                .toList();
        return PageResponse.of(items, result.total(), result.page(), result.size());
    }

    public AdminDtos.UserDetail userDetail(String id) {
        User user = requireUser(id);
        List<TeachingAssignment> teachings = "TEACHER".equals(user.role().name())
                ? subjects.findTeachingAssignments(user.id(), null) : List.of();
        return new AdminDtos.UserDetail(dto(user), teachings);
    }

    public AdminDtos.CreatedUser createUser(AdminDtos.CreateUserRequest request) {
        Role role = request.role();
        String username = request.username().trim().toLowerCase(java.util.Locale.ROOT);
        if (!username.matches("[a-zəöüğışç0-9._-]{2,60}")) {
            throw ApiException.badRequest("INVALID_USERNAME",
                    "İstifadəçi adı yalnız hərflər, rəqəmlər və . - _ simvollarından ibarət ola bilər (2–60 simvol).");
        }
        if (users.usernameExists(username, null)) {
            throw ApiException.conflict("USERNAME_EXISTS", "Bu istifadəçi adı artıq mövcuddur.");
        }
        // İstifadəçi adı seçilir; e-poçt boş bir yer tutucu olur, istifadəçi ilk girişdə öz gmailini yazır.
        String email = username + "@no-mail.it25patok.az";
        if (users.emailExists(email, null)) {
            throw ApiException.conflict("EMAIL_EXISTS", "Bu e-poçt ilə istifadəçi artıq mövcuddur.");
        }
        String firstName = Text.clean(request.firstName(), 100);
        String lastName = Text.clean(request.lastName(), 100);
        String phone = blankToNull(Text.clean(request.phone(), 30));
        String groupId = validateGroup(role, request.groupId());
        List<AdminDtos.TeachingPair> pairs = role == Role.TEACHER
                ? validatePairs(request.teachingAssignments()) : List.of();
        String password = Text.isBlank(request.initialPassword())
                ? generatePassword() : validatePassword(request.initialPassword());

        User user = new User(null, role, email, username, passwordEncoder.encode(password), firstName, lastName,
                phone, groupId, null, null, "system", true, true, 0, null, null, null, true,
                null, 0, 0, null);
        String id = users.insert(user);
        if (role == Role.TEACHER && !pairs.isEmpty()) {
            insertPairs(id, pairs);
        }
        User created = users.findActiveById(id);
        if (created == null) created = users.findById(id);
        boolean emailSent = sendAccountCreated(created);
        audit.log("USER_CREATED", "USER", id, Map.of("role", role.name(), "username", username));
        return new AdminDtos.CreatedUser(dto(created), password, emailSent);
    }

    public UserDto updateUser(String id, AdminDtos.UpdateUserRequest request) {
        User existing = requireUser(id);
        AuthUser actor = currentUser.require();
        Role newRole = request.role();
        String email = Text.email(request.email());
        if (users.emailExists(email, id)) {
            throw ApiException.conflict("EMAIL_EXISTS", "Bu e-poçt başqa istifadəçiyə aiddir.");
        }
        boolean newActive = request.active() == null ? existing.active() : request.active();
        if (existing.id().equals(actor.id()) && (!newActive || newRole != Role.ADMIN)) {
            throw ApiException.conflict("SELF_PROTECTED",
                    "Öz hesabınızı deaktiv edə və ya admin rolundan çıxara bilməzsiniz.");
        }
        if (existing.role() == Role.ADMIN && newRole != Role.ADMIN && users.countByRole(Role.ADMIN) <= 1) {
            throw ApiException.conflict("LAST_ADMIN", "Sistemdə ən azı bir aktiv admin qalmalıdır.");
        }
        String groupId = validateGroup(newRole, request.groupId());
        List<AdminDtos.TeachingPair> pairs = newRole == Role.TEACHER
                ? validatePairs(request.teachingAssignments()) : List.of();

        users.updateAdminFields(id, Text.clean(request.firstName(), 100),
                Text.clean(request.lastName(), 100), blankToNull(Text.clean(request.phone(), 30)),
                newRole, groupId, newActive);
        if (newRole == Role.TEACHER) {
            if (request.teachingAssignments() != null) {
                subjects.deleteTeachingAssignmentsByTeacher(id);
                insertPairs(id, pairs);
            }
        } else {
            subjects.deleteTeachingAssignmentsByTeacher(id);
        }
        if (!newActive || newRole != existing.role() || !email.equals(existing.email())) {
            tokens.revokeAllRefresh(id);
            tokens.revokeAllTrustedDevices(id);
        }
        users.updateEmail(id, email);
        audit.log("USER_UPDATED", "USER", id, Map.of("role", newRole.name(), "active", newActive));
        return dto(requireUser(id));
    }

    public void deleteUser(String id) {
        User user = requireUser(id);
        AuthUser actor = currentUser.require();
        if (user.id().equals(actor.id())) {
            throw ApiException.conflict("SELF_PROTECTED", "Öz hesabınızı silə bilməzsiniz.");
        }
        if (user.role() == Role.ADMIN && users.countByRole(Role.ADMIN) <= 1) {
            throw ApiException.conflict("LAST_ADMIN", "Sistemdə ən azı bir aktiv admin qalmalıdır.");
        }
        users.softDelete(id);
        tokens.revokeAllRefresh(id);
        tokens.revokeAllTrustedDevices(id);
        audit.log("USER_DELETED", "USER", id, Map.of("email", user.email()));
    }

    public AdminDtos.ResetPasswordResponse resetPassword(String id) {
        User user = requireUser(id);
        String password = generatePassword();
        users.resetPassword(id, passwordEncoder.encode(password));
        tokens.revokeAllRefresh(id);
        tokens.revokeAllTrustedDevices(id);
        audit.log("PASSWORD_RESET", "USER", id, Map.of("email", user.email()));
        return new AdminDtos.ResetPasswordResponse(password);
    }

    public UserDto muteUser(String id, int minutes) {
        User user = requireUser(id);
        if (minutes < 0 || minutes > 7 * 24 * 60) {
            throw ApiException.badRequest("INVALID_MUTE", "Susdurma müddəti 0–10080 dəqiqə olmalıdır.");
        }
        Long until = minutes == 0 ? null : Time.now() + minutes * 60_000L;
        users.setMutedUntil(id, until);
        audit.log("USER_MUTED", "USER", id, Map.of("minutes", minutes));
        return dto(requireUser(id));
    }

    // ------------------------------------------------------------------ groups

    public List<Group> listGroups() {
        return groups.findAll();
    }

    public Group createGroup(AdminDtos.CreateGroupRequest request) {
        String code = request.code() == null ? "" : request.code().trim().toUpperCase(java.util.Locale.ROOT);
        String name = request.name() == null ? "" : request.name().trim();
        if (code.isEmpty() || name.isEmpty()) {
            throw ApiException.badRequest("INVALID_GROUP", "Qrup kodu və adı mütləqdir.");
        }
        if (!code.matches("[A-Z0-9._-]{2,30}")) {
            throw ApiException.badRequest("INVALID_GROUP_CODE",
                    "Qrup kodu yalnız böyük hərflər, rəqəmlər və . - _ simvollarını ehtiva etməlidir (2–30 simvol).");
        }
        if (groups.existsByCode(code, null)) {
            throw ApiException.conflict("GROUP_EXISTS", "Bu kodlu qrup artıq mövcuddur: " + code);
        }
        Group created = groups.create(code, name);
        audit.log("GROUP_CREATED", "GROUP", created.id(), Map.of("code", code, "name", name));
        return created;
    }

    public void deleteGroup(String groupId) {
        Group group = groups.findById(groupId);
        if (group == null) throw ApiException.notFound("Qrup tapılmadı.");
        long students = groups.studentCount(groupId);
        if (students > 0) {
            throw ApiException.conflict("GROUP_IN_USE",
                    "Qrupda " + students + " tələbə var. Əvvəlcə onları başqa qrupa köçürün.");
        }
        groups.delete(groupId);
        audit.log("GROUP_DELETED", "GROUP", groupId, Map.of("code", group.code()));
    }

    public UserDto moveStudent(String groupId, String studentId) {
        Group group = groups.findById(groupId);
        if (group == null) throw ApiException.notFound("Qrup tapılmadı.");
        User student = requireUser(studentId);
        if (student.role() != Role.STUDENT) {
            throw ApiException.badRequest("NOT_STUDENT", "Yalnız tələbə qrupdan qrupa keçirilə bilər.");
        }
        users.setGroup(studentId, groupId);
        audit.log("STUDENT_MOVED", "USER", studentId,
                Map.of("from", student.groupId() == null ? "" : student.groupId(), "to", groupId));
        return dto(requireUser(studentId));
    }

    // ------------------------------------------------------------------ subjects

    public List<AdminDtos.SubjectWithAssignments> listSubjects() {
        return subjects.findAll().stream()
                .map(subject -> new AdminDtos.SubjectWithAssignments(subject,
                        subjects.findTeachingAssignmentsForSubject(subject.id())))
                .toList();
    }

    public Subject createSubject(AdminDtos.SubjectRequest request) {
        String name = Text.clean(request.name(), 150);
        String code = blankToNull(Text.clean(request.code(), 30));
        if (code != null && subjects.existsCode(code, null)) {
            throw ApiException.conflict("SUBJECT_CODE_EXISTS", "Bu fənn kodu artıq istifadə olunur.");
        }
        Subject subject = subjects.insert(name, code, Text.clean(request.description(), 2000));
        audit.log("SUBJECT_CREATED", "SUBJECT", subject.id(), Map.of("name", name));
        return subject;
    }

    public Subject updateSubject(String id, AdminDtos.SubjectRequest request) {
        Subject existing = subjects.findById(id);
        if (existing == null) throw ApiException.notFound("Fənn tapılmadı.");
        String code = blankToNull(Text.clean(request.code(), 30));
        if (code != null && subjects.existsCode(code, id)) {
            throw ApiException.conflict("SUBJECT_CODE_EXISTS", "Bu fənn kodu artıq istifadə olunur.");
        }
        subjects.update(id, Text.clean(request.name(), 150), code,
                Text.clean(request.description(), 2000));
        audit.log("SUBJECT_UPDATED", "SUBJECT", id);
        return subjects.findById(id);
    }

    public void deleteSubject(String id) {
        Subject existing = subjects.findById(id);
        if (existing == null) throw ApiException.notFound("Fənn tapılmadı.");
        Long assignmentCount = Db.lng(d1.queryOne(
                "SELECT COUNT(*) c FROM assignments WHERE subject_id = ?", id), "c");
        if (assignmentCount != null && assignmentCount > 0) {
            throw ApiException.conflict("SUBJECT_IN_USE",
                    "Bu fənnə bağlı tapşırıqlar var. Əvvəlcə onları arxivləşdirin və ya silin.");
        }
        subjects.delete(id);
        audit.log("SUBJECT_DELETED", "SUBJECT", id, Map.of("name", existing.name()));
    }

    public List<TeachingAssignment> listTeachingAssignments(String teacherId, String groupId) {
        return subjects.findTeachingAssignments(teacherId, groupId);
    }

    public TeachingAssignment createTeachingAssignment(AdminDtos.TeachingAssignmentRequest request) {
        User teacher = requireUser(request.teacherId());
        if (teacher.role() != Role.TEACHER) {
            throw ApiException.badRequest("NOT_TEACHER", "Seçilmiş istifadəçi müəllim deyil.");
        }
        if (subjects.findById(request.subjectId()) == null) {
            throw ApiException.notFound("Fənn tapılmadı.");
        }
        if (groups.findById(request.groupId()) == null) {
            throw ApiException.notFound("Qrup tapılmadı.");
        }
        Map<String, Object> duplicate = d1.queryOne("SELECT 1 x FROM teaching_assignments "
                        + "WHERE teacher_id = ? AND subject_id = ? AND group_id = ?",
                request.teacherId(), request.subjectId(), request.groupId());
        if (duplicate != null) {
            throw ApiException.conflict("ASSIGNMENT_EXISTS", "Bu təyinat artıq mövcuddur.");
        }
        TeachingAssignment created = subjects.createTeachingAssignment(request.teacherId(),
                request.subjectId(), request.groupId());
        audit.log("TEACHING_ASSIGNED", "TEACHING_ASSIGNMENT", created.id(),
                Map.of("teacherId", request.teacherId(), "subjectId", request.subjectId(),
                        "groupId", request.groupId()));
        return created;
    }

    public void deleteTeachingAssignment(String id) {
        TeachingAssignment existing = subjects.findTeachingAssignment(id);
        if (existing == null) throw ApiException.notFound("Təyinat tapılmadı.");
        subjects.deleteTeachingAssignment(id);
        audit.log("TEACHING_UNASSIGNED", "TEACHING_ASSIGNMENT", id,
                Map.of("teacherId", existing.teacherId(), "subjectId", existing.subjectId(),
                        "groupId", existing.groupId()));
    }

    // ------------------------------------------------------------------ stats

    public AdminDtos.AdminStats stats() {
        Map<String, String> groupCodes = groupCodes();
        List<Group> groupList = groups.findAll();
        List<AssignmentRepository.MissingRow> missingRows = assignments.missingRows(null, null, null);
        Map<String, Long> missingByGroup = new HashMap<>();
        for (AssignmentRepository.MissingRow row : missingRows) {
            missingByGroup.merge(row.groupId(), 1L, Long::sum);
        }
        List<AdminDtos.GroupStats> groupStats = new ArrayList<>();
        for (Group group : groupList) {
            long students = users.findStudentsByGroup(group.id()).stream().filter(User::active).count();
            long groupAssignments = assignments.countActiveForGroup(group.id());
            Long submitted = Db.lng(d1.queryOne("""
                    SELECT COUNT(*) c FROM submissions s
                    JOIN users u ON u.id = s.student_id
                    JOIN assignments a ON a.id = s.assignment_id AND a.is_archived = 0
                    WHERE u.group_id = ? AND EXISTS (SELECT 1 FROM assignment_groups ag
                      WHERE ag.assignment_id = s.assignment_id AND ag.group_id = u.group_id)
                    """, group.id()), "c");
            long submittedCount = submitted == null ? 0 : submitted;
            long expected = students * groupAssignments;
            double rate = expected == 0 ? 0 : (double) submittedCount / expected;
            groupStats.add(new AdminDtos.GroupStats(group.id(), group.code(), students,
                    groupAssignments, submittedCount, Math.round(rate * 10000.0) / 10000.0));
        }
        List<Map<String, Object>> recentAudit = d1.query("""
                SELECT a.*, u.first_name || ' ' || u.last_name actor_name, u.email actor_email
                FROM audit_log a LEFT JOIN users u ON u.id = a.actor_id
                ORDER BY a.created_at DESC LIMIT 10
                """);
        return new AdminDtos.AdminStats(
                users.countByRole(Role.STUDENT),
                users.countByRole(Role.TEACHER),
                users.countByRole(Role.ADMIN),
                assignments.countActive(),
                submissions.countAll(),
                missingRows.size(),
                files.countActive(),
                files.totalBytes(),
                notifications.countSentToday(),
                chat.countAll(),
                groupStats,
                recentAudit
        );
    }

    public AdminDtos.DashboardSummary dashboard() {
        List<AssignmentRepository.MissingRow> missingRows = assignments.missingRows(null, null, null);
        long now = Time.now();
        List<AssignmentDtos.MissingItemDto> top = missingRows.stream()
                .sorted(Comparator.comparing(AssignmentRepository.MissingRow::deadline,
                        Comparator.nullsLast(Comparator.naturalOrder())))
                .limit(8)
                .map(row -> {
                    long daysLate = row.deadline() == null || row.deadline() >= now ? 0
                            : Math.max(0, (now - row.deadline()) / 86_400_000L);
                    String status = row.deadline() != null && row.deadline() < now ? "OVERDUE" : "MISSING";
                    return new AssignmentDtos.MissingItemDto(row.assignmentId(), row.title(), row.type(),
                            row.subjectId(), row.subjectName(), row.deadline(), status, daysLate);
                }).toList();
        List<Map<String, Object>> recentAudit = d1.query("""
                SELECT a.*, u.first_name || ' ' || u.last_name actor_name, u.email actor_email
                FROM audit_log a LEFT JOIN users u ON u.id = a.actor_id
                ORDER BY a.created_at DESC LIMIT 10
                """);
        return new AdminDtos.DashboardSummary(users.countActive(), assignments.countActive(),
                submissions.countAll(), missingRows.size(), top, chat.countAll(), recentAudit);
    }

    public PageResponse<Map<String, Object>> auditLog(int page, int size, String action) {
        int safeSize = Math.min(Math.max(1, size), 100);
        int safePage = Math.max(1, page);
        String where = Text.isBlank(action) ? "" : " WHERE a.action = ?";
        Object[] params = Text.isBlank(action) ? new Object[]{} : new Object[]{action};
        Long total = Db.lng(d1.queryOne("SELECT COUNT(*) c FROM audit_log a" + where, params), "c");
        List<Object> pageParams = new ArrayList<>();
        Collections.addAll(pageParams, params);
        pageParams.add(safeSize);
        pageParams.add((safePage - 1) * safeSize);
        List<Map<String, Object>> rows = d1.query("""
                SELECT a.*, u.first_name || ' ' || u.last_name actor_name, u.email actor_email
                FROM audit_log a LEFT JOIN users u ON u.id = a.actor_id
                """ + where + " ORDER BY a.created_at DESC LIMIT ? OFFSET ?", pageParams.toArray());
        return PageResponse.of(rows, total == null ? 0 : total, safePage, safeSize);
    }

    public PageResponse<Map<String, Object>> emailLog(int page, int size) {
        return notifications.list(Math.max(1, page), Math.min(Math.max(1, size), 100));
    }

    public PageResponse<Map<String, Object>> files(int page, int size, String search, String kind) {
        return files.listAll(search, kind, Math.max(1, page), Math.min(Math.max(1, size), 100));
    }

    public List<Map<String, Object>> expiringFiles(int days) {
        int safeDays = Math.min(Math.max(1, days), 90);
        long now = Time.now();
        return d1.query("""
                SELECT f.*, u.first_name || ' ' || u.last_name owner_name, u.email owner_email
                FROM files f JOIN users u ON u.id = f.owner_id
                WHERE f.deleted_at IS NULL AND f.expires_at >= ? AND f.expires_at <= ?
                ORDER BY f.expires_at
                """, now, now + safeDays * 86_400_000L);
    }

    public PageResponse<Map<String, Object>> allAssignments(int page, int size, String search) {
        int safeSize = Math.min(Math.max(1, size), 100);
        int safePage = Math.max(1, page);
        String where = Text.isBlank(search) ? "" : " WHERE lower(a.title) LIKE ?";
        Object[] params = Text.isBlank(search) ? new Object[]{}
                : new Object[]{"%" + search.trim().toLowerCase(Locale.ROOT) + "%"};
        Long total = Db.lng(d1.queryOne("SELECT COUNT(*) c FROM assignments a" + where, params), "c");
        List<Object> pageParams = new ArrayList<>();
        Collections.addAll(pageParams, params);
        pageParams.add(safeSize);
        pageParams.add((safePage - 1) * safeSize);
        List<Map<String, Object>> rows = d1.query("""
                SELECT a.*, s.name subject_name, u.first_name || ' ' || u.last_name teacher_name,
                  (SELECT COUNT(*) FROM submissions sub WHERE sub.assignment_id = a.id) submitted_count,
                  (SELECT GROUP_CONCAT(g.code, ',') FROM assignment_groups ag
                     JOIN groups g ON g.id = ag.group_id WHERE ag.assignment_id = a.id) group_codes
                FROM assignments a
                JOIN subjects s ON s.id = a.subject_id
                JOIN users u ON u.id = a.teacher_id
                """ + where + " ORDER BY a.created_at DESC LIMIT ? OFFSET ?", pageParams.toArray());
        return PageResponse.of(rows, total == null ? 0 : total, safePage, safeSize);
    }

    // ------------------------------------------------------------------ settings

    public Map<String, Object> settings() {
        return settings.all();
    }

    public Map<String, Object> updateSettings(Map<String, String> values) {
        if (values == null || values.isEmpty()) {
            throw ApiException.badRequest("EMPTY_SETTINGS", "Heç bir ayar göndərilməyib.");
        }
        settings.update(values);
        audit.log("SETTINGS_UPDATED", "SETTINGS", null, new LinkedHashMap<>(values));
        return settings.all();
    }

    // ------------------------------------------------------------------ csv

    public AdminDtos.ImportResult importStudents(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw ApiException.badRequest("EMPTY_FILE", "CSV faylı boşdur.");
        }
        if (file.getSize() > MAX_IMPORT_BYTES) {
            throw ApiException.badRequest("FILE_TOO_LARGE", "CSV faylı 2 MB-dan böyük ola bilməz.");
        }
        String content;
        try {
            content = new String(file.getBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw ApiException.badRequest("FILE_READ_ERROR", "CSV faylı oxuna bilmədi.");
        }
        if (content.startsWith("\uFEFF")) content = content.substring(1);
        if (content.isBlank()) throw ApiException.badRequest("EMPTY_FILE", "CSV faylı boşdur.");

        Map<String, Group> groupsByCode = new HashMap<>();
        for (Group group : groups.findAll()) {
            groupsByCode.put(group.code().toLowerCase(Locale.ROOT), group);
            groupsByCode.put(group.id(), group);
        }

        List<AdminDtos.ImportCreated> created = new ArrayList<>();
        List<String> errors = new ArrayList<>();
        Set<String> seenEmails = new LinkedHashSet<>();
        int skipped = 0;
        try (CSVParser parser = CSVParser.parse(new StringReader(content), csvFormat(content))) {
            Map<String, String> headers = normalizedHeaders(parser.getHeaderMap());
            String firstHeader = header(headers, "ad", "firstname", "first_name");
            String lastHeader = header(headers, "soyad", "lastname", "last_name");
            String emailHeader = header(headers, "epoct", "email", "e-mail", "epost", "emailaddress");
            String groupHeader = header(headers, "qrup", "group", "groupcode", "qrupkodu");
            String phoneHeader = header(headers, "telefon", "phone", "nomre", "number");
            if (firstHeader == null || lastHeader == null || emailHeader == null || groupHeader == null) {
                throw ApiException.badRequest("INVALID_CSV",
                        "CSV başlıqları ad, soyad, email və qrup sahələrini ehtiva etməlidir.");
            }
            int rowNo = 1;
            for (CSVRecord record : parser) {
                rowNo++;
                if (rowNo - 1 > MAX_IMPORT_ROWS) {
                    errors.add("İdxal limiti " + MAX_IMPORT_ROWS + " sətirdir. Qalan sətirlər oxunmadı.");
                    break;
                }
                String firstName = value(record, firstHeader);
                String lastName = value(record, lastHeader);
                String email = Text.email(value(record, emailHeader));
                String groupValue = value(record, groupHeader);
                String phone = blankToNull(value(record, phoneHeader));
                if (Text.isBlank(firstName) || Text.isBlank(lastName)
                        || Text.isBlank(email) || Text.isBlank(groupValue)) {
                    skipped++;
                    errors.add("Sətir " + rowNo + ": ad, soyad, email və qrup boş ola bilməz.");
                    continue;
                }
                if (!email.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")) {
                    skipped++;
                    errors.add("Sətir " + rowNo + ": e-poçt formatı yanlışdır (" + email + ").");
                    continue;
                }
                if (!seenEmails.add(email)) {
                    skipped++;
                    errors.add("Sətir " + rowNo + ": e-poçt fayl daxilində təkrarlanır (" + email + ").");
                    continue;
                }
                if (users.emailExists(email, null)) {
                    skipped++;
                    errors.add("Sətir " + rowNo + ": bu e-poçt artıq sistemdə mövcuddur (" + email + ").");
                    continue;
                }
                Group group = groupsByCode.get(groupValue.trim().toLowerCase(Locale.ROOT));
                if (group == null) group = groupsByCode.get(groupValue.trim());
                if (group == null) {
                    skipped++;
                    errors.add("Sətir " + rowNo + ": qrup tapılmadı (" + groupValue + ").");
                    continue;
                }
                String password = generatePassword();
                // Hesab istifadəçi adı ilə yaradılır; bu hadisə yer tutucu e-poçt köməkçi kimi yerləşir.
                String baseUsername = email.split("@")[0].replaceAll("[^a-zA-Z0-9._-]", "").toLowerCase(Locale.ROOT);
                if (baseUsername.length() < 2) baseUsername = "user" + (100 + created.size());
                String username = baseUsername;
                int suffix = 1;
                while (users.usernameExists(username, null)) {
                    suffix++;
                    username = baseUsername + suffix;
                }
                String placeholderEmail = username + "@no-mail.it25patok.az";
                User user = new User(null, Role.STUDENT, placeholderEmail, username, passwordEncoder.encode(password),
                        Text.clean(firstName, 100), Text.clean(lastName, 100),
                        blankToNull(Text.clean(phone, 30)), group.id(), null, null, "system", true,
                        true, 0, null, null, null, true, null, 0, 0, null);
                String id = users.insert(user);
                // Email qeydiyyatı üçün yer tutucu saxlanılır — istifadəçi ilk girişdə öz gmailini qeyd edir.
                created.add(new AdminDtos.ImportCreated(Text.clean(firstName, 100),
                        Text.clean(lastName, 100), placeholderEmail, username, group.code(), password, false));
            }
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            throw ApiException.badRequest("INVALID_CSV", "CSV faylı oxuna bilmədi: " + e.getMessage());
        }
        audit.log("USERS_IMPORTED", "USER", null,
                Map.of("created", created.size(), "skipped", skipped));
        return new AdminDtos.ImportResult(created.size(), skipped, created, errors);
    }

    public byte[] exportUsersCsv(String roleValue, String groupId) {
        Role role = null;
        if (!Text.isBlank(roleValue)) {
            try {
                role = Role.valueOf(roleValue.trim().toUpperCase(Locale.ROOT));
            } catch (IllegalArgumentException e) {
                throw ApiException.badRequest("INVALID_ROLE", "Rol düzgün deyil.");
            }
        }
        PageResponse<User> result = users.search(null, role, groupId, null, 1, 10000, "name");
        Map<String, String> groupCodes = groupCodes();
        try {
            StringWriter out = new StringWriter();
            out.write('\uFEFF');
            try (CSVPrinter printer = new CSVPrinter(out, CSVFormat.DEFAULT.builder()
                    .setHeader("Ad", "Soyad", "E-poçt", "Qrup", "Rol", "Telefon", "Status",
                            "Yaradılma tarixi").build())) {
                for (User user : result.items()) {
                    printer.printRecord(user.firstName(), user.lastName(), user.email(),
                            groupCodes.getOrDefault(user.groupId(), ""), user.role().name(),
                            user.phone() == null ? "" : user.phone(),
                            user.active() ? "Aktiv" : "Deaktiv",
                            Time.dateTime(user.createdAt()));
                }
            }
            return out.toString().getBytes(StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw ApiException.badRequest("CSV_EXPORT_FAILED", "CSV faylı yaradıla bilmədi.");
        }
    }

    // ------------------------------------------------------------------ helpers

    private User requireUser(String id) {
        User user = users.findActiveById(id);
        if (user == null) user = users.findById(id);
        if (user == null || user.deletedAt() != null) throw ApiException.notFound("İstifadəçi tapılmadı.");
        return user;
    }

    private UserDto dto(User user) {
        String code = user.groupId() == null ? null : groups.findById(user.groupId()) == null
                ? null : groups.findById(user.groupId()).code();
        return UserDto.from(user, code);
    }

    private Map<String, String> groupCodes() {
        Map<String, String> result = new HashMap<>();
        for (Group group : groups.findAll()) result.put(group.id(), group.code());
        return result;
    }

    private String validateGroup(Role role, String groupId) {
        if (role != Role.STUDENT) return null;
        if (Text.isBlank(groupId)) {
            throw ApiException.badRequest("GROUP_REQUIRED", "Tələbə üçün qrup seçilməlidir.");
        }
        if (groups.findById(groupId) == null) throw ApiException.notFound("Qrup tapılmadı.");
        return groupId;
    }

    private List<AdminDtos.TeachingPair> validatePairs(List<AdminDtos.TeachingPair> pairs) {
        if (pairs == null || pairs.isEmpty()) return List.of();
        List<AdminDtos.TeachingPair> result = new ArrayList<>();
        Set<String> seen = new LinkedHashSet<>();
        for (AdminDtos.TeachingPair pair : pairs) {
            if (pair == null || Text.isBlank(pair.subjectId()) || Text.isBlank(pair.groupId())) {
                throw ApiException.badRequest("INVALID_TEACHING", "Fənn və qrup seçilməlidir.");
            }
            if (subjects.findById(pair.subjectId()) == null) {
                throw ApiException.notFound("Fənn tapılmadı.");
            }
            if (groups.findById(pair.groupId()) == null) {
                throw ApiException.notFound("Qrup tapılmadı.");
            }
            if (seen.add(pair.subjectId() + ":" + pair.groupId())) result.add(pair);
        }
        return result;
    }

    private void insertPairs(String teacherId, List<AdminDtos.TeachingPair> pairs) {
        for (AdminDtos.TeachingPair pair : pairs) {
            subjects.createTeachingAssignment(teacherId, pair.subjectId(), pair.groupId());
        }
    }

    private boolean sendAccountCreated(User user) {
        if (user == null) return false;
        // İstifadəçi yer tutucu e-poçt ilə yaradıldısa (hələ gmail qeyd etməyib) mail göndərmə
        if (user.email() != null && user.email().endsWith("@no-mail.it25patok.az")) {
            return false;
        }
        try {
            mail.sendAccountCreated(user);
            return true;
        } catch (RuntimeException e) {
            return false;
        }
    }

    private static String blankToNull(String value) {
        return Text.isBlank(value) ? null : value.trim();
    }

    private static String validatePassword(String value) {
        String password = value == null ? "" : value;
        if (password.length() < 8 || password.length() > 72
                || !password.matches(".*[A-Za-zƏəÖöÜüÇçĞğŞşİı].*")
                || !password.matches(".*\\d.*")) {
            throw ApiException.badRequest("WEAK_PASSWORD",
                    "Parol 8–72 simvol olmalı, ən azı bir hərf və bir rəqəm ehtiva etməlidir.");
        }
        return password;
    }

    public static String generatePassword() {
        StringBuilder password = new StringBuilder(14);
        password.append(LOWER.charAt(RANDOM.nextInt(LOWER.length())));
        password.append(UPPER.charAt(RANDOM.nextInt(UPPER.length())));
        password.append(DIGITS.charAt(RANDOM.nextInt(DIGITS.length())));
        password.append(SYMBOLS.charAt(RANDOM.nextInt(SYMBOLS.length())));
        String all = LOWER + UPPER + DIGITS + SYMBOLS;
        for (int i = 0; i < 10; i++) {
            password.append(all.charAt(RANDOM.nextInt(all.length())));
        }
        List<Character> chars = new ArrayList<>();
        for (char c : password.toString().toCharArray()) chars.add(c);
        Collections.shuffle(chars, RANDOM);
        StringBuilder shuffled = new StringBuilder(chars.size());
        for (char c : chars) shuffled.append(c);
        return shuffled.toString();
    }

    private static CSVFormat csvFormat(String content) {
        char delimiter = ',';
        String firstLine = content.lines().filter(line -> !line.isBlank()).findFirst().orElse("");
        long commas = firstLine.chars().filter(c -> c == ',').count();
        long semicolons = firstLine.chars().filter(c -> c == ';').count();
        if (semicolons > commas) delimiter = ';';
        return CSVFormat.DEFAULT.builder()
                .setDelimiter(delimiter)
                .setHeader()
                .setSkipHeaderRecord(true)
                .setIgnoreEmptyLines(true)
                .setIgnoreSurroundingSpaces(true)
                .setTrim(true)
                .build();
    }

    private static Map<String, String> normalizedHeaders(Map<String, Integer> raw) {
        Map<String, String> result = new LinkedHashMap<>();
        for (String header : raw.keySet()) {
            result.put(normalize(header), header);
        }
        return result;
    }

    private static String header(Map<String, String> headers, String... aliases) {
        for (String alias : aliases) {
            String found = headers.get(normalize(alias));
            if (found != null) return found;
        }
        return null;
    }

    private static String normalize(String value) {
        if (value == null) return "";
        String decomposed = Normalizer.normalize(value, Normalizer.Form.NFKD);
        return decomposed.replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]", "");
    }

    private static String value(CSVRecord record, String header) {
        if (header == null || !record.isMapped(header)) return null;
        String value = record.get(header);
        return value == null ? null : value.trim();
    }
}
