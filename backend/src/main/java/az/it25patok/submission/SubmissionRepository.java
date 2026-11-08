package az.it25patok.submission;

import az.it25patok.common.Db;
import az.it25patok.common.Ids;
import az.it25patok.common.Time;
import az.it25patok.d1.D1Client;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

@Repository
public class SubmissionRepository {
    private final D1Client d1;

    public SubmissionRepository(D1Client d1) {
        this.d1 = d1;
    }

    public static Submission map(Map<String, Object> row) {
        if (row == null) return null;
        return new Submission(Db.str(row, "id"), Db.str(row, "assignment_id"), Db.str(row, "student_id"),
                SubmissionStatus.from(Db.str(row, "status")), Db.str(row, "comment"),
                Db.dblOrNull(row, "score"), Db.str(row, "teacher_feedback"),
                Db.lng(row, "submitted_at", 0), Db.lng(row, "updated_at", 0));
    }

    public Submission findById(String id) {
        return map(d1.queryOne("SELECT * FROM submissions WHERE id = ?", id));
    }

    public Submission findByAssignmentAndStudent(String assignmentId, String studentId) {
        return map(d1.queryOne("SELECT * FROM submissions WHERE assignment_id = ? AND student_id = ?",
                assignmentId, studentId));
    }

    public String insert(String assignmentId, String studentId, SubmissionStatus status,
                         String comment, long submittedAt) {
        String id = Ids.newId();
        d1.update("""
                INSERT INTO submissions(id, assignment_id, student_id, status, comment, score, teacher_feedback,
                  submitted_at, updated_at) VALUES (?, ?, ?, ?, ?, NULL, NULL, ?, ?)
                """, id, assignmentId, studentId, status.name(), comment, submittedAt, Time.now());
        return id;
    }

    public void updateContent(String id, SubmissionStatus status, String comment, long submittedAt) {
        d1.update("UPDATE submissions SET status = ?, comment = ?, submitted_at = ?, updated_at = ? WHERE id = ?",
                status.name(), comment, submittedAt, Time.now(), id);
    }

    public void grade(String id, Double score, String feedback) {
        d1.update("UPDATE submissions SET score = ?, teacher_feedback = ?, status = 'GRADED', updated_at = ? WHERE id = ?",
                score, feedback, Time.now(), id);
    }

    public void delete(String id) {
        d1.update("DELETE FROM submissions WHERE id = ?", id);
    }

    public List<Map<String, Object>> listForAssignment(String assignmentId, String groupId) {
        StringBuilder sql = new StringBuilder("""
                SELECT u.id student_id, u.first_name, u.last_name, u.email, u.group_id, u.avatar_file_id,
                  g.code group_code, sub.id submission_id, sub.status, sub.comment, sub.score,
                  sub.teacher_feedback, sub.submitted_at, sub.updated_at,
                  (SELECT COUNT(*) FROM files f WHERE f.submission_id = sub.id AND f.deleted_at IS NULL) file_count
                FROM users u
                JOIN groups g ON g.id = u.group_id
                JOIN assignment_groups ag ON ag.group_id = u.group_id AND ag.assignment_id = ?
                LEFT JOIN submissions sub ON sub.assignment_id = ? AND sub.student_id = u.id
                WHERE u.role = 'STUDENT' AND u.is_active = 1 AND u.deleted_at IS NULL
                """);
        java.util.List<Object> params = new java.util.ArrayList<>();
        params.add(assignmentId);
        params.add(assignmentId);
        if (groupId != null && !groupId.isBlank()) {
            sql.append(" AND u.group_id = ?");
            params.add(groupId);
        }
        sql.append(" ORDER BY u.last_name, u.first_name");
        return d1.query(sql.toString(), params.toArray());
    }

    public Map<String, Object> studentStatus(String assignmentId, String studentId) {
        return d1.queryOne("""
                SELECT sub.*, (SELECT COUNT(*) FROM files f WHERE f.submission_id = sub.id AND f.deleted_at IS NULL) file_count
                FROM submissions sub WHERE sub.assignment_id = ? AND sub.student_id = ?
                """, assignmentId, studentId);
    }

    public long countForAssignment(String assignmentId) {
        Long count = Db.lng(d1.queryOne("SELECT COUNT(*) c FROM submissions WHERE assignment_id = ?",
                assignmentId), "c");
        return count == null ? 0 : count;
    }

    public java.util.Map<String, java.util.Map<String, Object>> statusesForStudent(String studentId,
                                                                                  java.util.List<String> assignmentIds) {
        if (assignmentIds.isEmpty()) return java.util.Map.of();
        String placeholders = String.join(",", assignmentIds.stream().map(x -> "?").toList());
        java.util.List<Object> params = new java.util.ArrayList<>();
        params.add(studentId);
        params.addAll(assignmentIds);
        java.util.Map<String, java.util.Map<String, Object>> result = new java.util.HashMap<>();
        for (var row : d1.query("SELECT * FROM submissions WHERE student_id = ? AND assignment_id IN ("
                + placeholders + ")", params.toArray())) {
            result.put(Db.str(row, "assignment_id"), row);
        }
        return result;
    }

    public long countSubmittedForStudentInGroup(String studentId, String groupId) {
        Long count = Db.lng(d1.queryOne("""
                SELECT COUNT(DISTINCT s.assignment_id) c FROM submissions s
                JOIN assignment_groups ag ON ag.assignment_id = s.assignment_id AND ag.group_id = ?
                JOIN assignments a ON a.id = s.assignment_id AND a.is_archived = 0
                WHERE s.student_id = ?
                """, groupId, studentId), "c");
        return count == null ? 0 : count;
    }

    public long countSubmittedForStudentSubject(String studentId, String groupId, String subjectId) {
        Long count = Db.lng(d1.queryOne("""
                SELECT COUNT(DISTINCT s.assignment_id) c FROM submissions s
                JOIN assignments a ON a.id = s.assignment_id AND a.is_archived = 0 AND a.subject_id = ?
                JOIN assignment_groups ag ON ag.assignment_id = s.assignment_id AND ag.group_id = ?
                WHERE s.student_id = ?
                """, subjectId, groupId, studentId), "c");
        return count == null ? 0 : count;
    }

    public long countAll() {
        Long count = Db.lng(d1.queryOne("SELECT COUNT(*) c FROM submissions"), "c");
        return count == null ? 0 : count;
    }

    public void deleteByAssignmentAndStudent(String assignmentId, String studentId) {
        d1.update("DELETE FROM submissions WHERE assignment_id = ? AND student_id = ?", assignmentId, studentId);
    }
}
