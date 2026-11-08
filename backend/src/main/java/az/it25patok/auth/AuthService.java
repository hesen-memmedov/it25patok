package az.it25patok.auth;

import az.it25patok.common.ApiException;
import az.it25patok.common.AuditService;
import az.it25patok.common.CryptoService;
import az.it25patok.common.RateLimiterService;
import az.it25patok.common.SettingsService;
import az.it25patok.common.Text;
import az.it25patok.common.Time;
import az.it25patok.config.AppProperties;
import az.it25patok.group.GroupRepository;
import az.it25patok.user.User;
import az.it25patok.user.UserDto;
import az.it25patok.user.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Map;

@Service
public class AuthService {
    private static final String DUMMY_HASH = "$2a$12$Q9Zx5fZ8vQ4o1e6J0l5oQ.7uW7gR8m3zM9rF1sQ8mF3G9g9b9V0a";

    private final UserRepository users;
    private final GroupRepository groups;
    private final OtpService otpService;
    private final TokenRepository tokens;
    private final JwtService jwt;
    private final PasswordEncoder passwordEncoder;
    private final AppProperties props;
    private final SettingsService settings;
    private final RateLimiterService rateLimiter;
    private final AuditService audit;

    public AuthService(UserRepository users, GroupRepository groups, OtpService otpService,
                       TokenRepository tokens, JwtService jwt, PasswordEncoder passwordEncoder,
                       AppProperties props, SettingsService settings, RateLimiterService rateLimiter,
                       AuditService audit) {
        this.users = users;
        this.groups = groups;
        this.otpService = otpService;
        this.tokens = tokens;
        this.jwt = jwt;
        this.passwordEncoder = passwordEncoder;
        this.props = props;
        this.settings = settings;
        this.rateLimiter = rateLimiter;
        this.audit = audit;
    }

    public record LoginResult(boolean otpRequired, String challengeId, String maskedEmail,
                              String accessToken, UserDto user, String refreshToken,
                              String deviceToken, boolean rememberDeviceAllowed,
                              String flow, String setupToken) {
        public static LoginResult otp(String challengeId, String maskedEmail, boolean rememberDeviceAllowed) {
            return new LoginResult(true, challengeId, maskedEmail, null, null, null, null,
                    rememberDeviceAllowed, "otp", null);
        }

        public static LoginResult passwordChange(String setupToken) {
            return new LoginResult(false, null, null, null, null, null, null, false,
                    "password-change", setupToken);
        }

        public static LoginResult emailSetup(String setupToken) {
            return new LoginResult(false, null, null, null, null, null, null, false,
                    "email-setup", setupToken);
        }

        public static LoginResult loggedIn(String accessToken, UserDto user, String refreshToken,
                                           String deviceToken, boolean rememberDeviceAllowed) {
            return new LoginResult(false, null, null, accessToken, user, refreshToken, deviceToken,
                    rememberDeviceAllowed, "otp", null);
        }
    }

    public LoginResult login(AuthDtos.LoginRequest request, String deviceCookie, String deviceInfo) {
        String identifier = request.identifier() == null ? "" : request.identifier().trim();
        String ip = audit.clientIp();
        rateLimiter.check("login:ip:" + ip, 20, Duration.ofMinutes(1));
        rateLimiter.check("login:identifier:" + identifier.toLowerCase(java.util.Locale.ROOT), 10, Duration.ofMinutes(1));

        User user = users.findByIdentifier(identifier);
        if (user == null) {
            passwordEncoder.matches(request.password(), DUMMY_HASH);
            audit.log(null, "LOGIN_FAILED", "USER", null, Map.of("identifier", identifier));
            throw ApiException.unauthorized("İstifadəçi adı, e-poçt və ya parol yanlışdır.");
        }
        if (!user.active() || user.deletedAt() != null) {
            audit.log(user.id(), "LOGIN_FAILED", "USER", user.id(), Map.of("reason", "inactive"));
            throw ApiException.unauthorized("E-poçt və ya parol yanlışdır.");
        }
        if (user.lockedUntil() != null && user.lockedUntil() > Time.now()) {
            long minutes = Math.max(1, (user.lockedUntil() - Time.now()) / 60000 + 1);
            throw new ApiException(org.springframework.http.HttpStatus.TOO_MANY_REQUESTS, "ACCOUNT_LOCKED",
                    "Hesab müvəqqəti bloklanıb. " + minutes + " dəqiqə sonra yenidən cəhd edin.");
        }
        if (!passwordEncoder.matches(request.password(), user.passwordHash())) {
            int failed = user.failedLoginCount() + 1;
            Long lock = failed >= 5 ? Time.now() + 15 * 60_000L : null;
            users.loginFailed(user.id(), failed, lock);
            audit.log(user.id(), "LOGIN_FAILED", "USER", user.id(), Map.of("attempt", failed));
            if (lock != null) {
                throw new ApiException(org.springframework.http.HttpStatus.TOO_MANY_REQUESTS, "ACCOUNT_LOCKED",
                        "5 yanlış cəhddən sonra hesab 15 dəqiqə bloklandı.");
            }
            throw ApiException.unauthorized("E-poçt və ya parol yanlışdır.");
        }

        users.loginFailed(user.id(), 0, null);
        boolean rememberAllowed = settings.bool("remember_device_enabled", true);

        // 1) Hesab yaradılıb, amma parol hələ dəyişdirilməyib — əvvəlcə parol dəyişdirilməlidir
        if (user.mustChangePassword()) {
            AuthUser authUser = new AuthUser(user.id(), user.email(), user.role().name());
            String setupToken = jwt.createSetupToken(authUser, "password-change", Duration.ofMinutes(15));
            audit.log(user.id(), "PASSWORD_CHANGE_REQUIRED", "USER", user.id(), Map.of());
            return LoginResult.passwordChange(setupToken);
        }

        // 2) Parol dəyişdirilib, amma yer tutucu e-poçt qalır — əvvəlcə e-poçt qeydiyyatı
        if (user.email() != null && user.email().endsWith("@no-mail.it25patok.az")) {
            AuthUser authUser = new AuthUser(user.id(), user.email(), user.role().name());
            String setupToken = jwt.createSetupToken(authUser, "email-setup", Duration.ofMinutes(15));
            audit.log(user.id(), "EMAIL_SETUP_REQUIRED", "USER", user.id(), Map.of());
            return LoginResult.emailSetup(setupToken);
        }

        // 3) Normal axın
        if (rememberAllowed && deviceCookie != null && !deviceCookie.isBlank()) {
            TokenRepository.StoredToken device = tokens.findTrustedByHash(
                    OtpService.hashToken(deviceCookie));
            if (device != null && device.userId().equals(user.id()) && device.revokedAt() == null
                    && device.expiresAt() > Time.now()) {
                users.loginSucceeded(user.id());
                Issue issue = issueTokens(user, deviceInfo);
                audit.log(user.id(), "LOGIN_SUCCESS", "USER", user.id(), Map.of("method", "trusted_device"));
                return LoginResult.loggedIn(issue.accessToken, dto(user),
                        issue.refreshToken, null, true);
            }
        }

        String challengeId = otpService.createLoginChallenge(user);
        audit.log(user.id(), "OTP_SENT", "USER", user.id(), Map.of("purpose", "LOGIN"));
        return LoginResult.otp(challengeId, Text.maskEmail(user.email()), rememberAllowed);
    }

    public LoginResult verifyOtp(String challengeId, String code, boolean rememberDevice,
                                 String deviceInfo) {
        rateLimiter.check("otp:ip:" + audit.clientIp(), 30, Duration.ofMinutes(1));
        rateLimiter.check("otp:challenge:" + challengeId, 10, Duration.ofMinutes(1));
        User user = otpService.verifyLogin(challengeId, code);
        users.loginSucceeded(user.id());
        Issue issue = issueTokens(user, deviceInfo);
        String deviceToken = null;
        if (rememberDevice && settings.bool("remember_device_enabled", true)) {
            deviceToken = OtpService.randomToken();
            tokens.insertTrustedDevice(user.id(), OtpService.hashToken(deviceToken), deviceInfo,
                    Time.now() + 30L * 24 * 60 * 60 * 1000);
            audit.log(user.id(), "TRUSTED_DEVICE_ADDED", "USER", user.id(), Map.of());
        }
        audit.log(user.id(), "LOGIN_SUCCESS", "USER", user.id(), Map.of("method", "otp"));
        return LoginResult.loggedIn(issue.accessToken, dto(user),
                issue.refreshToken, deviceToken, true);
    }

    public String resend(String challengeId) {
        rateLimiter.check("otp:resend:ip:" + audit.clientIp(), 10, Duration.ofMinutes(1));
        String newId = otpService.resend(challengeId);
        audit.log("OTP_RESENT", "OTP", newId, Map.of());
        return newId;
    }

    public AccessResult refresh(String refreshCookie, String deviceInfo) {
        rateLimiter.check("refresh:ip:" + audit.clientIp(), 60, Duration.ofMinutes(1));
        if (refreshCookie == null || refreshCookie.isBlank()) {
            throw ApiException.unauthorized("Yeniləmə tokeni yoxdur.");
        }
        TokenRepository.StoredToken token = tokens.findRefreshByHash(OtpService.hashToken(refreshCookie));
        if (token == null) throw ApiException.unauthorized("Yeniləmə tokeni etibarsızdır.");
        if (token.revokedAt() != null) {
            tokens.revokeAllRefresh(token.userId());
            throw ApiException.unauthorized("Token təkrar istifadə olunub. Yenidən daxil olun.");
        }
        if (token.expiresAt() < Time.now()) {
            throw ApiException.unauthorized("Yeniləmə tokeninin müddəti bitib.");
        }
        User user = users.findActiveById(token.userId());
        if (user == null) throw ApiException.unauthorized("İstifadəçi aktiv deyil.");
        tokens.revokeRefresh(token.id());
        Issue issue = issueTokens(user, deviceInfo);
        return new AccessResult(issue.accessToken, issue.refreshToken, dto(user));
    }

    public record AccessResult(String accessToken, String newRefreshToken, UserDto user) {}

    public void logout(String refreshCookie) {
        if (refreshCookie != null && !refreshCookie.isBlank()) {
            TokenRepository.StoredToken token = tokens.findRefreshByHash(OtpService.hashToken(refreshCookie));
            if (token != null) {
                tokens.revokeRefresh(token.id());
                audit.log(token.userId(), "LOGOUT", "USER", token.userId(), Map.of());
            }
        }
    }

    public UserDto dto(User user) {
        String groupCode = user.groupId() == null ? null :
                (groups.findById(user.groupId()) == null ? null : groups.findById(user.groupId()).code());
        return UserDto.from(user, groupCode);
    }

    private Issue issueTokens(User user, String deviceInfo) {
        AuthUser auth = new AuthUser(user.id(), user.email(), user.role().name());
        String access = jwt.createAccessToken(auth);
        String refresh = OtpService.randomToken();
        tokens.insertRefresh(user.id(), OtpService.hashToken(refresh), deviceInfo,
                Time.now() + props.jwt().refreshTtlDays() * 24 * 60 * 60 * 1000);
        return new Issue(access, refresh);
    }

    private record Issue(String accessToken, String refreshToken) {}

    public static String hash(String value) {
        return CryptoService.sha256Hex(value);
    }

    /** Eyni qayda: admin yaradarkən istifadə etdiyiniz paroldur — 8+ hərflərlə + rəqəmlərlə. */
    private static String validatePassword(String value) {
        String password = value == null ? "" : value;
        if (password.length() < 8 || password.length() > 72
                || !password.matches(".*[A-Za-zƏəÖöÜüÇçĞğŞşİı].*")
                || !password.matches(".*\\d.*")) {
            throw ApiException.badRequest("WEAK_PASSWORD",
                    "Parol 8–72 simvol olmalı, ən azı bir hərf və bir rəqəm ehtiva etməlidir.");
        }
        return password;
    }

    // ------------------------------------------------------------------ onboarding

    public record FlowResult(String flow, String setupToken, String challengeId, String maskedEmail) {}

    /** İlk giriş — parol mütləq dəyişdirilməlidir. */
    public FlowResult firstPasswordChange(String setupToken, String newPassword) {
        if (setupToken == null || setupToken.isBlank()) {
            throw ApiException.unauthorized("Sessiya tapılmadı. Yenidən daxil olun.");
        }
        AuthUser auth = jwt.parseSetupToken(setupToken, "password-change");
        User user = users.findActiveById(auth.id());
        if (user == null) {
            throw ApiException.unauthorized("İstifadəçi aktiv deyil.");
        }
        if (!user.mustChangePassword()) {
            throw ApiException.badRequest("ALREADY_CHANGED", "Parol artıq dəyişdirilib.");
        }
        String validated = validatePassword(newPassword);
        users.updatePassword(user.id(), passwordEncoder.encode(validated));
        users.loginFailed(user.id(), 0, null);
        audit.log(user.id(), "PASSWORD_CHANGED_FIRST", "USER", user.id(), Map.of());
        // E-poçt hələ yer tutucudursa → e-poçt qeydiyyatı mərhələsinə keç;
        // həqiqi e-poçt artıq mövcuddursa (məs. admin sıfırlaması) → girişə qayıt.
        if (user.email() == null || user.email().endsWith("@no-mail.it25patok.az")) {
            String nextToken = jwt.createSetupToken(
                    new AuthUser(user.id(), user.email(), user.role().name()),
                    "email-setup", Duration.ofMinutes(15));
            return new FlowResult("email-setup", nextToken, null, null);
        }
        return new FlowResult("done", null, null, null);
    }

    /** Parol dəyişdirilib — istifadəçi indi öz e-poçtunu qeydiyyatdan keçirir. */
    public FlowResult registerEmail(String setupToken, String email) {
        if (setupToken == null || setupToken.isBlank()) {
            throw ApiException.unauthorized("Sessiya tapılmadı. Yenidən daxil olun.");
        }
        AuthUser auth = jwt.parseSetupToken(setupToken, "email-setup");
        User user = users.findActiveById(auth.id());
        if (user == null) {
            throw ApiException.unauthorized("İstifadəçi aktiv deyil.");
        }
        if (user.email() == null || !user.email().endsWith("@no-mail.it25patok.az")) {
            throw ApiException.badRequest("ALREADY_DONE", "E-poçt artıq qeyd olunub.");
        }
        String normalized = email == null ? "" : email.trim().toLowerCase(java.util.Locale.ROOT);
        if (users.emailExists(normalized, user.id())) {
            throw ApiException.conflict("EMAIL_EXISTS", "Bu e-poçt artıq başqa hesabda mövcuddur.");
        }
        users.updateEmail(user.id(), normalized);
        User refreshed = users.findActiveById(user.id());
        if (refreshed == null) throw ApiException.unauthorized("İstifadəçi aktiv deyil.");
        // İstifadəçinin yeni e-poçtuna OTP göndər → hesab tam aktivləşir
        String challengeId = otpService.createLoginChallenge(refreshed);
        audit.log(user.id(), "EMAIL_REGISTERED", "USER", user.id(),
                Map.of("email", Text.maskEmail(normalized)));
        audit.log(user.id(), "OTP_SENT", "USER", user.id(), Map.of("purpose", "LOGIN"));
        return new FlowResult("otp", null, challengeId, Text.maskEmail(normalized));
    }
}
