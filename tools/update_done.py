#!/usr/bin/env python3
"""Merge the output of extract_profile.js into data.json.

Usage: python3 tools/update_done.py extract.json
Only completed events in the UK feed (coords) are written to the done list,
so overseas events never appear in the planner.
"""
import json, sys, datetime, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
src = json.loads(pathlib.Path(sys.argv[1]).read_text(encoding="utf-8"))
if isinstance(src, str):
    src = json.loads(src)
if "error" in src:
    sys.exit("extract failed: " + src["error"])

data_path = root / "data.json"
data = json.loads(data_path.read_text(encoding="utf-8"))

snap_lines = [l for l in data["snapshot"].split("\n") if l]
snap = {l.split("|")[0]: l for l in snap_lines}
coords = src.get("coords")
if coords is None:  # events feed unreachable: keep known UK events only
    uk = set(snap)
else:
    uk = set(coords)
    for slug, (name, lat, lon) in coords.items():
        if slug not in snap:
            snap[slug] = f"{slug}|{name}|{lat:.4f}|{lon:.4f}"

done = [f"{s}|{c}|{last}" for s, c, last in src["done"] if s in uk]
latest_d = datetime.date.fromisoformat(src["latest"]["date"])
old = set(data["done"])

data["done"] = done
data["snapshot"] = "\n".join(snap.values())
data["totalRuns"] = src["total"]
data["distinct"] = src["distinct"]
data["latest"] = f'{src["latest"]["name"]}, {latest_d.day} {latest_d.strftime("%b")}'
data["completedUpdated"] = datetime.date.today().isoformat()

data_path.write_text(json.dumps(data, ensure_ascii=False, indent=0), encoding="utf-8")
added = sorted({d.split("|")[0] for d in done} - {d.split("|")[0] for d in old})
print(f"done list: {len(done)} UK events; total runs {src['total']}; latest {data['latest']}; newly completed: {', '.join(added) or 'none'}")
