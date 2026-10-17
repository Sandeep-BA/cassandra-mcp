"""Author: Sandeep Belgavi. Offline integrity checks for the reviewed snapshot."""
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
data = json.loads((root / "catalog/servers.json").read_text(encoding="utf-8"))
servers = data["servers"]
assert len(servers) == 100
assert len({s["repository"].lower() for s in servers}) == 100
assert [s["stars"] for s in servers] == sorted((s["stars"] for s in servers), reverse=True)
for i, server in enumerate(servers, 1):
    assert server["rankWithinSelection"] == i and not server["archived"]
    assert server["url"] == "https://github.com/" + server["repository"]
    assert server["documentation"].startswith(server["url"] + "/")
    assert server["source"].startswith("https://api.github.com/repos/")
    assert server["summary"] and server["readmeSha"] and server["verification"]
print("Catalog: 100 unique sources, complete metadata, valid ordering")
