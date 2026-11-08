package az.it25patok.chat;

import az.it25patok.auth.AuthUser;
import az.it25patok.auth.CurrentUser;
import az.it25patok.common.ApiResponse;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/chat")
public class ChatController {
    private final ChatService chat;
    private final CurrentUser currentUser;
    private final SimpMessagingTemplate messaging;

    public ChatController(ChatService chat, CurrentUser currentUser, SimpMessagingTemplate messaging) {
        this.chat = chat;
        this.currentUser = currentUser;
        this.messaging = messaging;
    }

    @GetMapping("/rooms")
    public ApiResponse<List<ChatDtos.RoomDto>> rooms() {
        return ApiResponse.ok(chat.rooms(currentUser.require()));
    }

    @GetMapping("/rooms/{id}/messages")
    public ApiResponse<List<ChatDtos.MessageDto>> messages(@PathVariable String id,
                                                           @RequestParam(required = false) Long before,
                                                           @RequestParam(required = false) Integer limit) {
        return ApiResponse.ok(chat.messages(id, currentUser.require(), before, limit));
    }

    @PostMapping("/rooms/{id}/read")
    public ApiResponse<Void> read(@PathVariable String id) {
        chat.markRead(id, currentUser.require());
        return ApiResponse.ok();
    }

    @DeleteMapping("/messages/{id}")
    public ApiResponse<Void> delete(@PathVariable String id) {
        AuthUser user = currentUser.require();
        String roomId = chat.deleteMessage(id, user);
        messaging.convertAndSend("/topic/room." + roomId,
                Map.of("type", "deleted", "messageId", id));
        return ApiResponse.ok();
    }

    @GetMapping("/presence")
    public ApiResponse<Map<String, Long>> presence() {
        return ApiResponse.ok(Map.of("online", chat.onlineCount()));
    }
}
