package az.it25patok.notification;

import az.it25patok.assignment.AssignmentRepository;
import az.it25patok.common.AuditService;
import az.it25patok.common.SchedulerLockService;
import az.it25patok.common.SettingsService;
import az.it25patok.common.Time;
import az.it25patok.config.AppProperties;
import az.it25patok.file.FileRepository;
import az.it25patok.file.StoredFile;
import az.it25patok.user.User;
import az.it25patok.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class NotificationScheduler {
    private static final Logger log = LoggerFactory.getLogger(NotificationScheduler.class);
    private static final DateTimeFormatter HOUR_MINUTE = DateTimeFormatter.ofPattern("HH:mm");
    private static final int BATCH_SIZE = 20;

    private final SettingsService settings;
    private final SchedulerLockService locks;
    private final UserRepository users;
    private final AssignmentRepository assignments;
    private final FileRepository files;
    private final NotificationLogRepository notifications;
    private final MailService mail;
    private final AuditService audit;
    private final AppProperties props;
    private final ThreadPoolTaskExecutor mailExecutor;

    public NotificationScheduler(SettingsService settings, SchedulerLockService locks,
                                 UserRepository users, AssignmentRepository assignments,
                                 FileRepository files, NotificationLogRepository notifications,
                                 MailService mail, AuditService audit, AppProperties props,
                                 @Qualifier("mailExecutor") ThreadPoolTaskExecutor mailExecutor) {
        this.settings = settings;
        this.locks = locks;
        this.users = users;
        this.assignments = assignments;
        this.files = files;
        this.notifications = notifications;
        this.mail = mail;
        this.audit = audit;
        this.props = props;
        this.mailExecutor = mailExecutor;
    }

    @Scheduled(cron = "0 * * * * *", zone = "Asia/Baku")
    public void dailyReminderTick() {
        try {
            if (!settings.bool("daily_email_enabled", true)) return;
            String configured = settings.get("daily_email_time", "09:00");
            String now = ZonedDateTime.now(Time.AZ).format(HOUR_MINUTE);
            if (!configured.equals(now)) return;
            String today = LocalDate.now(Time.AZ).toString();
            if (today.equals(settings.get("last_daily_reminder_date", ""))) return;
            locks.runIfFree("daily-reminder", 1800, () -> sendDailyReminders(today));
        } catch (Exception e) {
            log.error("Gündəlik xatırlatma yoxlaması uğursuz oldu", e);
        }
    }

    private void sendDailyReminders(String today) {
        if (today.equals(settings.get("last_daily_reminder_date", ""))) return;
        long startOfDay = ZonedDateTime.now(Time.AZ).toLocalDate()
                .atStartOfDay(Time.AZ).toInstant().toEpochMilli();
        long now = Time.now();

        List<AssignmentRepository.MissingRow> missing = assignments.missingRows(null, null, null);
        Map<String, List<AssignmentRepository.MissingRow>> byStudent = missing.stream()
                .collect(java.util.stream.Collectors.groupingBy(
                        AssignmentRepository.MissingRow::studentId, LinkedHashMap::new,
                        java.util.stream.Collectors.toList()));
        Map<String, User> activeStudents = new HashMap<>();
        for (User student : users.findActiveStudents()) activeStudents.put(student.id(), student);

        List<ReminderPayload> payloads = new ArrayList<>();
        for (Map.Entry<String, List<AssignmentRepository.MissingRow>> entry : byStudent.entrySet()) {
            User student = activeStudents.get(entry.getKey());
            if (student == null || !student.notificationEnabled()) continue;
            if (notifications.existsSince(student.id(), "DAILY_REMINDER", startOfDay)) continue;
            List<Map<String, Object>> groups = groupBySubject(entry.getValue(), now);
            int total = entry.getValue().size();
            payloads.add(new ReminderPayload(student, groups, total));
        }

        // Dublikat qoruması: işə başlamazdan əvvəl tarixi qeyd edirik.
        settings.set("last_daily_reminder_date", today);
        int sent = dispatch(payloads);
        audit.log(null, "DAILY_REMINDERS_DISPATCHED", "NOTIFICATION", null,
                Map.of("students", sent, "total", payloads.size()));
        log.info("Gündəlik xatırlatma növbəyə qoyuldu: {} tələbə", payloads.size());
    }

    @Scheduled(cron = "0 15 9 * * *", zone = "Asia/Baku")
    public void fileExpiryTick() {
        try {
            locks.runIfFree("file-expiry-warning", 1800, this::sendFileExpiryWarnings);
        } catch (Exception e) {
            log.error("Fayl müddəti xəbərdarlığı uğursuz oldu", e);
        }
    }

    private void sendFileExpiryWarnings() {
        long now = Time.now();
        long startOfDay = ZonedDateTime.now(Time.AZ).toLocalDate()
                .atStartOfDay(Time.AZ).toInstant().toEpochMilli();
        int days = settings.integer("file_expiry_warning_days", props.files().warningDays());
        List<StoredFile> expiring = files.findExpiringBetween(now, now + days * 86_400_000L);
        Map<String, List<StoredFile>> byOwner = expiring.stream()
                .collect(java.util.stream.Collectors.groupingBy(StoredFile::ownerId,
                        LinkedHashMap::new, java.util.stream.Collectors.toList()));
        List<FilePayload> payloads = new ArrayList<>();
        for (Map.Entry<String, List<StoredFile>> entry : byOwner.entrySet()) {
            User owner = users.findActiveById(entry.getKey());
            if (owner == null || !owner.notificationEnabled()) continue;
            if (notifications.existsSince(owner.id(), "FILE_EXPIRY", startOfDay)) continue;
            List<Map<String, Object>> rows = new ArrayList<>();
            for (StoredFile file : entry.getValue()) {
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("name", file.originalName());
                row.put("expires", Time.date(file.expiresAt()));
                rows.add(row);
            }
            payloads.add(new FilePayload(owner, rows));
        }
        int dispatched = dispatchFileExpiry(payloads);
        audit.log(null, "FILE_EXPIRY_WARNINGS_DISPATCHED", "NOTIFICATION", null,
                Map.of("users", dispatched, "files", expiring.size()));
        log.info("Fayl müddəti xəbərdarlığı növbəyə qoyuldu: {} istifadəçi", payloads.size());
    }

    private int dispatch(List<ReminderPayload> payloads) {
        int count = 0;
        for (int i = 0; i < payloads.size(); i += BATCH_SIZE) {
            List<ReminderPayload> chunk = payloads.subList(i, Math.min(i + BATCH_SIZE, payloads.size()));
            boolean last = i + BATCH_SIZE >= payloads.size();
            mailExecutor.execute(() -> {
                for (ReminderPayload payload : chunk) {
                    try {
                        mail.sendDailyReminder(payload.user(), payload.groups(), payload.total());
                    } catch (RuntimeException e) {
                        log.warn("Xatırlatma göndərilə bilmədi ({}): {}", payload.user().email(), e.getMessage());
                    }
                }
                if (!last) pause();
            });
            count += chunk.size();
        }
        return count;
    }

    private int dispatchFileExpiry(List<FilePayload> payloads) {
        int count = 0;
        for (int i = 0; i < payloads.size(); i += BATCH_SIZE) {
            List<FilePayload> chunk = payloads.subList(i, Math.min(i + BATCH_SIZE, payloads.size()));
            boolean last = i + BATCH_SIZE >= payloads.size();
            mailExecutor.execute(() -> {
                for (FilePayload payload : chunk) {
                    try {
                        mail.sendFileExpiry(payload.user(), payload.files());
                    } catch (RuntimeException e) {
                        log.warn("Fayl xəbərdarlığı göndərilə bilmədi ({}): {}",
                                payload.user().email(), e.getMessage());
                    }
                }
                if (!last) pause();
            });
            count += chunk.size();
        }
        return count;
    }

    private List<Map<String, Object>> groupBySubject(List<AssignmentRepository.MissingRow> rows, long now) {
        Map<String, List<AssignmentRepository.MissingRow>> bySubject = rows.stream()
                .collect(java.util.stream.Collectors.groupingBy(
                        AssignmentRepository.MissingRow::subjectId, LinkedHashMap::new,
                        java.util.stream.Collectors.toList()));
        List<Map<String, Object>> result = new ArrayList<>();
        for (List<AssignmentRepository.MissingRow> items : bySubject.values()) {
            AssignmentRepository.MissingRow first = items.get(0);
            List<Map<String, Object>> itemMaps = new ArrayList<>();
            for (AssignmentRepository.MissingRow row : items) {
                boolean overdue = row.deadline() != null && row.deadline() < now;
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("title", row.title());
                item.put("deadline", row.deadline() == null ? "—" : Time.date(row.deadline()));
                item.put("overdue", overdue);
                item.put("lateLabel", overdue ? "Gecikib" : "");
                itemMaps.add(item);
            }
            Map<String, Object> group = new LinkedHashMap<>();
            group.put("subject", first.subjectName());
            group.put("items", itemMaps);
            result.add(group);
        }
        return result;
    }

    private void pause() {
        try {
            Thread.sleep(Math.max(100, props.mail().dailyBatchPauseMs()));
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    private record ReminderPayload(User user, List<Map<String, Object>> groups, int total) {}

    private record FilePayload(User user, List<Map<String, Object>> files) {}
}
