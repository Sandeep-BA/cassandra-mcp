"""Author: Sandeep Belgavi. Fixtures never contact a database."""
import json
import pytest
from cassandra_mcp.server import Config, Guard, Rejected, Service, key_value

ENV = {"CASSANDRA_TABLES": "demo.events", "CASSANDRA_USERNAME": "reader", "CASSANDRA_PASSWORD": "fixture"}


class Database:
    def __init__(self):
        self.calls = []

    def execute(self, query, params, size):
        self.calls.append((query, params, size))
        if "system_schema" in query:
            return [{"column_name": "tenant", "kind": "partition_key", "position": 0, "type": "text"}, {"column_name": "body", "kind": "regular", "position": -1, "type": "text"}], False
        return [{"tenant": "x", "body": "hello"}], False


@pytest.mark.parametrize("override", [{"CASSANDRA_TABLES": ""}, {"CASSANDRA_TABLES": "system_auth.roles"}, {"CASSANDRA_TABLES": "demo.x;DROP"}, {"CASSANDRA_PASSWORD": ""}, {"CASSANDRA_TLS": "false", "CASSANDRA_CONTACT_POINTS": "example.com"}, {"CASSANDRA_PORT": "0"}])
def test_invalid_config(override):
    with pytest.raises(ValueError):
        Config.load({**ENV, **override})


def test_tls_default():
    assert Config.load(ENV).tls


def test_unauthorized_before_access():
    db = Database()
    with pytest.raises(Rejected):
        Service(db, ["demo.events"]).schema("private", "users")
    assert not db.calls


def test_bound_injection():
    db = Database()
    result = Service(db, ["demo.events"]).read("demo", "events", {"tenant": "x'; DROP TABLE events;--"}, ["body"], 10)
    assert db.calls[1][0] == 'SELECT "body" FROM "demo"."events" WHERE "tenant" = ? LIMIT 10'
    assert db.calls[1][1] == ["x'; DROP TABLE events;--"]
    assert result["rows"] == [{"body": "hello"}]


@pytest.mark.parametrize("partition,columns,limit", [({}, ["body"], 1), ({"tenant": "x", "extra": 1}, ["body"], 1), ({"tenant": "x"}, ["secret"], 1), ({"tenant": "x"}, ["body", "body"], 1), ({"tenant": "x"}, ["body"], 101)])
def test_rejected_queries(partition, columns, limit):
    db = Database()
    with pytest.raises(Rejected):
        Service(db, ["demo.events"]).read("demo", "events", partition, columns, limit)
    assert len(db.calls) == 1


def test_guard_limits_and_redaction():
    logs = []
    guard = Guard(audit=logs.append)
    def fail():
        raise RuntimeError("secret-password")
    assert "secret-password" not in guard.call("test", fail).content[0].text
    assert guard.call("test", lambda: "x" * 65537).isError
    for _ in range(28):
        guard.call("test", lambda: {})
    assert "Rate limit" in guard.call("test", lambda: {}).content[0].text
    assert "secret-password" not in json.dumps(logs)


def test_guard_concurrency_and_window_reset():
    now = [0]
    guard = Guard(clock=lambda: now[0], audit=lambda _: None)
    guard.lock.acquire()
    assert "in progress" in guard.call("test", lambda: {}).content[0].text
    guard.lock.release()
    for _ in range(30):
        assert not guard.call("test", lambda: {}).isError
    now[0] = 61
    assert not guard.call("test", lambda: {}).isError


def test_key_types():
    assert key_value("9223372036854775807", "bigint") == 9223372036854775807
    with pytest.raises(Rejected):
        key_value(True, "int")
