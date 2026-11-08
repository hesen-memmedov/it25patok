package az.it25patok.file;

import az.it25patok.common.ApiException;
import az.it25patok.common.Time;
import az.it25patok.config.AppProperties;
import az.it25patok.d1.D1Client;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.ReentrantLock;

@Service
public class ConversionService {
    private static final Logger log = LoggerFactory.getLogger(ConversionService.class);
    private final StorageService storage;
    private final D1Client d1;
    private final AppProperties props;
    private final Path dir;
    private final Map<String, ReentrantLock> locks = new ConcurrentHashMap<>();

    public ConversionService(StorageService storage, D1Client d1, AppProperties props) {
        this.storage = storage;
        this.d1 = d1;
        this.props = props;
        this.dir = Path.of(props.files().conversionDir()).toAbsolutePath();
        try {
            Files.createDirectories(dir);
        } catch (Exception e) {
            throw new IllegalStateException("Konversiya qovluğu yaradıla bilmədi", e);
        }
    }

    public boolean convertible(StoredFile file) {
        String ext = file.extension() == null ? "" : file.extension().toLowerCase(Locale.ROOT);
        return ext.equals("pptx") || ext.equals("ppt") || ext.equals("odp");
    }

    public Path preview(StoredFile file) {
        if (!convertible(file)) {
            throw new ApiException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "NOT_CONVERTIBLE",
                    "Bu fayl tipi PDF-ə çevrilmir.");
        }
        Map<String, Object> existing = d1.queryOne("SELECT * FROM converted_previews WHERE file_id = ?", file.id());
        if (existing != null) {
            Path path = Path.of(az.it25patok.common.Db.str(existing, "local_path"));
            if (Files.exists(path)) return path;
            d1.update("DELETE FROM converted_previews WHERE file_id = ?", file.id());
        }
        ReentrantLock lock = locks.computeIfAbsent(file.id(), k -> new ReentrantLock());
        lock.lock();
        try {
            existing = d1.queryOne("SELECT * FROM converted_previews WHERE file_id = ?", file.id());
            if (existing != null) {
                Path path = Path.of(az.it25patok.common.Db.str(existing, "local_path"));
                if (Files.exists(path)) return path;
            }
            return convert(file);
        } finally {
            lock.unlock();
            locks.remove(file.id(), lock);
        }
    }

    private Path convert(StoredFile file) {
        Path source = dir.resolve(file.id() + "." + file.extension());
        Path target = dir.resolve(file.id() + ".pdf");
        try (InputStream in = storage.download(file.driveFileId(), null, null)) {
            Files.copy(in, source, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
        } catch (Exception e) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "CONVERSION_ERROR",
                    "Fayl konversiya üçün yüklənə bilmədi.");
        }
        try {
            ProcessBuilder builder = new ProcessBuilder(props.files().officeBinary(), "--headless",
                    "--norestore", "--convert-to", "pdf", "--outdir", dir.toString(), source.toString());
            builder.redirectErrorStream(true);
            Process process = builder.start();
            boolean finished = process.waitFor(props.files().conversionTimeoutSeconds(), TimeUnit.SECONDS);
            if (!finished) {
                process.destroyForcibly();
                throw new ApiException(HttpStatus.GATEWAY_TIMEOUT, "CONVERSION_TIMEOUT",
                        "Fayl konversiyası vaxtı aşdı.");
            }
            String output = new String(process.getInputStream().readAllBytes());
            if (process.exitValue() != 0 || !Files.exists(target)) {
                log.warn("LibreOffice konversiya xətası: {}", output);
                throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "CONVERSION_FAILED",
                        "Təqdimat PDF-ə çevrilə bilmədi.");
            }
            long size = Files.size(target);
            d1.update("""
                    INSERT INTO converted_previews(file_id, local_path, size_bytes, created_at) VALUES (?, ?, ?, ?)
                    ON CONFLICT(file_id) DO UPDATE SET local_path = excluded.local_path,
                      size_bytes = excluded.size_bytes, created_at = excluded.created_at
                    """, file.id(), target.toString(), size, Time.now());
            return target;
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "CONVERSION_ERROR",
                    "Fayl PDF-ə çevrilə bilmədi.");
        } finally {
            try {
                Files.deleteIfExists(source);
            } catch (Exception ignored) {
            }
        }
    }

    public void deletePreview(String fileId) {
        Map<String, Object> row = d1.queryOne("SELECT local_path FROM converted_previews WHERE file_id = ?", fileId);
        if (row != null) {
            try {
                Files.deleteIfExists(Path.of(az.it25patok.common.Db.str(row, "local_path")));
            } catch (Exception ignored) {
            }
            d1.update("DELETE FROM converted_previews WHERE file_id = ?", fileId);
        }
    }
}
