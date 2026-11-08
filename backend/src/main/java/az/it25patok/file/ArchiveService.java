package az.it25patok.file;

import az.it25patok.common.ApiException;
import az.it25patok.config.AppProperties;
import org.apache.commons.compress.archivers.sevenz.SevenZArchiveEntry;
import org.apache.commons.compress.archivers.sevenz.SevenZFile;
import org.apache.commons.compress.archivers.zip.ZipArchiveEntry;
import org.apache.commons.compress.archivers.zip.ZipFile;
import org.apache.tika.Tika;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Enumeration;
import java.util.List;
import java.util.Locale;

@Service
public class ArchiveService {
    private static final int MAX_ENTRIES = 500;
    private static final long MAX_ENTRY_BYTES = 25L * 1024 * 1024;

    private final StorageService storage;
    private final AppProperties props;
    private final Tika tika = new Tika();

    public ArchiveService(StorageService storage, AppProperties props) {
        this.storage = storage;
        this.props = props;
    }

    public record ArchiveEntryInfo(String name, long size, boolean directory) {}
    public record EntryStream(InputStream stream, long size, String mimeType) {}

    public boolean supported(StoredFile file) {
        String ext = file.extension() == null ? "" : file.extension().toLowerCase(Locale.ROOT);
        return ext.equals("zip") || ext.equals("rar") || ext.equals("7z");
    }

    public List<ArchiveEntryInfo> list(StoredFile file) {
        if (!supported(file)) {
            throw new ApiException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "NOT_ARCHIVE",
                    "Bu fayl arxiv deyil.");
        }
        Path temp = tempFile(file);
        try {
            List<ArchiveEntryInfo> entries = new ArrayList<>();
            switch (file.extension().toLowerCase(Locale.ROOT)) {
                case "zip" -> {
                    try (ZipFile zip = ZipFile.builder().setFile(temp.toFile()).get()) {
                        Enumeration<ZipArchiveEntry> it = zip.getEntries();
                        while (it.hasMoreElements() && entries.size() < MAX_ENTRIES) {
                            ZipArchiveEntry entry = it.nextElement();
                            entries.add(new ArchiveEntryInfo(entry.getName(), entry.getSize(), entry.isDirectory()));
                        }
                    }
                }
                case "rar" -> {
                    try (com.github.junrar.Archive archive = new com.github.junrar.Archive(temp.toFile())) {
                        for (var header : archive.getFileHeaders()) {
                            if (entries.size() >= MAX_ENTRIES) break;
                            entries.add(new ArchiveEntryInfo(header.getFileNameString(),
                                    header.getFullUnpackSize(), header.isDirectory()));
                        }
                    }
                }
                case "7z" -> {
                    try (SevenZFile sevenZ = SevenZFile.builder().setFile(temp.toFile()).get()) {
                        SevenZArchiveEntry entry;
                        while ((entry = sevenZ.getNextEntry()) != null && entries.size() < MAX_ENTRIES) {
                            entries.add(new ArchiveEntryInfo(entry.getName(), entry.getSize(), entry.isDirectory()));
                        }
                    }
                }
                default -> throw new ApiException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "NOT_ARCHIVE",
                        "Bu arxiv formatı dəstəklənmir.");
            }
            return entries;
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "ARCHIVE_ERROR",
                    "Arxiv məzmunu oxuna bilmədi.");
        } finally {
            try {
                Files.deleteIfExists(temp);
            } catch (Exception ignored) {
            }
        }
    }

    public EntryStream openEntry(StoredFile file, String entryName) {
        if (entryName == null || entryName.isBlank()) {
            throw ApiException.badRequest("ENTRY_REQUIRED", "Arxiv daxilində fayl adı tələb olunur.");
        }
        Path temp = tempFile(file);
        try {
            byte[] bytes;
            switch (file.extension().toLowerCase(Locale.ROOT)) {
                case "zip" -> {
                    try (ZipFile zip = ZipFile.builder().setFile(temp.toFile()).get()) {
                        ZipArchiveEntry entry = zip.getEntry(entryName);
                        if (entry == null || entry.isDirectory()) {
                            throw ApiException.notFound("Arxivdə belə fayl yoxdur.");
                        }
                        try (InputStream in = zip.getInputStream(entry)) {
                            bytes = readLimited(in);
                        }
                    }
                }
                case "rar" -> {
                    try (com.github.junrar.Archive archive = new com.github.junrar.Archive(temp.toFile())) {
                        com.github.junrar.rarfile.FileHeader header = archive.getFileHeaders().stream()
                                .filter(h -> h.getFileNameString().equals(entryName))
                                .findFirst().orElseThrow(() -> ApiException.notFound("Arxivdə belə fayl yoxdur."));
                        if (header.isDirectory()) throw ApiException.notFound("Arxivdə belə fayl yoxdur.");
                        ByteArrayOutputStream out = new ByteArrayOutputStream();
                        archive.extractFile(header, out);
                        if (out.size() > MAX_ENTRY_BYTES) {
                            throw new ApiException(HttpStatus.PAYLOAD_TOO_LARGE, "ENTRY_TOO_LARGE",
                                    "Arxiv daxilindəki fayl çox böyükdür.");
                        }
                        bytes = out.toByteArray();
                    }
                }
                case "7z" -> {
                    try (SevenZFile sevenZ = SevenZFile.builder().setFile(temp.toFile()).get()) {
                        SevenZArchiveEntry entry;
                        byte[] found = null;
                        byte[] buffer = new byte[8192];
                        while ((entry = sevenZ.getNextEntry()) != null) {
                            if (entry.isDirectory()) continue;
                            if (entry.getName().equals(entryName)) {
                                ByteArrayOutputStream out = new ByteArrayOutputStream();
                                int read;
                                while ((read = sevenZ.read(buffer)) != -1) {
                                    out.write(buffer, 0, read);
                                    if (out.size() > MAX_ENTRY_BYTES) {
                                        throw new ApiException(HttpStatus.PAYLOAD_TOO_LARGE, "ENTRY_TOO_LARGE",
                                                "Arxiv daxilindəki fayl çox böyükdür.");
                                    }
                                }
                                found = out.toByteArray();
                                break;
                            }
                        }
                        if (found == null) throw ApiException.notFound("Arxivdə belə fayl yoxdur.");
                        bytes = found;
                    }
                }
                default -> throw new ApiException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "NOT_ARCHIVE",
                        "Bu arxiv formatı dəstəklənmir.");
            }
            return new EntryStream(new ByteArrayInputStream(bytes), bytes.length, tika.detect(entryName));
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "ARCHIVE_ERROR",
                    "Arxiv faylı açıla bilmədi.");
        } finally {
            try {
                Files.deleteIfExists(temp);
            } catch (Exception ignored) {
            }
        }
    }

    private Path tempFile(StoredFile file) {
        try {
            Path dir = Path.of(props.files().conversionDir(), "archives");
            Files.createDirectories(dir);
            Path temp = Files.createTempFile(dir, "arc-", "." + file.extension());
            try (InputStream in = storage.download(file.driveFileId(), null, null)) {
                Files.copy(in, temp, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
            }
            return temp;
        } catch (Exception e) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "ARCHIVE_ERROR",
                    "Arxiv faylı yüklənə bilmədi.");
        }
    }

    private static byte[] readLimited(InputStream in) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buffer = new byte[8192];
        int read;
        while ((read = in.read(buffer)) != -1) {
            out.write(buffer, 0, read);
            if (out.size() > MAX_ENTRY_BYTES) {
                throw new ApiException(HttpStatus.PAYLOAD_TOO_LARGE, "ENTRY_TOO_LARGE",
                        "Arxiv daxilindəki fayl çox böyükdür.");
            }
        }
        return out.toByteArray();
    }
}
