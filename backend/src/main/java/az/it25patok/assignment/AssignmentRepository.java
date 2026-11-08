package az.it25patok.assignment;

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
public class AssignmentRepository {
    private final D1Client d1;

    public AssignmentRepository(D1Client d1) {
        this.d1 = d1;
    }

    private static final String BASE_SELECT = """
            SELECT a.*, s.name subject_name, u.first_name || ' ' || u.last_name teacher_name,
              (SELECT GROUP_CONCAT(g.code, ',') FROM assignment_groups ag
                 JOIN groups g ON g.id = ag.group_id WHERE ag.assignment_id = a.id) group_codes,
              (SELECT COUNT(*) FROM files f WHERE f.assignment_id = a.id AND f.kind = 'ASSIGNMENT_ATTACHMENT'
                 AND f.deleted_at IS NULL) attachment_count,
              (SELECT COUNT(*) FROM submissions sub WHERE sub.assignment_id = a.id) submitted_count
            FROM assignments a
            JOIN subjects s ON s.id = a.subject_id
            JOIN users u ON u.id = a.teacher_id
            """;

    public static Assignment map(Map<String, Object> row) {
        if (row == null) return null;
        return new Assignment(
                Db.str(row, "id"), Db.str(row, "teacher_id"), Db.str(row, "subject_id"),
                AssignmentType.valueOf(Db.str(row, "type")), Db.str(row, "title"),
                Db.str(row, "description"), Db.lng(row, "deadline"), Db.dblOrNull(row, "max_score"),
                Db.bool(row, "is_archived"), Db.bool(row, "allow_late"),
                Db.lng(row, "created_at", 0), Db.lng(row, "updated_at", 0),
                Db.str(row, "subject_name"), Db.str(row, "teacher_name"), Db.str(row, "group_codes"),
                Db.integer(row, "attachment_count", 0), Db.integer(row, "submitted_count", 0));
    }

    public Assignment findById(String id) {
        return map(d1.queryOne(BASE_SELECT + " WHERE a.id = ?", id));
    }

    public List<String> findGroupIds(String assignmentId) {
        return d1.query("SELECT group_id FROM assignment_groups WHERE assignment_id = ?", assignmentId)
                .stream().map(r -> Db.str(r, "group_id")).toList();
    }

    public String create(String teacherId, String subjectId, AssignmentType type, String title,
                         String description, Long deadline, Double maxScore, boolean allowLate,
                         List<String> groupIds) {
        String id = Ids.newId();
        long now = Time.now();
        List<Object> values = new ArrayList<>();
        values.add(id);
        values.add(teacherId);
        values.add(subjectId);
        values.add(type.name());
        values.add(title);
        values.add(description);
        values.add(deadline);
        values.add(maxScore);
        values.add(allowLate ? 1 : 0);
        values.add(now);
        values.add(now);
        List<D1Client.Statement> statements = new ArrayList<>();
        statements.add(new D1Client.Statement("""
                INSERT INTO assignments(id, teacher_id, subject_id, type, title, description, deadline,
                  max_score, is_archived, allow_late, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
                """, values));
        for (String groupId : groupIds) {
            statements.add(new D1Client.Statement(
                    "INSERT INTO assignment_groups(assignment_id, group_id) VALUES (?, ?)",
                    List.of(id, groupId)));
        }
        d1.batch(statements);
        return id;
    }

    public void update(String id, String subjectId, AssignmentType type, String title, String description,
                       Long deadline, Double maxScore, boolean allowLate, boolean archived,
                       List<String> groupIds) {
        d1.update("""
                UPDATE assignments SET subject_id = ?, type = ?, title = ?, description = ?, deadline = ?,
                  max_score = ?, allow_late = ?, is_archived = ?, updated_at = ? WHERE id = ?
                """, subjectId, type.name(), title, description, deadline, maxScore, allowLate ? 1 : 0,
                archived ? 1 : 0, Time.now(), id);
        List<D1Client.Statement> statements = new ArrayList<>();
        statements.add(new D1Client.Statement("DELETE FROM assignment_groups WHERE assignment_id = ?", List.of(id)));
        for (String groupId : groupIds) {
            statements.add(new D1Client.Statement(
                    "INSERT INTO assignment_groups(assignment_id, group_id) VALUES (?, ?)", List.of(id, groupId)));
        }
        d1.batch(statements);
    }

    public void setArchived(String id, boolean archived) {
        d1.update("UPDATE assignments SET is_archived = ?, updated_at = ? WHERE id = ?",
                archived ? 1 : 0, Time.now(), id);
    }

    public void delete(String id) {
        d1.update("DELETE FROM assignments WHERE id = ?", id);
    }

    public PageResponse<Assignment> listForTeacher(String teacherId, String subjectId, AssignmentType type,
                                                    Boolean archived, String search, int page, int size) {
        StringBuilder where = new StringBuilder(" WHERE a.teacher_id = ?");
        List<Object> params = new ArrayList<>();
        params.add(teacherId);
        if (subjectId != null && !subjectId.isBlank()) {
            where.append(" AND a.subject_id = ?");
            params.add(subjectId);
        }
        if (type != null) {
            where.append(" AND a.type = ?");
            params.add(type.name());
        }
        if (archived != null) {
            where.append(" AND a.is_archived = ?");
            params.add(archived ? 1 : 0);
        } else {
            where.append(" AND a.is_archived = 0");
        }
        if (search != null && !search.isBlank()) {
            where.append(" AND lower(a.title) LIKE ?");
            params.add("%" + search.trim().toLowerCase() + "%");
        }
        Long total = Db.lng(d1.queryOne("SELECT COUNT(*) c FROM assignments a" + where, params.toArray()), "c");
        List<Object> pageParams = new ArrayList<>(params);
        pageParams.add(size);
        pageParams.add(Math.max(0, page - 1) * size);
        List<Assignment> items = d1.query(BASE_SELECT + where + " ORDER BY a.created_at DESC LIMIT ? OFFSET ?",
                        pageParams.toArray())
                .stream().map(AssignmentRepository::map).toList();
        return PageResponse.of(items, total == null ? 0 : total, page, size);
    }

    public PageResponse<Assignment> listForStudent(String groupId, String subjectId, AssignmentType type,
                                                    String search, int page, int size) {
        StringBuilder where = new StringBuilder(" WHERE a.is_archived = 0 "
                + "AND EXISTS (SELECT 1 FROM assignment_groups ag WHERE ag.assignment_id = a.id AND ag.group_id = ?)");
        List<Object> params = new ArrayList<>();
        params.add(groupId);
        if (subjectId != null && !subjectId.isBlank()) {
            where.append(" AND a.subject_id = ?");
            params.add(subjectId);
        }
        if (type != null) {
            where.append(" AND a.type = ?");
            params.add(type.name());
        }
        if (search != null && !search.isBlank()) {
            where.append(" AND lower(a.title) LIKE ?");
            params.add("%" + search.trim().toLowerCase() + "%");
        }
        Long total = Db.lng(d1.queryOne("SELECT COUNT(*) c FROM assignments a" + where, params.toArray()), "c");
        List<Object> pageParams = new ArrayList<>(params);
        pageParams.add(size);
        pageParams.add(Math.max(0, page - 1) * size);
        List<Assignment> items = d1.query(BASE_SELECT + where
                        + " ORDER BY CASE WHEN a.deadline IS NULL THEN 1 ELSE 0 END, a.deadline ASC, a.created_at DESC LIMIT ? OFFSET ?",
                        pageParams.toArray())
                .stream().map(AssignmentRepository::map).toList();
        return PageResponse.of(items, total == null ? 0 : total, page, size);
    }

    public List<Assignment> upcomingForGroup(String groupId, long from, long to) {
        return d1.query(BASE_SELECT + " WHERE a.is_archived = 0 AND a.deadline >= ? AND a.deadline <= ? "
                        + "AND EXISTS (SELECT 1 FROM assignment_groups ag WHERE ag.assignment_id = a.id AND ag.group_id = ?) "
                        + "ORDER BY a.deadline ASC LIMIT 20", from, to, groupId)
                .stream().map(AssignmentRepository::map).toList();
    }

    public List<MissingRow> missingRows(String teacherId, String studentId, String groupId) {
        StringBuilder sql = new StringBuilder("""
                SELECT a.id assignment_id, a.title, a.type, a.deadline, a.subject_id, s.name subject_name,
                  u.id student_id, u.first_name || ' ' || u.last_name student_name, u.group_id, g.code group_code
                FROM assignments a
                JOIN subjects s ON s.id = a.subject_id
                JOIN assignment_groups ag ON ag.assignment_id = a.id
                JOIN users u ON u.group_id = ag.group_id AND u.role = 'STUDENT' AND u.is_active = 1
                  AND u.deleted_at IS NULL
                JOIN groups g ON g.id = u.group_id
                LEFT JOIN submissions sub ON sub.assignment_id = a.id AND sub.student_id = u.id
                WHERE a.is_archived = 0 AND sub.id IS NULL
                """);
        List<Object> params = new ArrayList<>();
        if (teacherId != null) {
            sql.append(" AND a.teacher_id = ?");
            params.add(teacherId);
        }
        if (studentId != null) {
            sql.append(" AND u.id = ?");
            params.add(studentId);
        }
        if (groupId != null) {
            sql.append(" AND u.group_id = ?");
            params.add(groupId);
        }
        sql.append(" ORDER BY u.last_name, u.first_name, a.deadline IS NULL, a.deadline");
        return d1.query(sql.toString(), params.toArray()).stream().map(r -> new MissingRow(
                Db.str(r, "assignment_id"), Db.str(r, "title"),
                AssignmentType.valueOf(Db.str(r, "type")), Db.lng(r, "deadline"),
                Db.str(r, "subject_id"), Db.str(r, "subject_name"),
                Db.str(r, "student_id"), Db.str(r, "student_name"),
                Db.str(r, "group_id"), Db.str(r, "group_code")
        )).toList();
    }

    public long countActiveByTeacher(String teacherId) {
        Long count = Db.lng(d1.queryOne(
                "SELECT COUNT(*) c FROM assignments WHERE teacher_id = ? AND is_archived = 0", teacherId), "c");
        return count == null ? 0 : count;
    }

    public long countActive() {
        Long count = Db.lng(d1.queryOne("SELECT COUNT(*) c FROM assignments WHERE is_archived = 0"), "c");
        return count == null ? 0 : count;
    }

    public long countActiveForGroup(String groupId) {
        Long count = Db.lng(d1.queryOne("SELECT COUNT(DISTINCT a.id) c FROM assignments a "
                + "JOIN assignment_groups ag ON ag.assignment_id = a.id "
                + "WHERE ag.group_id = ? AND a.is_archived = 0", groupId), "c");
        return count == null ? 0 : count;
    }

    public long countActiveForGroupSubject(String groupId, String subjectId) {
        Long count = Db.lng(d1.queryOne("SELECT COUNT(DISTINCT a.id) c FROM assignments a "
                + "JOIN assignment_groups ag ON ag.assignment_id = a.id "
                + "WHERE ag.group_id = ? AND a.subject_id = ? AND a.is_archived = 0",
                groupId, subjectId), "c");
        return count == null ? 0 : count;
    }

    public record MissingRow(String assignmentId, String title, AssignmentType type, Long deadline,
                             String subjectId, String subjectName, String studentId, String studentName,
                             String groupId, String groupCode) {}
}
