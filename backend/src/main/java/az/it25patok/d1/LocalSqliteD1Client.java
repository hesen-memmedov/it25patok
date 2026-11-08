package az.it25patok.d1;

import az.it25patok.common.Time;
import az.it25patok.config.AppProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Lokal inkişaf üçün SQLite. SQL sintaksisi D1 ilə eynidir. */
@Component
@ConditionalOnProperty(name = "app.d1.mode", havingValue = "local")
public class LocalSqliteD1Client implements D1Client {
    private static final Logger log = LoggerFactory.getLogger(LocalSqliteD1Client.class);
    private final String url;

    public LocalSqliteD1Client(AppProperties props) {
        Path path = Path.of(props.d1().localPath()).toAbsolutePath();
        try {
            if (path.getParent() != null) Files.createDirectories(path.getParent());
        } catch (IOException e) {
            throw new D1Exception("Lokal DB qovluğu yaradıla bilmədi", e);
        }
        this.url = "jdbc:sqlite:" + path;
        migrate();
    }

    private Connection connect() throws SQLException {
        Connection connection = DriverManager.getConnection(url);
        try (java.sql.Statement statement = connection.createStatement()) {
            statement.execute("PRAGMA foreign_keys = ON");
            statement.execute("PRAGMA busy_timeout = 5000");
        }
        return connection;
    }

    private void migrate() {
        try (Connection connection = connect(); java.sql.Statement statement = connection.createStatement()) {
            statement.execute("""
                    CREATE TABLE IF NOT EXISTS schema_migrations (
                      version TEXT PRIMARY KEY,
                      applied_at INTEGER NOT NULL
                    )
                    """);
            var resolver = new PathMatchingResourcePatternResolver();
            Resource[] resources = resolver.getResources("classpath:db/migrations/*.sql");
            Arrays.sort(resources, Comparator.comparing(r -> r.getFilename() == null ? "" : r.getFilename()));
            for (Resource resource : resources) {
                String version = resource.getFilename();
                try (PreparedStatement check = connection.prepareStatement(
                        "SELECT 1 FROM schema_migrations WHERE version = ?")) {
                    check.setString(1, version);
                    try (ResultSet rs = check.executeQuery()) {
                        if (rs.next()) continue;
                    }
                }
                String sql = new String(resource.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
                for (String part : splitStatements(sql)) {
                    try (java.sql.Statement exec = connection.createStatement()) {
                        exec.execute(part);
                    }
                }
                try (PreparedStatement insert = connection.prepareStatement(
                        "INSERT INTO schema_migrations(version, applied_at) VALUES (?, ?)")) {
                    insert.setString(1, version);
                    insert.setLong(2, Time.now());
                    insert.executeUpdate();
                }
                log.info("Lokal migrasiya tətbiq olundu: {}", version);
            }
        } catch (Exception e) {
            throw new D1Exception("Lokal DB migrasiyası uğursuz oldu", e);
        }
    }

    private static List<String> splitStatements(String sql) {
        List<String> result = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        for (String line : sql.split("\n")) {
            String trimmed = line.trim();
            if (trimmed.startsWith("--") || trimmed.isEmpty()) continue;
            current.append(line).append('\n');
            if (trimmed.endsWith(";")) {
                String statement = current.toString().trim();
                statement = statement.substring(0, statement.length() - 1).trim();
                if (!statement.isBlank()) result.add(statement);
                current.setLength(0);
            }
        }
        if (!current.toString().isBlank()) result.add(current.toString().trim());
        return result;
    }

    @Override
    public List<Map<String, Object>> query(String sql, Object... params) {
        return queryResult(sql, params).rows();
    }

    @Override
    public Result queryResult(String sql, Object... params) {
        try (Connection connection = connect(); PreparedStatement ps = connection.prepareStatement(sql)) {
            bind(ps, params);
            boolean hasResultSet = ps.execute();
            if (hasResultSet) {
                try (ResultSet rs = ps.getResultSet()) {
                    List<Map<String, Object>> rows = new ArrayList<>();
                    ResultSetMetaData meta = rs.getMetaData();
                    while (rs.next()) {
                        Map<String, Object> row = new LinkedHashMap<>();
                        for (int i = 1; i <= meta.getColumnCount(); i++) {
                            row.put(meta.getColumnLabel(i), rs.getObject(i));
                        }
                        rows.add(row);
                    }
                    return new Result(rows, 0, 0);
                }
            }
            return new Result(List.of(), Math.max(0, ps.getUpdateCount()), 0);
        } catch (SQLException e) {
            throw new D1Exception("Lokal SQL xətası: " + e.getMessage(), e);
        }
    }

    @Override
    public int update(String sql, Object... params) {
        return (int) queryResult(sql, params).changes();
    }

    @Override
    public List<Result> batch(List<Statement> statements) {
        try (Connection connection = connect()) {
            connection.setAutoCommit(false);
            List<Result> results = new ArrayList<>();
            try {
                for (Statement statement : statements) {
                    try (PreparedStatement ps = connection.prepareStatement(statement.sql())) {
                        bind(ps, statement.params().toArray());
                        int changes = ps.executeUpdate();
                        results.add(new Result(List.of(), Math.max(0, changes), 0));
                    }
                }
                connection.commit();
                return results;
            } catch (Exception e) {
                connection.rollback();
                throw e;
            } finally {
                connection.setAutoCommit(true);
            }
        } catch (Exception e) {
            throw new D1Exception("Lokal batch xətası: " + e.getMessage(), e);
        }
    }

    private static void bind(PreparedStatement ps, Object[] params) throws SQLException {
        for (int i = 0; i < params.length; i++) {
            Object p = params[i];
            if (p instanceof Boolean b) ps.setInt(i + 1, b ? 1 : 0);
            else if (p instanceof Enum<?> e) ps.setString(i + 1, e.name());
            else ps.setObject(i + 1, p);
        }
    }
}
