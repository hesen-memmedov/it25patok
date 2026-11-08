package az.it25patok.common;

import java.util.List;

public record PageResponse<T>(List<T> items, long total, int page, int size, int totalPages) {
    public static <T> PageResponse<T> of(List<T> items, long total, int page, int size) {
        int totalPages = size <= 0 ? 0 : (int) Math.ceil((double) total / size);
        return new PageResponse<>(items, total, page, size, totalPages);
    }
}
