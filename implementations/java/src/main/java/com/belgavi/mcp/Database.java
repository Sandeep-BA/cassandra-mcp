// Author: Sandeep Belgavi
package com.belgavi.mcp;

import com.datastax.oss.driver.api.core.CqlSession;
import com.datastax.oss.driver.api.core.config.*;
import com.datastax.oss.driver.api.core.cql.*;
import javax.net.ssl.*;
import java.net.InetSocketAddress;
import java.nio.file.*;
import java.security.KeyStore;
import java.security.cert.CertificateFactory;
import java.time.Duration;
import java.util.*;

public final class Database implements Service.Database {
    private final Config config;
    private CqlSession session;
    public Database(Config config) { this.config = config; }
    private CqlSession session() {
        if (session == null) {
            var loader = DriverConfigLoader.programmaticBuilder()
                .withDuration(DefaultDriverOption.REQUEST_TIMEOUT, Duration.ofSeconds(5))
                .withDuration(DefaultDriverOption.CONNECTION_CONNECT_TIMEOUT, Duration.ofSeconds(5))
                .withString(DefaultDriverOption.RETRY_POLICY_CLASS, "FallthroughRetryPolicy")
                .withString(DefaultDriverOption.SPECULATIVE_EXECUTION_POLICY_CLASS, "NoSpeculativeExecutionPolicy").build();
            var builder = CqlSession.builder().withConfigLoader(loader).withLocalDatacenter(config.datacenter()).withAuthCredentials(config.username(), config.password());
            config.hosts().forEach(h -> builder.addContactPoint(new InetSocketAddress(h, config.port())));
            if (config.tls()) {
                SSLContext context = tlsContext(config.ca());
                builder.withSslEngineFactory(new com.datastax.oss.driver.api.core.ssl.SslEngineFactory() {
                  @Override public SSLEngine newSslEngine(com.datastax.oss.driver.api.core.metadata.EndPoint endpoint) {
                    java.net.SocketAddress remote = endpoint.resolve();
                    String host = remote instanceof InetSocketAddress a ? a.getHostString() : remote.toString();
                    int port = remote instanceof InetSocketAddress a ? a.getPort() : config.port();
                    SSLEngine engine = context.createSSLEngine(host, port);
                    engine.setUseClientMode(true);
                    SSLParameters params = engine.getSSLParameters(); params.setEndpointIdentificationAlgorithm("HTTPS"); engine.setSSLParameters(params);
                    return engine;
                  }
                  @Override public void close() {}
                });
            }
            session = builder.build();
        }
        return session;
    }
    static SSLContext tlsContext(String ca) {
        try {
            if (ca == null) return SSLContext.getDefault();
            KeyStore store = KeyStore.getInstance(KeyStore.getDefaultType()); store.load(null);
            try (var input = Files.newInputStream(Path.of(ca))) {
                int i = 0; for (var cert : CertificateFactory.getInstance("X.509").generateCertificates(input)) store.setCertificateEntry("ca-" + i++, cert);
            }
            var manager = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm()); manager.init(store);
            SSLContext context = SSLContext.getInstance("TLS"); context.init(null, manager.getTrustManagers(), null); return context;
        } catch (Exception e) { throw new IllegalArgumentException("Invalid TLS CA configuration"); }
    }
    @Override public Service.Page execute(String query, List<Object> values, int pageSize) {
        BoundStatement statement = session().prepare(query).bind(values.toArray()).setPageSize(pageSize).setTimeout(Duration.ofSeconds(5)).setIdempotent(true);
        // AsyncResultSet.currentPage never follows the next page implicitly.
        var result = session.executeAsync(statement).toCompletableFuture().join();
        List<Map<String, Object>> rows = new ArrayList<>();
        for (var row : result.currentPage()) {
            Map<String, Object> data = new LinkedHashMap<>();
            for (var column : row.getColumnDefinitions()) data.put(column.getName().asInternal(), row.getObject(column.getName()));
            rows.add(data);
        }
        return new Service.Page(rows, result.hasMorePages());
    }
    @Override public void close() { if (session != null) session.close(); }
}
