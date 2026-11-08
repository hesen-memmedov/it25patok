package az.it25patok.auth;

import az.it25patok.common.Db;
import az.it25patok.common.Ids;
import az.it25patok.common.Time;
import az.it25patok.d1.D1Client;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

@Repository
public class OtpRepository {
    private final D1Client d1;

    public OtpRepository(D1Client d1) {
        this.d1 = d1;
    }

    public record Otp(String id, String userId, String codeHash, int attempts, long expiresAt,
                      Long usedAt, long createdAt, String purpose, String target) {}

    private static Otp map(Map<String, Object> row) {
        if (row == null) return null;
        return new Otp(Db.str(row, "id"), Db.str(row, "user_id"), Db.str(row, "code_hash"),
                Db.integer(row, "attempts", 0), Db.lng(row, "expires_at", 0),
                Db.lng(row, "used_at"), Db.lng(row, "created_at", 0),
                Db.str(row, "purpose", "LOGIN"), Db.str(row, "target"));
    }

    public Otp insert(String userId, String codeHash, String purpose, String target, long expiresAt) {
        String id = Ids.newId();
        d1.update("INSERT INTO otp_codes(id, user_id, code_hash, attempts, expires_at, used_at, created_at, purpose, target) "
                        + "VALUES (?, ?, ?, 0, ?, NULL, ?, ?, ?)",
                id, userId, codeHash, expiresAt, Time.now(), purpose, target);
        return findById(id);
    }

    public Otp findById(String id) {
        return map(d1.queryOne("SELECT * FROM otp_codes WHERE id = ?", id));
    }

    public void markUsed(String id) {
        d1.update("UPDATE otp_codes SET used_at = ? WHERE id = ?", Time.now(), id);
    }

    public int incrementAttempts(String id) {
        d1.update("UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ?", id);
        Otp otp = findById(id);
        return otp == null ? 0 : otp.attempts();
    }

    public void invalidateUnused(String userId, String purpose) {
        d1.update("UPDATE otp_codes SET used_at = ? WHERE user_id = ? AND purpose = ? AND used_at IS NULL",
                Time.now(), userId, purpose);
    }

    public int countSince(String userId, String purpose, long since) {
        Long count = Db.lng(d1.queryOne("SELECT COUNT(*) c FROM otp_codes WHERE user_id = ? AND purpose = ? "
                + "AND created_at >= ?", userId, purpose, since), "c");
        return count == null ? 0 : count.intValue();
    }

    public Long lastCreatedAt(String userId, String purpose) {
        Map<String, Object> row = d1.queryOne(
                "SELECT MAX(created_at) m FROM otp_codes WHERE user_id = ? AND purpose = ?", userId, purpose);
        return Db.lng(row, "m");
    }

    public void deleteExpired(long before) {
        d1.update("DELETE FROM otp_codes WHERE expires_at < ?", before);
    }
}
