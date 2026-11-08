package az.it25patok.common;

import java.text.Normalizer;
import java.util.Locale;

public final class Text {
    private Text() {}

    public static String email(String value) {
        return value == null ? null : value.trim().toLowerCase(Locale.ROOT);
    }

    public static String clean(String value, int max) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.length() > max ? trimmed.substring(0, max) : trimmed;
    }

    public static String safeFileName(String name) {
        if (name == null || name.isBlank()) return "fayl";
        String normalized = Normalizer.normalize(name, Normalizer.Form.NFKC)
                .replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]", "_")
                .replaceAll("\\.{2,}", ".")
                .trim();
        if (normalized.isBlank()) normalized = "fayl";
        return normalized.length() > 180 ? normalized.substring(normalized.length() - 180) : normalized;
    }

    public static String extension(String name) {
        if (name == null) return "";
        int dot = name.lastIndexOf('.');
        return dot < 0 || dot == name.length() - 1 ? "" : name.substring(dot + 1).toLowerCase(Locale.ROOT);
    }

    public static String maskEmail(String email) {
        if (email == null) return "";
        int at = email.indexOf('@');
        if (at <= 1) return "***" + (at >= 0 ? email.substring(at) : "");
        String local = email.substring(0, at);
        String visible = local.substring(0, Math.min(2, local.length()));
        return visible + "***" + email.substring(at);
    }

    public static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    public static boolean isNotBlank(String s) {
        return s != null && !s.isBlank();
    }
}
