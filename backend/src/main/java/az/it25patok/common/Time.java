package az.it25patok.common;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

public final class Time {
    public static final ZoneId AZ = ZoneId.of("Asia/Baku");
    public static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd.MM.yyyy");
    public static final DateTimeFormatter DATE_TIME = DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm");

    private Time() {}

    public static long now() {
        return System.currentTimeMillis();
    }

    public static String date(long epochMillis) {
        return Instant.ofEpochMilli(epochMillis).atZone(AZ).format(DATE);
    }

    public static String dateTime(long epochMillis) {
        return Instant.ofEpochMilli(epochMillis).atZone(AZ).format(DATE_TIME);
    }
}
