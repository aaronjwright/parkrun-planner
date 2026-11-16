// Parkrun Travel Planner: shared monthly count of live refreshes.
// Paste into a new Apps Script project, then Deploy > New deployment > Web app,
// Execute as: Me, Who has access: Anyone. Paste the web app URL into the planner's Settings.
// The URL is the only "password", so keep it private (the planner stores it on each device only).
function doGet(e) {
  var p = (e && e.parameter) || {};
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var props = PropertiesService.getScriptProperties();
    var month = Utilities.formatDate(new Date(), 'Europe/London', 'yyyy-MM');
    var key = 'count_' + month;
    var count = Number(props.getProperty(key) || 0);
    var limit = Math.max(1, Math.min(1000, Number(p.limit) || 180));
    var ok = true;
    if (p.op === 'take') {
      if (count < limit) { count++; props.setProperty(key, String(count)); } else { ok = false; }
    }
    return json({ month: month, count: count, limit: limit, ok: ok });
  } finally {
    lock.releaseLock();
  }
}
function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
