package az.it25patok.submission;

public record Submission(
        String id,
        String assignmentId,
        String studentId,
        SubmissionStatus status,
        String comment,
        Double score,
        String teacherFeedback,
        long submittedAt,
        long updatedAt
) {
}
