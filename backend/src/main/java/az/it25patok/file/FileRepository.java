package az.it25patok.file;

import az.it25patok.common.Db;
import az.it25patok.common.Ids;
import az.it25patok.common.PageResponse;
import az.it25patok.common.Time;
import az.it25patok.d1.D1Client;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Repository
public class FileRepository {
    private final D1Client d1;

    public FileRepository(D1Client d1) {
        this.d1 = d1;
    }

    public static StoredFile map(Map<String, Object> row) {
        if (row == null) return null;
        return new StoredFile(Db.str(row, "id"), Db.str(row, "owner_id"), Db.str(row, "kind"),
                Db.str(row, "assignment_id"), Db.str(row, "submission_id"),
                Db.str(row, "original_name"), Db.str(row, "mime_type"),
                Db.lng(row, "size_bytes", 0), Db.str(row, "extension"), Db.str(row, "drive_file_id"),
                Db.str(row, "drive_folder_id"), Db.str(row, "sha256"),
                Db.lng(row, "created_at", 0), Db.lng(row, "expires_at", 0), Db.lng(row, "deleted_at"));
    }

    public StoredFile findById(String id) {
        return map(d1.queryOne("SELECT * FROM files WHERE id = ?", id));
    }

    public String insert(StoredFile file) {
        String id = file.id() == null ? Ids.newId() : file.id();
        d1.update("""
                INSERT INTO files(id, owner_id, kind, assignment_id, submission_id, original_name, mime_type,
                  size_bytes, extension, drive_file_id, drive_folder_id, sha256, created_at, expires_at, deleted_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, id, file.ownerId(), file.kind(), file.assignmentId(), file.submissionId(),
                file.originalName(), file.mimeType(), file.sizeBytes(), file.extension(),
                file.driveFileId(), file.driveFolderId(), file.sha256(), file.createdAt(),
                file.expiresAt(), file.deletedAt());
        return id;
    }

    public List<StoredFile> listByAssignment(String assignmentId) {
        return d1.query("SELECT * FROM files WHERE assignment_id = ? AND kind = 'ASSIGNMENT_ATTACHMENT' "
                        + "AND deleted_at IS NULL ORDER BY created_at", assignmentId)
                .stream().map(FileRepository::map).toList();
    }

    public List<StoredFile> listBySubmission(String submissionId) {
        return d1.query("SELECT * FROM files WHERE submission_id = ? AND deleted_at IS NULL ORDER BY created_at",
                        submissionId)
                .stream().map(FileRepository::map).toList();
    }

    public int countBySubmission(String submissionId) {
        Long count = Db.lng(d1.queryOne("SELECT COUNT(*) c FROM files WHERE submission_id = ? AND deleted_at IS NULL",
                submissionId), "c");
        return count == null ? 0 : count.intValue();
    }

    public void markDeleted(String id) {
        d1.update("UPDATE files SET deleted_at = ? WHERE id = ?", Time.now(), id);
    }

    public List<StoredFile> findExpired(long now, int limit) {
        return d1.query("SELECT * FROM files WHERE deleted_at IS NULL AND expires_at < ? LIMIT ?", now, limit)
                .stream().map(FileRepository::map).toList();
    }

    public List<StoredFile> findExpiringBetween(long from, long to) {
        return d1.query("SELECT * FROM files WHERE deleted_at IS NULL AND expires_at >= ? AND expires_at <= ? "
                + "ORDER BY expires_at", from, to).stream().map(FileRepository::map).toList();
    }

    public PageResponse<Map<String, Object>> listAll(String search, String kind, int page, int size) {
        StringBuilder where = new StringBuilder(" WHERE f.deleted_at IS NULL");
        List<Object> params = new ArrayList<>();
        if (search != null && !search.isBlank()) {
            where.append(" AND lower(f.original_name) LIKE ?");
            params.add("%" + search.trim().toLowerCase() + "%");
        }
        if (kind != null && !kind.isBlank()) {
            where.append(" AND f.kind = ?");
            params.add(kind);
        }
        Long total = Db.lng(d1.queryOne("SELECT COUNT(*) c FROM files f" + where, params.toArray()), "c");
        List<Object> pageParams = new ArrayList<>(params);
        pageParams.add(size);
        pageParams.add(Math.max(0, page - 1) * size);
        List<Map<String, Object>> rows = d1.query("""
                SELECT f.*, u.first_name || ' ' || u.last_name owner_name, u.email owner_email
                FROM files f JOIN users u ON u.id = f.owner_id
                """ + where + " ORDER BY f.created_at DESC LIMIT ? OFFSET ?", pageParams.toArray());
        return PageResponse.of(rows, total == null ? 0 : total, page, size);
    }

    public long totalBytes() {
        Long value = Db.lng(d1.queryOne("SELECT COALESCE(SUM(size_bytes), 0) s FROM files WHERE deleted_at IS NULL"), "s");
        return value == null ? 0 : value;
    }

    public long countActive() {
        Long value = Db.lng(d1.queryOne("SELECT COUNT(*) c FROM files WHERE deleted_at IS NULL"), "c");
        return value == null ? 0 : value;
    }

    public long countExpiringSoon(long from, long to) {
        Long value = Db.lng(d1.queryOne("SELECT COUNT(*) c FROM files WHERE deleted_at IS NULL "
                + "AND expires_at >= ? AND expires_at <= ?", from, to), "c");
        return value == null ? 0 : value;
    }
}
