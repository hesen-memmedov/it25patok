package az.it25patok.chat;

public final class ChatDtos {
    private ChatDtos() {}

    public record RoomDto(String id, String type, String groupId, String name, long unread, long lastMessageAt) {}

    public record MessageDto(String id, String roomId, String senderId, String senderName, String senderRole,
                             String senderAvatar, String text, String replyToId, String replySenderName,
                             String replyText, long createdAt, long expiresAt) {}

    public record SendPayload(String roomId, String text, String replyToId) {}

    public record TypingPayload(String roomId) {}

    public record TypingEvent(String userId, String name, String roomId) {}
}
