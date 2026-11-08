package az.it25patok.chat;

import az.it25patok.common.Db;
import az.it25patok.d1.D1Client;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

@Repository
public class ChatRepository {
    private final D1Client d1;

    public ChatRepository(D1Client d1) {
        this.d1 = d1;
    }

    private static ChatRoom mapRoom(Map<String, Object> row) {
        if (row == null) return null;
        return new ChatRoom(Db.str(row, "id"), Db.str(row, "type"), Db.str(row, "group_id"),
                Db.str(row, "name"));
    }

    public List<ChatRoom> allRooms() {
        return d1.query("SELECT * FROM chat_rooms ORDER BY CASE type WHEN 'GLOBAL' THEN 0 ELSE 1 END, name")
                .stream().map(ChatRepository::mapRoom).toList();
    }

    public ChatRoom findRoom(String id) {
        return mapRoom(d1.queryOne("SELECT * FROM chat_rooms WHERE id = ?", id));
    }

    public long lastReadAt(String userId, String roomId) {
        Long value = Db.lng(d1.queryOne("SELECT last_read_at FROM chat_reads WHERE user_id = ? AND room_id = ?",
                userId, roomId), "last_read_at");
        return value == null ? 0 : value;
    }

    public long unreadCount(String userId, String roomId) {
        long lastRead = lastReadAt(userId, roomId);
        Long count = Db.lng(d1.queryOne("SELECT COUNT(*) c FROM chat_messages WHERE room_id = ? "
                + "AND sender_id <> ? AND created_at > ? AND deleted_at IS NULL", roomId, userId, lastRead), "c");
        return count == null ? 0 : count;
    }

    public long lastMessageAt(String roomId) {
        Long value = Db.lng(d1.queryOne("SELECT MAX(created_at) m FROM chat_messages WHERE room_id = ? "
                + "AND deleted_at IS NULL", roomId), "m");
        return value == null ? 0 : value;
    }

    public List<Map<String, Object>> messages(String roomId, long before, int limit) {
        return d1.query("""
                SELECT m.*, u.first_name || ' ' || u.last_name sender_name, u.role sender_role,
                  u.avatar_file_id sender_avatar,
                  rm.ciphertext reply_ciphertext, rm.iv reply_iv, rm.key_version reply_key_version,
                  ru.first_name || ' ' || ru.last_name reply_sender_name
                FROM chat_messages m
                JOIN users u ON u.id = m.sender_id
                LEFT JOIN chat_messages rm ON rm.id = m.reply_to_id
                LEFT JOIN users ru ON ru.id = rm.sender_id
                WHERE m.room_id = ? AND m.deleted_at IS NULL AND m.created_at < ?
                ORDER BY m.created_at DESC LIMIT ?
                """, roomId, before, limit);
    }

    public Map<String, Object> findMessage(String id) {
        return d1.queryOne("""
                SELECT m.*, u.first_name || ' ' || u.last_name sender_name, u.role sender_role,
                  u.avatar_file_id sender_avatar
                FROM chat_messages m JOIN users u ON u.id = m.sender_id WHERE m.id = ?
                """, id);
    }

    public void insert(String id, String roomId, String senderId, String ciphertext, String iv,
                       int keyVersion, String replyToId, long createdAt, long expiresAt) {
        d1.update("""
                INSERT INTO chat_messages(id, room_id, sender_id, ciphertext, iv, key_version, reply_to_id,
                  deleted_at, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)
                """, id, roomId, senderId, ciphertext, iv, keyVersion, replyToId, createdAt, expiresAt);
    }

    public void softDelete(String id) {
        d1.update("UPDATE chat_messages SET deleted_at = ? WHERE id = ?", System.currentTimeMillis(), id);
    }

    public void markRead(String userId, String roomId, long at) {
        d1.update("""
                INSERT INTO chat_reads(user_id, room_id, last_read_at) VALUES (?, ?, ?)
                ON CONFLICT(user_id, room_id) DO UPDATE SET last_read_at =
                  CASE WHEN excluded.last_read_at > chat_reads.last_read_at
                       THEN excluded.last_read_at ELSE chat_reads.last_read_at END
                """, userId, roomId, at);
    }

    public int deleteExpired(long now) {
        return d1.update("DELETE FROM chat_messages WHERE expires_at < ?", now);
    }

    public long countAll() {
        Long value = Db.lng(d1.queryOne("SELECT COUNT(*) c FROM chat_messages WHERE deleted_at IS NULL"), "c");
        return value == null ? 0 : value;
    }
}
