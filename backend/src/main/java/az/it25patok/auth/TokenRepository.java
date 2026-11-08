package az.it25patok.auth;

import az.it25patok.common.Db;
import az.it25patok.common.Ids;
import az.it25patok.common.Time;
import az.it25patok.d1.D1Client;
import org.springframework.stereotype.Repository;

import java.util.Map;

@Repository
public class TokenRepository {
    private final D1Client d1;

    public TokenRepository(D1Client d1) {
        this.d1 = d1;
    }

    public record StoredToken(String id, String userId, String tokenHash, String deviceInfo,
                              long expiresAt, Long revokedAt, long createdAt) {}

    private static StoredToken map(Map<String, Object> row) {
        if (row == null) return null;
        return new StoredToken(Db.str(row, "id"), Db.str(row, "user_id"), Db.str(row, "token_hash"),
                Db.str(row, "device_info"), Db.lng(row, "expires_at", 0),
                Db.lng(row, "revoked_at"), Db.lng(row, "created_at", 0));
    }

    public void insertRefresh(String userId, String tokenHash, String deviceInfo, long expiresAt) {
        d1.update("INSERT INTO refresh_tokens(id, user_id, token_hash, device_info, expires_at, revoked_at, created_at) "
                        + "VALUES (?, ?, ?, ?, ?, NULL, ?)",
                Ids.newId(), userId, tokenHash, deviceInfo, expiresAt, Time.now());
    }

    public StoredToken findRefreshByHash(String hash) {
        return map(d1.queryOne("SELECT * FROM refresh_tokens WHERE token_hash = ?", hash));
    }

    public void revokeRefresh(String id) {
        d1.update("UPDATE refresh_tokens SET revoked_at = ? WHERE id = ?", Time.now(), id);
    }

    public void revokeAllRefresh(String userId) {
        d1.update("UPDATE refresh_tokens SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL",
                Time.now(), userId);
    }

    public void insertTrustedDevice(String userId, String tokenHash, String deviceInfo, long expiresAt) {
        d1.update("INSERT INTO trusted_devices(id, user_id, token_hash, device_info, expires_at, revoked_at, created_at) "
                        + "VALUES (?, ?, ?, ?, ?, NULL, ?)",
                Ids.newId(), userId, tokenHash, deviceInfo, expiresAt, Time.now());
    }

    public StoredToken findTrustedByHash(String hash) {
        return map(d1.queryOne("SELECT * FROM trusted_devices WHERE token_hash = ?", hash));
    }

    public void revokeTrustedDevice(String id) {
        d1.update("UPDATE trusted_devices SET revoked_at = ? WHERE id = ?", Time.now(), id);
    }

    public void revokeAllTrustedDevices(String userId) {
        d1.update("UPDATE trusted_devices SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL",
                Time.now(), userId);
    }

    public void deleteExpired(long now) {
        d1.update("DELETE FROM refresh_tokens WHERE expires_at < ?", now);
        d1.update("DELETE FROM trusted_devices WHERE expires_at < ?", now);
    }
}
