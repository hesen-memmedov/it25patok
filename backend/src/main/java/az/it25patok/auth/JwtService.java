package az.it25patok.auth;

import az.it25patok.common.ApiException;
import az.it25patok.common.CryptoService;
import az.it25patok.config.AppProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;

@Service
public class JwtService {
    private final SecretKey key;
    private final AppProperties props;

    public JwtService(AppProperties props) {
        this.props = props;
        byte[] secret = props.jwt().secret().getBytes(StandardCharsets.UTF_8);
        if (secret.length < 32) secret = CryptoService.sha256(secret);
        this.key = Keys.hmacShaKeyFor(secret);
    }

    /** Bounded token used during onboarding (password change → email registration). */
    public String createSetupToken(AuthUser user, String purpose, Duration ttl) {
        Instant now = Instant.now();
        return Jwts.builder()
                .issuer(props.jwt().issuer())
                .subject(user.id())
                .claim("type", "setup:" + purpose)
                .claim("email", user.email())
                .claim("role", user.role())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(ttl)))
                .signWith(key)
                .compact();
    }

    /** Parse a setup token; accepts only the expected purpose (e.g. "password-change", "email-setup"). */
    public AuthUser parseSetupToken(String token, String expectedPurpose) {
        Claims claims = parse(token);
        String type = claims.get("type", String.class);
        if (!("setup:" + expectedPurpose).equals(type)) {
            throw ApiException.unauthorized("Token etibarsızdır və ya müddəti bitib.");
        }
        return new AuthUser(claims.getSubject(), claims.get("email", String.class),
                claims.get("role", String.class));
    }

    public String createAccessToken(AuthUser user) {
        Instant now = Instant.now();
        return Jwts.builder()
                .issuer(props.jwt().issuer())
                .subject(user.id())
                .claim("email", user.email())
                .claim("role", user.role())
                .claim("type", "access")
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(Duration.ofMinutes(props.jwt().accessTtlMinutes()))))
                .signWith(key)
                .compact();
    }

    public String createFileToken(String fileId, String userId, Duration ttl) {
        Instant now = Instant.now();
        return Jwts.builder()
                .issuer(props.jwt().issuer())
                .subject(userId)
                .claim("fileId", fileId)
                .claim("type", "file")
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(ttl)))
                .signWith(key)
                .compact();
    }

    public Claims parse(String token) {
        try {
            return Jwts.parser()
                    .verifyWith(key)
                    .requireIssuer(props.jwt().issuer())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
        } catch (Exception e) {
            throw ApiException.unauthorized("Token etibarsızdır və ya müddəti bitib.");
        }
    }

    public AuthUser parseAccess(String token) {
        Claims claims = parse(token);
        if (!"access".equals(claims.get("type", String.class))) {
            throw ApiException.unauthorized("Yanlış token tipi.");
        }
        return new AuthUser(claims.getSubject(), claims.get("email", String.class),
                claims.get("role", String.class));
    }

    public FileToken parseFileToken(String token) {
        Claims claims = parse(token);
        if (!"file".equals(claims.get("type", String.class))) {
            throw ApiException.unauthorized("Yanlış token tipi.");
        }
        return new FileToken(claims.get("fileId", String.class), claims.getSubject());
    }

    public record FileToken(String fileId, String userId) {}
}
