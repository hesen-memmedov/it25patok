package az.it25patok.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** WebSocket handshake üçün əlavə CORS (SecurityConfig ilə eyni mənbələr). */
@Configuration
public class WebCorsConfig implements WebMvcConfigurer {
    private final AppProperties props;

    public WebCorsConfig(AppProperties props) {
        this.props = props;
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/ws/**")
                .allowedOriginPatterns(props.cors().allowedOrigins().toArray(String[]::new))
                .allowedMethods("GET", "POST", "OPTIONS")
                .allowCredentials(true);
    }
}
