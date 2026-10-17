# Java Cassandra MCP

Author: **Sandeep Belgavi**

An executable stdio MCP server using the official MCP Java SDK 2.1.0 and Apache Cassandra Java driver 4.19.4. Java 17+ and Maven 3.9+ are required.

From the repository root:

```sh
mvn -f implementations/java/pom.xml verify
java -jar implementations/java/target/cassandra-mcp.jar
```

The JAR waits for an MCP client. Use `command: "java"`, `args: ["-jar", "/absolute/path/cassandra-mcp.jar"]` in your client's stdio configuration, plus the `CASSANDRA_*` settings in the [root README](../../README.md). On Windows use forward slashes or escaped backslashes in JSON paths. All dependencies are bundled in the executable JAR; source builds are the default distribution.

The tools are `list_tables`, `describe_table` and `read_partition`. SELECT-only credentials, exact table permissions and TLS verification are required outside loopback. `CASSANDRA_CA_FILE` accepts a PEM certificate bundle; when absent Java's default trust store applies. The client must have network connectivity to Cassandra's advertised nodes and the correct local datacenter.

Supported partition keys: text/varchar/ascii, int/bigint/smallint/tinyint/varint, UUID/timeuuid, boolean, float/double. Use strings for integers beyond JSON's safe precision. Complex, date, timestamp and blob partition keys are rejected. Large integer and non-JSON result values are serialized as strings to avoid silent JSON precision loss. The interface is for inspection, not lossless export.

Limits: 100 rows, 32 columns, 64 KiB output, one active request and 30 admitted calls/minute per process. Schema reads cap at 256 columns. Driver query timeout is five seconds, with no retries or speculative execution; session initialization and schema preparation can take additional time. Large cells can allocate memory before the serialized output check. No HTTP endpoint, account authentication, per-tenant row filtering or automatic pagination.

JUnit tests use a fake database and test authorization, parameter binding, limits and redaction. `node scripts/check_transports.mjs` also checks the built JAR through a real MCP client. Live Cassandra compatibility is not implied by either test suite. The process is owned by the MCP host; the host should terminate it when disconnecting.
