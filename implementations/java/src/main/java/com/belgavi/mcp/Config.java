// Author: Sandeep Belgavi
package com.belgavi.mcp;

import java.util.*;
import java.util.regex.Pattern;

public record Config(Set<String> tables, List<String> hosts, int port, String datacenter,
                     String username, String password, boolean tls, String ca) {
    public static final Pattern ID = Pattern.compile("[a-z][a-z0-9_]{0,47}");
    public static Config load(Map<String, String> env) {
        Set<String> tables = new LinkedHashSet<>();
        for (String value : env.getOrDefault("CASSANDRA_TABLES", "").split(",")) {
            String name = value.trim();
            String[] parts = name.split("\\.", -1);
            if (parts.length != 2 || !ID.matcher(parts[0]).matches() || !ID.matcher(parts[1]).matches()
                    || parts[0].equals("system") || parts[0].startsWith("system_")) throw new IllegalArgumentException("Invalid allowlist");
            tables.add(name);
        }
        if (tables.isEmpty() || tables.size() > 50) throw new IllegalArgumentException("Invalid allowlist size");
        String user = env.get("CASSANDRA_USERNAME"), password = env.get("CASSANDRA_PASSWORD");
        if (user == null || user.isBlank() || password == null || password.isBlank()) throw new IllegalArgumentException("Credentials required");
        List<String> hosts = Arrays.stream(env.getOrDefault("CASSANDRA_CONTACT_POINTS", "127.0.0.1").split(",", -1)).map(String::trim).toList();
        if (hosts.stream().anyMatch(h -> !h.matches("[a-zA-Z0-9.:-]+"))) throw new IllegalArgumentException("Invalid host");
        String tls = env.getOrDefault("CASSANDRA_TLS", "true");
        if (!Set.of("true", "false").contains(tls) || (tls.equals("false") && hosts.stream().anyMatch(h -> !Set.of("localhost", "127.0.0.1", "::1").contains(h)))) throw new IllegalArgumentException("TLS required off loopback");
        int port = Integer.parseInt(env.getOrDefault("CASSANDRA_PORT", "9042"));
        if (port < 1 || port > 65535) throw new IllegalArgumentException("Invalid port");
        return new Config(Collections.unmodifiableSet(tables), hosts, port, env.getOrDefault("CASSANDRA_LOCAL_DATACENTER", "datacenter1"), user, password, tls.equals("true"), env.get("CASSANDRA_CA_FILE"));
    }
    @Override public String toString() { return "Config[credentials redacted]"; }
}
