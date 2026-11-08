package az.it25patok.group;

import az.it25patok.common.Db;
import az.it25patok.common.Ids;
import az.it25patok.common.Time;
import az.it25patok.d1.D1Client;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

@Repository
public class GroupRepository {
    private final D1Client d1;

    public GroupRepository(D1Client d1) {
        this.d1 = d1;
    }

    private static Group map(Map<String, Object> row) {
        if (row == null) return null;
        return new Group(Db.str(row, "id"), Db.str(row, "code"), Db.str(row, "name"),
                Db.lng(row, "student_count", 0));
    }

    public List<Group> findAll() {
        return d1.query("""
                SELECT g.*, (SELECT COUNT(*) FROM users u WHERE u.group_id = g.id AND u.role = 'STUDENT'
                    AND u.deleted_at IS NULL) student_count
                FROM groups g ORDER BY g.code
                """).stream().map(GroupRepository::map).toList();
    }

    public Group findById(String id) {
        return map(d1.queryOne("SELECT * FROM groups WHERE id = ?", id));
    }

    public Group findByCode(String code) {
        return map(d1.queryOne("SELECT * FROM groups WHERE code = ?", code));
    }

    public boolean existsByCode(String code, String exceptId) {
        var row = d1.queryOne("SELECT COUNT(*) c FROM groups WHERE code = ? AND (? IS NULL OR id <> ?)",
                code, exceptId, exceptId);
        Long value = row == null ? null : Db.lng(row, "c");
        return value != null && value > 0;
    }

    public Group create(String code, String name) {
        String id = Ids.newId();
        d1.update("INSERT INTO groups(id, code, name) VALUES (?, ?, ?)", id, code, name);
        return new Group(id, code, name, 0);
    }

    public void delete(String id) {
        d1.update("DELETE FROM groups WHERE id = ?", id);
    }

    public long studentCount(String groupId) {
        Long value = Db.lng(d1.queryOne("SELECT COUNT(*) c FROM users WHERE group_id = ? AND role = 'STUDENT' "
                + "AND is_active = 1 AND deleted_at IS NULL", groupId), "c");
        return value == null ? 0 : value;
    }
}
