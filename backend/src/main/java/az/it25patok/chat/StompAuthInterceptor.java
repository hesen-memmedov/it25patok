package az.it25patok.chat;

import az.it25patok.auth.AuthUser;
import az.it25patok.auth.JwtService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class StompAuthInterceptor implements ChannelInterceptor {
    private final JwtService jwt;
    private final ChatService chat;
    private final ObjectMapper mapper;
    private final Map<String, AuthUser> sessionUsers = new ConcurrentHashMap<>();

    public StompAuthInterceptor(JwtService jwt, ChatService chat, ObjectMapper mapper) {
        this.jwt = jwt;
        this.chat = chat;
        this.mapper = mapper;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || accessor.getCommand() == null) return message;
        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            String header = accessor.getFirstNativeHeader("Authorization");
            String token = header != null && header.startsWith("Bearer ") ? header.substring(7)
                    : accessor.getFirstNativeHeader("token");
            if (token == null || token.isBlank()) {
                throw new MessagingException("WebSocket üçün token tələb olunur.");
            }
            AuthUser user = jwt.parseAccess(token);
            var authentication = new UsernamePasswordAuthenticationToken(user, null,
                    List.of(new SimpleGrantedAuthority("ROLE_" + user.role())));
            accessor.setUser(authentication);
            if (accessor.getSessionId() != null) sessionUsers.put(accessor.getSessionId(), user);
            return message;
        }
        if (StompCommand.DISCONNECT.equals(accessor.getCommand())) {
            if (accessor.getSessionId() != null) sessionUsers.remove(accessor.getSessionId());
            return message;
        }
        AuthUser user = currentUser(accessor);
        if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            String destination = accessor.getDestination();
            String roomId = roomFromTopic(destination);
            if (roomId != null && !chat.canAccess(roomId, user)) {
                throw new MessagingException("Bu çat otağına abunə olmaq icazəniz yoxdur.");
            }
        }
        if (StompCommand.SEND.equals(accessor.getCommand())) {
            String destination = accessor.getDestination();
            if (destination != null && destination.startsWith("/app/chat.")) {
                try {
                    var payload = mapper.readTree(message.getPayload() instanceof byte[] bytes
                            ? new String(bytes, StandardCharsets.UTF_8)
                            : String.valueOf(message.getPayload()));
                    String roomId = payload.path("roomId").asText(null);
                    if (roomId == null || !chat.canAccess(roomId, user)) {
                        throw new MessagingException("Bu çat otağına yazmaq icazəniz yoxdur.");
                    }
                } catch (MessagingException e) {
                    throw e;
                } catch (Exception e) {
                    throw new MessagingException("Mesaj formatı yanlışdır.");
                }
            }
        }
        return message;
    }

    private AuthUser currentUser(StompHeaderAccessor accessor) {
        if (accessor.getUser() instanceof org.springframework.security.core.Authentication authentication
                && authentication.getPrincipal() instanceof AuthUser user) {
            return user;
        }
        AuthUser user = accessor.getSessionId() == null ? null : sessionUsers.get(accessor.getSessionId());
        if (user == null) throw new MessagingException("Autentifikasiya tələb olunur.");
        return user;
    }

    private static String roomFromTopic(String destination) {
        if (destination == null || !destination.startsWith("/topic/room.")) return null;
        String rest = destination.substring("/topic/room.".length());
        int dot = rest.indexOf('.');
        return dot < 0 ? rest : rest.substring(0, dot);
    }
}
