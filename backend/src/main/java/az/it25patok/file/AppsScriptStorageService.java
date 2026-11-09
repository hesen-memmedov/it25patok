package az.it25patok.file;

import az.it25patok.common.Text;
import az.it25patok.config.AppProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.List;
import java.util.Map;

/**
 * Google Apps Script storage bridge — fayllar it25patok@gmail.com hesabının
 * Drive mətbəxində ('İT25 PATOK Storage') saxlanılır.
 *
 * <p>Aktiv edildikdə: app.storage.mode=apps-script,
 * app.storage.apps-script-url, app.storage.apps-script-token tələb olunur.</p>
 */
@Service
@ConditionalOnProperty(name = "app.storage.mode", havingValue = "apps-script")
public class AppsScriptStorageService implements StorageService {
    private static final Logger log = LoggerFactory.getLogger(AppsScriptStorageService.class);
    private static final int MAX_DOWNLOAD_BYTES = 120 * 1024 * 1024;

    private final String url;
    private final String token;
    private final ObjectMapper mapper = new ObjectMapper();
    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(20))
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();

    public AppsScriptStorageService(AppProperties props) {
        this.url = props.storage().appsScriptUrl();
        this.token = props.storage().appsScriptToken();
        if (this.url == null || this.url.isBlank()) {
            throw new IllegalStateException("STORAGE_APPS_SCRIPT_URL təyin olunmayıb.");
        }
        if (this.token == null || this.token.isBlank()) {
            throw new IllegalStateException("STORAGE_APPS_SCRIPT_TOKEN təyin olunmayıb.");
        }
    }

    @Override
    public String upload(String fileId, InputStream input, long size, String fileName, String mimeType,
                         List<String> folders) throws IOException {
        byte[] bytes = input.readAllBytes();
        if (bytes.length == 0) throw new IOException("Boş fayl yüklənə bilməz.");
        Map<String, Object> body = Map.of(
                "token", token,
                "action", "upload",
                "name", Text.safeFileName(fileName),
                "fileId", fileId,
                "folder", String.join("/", folders == null ? List.of() : folders),
                "mimeType", mimeType == null ? "application/octet-stream" : mimeType,
                "base64", Base64.getEncoder().encodeToString(bytes));
        JsonNode response = post(body);
        if (!response.path("ok").asBoolean(false)) {
            throw new IOException("Drive yükləməsi alınmadı: " + response.path("error").asText("naməlum xəta"));
        }
        String id = response.path("id").asText();
        if (id == null || id.isBlank()) throw new IOException("Drive faylı yaradıldı, amma ID qayıtmadı.");
        return id;
    }

    @Override
    public InputStream download(String objectId, Long start, Long end) throws IOException {
        StringBuilder builder = new StringBuilder(url)
                .append(url.contains("?") ? "&" : "?")
                .append("action=download&token=").append(urlEncode(token))
                .append("&id=").append(urlEncode(objectId));
        if (start != null && start > 0) builder.append("&start=").append(start);
        if (end != null) builder.append("&end=").append(end);

        HttpRequest request = HttpRequest.newBuilder(URI.create(builder.toString()))
                .timeout(Duration.ofMinutes(10))
                .GET().build();
        try {
            HttpResponse<byte[]> response = http.send(request, HttpResponse.BodyHandlers.ofByteArray());
            if (response.statusCode() != 200) {
                throw new IOException("Drive yükləməsi xətası (HTTP " + response.statusCode() + ")");
            }
            JsonNode json = mapper.readTree(response.body());
            if (!json.path("ok").asBoolean(false)) {
                throw new IOException("Drive yükləməsi alınmadı: " + json.path("error").asText("naməlum xəta"));
            }
            String base64 = json.path("base64").asText();
            byte[] bytes = Base64.getDecoder().decode(base64);
            if (bytes.length > MAX_DOWNLOAD_BYTES) {
                throw new IOException("Fayl ölçüsü çox böyükdür.");
            }
            return new ByteArrayInputStream(bytes);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IOException("Drive yükləməsi dayandırıldı", e);
        }
    }

    @Override
    public void delete(String objectId) {
        try {
            post(Map.of("token", token, "action", "delete", "id", objectId));
        } catch (IOException e) {
            log.warn("Drive faylı silinə bilmədi {}: {}", objectId, e.getMessage());
        }
    }

    @Override
    public boolean rangeSupported() {
        return true;
    }

    private JsonNode post(Object body) throws IOException {
        HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                .timeout(Duration.ofMinutes(10))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body), StandardCharsets.UTF_8))
                .build();
        try {
            HttpResponse<byte[]> response = http.send(request, HttpResponse.BodyHandlers.ofByteArray());
            if (response.statusCode() != 200) {
                throw new IOException("apps-script service xətası (HTTP " + response.statusCode() + ")");
            }
            return mapper.readTree(response.body());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IOException("apps-script service dayandırıldı", e);
        }
    }

    private static String urlEncode(String value) {
        return java.net.URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
