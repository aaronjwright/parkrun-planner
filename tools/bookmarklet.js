/* "Update parkrun planner" bookmarklet. Tap it on https://www.parkrun.org.uk/parkrunner/588148/all/
   It runs the same extraction as extract_profile.js, then opens the planner, which sends the result
   to GitHub (the refresh-completed workflow runs tools/update_done.py and commits data.json).
   Keep this file free of line comments: it is turned into a javascript: URL by the planner's Settings. */
(async () => {
  const PLANNER = 'https://aaronjwright.github.io/parkrun-planner/';
  if (!/^\/parkrunner\/588148\/all\/?$/.test(location.pathname) || !/parkrun\./.test(location.hostname)) {
    alert('Open your parkrun results page first (parkrunner 588148, All results), then tap this bookmark again.');
    return;
  }
  const t = [...document.querySelectorAll('table')].find(x => (x.querySelector('caption') || {}).innerText === 'All Results');
  if (!t) { alert('The All Results table wasn’t found on this page.'); return; }
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
  const out = JSON.stringify({ athlete: 588148, total, distinct: Object.keys(by).length, latest,
    done: Object.entries(by).map(([s, v]) => [s, v.c, v.last]), coords });
  location.href = PLANNER + '#import=' + encodeURIComponent(out);
})();
