package az.it25patok.common;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
public class RateLimiterService {
    private final Cache<String, Bucket> buckets = Caffeine.newBuilder()
            .expireAfterAccess(Duration.ofHours(2))
            .maximumSize(20_000)
            .build();

    public void check(String key, int capacity, Duration window) {
        Bucket bucket = buckets.get(key, k -> Bucket.builder()
                .addLimit(Bandwidth.builder()
                        .capacity(capacity)
                        .refillGreedy(capacity, window)
                        .build())
                .build());
        if (!bucket.tryConsume(1)) {
            throw ApiException.tooManyRequests("Çox sayda cəhd. Bir az sonra yenidən yoxlayın.");
        }
    }
}
