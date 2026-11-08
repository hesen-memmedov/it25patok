package az.it25patok.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import az.it25patok.user.UserDto;

public final class AuthDtos {
    private AuthDtos() {}

    public record LoginRequest(
            @NotBlank(message = "İstifadəçi adı və ya e-poçt tələb olunur") @Size(max = 254) String identifier,
            @NotBlank(message = "Parol tələb olunur") String password,
            boolean rememberDevice
    ) {}

    public record VerifyOtpRequest(
            @NotBlank(message = "Challenge ID tələb olunur") String challengeId,
            @NotBlank(message = "Kod tələb olunur") @Size(min = 6, max = 6, message = "Kod 6 rəqəm olmalıdır") String code,
            boolean rememberDevice
    ) {}

    public record ResendOtpRequest(@NotBlank(message = "Challenge ID tələb olunur") String challengeId) {}

    public record AuthResponse(
            boolean otpRequired,
            String challengeId,
            String maskedEmail,
            String accessToken,
            UserDto user,
            boolean rememberDeviceAllowed,
            String flow,
            String setupToken
    ) {}

    public record AccessResponse(String accessToken, UserDto user) {}

    public record FirstPasswordChangeRequest(
            @NotBlank @Size(min = 8, max = 72) String newPassword
    ) {}

    public record RegisterEmailRequest(
            @NotBlank @Size(max = 254) @Email(message = "E-poçt formatı yanlışdır") String email
    ) {}
}
