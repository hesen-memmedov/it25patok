package az.it25patok.file;

public record StoredFile(
        String id,
        String ownerId,
        String kind,
        String assignmentId,
        String submissionId,
        String originalName,
        String mimeType,
        long sizeBytes,
        String extension,
        String driveFileId,
        String driveFolderId,
        String sha256,
        long createdAt,
        long expiresAt,
        Long deletedAt
) {
    public boolean expired() {
        return deletedAt != null || expiresAt < System.currentTimeMillis();
    }
}
