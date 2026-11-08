package az.it25patok.user;

public record User(
        String id,
        Role role,
        String email,
        String username,
        String passwordHash,
        String firstName,
        String lastName,
        String phone,
        String groupId,
        String avatarFileId,
        String bio,
        String theme,
        boolean active,
        boolean mustChangePassword,
        int failedLoginCount,
        Long lockedUntil,
        Long otpLockedUntil,
        Long chatMutedUntil,
        boolean notificationEnabled,
        Long lastLoginAt,
        long createdAt,
        long updatedAt,
        Long deletedAt
) {
    public String fullName() {
        return firstName + " " + lastName;
    }

    public boolean isMuted() {
        return chatMutedUntil != null && chatMutedUntil > System.currentTimeMillis();
    }
}
