# Parkrun Travel Planner

A personal, single-page parkrun travel planner for Aaron. It ranks the nearest UK parkruns, either ones he hasn't done or all of them, from any start point. It shows leave-by times for arriving early, and live Google drive times when a key has been entered on the phone.

- `index.html`: the whole app. It needs no build step.
- `data.json`: the completed-events list plus a snapshot of UK event locations. A weekday scheduled task refreshes it.

The Google Maps key is never stored in this repo. It's entered once on the phone and kept in that browser only. The key itself is restricted to this site's address and the Routes API.

## Parked ideas

These are nice to have, but not important, practical or possible for now:

- **Event run numbers:** there's no permitted public source. parkrun's official API needs approval, and scraping isn't allowed.
- **Map of the top 10:** something like a small map icon that opens a map only when tapped. It was left out to keep the screen uncluttered.
