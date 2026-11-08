package az.it25patok.common;

public record ApiResponse<T>(T data, ApiError error) {

    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(data, null);
    }

    public static ApiResponse<Void> ok() {
        return new ApiResponse<>(null, null);
    }

    public static ApiResponse<Void> error(String code, String message) {
        return new ApiResponse<>(null, new ApiError(code, message));
    }
}
