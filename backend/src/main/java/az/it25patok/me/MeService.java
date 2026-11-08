package az.it25patok.me;

import az.it25patok.auth.AuthUser;
import az.it25patok.auth.CurrentUser;
import az.it25patok.auth.OtpService;
import az.it25patok.auth.TokenRepository;
import az.it25patok.common.ApiException;
import az.it25patok.common.AuditService;
import az.it25patok.common.SettingsService;
import az.it25patok.common.Text;
import az.it25patok.file.FileService;
import az.it25patok.file.StoredFile;
import az.it25patok.group.Group;
import az.it25patok.group.GroupRepository;
import az.it25patok.user.User;
import az.it25patok.user.UserDto;
import az.it25patok.user.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class MeService {
    private static final long AVATAR_MAX_BYTES = 5L * 1024 * 1024;
    private static final Set<String> AVATAR_TYPES = Set.of(
            "image/jpeg", "image/png", "image/webp", "image/gif");
    private static final Set<String> THEMES = Set.of("light", "dark", "system");

    private final UserRepository users;
    private final GroupRepository groups;
    private final OtpService otp;
    private final TokenRepository tokens;
    private final PasswordEncoder passwordEncoder;
    private final CurrentUser currentUser;
    private final SettingsService settings;
    private final AuditService audit;
    private final FileService files;

    public MeService(UserRepository users, GroupRepository groups, OtpService otp,
                     TokenRepository tokens, PasswordEncoder passwordEncoder, CurrentUser currentUser,
                     SettingsService settings, AuditService audit, FileService files) {
        this.users = users;
        this.groups = groups;
        this.otp = otp;
        this.tokens = tokens;
        this.passwordEncoder = passwordEncoder;
        this.currentUser = currentUser;
        this.settings = settings;
        this.audit = audit;
        this.files = files;
    }

    public MeDtos.ProfileResponse profile() {
        return response(requireUser());
    }

    public MeDtos.ProfileResponse updateProfile(MeDtos.UpdateProfileRequest request) {
        User user = requireUser();
        if (request.firstName() != null || request.lastName() != null || request.phone() != null) {
            throw ApiException.badRequest("IMMUTABLE_FIELD",
                    "Ad, soyad və telefon nömrəsi yalnız admin tərəfindən dəyişdirilə bilər.");
        }
        String theme = request.theme() == null ? user.theme()
                : request.theme().trim().toLowerCase(Locale.ROOT);
        if (!THEMES.contains(theme)) {
            throw ApiException.badRequest("INVALID_THEME", "Tema light, dark və ya system olmalıdır.");
        }
        boolean notifications = request.notificationEnabled() == null
                ? user.notificationEnabled() : request.notificationEnabled();
        if (notifications != user.notificationEnabled()
                && !settings.bool("self_notification_toggle_enabled", true)) {
            throw ApiException.forbidden("NOTIFICATION_LOCKED",
                    "Bildiriş ayarlarını dəyişmək admin tərəfindən söndürülüb.");
        }
        String bio = request.bio() == null ? user.bio() : Text.clean(request.bio(), 2000);
        users.updateProfile(user.id(), bio, theme, notifications);
        audit.log("PROFILE_UPDATED", "USER", user.id(),
                Map.of("theme", theme, "notifications", notifications));
        return response(requireUser());
    }

    public void changePassword(MeDtos.ChangePasswordRequest request) {
        User user = requireUser();
        if (!passwordEncoder.matches(request.currentPassword(), user.passwordHash())) {
            throw ApiException.badRequest("WRONG_PASSWORD", "Cari parol yanlışdır.");
        }
        String newPassword = request.newPassword();
        if (!newPassword.matches(".*[A-Za-zƏəÖöÜüÇçĞğŞşİı].*") || !newPassword.matches(".*\\d.*")) {
            throw ApiException.badRequest("WEAK_PASSWORD",
                    "Yeni parol ən azı bir hərf və bir rəqəm ehtiva etməlidir.");
        }
        if (passwordEncoder.matches(newPassword, user.passwordHash())) {
            throw ApiException.badRequest("SAME_PASSWORD", "Yeni parol cari paroldan fərqli olmalıdır.");
        }
        users.updatePassword(user.id(), passwordEncoder.encode(newPassword));
        tokens.revokeAllRefresh(user.id());
        tokens.revokeAllTrustedDevices(user.id());
        audit.log("PASSWORD_CHANGED", "USER", user.id(), Map.of());
    }

    public MeDtos.ProfileResponse uploadAvatar(MultipartFile file) {
        User user = requireUser();
        if (file == null || file.isEmpty()) {
            throw ApiException.badRequest("EMPTY_FILE", "Profil şəkli seçilməyib.");
        }
        if (file.getSize() > AVATAR_MAX_BYTES) {
            throw ApiException.badRequest("FILE_TOO_LARGE", "Profil şəkli 5 MB-dan böyük ola bilməz.");
        }
        String contentType = file.getContentType() == null ? ""
                : file.getContentType().toLowerCase(Locale.ROOT);
        if (!contentType.startsWith("image/")) {
            throw ApiException.badRequest("INVALID_IMAGE", "Yalnız şəkil faylı yükləyə bilərsiniz.");
        }
        AuthUser auth = currentUser.require();
        StoredFile uploaded = files.upload(file, user.id(), "AVATAR", null, null, List.of("avatars"));
        if (!AVATAR_TYPES.contains(uploaded.mimeType())) {
            files.delete(uploaded.id(), auth);
            throw ApiException.badRequest("INVALID_IMAGE",
                    "Yalnız JPEG, PNG, WebP və GIF formatları dəstəklənir.");
        }
        String oldAvatar = user.avatarFileId();
        users.updateAvatar(user.id(), uploaded.id());
        if (oldAvatar != null && !oldAvatar.equals(uploaded.id())) {
            deleteQuietly(oldAvatar, auth);
        }
        audit.log("AVATAR_UPDATED", "USER", user.id(), Map.of("fileId", uploaded.id()));
        return response(requireUser());
    }

    public MeDtos.ProfileResponse removeAvatar() {
        User user = requireUser();
        AuthUser auth = currentUser.require();
        String oldAvatar = user.avatarFileId();
        users.updateAvatar(user.id(), null);
        if (oldAvatar != null) deleteQuietly(oldAvatar, auth);
        audit.log("AVATAR_REMOVED", "USER", user.id(), Map.of());
        return response(requireUser());
    }

    public MeDtos.EmailChangeResponse requestEmailChange(MeDtos.EmailChangeRequest request) {
        User user = requireUser();
        if (!settings.bool("email_change_enabled", true)) {
            throw ApiException.forbidden("EMAIL_CHANGE_DISABLED",
                    "E-poçt dəyişikliyi admin tərəfindən söndürülüb.");
        }
        String newEmail = Text.email(request.newEmail());
        if (newEmail.equalsIgnoreCase(user.email())) {
            throw ApiException.badRequest("SAME_EMAIL", "Yeni e-poçt cari e-poçtla eynidir.");
        }
        if (users.emailExists(newEmail, user.id())) {
            throw ApiException.conflict("EMAIL_EXISTS", "Bu e-poçt başqa istifadəçiyə aiddir.");
        }
        String challengeId = otp.createEmailChangeChallenge(user, newEmail);
        audit.log("EMAIL_CHANGE_REQUESTED", "USER", user.id(),
                Map.of("newEmail", Text.maskEmail(newEmail)));
        return new MeDtos.EmailChangeResponse(challengeId, Text.maskEmail(newEmail));
    }

    public MeDtos.ProfileResponse confirmEmailChange(MeDtos.ConfirmEmailRequest request) {
        User current = requireUser();
        OtpService.EmailChange change = otp.verifyEmailChange(request.challengeId(), request.code());
        if (!change.user().id().equals(current.id())) {
            throw ApiException.forbidden("INVALID_CHALLENGE", "Bu kod başqa istifadəçiyə aiddir.");
        }
        String newEmail = Text.email(change.newEmail());
        if (Text.isBlank(newEmail) || users.emailExists(newEmail, current.id())) {
            throw ApiException.conflict("EMAIL_EXISTS", "Bu e-poçt artıq istifadə olunur.");
        }
        users.updateEmail(current.id(), newEmail);
        tokens.revokeAllRefresh(current.id());
        tokens.revokeAllTrustedDevices(current.id());
        audit.log("EMAIL_CHANGED", "USER", current.id(),
                Map.of("from", Text.maskEmail(current.email()), "to", Text.maskEmail(newEmail)));
        return response(requireUser());
    }

    private void deleteQuietly(String fileId, AuthUser auth) {
        try {
            StoredFile file = files.requireActive(fileId);
            files.delete(file.id(), auth);
        } catch (RuntimeException ignored) {
            // Köhnə avatar artıq silinibsə və ya yoxdursa, davam edirik.
        }
    }

    private User requireUser() {
        User user = users.findActiveById(currentUser.require().id());
        if (user == null) throw ApiException.unauthorized("İstifadəçi aktiv deyil.");
        return user;
    }

    private MeDtos.ProfileResponse response(User user) {
        String groupCode = null;
        if (user.groupId() != null) {
            Group group = groups.findById(user.groupId());
            groupCode = group == null ? null : group.code();
        }
        return new MeDtos.ProfileResponse(UserDto.from(user, groupCode),
                settings.bool("email_change_enabled", true),
                settings.bool("self_notification_toggle_enabled", true));
    }
}
