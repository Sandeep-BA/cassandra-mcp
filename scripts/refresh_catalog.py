"""Author: Sandeep Belgavi. Read-only upstream checks; never installs catalog servers."""
import concurrent.futures
import datetime
import json
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]


def github(path):
    result = subprocess.run(["gh", "api", path], capture_output=True, encoding="utf-8", timeout=45)
    if result.returncode:
        raise ValueError(result.stderr.strip().splitlines()[0])
    return json.loads(result.stdout)


def inspect(row):
    repo, category, summary = row
    meta = github("repos/" + repo)
    readme = github("repos/" + repo + "/readme")
    if meta["archived"] or meta["disabled"]:
        raise ValueError("archived or disabled")
    import base64
    content = base64.b64decode(readme.get("content", "")).decode("utf-8", errors="replace")
    if "mcp" not in content.lower() and "model context protocol" not in content.lower():
        raise ValueError("README lacks MCP evidence")
    return {"repository": meta["full_name"], "name": meta["name"], "category": category, "summary": summary,
            "url": meta["html_url"], "documentation": readme["html_url"], "stars": meta["stargazers_count"],
            "language": meta["language"] or "Mixed", "license": (meta.get("license") or {}).get("spdx_id", "Not specified"),
            "pushedAt": meta["pushed_at"], "archived": meta["archived"], "source": meta["url"], "readmeSha": readme["sha"],
            "verification": "Repository and README checked; server not executed"}


def main():
    rows = [line.split("\t") for line in (ROOT / "catalog/seeds.tsv").read_text().splitlines() if line and not line.startswith("#")]
    if len({r[0].lower() for r in rows}) != len(rows):
        print("Duplicate seed repositories; fix selection before refreshing", file=sys.stderr)
        return 1
    results, failures = [], []
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        futures = {pool.submit(inspect, row): row[0] for row in rows}
        for future in concurrent.futures.as_completed(futures):
            try:
                results.append(future.result())
            except Exception as error:
                failures.append({"repository": futures[future], "reason": str(error)})
    # Never replace a complete catalog with a partial or redirected duplicate selection.
    ids = {r["repository"].lower() for r in results}
    report = {"checkedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(), "author": "Sandeep Belgavi", "failures": failures, "validCount": len(results), "uniqueCount": len(ids)}
    (ROOT / "catalog/check-report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    if failures or len(results) != 100 or len(ids) != 100:
        print(json.dumps(report, indent=2)); return 1
    results.sort(key=lambda r: (-r["stars"], r["repository"].lower()))
    for rank, row in enumerate(results, 1):
        row["rankWithinSelection"] = rank
    payload = {"author": "Sandeep Belgavi", "checkedAt": report["checkedAt"], "methodology": "100 curated public, non-archived MCP projects; ranked by repository stars within this selection. Not a global top-100 ranking, security endorsement, or proof of runtime compatibility. Suite stars apply to the whole repository.", "servers": results}
    (ROOT / "catalog/servers.json").write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print("Verified and wrote 100 unique upstream repositories")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
