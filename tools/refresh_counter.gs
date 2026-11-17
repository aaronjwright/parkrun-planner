// Parkrun Travel Planner: reads Google's own month-to-date Routes API usage
// for the parkrun-planner project, so the planner can show it and stop before
// the free amount runs out. Deploy as a Web app (Execute as: Me, Access: Anyone).
// The web app URL is the only "password": keep it private (stored per device only).

var PROJECT = 'parkrun-planner-514814';
var FREE = 5000;            // free billable events per Pro SKU per month
var STOP_AT = 4500;         // planner stops live refreshes at 90%
var TZ = 'America/Los_Angeles'; // Google's free usage resets at midnight Pacific on the 1st

function doGet(e) {
  var cache = CacheService.getScriptCache();
  var hit = cache.get('usage');
  if (hit && !(e && e.parameter && e.parameter.fresh)) return json(JSON.parse(hit));
  var out;
  try {
    out = readUsage();
  } catch (err) {
    out = { error: String(err) };
  }
  if (!out.error) cache.put('usage', JSON.stringify(out), 60);
  return json(out);
}

function monthStart(offsetMonths) {
  var now = new Date();
  var y = Number(Utilities.formatDate(now, TZ, 'yyyy'));
  var m = Number(Utilities.formatDate(now, TZ, 'M')) + (offsetMonths || 0);
  if (m > 12) { m -= 12; y += 1; }
  var guess = new Date(Date.UTC(y, m - 1, 1, 8)); // about midnight Pacific
  var off = Utilities.formatDate(guess, TZ, 'XXX');  // e.g. -08:00 or -07:00
  var mm = (m < 10 ? '0' : '') + m;
  return { label: y + '-' + mm, date: new Date(y + '-' + mm + '-01T00:00:00' + off) };
}

function readUsage() {
  var start = monthStart(0), next = monthStart(1), end = new Date();
  var secs = Math.max(60, Math.ceil((end - start.date) / 1000));
  var filter = 'metric.type="serviceruntime.googleapis.com/quota/rate/net_usage" ' +
               'AND resource.type="consumer_quota" AND resource.labels.service="routes.googleapis.com"';
  var url = 'https://monitoring.googleapis.com/v3/projects/' + PROJECT + '/timeSeries' +
    '?filter=' + encodeURIComponent(filter) +
    '&interval.startTime=' + encodeURIComponent(start.date.toISOString()) +
    '&interval.endTime=' + encodeURIComponent(end.toISOString()) +
    '&aggregation.alignmentPeriod=' + secs + 's' +
    '&aggregation.perSeriesAligner=ALIGN_SUM' +
    '&aggregation.crossSeriesReducer=REDUCE_SUM' +
    '&aggregation.groupByFields=metric.label.quota_metric';
  var res = UrlFetchApp.fetch(url, {
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), 'x-goog-user-project': PROJECT },
    muteHttpExceptions: true
  });
  if (res.getResponseCode() !== 200) throw new Error('Monitoring ' + res.getResponseCode() + ': ' + res.getContentText().slice(0, 300));
  var body = JSON.parse(res.getContentText());
  var matrix = 0, routes = 0, raw = {};
  (body.timeSeries || []).forEach(function (ts) {
    var name = (ts.metric && ts.metric.labels && ts.metric.labels.quota_metric) || '';
    var n = 0;
    (ts.points || []).forEach(function (p) { n += Number(p.value.int64Value || p.value.doubleValue || 0); });
    raw[name] = (raw[name] || 0) + n;
    if (/matrix/i.test(name)) matrix += n; else if (/route/i.test(name)) routes += n;
  });
  return {
    source: 'google', month: start.label, resetsAt: next.date.toISOString(),
    matrix: matrix, routes: routes, free: FREE, stopAt: STOP_AT,
    ok: Math.max(matrix, routes) < STOP_AT, checked: end.toISOString(), raw: raw
  };
}

function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

// Run this once from the editor to grant permission and check the figures.
function test() { Logger.log(JSON.stringify(readUsage())); }
