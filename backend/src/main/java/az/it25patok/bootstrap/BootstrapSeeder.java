package az.it25patok.bootstrap;

import az.it25patok.common.Time;
import az.it25patok.config.AppProperties;
import az.it25patok.d1.D1Client;
import az.it25patok.user.Role;
import az.it25patok.user.User;
import az.it25patok.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class BootstrapSeeder implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(BootstrapSeeder.class);

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final AppProperties props;
    private final D1Client d1;

    public BootstrapSeeder(UserRepository users, PasswordEncoder passwordEncoder,
                           AppProperties props, D1Client d1) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.props = props;
        this.d1 = d1;
    }

    @Override
    public void run(ApplicationArguments args) {
        defaults();
        seedAdmin();
    }

    private void defaults() {
        long now = Time.now();
        d1.update("INSERT OR IGNORE INTO app_settings(key, value, updated_at) VALUES (?, ?, ?)",
                "daily_email_time", "09:00", now);
        d1.update("INSERT OR IGNORE INTO app_settings(key, value, updated_at) VALUES (?, ?, ?)",
                "daily_email_enabled", "true", now);
        d1.update("INSERT OR IGNORE INTO app_settings(key, value, updated_at) VALUES (?, ?, ?)",
                "max_file_size_mb", "50", now);
        d1.update("INSERT OR IGNORE INTO app_settings(key, value, updated_at) VALUES (?, ?, ?)",
                "blocked_extensions", "exe,msi,bat,cmd,scr,com,vbs", now);
        d1.update("INSERT OR IGNORE INTO app_settings(key, value, updated_at) VALUES (?, ?, ?)",
                "remember_device_enabled", "true", now);
        d1.update("INSERT OR IGNORE INTO app_settings(key, value, updated_at) VALUES (?, ?, ?)",
                "teacher_group_chat_enabled", "true", now);
        d1.update("INSERT OR IGNORE INTO app_settings(key, value, updated_at) VALUES (?, ?, ?)",
                "file_expiry_warning_days", "30", now);
        d1.update("INSERT OR IGNORE INTO app_settings(key, value, updated_at) VALUES (?, ?, ?)",
                "email_change_enabled", "true", now);
        d1.update("INSERT OR IGNORE INTO app_settings(key, value, updated_at) VALUES (?, ?, ?)",
                "self_notification_toggle_enabled", "true", now);
    }

    private void seedAdmin() {
        String email = props.admin() == null || props.admin().email() == null
                ? null : props.admin().email().trim().toLowerCase(java.util.Locale.ROOT);
        String password = props.admin() == null ? null : props.admin().initialPassword();
        if (email == null || email.isBlank() || password == null || password.isBlank()) {
            log.warn("ADMIN_EMAIL və ADMIN_INITIAL_PASSWORD təyin olunmayıb; başlanğıc admin yaradılmadı.");
            return;
        }
        // Diqqət: silinmiş (soft-deleted) başlanğıc admini bərpa etmirik —
        // istifadəçi onu silmək istəyibsə, hörmət edilməlidir. Lakin proqram açılışı uğursuz olmamalıdır.
        User existing = users.findByEmailAny(email);
        if (existing != null) {
            if (existing.deletedAt() != null) {
                log.warn("Başlanğıc admin hesabı silinib ({}); avtomatik bərpa edilmir.", email);
            } else if (existing.role() != Role.ADMIN) {
                log.error("ADMIN_EMAIL ilə mövcud istifadəçi ADMIN deyil: {}", email);
            } else {
                log.info("Başlanğıc admin hesabı artıq mövcuddur: {}", email);
            }
            return;
        }
        String username = "admin";
        if (users.usernameExists(username, null)) {
            // "admin" adı silinmiş qeydin altında tutulub — təkrarı pozmadan unikal ad seç
            username = "admin-" + String.valueOf(Time.now() % 1000000);
            log.warn("'admin' istifadəçi adı mövcuddur (silinmiş qeyd ola bilər); '{}' seçildi.", username);
        }
        User admin = new User(null, Role.ADMIN, email, username, passwordEncoder.encode(password),
                "Baş", "Admin", null, null, null, null, "system", true, false, 0,
                null, null, null, true, null, 0, 0, null);
        String id = users.insert(admin);
        log.info("Başlanğıc admin hesabı yaradıldı: {} (id={})", email, id);
    }
}
