package az.it25patok.file;

import az.it25patok.assignment.Assignment;
import az.it25patok.assignment.AssignmentRepository;
import az.it25patok.auth.AuthUser;
import az.it25patok.common.ApiException;
import az.it25patok.common.AuditService;
import az.it25patok.common.Ids;
import az.it25patok.common.SettingsService;
import az.it25patok.common.Text;
import az.it25patok.common.Time;
import az.it25patok.config.AppProperties;
import az.it25patok.submission.Submission;
import az.it25patok.submission.SubmissionRepository;
import az.it25patok.submission.SubmissionStatus;
import az.it25patok.user.User;
import az.it25patok.user.UserRepository;
import org.apache.tika.Tika;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.security.DigestInputStream;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;

@Service
public class FileService {
    private final FileRepository files;
    private final StorageService storage;
    private final SettingsService settings;
    private final AppProperties props;
    private final UserRepository users;
    private final AssignmentRepository assignments;
    private final SubmissionRepository submissions;
    private final AuditService audit;
    private final Tika tika = new Tika();

    public FileService(FileRepository files, StorageService storage, SettingsService settings,
                       AppProperties props, UserRepository users, AssignmentRepository assignments,
                       SubmissionRepository submissions, AuditService audit) {
        this.files = files;
        this.storage = storage;
        this.settings = settings;
        this.props = props;
        this.users = users;
        this.assignments = assignments;
        this.submissions = submissions;
        this.audit = audit;
    }

    public StoredFile upload(MultipartFile part, String ownerId, String kind, String assignmentId,
                             String submissionId, List<String> folders) {
        if (part == null || part.isEmpty()) {
            throw ApiException.badRequest("EMPTY_FILE", "Boş fayl yüklənə bilməz.");
        }
        String originalName = Text.safeFileName(part.getOriginalFilename());
        String extension = Text.extension(originalName);
        List<String> blocked = settings.csv("blocked_extensions");
        if (blocked.stream().anyMatch(ext -> ext.equalsIgnoreCase(extension))) {
            throw ApiException.badRequest("BLOCKED_FILE_TYPE",
                    "Bu fayl tipi təhlükəsizlik səbəbindən bloklanıb: ." + extension);
        }
        long maxBytes = settings.integer("max_file_size_mb", 50) * 1024L * 1024L;
        if (part.getSize() > maxBytes) {
            throw new ApiException(org.springframework.http.HttpStatus.PAYLOAD_TOO_LARGE, "FILE_TOO_LARGE",
                    "Fayl ölçüsü " + settings.integer("max_file_size_mb", 50) + " MB-dan böyük ola bilməz.");
        }
        String mime;
        try (InputStream detectStream = part.getInputStream()) {
            mime = tika.detect(detectStream, originalName);
        } catch (IOException e) {
            throw ApiException.badRequest("FILE_READ_ERROR", "Fayl oxuna bilmədi.");
        }
        String sha256;
        try (InputStream in = part.getInputStream();
             DigestInputStream digestStream = new DigestInputStream(in, MessageDigest.getInstance("SHA-256"))) {
            byte[] buffer = new byte[8192];
            while (digestStream.read(buffer) != -1) {
                // digest üçün oxunur
            }
            sha256 = HexFormat.of().formatHex(digestStream.getMessageDigest().digest());
        } catch (Exception e) {
            throw ApiException.badRequest("FILE_READ_ERROR", "Fayl oxuna bilmədi.");
        }

        String id = Ids.newId();
        String objectId;
        try (InputStream in = part.getInputStream()) {
            objectId = storage.upload(id, in, part.getSize(), originalName, mime, folders);
        } catch (Exception e) {
            throw new ApiException(org.springframework.http.HttpStatus.BAD_GATEWAY, "STORAGE_ERROR",
                    "Fayl saxlama xidmətinə yazıla bilmədi.");
        }
        long now = Time.now();
        StoredFile file = new StoredFile(id, ownerId, kind, assignmentId, submissionId, originalName,
                mime, part.getSize(), extension, objectId, null, sha256, now,
                now + props.files().expiryDays() * 24L * 60 * 60 * 1000, null);
        try {
            files.insert(file);
        } catch (RuntimeException e) {
            storage.delete(objectId);
            throw e;
        }
        audit.log(ownerId, "FILE_UPLOADED", "FILE", id, Map.of("name", originalName, "size", part.getSize()));
        return file;
    }

    public StoredFile requireActive(String id) {
        StoredFile file = files.findById(id);
        if (file == null) throw ApiException.notFound("Fayl tapılmadı.");
        if (file.deletedAt() != null) {
            throw new ApiException(org.springframework.http.HttpStatus.GONE, "FILE_EXPIRED",
                    "Bu faylın saxlanma müddəti bitib və silinib.");
        }
        return file;
    }

    public boolean canView(StoredFile file, AuthUser user) {
        if ("ADMIN".equals(user.role())) return true;
        if (file.ownerId().equals(user.id())) return true;
        if ("AVATAR".equals(file.kind())) return true;
        if ("ASSIGNMENT_ATTACHMENT".equals(file.kind())) {
            Assignment assignment = assignments.findById(file.assignmentId());
            if (assignment == null) return false;
            if (assignment.teacherId().equals(user.id())) return true;
            if (assignment.archived()) return false;
            if (!"STUDENT".equals(user.role())) return false;
            User student = users.findActiveById(user.id());
            return student != null && student.groupId() != null
                    && assignments.findGroupIds(assignment.id()).contains(student.groupId());
        }
        if ("SUBMISSION".equals(file.kind())) {
            Submission submission = submissions.findById(file.submissionId());
            if (submission == null) return false;
            if (submission.studentId().equals(user.id())) return true;
            Assignment assignment = assignments.findById(submission.assignmentId());
            return assignment != null && assignment.teacherId().equals(user.id());
        }
        return false;
    }

    public void requireViewable(String fileId, AuthUser user) {
        StoredFile file = requireActive(fileId);
        if (!canView(file, user)) {
            throw ApiException.forbidden("Bu fayla giriş icazəniz yoxdur.");
        }
    }

    public boolean canManage(StoredFile file, AuthUser user) {
        return "ADMIN".equals(user.role()) || file.ownerId().equals(user.id());
    }

    public void delete(String fileId, AuthUser user) {
        StoredFile file = requireActive(fileId);
        if (!canManage(file, user)) {
            throw ApiException.forbidden("Bu faylı silmək icazəniz yoxdur.");
        }
        Submission submission = file.submissionId() == null ? null : submissions.findById(file.submissionId());
        if (submission != null && submission.status() == SubmissionStatus.GRADED
                && !"ADMIN".equals(user.role())) {
            throw ApiException.badRequest("GRADED_SUBMISSION", "Qiymətləndirilmiş təhvildən fayl silinə bilməz.");
        }
        storage.delete(file.driveFileId());
        files.markDeleted(file.id());
        if (submission != null && files.countBySubmission(submission.id()) == 0
                && submission.status() != SubmissionStatus.GRADED) {
            submissions.delete(submission.id());
        }
        audit.log(user.id(), "FILE_DELETED", "FILE", fileId, Map.of("name", file.originalName()));
    }

    public List<FileDto> attachments(String assignmentId) {
        return files.listByAssignment(assignmentId).stream().map(FileDto::from).toList();
    }

    public List<FileDto> submissionFiles(String submissionId) {
        return files.listBySubmission(submissionId).stream().map(FileDto::from).toList();
    }

    public FileRepository repository() {
        return files;
    }

    public StorageService storage() {
        return storage;
    }
}
