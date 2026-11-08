package az.it25patok.notification;

import az.it25patok.config.AppProperties;
import az.it25patok.user.User;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.Map;

@Service
public class MailService {
    private static final Logger log = LoggerFactory.getLogger(MailService.class);
    private static final DateTimeFormatter FILE_TIME = DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss")
            .withZone(ZoneId.of("Asia/Baku"));

    private final JavaMailSender mailSender;
    private final TemplateEngine templateEngine;
    private final AppProperties props;
    private final NotificationLogRepository notificationLog;
    private final EmailJsService emailJs;
    private final BrevoMailService brevo;

    public MailService(JavaMailSender mailSender, TemplateEngine templateEngine, AppProperties props,
                       NotificationLogRepository notificationLog, EmailJsService emailJs,
                       BrevoMailService brevo) {
        this.mailSender = mailSender;
        this.templateEngine = templateEngine;
        this.props = props;
        this.notificationLog = notificationLog;
        this.emailJs = emailJs;
        this.brevo = brevo;
    }

    public void sendOtp(User user, String code, String purpose) {
        sendOtp(user, code, purpose, user.email());
    }

    public void sendOtp(User user, String code, String purpose, String toEmail) {
        String purposeLabel = "EMAIL_CHANGE".equals(purpose) ? "e-poçt dəyişikliyi" : "giriş";
        String subject = "İT25 PATOK — Təsdiq kodu";
        Map<String, Object> vars = Map.of(
                "name", user.firstName(),
                "code", code,
                "purpose", purposeLabel,
                "minutes", props.otp().ttlMinutes(),
                "baseUrl", props.baseUrl()
        );
        deliver(user, toEmail, "OTP", subject, "mail/otp", vars, null, true);
    }

    public void sendAccountCreated(User user) {
        Map<String, Object> vars = Map.of(
                "name", user.firstName(),
                "baseUrl", props.baseUrl(),
                "email", user.email()
        );
        send(user, "ACCOUNT_CREATED", "İT25 PATOK — Hesabınız yaradıldı",
                "mail/account-created", vars, null, false);
    }

    public void sendFileExpiry(User user, java.util.List<Map<String, Object>> files) {
        Map<String, Object> vars = Map.of(
                "name", user.firstName(),
                "files", files,
                "baseUrl", props.baseUrl()
        );
        send(user, "FILE_EXPIRY", "İT25 PATOK — Fayllarınızın müddəti bitir",
                "mail/file-expiry", vars, null, true);
    }

    public void sendDailyReminder(User user, java.util.List<Map<String, Object>> groups, int total) {
        Map<String, Object> vars = Map.of(
                "name", user.firstName(),
                "groups", groups,
                "total", total,
                "baseUrl", props.baseUrl()
        );
        send(user, "DAILY_REMINDER", "İT25 PATOK — Təhvil verilməmiş işləriniz",
                "mail/daily-reminder", vars, null, true);
    }

    public void send(User user, String type, String subject, String template,
                     Map<String, Object> vars, String refId, boolean retry) {
        deliver(user, user.email(), type, subject, template, vars, refId, retry);
    }

    private void deliver(User user, String toEmail, String type, String subject, String template,
                         Map<String, Object> vars, String refId, boolean retry) {
        // 1) Lokal dev — e-poçtları fayl çıxışına yaz (heç bir real göndəriş yoxdur)
        if (props.mail().devMode()) {
            String html = renderHtml(user, type, template, vars, refId);
            try {
                Path outbox = Path.of(props.mail().devOutbox()).toAbsolutePath();
                Files.createDirectories(outbox);
                Path file = outbox.resolve(FILE_TIME.format(Instant.now()) + "-" + type.toLowerCase(Locale.ROOT)
                        + "-" + toEmail.replaceAll("[^a-zA-Z0-9@._-]", "_") + ".html");
                Files.writeString(file, "<!-- To: " + toEmail + " | Subject: " + subject + " -->\n" + html,
                        StandardCharsets.UTF_8, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
                log.info("DEV e-poçt fayla yazıldı: {}", file);
                notificationLog.log(user.id(), type, "SENT", null, refId);
                return;
            } catch (Exception e) {
                notificationLog.log(user.id(), type, "FAILED", e.getMessage(), refId);
                throw new MailSendException("Dev e-poçt faylı yazıla bilmədi", e);
            }
        }

        // 2) Brevo (HTTPS) — SMTP portlarının bağlı olduğu hostlar (Render free vb.)
        if (brevo.isConfigured()) {
            String html = renderHtml(user, type, template, vars, refId);
            boolean ok = brevo.send(toEmail, user == null ? null : user.firstName(), subject, html);
            notificationLog.log(user.id(), type, ok ? "SENT" : "FAILED",
                    ok ? null : "Brevo göndərişi alınmadı", refId);
            if (!ok) {
                throw new MailSendException("E-poçt göndərilə bilmədi. Bir az sonra yenidən cəhd edin.");
            }
            return;
        }

        // 3) EmailJS vasitəsilə OTP (köhnə axın — Brevo konfiqurasiya olunubsa yuxarıda işlənilir)
        if (emailJs.isConfigured() && "OTP".equals(type)) {
            boolean ok = emailJs.sendOtp(
                    toEmail,
                    user.firstName(),
                    String.valueOf(vars.getOrDefault("purpose", "giriş")),
                    String.valueOf(vars.getOrDefault("code", "")),
                    props.otp().ttlMinutes());
            if (ok) {
                notificationLog.log(user.id(), type, "SENT", null, refId);
                return;
            }
            notificationLog.log(user.id(), type, "FAILED", "EmailJS göndərişi alınmadı", refId);
            throw new MailSendException("Təsdiq kodu göndərilə bilmədi. Bir az sonra yenidən cəhd edin.");
        }

        // 4) SMTP (lokal/ənənəvi server)
        String html = renderHtml(user, type, template, vars, refId);
        int attempts = retry ? 3 : 1;
        Exception last = null;
        for (int i = 0; i < attempts; i++) {
            try {
                MimeMessage message = mailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
                helper.setFrom(new InternetAddress(props.mail().fromAddress(), props.mail().fromName(), "UTF-8"));
                helper.setTo(toEmail);
                helper.setSubject(subject);
                helper.setText(html, true);
                mailSender.send(message);
                notificationLog.log(user.id(), type, "SENT", null, refId);
                return;
            } catch (Exception e) {
                last = e;
                if (i < attempts - 1) {
                    try {
                        Thread.sleep(1000L * (i + 1));
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                }
            }
        }
        String message = last == null ? "Naməlum mail xətası" : last.getMessage();
        notificationLog.log(user.id(), type, "FAILED", message, refId);
        throw new MailSendException("E-poçt göndərilə bilmədi", last);
    }

    private String renderHtml(User user, String type, String template, Map<String, Object> vars, String refId) {
        try {
            Context context = new Context(Locale.forLanguageTag("az"));
            context.setVariables(vars);
            return templateEngine.process(template, context);
        } catch (Exception e) {
            notificationLog.log(user.id(), type, "FAILED", "Şablon xətası: " + e.getMessage(), refId);
            throw new MailSendException("E-poçt şablonu hazırlana bilmədi", e);
        }
    }

    public static class MailSendException extends RuntimeException {
        public MailSendException(String message) {
            super(message);
        }

        public MailSendException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
