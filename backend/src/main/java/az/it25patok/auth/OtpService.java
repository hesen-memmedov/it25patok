package az.it25patok.auth;

import az.it25patok.common.ApiException;
import az.it25patok.common.CryptoService;
import az.it25patok.common.Ids;
import az.it25patok.common.Time;
import az.it25patok.config.AppProperties;
import az.it25patok.notification.MailService;
import az.it25patok.user.User;
import az.it25patok.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;

@Service
public class OtpService {
    private static final SecureRandom RANDOM = new SecureRandom();
    private final OtpRepository otpRepository;
    private final UserRepository userRepository;
    private final MailService mailService;
    private final AppProperties props;
    private final BCryptPasswordEncoder otpEncoder = new BCryptPasswordEncoder(10);

    public OtpService(OtpRepository otpRepository, UserRepository userRepository,
                      MailService mailService, AppProperties props) {
        this.otpRepository = otpRepository;
        this.userRepository = userRepository;
        this.mailService = mailService;
        this.props = props;
    }

    public String createLoginChallenge(User user) {
        return create(user, "LOGIN", null);
    }

    public String createEmailChangeChallenge(User user, String newEmail) {
        return create(user, "EMAIL_CHANGE", newEmail);
    }

    public String resend(String challengeId) {
        OtpRepository.Otp otp = otpRepository.findById(challengeId);
        if (otp == null || otp.usedAt() != null || otp.expiresAt() < Time.now()) {
            throw ApiException.badRequest("OTP_EXPIRED", "Kodun müddəti bitib. Yenidən daxil olun.");
        }
        User user = userRepository.findActiveById(otp.userId());
        if (user == null) throw ApiException.unauthorized("İstifadəçi tapılmadı.");
        checkRate(user);
        Long last = otpRepository.lastCreatedAt(user.id(), otp.purpose());
        if (last != null) {
            long wait = props.otp().resendCooldownSeconds() - (Time.now() - last) / 1000;
            if (wait > 0) {
                throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "OTP_COOLDOWN",
                        "Yeni kod üçün " + wait + " saniyə gözləyin.");
            }
        }
        return create(user, otp.purpose(), otp.target());
    }

    private String create(User user, String purpose, String target) {
        if (user.otpLockedUntil() != null && user.otpLockedUntil() > Time.now()) {
            long minutes = Math.max(1, (user.otpLockedUntil() - Time.now()) / 60000 + 1);
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "OTP_BLOCKED",
                    "Çox sayda yanlış cəhd. " + minutes + " dəqiqə sonra yenidən cəhd edin.");
        }
        checkRate(user);
        otpRepository.invalidateUnused(user.id(), purpose);
        String code = String.format("%06d", RANDOM.nextInt(1_000_000));
        long expires = Time.now() + props.otp().ttlMinutes() * 60_000L;
        OtpRepository.Otp otp = otpRepository.insert(user.id(), otpEncoder.encode(code), purpose, target, expires);
        try {
            mailService.sendOtp(user, code, purpose,
                    "EMAIL_CHANGE".equals(purpose) && target != null ? target : user.email());
        } catch (MailService.MailSendException e) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "OTP_SEND_FAILED",
                    "Təsdiq kodu göndərilə bilmədi. Bir az sonra yenidən cəhd edin.");
        }
        return otp.id();
    }

    private void checkRate(User user) {
        int count = otpRepository.countSince(user.id(), "LOGIN", Time.now() - 3_600_000L);
        int emailCount = otpRepository.countSince(user.id(), "EMAIL_CHANGE", Time.now() - 3_600_000L);
        if (count + emailCount >= props.otp().maxPerHour() + 5) {
            throw ApiException.tooManyRequests("Saatlıq OTP limiti aşıldı. Bir az sonra yenidən cəhd edin.");
        }
    }

    public User verifyLogin(String challengeId, String code) {
        OtpRepository.Otp otp = verify(challengeId, code, "LOGIN");
        User user = userRepository.findActiveById(otp.userId());
        if (user == null) throw ApiException.unauthorized("İstifadəçi tapılmadı.");
        return user;
    }

    public EmailChange verifyEmailChange(String challengeId, String code) {
        OtpRepository.Otp otp = verify(challengeId, code, "EMAIL_CHANGE");
        User user = userRepository.findActiveById(otp.userId());
        if (user == null) throw ApiException.unauthorized("İstifadəçi tapılmadı.");
        return new EmailChange(user, otp.target());
    }

    private OtpRepository.Otp verify(String challengeId, String code, String purpose) {
        OtpRepository.Otp otp = otpRepository.findById(challengeId);
        if (otp == null || !purpose.equals(otp.purpose()) || otp.usedAt() != null || otp.expiresAt() < Time.now()) {
            throw ApiException.badRequest("OTP_EXPIRED", "Kod etibarsızdır və ya müddəti bitib.");
        }
        User user = userRepository.findActiveById(otp.userId());
        if (user == null) throw ApiException.unauthorized("İstifadəçi tapılmadı.");
        if (user.otpLockedUntil() != null && user.otpLockedUntil() > Time.now()) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "OTP_BLOCKED",
                    "Çox sayda yanlış cəhd. Bir az sonra yenidən cəhd edin.");
        }
        if (otp.attempts() >= props.otp().maxAttempts()) {
            otpRepository.markUsed(otp.id());
            throw ApiException.badRequest("OTP_EXPIRED", "Kod bloklanıb. Yeni kod tələb edin.");
        }
        if (!otpEncoder.matches(code, otp.codeHash())) {
            int attempts = otpRepository.incrementAttempts(otp.id());
            if (attempts >= props.otp().maxAttempts()) {
                otpRepository.markUsed(otp.id());
                userRepository.setOtpLockedUntil(user.id(), Time.now() + props.otp().blockMinutes() * 60_000L);
                throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "OTP_BLOCKED",
                        "Çox sayda yanlış cəhd. " + props.otp().blockMinutes() + " dəqiqə gözləyin.");
            }
            throw ApiException.badRequest("OTP_INVALID",
                    "Kod yanlışdır. Qalan cəhd: " + (props.otp().maxAttempts() - attempts));
        }
        otpRepository.markUsed(otp.id());
        userRepository.setOtpLockedUntil(user.id(), null);
        return otp;
    }

    public record EmailChange(User user, String newEmail) {}

    public static String randomToken() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    public static String hashToken(String token) {
        return CryptoService.sha256Hex(token);
    }
}
