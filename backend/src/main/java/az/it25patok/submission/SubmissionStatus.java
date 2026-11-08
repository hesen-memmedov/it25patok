package az.it25patok.submission;

public enum SubmissionStatus {
    SUBMITTED, LATE, GRADED, RETURNED;

    public static SubmissionStatus from(String value) {
        return value == null ? null : SubmissionStatus.valueOf(value.toUpperCase());
    }
}
