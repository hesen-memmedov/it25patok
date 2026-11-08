package az.it25patok.file;

import az.it25patok.common.Text;
import az.it25patok.config.AppProperties;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.google.api.client.http.InputStreamContent;
import com.google.api.services.drive.Drive;
import com.google.api.services.drive.model.File;
import com.google.auth.http.HttpCredentialsAdapter;
import com.google.auth.oauth2.GoogleCredentials;
import com.google.auth.oauth2.ServiceAccountCredentials;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.List;
import java.util.Locale;

@Service
@ConditionalOnProperty(name = "app.storage.mode", havingValue = "drive", matchIfMissing = true)
public class DriveStorageService implements StorageService {
    private static final Logger log = LoggerFactory.getLogger(DriveStorageService.class);
    private static final String FOLDER_MIME = "application/vnd.google-apps.folder";
    private static final String SCOPE = "https://www.googleapis.com/auth/drive";

    private final AppProperties props;
    private final Drive drive;
    private final GoogleCredentials credentials;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(15)).build();
    private final Cache<String, String> folderCache = Caffeine.newBuilder()
            .expireAfterWrite(Duration.ofHours(6)).maximumSize(5000).build();

    public DriveStorageService(AppProperties props) {
        this.props = props;
        if (props.drive().rootFolderId() == null || props.drive().rootFolderId().isBlank()) {
            throw new IllegalStateException("DRIVE_ROOT_FOLDER_ID mütləqdir.");
        }
        try {
            GoogleCredentials base;
            if (props.drive().serviceAccountJson() != null && !props.drive().serviceAccountJson().isBlank()) {
                base = ServiceAccountCredentials.fromStream(
                        new ByteArrayInputStream(props.drive().serviceAccountJson().getBytes(StandardCharsets.UTF_8)));
            } else if (props.drive().serviceAccountFile() != null && !props.drive().serviceAccountFile().isBlank()) {
                try (InputStream in = Files.newInputStream(Path.of(props.drive().serviceAccountFile()))) {
                    base = ServiceAccountCredentials.fromStream(in);
                }
            } else {
                base = GoogleCredentials.getApplicationDefault();
            }
            this.credentials = base.createScoped(List.of(SCOPE));
            this.drive = new Drive.Builder(new com.google.api.client.http.javanet.NetHttpTransport(),
                    com.google.api.client.json.gson.GsonFactory.getDefaultInstance(),
                    new HttpCredentialsAdapter(credentials))
                    .setApplicationName(props.drive().applicationName())
                    .build();
        } catch (Exception e) {
            throw new IllegalStateException("Google Drive autentifikasiyası qurula bilmədi", e);
        }
    }

    @Override
    public String upload(String fileId, InputStream input, long size, String fileName, String mimeType,
                         List<String> folders) throws IOException {
        String parent = props.drive().rootFolderId();
        for (String folder : folders) {
            parent = ensureFolder(parent, folder);
        }
        File metadata = new File();
        metadata.setName(Text.safeFileName(fileName));
        metadata.setParents(List.of(parent));
        metadata.setMimeType(mimeType);

        InputStreamContent content = new InputStreamContent(mimeType, input);
        content.setLength(size);
        Drive.Files.Create create = drive.files().create(metadata, content)
                .setFields("id, name, size")
                .setSupportsAllDrives(true);
        create.getMediaHttpUploader().setDirectUploadEnabled(false);
        create.getMediaHttpUploader().setChunkSize(8 * 1024 * 1024);
        File created = create.execute();
        return created.getId();
    }

    @Override
    public InputStream download(String objectId, Long start, Long end) throws IOException {
        try {
            credentials.refreshIfExpired();
            var token = credentials.getAccessToken();
            String accessToken = token == null ? credentials.refreshAccessToken().getTokenValue()
                    : token.getTokenValue();
            var builder = HttpRequest.newBuilder(URI.create(
                            "https://www.googleapis.com/drive/v3/files/" + objectId + "?alt=media&supportsAllDrives=true"))
                    .timeout(Duration.ofMinutes(10))
                    .header("Authorization", "Bearer " + accessToken);
            if (start != null) {
                String range = "bytes=" + start + "-" + (end == null ? "" : end);
                builder.header("Range", range);
            }
            HttpResponse<InputStream> response = http.send(builder.GET().build(),
                    HttpResponse.BodyHandlers.ofInputStream());
            if (response.statusCode() != 200 && response.statusCode() != 206) {
                try (InputStream body = response.body()) {
                    String detail = new String(body.readAllBytes(), StandardCharsets.UTF_8);
                    throw new IOException("Drive yükləmə xətası " + response.statusCode() + ": " + detail);
                }
            }
            return response.body();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IOException("Drive yükləməsi dayandırıldı", e);
        }
    }

    @Override
    public void delete(String objectId) {
        try {
            drive.files().delete(objectId).setSupportsAllDrives(true).execute();
        } catch (Exception e) {
            log.warn("Drive faylı silinə bilmədi {}: {}", objectId, e.getMessage());
        }
    }

    @Override
    public boolean rangeSupported() {
        return true;
    }

    private String ensureFolder(String parentId, String rawName) throws IOException {
        String name = Text.safeFileName(rawName).replace("/", "_").replace("\\", "_");
        String cacheKey = parentId + "/" + name;
        String cached = folderCache.getIfPresent(cacheKey);
        if (cached != null) return cached;
        synchronized (folderCache) {
            cached = folderCache.getIfPresent(cacheKey);
            if (cached != null) return cached;
            String escaped = name.replace("'", "\\'");
            String query = "'" + parentId + "' in parents and name = '" + escaped
                    + "' and mimeType = '" + FOLDER_MIME + "' and trashed = false";
            try {
                var result = drive.files().list()
                        .setQ(query)
                        .setFields("files(id, name)")
                        .setPageSize(1)
                        .setSupportsAllDrives(true)
                        .setIncludeItemsFromAllDrives(true)
                        .execute();
                if (result.getFiles() != null && !result.getFiles().isEmpty()) {
                    String id = result.getFiles().get(0).getId();
                    folderCache.put(cacheKey, id);
                    return id;
                }
                File folder = new File();
                folder.setName(name);
                folder.setMimeType(FOLDER_MIME);
                folder.setParents(List.of(parentId));
                String id = drive.files().create(folder).setFields("id").setSupportsAllDrives(true)
                        .execute().getId();
                folderCache.put(cacheKey, id);
                return id;
            } catch (IOException e) {
                throw new IOException("Drive qovluğu yaradıla bilmədi: " + name, e);
            }
        }
    }
}
