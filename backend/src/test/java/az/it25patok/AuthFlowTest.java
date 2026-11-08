package az.it25patok;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AuthFlowTest extends IntegrationTest {

    private static final String ADMIN_EMAIL = "admin@it25patok.az";
    private static final String ADMIN_PASSWORD = "Admin123!IT25";

    @Autowired
    MockMvc mvc;

    @Test
    void adminLoginSendsOtpToOutboxAndVerifyIssuesToken() throws Exception {
        MvcResult login = performJson(mvc, "POST", "/api/v1/auth/login", null,
                Map.of("identifier", ADMIN_EMAIL, "password", ADMIN_PASSWORD, "rememberDevice", false));
        assertThat(login.getResponse().getStatus()).isEqualTo(200);
        String challengeId = jsonString(login, "$.data.challengeId");
        assertThat(challengeId).isNotBlank();

        String code = readOtpCode(ADMIN_EMAIL);

        MvcResult verify = performJson(mvc, "POST", "/api/v1/auth/verify-otp", null,
                Map.of("challengeId", challengeId, "code", code, "rememberDevice", false));
        assertThat(verify.getResponse().getStatus()).isEqualTo(200);
        String token = jsonString(verify, "$.data.accessToken");
        assertThat(token).isNotBlank();

        mvc.perform(MockMvcRequestBuilders.get("/api/v1/admin/stats")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.students").isNumber());
    }

    @Test
    void wrongPasswordRejected() throws Exception {
        MvcResult login = performJson(mvc, "POST", "/api/v1/auth/login", null,
                Map.of("identifier", ADMIN_EMAIL, "password", "tamamilə-yanlış-bir-parol", "rememberDevice", false));
        assertThat(login.getResponse().getStatus()).isEqualTo(401);
    }

    @Test
    void anonymousCannotCallAdminEndpoints() throws Exception {
        mvc.perform(MockMvcRequestBuilders.get("/api/v1/admin/stats"))
                .andExpect(status().isUnauthorized());
        mvc.perform(MockMvcRequestBuilders.post("/api/v1/admin/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void studentCannotCallAdminEndpoints() throws Exception {
        String adminToken = login(mvc, ADMIN_EMAIL, ADMIN_PASSWORD);
        String email = "not-admin-" + System.nanoTime() + "@it25patok.az";
        String username = "not-admin-" + System.nanoTime();
        createUser(mvc, adminToken,
                Map.of("role", "STUDENT", "username", username, "firstName", "Not", "lastName", "Admin",
                        "groupId", "grp_a1", "initialPassword", "Student123!"));

        String studentToken = onboard(mvc, username, "Student123!", email);
        mvc.perform(MockMvcRequestBuilders.get("/api/v1/admin/stats")
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isForbidden());
        mvc.perform(MockMvcRequestBuilders.post("/api/v1/admin/users")
                        .header("Authorization", "Bearer " + studentToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"STUDENT\",\"username\":\"y\",\"firstName\":\"Y\",\"lastName\":\"Z\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void otpLocksAfterFiveWrongAttempts() throws Exception {
        String adminToken = login(mvc, ADMIN_EMAIL, ADMIN_PASSWORD);
        String email = "lock-test-" + System.nanoTime() + "@it25patok.az";
        String username = "lock-test-" + System.nanoTime();
        createUser(mvc, adminToken,
                Map.of("role", "STUDENT", "username", username, "firstName", "Lock", "lastName", "Test",
                        "groupId", "grp_a1", "initialPassword", "Student123!"));
        onboard(mvc, username, "Student123!", email);

        MvcResult login = performJson(mvc, "POST", "/api/v1/auth/login", null,
                Map.of("identifier", email, "password", "Student123!", "rememberDevice", false));
        assertThat(login.getResponse().getStatus()).isEqualTo(200);
        String challengeId = jsonString(login, "$.data.challengeId");

        String correctCode = readOtpCode(email);
        String wrongCode = "000000".equals(correctCode) ? "000001" : "000000";

        for (int i = 0; i < 4; i++) {
            MvcResult wrong = performJson(mvc, "POST", "/api/v1/auth/verify-otp", null,
                    Map.of("challengeId", challengeId, "code", wrongCode, "rememberDevice", false));
            assertThat(wrong.getResponse().getStatus()).as("wrong attempt " + (i + 1)).isEqualTo(400);
        }
        MvcResult fifth = performJson(mvc, "POST", "/api/v1/auth/verify-otp", null,
                Map.of("challengeId", challengeId, "code", wrongCode, "rememberDevice", false));
        assertThat(fifth.getResponse().getStatus()).isEqualTo(429);

        MvcResult afterBlock = performJson(mvc, "POST", "/api/v1/auth/verify-otp", null,
                Map.of("challengeId", challengeId, "code", correctCode, "rememberDevice", false));
        assertThat(afterBlock.getResponse().getStatus()).isGreaterThanOrEqualTo(400);
        assertThat(afterBlock.getResponse().getStatus()).isLessThan(500);
    }
}
