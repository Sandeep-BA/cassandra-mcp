// Author: Sandeep Belgavi
package com.belgavi.mcp;

import org.junit.jupiter.api.Test;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

class ServiceTest {
    static class Fake implements Service.Database {
        List<String> queries = new ArrayList<>(); List<Object> values;
        public Service.Page execute(String q, List<Object> values, int size) {
            queries.add(q); this.values = values;
            if (q.contains("system_schema")) return new Service.Page(List.of(Map.of("column_name", "tenant", "kind", "partition_key", "position", 0, "type", "text"), Map.of("column_name", "body", "kind", "regular", "position", -1, "type", "text")), false);
            return new Service.Page(List.of(Map.of("body", "hello")), false);
        }
    }
    @Test void configFailsClosed() {
        assertThrows(IllegalArgumentException.class, () -> Config.load(Map.of()));
        assertThrows(IllegalArgumentException.class, () -> Config.load(Map.of("CASSANDRA_TABLES", "system_auth.roles", "CASSANDRA_USERNAME", "u", "CASSANDRA_PASSWORD", "p")));
        assertThrows(IllegalArgumentException.class, () -> Config.load(Map.of("CASSANDRA_TABLES", "demo.events", "CASSANDRA_USERNAME", "u", "CASSANDRA_PASSWORD", "p", "CASSANDRA_TLS", "false", "CASSANDRA_CONTACT_POINTS", "example.com")));
        assertTrue(Config.load(Map.of("CASSANDRA_TABLES", "demo.events", "CASSANDRA_USERNAME", "u", "CASSANDRA_PASSWORD", "p")).tls());
    }
    @Test void authorizationBeforeDatabase() {
        var db = new Fake(); var service = new Service(db, Set.of("demo.events"));
        assertThrows(Service.Rejected.class, () -> service.schema("private", "users")); assertTrue(db.queries.isEmpty());
    }
    @Test void bindsValuesAndBoundsRead() {
        var db = new Fake(); var service = new Service(db, Set.of("demo.events"));
        service.read("demo", "events", Map.of("tenant", "x'; DROP TABLE events;--"), List.of("body"), 10);
        assertEquals("SELECT \"body\" FROM \"demo\".\"events\" WHERE \"tenant\" = ? LIMIT 10", db.queries.get(1));
        assertEquals(List.of("x'; DROP TABLE events;--"), db.values);
    }
    @Test void rejectsIncompleteKeysAndUnknownColumns() {
        var db = new Fake(); var service = new Service(db, Set.of("demo.events"));
        assertThrows(Service.Rejected.class, () -> service.read("demo", "events", Map.of(), List.of("body"), 1));
        assertThrows(Service.Rejected.class, () -> service.read("demo", "events", Map.of("tenant", "x"), List.of("secret"), 1));
        assertThrows(Service.Rejected.class, () -> service.read("demo", "events", Map.of("tenant", "x"), List.of("body"), 101));
        assertEquals(3, db.queries.size());
    }
    @Test void guardWithholdsSecretsAndOversizedRows() {
        var guard = new Main.Guard();
        var result = guard.call("test", () -> { throw new RuntimeException("password=secret"); });
        assertTrue(result.isError()); assertFalse(result.toString().contains("password=secret"));
        assertTrue(guard.call("test", () -> "x".repeat(65537)).isError());
        for (int i = 0; i < 28; i++) assertFalse(guard.call("test", Map::of).isError());
        assertTrue(guard.call("test", Map::of).isError());
    }
    @Test void rejectsNestedWorkAndNormalizesLargeIntegers() {
        var guard = new Main.Guard();
        guard.call("test", () -> { assertTrue(guard.call("test", Map::of).isError()); return Map.of(); });
        assertEquals("9223372036854775807", Main.normalize(Long.MAX_VALUE));
        assertThrows(Service.Rejected.class, () -> Service.convert(true, "int"));
    }
}
