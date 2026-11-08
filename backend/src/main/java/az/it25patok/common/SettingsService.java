package az.it25patok.common;

import az.it25patok.d1.D1Client;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class SettingsService {
    private static final Set<String> KEYS = Set.of(
            "daily_email_time", "daily_email_enabled", "max_file_size_mb", "blocked_extensions",
            "remember_device_enabled", "teacher_group_chat_enabled", "file_expiry_warning_days",
            "email_change_enabled", "self_notification_toggle_enabled", "last_daily_reminder_date");

    private final D1Client d1;
    private final Cache<String, String> cache = Caffeine.newBuilder()
            .expireAfterWrite(Duration.ofMinutes(5))
            .maximumSize(100)
            .build();

    public SettingsService(D1Client d1) {
        this.d1 = d1;
    }

    public String get(String key, String def) {
        String value = cache.get(key, k -> {
            Map<String, Object> row = d1.queryOne("SELECT value FROM app_settings WHERE key = ?", k);
            return row == null ? null : Db.str(row, "value");
        });
        return value == null ? def : value;
    }

    public boolean bool(String key, boolean def) {
        return Boolean.parseBoolean(get(key, String.valueOf(def)));
    }

    public int integer(String key, int def) {
        try {
            return Integer.parseInt(get(key, String.valueOf(def)));
        } catch (NumberFormatException e) {
            return def;
        }
    }

    public List<String> csv(String key) {
        String value = get(key, "");
        return value.isBlank() ? List.of() : List.of(value.split("\\s*,\\s*"));
    }

    public Map<String, Object> all() {
        List<Map<String, Object>> rows = d1.query("SELECT key, value, updated_at FROM app_settings ORDER BY key");
        Map<String, Object> values = new LinkedHashMap<>();
        for (Map<String, Object> row : rows) {
            values.put(Db.str(row, "key"), Db.str(row, "value"));
        }
        return values;
    }

    public void update(Map<String, String> values) {
        long now = Time.now();
        for (Map.Entry<String, String> entry : values.entrySet()) {
            if (!KEYS.contains(entry.getKey())) {
                throw ApiException.badRequest("INVALID_SETTING", "Naməlum ayar: " + entry.getKey());
            }
            String value = validate(entry.getKey(), entry.getValue());
            d1.update("""
                    INSERT INTO app_settings(key, value, updated_at) VALUES (?, ?, ?)
                    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
                    """, entry.getKey(), value, now);
            cache.invalidate(entry.getKey());
        }
    }

    public void set(String key, String value) {
        update(Map.of(key, value));
    }

    private String validate(String key, String value) {
        String v = value == null ? "" : value.trim();
        switch (key) {
            case "daily_email_time" -> {
                if (!v.matches("^([01]\\d|2[0-3]):[0-5]\\d$")) {
                    throw ApiException.badRequest("INVALID_SETTING", "E-poçt vaxtı HH:mm formatında olmalıdır.");
                }
            }
            case "max_file_size_mb" -> {
                try {
                    int n = Integer.parseInt(v);
                    if (n < 1 || n > 50) throw new NumberFormatException();
                } catch (NumberFormatException e) {
                    throw ApiException.badRequest("INVALID_SETTING", "Fayl limiti 1–50 MB aralığında olmalıdır.");
                }
            }
            case "blocked_extensions" -> v = v.toLowerCase().replaceAll("[^a-z0-9,]", "");
            case "file_expiry_warning_days" -> {
                try {
                    int n = Integer.parseInt(v);
                    if (n < 1 || n > 90) throw new NumberFormatException();
                } catch (NumberFormatException e) {
                    throw ApiException.badRequest("INVALID_SETTING", "Xəbərdarlıq günü 1–90 aralığında olmalıdır.");
                }
            }
            default -> {
                if (!v.equals("true") && !v.equals("false")) {
                    throw ApiException.badRequest("INVALID_SETTING", "Dəyər true və ya false olmalıdır.");
                }
            }
        }
        return v;
    }
}
