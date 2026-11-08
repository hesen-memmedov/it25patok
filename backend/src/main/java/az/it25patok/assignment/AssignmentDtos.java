package az.it25patok.assignment;

import az.it25patok.file.FileDto;
import az.it25patok.group.Group;
import az.it25patok.subject.Subject;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public final class AssignmentDtos {
    private AssignmentDtos() {}

    public record AssignmentDto(
            String id,
            String teacherId,
            String teacherName,
            String subjectId,
            String subjectName,
            AssignmentType type,
            String title,
            String description,
            Long deadline,
            Double maxScore,
            boolean archived,
            boolean allowLate,
            List<String> groupIds,
            List<String> groupCodes,
            int attachmentCount,
            int submittedCount,
            String myStatus,
            Long mySubmittedAt,
            Double myScore,
            long createdAt
    ) {}

    public record DetailDto(AssignmentDto assignment, List<FileDto> attachments) {}

    public record StudentDetailDto(AssignmentDto assignment, List<FileDto> attachments,
                                    SubmissionDto submission) {}

    public record CreateRequest(
            @NotNull(message = "Tapşırıq tipi tələb olunur") AssignmentType type,
            @NotBlank(message = "Fənn tələb olunur") String subjectId,
            @NotBlank(message = "Başlıq tələb olunur") @Size(max = 200, message = "Başlıq 200 simvoldan çox ola bilməz") String title,
            @Size(max = 20000, message = "Təsvir çox uzundur") String description,
            Long deadline,
            @DecimalMin(value = "0", message = "Bal mənfi ola bilməz") Double maxScore,
            Boolean allowLate,
            @NotEmpty(message = "Ən azı bir qrup seçilməlidir") List<String> groupIds
    ) {}

    public record UpdateRequest(
            @NotNull(message = "Tapşırıq tipi tələb olunur") AssignmentType type,
            @NotBlank(message = "Fənn tələb olunur") String subjectId,
            @NotBlank(message = "Başlıq tələb olunur") @Size(max = 200) String title,
            @Size(max = 20000) String description,
            Long deadline,
            @DecimalMin("0") Double maxScore,
            Boolean allowLate,
            Boolean archived,
            @NotEmpty(message = "Ən azı bir qrup seçilməlidir") List<String> groupIds
    ) {}

    public record StudentSubjectDto(String id, String name, String code, String description,
                                    long total, long submitted, long missing) {}

    public record MissingItemDto(String assignmentId, String title, AssignmentType type,
                                 String subjectId, String subjectName, Long deadline,
                                 String status, long daysLate) {}

    public record MissingGroupDto(String subjectId, String subjectName, List<MissingItemDto> items) {}

    public record StudentDashboardDto(long assignments, long submitted, long missing, long overdue,
                                      long subjects, List<AssignmentDto> upcoming,
                                      List<MissingItemDto> missingItems) {}

    public record TeacherSubjectDto(Subject subject, List<Group> groups) {}

    public record StudentMissingSummary(String studentId, String studentName, String groupId,
                                        String groupCode, long count, List<MissingItemDto> items) {}

    public record TeacherDashboardDto(long activeAssignments, long students, long missing,
                                      List<AssignmentDto> recent, List<Group> groups) {}

    public record SubmissionRowDto(String studentId, String studentName, String email, String groupId,
                                   String groupCode, String avatarFileId, String submissionId,
                                   String status, Long submittedAt, String comment, Double score,
                                   String teacherFeedback, int fileCount) {}

    public record SubmissionDto(String id, String assignmentId, String studentId, String studentName,
                                String status, String comment, Double score, String teacherFeedback,
                                long submittedAt, int fileCount, List<FileDto> files) {}

    public record SubmissionDetailDto(String id, String assignmentId, String assignmentTitle,
                                      String studentId, String studentName, String groupCode,
                                      String status, String comment, Double score, String teacherFeedback,
                                      long submittedAt, List<FileDto> files) {}

    public record GradeRequest(@DecimalMin(value = "0", message = "Bal mənfi ola bilməz") Double score,
                               @Size(max = 5000) String feedback) {}

    public record SubmissionsPayload(List<SubmissionRowDto> items, int total, int submitted,
                                     List<Group> groups) {}
}
