package az.it25patok.chat;

import az.it25patok.auth.AuthUser;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class ChatPresenceService {
    private final Map<String, AuthUser> sessions = new ConcurrentHashMap<>();

    public void connect(String sessionId, AuthUser user) {
        if (sessionId != null && user != null) sessions.put(sessionId, user);
    }

    public void disconnect(String sessionId) {
        if (sessionId != null) sessions.remove(sessionId);
    }

    public long onlineCount() {
        return sessions.values().stream().map(AuthUser::id).distinct().count();
    }
}
