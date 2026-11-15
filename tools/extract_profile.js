// Run in the browser on https://www.parkrun.org.uk/parkrunner/588148/all/
// Returns compact JSON describing completed events, plus coordinates for completed UK events.
(async () => {
  const t = [...document.querySelectorAll('table')].find(x => (x.querySelector('caption') || {}).innerText === 'All Results');
  if (!t) return JSON.stringify({ error: 'All Results table not found' });
  const rows = [...t.rows].slice(1);
  const by = {};
  for (const r of rows) {
    const a = r.cells[0].querySelector('a'); if (!a) continue;
    const slug = a.getAttribute('href').split('/')[3];
    const iso = r.cells[1].innerText.trim().split('/').reverse().join('-');
    if (!by[slug]) by[slug] = { c: 0, last: iso };
    by[slug].c++;
  }
  const first = rows[0];
  const latest = { name: first.cells[0].innerText.trim(), date: first.cells[1].innerText.trim().split('/').reverse().join('-') };
  const totalTxt = [...document.querySelectorAll('h3,h2')].map(h => h.innerText).find(s => /parkruns total/i.test(s)) || '';
  const total = parseInt(totalTxt, 10) || rows.length;
  let coords = {};
  try {
    const j = await (await fetch('https://images.parkrun.com/events.json')).json();
    for (const f of j.events.features) {
      const p = f.properties;
      if (p.countrycode === 97 && p.seriesid === 1 && by[p.eventname])
        coords[p.eventname] = [p.EventShortName, +f.geometry.coordinates[1].toFixed(4), +f.geometry.coordinates[0].toFixed(4)];
    }
  } catch (e) { coords = null; }
  return JSON.stringify({ total, distinct: Object.keys(by).length, latest,
    done: Object.entries(by).map(([s, v]) => [s, v.c, v.last]), coords });
})()
