package az.it25patok.assignment;

import java.util.List;

public record Assignment(
        String id,
        String teacherId,
        String subjectId,
        AssignmentType type,
        String title,
        String description,
        Long deadline,
        Double maxScore,
        boolean archived,
        boolean allowLate,
        long createdAt,
        long updatedAt,
        String subjectName,
        String teacherName,
        String groupCodes,
        int attachmentCount,
        int submittedCount
) {
    public List<String> groupCodeList() {
        return groupCodes == null || groupCodes.isBlank() ? List.of() : List.of(groupCodes.split(","));
    }
}
