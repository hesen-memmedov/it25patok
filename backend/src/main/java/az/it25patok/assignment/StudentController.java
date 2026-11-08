package az.it25patok.assignment;

import az.it25patok.auth.AuthUser;
import az.it25patok.auth.CurrentUser;
import az.it25patok.common.ApiResponse;
import az.it25patok.common.PageResponse;
import az.it25patok.submission.SubmissionService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/v1/student")
@PreAuthorize("hasRole('STUDENT')")
public class StudentController {
    private final AssignmentService assignments;
    private final SubmissionService submissions;
    private final CurrentUser currentUser;

    public StudentController(AssignmentService assignments, SubmissionService submissions,
                             CurrentUser currentUser) {
        this.assignments = assignments;
        this.submissions = submissions;
        this.currentUser = currentUser;
    }

    @GetMapping("/dashboard")
    public ApiResponse<AssignmentDtos.StudentDashboardDto> dashboard() {
        return ApiResponse.ok(assignments.studentDashboard(currentUser.require()));
    }

    @GetMapping("/subjects")
    public ApiResponse<List<AssignmentDtos.StudentSubjectDto>> subjects() {
        return ApiResponse.ok(assignments.studentSubjects(currentUser.require()));
    }

    @GetMapping("/assignments")
    public ApiResponse<PageResponse<AssignmentDtos.AssignmentDto>> assignments(
            @RequestParam(required = false) String subjectId,
            @RequestParam(required = false) AssignmentType type,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(assignments.studentAssignmentsPage(currentUser.require(), subjectId,
                type, search, page, size));
    }

    @GetMapping("/assignments/{id}")
    public ApiResponse<AssignmentDtos.StudentDetailDto> assignment(@PathVariable String id) {
        return ApiResponse.ok(assignments.studentDetail(id, currentUser.require()));
    }

    @PostMapping("/assignments/{id}/submission")
    public ApiResponse<AssignmentDtos.SubmissionDto> submit(
            @PathVariable String id,
            @RequestParam(required = false) String comment,
            @RequestParam(value = "files", required = false) List<MultipartFile> files) {
        AuthUser user = currentUser.require();
        return ApiResponse.ok(submissions.submit(id, user, comment, files));
    }

    @DeleteMapping("/submissions/{submissionId}/files/{fileId}")
    public ApiResponse<Void> deleteFile(@PathVariable String submissionId, @PathVariable String fileId) {
        submissions.deleteFile(submissionId, fileId, currentUser.require());
        return ApiResponse.ok();
    }

    @GetMapping("/missing")
    public ApiResponse<List<AssignmentDtos.MissingGroupDto>> missing() {
        return ApiResponse.ok(assignments.studentMissing(currentUser.require()));
    }
}
