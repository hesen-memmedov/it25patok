package az.it25patok.file;

import az.it25patok.auth.AuthUser;
import az.it25patok.auth.CurrentUser;
import az.it25patok.auth.JwtService;
import az.it25patok.common.ApiException;
import az.it25patok.common.ApiResponse;
import az.it25patok.user.User;
import az.it25patok.user.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.InputStream;
import java.io.OutputStream;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/files")
public class FileController {
    private static final Duration FILE_TOKEN_TTL = Duration.ofMinutes(10);

    private final FileService files;
    private final FileRepository repository;
    private final JwtService jwt;
    private final UserRepository users;
    private final CurrentUser currentUser;
    private final ConversionService conversion;
    private final ArchiveService archives;

    public FileController(FileService files, FileRepository repository, JwtService jwt,
                          UserRepository users, CurrentUser currentUser,
                          ConversionService conversion, ArchiveService archives) {
        this.files = files;
        this.repository = repository;
        this.jwt = jwt;
        this.users = users;
        this.currentUser = currentUser;
        this.conversion = conversion;
        this.archives = archives;
    }

    @GetMapping("/{id}/access-token")
    public ApiResponse<Map<String, Object>> accessToken(@PathVariable String id) {
        AuthUser user = currentUser.require();
        StoredFile file = files.requireActive(id);
        if (!files.canView(file, user)) {
            throw ApiException.forbidden("Bu fayla giriş icazəniz yoxdur.");
        }
        String token = jwt.createFileToken(file.id(), user.id(), FILE_TOKEN_TTL);
        return ApiResponse.ok(Map.of(
                "token", token,
                "expiresIn", FILE_TOKEN_TTL.toSeconds(),
                "file", FileDto.from(file)
        ));
    }

    @GetMapping("/{id}/view")
    public void view(@PathVariable String id, @RequestParam(required = false) String t,
                     @RequestHeader(value = "Range", required = false) String range,
                     HttpServletRequest request, HttpServletResponse response) throws Exception {
        AuthUser user = resolve(request, t, id);
        StoredFile file = files.requireActive(id);
        if (!files.canView(file, user)) throw ApiException.forbidden("Bu fayla giriş icazəniz yoxdur.");
        stream(response, file, range, "inline");
    }

    @GetMapping("/{id}/download")
    public void download(@PathVariable String id, @RequestParam(required = false) String t,
                         @RequestHeader(value = "Range", required = false) String range,
                         HttpServletRequest request, HttpServletResponse response) throws Exception {
        AuthUser user = resolve(request, t, id);
        StoredFile file = files.requireActive(id);
        if (!files.canView(file, user)) throw ApiException.forbidden("Bu fayla giriş icazəniz yoxdur.");
        stream(response, file, range, "attachment");
    }

    @GetMapping("/{id}/preview")
    public void preview(@PathVariable String id, @RequestParam(required = false) String t,
                        HttpServletRequest request, HttpServletResponse response) throws Exception {
        AuthUser user = resolve(request, t, id);
        StoredFile file = files.requireActive(id);
        if (!files.canView(file, user)) throw ApiException.forbidden("Bu fayla giriş icazəniz yoxdur.");
        Path pdf = conversion.preview(file);
        response.setStatus(HttpServletResponse.SC_OK);
        response.setContentType("application/pdf");
        response.setContentLengthLong(Files.size(pdf));
        response.setHeader("Content-Disposition", disposition("inline", file.originalName() + ".pdf"));
        response.setHeader("Cache-Control", "private, max-age=600");
        response.setHeader("Content-Security-Policy", "sandbox; default-src 'none'; style-src 'unsafe-inline'");
        try (InputStream in = Files.newInputStream(pdf); OutputStream out = response.getOutputStream()) {
            in.transferTo(out);
        }
    }

    @GetMapping("/{id}/archive")
    public ApiResponse<List<ArchiveService.ArchiveEntryInfo>> archive(@PathVariable String id,
                                                                      @RequestParam(required = false) String t,
                                                                      HttpServletRequest request) {
        AuthUser user = resolve(request, t, id);
        StoredFile file = files.requireActive(id);
        if (!files.canView(file, user)) throw ApiException.forbidden("Bu fayla giriş icazəniz yoxdur.");
        return ApiResponse.ok(archives.list(file));
    }

    @GetMapping("/{id}/archive/entry")
    public void archiveEntry(@PathVariable String id, @RequestParam String name,
                             @RequestParam(required = false) String t,
                             HttpServletRequest request, HttpServletResponse response) throws Exception {
        AuthUser user = resolve(request, t, id);
        StoredFile file = files.requireActive(id);
        if (!files.canView(file, user)) throw ApiException.forbidden("Bu fayla giriş icazəniz yoxdur.");
        ArchiveService.EntryStream entry = archives.openEntry(file, name);
        response.setStatus(HttpServletResponse.SC_OK);
        response.setContentType(entry.mimeType());
        response.setContentLengthLong(entry.size());
        response.setHeader("Content-Disposition", disposition("inline", name));
        response.setHeader("Content-Security-Policy", "sandbox; default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'");
        try (InputStream in = entry.stream(); OutputStream out = response.getOutputStream()) {
            in.transferTo(out);
        }
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable String id) {
        files.delete(id, currentUser.require());
        return ApiResponse.ok();
    }

    private void stream(HttpServletResponse response, StoredFile file, String rangeHeader, String disposition)
            throws Exception {
        long size = file.sizeBytes();
        String contentType = file.mimeType() == null ? "application/octet-stream" : file.mimeType();
        response.setHeader("Accept-Ranges", "bytes");
        response.setHeader("Content-Type", contentType);
        response.setHeader("Content-Disposition", disposition(disposition, file.originalName()));
        response.setHeader("Cache-Control", "private, max-age=300");
        response.setHeader("Content-Security-Policy",
                "sandbox; default-src 'none'; img-src 'self' data:; media-src 'self' blob:; style-src 'unsafe-inline'");

        Range range = parseRange(rangeHeader, size);
        if (range == null) {
            response.setStatus(HttpServletResponse.SC_OK);
            response.setContentLengthLong(size);
            try (InputStream in = files.storage().download(file.driveFileId(), null, null);
                 OutputStream out = response.getOutputStream()) {
                in.transferTo(out);
            }
            return;
        }
        if (range.invalid()) {
            response.setStatus(HttpServletResponse.SC_REQUESTED_RANGE_NOT_SATISFIABLE);
            response.setHeader("Content-Range", "bytes */" + size);
            return;
        }
        long length = range.end() - range.start() + 1;
        response.setStatus(HttpServletResponse.SC_PARTIAL_CONTENT);
        response.setHeader("Content-Range", "bytes " + range.start() + "-" + range.end() + "/" + size);
        response.setContentLengthLong(length);
        try (InputStream in = files.storage().download(file.driveFileId(), range.start(), range.end());
             OutputStream out = response.getOutputStream()) {
            in.transferTo(out);
        }
    }

    private AuthUser resolve(HttpServletRequest request, String token, String fileId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof AuthUser user) {
            return user;
        }
        if (token != null && !token.isBlank()) {
            JwtService.FileToken parsed = jwt.parseFileToken(token);
            if (!fileId.equals(parsed.fileId())) {
                throw ApiException.forbidden("Token başqa fayl üçün verilib.");
            }
            User user = users.findActiveById(parsed.userId());
            if (user == null) throw ApiException.unauthorized("İstifadəçi tapılmadı.");
            return new AuthUser(user.id(), user.email(), user.role().name());
        }
        throw ApiException.unauthorized("Fayla giriş üçün token tələb olunur.");
    }

    private static String disposition(String type, String name) {
        String safe = name == null ? "fayl" : name.replace("\"", "_");
        String ascii = safe.replaceAll("[^\\x20-\\x7E]", "_");
        String encoded = URLEncoder.encode(safe, StandardCharsets.UTF_8).replace("+", "%20");
        return type + "; filename=\"" + ascii + "\"; filename*=UTF-8''" + encoded;
    }

    private record Range(long start, long end, boolean invalid) {}

    private static Range parseRange(String header, long size) {
        if (header == null || !header.startsWith("bytes=")) return null;
        try {
            String spec = header.substring(6).split(",")[0].trim();
            int dash = spec.indexOf('-');
            if (dash < 0) return new Range(0, 0, true);
            String startStr = spec.substring(0, dash).trim();
            String endStr = spec.substring(dash + 1).trim();
            long start;
            long end;
            if (startStr.isEmpty()) {
                long suffix = Long.parseLong(endStr);
                if (suffix <= 0) return new Range(0, 0, true);
                start = Math.max(0, size - suffix);
                end = size - 1;
            } else {
                start = Long.parseLong(startStr);
                end = endStr.isEmpty() ? size - 1 : Math.min(Long.parseLong(endStr), size - 1);
            }
            if (start < 0 || start >= size || end < start) return new Range(0, 0, true);
            return new Range(start, end, false);
        } catch (Exception e) {
            return new Range(0, 0, true);
        }
    }
}
