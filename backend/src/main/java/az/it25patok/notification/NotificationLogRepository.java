package az.it25patok.notification;

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
public class NotificationLogRepository {
    private final D1Client d1;

    public NotificationLogRepository(D1Client d1) {
        this.d1 = d1;
    }

    public void log(String userId, String type, String status, String error, String refId) {
        d1.update("INSERT INTO notification_log(id, user_id, type, sent_at, status, error, ref_id) "
                        + "VALUES (?, ?, ?, ?, ?, ?, ?)",
                Ids.newId(), userId, type, Time.now(), status,
                error == null ? null : error.substring(0, Math.min(error.length(), 500)), refId);
    }

    public boolean existsSince(String userId, String type, long since) {
        Long count = Db.lng(d1.queryOne("SELECT COUNT(*) c FROM notification_log "
                + "WHERE user_id = ? AND type = ? AND sent_at >= ? AND status = 'SENT'", userId, type, since), "c");
        return count != null && count > 0;
    }

    public boolean existsRefSince(String userId, String type, String refId, long since) {
        Long count = Db.lng(d1.queryOne("SELECT COUNT(*) c FROM notification_log "
                        + "WHERE user_id = ? AND type = ? AND ref_id = ? AND sent_at >= ? AND status = 'SENT'",
                userId, type, refId, since), "c");
        return count != null && count > 0;
    }

    public PageResponse<Map<String, Object>> list(int page, int size) {
        Long total = Db.lng(d1.queryOne("SELECT COUNT(*) c FROM notification_log"), "c");
        List<Map<String, Object>> rows = d1.query("""
                SELECT n.*, u.first_name || ' ' || u.last_name user_name, u.email user_email
                FROM notification_log n LEFT JOIN users u ON u.id = n.user_id
                ORDER BY n.sent_at DESC LIMIT ? OFFSET ?
                """, size, Math.max(0, page - 1) * size);
        return PageResponse.of(rows, total == null ? 0 : total, page, size);
    }

    public long countSentToday() {
        java.time.ZonedDateTime start = java.time.ZonedDateTime.now(Time.AZ).toLocalDate()
                .atStartOfDay(Time.AZ);
        Long count = Db.lng(d1.queryOne("SELECT COUNT(*) c FROM notification_log WHERE sent_at >= ? AND status = 'SENT'",
                start.toInstant().toEpochMilli()), "c");
        return count == null ? 0 : count;
    }
}
