package az.it25patok.chat;

import az.it25patok.auth.AuthUser;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.security.Principal;
import java.util.Map;

@Component
public class ChatPresenceListener {
    private final ChatPresenceService presence;
    private final SimpMessagingTemplate messaging;

    public ChatPresenceListener(ChatPresenceService presence, SimpMessagingTemplate messaging) {
        this.presence = presence;
        this.messaging = messaging;
    }

    @EventListener
    public void connected(SessionConnectedEvent event) {
        Principal principal = event.getUser();
        if (principal instanceof org.springframework.security.authentication.UsernamePasswordAuthenticationToken token
                && token.getPrincipal() instanceof AuthUser user) {
            presence.connect(sessionId(event), user);
            broadcast();
        }
    }

    @EventListener
    public void disconnected(SessionDisconnectEvent event) {
        presence.disconnect(event.getSessionId());
        broadcast();
    }

    private void broadcast() {
        try {
            messaging.convertAndSend("/topic/presence", Map.of("online", presence.onlineCount()));
        } catch (Exception ignored) {
        }
    }

    private static String sessionId(SessionConnectedEvent event) {
        var accessor = org.springframework.messaging.simp.stomp.StompHeaderAccessor.wrap(event.getMessage());
        return accessor.getSessionId();
    }
}
