package az.it25patok.auth;

import az.it25patok.common.ApiResponse;
import az.it25patok.common.Text;
import az.it25patok.config.AppProperties;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseCookie;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    public static final String REFRESH_COOKIE = "it25_refresh";
    public static final String DEVICE_COOKIE = "it25_device";

    private final AuthService authService;
    private final AppProperties props;

    public AuthController(AuthService authService, AppProperties props) {
        this.authService = authService;
        this.props = props;
    }

    @PostMapping("/login")
    public ApiResponse<AuthDtos.AuthResponse> login(@Valid @RequestBody AuthDtos.LoginRequest request,
                                                     @CookieValue(name = DEVICE_COOKIE, required = false) String device,
                                                     HttpServletRequest http,
                                                     HttpServletResponse response) {
        AuthService.LoginResult result = authService.login(request, device, deviceInfo(http));
        if (result.refreshToken() != null) {
            writeRefreshCookie(response, result.refreshToken());
        }
        if (result.deviceToken() != null) {
            writeDeviceCookie(response, result.deviceToken());
        }
        return ApiResponse.ok(new AuthDtos.AuthResponse(result.otpRequired(), result.challengeId(),
                result.maskedEmail(), result.accessToken(), result.user(), result.rememberDeviceAllowed(),
                result.flow(), result.setupToken()));
    }

    @PostMapping("/verify-otp")
    public ApiResponse<AuthDtos.AuthResponse> verify(@Valid @RequestBody AuthDtos.VerifyOtpRequest request,
                                                      HttpServletRequest http,
                                                      HttpServletResponse response) {
        AuthService.LoginResult result = authService.verifyOtp(request.challengeId(), request.code(),
                request.rememberDevice(), deviceInfo(http));
        writeRefreshCookie(response, result.refreshToken());
        if (result.deviceToken() != null) writeDeviceCookie(response, result.deviceToken());
        return ApiResponse.ok(new AuthDtos.AuthResponse(false, null, null, result.accessToken(),
                result.user(), true, "otp", null));
    }

    @PostMapping("/first-password-change")
    public ApiResponse<Map<String, Object>> firstPasswordChange(@Valid @RequestBody AuthDtos.FirstPasswordChangeRequest request,
                                                                 HttpServletRequest http) {
        AuthService.FlowResult result = authService.firstPasswordChange(bearer(http), request.newPassword());
        Map<String, Object> body = new java.util.HashMap<>();
        body.put("flow", result.flow());
        if (result.setupToken() != null) body.put("setupToken", result.setupToken());
        return ApiResponse.ok(body);
    }

    @PostMapping("/register-email")
    public ApiResponse<Map<String, Object>> registerEmail(@Valid @RequestBody AuthDtos.RegisterEmailRequest request,
                                                            HttpServletRequest http) {
        AuthService.FlowResult result = authService.registerEmail(bearer(http), request.email());
        return ApiResponse.ok(Map.of("flow", result.flow(),
                "challengeId", result.challengeId() == null ? "" : result.challengeId(),
                "maskedEmail", result.maskedEmail() == null ? "" : result.maskedEmail()));
    }

    @PostMapping("/resend-otp")
    public ApiResponse<Map<String, String>> resend(@Valid @RequestBody AuthDtos.ResendOtpRequest request) {
        String newId = authService.resend(request.challengeId());
        return ApiResponse.ok(Map.of("challengeId", newId));
    }

    @PostMapping("/refresh")
    public ApiResponse<AuthDtos.AccessResponse> refresh(
            @CookieValue(name = REFRESH_COOKIE, required = false) String refresh,
            HttpServletRequest http, HttpServletResponse response) {
        AuthService.AccessResult result = authService.refresh(refresh, deviceInfo(http));
        writeRefreshCookie(response, result.newRefreshToken());
        return ApiResponse.ok(new AuthDtos.AccessResponse(result.accessToken(), result.user()));
    }

    @PostMapping("/logout")
    public ApiResponse<Void> logout(@CookieValue(name = REFRESH_COOKIE, required = false) String refresh,
                                    HttpServletResponse response) {
        authService.logout(refresh);
        clearCookie(response, REFRESH_COOKIE);
        return ApiResponse.ok();
    }

    private void writeRefreshCookie(HttpServletResponse response, String token) {
        response.addHeader("Set-Cookie", cookie(REFRESH_COOKIE, token,
                Duration.ofDays(props.jwt().refreshTtlDays())).toString());
    }

    private void writeDeviceCookie(HttpServletResponse response, String token) {
        response.addHeader("Set-Cookie", cookie(DEVICE_COOKIE, token, Duration.ofDays(30)).toString());
    }

    private ResponseCookie cookie(String name, String value, Duration maxAge) {
        return ResponseCookie.from(name, value)
                .httpOnly(true)
                .secure(props.cors().cookieSecure())
                .sameSite(props.cors().cookieSameSite())
                .path("/api/v1/auth")
                .maxAge(maxAge)
                .build();
    }

    private void clearCookie(HttpServletResponse response, String name) {
        response.addHeader("Set-Cookie", ResponseCookie.from(name, "")
                .httpOnly(true)
                .secure(props.cors().cookieSecure())
                .sameSite(props.cors().cookieSameSite())
                .path("/api/v1/auth")
                .maxAge(Duration.ZERO)
                .build().toString());
    }

    private static String deviceInfo(HttpServletRequest request) {
        String ua = request.getHeader("User-Agent");
        return Text.clean(ua, 250);
    }

    /** Read the Bearer token from the Authorization header (for bounded setup tokens). */
    private static String bearer(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header == null) return null;
        String trimmed = header.trim();
        if (trimmed.regionMatches(true, 0, "Bearer ", 0, 7)) {
            return trimmed.substring(7).trim();
        }
        return null;
    }
}
