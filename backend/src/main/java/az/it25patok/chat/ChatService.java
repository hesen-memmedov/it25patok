package az.it25patok.chat;

import az.it25patok.auth.AuthUser;
import az.it25patok.common.ApiException;
import az.it25patok.common.CryptoService;
import az.it25patok.common.Db;
import az.it25patok.common.Ids;
import az.it25patok.common.RateLimiterService;
import az.it25patok.common.SettingsService;
import az.it25patok.common.Text;
import az.it25patok.common.Time;
import az.it25patok.config.AppProperties;
import az.it25patok.subject.SubjectRepository;
import az.it25patok.user.User;
import az.it25patok.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

@Service
public class ChatService {
    private static final Logger log = LoggerFactory.getLogger(ChatService.class);

    private final ChatRepository chat;
    private final UserRepository users;
    private final SubjectRepository subjects;
    private final SettingsService settings;
    private final CryptoService crypto;
    private final AppProperties props;
    private final RateLimiterService rateLimiter;
    private final ChatPresenceService presence;

    public ChatService(ChatRepository chat, UserRepository users, SubjectRepository subjects,
                       SettingsService settings, CryptoService crypto, AppProperties props,
                       RateLimiterService rateLimiter, ChatPresenceService presence) {
        this.chat = chat;
        this.users = users;
        this.subjects = subjects;
        this.settings = settings;
        this.crypto = crypto;
        this.props = props;
        this.rateLimiter = rateLimiter;
        this.presence = presence;
    }

    public boolean canAccess(String roomId, AuthUser auth) {
        ChatRoom room = chat.findRoom(roomId);
        if (room == null) return false;
        if ("ADMIN".equals(auth.role())) return true;
        if ("GLOBAL".equals(room.type())) return true;
        if (!"GROUP".equals(room.type())) return false;
        User user = users.findActiveById(auth.id());
        if (user == null) return false;
        if ("STUDENT".equals(auth.role())) {
            return user.groupId() != null && user.groupId().equals(room.groupId());
        }
        if ("TEACHER".equals(auth.role())) {
            return settings.bool("teacher_group_chat_enabled", true)
                    && subjects.groupIdsForTeacher(user.id()).contains(room.groupId());
        }
        return false;
    }

    public List<ChatDtos.RoomDto> rooms(AuthUser auth) {
        List<ChatDtos.RoomDto> result = new ArrayList<>();
        for (ChatRoom room : chat.allRooms()) {
            if (!canAccess(room.id(), auth)) continue;
            result.add(new ChatDtos.RoomDto(room.id(), room.type(), room.groupId(), room.name(),
                    chat.unreadCount(auth.id(), room.id()), chat.lastMessageAt(room.id())));
        }
        result.sort(Comparator.comparing((ChatDtos.RoomDto r) -> "GLOBAL".equals(r.type()) ? 0 : 1)
                .thenComparing(ChatDtos.RoomDto::name));
        return result;
    }

    public List<ChatDtos.MessageDto> messages(String roomId, AuthUser auth, Long before, Integer limit) {
        requireAccess(roomId, auth);
        int size = limit == null ? 50 : Math.max(1, Math.min(limit, 50));
        long beforeAt = before == null ? Time.now() + 1 : before;
        List<Map<String, Object>> rows = chat.messages(roomId, beforeAt, size);
        List<ChatDtos.MessageDto> messages = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            messages.add(mapMessage(row, roomId));
        }
        java.util.Collections.reverse(messages);
        return messages;
    }

    public ChatDtos.MessageDto send(String roomId, AuthUser auth, String text, String replyToId) {
        requireAccess(roomId, auth);
        User user = users.findActiveById(auth.id());
        if (user == null) throw ApiException.unauthorized("İstifadəçi tapılmadı.");
        if (user.isMuted()) {
            throw ApiException.forbidden("Çatda müvəqqəti susdurulmusunuz.");
        }
        rateLimiter.check("chat:" + auth.id(), 3, Duration.ofSeconds(1));
        String clean = text == null ? "" : text.replaceAll("[\\p{Cntrl}&&[^\\n\\t]]", "").trim();
        if (clean.isEmpty()) throw ApiException.badRequest("EMPTY_MESSAGE", "Mesaj boş ola bilməz.");
        if (clean.length() > props.chat().maxLength()) {
            throw ApiException.badRequest("MESSAGE_TOO_LONG",
                    "Mesaj " + props.chat().maxLength() + " simvoldan çox ola bilməz.");
        }
        if (replyToId != null && !replyToId.isBlank()) {
            Map<String, Object> original = chat.findMessage(replyToId);
            if (original == null || !roomId.equals(Db.str(original, "room_id"))) {
                throw ApiException.badRequest("INVALID_REPLY", "Cavab verilən mesaj tapılmadı.");
            }
        } else {
            replyToId = null;
        }
        CryptoService.Encrypted encrypted = crypto.encrypt(clean, roomId);
        String id = Ids.newId();
        long now = Time.now();
        long expires = now + props.chat().retentionDays() * 24L * 60 * 60 * 1000;
        chat.insert(id, roomId, auth.id(), encrypted.ciphertext(), encrypted.iv(),
                encrypted.keyVersion(), replyToId, now, expires);
        String replyName = null;
        String replyText = null;
        if (replyToId != null) {
            Map<String, Object> original = chat.findMessage(replyToId);
            replyName = Db.str(original, "sender_name");
            replyText = decrypt(Db.str(original, "ciphertext"), Db.str(original, "iv"),
                    Db.integer(original, "key_version", 1), roomId);
        }
        return new ChatDtos.MessageDto(id, roomId, auth.id(), user.fullName(), auth.role(),
                user.avatarFileId(), clean, replyToId, replyName, replyText, now, expires);
    }

    public String deleteMessage(String messageId, AuthUser auth) {
        Map<String, Object> message = chat.findMessage(messageId);
        if (message == null) throw ApiException.notFound("Mesaj tapılmadı.");
        String roomId = Db.str(message, "room_id");
        requireAccess(roomId, auth);
        if (!auth.id().equals(Db.str(message, "sender_id")) && !"ADMIN".equals(auth.role())) {
            throw ApiException.forbidden("Bu mesajı silmək icazəniz yoxdur.");
        }
        chat.softDelete(messageId);
        return roomId;
    }

    public void markRead(String roomId, AuthUser auth) {
        requireAccess(roomId, auth);
        chat.markRead(auth.id(), roomId, Time.now());
    }

    public long onlineCount() {
        return presence.onlineCount();
    }

    public void requireAccess(String roomId, AuthUser auth) {
        if (!canAccess(roomId, auth)) {
            throw ApiException.forbidden("Bu çat otağına giriş icazəniz yoxdur.");
        }
    }

    private ChatDtos.MessageDto mapMessage(Map<String, Object> row, String roomId) {
        String replyText = null;
        String replyCipher = Db.str(row, "reply_ciphertext");
        if (replyCipher != null) {
            replyText = decrypt(replyCipher, Db.str(row, "reply_iv"),
                    Db.integer(row, "reply_key_version", 1), roomId);
        }
        return new ChatDtos.MessageDto(
                Db.str(row, "id"), roomId, Db.str(row, "sender_id"), Db.str(row, "sender_name"),
                Db.str(row, "sender_role"), Db.str(row, "sender_avatar"),
                decrypt(Db.str(row, "ciphertext"), Db.str(row, "iv"),
                        Db.integer(row, "key_version", 1), roomId),
                Db.str(row, "reply_to_id"), Db.str(row, "reply_sender_name"), replyText,
                Db.lng(row, "created_at", 0), Db.lng(row, "expires_at", 0));
    }

    private String decrypt(String ciphertext, String iv, int keyVersion, String roomId) {
        try {
            return crypto.decrypt(ciphertext, iv, keyVersion, roomId);
        } catch (Exception e) {
            log.warn("Çat mesajı deşifrə oluna bilmədi: {}", e.getMessage());
            return "[Mesaj oxuna bilmədi]";
        }
    }

    public int cleanupExpired() {
        return chat.deleteExpired(Time.now());
    }
}
