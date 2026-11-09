package az.it25patok.common;

import az.it25patok.config.AppProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Base64;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CryptoServiceTest {

    private static AppProperties appProperties(String chatKey, int keyVersion, String oldKeys) {
        return new AppProperties(
                "http://localhost:5173",
                new AppProperties.Cors(List.of("http://localhost:5173"), false, "Lax"),
                new AppProperties.Jwt("test-secret-key-test-secret-key-123456", 15, 7, "it25patok"),
                new AppProperties.D1("local", null, null, null, "./build/test.db", 20),
                new AppProperties.Storage("local", "./build/test-files", null, null),
                new AppProperties.Drive(null, null, null, "IT25 PATOK"),
                new AppProperties.Mail(true, "./build/test-outbox", "İT25 PATOK", "no-reply@it25patok.az", null, 1000L),
                new AppProperties.Otp(5, 5, 60, 5, 15),
                new AppProperties.Chat(chatKey, keyVersion, oldKeys, 7, 2000),
                new AppProperties.Files(365, 30, "./build/previews", "soffice", 120),
                new AppProperties.Admin("admin@it25patok.az", "Admin123!IT25"),
                false,
                "Asia/Baku");
    }

    private static String base64Key(byte seed) {
        byte[] key = new byte[32];
        for (int i = 0; i < key.length; i++) key[i] = (byte) (seed + i);
        return Base64.getEncoder().encodeToString(key);
    }

    private CryptoService crypto;

    @BeforeEach
    void setUp() {
        crypto = new CryptoService(appProperties(base64Key((byte) 7), 2, null));
    }

    @Test
    void encryptThenDecryptRoundTrips() {
        String secret = "Tamamilə təsnifat məlumatı — parol 12345";
        CryptoService.Encrypted encrypted = crypto.encrypt(secret, "room_a1");
        assertThat(encrypted.ciphertext()).isNotNull();
        assertThat(encrypted.iv()).isNotNull();
        assertThat(encrypted.keyVersion()).isEqualTo(2);
        assertThat(crypto.decrypt(encrypted.ciphertext(), encrypted.iv(), encrypted.keyVersion(), "room_a1"))
                .isEqualTo(secret);
    }

    @Test
    void ciphertextDoesNotContainPlaintextAtRest() {
        String secret = "plaintext-5132-secret";
        CryptoService.Encrypted encrypted = crypto.encrypt(secret, "aad");
        assertThat(encrypted.ciphertext()).doesNotContain(secret);
        assertThat(encrypted.ciphertext()).doesNotContain("5132");
        assertThat(encrypted.iv()).doesNotContain(secret);
    }

    @Test
    void wrongAadFailsDecryption() {
        CryptoService.Encrypted encrypted = crypto.encrypt("secret", "room_a1");
        assertThatThrownBy(() -> crypto.decrypt(encrypted.ciphertext(), encrypted.iv(), encrypted.keyVersion(), "room_a2"))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void unknownKeyVersionFailsDecryption() {
        CryptoService.Encrypted encrypted = crypto.encrypt("secret", "room_a1");
        assertThatThrownBy(() -> crypto.decrypt(encrypted.ciphertext(), encrypted.iv(), 999, "room_a1"))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void previousKeyDecryptsOldKeyVersionMessages() {
        String oldKey = base64Key((byte) 3);
        CryptoService oldFormat = new CryptoService(appProperties(oldKey, 1, null));
        String secret = "köhnə mesaj 777";
        CryptoService.Encrypted oldMessage = oldFormat.encrypt(secret, "room_a1");
        assertThat(oldMessage.keyVersion()).isEqualTo(1);

        // current version 2, with the v1 key registered as an old key
        CryptoService rotated = new CryptoService(appProperties(base64Key((byte) 7), 2, oldKey));
        assertThat(rotated.decrypt(oldMessage.ciphertext(), oldMessage.iv(), oldMessage.keyVersion(), "room_a1"))
                .isEqualTo(secret);
    }

    @Test
    void missingOldKeyFailsDecryption() {
        String oldKey = base64Key((byte) 3);
        CryptoService oldFormat = new CryptoService(appProperties(oldKey, 1, null));
        CryptoService.Encrypted oldMessage = oldFormat.encrypt("secret", "room_a1");
        // rotated key without registering the old key
        CryptoService rotated = new CryptoService(appProperties(base64Key((byte) 7), 2, null));
        assertThatThrownBy(() -> rotated.decrypt(oldMessage.ciphertext(), oldMessage.iv(), 1, "room_a1"))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void sha256HexIsDeterministic() {
        assertThat(CryptoService.sha256Hex("abc")).isEqualTo(CryptoService.sha256Hex("abc"));
        assertThat(CryptoService.sha256Hex("abc")).isNotEqualTo(CryptoService.sha256Hex("abd"));
    }
}
