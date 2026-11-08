package az.it25patok.notification;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.HashMap;
import java.util.Map;

/**
 * EmailJS REST API vasitəsilə OTP məktublarını göndərir.
 * API: https://api.emailjs.com/api/v1.0/email/send
 */
@Service
public class EmailJsService {
    private static final Logger log = LoggerFactory.getLogger(EmailJsService.class);
    private static final String API = "https://api.emailjs.com/api/v1.0/email/send";
    private static final String DEFAULT_WEBSITE = "https://it25patok.pages.dev";

    private final EmailJsProperties props;
    private final RestClient client;
    private final String origin;

    public EmailJsService(EmailJsProperties props, az.it25patok.config.AppProperties appProps) {
        this.props = props;
        this.origin = appProps.baseUrl();
        this.client = RestClient.builder().build();
    }

    public boolean isConfigured() {
        return props.isConfigured();
    }

    /** Template {{email}}, {{to_name}}, {{purpose}}, {{code}}, {{minutes}}, {{website}} dəyişənlərini doldurur. */
    public boolean sendOtp(String toEmail, String toName, String purpose, String code, long minutes) {
        if (!isConfigured()) {
            return false;
        }
        Map<String, Object> templateParams = new HashMap<>();
        templateParams.put("email", toEmail);
        templateParams.put("to_name", toName == null || toName.isBlank() ? "İstifadəçi" : toName);
        templateParams.put("purpose", purpose == null || purpose.isBlank() ? "giriş" : purpose);
        templateParams.put("code", code);
        templateParams.put("minutes", String.valueOf(minutes));
        templateParams.put("website",
                props.website() == null || props.website().isBlank() ? DEFAULT_WEBSITE : props.website());

        Map<String, Object> body = new HashMap<>();
        body.put("service_id", props.serviceId());
        body.put("template_id", props.templateId());
        body.put("user_id", props.publicKey());
        body.put("accessToken", props.privateKey());
        body.put("template_params", templateParams);

        try {
            String response = client.post()
                    .uri(API)
                    .header("Origin", origin == null || origin.isBlank() ? DEFAULT_WEBSITE : origin)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(String.class);
            boolean ok = response != null && response.trim().equalsIgnoreCase("OK");
            if (!ok) {
                log.error("EmailJS gözlənilməyən cavab: {}", response);
            }
            return ok;
        } catch (Exception e) {
            log.error("EmailJS göndəriş xətası: {}", e.getMessage());
            return false;
        }
    }
}
