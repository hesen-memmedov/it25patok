package az.it25patok;

import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import com.jayway.jsonpath.JsonPath;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Shared context + infrastructure for integration tests: local SQLite D1,
 * local file storage and a dev-mail outbox inside a fresh temp directory.
 */
@SpringBootTest
@AutoConfigureMockMvc
abstract class IntegrationTest {

    static final Path TEMP_DIR;
    static final Path DB_PATH;
    static final Path FILES_DIR;
    static final Path OUTBOX_DIR;
    static final Path PREVIEWS_DIR;

    static {
        try {
            TEMP_DIR = Files.createTempDirectory("it25patok-test-");
            DB_PATH = TEMP_DIR.resolve("test.db");
            FILES_DIR = Files.createDirectories(TEMP_DIR.resolve("files"));
            OUTBOX_DIR = Files.createDirectories(TEMP_DIR.resolve("outbox"));
            PREVIEWS_DIR = Files.createDirectories(TEMP_DIR.resolve("previews"));
        } catch (IOException e) {
            throw new ExceptionInInitializerError(e);
        }
    }

    @DynamicPropertySource
    static void props(DynamicPropertyRegistry registry) {
        registry.add("app.d1.mode", () -> "local");
        registry.add("app.d1.local-path", () -> DB_PATH.toString());
        registry.add("app.storage.mode", () -> "local");
        registry.add("app.storage.local-root", () -> FILES_DIR.toString());
        registry.add("app.otp.max-attempts", () -> "5");
        registry.add("app.otp.resend-cooldown-seconds", () -> "0");
        registry.add("app.otp.max-per-hour", () -> "10000");
        registry.add("app.mail.dev-mode", () -> "true");
        registry.add("app.mail.dev-outbox", () -> OUTBOX_DIR.toString());
        registry.add("app.files.conversion-dir", () -> PREVIEWS_DIR.toString());
        registry.add("app.admin.email", () -> "admin@it25patok.az");
        registry.add("app.admin.initial-password", () -> "Admin123!IT25");
    }

    /** Perform a JSON request; returns the raw result. */
    protected static MvcResult performJson(MockMvc mvc, String method, String url, String token, Object body) throws Exception {
        var builder = MockMvcRequestBuilders
                .request(HttpMethod.valueOf(method), url)
                .contentType(MediaType.APPLICATION_JSON)
                .characterEncoding("UTF-8");
        if (token != null) {
            builder.header("Authorization", "Bearer " + token);
        }
        if (body != null) {
            builder.content(new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsBytes(body));
        }
        return mvc.perform(builder).andReturn();
    }

    /** Extract a string value from a response using JsonPath. */
    protected static String jsonString(MvcResult result, String path) throws Exception {
        String body = result.getResponse().getContentAsString();
        Object value = JsonPath.read(body, path);
        return value == null ? null : value.toString();
    }

    /** Read the newest OTP e-mail for the given recipient from the dev outbox. */
    protected static String readOtpCode(String email) {
        try (Stream<Path> files = Files.list(OUTBOX_DIR)) {
            Path latest = files
                    .filter(p -> p.getFileName().toString().endsWith(".html"))
                    .filter(p -> p.getFileName().toString().contains("-otp-"))
                    .filter(p -> {
                        try {
                            return Files.readString(p).contains("To: " + email);
                        } catch (IOException e) {
                            return false;
                        }
                    })
                    .max(Comparator.comparing(p -> p.getFileName().toString()))
                    .orElse(null);
            assertThat(latest).as("OTP e-poçt faylı (" + email + ")").isNotNull();
            String html = Files.readString(latest);
            var matcher = java.util.regex.Pattern.compile(">([0-9]{6})</div>").matcher(html);
            assertThat(matcher.find()).as("OTP kodu e-poçt mətnində tapıldı").isTrue();
            return matcher.group(1);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    /** Log in with e-mail + password; returns the access token (performs the full OTP flow). */
    protected static String login(MockMvc mvc, String identifier, String password) throws Exception {
        MvcResult login = performJson(mvc, "POST", "/api/v1/auth/login", null,
                java.util.Map.of("identifier", identifier, "password", password, "rememberDevice", false));
        assertThat(login.getResponse().getStatus()).as("login status for " + identifier).isEqualTo(200);
        String challengeId = jsonString(login, "$.data.challengeId");
        assertThat(challengeId).as("challengeId").isNotBlank();

        String code = readOtpCode(identifier);
        MvcResult verify = performJson(mvc, "POST", "/api/v1/auth/verify-otp", null,
                java.util.Map.of("challengeId", challengeId, "code", code, "rememberDevice", false));
        assertThat(verify.getResponse().getStatus()).as("verify-otp status for " + identifier).isEqualTo(200);
        String token = jsonString(verify, "$.data.accessToken");
        assertThat(token).as("accessToken").isNotBlank();
        return token;
    }

    /**
     * Complete the first-time onboarding for a freshly created account:
     * login → forced password change → register real e-mail → OTP → access token.
     */
    protected static String onboard(MockMvc mvc, String username, String initialPassword, String realEmail) throws Exception {
        MvcResult login = performJson(mvc, "POST", "/api/v1/auth/login", null,
                java.util.Map.of("identifier", username, "password", initialPassword, "rememberDevice", false));
        assertThat(login.getResponse().getStatus())
                .as("onboarding login: " + login.getResponse().getContentAsString()).isEqualTo(200);
        assertThat(jsonString(login, "$.data.flow")).isEqualTo("password-change");
        String changeToken = jsonString(login, "$.data.setupToken");

        MvcResult change = performJson(mvc, "POST", "/api/v1/auth/first-password-change", changeToken,
                java.util.Map.of("newPassword", initialPassword));
        assertThat(change.getResponse().getStatus())
                .as("first-password-change: " + change.getResponse().getContentAsString()).isEqualTo(200);
        assertThat(jsonString(change, "$.data.flow")).isEqualTo("email-setup");
        String emailToken = jsonString(change, "$.data.setupToken");

        MvcResult register = performJson(mvc, "POST", "/api/v1/auth/register-email", emailToken,
                java.util.Map.of("email", realEmail));
        assertThat(register.getResponse().getStatus())
                .as("register-email: " + register.getResponse().getContentAsString()).isEqualTo(200);
        String challengeId = jsonString(register, "$.data.challengeId");
        assertThat(challengeId).as("register-email challengeId").isNotBlank();

        String code = readOtpCode(realEmail);
        MvcResult verify = performJson(mvc, "POST", "/api/v1/auth/verify-otp", null,
                java.util.Map.of("challengeId", challengeId, "code", code, "rememberDevice", false));
        assertThat(verify.getResponse().getStatus())
                .as("verify-otp after onboarding: " + verify.getResponse().getContentAsString()).isEqualTo(200);
        String token = jsonString(verify, "$.data.accessToken");
        assertThat(token).as("onboarding accessToken").isNotBlank();
        return token;
    }

    /** Create a user as admin; returns the new user id. */
    protected static String createUser(MockMvc mvc, String adminToken, java.util.Map<String, Object> payload) throws Exception {
        MvcResult result = performJson(mvc, "POST", "/api/v1/admin/users", adminToken, payload);
        assertThat(result.getResponse().getStatus())
                .as("create user failed: " + result.getResponse().getContentAsString())
                .isEqualTo(200);
        String id = jsonString(result, "$.data.user.id");
        assertThat(id).as("new user id").isNotBlank();
        return id;
    }
}
