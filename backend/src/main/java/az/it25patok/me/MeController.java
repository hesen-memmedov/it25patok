package az.it25patok.me;

import az.it25patok.common.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/me")
public class MeController {
    private final MeService me;

    public MeController(MeService me) {
        this.me = me;
    }

    @GetMapping
    public ApiResponse<MeDtos.ProfileResponse> profile() {
        return ApiResponse.ok(me.profile());
    }

    @PutMapping
    public ApiResponse<MeDtos.ProfileResponse> update(@Valid @RequestBody MeDtos.UpdateProfileRequest request) {
        return ApiResponse.ok(me.updateProfile(request));
    }

    @PutMapping("/password")
    public ApiResponse<Void> changePassword(@Valid @RequestBody MeDtos.ChangePasswordRequest request) {
        me.changePassword(request);
        return ApiResponse.ok();
    }

    @PostMapping(value = "/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<MeDtos.ProfileResponse> avatar(@RequestPart("file") MultipartFile file) {
        return ApiResponse.ok(me.uploadAvatar(file));
    }

    @DeleteMapping("/avatar")
    public ApiResponse<MeDtos.ProfileResponse> removeAvatar() {
        return ApiResponse.ok(me.removeAvatar());
    }

    @PostMapping("/email/request-change")
    public ApiResponse<MeDtos.EmailChangeResponse> requestEmailChange(
            @Valid @RequestBody MeDtos.EmailChangeRequest request) {
        return ApiResponse.ok(me.requestEmailChange(request));
    }

    @PostMapping("/email/confirm")
    public ApiResponse<MeDtos.ProfileResponse> confirmEmailChange(
            @Valid @RequestBody MeDtos.ConfirmEmailRequest request) {
        return ApiResponse.ok(me.confirmEmailChange(request));
    }
}
