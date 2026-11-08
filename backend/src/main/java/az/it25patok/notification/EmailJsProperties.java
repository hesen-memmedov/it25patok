package az.it25patok.notification;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Map;

/**
 * EmailJS (https://www.emailjs.com) REST inteqrasiyası.
 * OTP məktubları Gmail SMTP əvəzinə bu servisdən göndərilir — sender adı
 * "İT25 PATOK" olur, spam filtrini aşır.
 *
 * Konfiqurasiya: app.emailjs.service-id / template-id / public-key / private-key
 * (mühit dəyişənləri APP_EMAILJS_SERVICE_ID və s. ilə təyin olunur).
 */
@ConfigurationProperties(prefix = "app.emailjs")
public record EmailJsProperties(String serviceId, String templateId, String publicKey,
                                String privateKey, String website) {

    public boolean isConfigured() {
        return serviceId != null && !serviceId.isBlank()
                && templateId != null && !templateId.isBlank()
                && publicKey != null && !publicKey.isBlank()
                && privateKey != null && !privateKey.isBlank();
    }
}
