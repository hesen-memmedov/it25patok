package az.it25patok.notification;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

/**
 * Brevo (Sendinblue) HTTPS REST API ilə e-poçt göndərir — Render.com kimi
 * SMTP portlarının (25/465/587) bağlı olduğu pulsuz hostlarda işləyir.
 * API: POST https://api.brevo.com/v3/smtp/email  (header: api-key)
 */
@Service
public class BrevoMailService {
    private static final Logger log = LoggerFactory.getLogger(BrevoMailService.class);
    private static final String API = "https://api.brevo.com/v3/smtp/email";

    private final az.it25patok.config.AppProperties props;
    private final RestClient client;

    public BrevoMailService(az.it25patok.config.AppProperties props) {
        this.props = props;
        this.client = RestClient.builder().build();
    }

    public boolean isConfigured() {
        String key = props.mail().brevoApiKey();
        return key != null && !key.isBlank();
    }

    /** Brevo sender = app.mail.from-address (Brevo panelində təsdiqlənmiş tək e-poçt). */
    public boolean send(String toEmail, String toName, String subject, String html) {
        if (!isConfigured()) return false;
        String fromName = props.mail().fromName();
        String fromAddress = props.mail().fromAddress();
        if (fromName == null || fromName.isBlank()) fromName = "İT25 PATOK";
        if (fromAddress == null || fromAddress.isBlank()) fromAddress = "it25patok@gmail.com";

        Map<String, Object> body = Map.of(
                "sender", Map.of("name", fromName, "email", fromAddress),
                "to", List.of(Map.of(
                        "email", toEmail,
                        "name", toName == null || toName.isBlank() ? toEmail : toName)),
                "subject", subject,
                "htmlContent", html);
        try {
            String response = client.post()
                    .uri(API)
                    .header("api-key", props.mail().brevoApiKey())
                    .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                    .header(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                    .body(body)
                    .retrieve()
                    .body(String.class);
            boolean ok = response != null && response.contains("messageId");
            if (!ok) {
                log.error("Brevo gözlənilməyən cavab: {}", response);
            }
            return ok;
        } catch (Exception e) {
            log.error("Brevo göndəriş xətası: {}", e.getMessage());
            return false;
        }
    }
}
