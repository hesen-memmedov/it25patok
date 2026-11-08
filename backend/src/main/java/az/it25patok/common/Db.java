package az.it25patok.common;

import java.util.List;
import java.util.Map;

/** D1/SQLite nəticələrini təhlükəsiz oxumaq üçün kiçik yardımçı. */
public final class Db {
    private Db() {}

    public static String str(Map<String, Object> row, String key) {
        if (row == null) return null;
        Object v = row.get(key);
        return v == null ? null : String.valueOf(v);
    }

    public static String str(Map<String, Object> row, String key, String def) {
        String v = str(row, key);
        return v == null ? def : v;
    }

    public static Long lng(Map<String, Object> row, String key) {
        if (row == null) return null;
        Object v = row.get(key);
        if (v == null) return null;
        if (v instanceof Number n) return n.longValue();
        try {
            return Long.parseLong(String.valueOf(v));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    public static long lng(Map<String, Object> row, String key, long def) {
        Long v = lng(row, key);
        return v == null ? def : v;
    }

    public static int integer(Map<String, Object> row, String key, int def) {
        Long v = lng(row, key);
        return v == null ? def : v.intValue();
    }

    public static double dbl(Map<String, Object> row, String key, double def) {
        if (row == null) return def;
        Object v = row.get(key);
        if (v == null) return def;
        if (v instanceof Number n) return n.doubleValue();
        try {
            return Double.parseDouble(String.valueOf(v));
        } catch (NumberFormatException e) {
            return def;
        }
    }

    public static Double dblOrNull(Map<String, Object> row, String key) {
        if (row == null) return null;
        Object v = row.get(key);
        if (v == null) return null;
        if (v instanceof Number n) return n.doubleValue();
        try {
            return Double.parseDouble(String.valueOf(v));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    public static boolean bool(Map<String, Object> row, String key) {
        Long v = lng(row, key);
        return v != null && v != 0;
    }

    public static List<String> list(Map<String, Object> row, String key) {
        String v = str(row, key);
        return v == null || v.isBlank() ? List.of() : List.of(v.split(","));
    }
}
