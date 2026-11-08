package az.it25patok.user;

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
public class UserRepository {
    private final D1Client d1;

    public UserRepository(D1Client d1) {
        this.d1 = d1;
    }

    public static User map(Map<String, Object> row) {
        if (row == null) return null;
        return new User(
                Db.str(row, "id"),
                Role.from(Db.str(row, "role")),
                Db.str(row, "email"),
                Db.str(row, "username"),
                Db.str(row, "password_hash"),
                Db.str(row, "first_name"),
                Db.str(row, "last_name"),
                Db.str(row, "phone"),
                Db.str(row, "group_id"),
                Db.str(row, "avatar_file_id"),
                Db.str(row, "bio"),
                Db.str(row, "theme", "system"),
                Db.bool(row, "is_active"),
                Db.bool(row, "must_change_password"),
                Db.integer(row, "failed_login_count", 0),
                Db.lng(row, "locked_until"),
                Db.lng(row, "otp_locked_until"),
                Db.lng(row, "chat_muted_until"),
                Db.bool(row, "notification_enabled"),
                Db.lng(row, "last_login_at"),
                Db.lng(row, "created_at", 0),
                Db.lng(row, "updated_at", 0),
                Db.lng(row, "deleted_at")
        );
    }

    public User findById(String id) {
        return map(d1.queryOne("SELECT * FROM users WHERE id = ?", id));
    }

    public User findActiveById(String id) {
        return map(d1.queryOne("SELECT * FROM users WHERE id = ? AND deleted_at IS NULL", id));
    }

    public User findByEmail(String email) {
        return map(d1.queryOne("SELECT * FROM users WHERE email = ? AND deleted_at IS NULL", email));
    }

    /** E-poçt ilə axtar — silinmiş (soft-deleted) qeydlər daxil. Seeder üçün. */
    public User findByEmailAny(String email) {
        return map(d1.queryOne("SELECT * FROM users WHERE email = ?", email));
    }

    public User findByUsernameIgnoreCase(String username) {
        return map(d1.queryOne("SELECT * FROM users WHERE lower(username) = lower(?) AND deleted_at IS NULL", username));
    }

    public User findByIdentifier(String identifier) {
        String trimmed = identifier == null ? "" : identifier.trim();
        if (trimmed.isEmpty()) return null;
        User byEmail = findByEmail(trimmed);
        if (byEmail != null) return byEmail;
        return findByUsernameIgnoreCase(trimmed);
    }

    public boolean usernameExists(String username, String exceptId) {
        Map<String, Object> row = exceptId == null
                ? d1.queryOne("SELECT 1 x FROM users WHERE lower(username) = lower(?)", username)
                : d1.queryOne("SELECT 1 x FROM users WHERE lower(username) = lower(?) AND id <> ?", username, exceptId);
        return row != null;
    }

    public boolean emailExists(String email, String exceptId) {
        Map<String, Object> row = exceptId == null
                ? d1.queryOne("SELECT 1 x FROM users WHERE email = ?", email)
                : d1.queryOne("SELECT 1 x FROM users WHERE email = ? AND id <> ?", email, exceptId);
        return row != null;
    }

    public String insert(User user) {
        String id = user.id() == null ? Ids.newId() : user.id();
        long now = Time.now();
        d1.update("""
                INSERT INTO users(id, role, email, username, password_hash, first_name, last_name, phone, group_id,
                  avatar_file_id, bio, theme, is_active, must_change_password, failed_login_count,
                  locked_until, otp_locked_until, chat_muted_until, notification_enabled, last_login_at,
                  created_at, updated_at, deleted_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, id, user.role().name(), user.email(), user.username(), user.passwordHash(), user.firstName(),
                user.lastName(), user.phone(), user.groupId(), user.avatarFileId(), user.bio(),
                user.theme() == null ? "system" : user.theme(), user.active() ? 1 : 0,
                user.mustChangePassword() ? 1 : 0, user.failedLoginCount(), user.lockedUntil(),
                user.otpLockedUntil(), user.chatMutedUntil(), user.notificationEnabled() ? 1 : 0,
                user.lastLoginAt(), now, now, null);
        return id;
    }

    public void updateAdminFields(String id, String firstName, String lastName, String phone,
                                  Role role, String groupId, boolean active) {
        d1.update("""
                UPDATE users SET first_name = ?, last_name = ?, phone = ?, role = ?, group_id = ?,
                  is_active = ?, updated_at = ? WHERE id = ?
                """, firstName, lastName, phone, role.name(), groupId, active ? 1 : 0, Time.now(), id);
    }

    public void updateProfile(String id, String bio, String theme, boolean notificationEnabled) {
        d1.update("UPDATE users SET bio = ?, theme = ?, notification_enabled = ?, updated_at = ? WHERE id = ?",
                bio, theme, notificationEnabled ? 1 : 0, Time.now(), id);
    }

    public void updateAvatar(String id, String fileId) {
        d1.update("UPDATE users SET avatar_file_id = ?, updated_at = ? WHERE id = ?", fileId, Time.now(), id);
    }

    public void updateEmail(String id, String email) {
        d1.update("UPDATE users SET email = ?, updated_at = ? WHERE id = ?", email, Time.now(), id);
    }

    public void updatePassword(String id, String passwordHash) {
        d1.update("UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = ? WHERE id = ?",
                passwordHash, Time.now(), id);
    }

    public void resetPassword(String id, String passwordHash) {
        d1.update("UPDATE users SET password_hash = ?, must_change_password = 1, updated_at = ? WHERE id = ?",
                passwordHash, Time.now(), id);
    }

    public void setActive(String id, boolean active) {
        d1.update("UPDATE users SET is_active = ?, updated_at = ? WHERE id = ?",
                active ? 1 : 0, Time.now(), id);
    }

    public void softDelete(String id) {
        long now = Time.now();
        d1.update("UPDATE users SET deleted_at = ?, is_active = 0, updated_at = ? WHERE id = ?",
                now, now, id);
    }

    public void setGroup(String id, String groupId) {
        d1.update("UPDATE users SET group_id = ?, updated_at = ? WHERE id = ?", groupId, Time.now(), id);
    }

    public void loginFailed(String id, int failedCount, Long lockedUntil) {
        d1.update("UPDATE users SET failed_login_count = ?, locked_until = ? WHERE id = ?",
                failedCount, lockedUntil, id);
    }

    public void loginSucceeded(String id) {
        d1.update("UPDATE users SET failed_login_count = 0, locked_until = NULL, last_login_at = ?, "
                + "otp_locked_until = NULL WHERE id = ?", Time.now(), id);
    }

    public void setOtpLockedUntil(String id, Long lockedUntil) {
        d1.update("UPDATE users SET otp_locked_until = ? WHERE id = ?", lockedUntil, id);
    }

    public void setMutedUntil(String id, Long mutedUntil) {
        d1.update("UPDATE users SET chat_muted_until = ? WHERE id = ?", mutedUntil, id);
    }

    public PageResponse<User> search(String search, Role role, String groupId, Boolean active,
                                     int page, int size, String sort) {
        StringBuilder where = new StringBuilder(" WHERE u.deleted_at IS NULL");
        List<Object> params = new ArrayList<>();
        if (search != null && !search.isBlank()) {
            where.append(" AND (lower(u.first_name) LIKE ? OR lower(u.last_name) LIKE ? OR lower(u.email) LIKE ?)");
            String like = "%" + search.trim().toLowerCase() + "%";
            params.add(like);
            params.add(like);
            params.add(like);
        }
        if (role != null) {
            where.append(" AND u.role = ?");
            params.add(role.name());
        }
        if (groupId != null && !groupId.isBlank()) {
            where.append(" AND u.group_id = ?");
            params.add(groupId);
        }
        if (active != null) {
            where.append(" AND u.is_active = ?");
            params.add(active ? 1 : 0);
        }
        Long total = Db.lng(d1.queryOne("SELECT COUNT(*) c FROM users u" + where, params.toArray()), "c");
        String order = switch (sort == null ? "" : sort) {
            case "name" -> "u.first_name, u.last_name";
            case "email" -> "u.email";
            case "role" -> "u.role, u.last_name";
            default -> "u.created_at DESC";
        };
        List<Object> pageParams = new ArrayList<>(params);
        pageParams.add(size);
        pageParams.add(Math.max(0, page - 1) * size);
        List<Map<String, Object>> rows = d1.query(
                "SELECT u.* FROM users u" + where + " ORDER BY " + order + " LIMIT ? OFFSET ?",
                pageParams.toArray());
        List<User> users = rows.stream().map(UserRepository::map).toList();
        return PageResponse.of(users, total == null ? 0 : total, page, size);
    }

    public List<User> findActiveStudentsByGroups(List<String> groupIds) {
        if (groupIds.isEmpty()) return List.of();
        String placeholders = String.join(",", groupIds.stream().map(x -> "?").toList());
        return d1.query("SELECT * FROM users WHERE role = 'STUDENT' AND is_active = 1 AND deleted_at IS NULL "
                        + "AND group_id IN (" + placeholders + ") ORDER BY last_name, first_name",
                groupIds.toArray()).stream().map(UserRepository::map).toList();
    }

    public List<User> findStudentsByGroup(String groupId) {
        return d1.query("SELECT * FROM users WHERE role = 'STUDENT' AND group_id = ? AND deleted_at IS NULL "
                + "ORDER BY last_name, first_name", groupId)
                .stream().map(UserRepository::map).toList();
    }

    public List<User> findActiveStudents() {
        return d1.query("SELECT * FROM users WHERE role = 'STUDENT' AND is_active = 1 AND deleted_at IS NULL "
                        + "ORDER BY last_name, first_name").stream().map(UserRepository::map).toList();
    }

    public List<User> findAdmins() {
        return d1.query("SELECT * FROM users WHERE role = 'ADMIN' AND is_active = 1 AND deleted_at IS NULL")
                .stream().map(UserRepository::map).toList();
    }

    public List<User> findTeachers() {
        return d1.query("SELECT * FROM users WHERE role = 'TEACHER' AND deleted_at IS NULL "
                        + "ORDER BY last_name, first_name").stream().map(UserRepository::map).toList();
    }

    public long countByRole(Role role) {
        Long count = Db.lng(d1.queryOne(
                "SELECT COUNT(*) c FROM users WHERE role = ? AND is_active = 1 AND deleted_at IS NULL",
                role.name()), "c");
        return count == null ? 0 : count;
    }

    public long countActive() {
        Long count = Db.lng(d1.queryOne(
                "SELECT COUNT(*) c FROM users WHERE is_active = 1 AND deleted_at IS NULL"), "c");
        return count == null ? 0 : count;
    }
}
