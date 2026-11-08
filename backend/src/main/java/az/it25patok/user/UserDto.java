package az.it25patok.user;

public record UserDto(
        String id,
        Role role,
        String email,
        String username,
        String firstName,
        String lastName,
        String phone,
        String groupId,
        String groupCode,
        String avatarFileId,
        String bio,
        String theme,
        boolean active,
        boolean mustChangePassword,
        boolean notificationEnabled,
        Long mutedUntil,
        Long lastLoginAt,
        long createdAt
) {
    public static UserDto from(User user, String groupCode) {
        if (user == null) return null;
        return new UserDto(user.id(), user.role(), user.email(), user.username(), user.firstName(), user.lastName(),
                user.phone(), user.groupId(), groupCode, user.avatarFileId(), user.bio(), user.theme(),
                user.active(), user.mustChangePassword(), user.notificationEnabled(),
                user.chatMutedUntil(), user.lastLoginAt(), user.createdAt());
    }
}
