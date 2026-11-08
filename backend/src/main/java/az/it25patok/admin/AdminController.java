package az.it25patok.admin;

import az.it25patok.common.ApiResponse;
import az.it25patok.common.PageResponse;
import az.it25patok.subject.Subject;
import az.it25patok.subject.TeachingAssignment;
import az.it25patok.user.Role;
import az.it25patok.user.UserDto;
import az.it25patok.group.Group;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {
    private final AdminService admin;

    public AdminController(AdminService admin) {
        this.admin = admin;
    }

    // ------------------------------------------------------------------ users

    @GetMapping("/users")
    public ApiResponse<PageResponse<UserDto>> users(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Role role,
            @RequestParam(required = false) String groupId,
            @RequestParam(required = false) Boolean active,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "created") String sort) {
        return ApiResponse.ok(admin.listUsers(search, role, groupId, active, page, size, sort));
    }

    @GetMapping("/users/{id}")
    public ApiResponse<AdminDtos.UserDetail> user(@PathVariable String id) {
        return ApiResponse.ok(admin.userDetail(id));
    }

    @PostMapping("/users")
    public ApiResponse<AdminDtos.CreatedUser> createUser(
            @Valid @RequestBody AdminDtos.CreateUserRequest request) {
        return ApiResponse.ok(admin.createUser(request));
    }

    @PutMapping("/users/{id}")
    public ApiResponse<UserDto> updateUser(@PathVariable String id,
                                           @Valid @RequestBody AdminDtos.UpdateUserRequest request) {
        return ApiResponse.ok(admin.updateUser(id, request));
    }

    @DeleteMapping("/users/{id}")
    public ApiResponse<Void> deleteUser(@PathVariable String id) {
        admin.deleteUser(id);
        return ApiResponse.ok();
    }

    @PostMapping("/users/{id}/reset-password")
    public ApiResponse<AdminDtos.ResetPasswordResponse> resetPassword(@PathVariable String id) {
        return ApiResponse.ok(admin.resetPassword(id));
    }

    @PostMapping("/users/{id}/mute")
    public ApiResponse<UserDto> mute(@PathVariable String id,
                                     @Valid @RequestBody AdminDtos.MuteRequest request) {
        return ApiResponse.ok(admin.muteUser(id, request.minutes()));
    }

    @PostMapping(value = "/users/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<AdminDtos.ImportResult> importUsers(@RequestPart("file") MultipartFile file) {
        return ApiResponse.ok(admin.importStudents(file));
    }

    @GetMapping(value = "/users/export", produces = "text/csv;charset=UTF-8")
    public ResponseEntity<byte[]> exportUsers(
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String groupId) {
        byte[] csv = admin.exportUsersCsv(role, groupId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"it25patok-users.csv\"")
                .contentType(MediaType.parseMediaType("text/csv;charset=UTF-8"))
                .body(csv);
    }

    // ------------------------------------------------------------------ groups

    @GetMapping("/groups")
    public ApiResponse<List<Group>> groups() {
        return ApiResponse.ok(admin.listGroups());
    }

    @PostMapping("/groups")
    public ApiResponse<Group> createGroup(@Valid @RequestBody AdminDtos.CreateGroupRequest request) {
        return ApiResponse.ok(admin.createGroup(request));
    }

    @DeleteMapping("/groups/{id}")
    public ApiResponse<Void> deleteGroup(@PathVariable String id) {
        admin.deleteGroup(id);
        return ApiResponse.ok();
    }

    @PostMapping("/groups/{groupId}/students/{studentId}")
    public ApiResponse<UserDto> moveStudent(@PathVariable String groupId,
                                            @PathVariable String studentId) {
        return ApiResponse.ok(admin.moveStudent(groupId, studentId));
    }

    // ------------------------------------------------------------------ subjects

    @GetMapping("/subjects")
    public ApiResponse<List<AdminDtos.SubjectWithAssignments>> subjects() {
        return ApiResponse.ok(admin.listSubjects());
    }

    @PostMapping("/subjects")
    public ApiResponse<Subject> createSubject(@Valid @RequestBody AdminDtos.SubjectRequest request) {
        return ApiResponse.ok(admin.createSubject(request));
    }

    @PutMapping("/subjects/{id}")
    public ApiResponse<Subject> updateSubject(@PathVariable String id,
                                              @Valid @RequestBody AdminDtos.SubjectRequest request) {
        return ApiResponse.ok(admin.updateSubject(id, request));
    }

    @DeleteMapping("/subjects/{id}")
    public ApiResponse<Void> deleteSubject(@PathVariable String id) {
        admin.deleteSubject(id);
        return ApiResponse.ok();
    }

    // ------------------------------------------------------------------ teaching

    @GetMapping("/teaching-assignments")
    public ApiResponse<List<TeachingAssignment>> teachingAssignments(
            @RequestParam(required = false) String teacherId,
            @RequestParam(required = false) String groupId) {
        return ApiResponse.ok(admin.listTeachingAssignments(teacherId, groupId));
    }

    @PostMapping("/teaching-assignments")
    public ApiResponse<TeachingAssignment> createTeachingAssignment(
            @Valid @RequestBody AdminDtos.TeachingAssignmentRequest request) {
        return ApiResponse.ok(admin.createTeachingAssignment(request));
    }

    @DeleteMapping("/teaching-assignments/{id}")
    public ApiResponse<Void> deleteTeachingAssignment(@PathVariable String id) {
        admin.deleteTeachingAssignment(id);
        return ApiResponse.ok();
    }

    // ------------------------------------------------------------------ reporting

    @GetMapping("/stats")
    public ApiResponse<AdminDtos.AdminStats> stats() {
        return ApiResponse.ok(admin.stats());
    }

    @GetMapping("/dashboard")
    public ApiResponse<AdminDtos.DashboardSummary> dashboard() {
        return ApiResponse.ok(admin.dashboard());
    }

    @GetMapping("/audit-log")
    public ApiResponse<PageResponse<Map<String, Object>>> auditLog(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "30") int size,
            @RequestParam(required = false) String action) {
        return ApiResponse.ok(admin.auditLog(page, size, action));
    }

    @GetMapping("/email-log")
    public ApiResponse<PageResponse<Map<String, Object>>> emailLog(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "30") int size) {
        return ApiResponse.ok(admin.emailLog(page, size));
    }

    @GetMapping("/files")
    public ApiResponse<PageResponse<Map<String, Object>>> files(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String kind) {
        return ApiResponse.ok(admin.files(page, size, search, kind));
    }

    @GetMapping("/files/expiring")
    public ApiResponse<List<Map<String, Object>>> expiringFiles(
            @RequestParam(defaultValue = "30") int days) {
        return ApiResponse.ok(admin.expiringFiles(days));
    }

    @GetMapping("/assignments")
    public ApiResponse<PageResponse<Map<String, Object>>> assignments(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search) {
        return ApiResponse.ok(admin.allAssignments(page, size, search));
    }

    // ------------------------------------------------------------------ settings

    @GetMapping("/settings")
    public ApiResponse<Map<String, Object>> settings() {
        return ApiResponse.ok(admin.settings());
    }

    @PutMapping("/settings")
    public ApiResponse<Map<String, Object>> updateSettings(
            @RequestBody Map<String, String> values) {
        return ApiResponse.ok(admin.updateSettings(values));
    }
}
