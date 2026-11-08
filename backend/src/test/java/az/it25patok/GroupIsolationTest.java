package az.it25patok;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * İT25A1 / İT25A2 qrup izolyasiyası: bir qrupa aid tapşırıq digər qrupun
 * tələbəsinə görünməməli və açıla bilməməlidir.
 */
class GroupIsolationTest extends IntegrationTest {

    private static final String ADMIN_EMAIL = "admin@it25patok.az";
    private static final String ADMIN_PASSWORD = "Admin123!IT25";

    @Autowired
    MockMvc mvc;

    @Test
    void assignmentIsVisibleOnlyToTargetGroup() throws Exception {
        String adminToken = login(mvc, ADMIN_EMAIL, ADMIN_PASSWORD);

        // subject + teacher with teaching assignment for grp_a1 only
        MvcResult subject = performJson(mvc, "POST", "/api/v1/admin/subjects", adminToken,
                Map.of("name", "Fizika", "code", "PHY", "description", "test fənni"));
        assertThat(subject.getResponse().getStatus()).isEqualTo(200);
        String subjectId = jsonString(subject, "$.data.id");

        String suffix = String.valueOf(System.nanoTime());
        String teacherEmail = "teacher-isolation-" + suffix + "@it25patok.az";
        String teacherUsername = "teacher-isolation-" + suffix;
        createUser(mvc, adminToken,
                Map.of("role", "TEACHER", "username", teacherUsername, "firstName", "Test", "lastName", "Teacher",
                        "initialPassword", "Teacher123!",
                        "teachingAssignments", java.util.List.of(Map.of("subjectId", subjectId, "groupId", "grp_a1"))));

        // a student in each group
        String a2Email = "student-a2-isolation-" + suffix + "@it25patok.az";
        String a1Email = "student-a1-isolation-" + suffix + "@it25patok.az";
        String a2Username = "student-a2-isolation-" + suffix;
        String a1Username = "student-a1-isolation-" + suffix;
        createUser(mvc, adminToken,
                Map.of("role", "STUDENT", "username", a2Username, "firstName", "A2", "lastName", "Student",
                        "groupId", "grp_a2", "initialPassword", "Student123!"));
        createUser(mvc, adminToken,
                Map.of("role", "STUDENT", "username", a1Username, "firstName", "A1", "lastName", "Student",
                        "groupId", "grp_a1", "initialPassword", "Student123!"));

        // teacher creates an assignment targeted at grp_a1 only
        String teacherToken = onboard(mvc, teacherUsername, "Teacher123!", teacherEmail);
        MvcResult assignment = performJson(mvc, "POST", "/api/v1/teacher/assignments", teacherToken,
                Map.of("type", "SERBEST_ISH", "subjectId", subjectId,
                        "title", "A1 izolyasiya tapşırığı",
                        "description", "yalnız A1 qrupu",
                        "maxScore", 100, "allowLate", true,
                        "groupIds", java.util.List.of("grp_a1")));
        assertThat(assignment.getResponse().getStatus())
                .as("teacher create assignment: " + assignment.getResponse().getContentAsString())
                .isEqualTo(200);
        String assignmentId = jsonString(assignment, "$.data.assignment.id");
        assertThat(assignmentId).isNotBlank();

        // A2 student must not see it in the list
        String a2Token = onboard(mvc, a2Username, "Student123!", a2Email);
        MvcResult a2List = performJson(mvc, "GET", "/api/v1/student/assignments?page=1&size=50", a2Token, null);
        assertThat(a2List.getResponse().getStatus()).isEqualTo(200);
        assertThat(a2List.getResponse().getContentAsString()).doesNotContain(assignmentId);

        // A2 student must not open the detail endpoint
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .get("/api/v1/student/assignments/" + assignmentId)
                        .header("Authorization", "Bearer " + a2Token))
                .andExpect(status().isForbidden());

        // A1 student sees it in the list and can open it
        String a1Token = onboard(mvc, a1Username, "Student123!", a1Email);
        MvcResult a1List = performJson(mvc, "GET", "/api/v1/student/assignments?page=1&size=50", a1Token, null);
        assertThat(a1List.getResponse().getStatus()).isEqualTo(200);
        assertThat(a1List.getResponse().getContentAsString()).contains(assignmentId);

        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .get("/api/v1/student/assignments/" + assignmentId)
                        .header("Authorization", "Bearer " + a1Token))
                .andExpect(status().isOk());
    }
}
