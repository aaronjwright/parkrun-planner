#!/usr/bin/env python3
"""Refresh cancellations.json for the Parkrun Travel Planner.

Reads the static cancellations feed used by parkrun's own app (an Azure blob,
not parkrun's web servers) and keeps UK 5k events only, for every upcoming
Saturday plus Christmas Day and New Year's Day. Event numbers are turned into
names using parkrun's events list; if that can't be read, the last saved
copy of the UK names (tools/uk_events.json) is used.
"""
import json, sys, urllib.request, datetime, os, gzip

CANC_URL = "https://saprodweparkrun01.blob.core.windows.net/static/cancellationsV2.json"
EVENTS_URL = "https://images.parkrun.com/events.json"
UA = {"User-Agent": "parkrun-planner (personal, a few reads a week)"}
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
NAMES = os.path.join(HERE, "uk_events.json")
OUT = os.path.join(ROOT, "cancellations.json")


def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
        body = r.read()
    if body[:2] == b"\x1f\x8b":  # the feed is stored gzipped
        body = gzip.decompress(body)
    return json.loads(body.decode("utf-8-sig"))


def uk_names():
    try:
        feats = get(EVENTS_URL)["events"]["features"]
        names = {str(f["id"]): f["properties"]["EventShortName"] for f in feats
                 if f["properties"].get("countrycode") == 97 and f["properties"].get("seriesid") == 1}
        if len(names) > 500:
            with open(NAMES, "w", encoding="utf-8") as fh:
                json.dump(names, fh, ensure_ascii=False, indent=0, sort_keys=True)
            return names, "live"
    except Exception as e:
        print(f"events list unavailable ({e}); using saved names", file=sys.stderr)
    if not os.path.exists(NAMES):
        sys.exit("No event names available: events list unreachable and no saved copy")
    with open(NAMES, encoding="utf-8") as fh:
        return json.load(fh), "saved"


def main():
    raw = get(CANC_URL)
    names, src = uk_names()
    today = datetime.datetime.now(datetime.timezone.utc).date()
    dates = {}
    for c in raw:
        name = names.get(str(c.get("EventNumber")))
        if not name:
            continue  # not a UK 5k event
        d = datetime.date.fromisoformat(str(c.get("Date", ""))[:10])
        if d < today or not (d.weekday() == 5 or (d.month, d.day) in ((12, 25), (1, 1))):
            continue
        dates.setdefault(d.isoformat(), []).append({"name": name, "reason": c.get("Reason") or "Cancelled"})
    for v in dates.values():
        v.sort(key=lambda x: x["name"].lower())
    dates = dict(sorted(dates.items()))

    old = {}
    if os.path.exists(OUT):
        with open(OUT, encoding="utf-8") as fh:
            old = json.load(fh)
    changed = old.get("dates") != dates
    out = {"checked": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
           "source": "parkrun app cancellations feed", "dates": dates}
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(out, fh, ensure_ascii=False, indent=1)
        fh.write("\n")
    total = sum(len(v) for v in dates.values())
    print(f"{total} UK cancellations across {len(dates)} dates (names: {src}); "
          f"{'changed' if changed else 'no change'}")


if __name__ == "__main__":
    main()
