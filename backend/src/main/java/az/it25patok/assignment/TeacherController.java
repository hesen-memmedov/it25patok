package az.it25patok.assignment;

import az.it25patok.auth.AuthUser;
import az.it25patok.auth.CurrentUser;
import az.it25patok.common.ApiException;
import az.it25patok.common.ApiResponse;
import az.it25patok.common.PageResponse;
import az.it25patok.file.FileDto;
import az.it25patok.file.FileRepository;
import az.it25patok.file.FileService;
import az.it25patok.file.StoredFile;
import az.it25patok.group.Group;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/teacher")
@PreAuthorize("hasRole('TEACHER')")
public class TeacherController {
    private final AssignmentService assignments;
    private final CurrentUser currentUser;
    private final FileService files;
    private final FileRepository fileRepository;

    public TeacherController(AssignmentService assignments, CurrentUser currentUser,
                             FileService files, FileRepository fileRepository) {
        this.assignments = assignments;
        this.currentUser = currentUser;
        this.files = files;
        this.fileRepository = fileRepository;
    }

    @GetMapping("/dashboard")
    public ApiResponse<AssignmentDtos.TeacherDashboardDto> dashboard() {
        return ApiResponse.ok(assignments.teacherDashboard(currentUser.require()));
    }

    @GetMapping("/subjects")
    public ApiResponse<List<AssignmentDtos.TeacherSubjectDto>> subjects() {
        return ApiResponse.ok(assignments.teacherSubjects(currentUser.require()));
    }

    @GetMapping("/groups")
    public ApiResponse<List<Group>> groups() {
        return ApiResponse.ok(assignments.teacherGroups(currentUser.require()));
    }

    @GetMapping("/assignments")
    public ApiResponse<PageResponse<AssignmentDtos.AssignmentDto>> list(
            @RequestParam(required = false) String subjectId,
            @RequestParam(required = false) AssignmentType type,
            @RequestParam(required = false) Boolean archived,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {
        AuthUser user = currentUser.require();
        return ApiResponse.ok(assignments.teacherAssignments(user, subjectId, type, archived, search, page, size));
    }

    @PostMapping("/assignments")
    public ApiResponse<AssignmentDtos.DetailDto> create(@Valid @RequestBody AssignmentDtos.CreateRequest request) {
        return ApiResponse.ok(assignments.create(currentUser.require(), request));
    }

    @GetMapping("/assignments/{id}")
    public ApiResponse<AssignmentDtos.DetailDto> detail(@PathVariable String id) {
        return ApiResponse.ok(assignments.detail(id, currentUser.require()));
    }

    @PutMapping("/assignments/{id}")
    public ApiResponse<AssignmentDtos.DetailDto> update(@PathVariable String id,
                                                        @Valid @RequestBody AssignmentDtos.UpdateRequest request) {
        return ApiResponse.ok(assignments.update(id, currentUser.require(), request));
    }

    @PatchMapping("/assignments/{id}/archive")
    public ApiResponse<Void> archive(@PathVariable String id,
                                     @RequestParam(defaultValue = "true") boolean value) {
        assignments.archive(id, value, currentUser.require());
        return ApiResponse.ok();
    }

    @DeleteMapping("/assignments/{id}")
    public ApiResponse<Void> delete(@PathVariable String id) {
        assignments.delete(id, currentUser.require());
        return ApiResponse.ok();
    }

    @PostMapping("/assignments/{id}/attachments")
    public ApiResponse<List<FileDto>> uploadAttachments(@PathVariable String id,
                                                        @RequestParam("files") List<MultipartFile> uploads) {
        AuthUser user = currentUser.require();
        AssignmentDtos.DetailDto detail = assignments.detail(id, user);
        List<FileDto> result = uploads.stream().filter(f -> f != null && !f.isEmpty())
                .map(file -> files.upload(file, user.id(), "ASSIGNMENT_ATTACHMENT", id, null,
                        List.of("_teacher_attachments",
                                detail.assignment().subjectName() + "_" + id)))
                .map(FileDto::from).toList();
        return ApiResponse.ok(result);
    }

    @DeleteMapping("/assignments/{id}/attachments/{fileId}")
    public ApiResponse<Void> deleteAttachment(@PathVariable String id, @PathVariable String fileId) {
        AuthUser user = currentUser.require();
        assignments.detail(id, user);
        StoredFile file = files.requireActive(fileId);
        if (!"ASSIGNMENT_ATTACHMENT".equals(file.kind()) || !id.equals(file.assignmentId())) {
            throw ApiException.notFound("Qoşma fayl tapılmadı.");
        }
        files.delete(fileId, user);
        return ApiResponse.ok();
    }

    @GetMapping("/assignments/{id}/submissions")
    public ApiResponse<AssignmentDtos.SubmissionsPayload> submissions(
            @PathVariable String id, @RequestParam(required = false) String groupId) {
        return ApiResponse.ok(assignments.teacherSubmissions(id, groupId, currentUser.require()));
    }

    @GetMapping("/submissions/{id}")
    public ApiResponse<AssignmentDtos.SubmissionDetailDto> submission(@PathVariable String id) {
        return ApiResponse.ok(assignments.submissionDetail(id, currentUser.require()));
    }

    @PutMapping("/submissions/{id}/grade")
    public ApiResponse<AssignmentDtos.SubmissionDetailDto> grade(
            @PathVariable String id, @Valid @RequestBody AssignmentDtos.GradeRequest request) {
        return ApiResponse.ok(assignments.grade(id, currentUser.require(), request));
    }

    @GetMapping("/students/{id}/missing")
    public ApiResponse<List<AssignmentDtos.MissingGroupDto>> studentMissing(@PathVariable String id) {
        return ApiResponse.ok(assignments.teacherStudentMissing(id, currentUser.require()));
    }

    @GetMapping("/missing-overview")
    public ApiResponse<List<AssignmentDtos.StudentMissingSummary>> missingOverview() {
        return ApiResponse.ok(assignments.teacherMissingOverview(currentUser.require()));
    }
}
