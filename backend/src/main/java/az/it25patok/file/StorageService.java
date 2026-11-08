package az.it25patok.file;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;

public interface StorageService {
    String upload(String fileId, InputStream input, long size, String fileName, String mimeType,
                  List<String> folders) throws IOException;

    InputStream download(String objectId, Long start, Long end) throws IOException;

    void delete(String objectId);

    boolean rangeSupported();
}
