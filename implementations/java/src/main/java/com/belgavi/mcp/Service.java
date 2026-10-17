// Author: Sandeep Belgavi
package com.belgavi.mcp;

import java.util.*;
import java.util.stream.Collectors;

public final class Service {
    public static final class Rejected extends RuntimeException { public Rejected(String message) { super(message); } }
    public record Page(List<Map<String, Object>> rows, boolean more) {}
    public interface Database extends AutoCloseable {
        Page execute(String query, List<Object> values, int pageSize);
        default void close() {}
    }
    private final Database database;
    public final Set<String> tables;
    public Service(Database database, Set<String> tables) { this.database = database; this.tables = Set.copyOf(tables); }
    public List<Map<String, Object>> schema(String keyspace, String table) {
        if (!Config.ID.matcher(keyspace).matches() || !Config.ID.matcher(table).matches() || !tables.contains(keyspace + "." + table)) throw new Rejected("Table is not authorized");
        Page page = database.execute("SELECT column_name, kind, position, type FROM system_schema.columns WHERE keyspace_name = ? AND table_name = ?", List.of(keyspace, table), 257);
        if (page.rows.isEmpty() || page.rows.size() > 256 || page.more) throw new Rejected("Missing schema or schema exceeds 256 columns");
        return page.rows.stream().map(r -> Map.<String, Object>of("name", r.get("column_name"), "kind", r.get("kind"), "position", r.get("position"), "type", r.get("type"))).toList();
    }
    static String quote(String s) { return "\"" + s.replace("\"", "\"\"") + "\""; }
    public Map<String, Object> read(String keyspace, String table, Map<String, Object> partition, List<String> columns, int limit) {
        var schema = schema(keyspace, table);
        var keys = schema.stream().filter(c -> c.get("kind").equals("partition_key")).sorted(Comparator.comparingInt(c -> ((Number)c.get("position")).intValue())).toList();
        if (keys.isEmpty() || keys.size() > 16 || !partition.keySet().equals(keys.stream().map(c -> (String)c.get("name")).collect(Collectors.toSet()))) throw new Rejected("Provide exactly every partition-key column");
        var allowed = schema.stream().map(c -> (String)c.get("name")).collect(Collectors.toSet());
        if (columns.isEmpty() || columns.size() > 32 || new HashSet<>(columns).size() != columns.size() || !allowed.containsAll(columns)) throw new Rejected("Select distinct columns from the table schema");
        if (limit < 1 || limit > 100) throw new Rejected("Limit must be 1-100");
        var values = keys.stream().map(c -> convert(partition.get(c.get("name")), (String)c.get("type"))).toList();
        String query = "SELECT " + columns.stream().map(Service::quote).collect(Collectors.joining(", ")) + " FROM " + quote(keyspace) + "." + quote(table) + " WHERE " + keys.stream().map(c -> quote((String)c.get("name")) + " = ?").collect(Collectors.joining(" AND ")) + " LIMIT " + limit;
        var page = database.execute(query, values, limit);
        var rows = page.rows.stream().map(r -> { Map<String, Object> row = new LinkedHashMap<>(); columns.forEach(c -> row.put(c, r.get(c))); return row; }).toList();
        return Map.of("rows", rows, "limit", limit, "possiblyMore", page.more || rows.size() == limit);
    }
    static Object convert(Object value, String type) {
        if (value instanceof String s && s.length() > 2048) throw new Rejected("Partition key exceeds 2048 characters");
        try {
            return switch(type) {
                case "text", "varchar", "ascii" -> { if (!(value instanceof String)) throw new IllegalArgumentException(); yield value; }
                case "uuid", "timeuuid" -> UUID.fromString((String)value);
                case "int" -> Integer.valueOf(value.toString());
                case "bigint" -> Long.valueOf(value.toString());
                case "smallint" -> Short.valueOf(value.toString());
                case "tinyint" -> Byte.valueOf(value.toString());
                case "varint" -> new java.math.BigInteger(value.toString());
                case "boolean" -> { if (!(value instanceof Boolean)) throw new IllegalArgumentException(); yield value; }
                case "float" -> { float v = Float.parseFloat(value.toString()); if (!Float.isFinite(v)) throw new IllegalArgumentException(); yield v; }
                case "double" -> { double v = Double.parseDouble(value.toString()); if (!Double.isFinite(v)) throw new IllegalArgumentException(); yield v; }
                default -> throw new IllegalArgumentException();
            };
        } catch (RuntimeException e) { throw new Rejected("Unsupported partition key type or value; see Java README"); }
    }
}
