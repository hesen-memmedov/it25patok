package az.it25patok.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

@ConfigurationProperties(prefix = "app")
public record AppProperties(
        String baseUrl,
        Cors cors,
        Jwt jwt,
        D1 d1,
        Storage storage,
        Drive drive,
        Mail mail,
        Otp otp,
        Chat chat,
        Files files,
        Admin admin,
        boolean trustProxy,
        String timezone
) {
    public record Cors(List<String> allowedOrigins, boolean cookieSecure, String cookieSameSite) {}
    public record Jwt(String secret, long accessTtlMinutes, long refreshTtlDays, String issuer) {}
    public record D1(String mode, String accountId, String databaseId, String apiToken, String localPath, int timeoutSeconds) {}
    public record Storage(String mode, String localRoot) {}
    public record Drive(String rootFolderId, String serviceAccountJson, String serviceAccountFile, String applicationName) {}
    public record Mail(boolean devMode, String devOutbox, String fromName, String fromAddress,
                       String brevoApiKey, long dailyBatchPauseMs) {}
    public record Otp(int ttlMinutes, int maxAttempts, int resendCooldownSeconds, int maxPerHour, int blockMinutes) {}
    public record Chat(String encryptionKey, int keyVersion, String oldKeys, int retentionDays, int maxLength) {}
    public record Files(int expiryDays, int warningDays, String conversionDir, String officeBinary, int conversionTimeoutSeconds) {}
    public record Admin(String email, String initialPassword) {}
}
