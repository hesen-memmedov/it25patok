package az.it25patok.me;

import az.it25patok.user.UserDto;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class MeDtos {
    private MeDtos() {}

    public record ProfileResponse(UserDto user, boolean emailChangeEnabled, boolean notificationToggleEnabled) {}

    public record UpdateProfileRequest(
            @Size(max = 2000, message = "Bio 2000 simvoldan çox ola bilməz") String bio,
            String theme,
            Boolean notificationEnabled,
            String firstName,
            String lastName,
            String phone
    ) {}

    public record ChangePasswordRequest(
            @NotBlank(message = "Cari parol tələb olunur") String currentPassword,
            @NotBlank(message = "Yeni parol tələb olunur")
            @Size(min = 8, max = 72, message = "Parol 8–72 simvol olmalıdır") String newPassword
    ) {}

    public record EmailChangeRequest(
            @NotBlank(message = "Yeni e-poçt tələb olunur")
            @Email(message = "E-poçt formatı yanlışdır") @Size(max = 160) String newEmail
    ) {}

    public record EmailChangeResponse(String challengeId, String maskedEmail) {}

    public record ConfirmEmailRequest(
            @NotBlank(message = "Challenge ID tələb olunur") String challengeId,
            @NotBlank(message = "Kod tələb olunur")
            @Size(min = 6, max = 6, message = "Kod 6 rəqəm olmalıdır") String code
    ) {}
}
