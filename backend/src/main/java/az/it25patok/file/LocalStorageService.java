package az.it25patok.file;

import az.it25patok.common.Ids;
import az.it25patok.common.Text;
import az.it25patok.config.AppProperties;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import java.io.FilterInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.List;

@Service
@ConditionalOnProperty(name = "app.storage.mode", havingValue = "local")
public class LocalStorageService implements StorageService {
    private final Path root;

    public LocalStorageService(AppProperties props) throws IOException {
        this.root = Path.of(props.storage().localRoot()).toAbsolutePath().normalize();
        Files.createDirectories(root);
    }

    @Override
    public String upload(String fileId, InputStream input, long size, String fileName, String mimeType,
                         List<String> folders) throws IOException {
        Path folder = root;
        for (String part : folders) {
            folder = folder.resolve(sanitizeSegment(part));
        }
        Files.createDirectories(folder);
        String storedName = fileId + "-" + Text.safeFileName(fileName);
        Path target = folder.resolve(storedName).normalize();
        if (!target.startsWith(root)) throw new IOException("Yol təhlükəsizlik yoxlamasından keçmədi.");
        Files.copy(input, target, StandardCopyOption.REPLACE_EXISTING);
        return root.relativize(target).toString().replace('\\', '/');
    }

    @Override
    public InputStream download(String objectId, Long start, Long end) throws IOException {
        Path path = root.resolve(objectId).normalize();
        if (!path.startsWith(root)) throw new IOException("Yol təhlükəsizlik yoxlamasından keçmədi.");
        InputStream input = Files.newInputStream(path);
        if (start != null) {
            input.skipNBytes(start);
        }
        if (end != null && start != null) {
            long length = end - start + 1;
            return new FilterInputStream(input) {
                private long remaining = length;

                @Override
                public int read() throws IOException {
                    if (remaining <= 0) return -1;
                    int value = super.read();
                    if (value >= 0) remaining--;
                    return value;
                }

                @Override
                public int read(byte[] b, int off, int len) throws IOException {
                    if (remaining <= 0) return -1;
                    int read = super.read(b, off, (int) Math.min(len, remaining));
                    if (read > 0) remaining -= read;
                    return read;
                }
            };
        }
        return input;
    }

    @Override
    public void delete(String objectId) {
        try {
            Path path = root.resolve(objectId).normalize();
            if (path.startsWith(root)) Files.deleteIfExists(path);
        } catch (IOException ignored) {
        }
    }

    @Override
    public boolean rangeSupported() {
        return true;
    }

    private static String sanitizeSegment(String value) {
        String safe = Text.safeFileName(value).replace('/', '_').replace('\\', '_');
        return safe.isBlank() ? "qovluq" : safe;
    }
}
