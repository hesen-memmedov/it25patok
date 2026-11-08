package az.it25patok.common;

import az.it25patok.auth.AuthUser;
import az.it25patok.auth.CurrentUser;
import az.it25patok.d1.D1Client;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.Map;

@Service
public class AuditService {
    private static final Logger log = LoggerFactory.getLogger(AuditService.class);
    private final D1Client d1;
    private final CurrentUser currentUser;
    private final ObjectMapper mapper;

    public AuditService(D1Client d1, CurrentUser currentUser, ObjectMapper mapper) {
        this.d1 = d1;
        this.currentUser = currentUser;
        this.mapper = mapper;
    }

    public void log(String action, String targetType, String targetId) {
        log(null, action, targetType, targetId, Map.of());
    }

    public void log(String action, String targetType, String targetId, Map<String, Object> meta) {
        try {
            log(currentUser.id(), action, targetType, targetId, meta);
        } catch (Exception e) {
            log(null, action, targetType, targetId, meta);
        }
    }

    public void log(String actorId, String action, String targetType, String targetId, Map<String, Object> meta) {
        try {
            Map<String, Object> safe = meta == null ? Map.of() : meta;
            d1.update("INSERT INTO audit_log(id, actor_id, action, target_type, target_id, ip, meta, created_at) "
                            + "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    Ids.newId(), actorId, action, targetType, targetId, clientIp(),
                    mapper.writeValueAsString(safe), Time.now());
        } catch (Exception e) {
            log.warn("Audit log yazıla bilmədi: {}", e.getMessage());
        }
    }

    public String clientIp() {
        try {
            ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs == null) return null;
            HttpServletRequest request = attrs.getRequest();
            String forwarded = request.getHeader("X-Forwarded-For");
            if (forwarded != null && !forwarded.isBlank()) {
                return forwarded.split(",")[0].trim();
            }
            return request.getRemoteAddr();
        } catch (Exception e) {
            return null;
        }
    }

    public AuthUser actorOrNull() {
        try {
            return currentUser.require();
        } catch (Exception e) {
            return null;
        }
    }
}
