package az.it25patok.d1;

import java.util.List;
import java.util.Map;

public interface D1Client {

    record Statement(String sql, List<Object> params) {}

    record Result(List<Map<String, Object>> rows, long changes, long lastRowId) {}

    List<Map<String, Object>> query(String sql, Object... params);

    default Map<String, Object> queryOne(String sql, Object... params) {
        List<Map<String, Object>> rows = query(sql, params);
        return rows.isEmpty() ? null : rows.get(0);
    }

    Result queryResult(String sql, Object... params);

    int update(String sql, Object... params);

    List<Result> batch(List<Statement> statements);
}
