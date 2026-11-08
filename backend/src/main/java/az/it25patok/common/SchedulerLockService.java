package az.it25patok.common;

import az.it25patok.d1.D1Client;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class SchedulerLockService {
    private static final Logger log = LoggerFactory.getLogger(SchedulerLockService.class);
    private final D1Client d1;

    public SchedulerLockService(D1Client d1) {
        this.d1 = d1;
    }

    /** Birdən çox instans olduqda eyni işin iki dəfə icrasının qarşısını alır. */
    public void runIfFree(String name, long ttlSeconds, Runnable task) {
        long now = Time.now();
        try {
            d1.update("INSERT OR IGNORE INTO scheduler_locks(name, locked_until) VALUES (?, 0)", name);
            int acquired = d1.update(
                    "UPDATE scheduler_locks SET locked_until = ? WHERE name = ? AND locked_until < ?",
                    now + ttlSeconds * 1000, name, now);
            if (acquired == 0) {
                return;
            }
            try {
                task.run();
            } finally {
                d1.update("UPDATE scheduler_locks SET locked_until = 0 WHERE name = ?", name);
            }
        } catch (Exception e) {
            log.error("Scheduler '{}' icra olunmadı", name, e);
        }
    }
}
