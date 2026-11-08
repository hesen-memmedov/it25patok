package az.it25patok.file;

public record FileDto(
        String id,
        String kind,
        String originalName,
        String mimeType,
        long sizeBytes,
        String extension,
        String ownerId,
        String assignmentId,
        String submissionId,
        long createdAt,
        long expiresAt,
        boolean expired
) {
    public static FileDto from(StoredFile file) {
        return new FileDto(file.id(), file.kind(), file.originalName(), file.mimeType(), file.sizeBytes(),
                file.extension(), file.ownerId(), file.assignmentId(), file.submissionId(),
                file.createdAt(), file.expiresAt(), file.expired());
    }
}
