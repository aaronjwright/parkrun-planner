#!/usr/bin/env python3
"""Validate the extract sent by the planner (repository_dispatch payload) before update_done.py uses it.

Usage: python3 tools/check_extract.py "$GITHUB_EVENT_PATH" /tmp/extract.json
Rejects anything that isn't a plausible extract of Aaron's own results page.
"""
import json, re, sys, pathlib

event = json.loads(pathlib.Path(sys.argv[1]).read_text(encoding="utf-8"))
raw = (event.get("client_payload") or {}).get("extract")
if not isinstance(raw, str) or len(raw) > 200_000:
    sys.exit("missing or oversized extract")
src = json.loads(raw)
if "error" in src:
    sys.exit("extract failed: " + str(src["error"]))
if src.get("athlete") != 588148:
    sys.exit("extract is not from parkrunner 588148")

current = json.loads((pathlib.Path(__file__).resolve().parent.parent / "data.json").read_text(encoding="utf-8"))
slug = re.compile(r"^[a-z0-9-]{2,60}$")
date = re.compile(r"^\d{4}-\d{2}-\d{2}$")
ok = (
    isinstance(src.get("total"), int) and src["total"] >= current.get("totalRuns", 0)
    and isinstance(src.get("done"), list) and len(src["done"]) >= 1
    and all(isinstance(d, list) and len(d) == 3 and slug.match(str(d[0])) and isinstance(d[1], int) and date.match(str(d[2])) for d in src["done"])
    and isinstance(src.get("latest"), dict) and date.match(str(src["latest"].get("date", "")))
    and len(str(src["latest"].get("name", ""))) < 80
    and (src.get("coords") is None or (isinstance(src["coords"], dict) and all(
        slug.match(k) and isinstance(v, list) and len(v) == 3 and len(str(v[0])) < 80
        and isinstance(v[1], (int, float)) and isinstance(v[2], (int, float)) for k, v in src["coords"].items())))
)
if not ok:
    sys.exit("extract failed validation (or has fewer runs than data.json already shows)")
src.pop("athlete", None)
pathlib.Path(sys.argv[2]).write_text(json.dumps(src, ensure_ascii=False), encoding="utf-8")
print(f"extract ok: {src['total']} runs, {len(src['done'])} events, latest {src['latest']['name']}")
