package az.it25patok.common;

import az.it25patok.config.AppProperties;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;

@Service
public class CryptoService {
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final int GCM_TAG_BITS = 128;

    private final SecretKey currentKey;
    private final int currentVersion;
    private final List<SecretKey> oldKeys;

    public CryptoService(AppProperties props) {
        String raw = props.chat().encryptionKey();
        if (raw == null || raw.isBlank()) {
            if ("cloudflare".equalsIgnoreCase(props.d1().mode())) {
                throw new IllegalStateException("CHAT_ENCRYPTION_KEY mütləqdir (32 bayt base64).");
            }
            raw = Base64.getEncoder().encodeToString(
                    sha256("it25patok-local-chat-key".getBytes(StandardCharsets.UTF_8)));
        }
        byte[] keyBytes;
        try {
            keyBytes = Base64.getDecoder().decode(raw.trim());
        } catch (IllegalArgumentException e) {
            keyBytes = sha256(raw.getBytes(StandardCharsets.UTF_8));
        }
        if (keyBytes.length != 32) {
            keyBytes = sha256(keyBytes);
        }
        this.currentKey = new SecretKeySpec(keyBytes, "AES");
        this.currentVersion = props.chat().keyVersion();
        this.oldKeys = new ArrayList<>();
        String old = props.chat().oldKeys();
        if (old != null && !old.isBlank()) {
            for (String item : old.split(",")) {
                if (!item.isBlank()) {
                    byte[] bytes = Base64.getDecoder().decode(item.trim());
                    this.oldKeys.add(new SecretKeySpec(bytes.length == 32 ? bytes : sha256(bytes), "AES"));
                }
            }
        }
    }

    public record Encrypted(String ciphertext, String iv, int keyVersion) {}

    public Encrypted encrypt(String plaintext, String aad) {
        try {
            byte[] iv = new byte[12];
            RANDOM.nextBytes(iv);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, currentKey, new GCMParameterSpec(GCM_TAG_BITS, iv));
            if (aad != null) cipher.updateAAD(aad.getBytes(StandardCharsets.UTF_8));
            byte[] encrypted = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
            return new Encrypted(Base64.getEncoder().encodeToString(encrypted),
                    Base64.getEncoder().encodeToString(iv), currentVersion);
        } catch (Exception e) {
            throw new IllegalStateException("Mesaj şifrələnə bilmədi", e);
        }
    }

    public String decrypt(String ciphertext, String iv, int keyVersion, String aad) {
        try {
            SecretKey key = keyFor(keyVersion);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key,
                    new GCMParameterSpec(GCM_TAG_BITS, Base64.getDecoder().decode(iv)));
            if (aad != null) cipher.updateAAD(aad.getBytes(StandardCharsets.UTF_8));
            byte[] plain = cipher.doFinal(Base64.getDecoder().decode(ciphertext));
            return new String(plain, StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new IllegalStateException("Mesaj deşifrə oluna bilmədi", e);
        }
    }

    private SecretKey keyFor(int version) {
        if (version == currentVersion) return currentKey;
        int index = currentVersion - version - 1;
        if (index >= 0 && index < oldKeys.size()) return oldKeys.get(index);
        throw new IllegalStateException("Naməlum çat açarı versiyası: " + version);
    }

    public static String sha256Hex(String value) {
        return java.util.HexFormat.of().formatHex(sha256(value.getBytes(StandardCharsets.UTF_8)));
    }

    public static byte[] sha256(byte[] value) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(value);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
