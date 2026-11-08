package az.it25patok.admin;

import az.it25patok.assignment.AssignmentDtos;
import az.it25patok.group.Group;
import az.it25patok.subject.Subject;
import az.it25patok.subject.TeachingAssignment;
import az.it25patok.user.Role;
import az.it25patok.user.UserDto;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.Map;

public final class AdminDtos {
    private AdminDtos() {}

    public record TeachingPair(@NotBlank String subjectId, @NotBlank String groupId) {}

    public record CreateUserRequest(
            @NotNull Role role,
            @NotBlank @Size(max = 60) String username,
            @NotBlank @Size(max = 100) String firstName,
            @NotBlank @Size(max = 100) String lastName,
            @Size(max = 30) String phone,
            String groupId,
            String initialPassword,
            List<TeachingPair> teachingAssignments
    ) {}

    public record UpdateUserRequest(
            @NotBlank @Email String email,
            @NotBlank @Size(max = 100) String firstName,
            @NotBlank @Size(max = 100) String lastName,
            @Size(max = 30) String phone,
            @NotNull Role role,
            String groupId,
            Boolean active,
            List<TeachingPair> teachingAssignments
    ) {}

    public record CreatedUser(UserDto user, String initialPassword, boolean emailSent) {}

    public record ResetPasswordResponse(String password) {}

    public record UserDetail(UserDto user, List<TeachingAssignment> teachingAssignments) {}

    public record ImportCreated(String firstName, String lastName, String email, String username, String groupCode,
                                String password, boolean emailSent) {}

    public record ImportResult(int createdCount, int skippedCount, List<ImportCreated> created,
                               List<String> errors) {}

    public record SubjectRequest(@NotBlank @Size(max = 150) String name,
                                 @Size(max = 30) String code,
                                 @Size(max = 2000) String description) {}

    public record SubjectWithAssignments(Subject subject, List<TeachingAssignment> assignments) {}

    public record GroupWithStudents(Group group, List<UserDto> students) {}

    public record CreateGroupRequest(@NotBlank @Size(max = 30) String code,
                                     @NotBlank @Size(max = 120) String name) {}

    public record TeachingAssignmentRequest(@NotBlank String teacherId, @NotBlank String subjectId,
                                            @NotBlank String groupId) {}

    public record MuteRequest(int minutes) {}

    public record GroupStats(String groupId, String groupCode, long students, long assignments,
                             long submissions, double submissionRate) {}

    public record AdminStats(long students, long teachers, long admins, long assignments, long submissions,
                             long missing, long files, long storageBytes, long emailsToday, long chatMessages,
                             List<GroupStats> groups, List<Map<String, Object>> recentAudit) {}

    public record DashboardSummary(long users, long assignments, long submissions, long missing,
                                   List<AssignmentDtos.MissingItemDto> topMissing,
                                   long chatMessages, List<Map<String, Object>> recentAudit) {}
}
