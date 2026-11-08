package az.it25patok.d1;

import az.it25patok.config.AppProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;

@Component
@ConditionalOnProperty(name = "app.d1.mode", havingValue = "cloudflare", matchIfMissing = true)
public class CloudflareD1Client implements D1Client {
    private static final Logger log = LoggerFactory.getLogger(CloudflareD1Client.class);

    private final AppProperties props;
    private final ObjectMapper mapper;
    private final HttpClient http;
    private final CircuitBreaker circuitBreaker;

    public CloudflareD1Client(AppProperties props, ObjectMapper mapper) {
        this.props = props;
        this.mapper = mapper;
        if (props.d1().accountId().isBlank() || props.d1().databaseId().isBlank() || props.d1().apiToken().isBlank()) {
            throw new IllegalStateException("CF_ACCOUNT_ID, CF_D1_DATABASE_ID və CF_API_TOKEN mütləqdir.");
        }
        this.http = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
        this.circuitBreaker = CircuitBreaker.of("d1", CircuitBreakerConfig.custom()
                .failureRateThreshold(50)
                .slidingWindowSize(20)
                .minimumNumberOfCalls(8)
                .waitDurationInOpenState(Duration.ofSeconds(30))
                .permittedNumberOfCallsInHalfOpenState(3)
                .build());
    }

    @Override
    public List<Map<String, Object>> query(String sql, Object... params) {
        return queryResult(sql, params).rows();
    }

    @Override
    public Result queryResult(String sql, Object... params) {
        Map<String, Object> body = Map.of("sql", sql, "params", normalizeParams(params));
        var node = circuitBreaker.executeSupplier(() -> post(body));
        if (!node.path("success").asBoolean(false)) {
            throw new D1Exception("D1 sorğusu uğursuz oldu: " + errorText(node));
        }
        var result = node.path("result");
        if (!result.isArray() || result.isEmpty()) {
            return new Result(List.of(), 0, 0);
        }
        var first = result.get(0);
        var rowsNode = first.path("results");
        List<Map<String, Object>> rows = new ArrayList<>();
        if (rowsNode.isArray()) {
            for (var item : rowsNode) {
                @SuppressWarnings("unchecked")
                Map<String, Object> row = mapper.convertValue(item, Map.class);
                rows.add(row);
            }
        }
        var meta = first.path("meta");
        return new Result(rows, meta.path("changes").asLong(0), meta.path("last_row_id").asLong(0));
    }

    @Override
    public int update(String sql, Object... params) {
        return (int) queryResult(sql, params).changes();
    }

    @Override
    public List<Result> batch(List<Statement> statements) {
        if (statements.isEmpty()) return List.of();
        List<Map<String, Object>> batch = statements.stream()
                .map(s -> Map.<String, Object>of("sql", s.sql(), "params", normalizeParams(s.params().toArray())))
                .toList();
        try {
            var node = circuitBreaker.executeSupplier(() -> post(Map.of("batch", batch)));
            if (!node.path("success").asBoolean(false)) {
                throw new D1Exception(errorText(node));
            }
            List<Result> results = new ArrayList<>();
            for (var item : node.path("result")) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> rows = mapper.convertValue(item.path("results"), List.class);
                var meta = item.path("meta");
                results.add(new Result(rows == null ? List.of() : rows,
                        meta.path("changes").asLong(0), meta.path("last_row_id").asLong(0)));
            }
            return results;
        } catch (Exception e) {
            log.warn("D1 batch dəstəklənmədi, ardıcıl icra olunur: {}", e.getMessage());
            List<Result> results = new ArrayList<>();
            for (Statement statement : statements) {
                results.add(queryResult(statement.sql(), statement.params().toArray()));
            }
            return results;
        }
    }

    private com.fasterxml.jackson.databind.JsonNode post(Object body) {
        String url = "https://api.cloudflare.com/client/v4/accounts/" + props.d1().accountId()
                + "/d1/database/" + props.d1().databaseId() + "/query";
        String json;
        try {
            json = mapper.writeValueAsString(body);
        } catch (Exception e) {
            throw new D1Exception("D1 sorğusu hazırlana bilmədi", e);
        }
        RuntimeException last = null;
        for (int attempt = 0; attempt < 4; attempt++) {
            try {
                HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                        .timeout(Duration.ofSeconds(props.d1().timeoutSeconds()))
                        .header("Authorization", "Bearer " + props.d1().apiToken())
                        .header("Content-Type", "application/json")
                        .POST(HttpRequest.BodyPublishers.ofString(json))
                        .build();
                HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
                if (response.statusCode() == 429 || response.statusCode() >= 500) {
                    throw new D1Exception("D1 HTTP " + response.statusCode());
                }
                if (response.statusCode() >= 400) {
                    throw new D1Exception("D1 HTTP " + response.statusCode() + ": " + response.body());
                }
                return mapper.readTree(response.body());
            } catch (Exception e) {
                last = e instanceof RuntimeException re ? re : new D1Exception("D1 bağlantı xətası", e);
                if (attempt < 3) {
                    try {
                        long sleep = (long) (250 * Math.pow(2, attempt) + ThreadLocalRandom.current().nextInt(150));
                        Thread.sleep(sleep);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        throw new D1Exception("D1 sorğusu dayandırıldı", ie);
                    }
                }
            }
        }
        throw last == null ? new D1Exception("D1 sorğusu alınmadı") : last;
    }

    private static List<Object> normalizeParams(Object[] params) {
        List<Object> result = new ArrayList<>(params.length);
        for (Object p : params) {
            if (p instanceof Boolean b) result.add(b ? 1 : 0);
            else if (p instanceof Enum<?> e) result.add(e.name());
            else result.add(p);
        }
        return result;
    }

    private static String errorText(com.fasterxml.jackson.databind.JsonNode node) {
        var errors = node.path("errors");
        return errors.isArray() && !errors.isEmpty() ? errors.get(0).toString() : node.toString();
    }
}
