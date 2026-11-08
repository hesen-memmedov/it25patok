package az.it25patok.config;

import az.it25patok.common.ApiResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/** Cookie əsaslı endpoint-lər üçün Origin yoxlaması (CSRF müdafiəsinin əlavə qatı). */
@Component
public class OriginCheckFilter extends OncePerRequestFilter {
    private final AppProperties props;
    private final ObjectMapper mapper;

    public OriginCheckFilter(AppProperties props, ObjectMapper mapper) {
        this.props = props;
        this.mapper = mapper;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String method = request.getMethod();
        boolean mutating = !HttpMethod.GET.matches(method) && !HttpMethod.HEAD.matches(method)
                && !HttpMethod.OPTIONS.matches(method);
        String origin = request.getHeader("Origin");
        if (mutating && origin != null && !props.cors().allowedOrigins().contains(origin)) {
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding("UTF-8");
            mapper.writeValue(response.getWriter(),
                    ApiResponse.error("ORIGIN_FORBIDDEN", "Bu mənbədən sorğu icazəli deyil."));
            return;
        }
        filterChain.doFilter(request, response);
    }
}
