package az.it25patok.chat;

import az.it25patok.auth.AuthUser;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.Map;

@Controller
public class ChatWebSocketController {
    private final ChatService chat;
    private final SimpMessagingTemplate messaging;

    public ChatWebSocketController(ChatService chat, SimpMessagingTemplate messaging) {
        this.chat = chat;
        this.messaging = messaging;
    }

    @MessageMapping("/chat.send")
    public void send(@Payload ChatDtos.SendPayload payload, Principal principal) {
        AuthUser user = user(principal);
        ChatDtos.MessageDto message = chat.send(payload.roomId(), user, payload.text(), payload.replyToId());
        messaging.convertAndSend("/topic/room." + payload.roomId(), message);
    }

    @MessageMapping("/chat.typing")
    public void typing(@Payload ChatDtos.TypingPayload payload, Principal principal) {
        AuthUser user = user(principal);
        chat.requireAccess(payload.roomId(), user);
        messaging.convertAndSend("/topic/room." + payload.roomId() + ".typing",
                new ChatDtos.TypingEvent(user.id(), user.email(), payload.roomId()));
    }

    private static AuthUser user(Principal principal) {
        if (principal instanceof UsernamePasswordAuthenticationToken token
                && token.getPrincipal() instanceof AuthUser user) {
            return user;
        }
        throw new IllegalStateException("Autentifikasiya tələb olunur.");
    }
}
