package az.it25patok.retention;

import az.it25patok.auth.OtpRepository;
import az.it25patok.auth.TokenRepository;
import az.it25patok.chat.ChatRepository;
import az.it25patok.common.AuditService;
import az.it25patok.common.SchedulerLockService;
import az.it25patok.common.Time;
import az.it25patok.file.ConversionService;
import az.it25patok.file.FileRepository;
import az.it25patok.file.StorageService;
import az.it25patok.file.StoredFile;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
public class RetentionScheduler {
    private static final Logger log = LoggerFactory.getLogger(RetentionScheduler.class);

    private final FileRepository files;
    private final StorageService storage;
    private final ConversionService conversion;
    private final ChatRepository chat;
    private final OtpRepository otp;
    private final TokenRepository tokens;
    private final SchedulerLockService locks;
    private final AuditService audit;

    public RetentionScheduler(FileRepository files, StorageService storage,
                              ConversionService conversion, ChatRepository chat,
                              OtpRepository otp, TokenRepository tokens,
                              SchedulerLockService locks, AuditService audit) {
        this.files = files;
        this.storage = storage;
        this.conversion = conversion;
        this.chat = chat;
        this.otp = otp;
        this.tokens = tokens;
        this.locks = locks;
        this.audit = audit;
    }

    /** Fayllar 1 il saxlanılır, sonra Drive-dan və DB-dən silinir. */
    @Scheduled(cron = "0 0 3 * * *", zone = "Asia/Baku")
    public void purgeExpiredFiles() {
        locks.runIfFree("file-retention", 3600, () -> {
            long now = Time.now();
            int deleted = 0;
            int failed = 0;
            for (int batch = 0; batch < 50; batch++) {
                List<StoredFile> expired = files.findExpired(now, 200);
                if (expired.isEmpty()) break;
                int successInBatch = 0;
                for (StoredFile file : expired) {
                    try {
                        storage.delete(file.driveFileId());
                        files.markDeleted(file.id());
                        conversion.deletePreview(file.id());
                        successInBatch++;
                        deleted++;
                    } catch (Exception e) {
                        failed++;
                        log.warn("Müddəti bitmiş fayl silinə bilmədi ({}): {}", file.id(), e.getMessage());
                    }
                }
                if (successInBatch == 0) break;
            }
            if (deleted > 0 || failed > 0) {
                audit.log(null, "FILES_PURGED", "FILE", null,
                        Map.of("deleted", deleted, "failed", failed));
                log.info("Saxlama müddəti bitmiş fayllar silindi: {} (uğursuz: {})", deleted, failed);
            }
        });
    }

    /** Çat mesajları 7 gündən sonra fiziki olaraq silinir. */
    @Scheduled(cron = "0 0 * * * *", zone = "Asia/Baku")
    public void purgeExpiredChat() {
        locks.runIfFree("chat-retention", 900, () -> {
            int deleted = chat.deleteExpired(Time.now());
            if (deleted > 0) {
                audit.log(null, "CHAT_MESSAGES_PURGED", "CHAT", null, Map.of("deleted", deleted));
                log.info("Müddəti bitmiş çat mesajları silindi: {}", deleted);
            }
        });
    }

    /** Vaxtı keçmiş OTP və token-lərin təmizlənməsi. */
    @Scheduled(cron = "0 30 3 * * *", zone = "Asia/Baku")
    public void purgeExpiredTokens() {
        locks.runIfFree("token-retention", 1800, () -> {
            long now = Time.now();
            otp.deleteExpired(now - 24L * 60 * 60 * 1000);
            tokens.deleteExpired(now);
            log.debug("Vaxtı keçmiş OTP və token-lər təmizləndi");
        });
    }
}
