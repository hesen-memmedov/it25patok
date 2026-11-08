package az.it25patok;

import az.it25patok.auth.AuthUser;
import az.it25patok.chat.ChatRepository;
import az.it25patok.chat.ChatService;
import az.it25patok.common.CryptoService;
import az.it25patok.common.Db;
import az.it25patok.common.Time;
import az.it25patok.user.Role;
import az.it25patok.user.User;
import az.it25patok.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Çat mesajları AES-256-GCM ilə saxlanılır (AAD = roomId) və başqa otağın
 * açarı ilə/AAD-i ilə deşifrə olunmur.
 */
class ChatEncryptionAtRestTest extends IntegrationTest {

    @Autowired
    ChatService chatService;

    @Autowired
    ChatRepository chatRepository;

    @Autowired
    UserRepository users;

    @Autowired
    CryptoService crypto;

    private User insertStudent(String email, String groupId) {
        long now = Time.now();
        User user = new User(null, Role.STUDENT, email, email.split("@")[0], "hash", "Test", "Student", null, groupId,
                null, null, "system", true, false, 0, null, null, null, true, null, now, now, null);
        String id = users.insert(user);
        return users.findById(id);
    }

    @Test
    void messageIsStoredEncryptedAndDecryptsOnlyWithMatchingAad() {
        User admin = users.findByEmail("admin@it25patok.az");
        AuthUser adminAuth = new AuthUser(admin.id(), admin.email(), "ADMIN");

        String secret = "Çox gizli test məlumatı — token 987654";
        var sent = chatService.send("room_global", adminAuth, secret, null);
        assertThat(sent.text()).isEqualTo(secret);

        var row = chatRepository.findMessage(sent.id());
        String ciphertext = Db.str(row, "ciphertext");
        String iv = Db.str(row, "iv");
        int keyVersion = Db.integer(row, "key_version", 1);

        // at-rest: plaintext and obvious fragments must not appear in storage
        assertThat(ciphertext).doesNotContain("Gizli");
        assertThat(ciphertext).doesNotContain("987654");
        assertThat(ciphertext).doesNotContain(secret);

        // round trip with correct AAD (room id) works
        assertThat(crypto.decrypt(ciphertext, iv, keyVersion, "room_global")).isEqualTo(secret);

        // AAD mismatch (different room) fails
        assertThatThrownBy(() -> crypto.decrypt(ciphertext, iv, keyVersion, "room_a1"))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void groupRoomAccessIsRestrictedToGroupMembers() {
        User admin = users.findByEmail("admin@it25patok.az");
        AuthUser adminAuth = new AuthUser(admin.id(), admin.email(), "ADMIN");
        assertThat(chatService.canAccess("room_a1", adminAuth)).isTrue();

        User a1 = insertStudent("chat-a1-" + System.nanoTime() + "@it25patok.az", "grp_a1");
        User a2 = insertStudent("chat-a2-" + System.nanoTime() + "@it25patok.az", "grp_a2");

        assertThat(chatService.canAccess("room_a1", new AuthUser(a1.id(), a1.email(), "STUDENT"))).isTrue();
        assertThat(chatService.canAccess("room_a1", new AuthUser(a2.id(), a2.email(), "STUDENT"))).isFalse();
        // everyone can see the global room
        assertThat(chatService.canAccess("room_global", new AuthUser(a2.id(), a2.email(), "STUDENT"))).isTrue();
    }
}
