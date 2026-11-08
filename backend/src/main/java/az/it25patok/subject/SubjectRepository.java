package az.it25patok.subject;

import az.it25patok.common.Db;
import az.it25patok.common.Ids;
import az.it25patok.common.Time;
import az.it25patok.d1.D1Client;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

@Repository
public class SubjectRepository {
    private final D1Client d1;

    public SubjectRepository(D1Client d1) {
        this.d1 = d1;
    }

    private static Subject mapSubject(Map<String, Object> row) {
        if (row == null) return null;
        return new Subject(Db.str(row, "id"), Db.str(row, "name"), Db.str(row, "code"),
                Db.str(row, "description"), Db.lng(row, "created_at", 0));
    }

    private static TeachingAssignment mapTeaching(Map<String, Object> row) {
        if (row == null) return null;
        return new TeachingAssignment(Db.str(row, "id"), Db.str(row, "teacher_id"),
                Db.str(row, "subject_id"), Db.str(row, "group_id"),
                Db.str(row, "teacher_name"), Db.str(row, "subject_name"), Db.str(row, "group_code"));
    }

    public List<Subject> findAll() {
        return d1.query("SELECT * FROM subjects ORDER BY name")
                .stream().map(SubjectRepository::mapSubject).toList();
    }

    public Subject findById(String id) {
        return mapSubject(d1.queryOne("SELECT * FROM subjects WHERE id = ?", id));
    }

    public Subject insert(String name, String code, String description) {
        String id = Ids.newId();
        d1.update("INSERT INTO subjects(id, name, code, description, created_at) VALUES (?, ?, ?, ?, ?)",
                id, name, code, description, Time.now());
        return findById(id);
    }

    public void update(String id, String name, String code, String description) {
        d1.update("UPDATE subjects SET name = ?, code = ?, description = ? WHERE id = ?",
                name, code, description, id);
    }

    public void delete(String id) {
        d1.update("DELETE FROM teaching_assignments WHERE subject_id = ?", id);
        d1.update("DELETE FROM subjects WHERE id = ?", id);
    }

    public boolean existsCode(String code, String exceptId) {
        Map<String, Object> row = exceptId == null
                ? d1.queryOne("SELECT 1 x FROM subjects WHERE lower(code) = lower(?)", code)
                : d1.queryOne("SELECT 1 x FROM subjects WHERE lower(code) = lower(?) AND id <> ?", code, exceptId);
        return row != null;
    }

    public List<Subject> findForGroup(String groupId) {
        return d1.query("""
                SELECT DISTINCT s.* FROM subjects s
                JOIN teaching_assignments ta ON ta.subject_id = s.id
                WHERE ta.group_id = ?
                ORDER BY s.name
                """, groupId).stream().map(SubjectRepository::mapSubject).toList();
    }

    public List<Subject> findForTeacher(String teacherId) {
        return d1.query("""
                SELECT DISTINCT s.* FROM subjects s
                JOIN teaching_assignments ta ON ta.subject_id = s.id
                WHERE ta.teacher_id = ?
                ORDER BY s.name
                """, teacherId).stream().map(SubjectRepository::mapSubject).toList();
    }

    public List<TeachingAssignment> findTeachingAssignments(String teacherId, String groupId) {
        StringBuilder sql = new StringBuilder("""
                SELECT ta.*, u.first_name || ' ' || u.last_name teacher_name, s.name subject_name, g.code group_code
                FROM teaching_assignments ta
                JOIN users u ON u.id = ta.teacher_id
                JOIN subjects s ON s.id = ta.subject_id
                JOIN groups g ON g.id = ta.group_id
                WHERE 1 = 1
                """);
        java.util.List<Object> params = new java.util.ArrayList<>();
        if (teacherId != null && !teacherId.isBlank()) {
            sql.append(" AND ta.teacher_id = ?");
            params.add(teacherId);
        }
        if (groupId != null && !groupId.isBlank()) {
            sql.append(" AND ta.group_id = ?");
            params.add(groupId);
        }
        sql.append(" ORDER BY s.name, g.code");
        return d1.query(sql.toString(), params.toArray())
                .stream().map(SubjectRepository::mapTeaching).toList();
    }

    public List<TeachingAssignment> findTeachingAssignmentsForSubject(String subjectId) {
        return d1.query("""
                SELECT ta.*, u.first_name || ' ' || u.last_name teacher_name, s.name subject_name, g.code group_code
                FROM teaching_assignments ta
                JOIN users u ON u.id = ta.teacher_id
                JOIN subjects s ON s.id = ta.subject_id
                JOIN groups g ON g.id = ta.group_id
                WHERE ta.subject_id = ?
                ORDER BY u.last_name, u.first_name, g.code
                """, subjectId).stream().map(SubjectRepository::mapTeaching).toList();
    }

    public TeachingAssignment findTeachingAssignment(String id) {
        return mapTeaching(d1.queryOne("""
                SELECT ta.*, u.first_name || ' ' || u.last_name teacher_name, s.name subject_name, g.code group_code
                FROM teaching_assignments ta
                JOIN users u ON u.id = ta.teacher_id
                JOIN subjects s ON s.id = ta.subject_id
                JOIN groups g ON g.id = ta.group_id
                WHERE ta.id = ?
                """, id));
    }

    public boolean teacherTeaches(String teacherId, String subjectId, List<String> groupIds) {
        if (groupIds.isEmpty()) return false;
        String placeholders = String.join(",", groupIds.stream().map(x -> "?").toList());
        List<Object> params = new java.util.ArrayList<>();
        params.add(teacherId);
        params.add(subjectId);
        params.addAll(groupIds);
        Map<String, Object> row = d1.queryOne("SELECT COUNT(*) c FROM teaching_assignments "
                + "WHERE teacher_id = ? AND subject_id = ? AND group_id IN (" + placeholders + ")", params.toArray());
        Long count = Db.lng(row, "c");
        return count != null && count == groupIds.size();
    }

    public TeachingAssignment createTeachingAssignment(String teacherId, String subjectId, String groupId) {
        String id = Ids.newId();
        d1.update("INSERT INTO teaching_assignments(id, teacher_id, subject_id, group_id) VALUES (?, ?, ?, ?)",
                id, teacherId, subjectId, groupId);
        return findTeachingAssignment(id);
    }

    public void deleteTeachingAssignment(String id) {
        d1.update("DELETE FROM teaching_assignments WHERE id = ?", id);
    }

    public void deleteTeachingAssignmentsByTeacher(String teacherId) {
        d1.update("DELETE FROM teaching_assignments WHERE teacher_id = ?", teacherId);
    }

    public void deleteTeachingAssignmentsBySubject(String subjectId) {
        d1.update("DELETE FROM teaching_assignments WHERE subject_id = ?", subjectId);
    }

    public List<String> groupIdsForTeacher(String teacherId) {
        return d1.query("SELECT DISTINCT group_id FROM teaching_assignments WHERE teacher_id = ?", teacherId)
                .stream().map(r -> Db.str(r, "group_id")).toList();
    }

    public long countSubjects() {
        Long count = Db.lng(d1.queryOne("SELECT COUNT(*) c FROM subjects"), "c");
        return count == null ? 0 : count;
    }
}
