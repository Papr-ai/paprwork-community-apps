// Users/shawkatkabbara/Papr/orgs/Y8D4H7Yp3Z/namespaces/85ZIB7mD1V/apps/6e432b37-6cf2-45f1-9ad8-ec70a56d4a3c/app.ts
import { subscribeJobEvents } from "/__papr__/papr-job-events.ts";
var APP_ID = "6e432b37-6cf2-45f1-9ad8-ec70a56d4a3c";
var DB_SOURCE = "Calendar Reader (40407339)";
var RECORDER_JOB = "095b6dbf-6096-433c-83d9-e7a66b8e459b";
var STOP_JOB = "71c6b7b8-9b7e-4f3a-bfc9-1dee90193bce";
var WHISPER_JOB = "84262b7e-fc23-4b08-914b-7791c78a7736";
var SUMMARIZER_JOB = "069f5b22-f29e-4b24-b001-c8f9d057b0b7";
var PERM_JOB = "be69e2ba-62ff-40d1-8e0f-837c1619434e";
var CALENDAR_JOB = "40407339-ca0b-4650-a009-426201025e81";
var PREP_JOB = "32aa2031-ecba-4188-9a59-e906c7e61e5e";
var BG_JOB = "751f6600-b8e7-4097-8f63-66fe9bb6bd2b";
var AUDIO_DEVICES_JOB = "755d4cab-7b57-48dc-9ade-826768f30997";
var view = "home";
var meetings = [];
var calEvents = [];
var bg = null;
var liveCity = "";
var liveLocationReason = "";
var selectedId = null;
var isRecording = false;
var recordingId = null;
var permissionGranted = null;
var showPermModal = false;
var elapsedSeconds = 0;
var timerInterval = null;
var pollInterval = null;
var saveTimeout = null;
var activeFilter = "all";
var activeTags = [];
var activePeople = [];
var calView = "";
var calWeekOffset = 0;
var mainPage = "meetings";
var activeTab = "notes";
var selectedCalId = null;
var prepPollInterval = null;
var prepLogs = [];
var prepStartTime = 0;
var showBgHero = localStorage.getItem("mm-show-bg") === "true";
var audioDevices = [];
var selectedAudioDevice = { index: -1, name: "" };
var showAudioMenu = false;
var toasts = [];
var toastCounter = 0;
function showToast(type, message, action, duration = 5e3) {
  const id = ++toastCounter;
  toasts.push({ id, type, message, action });
  renderToasts();
  if (!action) setTimeout(() => dismissToast(id), duration);
}
function dismissToast(id) {
  const el = document.querySelector(`[data-toast-id="${id}"]`);
  if (el) {
    el.classList.add("toast-exit");
    setTimeout(() => {
      toasts = toasts.filter((t) => t.id !== id);
      renderToasts();
    }, 300);
  } else {
    toasts = toasts.filter((t) => t.id !== id);
    renderToasts();
  }
}
function renderToasts() {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.className = "toast-container";
    document.body.appendChild(container);
  }
  container.innerHTML = toasts.map((t) => `
    <div class="toast toast-${t.type}" data-toast-id="${t.id}">
      <div class="toast-icon">${t.type === "error" ? icon("alert", 16) : t.type === "success" ? icon("check", 16) : icon("sparkle", 16)}</div>
      <span class="toast-msg">${t.message}</span>
      ${t.action ? `<button class="toast-action" onclick="${t.action.fn}">${t.action.label}</button>` : ""}
      <button class="toast-dismiss" onclick="dismissToast(${t.id})">\xD7</button>
    </div>
  `).join("");
}
window.dismissToast = dismissToast;
window.showToast = showToast;
var recTimerToken = 0;
function startRecTimer() {
  const token = ++recTimerToken;
  const step = () => {
    if (token !== recTimerToken) return;
    elapsedSeconds++;
    const el = document.getElementById("rec-timer");
    if (el) el.textContent = fmtDur(elapsedSeconds);
    setTimeout(step, 1e3);
  };
  setTimeout(step, 1e3);
  return token;
}
async function q(sql, p = []) {
  const r = await fetch("/api/db/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ appId: APP_ID, sourceId: DB_SOURCE, sql, params: p })
  });
  return (await r.json()).rows || [];
}
async function w(sql, p = []) {
  await fetch("/api/db/write", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ appId: APP_ID, sourceId: DB_SOURCE, sql, params: p })
  });
}
async function runJob(id) {
  await fetch("/api/jobs/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jobId: id })
  });
}
async function fetchPrepLogs() {
  try {
    const r = await fetch("/api/jobs/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId: PREP_JOB })
    });
    const data = await r.json();
    const raw = data?.data?.logs || data?.logs || data?.output || data?.stdout || "";
    const readable = [];
    for (const line of raw.split("\n")) {
      const m = line.match(/Tool: (\w+)\((.{0,120})/) || line.match(/tool[_\s]?call[:\s]+(\w+)\((.{0,120})/i);
      if (!m) continue;
      const tool = m[1];
      const args = m[2];
      if (tool === "bash") {
        const cmd = args.replace(/\\/g, "").replace(/"/g, "").slice(0, 80);
        if (cmd.includes("sqlite3")) readable.push("note:Reading meeting data\u2026");
        else if (cmd.includes("grep")) readable.push("eye:Searching documents\u2026");
        else if (cmd.includes("apollo")) readable.push("person:Looking up attendee profiles\u2026");
        else if (cmd.includes("linkedin.com")) readable.push("person:Searching LinkedIn\u2026");
        else if (cmd.includes("exa") || cmd.includes("search")) readable.push("refresh:Searching the web\u2026");
        else if (cmd.includes("curl")) readable.push("refresh:Fetching external data\u2026");
        else readable.push("settings:Running task\u2026");
      } else if (tool === "search_agent_memory") {
        const q2 = args.match(/query.*?[":]\s*"?([^"\\,{}]{8,50})/i)?.[1] || "";
        readable.push(`sparkle:Searching memory${q2 ? ": " + q2.trim() : "\u2026"}`);
      } else if (tool === "read_file" || tool === "read_document") {
        readable.push("note:Reading document\u2026");
      } else if (tool === "add_agent_memory") {
        readable.push("lock:Saving context to memory\u2026");
      } else {
        readable.push(`settings:${tool.replace(/_/g, " ")}\u2026`);
      }
    }
    if (readable.length > 0) {
      prepLogs = readable.slice(-20);
      render();
    } else if (raw.includes("PREP_COMPLETE")) {
      await loadAll();
    }
  } catch {
  }
}
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
async function loadAll() {
  try {
    meetings = await q("SELECT * FROM meetings ORDER BY created_at DESC");
  } catch {
    meetings = [];
  }
  try {
    calEvents = await q(`SELECT id, title, start_time, end_time, calendar_name, meeting_id, 
      COALESCE(attendees, '[]') as attendees, COALESCE(prep_status, '') as prep_status, 
      COALESCE(prep_doc, '') as prep_doc
      FROM calendar_events
      WHERE NOT (start_time LIKE '%T00:00' AND end_time LIKE '%T23:59')
      ORDER BY start_time ASC`);
  } catch {
    calEvents = [];
  }
  try {
    const rows = await q(`SELECT city, reason, prompt, image_url, image_data, generated_on FROM location_background WHERE id='current' LIMIT 1`);
    bg = rows[0] || null;
  } catch {
    bg = null;
  }
  await loadAudioDevices();
  render();
}
async function loadAudioDevices() {
  try {
    audioDevices = await q("SELECT device_index, name FROM audio_devices ORDER BY device_index");
    const settings = await q("SELECT selected_device_index, selected_device_name FROM audio_settings WHERE id=1");
    if (settings.length && settings[0].selected_device_index >= 0) {
      selectedAudioDevice = { index: settings[0].selected_device_index, name: settings[0].selected_device_name };
    }
  } catch {
  }
}
async function refreshAudioDevices() {
  await runJob(AUDIO_DEVICES_JOB);
  await new Promise((r) => setTimeout(r, 2e3));
  await loadAudioDevices();
  render();
}
async function selectAudioDevice(idx, name) {
  selectedAudioDevice = { index: idx, name };
  showAudioMenu = false;
  await w("UPDATE audio_settings SET selected_device_index=?, selected_device_name=?, updated_at=strftime('%s','now') WHERE id=1", [idx, name]);
  render();
}
async function checkPerm() {
  await w("DELETE FROM permission_checks");
  await runJob(PERM_JOB);
  for (let i = 0; i < 30; i++) {
    await sleep(500);
    const rows = await q("SELECT result FROM permission_checks ORDER BY created_at DESC LIMIT 1");
    if (rows.length) {
      permissionGranted = rows[0].result === "PERMISSION_GRANTED";
      return permissionGranted;
    }
  }
  permissionGranted = false;
  return false;
}
async function finalizeMeetingRecording(mid, durationSeconds, savedNotes) {
  if (savedNotes !== void 0) {
    await w("UPDATE meetings SET notes=?, updated_at=strftime('%s','now') WHERE id=?", [savedNotes, mid]);
  }
  if (durationSeconds !== void 0) {
    await w("UPDATE meetings SET duration=?, updated_at=strftime('%s','now') WHERE id=?", [durationSeconds, mid]);
  }
  await w("UPDATE meetings SET status='stopping', updated_at=strftime('%s','now') WHERE id=? AND status IN ('recording','stopping')", [mid]);
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await runJob(STOP_JOB);
      break;
    } catch {
      await sleep(1e3);
    }
  }
  let settled = false;
  for (let i = 0; i < 20; i++) {
    await sleep(1500);
    const rows = await q("SELECT status FROM meetings WHERE id=?", [mid]);
    if (!rows.length) return;
    const s = rows[0].status;
    if (["recorded", "transcribing", "pending", "summarized"].includes(s)) {
      settled = true;
      break;
    }
    if (s === "failed") return;
  }
  if (!settled) {
    await w("UPDATE meetings SET status='recorded', updated_at=strftime('%s','now') WHERE id=? AND status='stopping'", [mid]);
  }
  triggerWhisperWhenReady(mid).catch(() => {
  });
  startPoll(mid);
}
async function handoffActiveRecording() {
  const rows = await q("SELECT id, status FROM meetings WHERE status='recording' ORDER BY created_at DESC LIMIT 1");
  if (!rows.length) return;
  const activeId = rows[0].id;
  if (activeId === recordingId) {
    const editor = document.getElementById("notes-editor");
    const notes = editor ? editor.innerHTML.trim() : "";
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    isRecording = false;
    await finalizeMeetingRecording(activeId, elapsedSeconds, notes || void 0);
    recordingId = null;
    elapsedSeconds = 0;
  } else {
    await finalizeMeetingRecording(activeId);
  }
}
async function startRecording(fromCalId) {
  if (permissionGranted !== true) {
    const ok = await checkPerm();
    if (!ok) {
      showPermModal = true;
      render();
      return;
    }
  }
  await handoffActiveRecording();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  let title = "Meeting \u2014 " + (/* @__PURE__ */ new Date()).toLocaleString(void 0, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  let id = "";
  if (fromCalId) {
    const ev = calEvents.find((e) => e.id === fromCalId);
    if (ev) {
      title = ev.title;
      const existing = await q("SELECT m.id FROM meetings m JOIN calendar_events ce ON ce.meeting_id = m.id WHERE ce.id = ? AND m.status = 'scheduled' LIMIT 1", [fromCalId]);
      if (existing.length) {
        id = existing[0].id;
        await w("UPDATE meetings SET status='recording', date=?, updated_at=strftime('%s','now') WHERE id=?", [now, id]);
      } else {
        id = crypto.randomUUID();
        await w("UPDATE calendar_events SET meeting_id = ? WHERE id = ?", [id, fromCalId]);
      }
    }
  }
  if (!id) {
    id = crypto.randomUUID();
  }
  const check = await q("SELECT id FROM meetings WHERE id=?", [id]);
  if (!check.length) {
    await w("INSERT INTO meetings (id, title, date, status) VALUES (?, ?, ?, 'recording')", [id, title, now]);
  }
  recordingId = id;
  isRecording = true;
  elapsedSeconds = 0;
  selectedId = id;
  view = "meeting";
  render();
  timerInterval = startRecTimer();
  try {
    await runJob(RECORDER_JOB);
  } catch (e) {
    console.error("Recorder job failed:", e);
  }
  await loadAll();
}
async function stopRecording() {
  if (!recordingId) return;
  const editor = document.getElementById("notes-editor");
  const notes = editor ? editor.innerHTML.trim() : "";
  const sid = recordingId;
  isRecording = false;
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  recordingId = null;
  await finalizeMeetingRecording(sid, elapsedSeconds, notes || void 0);
  elapsedSeconds = 0;
  await loadAll();
}
async function triggerWhisperWhenReady(mid) {
  for (let i = 0; i < 45; i++) {
    await sleep(2e3);
    const rows = await q("SELECT status FROM meetings WHERE id=?", [mid]);
    if (!rows.length || rows[0].status === "failed") return;
    if (rows[0].status === "recorded") {
      await runJob(WHISPER_JOB);
      return;
    }
    if (["transcribing", "pending", "summarized", "synced"].includes(rows[0].status)) return;
  }
}
function startPoll(mid) {
  let attempts = 0, last = "";
  if (pollInterval) clearInterval(pollInterval);
  pollInterval = setInterval(async () => {
    if (++attempts > 300) {
      clearInterval(pollInterval);
      return;
    }
    const rows = await q("SELECT status FROM meetings WHERE id=?", [mid]);
    if (!rows.length) return;
    const s = rows[0].status;
    if (s !== last) {
      last = s;
      await loadAll();
      if (s === "pending") runJob(SUMMARIZER_JOB).catch(() => {
      });
    }
    if (s === "summarized" || s === "failed") {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  }, 2e3);
}
function flushSave() {
  const editor = document.getElementById("notes-editor");
  const id = isRecording ? recordingId : selectedId;
  if (!editor || !id) return;
  const html = editor.innerHTML.trim();
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }
  if (activeTab === "prep" && selectedCalId) {
    w("UPDATE calendar_events SET prep_doc=? WHERE id=?", [html, selectedCalId]);
  } else if (activeTab === "notes") {
    w("UPDATE meetings SET summary=?, updated_at=strftime('%s','now') WHERE id=?", [html, id]);
  }
}
function autoSave() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => flushSave(), 1500);
}
function isSameMeetingDay(a, b) {
  return !!a && !!b && a.split("T")[0] === b.split("T")[0];
}
function findLinkedCalEvent(m) {
  const byId = calEvents.find((e) => e.meeting_id === m.id && isSameMeetingDay(e.start_time, m.date));
  if (byId) return byId;
  if (!m.date) return void 0;
  return calEvents.find((e) => e.title.toLowerCase() === m.title.toLowerCase() && isSameMeetingDay(e.start_time, m.date));
}
function getLinkedMeetingForEvent(e) {
  const byId = e.meeting_id ? meetings.find((m) => m.id === e.meeting_id) : null;
  if (byId && isSameMeetingDay(byId.date, e.start_time)) return byId;
  return meetings.find(
    (m) => m.title.toLowerCase() === e.title.toLowerCase() && isSameMeetingDay(m.date, e.start_time)
  ) || null;
}
function hasMeetingContent(m) {
  return !!(m && ((m.notes || "").trim() || (m.summary || "").trim() || (m.transcript || "").trim()));
}
function parseAttendees(json) {
  try {
    return JSON.parse(json || "[]");
  } catch {
    return [];
  }
}
function getInitials(name) {
  if (!name) return "?";
  const parts = name.split(/[\s@.]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}
var avatarColors = ["#0161E0", "#7C3AED", "#059669", "#D97706", "#DC2626", "#0891B2", "#BE185D", "#4F46E5"];
function avatarColor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return avatarColors[Math.abs(h) % avatarColors.length];
}
async function triggerPrep(eventId) {
  const ev = calEvents.find((e) => e.id === eventId);
  if (!ev) return;
  const attendees = parseAttendees(ev.attendees);
  const req = { event_id: eventId, title: ev.title, attendees, start_time: ev.start_time, calendar_name: ev.calendar_name };
  prepLogs = [];
  prepStartTime = Date.now();
  await w("UPDATE calendar_events SET prep_status='preparing', prep_doc=? WHERE id=?", [JSON.stringify(req), eventId]);
  view = "meeting";
  selectedCalId = eventId;
  activeTab = "prep";
  await loadAll();
  runJob(PREP_JOB).catch(() => {
  });
  startPrepPoll(eventId);
}
function startPrepPoll(eventId) {
  if (prepPollInterval) clearInterval(prepPollInterval);
  let attempts = 0;
  const MAX_ATTEMPTS = 200;
  (async () => {
    const rows = await q("SELECT prep_status FROM calendar_events WHERE id=?", [eventId]);
    if (rows.length && rows[0].prep_status === "ready") {
      clearInterval(prepPollInterval);
      prepPollInterval = null;
      prepLogs = [];
      await loadAll();
      return;
    }
  })();
  prepPollInterval = setInterval(async () => {
    attempts++;
    fetchPrepLogs();
    const rows = await q("SELECT prep_status, prep_doc FROM calendar_events WHERE id=?", [eventId]);
    if (rows.length && rows[0].prep_status === "ready") {
      clearInterval(prepPollInterval);
      prepPollInterval = null;
      prepLogs = [];
      await loadAll();
    } else if (attempts >= MAX_ATTEMPTS || rows.length && rows[0].prep_status === "failed") {
      clearInterval(prepPollInterval);
      prepPollInterval = null;
      prepLogs = [];
      showToast("error", "Prep timed out \u2014 agent took too long", { label: "Retry", fn: `triggerPrep('${eventId}')` });
      await w("UPDATE calendar_events SET prep_status='failed' WHERE id=? AND prep_status='preparing'", [eventId]);
      await loadAll();
    }
  }, 3e3);
}
async function recoverStuckPreps() {
  const stuck = await q("SELECT id FROM calendar_events WHERE prep_status='preparing'");
  if (stuck.length > 0) {
    startPrepPoll(stuck[0].id);
  }
}
async function recoverRecordingState() {
  const rows = await q("SELECT id, date FROM meetings WHERE status='recording' LIMIT 1");
  if (rows.length > 0) {
    const m = rows[0];
    isRecording = true;
    recordingId = m.id;
    permissionGranted = true;
    const startTime = new Date(m.date).getTime();
    elapsedSeconds = Math.max(0, Math.floor((Date.now() - startTime) / 1e3));
    if (!timerInterval) {
      timerInterval = startRecTimer();
    }
  }
}
async function detectLiveLocation() {
  const saveLocation = async (city, source, lat = null, lon = null) => {
    liveCity = city;
    liveLocationReason = `${source === "geolocation" ? "Live location" : "Network location"} says ${city}${bg?.city && bg.city !== city ? ` \u2014 overriding calendar-derived ${bg.city}` : ""}`;
    await w(`CREATE TABLE IF NOT EXISTS location_override (id TEXT PRIMARY KEY, city TEXT DEFAULT '', lat REAL, lon REAL, source TEXT DEFAULT '', updated_at INTEGER DEFAULT (strftime('%s','now')))`);
    await w(`INSERT INTO location_override (id, city, lat, lon, source, updated_at) VALUES ('latest', ?, ?, ?, ?, strftime('%s','now')) ON CONFLICT(id) DO UPDATE SET city=excluded.city, lat=excluded.lat, lon=excluded.lon, source=excluded.source, updated_at=excluded.updated_at`, [city, lat, lon, source]);
    render();
    if (city !== bg?.city) {
      await runJob(BG_JOB).catch(() => {
      });
      await sleep(1800);
      await loadAll();
    }
  };
  if ("geolocation" in navigator) {
    try {
      const pos = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: false, timeout: 3500, maximumAge: 60 * 60 * 1e3 }));
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`, { headers: { "Accept": "application/json" } });
      const data = await r.json();
      const addr = data.address || {};
      const city = addr.city || addr.town || addr.village || addr.county || data.name || "";
      if (city) {
        await saveLocation(city, "geolocation", lat, lon);
        return;
      }
    } catch {
    }
  }
  try {
    const r = await fetch("https://ipapi.co/json/");
    const data = await r.json();
    const city = data?.city || data?.region || "";
    if (city) await saveLocation(city, "ip");
  } catch {
  }
}
async function deleteMeeting(id, e) {
  e.stopPropagation();
  await w("DELETE FROM meetings WHERE id=?", [id]);
  if (selectedId === id) {
    selectedId = null;
    view = "home";
  }
  await loadAll();
}
function openMeeting(id, tab) {
  selectedId = id;
  view = "meeting";
  activeTab = tab || "notes";
  const m = meetings.find((x) => x.id === id);
  if (m) {
    const linkedEv = findLinkedCalEvent(m);
    selectedCalId = linkedEv?.id || null;
    if (m.status === "recording" && !isRecording) {
      isRecording = true;
      recordingId = id;
      permissionGranted = true;
      if (!timerInterval) {
        const startTime = new Date(m.date).getTime();
        elapsedSeconds = Math.max(0, Math.floor((Date.now() - startTime) / 1e3));
        timerInterval = startRecTimer();
      }
    }
    if (["stopping", "recorded", "transcribing", "pending"].includes(m.status)) startPoll(id);
    if (m.status === "stopping") triggerWhisperWhenReady(id);
    if (m.status === "recorded") runJob(WHISPER_JOB).catch(() => {
    });
    if (m.status === "pending") runJob(SUMMARIZER_JOB).catch(() => {
    });
  } else {
    const ev = calEvents.find((e) => e.id === id);
    if (ev) {
      selectedCalId = ev.id;
      selectedId = ev.meeting_id || null;
      activeTab = tab || "prep";
    }
  }
  render();
}
function extractTags(m) {
  if (!m.tags) return [];
  try {
    return JSON.parse(m.tags);
  } catch {
    return [];
  }
}
function getAllTags() {
  const all = /* @__PURE__ */ new Set();
  meetings.forEach((m) => extractTags(m).forEach((t) => all.add(t)));
  return [...all];
}
function getAllPeople() {
  const seen = /* @__PURE__ */ new Map();
  meetings.forEach((m) => {
    const ev = findLinkedCalEvent(m);
    if (ev) {
      parseAttendees(ev.attendees).forEach((a) => {
        if (!seen.has(a.email)) seen.set(a.email, a);
      });
    }
  });
  return [...seen.values()].sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email));
}
function filterMeetings() {
  const now = /* @__PURE__ */ new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(todayStart.getDate() - 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  return meetings.filter((m) => {
    const d = new Date(m.date);
    if (activeFilter === "today" && d < todayStart) return false;
    if (activeFilter === "week" && d < weekStart) return false;
    if (activeFilter === "month" && d < monthStart) return false;
    if (activeTags.length > 0 && !activeTags.some((t) => extractTags(m).includes(t))) return false;
    if (activePeople.length > 0) {
      const ev = findLinkedCalEvent(m);
      if (!ev) return false;
      const emails = parseAttendees(ev.attendees).map((a) => a.email);
      if (!activePeople.some((p) => emails.includes(p))) return false;
    }
    return true;
  });
}
function localDateStr(d = /* @__PURE__ */ new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function getTodayEvents() {
  const todayStr = localDateStr();
  return calEvents.filter((e) => e.start_time.startsWith(todayStr));
}
function fmtDur(s) {
  const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}
function pad(n) {
  return String(n).padStart(2, "0");
}
function fmtDate(d) {
  return new Date(d).toLocaleDateString(void 0, { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
function fmtTime(t) {
  return new Date(t).toLocaleTimeString(void 0, { hour: "2-digit", minute: "2-digit" });
}
function esc(s) {
  const d = document.createElement("div");
  d.textContent = s || "";
  return d.innerHTML;
}
function statusLabel(s) {
  return {
    recording: "Recording",
    stopping: "Processing",
    recorded: "Transcribing",
    transcribing: "Transcribing",
    pending: "Summarizing",
    summarized: "Complete",
    synced: "Complete",
    failed: "Failed",
    scheduled: "Scheduled"
  }[s] || "";
}
function statusClass(s) {
  return {
    recording: "status-recording",
    stopping: "status-processing",
    recorded: "status-processing",
    transcribing: "status-processing",
    pending: "status-processing",
    summarized: "status-done",
    failed: "status-failed"
  }[s] || "";
}
function formatSummary(text) {
  if (!text) return "";
  const lines = text.split("\n");
  let html = "";
  let inList = false;
  let inTable = false;
  let tableHeader = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      if (inTable) {
        html += "</tbody></table>";
        inTable = false;
        tableHeader = false;
      }
      continue;
    }
    if (/^\|(.+)\|$/.test(trimmed)) {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      if (/^\|[\s\-:|]+\|$/.test(trimmed)) {
        tableHeader = false;
        continue;
      }
      const cells = trimmed.split("|").filter((c) => c.trim() !== "").map((c) => c.trim().replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>"));
      if (!inTable) {
        html += '<table class="md-table"><thead><tr>';
        cells.forEach((c) => html += `<th>${c}</th>`);
        html += "</tr></thead><tbody>";
        inTable = true;
        tableHeader = true;
      } else {
        html += "<tr>";
        cells.forEach((c) => html += `<td>${c}</td>`);
        html += "</tr>";
      }
      continue;
    }
    if (inTable) {
      html += "</tbody></table>";
      inTable = false;
      tableHeader = false;
    }
    if (/^## (.+)/.test(trimmed)) {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      html += `<h3>${trimmed.replace(/^## /, "")}</h3>`;
    } else if (/^### (.+)/.test(trimmed)) {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      html += `<h4>${trimmed.replace(/^### /, "")}</h4>`;
    } else if (/^- \[ \] (.+)/.test(trimmed)) {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      html += `<label class="action-item"><input type="checkbox"> ${trimmed.replace(/^- \[ \] /, "").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")}</label>`;
    } else if (/^- \[x\] (.+)/.test(trimmed)) {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      html += `<label class="action-item done"><input type="checkbox" checked> ${trimmed.replace(/^- \[x\] /, "").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")}</label>`;
    } else if (/^[-*] (.+)/.test(trimmed)) {
      if (!inList) {
        html += "<ul>";
        inList = true;
      }
      html += `<li>${trimmed.replace(/^[-*] /, "").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")}</li>`;
    } else {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      html += `<p>${trimmed.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")}</p>`;
    }
  }
  if (inList) html += "</ul>";
  if (inTable) html += "</tbody></table>";
  return html;
}
function icon(name, size = 18) {
  const i = {
    mic: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>`,
    stop: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>`,
    back: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`,
    lock: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
    settings: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
    check: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    copy: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>`,
    trash: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
    clock: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    cal: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    chevron: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>`,
    note: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
    sparkle: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z"/></svg>`,
    refresh: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>`,
    tag: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`,
    person: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    eye: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
    "eye-off": `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`,
    alert: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`
  };
  return i[name] || i["settings"] || "";
}
function renderBackgroundLayer() {
  return `<div class="ambient" aria-hidden="true">
    <div class="orb orb-1"></div><div class="orb orb-2"></div><div class="orb orb-3"></div>
  </div>`;
}
function render() {
  const root = document.getElementById("root");
  const homeMain = root.querySelector(".home-main");
  const preservedScrollTop = view === "home" ? homeMain?.scrollTop || 0 : 0;
  const content = showPermModal ? renderPermModal() : view === "home" ? renderHome() : renderMeeting();
  root.innerHTML = `${renderBackgroundLayer()}<div class="app-shell">${content}</div>`;
  attachListeners();
  if (view === "home") {
    const nextHomeMain = root.querySelector(".home-main");
    if (nextHomeMain) nextHomeMain.scrollTop = preservedScrollTop;
  }
}
function renderPermModal() {
  return `
    <div class="perm-overlay">
      <div class="perm-modal">
        <div class="perm-shield">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
          </svg>
        </div>
        <h2>Screen & Audio Recording</h2>
        <p class="perm-subtitle">Paprwork captures system audio from Zoom, Teams, and Meet to transcribe your meetings.</p>
        <div class="perm-steps">
          <div class="perm-step">
            <span class="perm-step-num">1</span>
            <span>Open <strong>System Settings \u2192 Privacy & Security</strong></span>
          </div>
          <div class="perm-step">
            <span class="perm-step-num">2</span>
            <span>Find <strong>Screen & Audio Recording</strong></span>
          </div>
          <div class="perm-step">
            <span class="perm-step-num">3</span>
            <span>Toggle on <strong>Electron</strong> (dev) or <strong>Papr Work</strong></span>
          </div>
          <div class="perm-step">
            <span class="perm-step-num">4</span>
            <span>Restart the app after enabling</span>
          </div>
        </div>
        <div class="perm-btns">
          <button class="perm-btn-settings" id="btn-open-settings">Open System Settings</button>
          <button class="perm-btn-retry" id="btn-retry-perm">I've enabled it \u2014 retry</button>
        </div>
      </div>
    </div>`;
}
function toggleBgHero() {
}
function renderBackgroundHero() {
  return "";
}
function renderHome() {
  const todayEvs = getTodayEvents();
  const filtered = filterMeetings();
  const allTags = getAllTags();
  const allPeople = getAllPeople();
  return `
    <div class="home-layout">
      <header class="home-header glass">
        <nav class="home-nav">
          <button class="home-nav-tab${mainPage === "meetings" ? " active" : ""}" data-page="meetings">Meetings</button>
          <button class="home-nav-tab${mainPage === "notes" ? " active" : ""}" data-page="notes">Notes</button>
        </nav>
        <div class="header-actions">
          <div class="audio-device-wrapper">
            <button class="btn-audio-device" id="btn-audio-device" title="${selectedAudioDevice.name || "Select microphone"}">
              ${icon("mic", 14)}
              <span class="audio-device-label">${selectedAudioDevice.name || "No mic"}</span>
              ${icon("chevron", 10)}
            </button>
            ${showAudioMenu ? `<div class="audio-device-menu glass">
              <div class="audio-menu-header">
                <span>Audio Input</span>
                <button class="audio-refresh-btn" id="btn-refresh-devices">${icon("refresh", 12)}</button>
              </div>
              ${audioDevices.map((d) => `
                <button class="audio-device-option${d.device_index === selectedAudioDevice.index ? " selected" : ""}" 
                  data-dev-idx="${d.device_index}" data-dev-name="${esc(d.name)}">
                  <span class="audio-dev-name">${esc(d.name)}</span>
                  ${d.device_index === selectedAudioDevice.index ? icon("check", 14) : ""}
                </button>
              `).join("")}
              ${audioDevices.length === 0 ? '<div class="audio-no-devices">No devices found. Click refresh.</div>' : ""}
            </div>` : ""}
          </div>
          <button class="btn-record" id="btn-new-rec">
            New Note
          </button>
        </div>
      </header>
      <div class="home-main">
        ${renderBackgroundHero()}

        ${mainPage === "meetings" ? `
        <section class="home-section">
          <div class="section-header">
            <div class="cal-pills-row">
              <button class="week-nav-btn" onclick="event.stopPropagation(); shiftWeek(-1)">&#8249;</button>
              <div class="cal-pills">
                ${getWeekDayPills()}
              </div>
              <button class="week-nav-btn" onclick="event.stopPropagation(); shiftWeek(1)">&#8250;</button>
            </div>
          </div>
          ${renderCalView()}
        </section>
        ` : `
        <section class="home-section">
          <div class="section-header">
            <div class="filter-bar">
              <div class="filter-pills">
                ${["all", "today", "week", "month"].map((f) => `
                  <button class="pill${activeFilter === f ? " pill-active" : ""}" data-filter="${f}">
                    ${f === "all" ? "All" : f === "today" ? "Today" : f === "week" ? "This Week" : "This Month"}
                  </button>`).join("")}
              </div>
              <div class="filter-selectors">
                ${allTags.length ? `
                <div class="filter-select-wrap">
                  <button class="filter-select${activeTags.length ? " has-selection" : ""}" id="btn-topic-select">
                    ${icon("tag", 13)}
                    ${activeTags.length ? activeTags.join(", ") : "Topics"}
                    ${icon("chevron", 10)}
                  </button>
                  <div class="filter-dropdown" id="dropdown-topics">
                    ${allTags.map((t) => `
                      <label class="filter-option"><input type="checkbox" value="${esc(t)}" ${activeTags.includes(t) ? "checked" : ""} data-topic-check> ${esc(t)}</label>
                    `).join("")}
                    <button class="filter-clear" id="btn-clear-topics">Clear</button>
                  </div>
                </div>` : ""}
                ${allPeople.length ? `
                <div class="filter-select-wrap">
                  <button class="filter-select${activePeople.length ? " has-selection" : ""}" id="btn-people-select">
                    ${icon("person", 13)}
                    ${activePeople.length ? activePeople.length + " selected" : "People"}
                    ${icon("chevron", 10)}
                  </button>
                  <div class="filter-dropdown" id="dropdown-people">
                    ${allPeople.map((p) => `
                      <label class="filter-option"><input type="checkbox" value="${esc(p.email)}" ${activePeople.includes(p.email) ? "checked" : ""} data-people-check>
                        <span class="avatar-sm" style="background:${avatarColor(p.name || p.email)}">${getInitials(p.name || p.email)}</span>
                        ${esc(p.name || p.email)}
                      </label>
                    `).join("")}
                    <button class="filter-clear" id="btn-clear-people">Clear</button>
                  </div>
                </div>` : ""}
              </div>
            </div>
          </div>
          <div class="meeting-list">
            ${(() => {
    const withContent = filtered.filter((m) => m.summary && m.summary.trim());
    if (!withContent.length) {
      return '<div class="empty-state">No summaries yet \u2014 summaries appear here after meetings are processed</div>';
    }
    return withContent.map((m) => {
      const tags = extractTags(m);
      const snippet = m.summary.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
      const snippetEl = snippet ? '<div class="notes-snippet">' + esc(snippet) + "\u2026</div>" : "";
      const tagsEl = tags.length ? '<div class="card-tags">' + tags.map((t) => '<span class="pill">' + esc(t) + "</span>").join("") + "</div>" : "";
      return '<div class="meeting-card notes-card" data-meeting-id="' + m.id + '"><div class="card-row"><div class="card-info"><div class="card-title">' + esc(m.title) + '</div><div class="card-meta">' + icon("clock", 12) + " " + fmtDate(m.date) + (m.duration ? " \xB7 " + fmtDur(m.duration) : "") + "</div>" + snippetEl + tagsEl + '</div><div class="card-actions"><button class="btn-icon card-del" data-id="' + m.id + '" title="Delete">' + icon("trash", 13) + "</button></div></div></div>";
    }).join("");
  })()}

        </section>
        `}
      </div>
    </div>`;
}
function getWeekDayPills() {
  const today = /* @__PURE__ */ new Date();
  const todayStr = localDateStr(today);
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay() + calWeekOffset * 7);
  const todayDow = today.getDay();
  const isWeekend = todayDow === 0 || todayDow === 6;
  const indices = isWeekend ? [0, 1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5];
  return indices.map((i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const ds = localDateStr(d);
    const isToday = ds === todayStr;
    const isActive = calView === ds;
    const dayName = d.toLocaleDateString(void 0, { weekday: "short" });
    const dayNum = d.getDate();
    const hasEvents = calEvents.some((e) => e.start_time.split("T")[0] === ds) || meetings.some((m) => m.date && localDateStr(new Date(m.date)) === ds && !findLinkedCalEvent(m));
    return '<button class="day-pill' + (isActive ? " pill-active" : "") + (isToday && !isActive ? " day-pill-today" : "") + '" data-calview="' + ds + '"><span class="day-pill-name">' + dayName + '</span><span class="day-pill-num' + (isToday ? " day-pill-num-today" : "") + '">' + dayNum + "</span>" + (hasEvents ? '<span class="day-pill-dot"></span>' : "") + "</button>";
  }).join("");
}
function renderCalView() {
  if (!calView) {
    const todayStr = localDateStr(/* @__PURE__ */ new Date());
    const weekDays = getWeekDays();
    calView = weekDays.includes(todayStr) ? todayStr : weekDays[0];
  }
  return renderCalDay(calView);
}
function getWeekDays() {
  const today = /* @__PURE__ */ new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay() + calWeekOffset * 7);
  const todayDow = today.getDay();
  const isWeekend = calWeekOffset === 0 && (todayDow === 0 || todayDow === 6);
  const indices = isWeekend ? [0, 1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5];
  return indices.map((i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return localDateStr(d);
  });
}
function getPrepSnippet(prepDoc) {
  if (!prepDoc) return "";
  try {
    const o = JSON.parse(prepDoc);
    if (o.tldr) return `<div class="prep-snip-tldr">${esc(o.tldr.slice(0, 300))}</div>`;
    if (o.event_id) return "";
  } catch {
  }
  return "";
}
function renderCalDay(dateStr) {
  const evs = calEvents.filter((e) => e.start_time.split("T")[0] === dateStr);
  const linkedIds = new Set(evs.map((e) => getLinkedMeetingForEvent(e)?.id).filter(Boolean));
  const orphanEvs = meetings.filter((m) => {
    if (!m.date) return false;
    return localDateStr(new Date(m.date)) === dateStr && !linkedIds.has(m.id) && !findLinkedCalEvent(m);
  }).map((m) => ({
    id: m.id,
    title: m.title,
    start_time: m.date,
    end_time: m.date,
    calendar_name: "",
    meeting_id: m.id,
    attendees: "[]",
    prep_status: "",
    prep_doc: ""
  }));
  const allEvs = [...evs, ...orphanEvs].sort((a, b) => a.start_time.localeCompare(b.start_time));
  if (!allEvs.length) return '<div class="day-empty">No meetings this day</div>';
  return '<div class="day-cards">' + allEvs.map((ev) => renderMeetingCard(ev)).join("") + "</div>";
}
function renderMeetingCard(e) {
  const now = /* @__PURE__ */ new Date();
  const st = new Date(e.start_time);
  const et = new Date(e.end_time);
  const isLive = now >= st && now <= et;
  const isSoon = !isLive && st.getTime() - now.getTime() < 9e5 && st > now;
  const isPast = now > et;
  const linked = getLinkedMeetingForEvent(e);
  const linkedHasContent = hasMeetingContent(linked);
  const attendees = parseAttendees(e.attendees);
  const minsLeft = isLive ? Math.round((et.getTime() - now.getTime()) / 6e4) : 0;
  const minsTill = isSoon ? Math.round((st.getTime() - now.getTime()) / 6e4) : 0;
  const mStatus = linked && linked.status !== "scheduled" ? linked.status : null;
  const statusBadge = mStatus === "recording" ? '<span class="mc-badge mc-badge-live"><span class="pulse-dot red"></span>Recording</span>' : mStatus === "stopping" || mStatus === "recorded" ? '<span class="mc-badge mc-badge-proc"><span class="spinner-sm"></span> Saving audio</span>' : mStatus === "transcribing" ? '<span class="mc-badge mc-badge-proc"><span class="spinner-sm"></span> Transcribing</span>' : mStatus === "pending" ? '<span class="mc-badge mc-badge-proc"><span class="spinner-sm"></span> Summarizing</span>' : mStatus === "summarized" || mStatus === "synced" ? '<span class="mc-badge mc-badge-done">\u2713 Ready</span>' : mStatus === "failed" ? '<span class="mc-badge mc-badge-fail">Failed</span>' : isLive ? '<span class="mc-badge mc-badge-live"><span class="pulse-dot red"></span>Live \xB7 ' + minsLeft + "m left</span>" : isSoon ? '<span class="mc-badge mc-badge-soon">In ' + minsTill + "m</span>" : isPast ? '<span class="mc-badge mc-badge-past">Past</span>' : "";
  const avatarsHtml = attendees.slice(0, 5).map(
    (a, i) => '<div class="mc-avatar" style="background:' + avatarColor(a.name || a.email) + ";z-index:" + (10 - i) + '" title="' + esc(a.name || a.email) + '">' + getInitials(a.name || a.email) + "</div>"
  ).join("");
  const overflow = attendees.length > 5 ? '<span class="mc-avatar-more">+' + (attendees.length - 5) + "</span>" : "";
  const snippet = e.prep_status === "ready" ? getPrepSnippet(e.prep_doc) : "";
  const snippetHtml = snippet ? '<div class="mc-prep">' + snippet + "</div>" : "";
  const prepBtn = e.prep_status === "ready" ? `<button class="mc-btn mc-btn-glass" onclick="event.stopPropagation();openMeeting('` + (linked?.id || e.id) + `','prep')">View Prep</button>` : e.prep_status === "preparing" ? `<button class="mc-btn mc-btn-glass" onclick="event.stopPropagation();viewPrep('${e.id}')"><span class="spinner-sm"></span> Prepping\u2026</button>` : e.prep_status === "failed" ? `<button class="mc-btn mc-btn-warn" onclick="event.stopPropagation();triggerPrep('` + e.id + `')">Retry Prep</button>` : `<button class="mc-btn mc-btn-glass" onclick="event.stopPropagation();triggerPrep('` + e.id + `')">\u2726 Prep</button>`;
  const actionBtn = linkedHasContent ? `<button class="mc-btn mc-btn-primary" onclick="event.stopPropagation();openMeeting('` + linked.id + `')">View Notes</button>` : linked && linked.status !== "scheduled" && linked.status === "recording" ? `<button class="mc-btn mc-btn-warn" onclick="event.stopPropagation();openMeeting('` + linked.id + `')">\u23F9 Stop</button>` : linked && linked.status !== "scheduled" ? `<button class="mc-btn mc-btn-glass" onclick="event.stopPropagation();openMeeting('` + linked.id + `')">` + statusLabel(linked.status) + "\u2026</button>" : `<button class="mc-btn mc-btn-primary" onclick="event.stopPropagation();startRecording('` + e.id + `')">\u25B6 Start</button>`;
  const cardClass = "mc" + (isLive ? " mc-live" : "") + (isSoon ? " mc-soon" : "") + (isPast ? " mc-past" : "");
  const clickAttr = linked && (linkedHasContent || linked.status !== "scheduled") ? ` onclick="openMeeting('` + linked.id + `')"` : "";
  return '<div class="' + cardClass + '"' + clickAttr + '><div class="mc-inner"><div class="mc-left"><div class="mc-title-row"><span class="mc-title">' + esc(e.title) + "</span>" + statusBadge + '</div><div class="mc-meta"><span class="mc-time">' + fmtTime(e.start_time) + " \u2013 " + fmtTime(e.end_time) + '</span><span class="mc-cal">' + esc(e.calendar_name || "Calendar") + "</span></div>" + (attendees.length ? '<div class="mc-avatars">' + avatarsHtml + overflow + "</div>" : "") + '</div><div class="mc-right">' + prepBtn + actionBtn + "</div></div>" + (snippet ? '<div class="mc-prep-row">' + snippet + "</div>" : "") + "</div>";
}
function showMonthDay(dateStr) {
  const evs = calEvents.filter((e) => e.start_time.split("T")[0] === dateStr);
  const detail = document.getElementById("month-day-detail");
  if (!detail || !evs.length) return;
  const d = /* @__PURE__ */ new Date(dateStr + "T12:00");
  const label = d.toLocaleDateString(void 0, { weekday: "long", month: "long", day: "numeric" });
  detail.innerHTML = `
    <div class="month-detail-header">${label}</div>
    <div class="week-day-events">
      ${evs.map((e) => {
    const linkedMeeting = getLinkedMeetingForEvent(e);
    const linked = linkedMeeting?.id || "";
    return `
        <div class="week-row${linked ? " week-row-linked" : ""}" ${linked ? `onclick="openMeeting('${linked}')"` : ""}>
          <span class="week-row-time">${fmtTime(e.start_time)}</span>
          <span class="week-row-dot" style="background:var(--accent)"></span>
          <span class="week-row-title">${esc(e.title)}</span>
          ${e.calendar_name ? `<span class="week-row-cal">${esc(e.calendar_name)}</span>` : ""}
          ${hasMeetingContent(linkedMeeting) ? `<span class="week-row-notes">${icon("note", 12)} Notes</span>` : ""}
          <span class="week-row-actions">
            ${e.prep_status === "ready" ? `<button class="week-action-btn" onclick="event.stopPropagation();openMeeting('${linked}')">${icon("sparkle", 12)} View Prep</button>` : e.prep_status === "preparing" ? `<button class="week-action-btn" onclick="event.stopPropagation();viewPrep('${e.id}')">${icon("sparkle", 12)} Prepping\u2026</button>` : e.prep_status === "failed" ? `<button class="week-action-btn week-action-warn" onclick="event.stopPropagation();triggerPrep('${e.id}')">${icon("sparkle", 12)} Retry</button>` : `<button class="week-action-btn" onclick="event.stopPropagation();triggerPrep('${e.id}')">${icon("sparkle", 12)} Prep</button>`}
            <button class="week-action-btn week-action-primary" onclick="event.stopPropagation();startRecording('${e.id}')">${icon("record", 12)} Start</button>
          </span>
        </div>`;
  }).join("")}
    </div>`;
}
function renderPrepView(ev) {
  const attendees = parseAttendees(ev.attendees);
  const isPreparing = ev.prep_status === "preparing";
  const isReady = ev.prep_status === "ready";
  let prep = null;
  if (isReady && ev.prep_doc) {
    try {
      prep = JSON.parse(ev.prep_doc);
    } catch {
    }
  }
  function renderPrepReady() {
    if (!prep) return `<div class="notes-editor notes-editable" contenteditable="false">${formatSummary(ev.prep_doc)}</div>`;
    const enriched = {};
    (prep.attendees || []).forEach((a) => {
      if (a.name) enriched[a.name.toLowerCase()] = a;
    });
    return `
      <div class="prep-doc">
        ${prep.tldr ? `
        <div class="prep-card prep-card-tldr">
          <div class="prep-card-label">${icon("sparkle", 13)} Walking in</div>
          <p class="prep-tldr-text">${esc(prep.tldr)}</p>
        </div>` : ""}

        <div class="prep-card">
          <div class="prep-card-label">${icon("person", 13)} Attendees</div>
          <div class="prep-people">
            ${attendees.slice(0, 12).map((a) => {
      const key = (a.name || "").toLowerCase();
      const info = enriched[key] || {};
      return `<div class="prep-person">
                <div class="avatar" style="background:${avatarColor(a.name || a.email)}">${getInitials(a.name || a.email)}</div>
                <div class="prep-person-info">
                  <div class="prep-person-name">${esc(a.name || a.email.split("@")[0])}</div>
                  ${info.title || info.company ? `<div class="prep-person-role">${esc([info.title, info.company].filter(Boolean).join(" \xB7 "))}</div>` : `<div class="prep-person-email">${esc(a.email)}</div>`}
                  ${info.bio ? `<div class="prep-person-bio">${esc(info.bio)}</div>` : ""}
                  ${info.linkedin ? `<a class="prep-person-linkedin" href="${info.linkedin}" target="_blank">${icon("person", 11)} LinkedIn</a>` : ""}
                </div>
              </div>`;
    }).join("")}
          </div>
        </div>

        ${prep.context && prep.context !== "No prior context found." ? `
        <div class="prep-card">
          <div class="prep-card-label">${icon("note", 13)} Context</div>
          <p class="prep-card-body">${esc(prep.context)}</p>
        </div>` : ""}

        ${prep.openItems && prep.openItems.length ? `
        <div class="prep-card">
          <div class="prep-card-label">${icon("check", 13)} Open items</div>
          <ul class="prep-list">
            ${prep.openItems.map((item) => `<li>${esc(item)}</li>`).join("")}
          </ul>
        </div>` : ""}

        ${prep.talkingPoints && prep.talkingPoints.length ? `
        <div class="prep-card">
          <div class="prep-card-label">${icon("chat", 13)} Talking points</div>
          <ul class="prep-list prep-list-talking">
            ${prep.talkingPoints.map((tp) => `<li>${esc(tp)}</li>`).join("")}
          </ul>
        </div>` : ""}

        ${prep.news ? `
        <div class="prep-card">
          <div class="prep-card-label">${icon("refresh", 13)} Recent news</div>
          <p class="prep-card-body">${esc(prep.news)}</p>
        </div>` : ""}

        ${prep.questionsToAsk && prep.questionsToAsk.length ? `
        <div class="prep-card prep-questions-card">
          <div class="prep-card-label">${icon("chat", 13)} Top 3 Questions to Ask ${prep.meetingType === "vc" ? '<span class="prep-vc-badge">VC \xB7 Rubric-scored</span>' : ""}</div>
          <div class="prep-questions-list">
            ${prep.questionsToAsk.map((qq, i) => `
              <div class="prep-q-item">
                <div class="prep-q-header">
                  <span class="prep-q-num">${i + 1}</span>
                  <span class="prep-q-category">${esc((qq.category || "").replace(/_/g, " "))}</span>
                  ${qq.score ? `<span class="prep-q-score">${Number(qq.score).toFixed(1)}</span>` : ""}
                </div>
                <div class="prep-q-text">${esc(qq.question)}</div>
                <div class="prep-q-why">${esc(qq.why)}</div>
              </div>
            `).join("")}
          </div>
        </div>` : ""}
      </div>`;
  }
  return `
    <div class="meeting-layout">
      <div class="meeting-topbar glass">
        <button class="btn-icon" id="btn-back">${icon("back", 20)}</button>
        <div class="meeting-topbar-title">${icon("sparkle", 16)} Prep: ${esc(ev.title)}</div>
        <div class="topbar-right">
          <span class="cal-time-chip">${fmtTime(ev.start_time)} \u2013 ${fmtTime(ev.end_time)}</span>
        </div>
      </div>
      <div class="meeting-body">
        ${isPreparing ? `
          <div class="prep-live">
            <div class="prep-live-header">
              <div class="spinner"></div>
              <span>Agent is researching your prep doc\u2026</span>
              ${prepStartTime ? `<span class="prep-elapsed">${Math.floor((Date.now() - prepStartTime) / 1e3)}s</span>` : ""}
            </div>
            ${prepLogs.length === 0 ? `
              <div class="prep-live-empty">Starting up\u2026</div>
            ` : `
              <div class="prep-log-card">
                <div class="prep-log-latest">${icon(prepLogs[prepLogs.length - 1].split(":")[0], 14)} ${esc(prepLogs[prepLogs.length - 1].split(":").slice(1).join(":"))}</div>
                ${prepLogs.length > 1 ? `
                  <div class="prep-log-history">
                    ${prepLogs.slice(-8, -1).reverse().map((l) => `<div class="prep-log-line">${icon(l.split(":")[0], 12)} ${esc(l.split(":").slice(1).join(":"))}</div>`).join("")}
                  </div>
                ` : ""}
              </div>
            `}
          </div>
        ` : isReady ? renderPrepReady() : ev.prep_status === "failed" ? `
          <div class="prep-failed-card">
            <div class="prep-failed-icon">${icon("alert", 24)}</div>
            <div class="prep-failed-text">
              <div class="prep-failed-title">Prep couldn't complete</div>
              <div class="prep-failed-sub">The agent ran into an issue. This usually resolves on retry.</div>
            </div>
            <button class="prep-retry-btn" onclick="triggerPrep('${ev.id}')">${icon("refresh", 14)} Try again</button>
          </div>
        ` : `
          <div class="prep-empty">
            <p>Click <strong>Prep</strong> on a calendar event to generate a prep document with attendee research, prior meeting context, and talking points.</p>
          </div>
        `}
      </div>
    </div>`;
}
function renderMeeting() {
  if (selectedCalId) {
    const ev2 = calEvents.find((e) => e.id === selectedCalId);
    if (ev2 && (activeTab === "prep" || !meetings.find((x) => x.id === selectedId))) {
      return renderPrepView(ev2);
    }
  }
  const m = meetings.find((x) => x.id === selectedId);
  const ev = m ? findLinkedCalEvent(m) : void 0;
  const isRec = selectedId === recordingId;
  const title = m?.title || "New Meeting";
  const status = m?.status || (isRec ? "recording" : "");
  const bodyHtml = isRec ? `
    <div id="notes-editor" class="notes-editor is-empty" contenteditable="true" spellcheck="true"
      data-placeholder="Write your notes\u2026&#10;&#10;Key decisions, action items, context \u2014 whatever matters to you."></div>
  ` : renderDetailBody(m);
  const hasNotes = m?.notes?.trim();
  const hasTranscript = m?.transcript?.trim();
  const showTabs = !isRec && (hasNotes || hasTranscript || ev?.prep_status === "ready");
  return `
    <div class="meeting-layout">
      <div class="meeting-topbar glass">
        <button class="btn-icon" id="btn-back">${icon("back", 20)}</button>
        <div class="meeting-topbar-title" id="meeting-title" contenteditable="${!isRec}" spellcheck="false">${esc(title)}</div>
        <div class="topbar-right">
          ${isRec ? `
            <span class="rec-indicator">${icon("mic", 14)} <span id="rec-timer">${fmtDur(elapsedSeconds)}</span></span>
            <button class="btn-stop" id="btn-stop">${icon("stop", 14)} Stop Recording</button>
          ` : `
            <span class="status-chip ${statusClass(status)}">${statusLabel(status)}</span>
          `}
        </div>
      </div>
      ${showTabs ? `
      <div class="meeting-tabs">
        <div class="meeting-tabs-left">
          <button class="meeting-tab${activeTab === "notes" ? " active" : ""}" data-tab="notes">${icon("note", 14)} Notes</button>
          ${ev?.prep_status === "ready" ? `<button class="meeting-tab${activeTab === "prep" ? " active" : ""}" data-tab="prep">${icon("sparkle", 14)} Prep</button>` : ""}
          ${hasTranscript ? `<button class="meeting-tab${activeTab === "transcript" ? " active" : ""}" data-tab="transcript">${icon("mic", 14)} Transcript</button>` : ""}
        </div>
        <div class="meeting-tabs-right">
          <button class="tab-copy-btn" id="btn-copy-tab" title="Copy ${activeTab}" aria-label="Copy ${activeTab}">${icon("copy", 14)}</button>
          ${renderMeetingMeta(m)}
        </div>
      </div>` : ""}
      <div class="meeting-body">${bodyHtml}</div>
    </div>`;
}
function renderMeetingMeta(m) {
  const tags = extractTags(m);
  const linked = findLinkedCalEvent(m);
  const attendees = linked ? parseAttendees(linked.attendees) : [];
  if (!tags.length && !attendees.length) return "";
  return `<div class="meeting-meta">
    ${tags.length ? `<div class="meeting-meta-tags">${tags.map((t) => `<span class="meta-tag">${esc(t)}</span>`).join("")}</div>` : ""}
    ${attendees.length ? `<div class="meeting-meta-people">
      ${attendees.slice(0, 8).map((a) => `<span class="meta-avatar" style="background:${avatarColor(a.name || a.email)}" title="${esc(a.name || a.email)}">${(a.name || a.email)[0].toUpperCase()}</span>`).join("")}
      ${attendees.length > 8 ? `<span class="meta-avatar-more">+${attendees.length - 8}</span>` : ""}
    </div>` : ""}
  </div>`;
}
function renderDetailBody(m) {
  if (!m) return '<p style="padding:40px;opacity:.4">Meeting not found</p>';
  if (["stopping", "recorded", "transcribing", "pending"].includes(m.status)) {
    const s = m.status;
    const recDone = s !== "stopping";
    const worActive = s === "recorded" || s === "transcribing";
    const worDone = s === "pending";
    const sumActive = s === "pending";
    return `
      ${m.notes ? `<div class="notes-editor notes-readonly">${/<[a-z][\s\S]*>/i.test(m.notes) ? m.notes : formatSummary(m.notes)}</div>` : ""}
      <div class="pipeline-progress">
        <div class="pipeline-step ${recDone ? "done" : "active"}"><div class="pipeline-step-dot"></div><span>${recDone ? "Recorded" : "Saving audio\u2026"}</span></div>
        <div class="pipeline-connector"></div>
        <div class="pipeline-step ${worDone ? "done" : worActive ? "active" : ""}"><div class="pipeline-step-dot"></div><span>Transcribing</span></div>
        <div class="pipeline-connector"></div>
        <div class="pipeline-step ${sumActive ? "active" : ""}"><div class="pipeline-step-dot"></div><span>Summarizing</span></div>
      </div>`;
  }
  if (m.status === "failed") {
    return `<div class="pipeline-failed-bar glass">
      <div class="pipeline-failed-inner">
        ${icon("alert", 16)}
        <span>Processing didn't complete</span>
        <button class="pipeline-retry-btn" id="btn-retry-pipeline">${icon("refresh", 13)} Retry</button>
      </div>
    </div>`;
  }
  const hasSummary = m.summary?.trim();
  if (activeTab === "notes") {
    const isHtml = (s) => /<[a-z][\s\S]*>/i.test(s);
    const fmt = (s) => isHtml(s) ? s : formatSummary(s);
    const content = hasSummary ? fmt(m.summary) : "";
    return `<div id="notes-editor" class="notes-editor notes-editable${!content ? " is-empty" : ""}" contenteditable="true" spellcheck="true" data-placeholder="Add your notes\u2026">${content}</div>`;
  }
  if (activeTab === "prep") {
    const ev = findLinkedCalEvent(m);
    const prepDoc = ev?.prep_doc || "";
    if (prepDoc) {
      return `<div id="notes-editor" class="notes-editor notes-editable" contenteditable="true" spellcheck="true">${formatSummary(prepDoc)}</div>`;
    }
    return '<p style="padding:40px;opacity:.4">No prep available yet</p>';
  }
  if (activeTab === "transcript" && m.transcript) {
    return `<div id="notes-editor" class="notes-editor notes-editable" contenteditable="false" spellcheck="false">${formatSummary(m.transcript)}</div>`;
  }
  return `<div id="notes-editor" class="notes-editor notes-editable is-empty"
      contenteditable="true" spellcheck="true" data-placeholder="Add your notes\u2026"></div>`;
}
async function copyActiveTab() {
  const btn = document.getElementById("btn-copy-tab");
  const editor = document.getElementById("notes-editor");
  const text = (editor?.innerText || "").trim();
  if (!btn) return;
  if (!text) {
    showToast("info", "Nothing to copy");
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    btn.innerHTML = icon("check", 14);
    btn.classList.add("is-copied");
    setTimeout(() => {
      btn.innerHTML = icon("copy", 14);
      btn.classList.remove("is-copied");
    }, 1600);
  } catch {
    showToast("error", "Copy failed \u2014 clipboard unavailable");
  }
}
function attachListeners() {
  document.getElementById("btn-copy-tab")?.addEventListener("click", () => {
    void copyActiveTab();
  });
  document.querySelectorAll(".meeting-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      flushSave();
      activeTab = btn.dataset.tab || "notes";
      loadAll();
    });
  });
  document.getElementById("btn-open-settings")?.addEventListener("click", () => {
    fetch("/api/shell", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command: "open 'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture'" })
    }).catch(() => {
    });
  });
  document.getElementById("btn-retry-perm")?.addEventListener("click", async () => {
    showPermModal = false;
    const ok = await checkPerm();
    if (!ok) {
      showPermModal = true;
      render();
      return;
    }
    startRecording();
  });
  document.getElementById("btn-new-rec")?.addEventListener("click", () => startRecording());
  document.getElementById("btn-audio-device")?.addEventListener("click", (e) => {
    e.stopPropagation();
    showAudioMenu = !showAudioMenu;
    render();
  });
  document.getElementById("btn-refresh-devices")?.addEventListener("click", (e) => {
    e.stopPropagation();
    refreshAudioDevices();
  });
  document.querySelectorAll(".audio-device-option").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      const idx = parseInt(el.dataset.devIdx || "-1");
      const name = el.dataset.devName || "";
      selectAudioDevice(idx, name);
    });
  });
  document.addEventListener("click", () => {
    if (showAudioMenu) {
      showAudioMenu = false;
      render();
    }
  });
  document.getElementById("btn-toggle-bg")?.addEventListener("click", () => toggleBgHero());
  document.getElementById("btn-refresh-bg")?.addEventListener("click", async () => {
    await runJob(BG_JOB).catch(() => {
    });
    await sleep(2e3);
    await loadAll();
  });
  document.querySelectorAll("[data-cal-id]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      startRecording(btn.dataset.calId);
    });
  });
  document.querySelectorAll("[data-cal-prep-trigger]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      triggerPrep(btn.dataset.calPrepTrigger);
    });
  });
  document.querySelectorAll("[data-cal-prep]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      selectedCalId = btn.dataset.calPrep;
      view = "meeting";
      activeTab = "prep";
      render();
    });
  });
  document.querySelectorAll("[data-page]").forEach((b) => b.addEventListener("click", () => {
    mainPage = b.dataset.page;
    render();
  }));
  document.querySelectorAll("[data-calview]").forEach((b) => b.addEventListener("click", () => {
    calView = b.dataset.calview;
    render();
  }));
  document.querySelectorAll("[data-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeFilter = btn.dataset.filter;
      render();
    });
  });
  document.getElementById("btn-topic-select")?.addEventListener("click", (e) => {
    e.stopPropagation();
    document.getElementById("dropdown-topics")?.classList.toggle("open");
    document.getElementById("dropdown-people")?.classList.remove("open");
  });
  document.getElementById("btn-people-select")?.addEventListener("click", (e) => {
    e.stopPropagation();
    document.getElementById("dropdown-people")?.classList.toggle("open");
    document.getElementById("dropdown-topics")?.classList.remove("open");
  });
  document.querySelectorAll("[data-tag]").forEach((cb) => {
    cb.addEventListener("change", () => {
      const t = cb.dataset.tag;
      if (cb.checked) {
        if (!activeTags.includes(t)) activeTags.push(t);
      } else {
        activeTags = activeTags.filter((x) => x !== t);
      }
      render();
    });
  });
  document.querySelectorAll("[data-person]").forEach((cb) => {
    cb.addEventListener("change", () => {
      const p = cb.dataset.person;
      if (cb.checked) {
        if (!activePeople.includes(p)) activePeople.push(p);
      } else {
        activePeople = activePeople.filter((x) => x !== p);
      }
      render();
    });
  });
  document.getElementById("clear-topics")?.addEventListener("click", () => {
    activeTags = [];
    render();
  });
  document.getElementById("clear-people")?.addEventListener("click", () => {
    activePeople = [];
    render();
  });
  document.addEventListener("click", () => {
    document.querySelectorAll(".filter-dropdown.open").forEach((d) => d.classList.remove("open"));
  }, { once: true });
  document.querySelectorAll(".meeting-card").forEach((card) => {
    card.addEventListener("click", (e) => {
      if (e.target.closest(".delete-btn, .btn-icon")) return;
      openMeeting(card.dataset.meetingId);
    });
  });
  document.querySelectorAll(".card-del").forEach((btn) => {
    btn.addEventListener("click", (e) => deleteMeeting(btn.dataset.id, e));
  });
  document.getElementById("btn-back")?.addEventListener("click", () => {
    flushSave();
    view = "home";
    loadAll();
  });
  document.getElementById("btn-stop")?.addEventListener("click", () => stopRecording());
  document.getElementById("meeting-title")?.addEventListener("blur", async (e) => {
    const el = e.target;
    if (selectedId && el.textContent?.trim()) {
      await w("UPDATE meetings SET title=?, updated_at=strftime('%s','now') WHERE id=?", [el.textContent.trim(), selectedId]);
    }
  });
  const editor = document.getElementById("notes-editor");
  editor?.addEventListener("input", () => {
    editor.classList.toggle("is-empty", !editor.innerText.trim());
    autoSave();
  });
  document.getElementById("btn-retry-pipeline")?.addEventListener("click", () => {
    if (selectedId) {
      runJob(WHISPER_JOB).catch(() => {
      });
      startPoll(selectedId);
    }
  });
}
window.shiftWeek = async (dir) => {
  calWeekOffset += dir;
  const today = /* @__PURE__ */ new Date();
  const todayStr = localDateStr(today);
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay() + calWeekOffset * 7);
  const indices = calWeekOffset === 0 && (today.getDay() === 0 || today.getDay() === 6) ? [0, 1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5];
  const days = indices.map((i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return localDateStr(d);
  });
  calView = days.includes(todayStr) ? todayStr : days[0];
  render();
  runJob(CALENDAR_JOB).catch(() => {
  });
  await sleep(3e3);
  await loadAll();
};
window.openMeeting = openMeeting;
window.showMonthDay = showMonthDay;
window.triggerPrep = triggerPrep;
window.viewPrep = async (id) => {
  selectedCalId = id;
  view = "meeting";
  activeTab = "prep";
  if (!prepStartTime) prepStartTime = Date.now();
  render();
  await loadAll();
  fetchPrepLogs();
  if (!prepPollInterval) {
    startPrepPoll(id);
  }
};
window.startRecording = startRecording;
(async () => {
  calView = localDateStr(/* @__PURE__ */ new Date());
  await loadAll();
  await runJob(CALENDAR_JOB).catch(() => {
  });
  await runJob(BG_JOB).catch(() => {
  });
  await sleep(1500);
  await loadAll();
  await recoverRecordingState();
  await recoverStuckPreps();
  detectLiveLocation().catch(() => {
  });
  subscribeJobEvents({
    jobIds: [CALENDAR_JOB, RECORDER_JOB, STOP_JOB, WHISPER_JOB, SUMMARIZER_JOB, PREP_JOB, BG_JOB],
    onDbChanged: () => {
      loadAll().catch(() => {
      });
    },
    onStatusChanged: () => {
      loadAll().catch(() => {
      });
    }
  });
})();
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vYXBwLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyIvLyBNZWV0aW5ncyBNYW5hZ2VyIFx1MjAxNCBTdGV2ZSBKb2JzIFx1MDBENyBFbG9uIE11c2tcbi8vIE9uZSBqb2I6IFJlY29yZCBtZWV0aW5nIFx1MjE5MiB0cmFuc2NyaWJlIFx1MjE5MiBzdW1tYXJpemUuIFRoYXQncyBpdC5cbmltcG9ydCB7IHN1YnNjcmliZUpvYkV2ZW50cyB9IGZyb20gJy9fX3BhcHJfXy9wYXByLWpvYi1ldmVudHMudHMnO1xuXG5jb25zdCBBUFBfSUQgPSAnNmU0MzJiMzctNmNmMi00NWYxLTlhZDgtZWM3MGE1NmQ0YTNjJztcbmNvbnN0IERCX1NPVVJDRSA9ICdDYWxlbmRhciBSZWFkZXIgKDQwNDA3MzM5KSc7XG5jb25zdCBSRUNPUkRFUl9KT0IgICAgPSAnMDk1YjZkYmYtNjA5Ni00MzNjLTgzZDktZTdhNjZiOGU0NTliJztcbmNvbnN0IFNUT1BfSk9CICAgICAgICA9ICc3MWM2YjdiOC05YjdlLTRmM2EtYmZjOS0xZGVlOTAxOTNiY2UnO1xuY29uc3QgV0hJU1BFUl9KT0IgICAgID0gJzg0MjYyYjdlLWZjMjMtNGIwOC05MTRiLTc3OTFjNzhhNzczNic7XG5jb25zdCBTVU1NQVJJWkVSX0pPQiAgPSAnMDY5ZjViMjItZjI5ZS00YjI0LWIwMDEtYzhmOWQwNTdiMGI3JztcbmNvbnN0IFBFUk1fSk9CICAgICAgICA9ICdiZTY5ZTJiYS02MmZmLTQwZDEtOGUwZi04MzdjMTYxOTQzNGUnO1xuY29uc3QgQ0FMRU5EQVJfSk9CICAgID0gJzQwNDA3MzM5LWNhMGItNDY1MC1hMDA5LTQyNjIwMTAyNWU4MSc7XG5jb25zdCBQUkVQX0pPQiAgICAgICAgPSAnMzJhYTIwMzEtZWNiYS00MTg4LTlhNTktZTkwNmM3ZTYxZTVlJztcbmNvbnN0IEJHX0pPQiAgICAgICAgICA9ICc3NTFmNjYwMC1iOGU3LTQwOTctOGY2My02NmZlOWJiNmJkMmInO1xuY29uc3QgQVVESU9fREVWSUNFU19KT0IgPSAnNzU1ZDRjYWItN2I1Ny00OGRjLTlhZGUtODI2NzY4ZjMwOTk3JztcblxuaW50ZXJmYWNlIE1lZXRpbmcge1xuICBpZDogc3RyaW5nOyB0aXRsZTogc3RyaW5nOyBkYXRlOiBzdHJpbmc7IGR1cmF0aW9uOiBudW1iZXI7XG4gIHN0YXR1czogc3RyaW5nOyB0cmFuc2NyaXB0OiBzdHJpbmc7IHN1bW1hcnk6IHN0cmluZzsgbm90ZXM6IHN0cmluZztcbiAgdGFnczogc3RyaW5nOyAvLyBKU09OIGFycmF5IHN0cmluZyBlLmcuICdbXCJQcm9kdWN0XCIsXCJFbmdpbmVlcmluZ1wiXSdcbiAgY3JlYXRlZF9hdDogbnVtYmVyO1xufVxuaW50ZXJmYWNlIENhbEV2ZW50IHtcbiAgaWQ6IHN0cmluZzsgdGl0bGU6IHN0cmluZzsgc3RhcnRfdGltZTogc3RyaW5nOyBlbmRfdGltZTogc3RyaW5nO1xuICBjYWxlbmRhcl9uYW1lOiBzdHJpbmc7IG1lZXRpbmdfaWQ6IHN0cmluZztcbiAgYXR0ZW5kZWVzOiBzdHJpbmc7IHByZXBfc3RhdHVzOiBzdHJpbmc7IHByZXBfZG9jOiBzdHJpbmc7XG59XG5pbnRlcmZhY2UgQXR0ZW5kZWUgeyBuYW1lOiBzdHJpbmc7IGVtYWlsOiBzdHJpbmc7IG9yZ2FuaXplcj86IGJvb2xlYW47IH1cbmludGVyZmFjZSBMb2NhdGlvbkJhY2tncm91bmQge1xuICBjaXR5OiBzdHJpbmc7IHJlYXNvbjogc3RyaW5nOyBwcm9tcHQ6IHN0cmluZzsgaW1hZ2VfdXJsOiBzdHJpbmc7IGltYWdlX2RhdGE6IHN0cmluZzsgZ2VuZXJhdGVkX29uOiBzdHJpbmc7XG59XG5cbnR5cGUgVmlldyA9ICdob21lJyB8ICdtZWV0aW5nJztcbnR5cGUgRmlsdGVyID0gJ2FsbCcgfCAndG9kYXknIHwgJ3dlZWsnIHwgJ21vbnRoJztcblxubGV0IHZpZXc6IFZpZXcgPSAnaG9tZSc7XG5sZXQgbWVldGluZ3M6IE1lZXRpbmdbXSA9IFtdO1xubGV0IGNhbEV2ZW50czogQ2FsRXZlbnRbXSA9IFtdO1xubGV0IGJnOiBMb2NhdGlvbkJhY2tncm91bmQgfCBudWxsID0gbnVsbDtcbmxldCBsaXZlQ2l0eSA9ICcnO1xubGV0IGxpdmVMb2NhdGlvblJlYXNvbiA9ICcnO1xubGV0IHNlbGVjdGVkSWQ6IHN0cmluZyB8IG51bGwgPSBudWxsO1xubGV0IGlzUmVjb3JkaW5nID0gZmFsc2U7XG5sZXQgcmVjb3JkaW5nSWQ6IHN0cmluZyB8IG51bGwgPSBudWxsO1xubGV0IHBlcm1pc3Npb25HcmFudGVkOiBib29sZWFuIHwgbnVsbCA9IG51bGw7XG5sZXQgc2hvd1Blcm1Nb2RhbCA9IGZhbHNlO1xubGV0IGVsYXBzZWRTZWNvbmRzID0gMDtcbmxldCB0aW1lckludGVydmFsOiBSZXR1cm5UeXBlPHR5cGVvZiBzZXRJbnRlcnZhbD4gfCBudWxsID0gbnVsbDtcbmxldCBwb2xsSW50ZXJ2YWw6IFJldHVyblR5cGU8dHlwZW9mIHNldEludGVydmFsPiB8IG51bGwgPSBudWxsO1xubGV0IHNhdmVUaW1lb3V0OiBSZXR1cm5UeXBlPHR5cGVvZiBzZXRUaW1lb3V0PiB8IG51bGwgPSBudWxsO1xubGV0IGFjdGl2ZUZpbHRlcjogRmlsdGVyID0gJ2FsbCc7XG5sZXQgYWN0aXZlVGFnczogc3RyaW5nW10gPSBbXTtcbmxldCBhY3RpdmVQZW9wbGU6IHN0cmluZ1tdID0gW107XG5sZXQgY2FsVmlldzogc3RyaW5nID0gJyc7XG5sZXQgY2FsTWVldGluZ0lkeDogbnVtYmVyID0gMDtcbmxldCBjYWxEYXlOYXZEaXI6ICdsZWZ0J3wncmlnaHQnID0gJ3JpZ2h0JztcbmxldCBjYWxEYXlWaWV3OiAnZm9jdXMnfCdhbGwnID0gJ2ZvY3VzJztcbmxldCBjYWxXZWVrT2Zmc2V0OiBudW1iZXIgPSAwO1xubGV0IG1haW5QYWdlOiAnbWVldGluZ3MnIHwgJ25vdGVzJyA9ICdtZWV0aW5ncyc7XG5sZXQgYWN0aXZlVGFiOiAnbm90ZXMnIHwgJ3RyYW5zY3JpcHQnIHwgJ3ByZXAnID0gJ25vdGVzJztcbmxldCBzZWxlY3RlZENhbElkOiBzdHJpbmcgfCBudWxsID0gbnVsbDtcbmxldCBwcmVwUG9sbEludGVydmFsOiBSZXR1cm5UeXBlPHR5cGVvZiBzZXRJbnRlcnZhbD4gfCBudWxsID0gbnVsbDtcbmxldCBwcmVwTG9nczogc3RyaW5nW10gPSBbXTtcbmxldCBwcmVwU3RhcnRUaW1lOiBudW1iZXIgPSAwO1xubGV0IHNob3dCZ0hlcm86IGJvb2xlYW4gPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnbW0tc2hvdy1iZycpID09PSAndHJ1ZSc7IC8vIGRlZmF1bHQgb2ZmXG5sZXQgYXVkaW9EZXZpY2VzOiB7ZGV2aWNlX2luZGV4OiBudW1iZXIsIG5hbWU6IHN0cmluZ31bXSA9IFtdO1xubGV0IHNlbGVjdGVkQXVkaW9EZXZpY2U6IHtpbmRleDogbnVtYmVyLCBuYW1lOiBzdHJpbmd9ID0ge2luZGV4OiAtMSwgbmFtZTogJyd9O1xubGV0IHNob3dBdWRpb01lbnUgPSBmYWxzZTtcbmxldCB0b2FzdHM6IHtpZDogbnVtYmVyLCB0eXBlOiAnZXJyb3InfCdzdWNjZXNzJ3wnaW5mbycsIG1lc3NhZ2U6IHN0cmluZywgYWN0aW9uPzoge2xhYmVsOiBzdHJpbmcsIGZuOiBzdHJpbmd9fVtdID0gW107XG5sZXQgdG9hc3RDb3VudGVyID0gMDtcblxuZnVuY3Rpb24gc2hvd1RvYXN0KHR5cGU6ICdlcnJvcid8J3N1Y2Nlc3MnfCdpbmZvJywgbWVzc2FnZTogc3RyaW5nLCBhY3Rpb24/OiB7bGFiZWw6IHN0cmluZywgZm46IHN0cmluZ30sIGR1cmF0aW9uID0gNTAwMCk6IHZvaWQge1xuICBjb25zdCBpZCA9ICsrdG9hc3RDb3VudGVyO1xuICB0b2FzdHMucHVzaCh7aWQsIHR5cGUsIG1lc3NhZ2UsIGFjdGlvbn0pO1xuICByZW5kZXJUb2FzdHMoKTtcbiAgaWYgKCFhY3Rpb24pIHNldFRpbWVvdXQoKCkgPT4gZGlzbWlzc1RvYXN0KGlkKSwgZHVyYXRpb24pO1xufVxuXG5mdW5jdGlvbiBkaXNtaXNzVG9hc3QoaWQ6IG51bWJlcik6IHZvaWQge1xuICBjb25zdCBlbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoYFtkYXRhLXRvYXN0LWlkPVwiJHtpZH1cIl1gKSBhcyBIVE1MRWxlbWVudDtcbiAgaWYgKGVsKSB7IGVsLmNsYXNzTGlzdC5hZGQoJ3RvYXN0LWV4aXQnKTsgc2V0VGltZW91dCgoKSA9PiB7IHRvYXN0cyA9IHRvYXN0cy5maWx0ZXIodCA9PiB0LmlkICE9PSBpZCk7IHJlbmRlclRvYXN0cygpOyB9LCAzMDApOyB9XG4gIGVsc2UgeyB0b2FzdHMgPSB0b2FzdHMuZmlsdGVyKHQgPT4gdC5pZCAhPT0gaWQpOyByZW5kZXJUb2FzdHMoKTsgfVxufVxuXG5mdW5jdGlvbiByZW5kZXJUb2FzdHMoKTogdm9pZCB7XG4gIGxldCBjb250YWluZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndG9hc3QtY29udGFpbmVyJyk7XG4gIGlmICghY29udGFpbmVyKSB7IGNvbnRhaW5lciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpOyBjb250YWluZXIuaWQgPSAndG9hc3QtY29udGFpbmVyJzsgY29udGFpbmVyLmNsYXNzTmFtZSA9ICd0b2FzdC1jb250YWluZXInOyBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGNvbnRhaW5lcik7IH1cbiAgY29udGFpbmVyLmlubmVySFRNTCA9IHRvYXN0cy5tYXAodCA9PiBgXG4gICAgPGRpdiBjbGFzcz1cInRvYXN0IHRvYXN0LSR7dC50eXBlfVwiIGRhdGEtdG9hc3QtaWQ9XCIke3QuaWR9XCI+XG4gICAgICA8ZGl2IGNsYXNzPVwidG9hc3QtaWNvblwiPiR7dC50eXBlID09PSAnZXJyb3InID8gaWNvbignYWxlcnQnLCAxNikgOiB0LnR5cGUgPT09ICdzdWNjZXNzJyA/IGljb24oJ2NoZWNrJywgMTYpIDogaWNvbignc3BhcmtsZScsIDE2KX08L2Rpdj5cbiAgICAgIDxzcGFuIGNsYXNzPVwidG9hc3QtbXNnXCI+JHt0Lm1lc3NhZ2V9PC9zcGFuPlxuICAgICAgJHt0LmFjdGlvbiA/IGA8YnV0dG9uIGNsYXNzPVwidG9hc3QtYWN0aW9uXCIgb25jbGljaz1cIiR7dC5hY3Rpb24uZm59XCI+JHt0LmFjdGlvbi5sYWJlbH08L2J1dHRvbj5gIDogJyd9XG4gICAgICA8YnV0dG9uIGNsYXNzPVwidG9hc3QtZGlzbWlzc1wiIG9uY2xpY2s9XCJkaXNtaXNzVG9hc3QoJHt0LmlkfSlcIj5cdTAwRDc8L2J1dHRvbj5cbiAgICA8L2Rpdj5cbiAgYCkuam9pbignJyk7XG59XG5cbi8vIE1ha2UgdG9hc3QgZnVuY3Rpb25zIGF2YWlsYWJsZSBnbG9iYWxseVxuKHdpbmRvdyBhcyBhbnkpLmRpc21pc3NUb2FzdCA9IGRpc21pc3NUb2FzdDtcbih3aW5kb3cgYXMgYW55KS5zaG93VG9hc3QgPSBzaG93VG9hc3Q7XG5cbi8vIFJlY29yZGluZyBlbGFwc2VkLXRpbWUgZGlzcGxheSBjbG9jayAoVUkgb25seSBcdTIwMTQgbmV2ZXIgcXVlcmllcyB0aGUgREIpXG5sZXQgcmVjVGltZXJUb2tlbiA9IDA7XG5mdW5jdGlvbiBzdGFydFJlY1RpbWVyKCk6IFJldHVyblR5cGU8dHlwZW9mIHNldEludGVydmFsPiB7XG4gIGNvbnN0IHRva2VuID0gKytyZWNUaW1lclRva2VuO1xuICBjb25zdCBzdGVwID0gKCk6IHZvaWQgPT4ge1xuICAgIGlmICh0b2tlbiAhPT0gcmVjVGltZXJUb2tlbikgcmV0dXJuO1xuICAgIGVsYXBzZWRTZWNvbmRzKys7XG4gICAgY29uc3QgZWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncmVjLXRpbWVyJyk7XG4gICAgaWYgKGVsKSBlbC50ZXh0Q29udGVudCA9IGZtdER1cihlbGFwc2VkU2Vjb25kcyk7XG4gICAgc2V0VGltZW91dChzdGVwLCAxMDAwKTtcbiAgfTtcbiAgc2V0VGltZW91dChzdGVwLCAxMDAwKTtcbiAgcmV0dXJuIHRva2VuIGFzIHVua25vd24gYXMgUmV0dXJuVHlwZTx0eXBlb2Ygc2V0SW50ZXJ2YWw+O1xufVxuXG4vLyBEQiAmIEpvYnNcbmFzeW5jIGZ1bmN0aW9uIHEoc3FsOiBzdHJpbmcsIHA6IHVua25vd25bXSA9IFtdKTogUHJvbWlzZTxhbnlbXT4ge1xuICBjb25zdCByID0gYXdhaXQgZmV0Y2goJy9hcGkvZGIvcXVlcnknLCB7XG4gICAgbWV0aG9kOiAnUE9TVCcsIGhlYWRlcnM6IHsnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nfSxcbiAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7YXBwSWQ6IEFQUF9JRCwgc291cmNlSWQ6IERCX1NPVVJDRSwgc3FsLCBwYXJhbXM6IHB9KVxuICB9KTtcbiAgcmV0dXJuIChhd2FpdCByLmpzb24oKSkucm93cyB8fCBbXTtcbn1cbmFzeW5jIGZ1bmN0aW9uIHcoc3FsOiBzdHJpbmcsIHA6IHVua25vd25bXSA9IFtdKTogUHJvbWlzZTx2b2lkPiB7XG4gIGF3YWl0IGZldGNoKCcvYXBpL2RiL3dyaXRlJywge1xuICAgIG1ldGhvZDogJ1BPU1QnLCBoZWFkZXJzOiB7J0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJ30sXG4gICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe2FwcElkOiBBUFBfSUQsIHNvdXJjZUlkOiBEQl9TT1VSQ0UsIHNxbCwgcGFyYW1zOiBwfSlcbiAgfSk7XG59XG5hc3luYyBmdW5jdGlvbiBydW5Kb2IoaWQ6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICBhd2FpdCBmZXRjaCgnL2FwaS9qb2JzL3J1bicsIHtcbiAgICBtZXRob2Q6ICdQT1NUJywgaGVhZGVyczogeydDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbid9LFxuICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtqb2JJZDogaWR9KVxuICB9KTtcbn1cbmFzeW5jIGZ1bmN0aW9uIGZldGNoUHJlcExvZ3MoKTogUHJvbWlzZTx2b2lkPiB7XG4gIHRyeSB7XG4gICAgY29uc3QgciA9IGF3YWl0IGZldGNoKCcvYXBpL2pvYnMvbG9ncycsIHtcbiAgICAgIG1ldGhvZDogJ1BPU1QnLCBoZWFkZXJzOiB7J0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJ30sXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7am9iSWQ6IFBSRVBfSk9CfSlcbiAgICB9KTtcbiAgICBjb25zdCBkYXRhID0gYXdhaXQgci5qc29uKCk7XG4gICAgY29uc3QgcmF3OiBzdHJpbmcgPSBkYXRhPy5kYXRhPy5sb2dzIHx8IGRhdGE/LmxvZ3MgfHwgZGF0YT8ub3V0cHV0IHx8IGRhdGE/LnN0ZG91dCB8fCAnJztcbiAgICAvLyBQYXJzZSB2ZXJib3NlIHRvb2wgbG9ncyBpbnRvIHJlYWRhYmxlIHN0ZXBzXG4gICAgY29uc3QgcmVhZGFibGU6IHN0cmluZ1tdID0gW107XG4gICAgZm9yIChjb25zdCBsaW5lIG9mIHJhdy5zcGxpdCgnXFxuJykpIHtcbiAgICAgIGNvbnN0IG0gPSBsaW5lLm1hdGNoKC9Ub29sOiAoXFx3KylcXCgoLnswLDEyMH0pLykgfHwgbGluZS5tYXRjaCgvdG9vbFtfXFxzXT9jYWxsWzpcXHNdKyhcXHcrKVxcKCguezAsMTIwfSkvaSk7XG4gICAgICBpZiAoIW0pIGNvbnRpbnVlO1xuICAgICAgY29uc3QgdG9vbCA9IG1bMV07IGNvbnN0IGFyZ3MgPSBtWzJdO1xuICAgICAgaWYgKHRvb2wgPT09ICdiYXNoJykge1xuICAgICAgICBjb25zdCBjbWQgPSBhcmdzLnJlcGxhY2UoL1xcXFwvZywnJykucmVwbGFjZSgvXCIvZywnJykuc2xpY2UoMCw4MCk7XG4gICAgICAgIGlmIChjbWQuaW5jbHVkZXMoJ3NxbGl0ZTMnKSkgcmVhZGFibGUucHVzaCgnbm90ZTpSZWFkaW5nIG1lZXRpbmcgZGF0YVx1MjAyNicpO1xuICAgICAgICBlbHNlIGlmIChjbWQuaW5jbHVkZXMoJ2dyZXAnKSkgcmVhZGFibGUucHVzaCgnZXllOlNlYXJjaGluZyBkb2N1bWVudHNcdTIwMjYnKTtcbiAgICAgICAgZWxzZSBpZiAoY21kLmluY2x1ZGVzKCdhcG9sbG8nKSkgcmVhZGFibGUucHVzaCgncGVyc29uOkxvb2tpbmcgdXAgYXR0ZW5kZWUgcHJvZmlsZXNcdTIwMjYnKTtcbiAgICAgICAgZWxzZSBpZiAoY21kLmluY2x1ZGVzKCdsaW5rZWRpbi5jb20nKSkgcmVhZGFibGUucHVzaCgncGVyc29uOlNlYXJjaGluZyBMaW5rZWRJblx1MjAyNicpO1xuICAgICAgICBlbHNlIGlmIChjbWQuaW5jbHVkZXMoJ2V4YScpIHx8IGNtZC5pbmNsdWRlcygnc2VhcmNoJykpIHJlYWRhYmxlLnB1c2goJ3JlZnJlc2g6U2VhcmNoaW5nIHRoZSB3ZWJcdTIwMjYnKTtcbiAgICAgICAgZWxzZSBpZiAoY21kLmluY2x1ZGVzKCdjdXJsJykpIHJlYWRhYmxlLnB1c2goJ3JlZnJlc2g6RmV0Y2hpbmcgZXh0ZXJuYWwgZGF0YVx1MjAyNicpO1xuICAgICAgICBlbHNlIHJlYWRhYmxlLnB1c2goJ3NldHRpbmdzOlJ1bm5pbmcgdGFza1x1MjAyNicpO1xuICAgICAgfSBlbHNlIGlmICh0b29sID09PSAnc2VhcmNoX2FnZW50X21lbW9yeScpIHtcbiAgICAgICAgY29uc3QgcSA9IGFyZ3MubWF0Y2goL3F1ZXJ5Lio/W1wiOl1cXHMqXCI/KFteXCJcXFxcLHt9XXs4LDUwfSkvaSk/LlsxXSB8fCAnJztcbiAgICAgICAgcmVhZGFibGUucHVzaChgc3BhcmtsZTpTZWFyY2hpbmcgbWVtb3J5JHtxID8gJzogJyArIHEudHJpbSgpIDogJ1x1MjAyNid9YCk7XG4gICAgICB9IGVsc2UgaWYgKHRvb2wgPT09ICdyZWFkX2ZpbGUnIHx8IHRvb2wgPT09ICdyZWFkX2RvY3VtZW50Jykge1xuICAgICAgICByZWFkYWJsZS5wdXNoKCdub3RlOlJlYWRpbmcgZG9jdW1lbnRcdTIwMjYnKTtcbiAgICAgIH0gZWxzZSBpZiAodG9vbCA9PT0gJ2FkZF9hZ2VudF9tZW1vcnknKSB7XG4gICAgICAgIHJlYWRhYmxlLnB1c2goJ2xvY2s6U2F2aW5nIGNvbnRleHQgdG8gbWVtb3J5XHUyMDI2Jyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZWFkYWJsZS5wdXNoKGBzZXR0aW5nczoke3Rvb2wucmVwbGFjZSgvXy9nLCcgJyl9XHUyMDI2YCk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChyZWFkYWJsZS5sZW5ndGggPiAwKSB7IHByZXBMb2dzID0gcmVhZGFibGUuc2xpY2UoLTIwKTsgcmVuZGVyKCk7IH1cbiAgICBlbHNlIGlmIChyYXcuaW5jbHVkZXMoJ1BSRVBfQ09NUExFVEUnKSkge1xuICAgICAgLy8gSm9iIGZpbmlzaGVkIFx1MjAxNCByZWZyZXNoIGRhdGEgZnJvbSBEQlxuICAgICAgYXdhaXQgbG9hZEFsbCgpO1xuICAgIH1cbiAgfSBjYXRjaCB7fVxufVxuZnVuY3Rpb24gc2xlZXAobXM6IG51bWJlcikgeyByZXR1cm4gbmV3IFByb21pc2UociA9PiBzZXRUaW1lb3V0KHIsIG1zKSk7IH1cblxuLy8gRGF0YVxuYXN5bmMgZnVuY3Rpb24gbG9hZEFsbCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgdHJ5IHsgbWVldGluZ3MgPSBhd2FpdCBxKCdTRUxFQ1QgKiBGUk9NIG1lZXRpbmdzIE9SREVSIEJZIGNyZWF0ZWRfYXQgREVTQycpOyB9IGNhdGNoIHsgbWVldGluZ3MgPSBbXTsgfVxuICB0cnkge1xuICAgIGNhbEV2ZW50cyA9IGF3YWl0IHEoYFNFTEVDVCBpZCwgdGl0bGUsIHN0YXJ0X3RpbWUsIGVuZF90aW1lLCBjYWxlbmRhcl9uYW1lLCBtZWV0aW5nX2lkLCBcbiAgICAgIENPQUxFU0NFKGF0dGVuZGVlcywgJ1tdJykgYXMgYXR0ZW5kZWVzLCBDT0FMRVNDRShwcmVwX3N0YXR1cywgJycpIGFzIHByZXBfc3RhdHVzLCBcbiAgICAgIENPQUxFU0NFKHByZXBfZG9jLCAnJykgYXMgcHJlcF9kb2NcbiAgICAgIEZST00gY2FsZW5kYXJfZXZlbnRzXG4gICAgICBXSEVSRSBOT1QgKHN0YXJ0X3RpbWUgTElLRSAnJVQwMDowMCcgQU5EIGVuZF90aW1lIExJS0UgJyVUMjM6NTknKVxuICAgICAgT1JERVIgQlkgc3RhcnRfdGltZSBBU0NgKTtcbiAgfSBjYXRjaCB7IGNhbEV2ZW50cyA9IFtdOyB9XG4gIHRyeSB7XG4gICAgY29uc3Qgcm93cyA9IGF3YWl0IHEoYFNFTEVDVCBjaXR5LCByZWFzb24sIHByb21wdCwgaW1hZ2VfdXJsLCBpbWFnZV9kYXRhLCBnZW5lcmF0ZWRfb24gRlJPTSBsb2NhdGlvbl9iYWNrZ3JvdW5kIFdIRVJFIGlkPSdjdXJyZW50JyBMSU1JVCAxYCk7XG4gICAgYmcgPSByb3dzWzBdIHx8IG51bGw7XG4gIH0gY2F0Y2ggeyBiZyA9IG51bGw7IH1cbiAgYXdhaXQgbG9hZEF1ZGlvRGV2aWNlcygpO1xuICByZW5kZXIoKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gbG9hZEF1ZGlvRGV2aWNlcygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgdHJ5IHtcbiAgICBhdWRpb0RldmljZXMgPSBhd2FpdCBxKCdTRUxFQ1QgZGV2aWNlX2luZGV4LCBuYW1lIEZST00gYXVkaW9fZGV2aWNlcyBPUkRFUiBCWSBkZXZpY2VfaW5kZXgnKTtcbiAgICBjb25zdCBzZXR0aW5ncyA9IGF3YWl0IHEoJ1NFTEVDVCBzZWxlY3RlZF9kZXZpY2VfaW5kZXgsIHNlbGVjdGVkX2RldmljZV9uYW1lIEZST00gYXVkaW9fc2V0dGluZ3MgV0hFUkUgaWQ9MScpO1xuICAgIGlmIChzZXR0aW5ncy5sZW5ndGggJiYgc2V0dGluZ3NbMF0uc2VsZWN0ZWRfZGV2aWNlX2luZGV4ID49IDApIHtcbiAgICAgIHNlbGVjdGVkQXVkaW9EZXZpY2UgPSB7aW5kZXg6IHNldHRpbmdzWzBdLnNlbGVjdGVkX2RldmljZV9pbmRleCwgbmFtZTogc2V0dGluZ3NbMF0uc2VsZWN0ZWRfZGV2aWNlX25hbWV9O1xuICAgIH1cbiAgfSBjYXRjaCB7IC8qIHRhYmxlcyBtYXkgbm90IGV4aXN0IHlldCAqLyB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHJlZnJlc2hBdWRpb0RldmljZXMoKTogUHJvbWlzZTx2b2lkPiB7XG4gIGF3YWl0IHJ1bkpvYihBVURJT19ERVZJQ0VTX0pPQik7XG4gIGF3YWl0IG5ldyBQcm9taXNlKHIgPT4gc2V0VGltZW91dChyLCAyMDAwKSk7XG4gIGF3YWl0IGxvYWRBdWRpb0RldmljZXMoKTtcbiAgcmVuZGVyKCk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHNlbGVjdEF1ZGlvRGV2aWNlKGlkeDogbnVtYmVyLCBuYW1lOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgc2VsZWN0ZWRBdWRpb0RldmljZSA9IHtpbmRleDogaWR4LCBuYW1lfTtcbiAgc2hvd0F1ZGlvTWVudSA9IGZhbHNlO1xuICBhd2FpdCB3KFwiVVBEQVRFIGF1ZGlvX3NldHRpbmdzIFNFVCBzZWxlY3RlZF9kZXZpY2VfaW5kZXg9Pywgc2VsZWN0ZWRfZGV2aWNlX25hbWU9PywgdXBkYXRlZF9hdD1zdHJmdGltZSgnJXMnLCdub3cnKSBXSEVSRSBpZD0xXCIsIFtpZHgsIG5hbWVdKTtcbiAgcmVuZGVyKCk7XG59XG5cbi8vIFBlcm1pc3Npb25cbmFzeW5jIGZ1bmN0aW9uIGNoZWNrUGVybSgpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgYXdhaXQgdygnREVMRVRFIEZST00gcGVybWlzc2lvbl9jaGVja3MnKTtcbiAgYXdhaXQgcnVuSm9iKFBFUk1fSk9CKTtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCAzMDsgaSsrKSB7XG4gICAgYXdhaXQgc2xlZXAoNTAwKTtcbiAgICBjb25zdCByb3dzID0gYXdhaXQgcSgnU0VMRUNUIHJlc3VsdCBGUk9NIHBlcm1pc3Npb25fY2hlY2tzIE9SREVSIEJZIGNyZWF0ZWRfYXQgREVTQyBMSU1JVCAxJyk7XG4gICAgaWYgKHJvd3MubGVuZ3RoKSB7IHBlcm1pc3Npb25HcmFudGVkID0gcm93c1swXS5yZXN1bHQgPT09ICdQRVJNSVNTSU9OX0dSQU5URUQnOyByZXR1cm4gcGVybWlzc2lvbkdyYW50ZWQ7IH1cbiAgfVxuICBwZXJtaXNzaW9uR3JhbnRlZCA9IGZhbHNlOyByZXR1cm4gZmFsc2U7XG59XG5cbi8vIFJlY29yZGluZ1xuYXN5bmMgZnVuY3Rpb24gZmluYWxpemVNZWV0aW5nUmVjb3JkaW5nKG1pZDogc3RyaW5nLCBkdXJhdGlvblNlY29uZHM/OiBudW1iZXIsIHNhdmVkTm90ZXM/OiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgaWYgKHNhdmVkTm90ZXMgIT09IHVuZGVmaW5lZCkge1xuICAgIGF3YWl0IHcoXCJVUERBVEUgbWVldGluZ3MgU0VUIG5vdGVzPT8sIHVwZGF0ZWRfYXQ9c3RyZnRpbWUoJyVzJywnbm93JykgV0hFUkUgaWQ9P1wiLCBbc2F2ZWROb3RlcywgbWlkXSk7XG4gIH1cbiAgaWYgKGR1cmF0aW9uU2Vjb25kcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgYXdhaXQgdyhcIlVQREFURSBtZWV0aW5ncyBTRVQgZHVyYXRpb249PywgdXBkYXRlZF9hdD1zdHJmdGltZSgnJXMnLCdub3cnKSBXSEVSRSBpZD0/XCIsIFtkdXJhdGlvblNlY29uZHMsIG1pZF0pO1xuICB9XG4gIGF3YWl0IHcoXCJVUERBVEUgbWVldGluZ3MgU0VUIHN0YXR1cz0nc3RvcHBpbmcnLCB1cGRhdGVkX2F0PXN0cmZ0aW1lKCclcycsJ25vdycpIFdIRVJFIGlkPT8gQU5EIHN0YXR1cyBJTiAoJ3JlY29yZGluZycsJ3N0b3BwaW5nJylcIiwgW21pZF0pO1xuICAvLyBTZW5kIHN0b3Agc2lnbmFsIFx1MjAxNCByZXRyeSB1cCB0byAzIHRpbWVzXG4gIGZvciAobGV0IGF0dGVtcHQgPSAwOyBhdHRlbXB0IDwgMzsgYXR0ZW1wdCsrKSB7XG4gICAgdHJ5IHsgYXdhaXQgcnVuSm9iKFNUT1BfSk9CKTsgYnJlYWs7IH0gY2F0Y2ggeyBhd2FpdCBzbGVlcCgxMDAwKTsgfVxuICB9XG4gIC8vIFdhaXQgZm9yIHJlY29yZGVyIHRvIHNhdmUgYXVkaW8sIHdpdGggZmFsbGJhY2sgdGltZW91dFxuICBsZXQgc2V0dGxlZCA9IGZhbHNlO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IDIwOyBpKyspIHtcbiAgICBhd2FpdCBzbGVlcCgxNTAwKTtcbiAgICBjb25zdCByb3dzID0gYXdhaXQgcShcIlNFTEVDVCBzdGF0dXMgRlJPTSBtZWV0aW5ncyBXSEVSRSBpZD0/XCIsIFttaWRdKTtcbiAgICBpZiAoIXJvd3MubGVuZ3RoKSByZXR1cm47XG4gICAgY29uc3QgcyA9IHJvd3NbMF0uc3RhdHVzO1xuICAgIGlmIChbJ3JlY29yZGVkJywndHJhbnNjcmliaW5nJywncGVuZGluZycsJ3N1bW1hcml6ZWQnXS5pbmNsdWRlcyhzKSkgeyBzZXR0bGVkID0gdHJ1ZTsgYnJlYWs7IH1cbiAgICBpZiAocyA9PT0gJ2ZhaWxlZCcpIHJldHVybjtcbiAgfVxuICAvLyBJZiBzdGlsbCBzdG9wcGluZyBhZnRlciAzMHMsIGZvcmNlIHRvIHJlY29yZGVkIHNvIHBpcGVsaW5lIGNvbnRpbnVlc1xuICBpZiAoIXNldHRsZWQpIHtcbiAgICBhd2FpdCB3KFwiVVBEQVRFIG1lZXRpbmdzIFNFVCBzdGF0dXM9J3JlY29yZGVkJywgdXBkYXRlZF9hdD1zdHJmdGltZSgnJXMnLCdub3cnKSBXSEVSRSBpZD0/IEFORCBzdGF0dXM9J3N0b3BwaW5nJ1wiLCBbbWlkXSk7XG4gIH1cbiAgdHJpZ2dlcldoaXNwZXJXaGVuUmVhZHkobWlkKS5jYXRjaCgoKSA9PiB7fSk7XG4gIHN0YXJ0UG9sbChtaWQpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBoYW5kb2ZmQWN0aXZlUmVjb3JkaW5nKCk6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCByb3dzID0gYXdhaXQgcShcIlNFTEVDVCBpZCwgc3RhdHVzIEZST00gbWVldGluZ3MgV0hFUkUgc3RhdHVzPSdyZWNvcmRpbmcnIE9SREVSIEJZIGNyZWF0ZWRfYXQgREVTQyBMSU1JVCAxXCIpO1xuICBpZiAoIXJvd3MubGVuZ3RoKSByZXR1cm47XG4gIGNvbnN0IGFjdGl2ZUlkID0gcm93c1swXS5pZCBhcyBzdHJpbmc7XG4gIGlmIChhY3RpdmVJZCA9PT0gcmVjb3JkaW5nSWQpIHtcbiAgICBjb25zdCBlZGl0b3IgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbm90ZXMtZWRpdG9yJykgYXMgSFRNTEVsZW1lbnQ7XG4gICAgY29uc3Qgbm90ZXMgPSBlZGl0b3IgPyBlZGl0b3IuaW5uZXJIVE1MLnRyaW0oKSA6ICcnO1xuICAgIGlmICh0aW1lckludGVydmFsKSB7IGNsZWFySW50ZXJ2YWwodGltZXJJbnRlcnZhbCk7IHRpbWVySW50ZXJ2YWwgPSBudWxsOyB9XG4gICAgaXNSZWNvcmRpbmcgPSBmYWxzZTtcbiAgICBhd2FpdCBmaW5hbGl6ZU1lZXRpbmdSZWNvcmRpbmcoYWN0aXZlSWQsIGVsYXBzZWRTZWNvbmRzLCBub3RlcyB8fCB1bmRlZmluZWQpO1xuICAgIHJlY29yZGluZ0lkID0gbnVsbDtcbiAgICBlbGFwc2VkU2Vjb25kcyA9IDA7XG4gIH0gZWxzZSB7XG4gICAgYXdhaXQgZmluYWxpemVNZWV0aW5nUmVjb3JkaW5nKGFjdGl2ZUlkKTtcbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBzdGFydFJlY29yZGluZyhmcm9tQ2FsSWQ/OiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgaWYgKHBlcm1pc3Npb25HcmFudGVkICE9PSB0cnVlKSB7XG4gICAgY29uc3Qgb2sgPSBhd2FpdCBjaGVja1Blcm0oKTtcbiAgICBpZiAoIW9rKSB7IHNob3dQZXJtTW9kYWwgPSB0cnVlOyByZW5kZXIoKTsgcmV0dXJuOyB9XG4gIH1cbiAgYXdhaXQgaGFuZG9mZkFjdGl2ZVJlY29yZGluZygpO1xuXG4gIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcbiAgbGV0IHRpdGxlID0gJ01lZXRpbmcgXFx1MjAxNCAnICsgbmV3IERhdGUoKS50b0xvY2FsZVN0cmluZyh1bmRlZmluZWQsIHttb250aDonc2hvcnQnLCBkYXk6J251bWVyaWMnLCBob3VyOicyLWRpZ2l0JywgbWludXRlOicyLWRpZ2l0J30pO1xuICBsZXQgaWQgPSAnJztcbiAgaWYgKGZyb21DYWxJZCkge1xuICAgIGNvbnN0IGV2ID0gY2FsRXZlbnRzLmZpbmQoZSA9PiBlLmlkID09PSBmcm9tQ2FsSWQpO1xuICAgIGlmIChldikge1xuICAgICAgdGl0bGUgPSBldi50aXRsZTtcbiAgICAgIC8vIENoZWNrIGlmIGEgc2NoZWR1bGVkIG1lZXRpbmcgYWxyZWFkeSBleGlzdHMgZm9yIHRoaXMgY2FsZW5kYXIgZXZlbnRcbiAgICAgIGNvbnN0IGV4aXN0aW5nID0gYXdhaXQgcShcIlNFTEVDVCBtLmlkIEZST00gbWVldGluZ3MgbSBKT0lOIGNhbGVuZGFyX2V2ZW50cyBjZSBPTiBjZS5tZWV0aW5nX2lkID0gbS5pZCBXSEVSRSBjZS5pZCA9ID8gQU5EIG0uc3RhdHVzID0gJ3NjaGVkdWxlZCcgTElNSVQgMVwiLCBbZnJvbUNhbElkXSk7XG4gICAgICBpZiAoZXhpc3RpbmcubGVuZ3RoKSB7XG4gICAgICAgIGlkID0gZXhpc3RpbmdbMF0uaWQ7XG4gICAgICAgIGF3YWl0IHcoXCJVUERBVEUgbWVldGluZ3MgU0VUIHN0YXR1cz0ncmVjb3JkaW5nJywgZGF0ZT0/LCB1cGRhdGVkX2F0PXN0cmZ0aW1lKCclcycsJ25vdycpIFdIRVJFIGlkPT9cIiwgW25vdywgaWRdKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlkID0gY3J5cHRvLnJhbmRvbVVVSUQoKTtcbiAgICAgICAgYXdhaXQgdyhcIlVQREFURSBjYWxlbmRhcl9ldmVudHMgU0VUIG1lZXRpbmdfaWQgPSA/IFdIRVJFIGlkID0gP1wiLCBbaWQsIGZyb21DYWxJZF0pO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICBpZiAoIWlkKSB7XG4gICAgaWQgPSBjcnlwdG8ucmFuZG9tVVVJRCgpO1xuICB9XG4gIC8vIEluc2VydCBvbmx5IGlmIHdlIGRpZG4ndCByZXVzZSBhbiBleGlzdGluZyBzY2hlZHVsZWQgbWVldGluZ1xuICBjb25zdCBjaGVjayA9IGF3YWl0IHEoXCJTRUxFQ1QgaWQgRlJPTSBtZWV0aW5ncyBXSEVSRSBpZD0/XCIsIFtpZF0pO1xuICBpZiAoIWNoZWNrLmxlbmd0aCkge1xuICAgIGF3YWl0IHcoXCJJTlNFUlQgSU5UTyBtZWV0aW5ncyAoaWQsIHRpdGxlLCBkYXRlLCBzdGF0dXMpIFZBTFVFUyAoPywgPywgPywgJ3JlY29yZGluZycpXCIsIFtpZCwgdGl0bGUsIG5vd10pO1xuICB9XG4gIHJlY29yZGluZ0lkID0gaWQ7IGlzUmVjb3JkaW5nID0gdHJ1ZTsgZWxhcHNlZFNlY29uZHMgPSAwOyBzZWxlY3RlZElkID0gaWQ7XG4gIHZpZXcgPSAnbWVldGluZyc7XG4gIHJlbmRlcigpO1xuICB0aW1lckludGVydmFsID0gc3RhcnRSZWNUaW1lcigpO1xuICB0cnkgeyBhd2FpdCBydW5Kb2IoUkVDT1JERVJfSk9CKTsgfSBjYXRjaChlKSB7IGNvbnNvbGUuZXJyb3IoJ1JlY29yZGVyIGpvYiBmYWlsZWQ6JywgZSk7IH1cbiAgYXdhaXQgbG9hZEFsbCgpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBzdG9wUmVjb3JkaW5nKCk6IFByb21pc2U8dm9pZD4ge1xuICBpZiAoIXJlY29yZGluZ0lkKSByZXR1cm47XG4gIGNvbnN0IGVkaXRvciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdub3Rlcy1lZGl0b3InKSBhcyBIVE1MRWxlbWVudDtcbiAgY29uc3Qgbm90ZXMgPSBlZGl0b3IgPyBlZGl0b3IuaW5uZXJIVE1MLnRyaW0oKSA6ICcnO1xuICBjb25zdCBzaWQgPSByZWNvcmRpbmdJZDtcbiAgaXNSZWNvcmRpbmcgPSBmYWxzZTtcbiAgaWYgKHRpbWVySW50ZXJ2YWwpIHsgY2xlYXJJbnRlcnZhbCh0aW1lckludGVydmFsKTsgdGltZXJJbnRlcnZhbCA9IG51bGw7IH1cbiAgcmVjb3JkaW5nSWQgPSBudWxsO1xuICBhd2FpdCBmaW5hbGl6ZU1lZXRpbmdSZWNvcmRpbmcoc2lkLCBlbGFwc2VkU2Vjb25kcywgbm90ZXMgfHwgdW5kZWZpbmVkKTtcbiAgZWxhcHNlZFNlY29uZHMgPSAwO1xuICBhd2FpdCBsb2FkQWxsKCk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHRyaWdnZXJXaGlzcGVyV2hlblJlYWR5KG1pZDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgNDU7IGkrKykge1xuICAgIGF3YWl0IHNsZWVwKDIwMDApO1xuICAgIGNvbnN0IHJvd3MgPSBhd2FpdCBxKFwiU0VMRUNUIHN0YXR1cyBGUk9NIG1lZXRpbmdzIFdIRVJFIGlkPT9cIiwgW21pZF0pO1xuICAgIGlmICghcm93cy5sZW5ndGggfHwgcm93c1swXS5zdGF0dXMgPT09ICdmYWlsZWQnKSByZXR1cm47XG4gICAgaWYgKHJvd3NbMF0uc3RhdHVzID09PSAncmVjb3JkZWQnKSB7IGF3YWl0IHJ1bkpvYihXSElTUEVSX0pPQik7IHJldHVybjsgfVxuICAgIGlmIChbJ3RyYW5zY3JpYmluZycsICdwZW5kaW5nJywgJ3N1bW1hcml6ZWQnLCAnc3luY2VkJ10uaW5jbHVkZXMocm93c1swXS5zdGF0dXMpKSByZXR1cm47XG4gIH1cbn1cblxuZnVuY3Rpb24gc3RhcnRQb2xsKG1pZDogc3RyaW5nKTogdm9pZCB7XG4gIGxldCBhdHRlbXB0cyA9IDAsIGxhc3QgPSAnJztcbiAgaWYgKHBvbGxJbnRlcnZhbCkgY2xlYXJJbnRlcnZhbChwb2xsSW50ZXJ2YWwpO1xuICBwb2xsSW50ZXJ2YWwgPSBzZXRJbnRlcnZhbChhc3luYyAoKSA9PiB7XG4gICAgaWYgKCsrYXR0ZW1wdHMgPiAzMDApIHsgY2xlYXJJbnRlcnZhbChwb2xsSW50ZXJ2YWwhKTsgcmV0dXJuOyB9XG4gICAgY29uc3Qgcm93cyA9IGF3YWl0IHEoXCJTRUxFQ1Qgc3RhdHVzIEZST00gbWVldGluZ3MgV0hFUkUgaWQ9P1wiLCBbbWlkXSk7XG4gICAgaWYgKCFyb3dzLmxlbmd0aCkgcmV0dXJuO1xuICAgIGNvbnN0IHMgPSByb3dzWzBdLnN0YXR1cztcbiAgICBpZiAocyAhPT0gbGFzdCkge1xuICAgICAgbGFzdCA9IHM7XG4gICAgICBhd2FpdCBsb2FkQWxsKCk7XG4gICAgICBpZiAocyA9PT0gJ3BlbmRpbmcnKSBydW5Kb2IoU1VNTUFSSVpFUl9KT0IpLmNhdGNoKCgpID0+IHt9KTtcbiAgICB9XG4gICAgaWYgKHMgPT09ICdzdW1tYXJpemVkJyB8fCBzID09PSAnZmFpbGVkJykgeyBjbGVhckludGVydmFsKHBvbGxJbnRlcnZhbCEpOyBwb2xsSW50ZXJ2YWwgPSBudWxsOyB9XG4gIH0sIDIwMDApO1xufVxuXG5mdW5jdGlvbiBmbHVzaFNhdmUoKTogdm9pZCB7XG4gIGNvbnN0IGVkaXRvciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdub3Rlcy1lZGl0b3InKSBhcyBIVE1MRWxlbWVudDtcbiAgY29uc3QgaWQgPSBpc1JlY29yZGluZyA/IHJlY29yZGluZ0lkIDogc2VsZWN0ZWRJZDtcbiAgaWYgKCFlZGl0b3IgfHwgIWlkKSByZXR1cm47XG4gIGNvbnN0IGh0bWwgPSBlZGl0b3IuaW5uZXJIVE1MLnRyaW0oKTtcbiAgaWYgKHNhdmVUaW1lb3V0KSB7IGNsZWFyVGltZW91dChzYXZlVGltZW91dCk7IHNhdmVUaW1lb3V0ID0gbnVsbDsgfVxuICBpZiAoYWN0aXZlVGFiID09PSAncHJlcCcgJiYgc2VsZWN0ZWRDYWxJZCkge1xuICAgIHcoXCJVUERBVEUgY2FsZW5kYXJfZXZlbnRzIFNFVCBwcmVwX2RvYz0/IFdIRVJFIGlkPT9cIiwgW2h0bWwsIHNlbGVjdGVkQ2FsSWRdKTtcbiAgfSBlbHNlIGlmIChhY3RpdmVUYWIgPT09ICdub3RlcycpIHtcbiAgICB3KFwiVVBEQVRFIG1lZXRpbmdzIFNFVCBzdW1tYXJ5PT8sIHVwZGF0ZWRfYXQ9c3RyZnRpbWUoJyVzJywnbm93JykgV0hFUkUgaWQ9P1wiLCBbaHRtbCwgaWRdKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBhdXRvU2F2ZSgpOiB2b2lkIHtcbiAgaWYgKHNhdmVUaW1lb3V0KSBjbGVhclRpbWVvdXQoc2F2ZVRpbWVvdXQpO1xuICBzYXZlVGltZW91dCA9IHNldFRpbWVvdXQoKCkgPT4gZmx1c2hTYXZlKCksIDE1MDApO1xufVxuXG5mdW5jdGlvbiBpc1NhbWVNZWV0aW5nRGF5KGE/OiBzdHJpbmcsIGI/OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgcmV0dXJuICEhYSAmJiAhIWIgJiYgYS5zcGxpdCgnVCcpWzBdID09PSBiLnNwbGl0KCdUJylbMF07XG59XG5cbi8vIEZpbmQgbGlua2VkIENhbEV2ZW50OiBmaXJzdCBieSBleHBsaWNpdCBtZWV0aW5nX2lkLCB0aGVuIGJ5IHRpdGxlK2RhdGUgZnV6enkgbWF0Y2hcbmZ1bmN0aW9uIGZpbmRMaW5rZWRDYWxFdmVudChtOiBNZWV0aW5nKTogQ2FsRXZlbnQgfCB1bmRlZmluZWQge1xuICBjb25zdCBieUlkID0gY2FsRXZlbnRzLmZpbmQoZSA9PiBlLm1lZXRpbmdfaWQgPT09IG0uaWQgJiYgaXNTYW1lTWVldGluZ0RheShlLnN0YXJ0X3RpbWUsIG0uZGF0ZSkpO1xuICBpZiAoYnlJZCkgcmV0dXJuIGJ5SWQ7XG4gIGlmICghbS5kYXRlKSByZXR1cm4gdW5kZWZpbmVkO1xuICByZXR1cm4gY2FsRXZlbnRzLmZpbmQoZSA9PlxuICAgIGUudGl0bGUudG9Mb3dlckNhc2UoKSA9PT0gbS50aXRsZS50b0xvd2VyQ2FzZSgpXG4gICAgJiYgaXNTYW1lTWVldGluZ0RheShlLnN0YXJ0X3RpbWUsIG0uZGF0ZSkpO1xufVxuXG5mdW5jdGlvbiBnZXRMaW5rZWRNZWV0aW5nRm9yRXZlbnQoZTogQ2FsRXZlbnQpOiBNZWV0aW5nIHwgbnVsbCB7XG4gIGNvbnN0IGJ5SWQgPSBlLm1lZXRpbmdfaWQgPyBtZWV0aW5ncy5maW5kKG0gPT4gbS5pZCA9PT0gZS5tZWV0aW5nX2lkKSA6IG51bGw7XG4gIGlmIChieUlkICYmIGlzU2FtZU1lZXRpbmdEYXkoYnlJZC5kYXRlLCBlLnN0YXJ0X3RpbWUpKSByZXR1cm4gYnlJZDtcbiAgcmV0dXJuIG1lZXRpbmdzLmZpbmQobSA9PlxuICAgIG0udGl0bGUudG9Mb3dlckNhc2UoKSA9PT0gZS50aXRsZS50b0xvd2VyQ2FzZSgpXG4gICAgJiYgaXNTYW1lTWVldGluZ0RheShtLmRhdGUsIGUuc3RhcnRfdGltZSlcbiAgKSB8fCBudWxsO1xufVxuXG5mdW5jdGlvbiBoYXNNZWV0aW5nQ29udGVudChtPzogTWVldGluZyB8IG51bGwpOiBib29sZWFuIHtcbiAgcmV0dXJuICEhKG0gJiYgKChtLm5vdGVzIHx8ICcnKS50cmltKCkgfHwgKG0uc3VtbWFyeSB8fCAnJykudHJpbSgpIHx8IChtLnRyYW5zY3JpcHQgfHwgJycpLnRyaW0oKSkpO1xufVxuXG5mdW5jdGlvbiBwYXJzZUF0dGVuZGVlcyhqc29uOiBzdHJpbmcpOiBBdHRlbmRlZVtdIHtcbiAgdHJ5IHsgcmV0dXJuIEpTT04ucGFyc2UoanNvbiB8fCAnW10nKTsgfSBjYXRjaCB7IHJldHVybiBbXTsgfVxufVxuZnVuY3Rpb24gZ2V0SW5pdGlhbHMobmFtZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgaWYgKCFuYW1lKSByZXR1cm4gJz8nO1xuICBjb25zdCBwYXJ0cyA9IG5hbWUuc3BsaXQoL1tcXHNALl0rLykuZmlsdGVyKEJvb2xlYW4pO1xuICBpZiAocGFydHMubGVuZ3RoID49IDIpIHJldHVybiAocGFydHNbMF1bMF0gKyBwYXJ0c1sxXVswXSkudG9VcHBlckNhc2UoKTtcbiAgcmV0dXJuIG5hbWUuc2xpY2UoMCwgMikudG9VcHBlckNhc2UoKTtcbn1cbmNvbnN0IGF2YXRhckNvbG9ycyA9IFsnIzAxNjFFMCcsJyM3QzNBRUQnLCcjMDU5NjY5JywnI0Q5NzcwNicsJyNEQzI2MjYnLCcjMDg5MUIyJywnI0JFMTg1RCcsJyM0RjQ2RTUnXTtcbmZ1bmN0aW9uIGF2YXRhckNvbG9yKG5hbWU6IHN0cmluZyk6IHN0cmluZyB7XG4gIGxldCBoID0gMDsgZm9yIChsZXQgaSA9IDA7IGkgPCBuYW1lLmxlbmd0aDsgaSsrKSBoID0gbmFtZS5jaGFyQ29kZUF0KGkpICsgKChoIDw8IDUpIC0gaCk7XG4gIHJldHVybiBhdmF0YXJDb2xvcnNbTWF0aC5hYnMoaCkgJSBhdmF0YXJDb2xvcnMubGVuZ3RoXTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gdHJpZ2dlclByZXAoZXZlbnRJZDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gIGNvbnN0IGV2ID0gY2FsRXZlbnRzLmZpbmQoZSA9PiBlLmlkID09PSBldmVudElkKTtcbiAgaWYgKCFldikgcmV0dXJuO1xuICBjb25zdCBhdHRlbmRlZXMgPSBwYXJzZUF0dGVuZGVlcyhldi5hdHRlbmRlZXMpO1xuICBjb25zdCByZXEgPSB7IGV2ZW50X2lkOiBldmVudElkLCB0aXRsZTogZXYudGl0bGUsIGF0dGVuZGVlcywgc3RhcnRfdGltZTogZXYuc3RhcnRfdGltZSwgY2FsZW5kYXJfbmFtZTogZXYuY2FsZW5kYXJfbmFtZSB9O1xuICBwcmVwTG9ncyA9IFtdOyBwcmVwU3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcbiAgYXdhaXQgdyhcIlVQREFURSBjYWxlbmRhcl9ldmVudHMgU0VUIHByZXBfc3RhdHVzPSdwcmVwYXJpbmcnLCBwcmVwX2RvYz0/IFdIRVJFIGlkPT9cIiwgW0pTT04uc3RyaW5naWZ5KHJlcSksIGV2ZW50SWRdKTtcbiAgLy8gTmF2aWdhdGUgdG8gcHJlcCB2aWV3IGltbWVkaWF0ZWx5IHNvIHVzZXIgc2VlcyBwcm9ncmVzc1xuICB2aWV3ID0gJ21lZXRpbmcnOyBzZWxlY3RlZENhbElkID0gZXZlbnRJZDsgYWN0aXZlVGFiID0gJ3ByZXAnO1xuICBhd2FpdCBsb2FkQWxsKCk7XG4gIHJ1bkpvYihQUkVQX0pPQikuY2F0Y2goKCkgPT4ge30pO1xuICBzdGFydFByZXBQb2xsKGV2ZW50SWQpO1xufVxuXG5mdW5jdGlvbiBzdGFydFByZXBQb2xsKGV2ZW50SWQ6IHN0cmluZyk6IHZvaWQge1xuICBpZiAocHJlcFBvbGxJbnRlcnZhbCkgY2xlYXJJbnRlcnZhbChwcmVwUG9sbEludGVydmFsKTtcbiAgbGV0IGF0dGVtcHRzID0gMDtcbiAgY29uc3QgTUFYX0FUVEVNUFRTID0gMjAwOyAvLyAxMCBtaW4gdGltZW91dCAoMjAwICogM3MpXG4gIC8vIENoZWNrIGltbWVkaWF0ZWx5IFx1MjAxNCBkb24ndCB3YWl0IDNzIGZvciBmaXJzdCB0aWNrXG4gIChhc3luYyAoKSA9PiB7XG4gICAgY29uc3Qgcm93cyA9IGF3YWl0IHEoXCJTRUxFQ1QgcHJlcF9zdGF0dXMgRlJPTSBjYWxlbmRhcl9ldmVudHMgV0hFUkUgaWQ9P1wiLCBbZXZlbnRJZF0pO1xuICAgIGlmIChyb3dzLmxlbmd0aCAmJiByb3dzWzBdLnByZXBfc3RhdHVzID09PSAncmVhZHknKSB7XG4gICAgICBjbGVhckludGVydmFsKHByZXBQb2xsSW50ZXJ2YWwhKTsgcHJlcFBvbGxJbnRlcnZhbCA9IG51bGw7XG4gICAgICBwcmVwTG9ncyA9IFtdOyBhd2FpdCBsb2FkQWxsKCk7IHJldHVybjtcbiAgICB9XG4gIH0pKCk7XG4gIHByZXBQb2xsSW50ZXJ2YWwgPSBzZXRJbnRlcnZhbChhc3luYyAoKSA9PiB7XG4gICAgYXR0ZW1wdHMrKztcbiAgICBmZXRjaFByZXBMb2dzKCk7XG4gICAgY29uc3Qgcm93cyA9IGF3YWl0IHEoXCJTRUxFQ1QgcHJlcF9zdGF0dXMsIHByZXBfZG9jIEZST00gY2FsZW5kYXJfZXZlbnRzIFdIRVJFIGlkPT9cIiwgW2V2ZW50SWRdKTtcbiAgICBpZiAocm93cy5sZW5ndGggJiYgcm93c1swXS5wcmVwX3N0YXR1cyA9PT0gJ3JlYWR5Jykge1xuICAgICAgY2xlYXJJbnRlcnZhbChwcmVwUG9sbEludGVydmFsISk7IHByZXBQb2xsSW50ZXJ2YWwgPSBudWxsO1xuICAgICAgcHJlcExvZ3MgPSBbXTtcbiAgICAgIGF3YWl0IGxvYWRBbGwoKTtcbiAgICB9IGVsc2UgaWYgKGF0dGVtcHRzID49IE1BWF9BVFRFTVBUUyB8fCAocm93cy5sZW5ndGggJiYgcm93c1swXS5wcmVwX3N0YXR1cyA9PT0gJ2ZhaWxlZCcpKSB7XG4gICAgICBjbGVhckludGVydmFsKHByZXBQb2xsSW50ZXJ2YWwhKTsgcHJlcFBvbGxJbnRlcnZhbCA9IG51bGw7XG4gICAgICBwcmVwTG9ncyA9IFtdO1xuICAgICAgc2hvd1RvYXN0KCdlcnJvcicsICdQcmVwIHRpbWVkIG91dCBcdTIwMTQgYWdlbnQgdG9vayB0b28gbG9uZycsIHtsYWJlbDogJ1JldHJ5JywgZm46IGB0cmlnZ2VyUHJlcCgnJHtldmVudElkfScpYH0pO1xuICAgICAgYXdhaXQgdyhcIlVQREFURSBjYWxlbmRhcl9ldmVudHMgU0VUIHByZXBfc3RhdHVzPSdmYWlsZWQnIFdIRVJFIGlkPT8gQU5EIHByZXBfc3RhdHVzPSdwcmVwYXJpbmcnXCIsIFtldmVudElkXSk7XG4gICAgICBhd2FpdCBsb2FkQWxsKCk7XG4gICAgfVxuICB9LCAzMDAwKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gcmVjb3ZlclN0dWNrUHJlcHMoKTogUHJvbWlzZTx2b2lkPiB7XG4gIGNvbnN0IHN0dWNrID0gYXdhaXQgcShcIlNFTEVDVCBpZCBGUk9NIGNhbGVuZGFyX2V2ZW50cyBXSEVSRSBwcmVwX3N0YXR1cz0ncHJlcGFyaW5nJ1wiKTtcbiAgaWYgKHN0dWNrLmxlbmd0aCA+IDApIHtcbiAgICBzdGFydFByZXBQb2xsKHN0dWNrWzBdLmlkKTtcbiAgfVxufVxuXG4vLyBSZWNvdmVyIHJlY29yZGluZyBzdGF0ZSBvbiBhcHAgbG9hZCAoZS5nLiBhZnRlciBuYXZpZ2F0aW5nIGF3YXkgb3IgcmVmcmVzaClcbmFzeW5jIGZ1bmN0aW9uIHJlY292ZXJSZWNvcmRpbmdTdGF0ZSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgY29uc3Qgcm93cyA9IGF3YWl0IHEoXCJTRUxFQ1QgaWQsIGRhdGUgRlJPTSBtZWV0aW5ncyBXSEVSRSBzdGF0dXM9J3JlY29yZGluZycgTElNSVQgMVwiKTtcbiAgaWYgKHJvd3MubGVuZ3RoID4gMCkge1xuICAgIGNvbnN0IG0gPSByb3dzWzBdO1xuICAgIGlzUmVjb3JkaW5nID0gdHJ1ZTtcbiAgICByZWNvcmRpbmdJZCA9IG0uaWQ7XG4gICAgcGVybWlzc2lvbkdyYW50ZWQgPSB0cnVlO1xuICAgIGNvbnN0IHN0YXJ0VGltZSA9IG5ldyBEYXRlKG0uZGF0ZSkuZ2V0VGltZSgpO1xuICAgIGVsYXBzZWRTZWNvbmRzID0gTWF0aC5tYXgoMCwgTWF0aC5mbG9vcigoRGF0ZS5ub3coKSAtIHN0YXJ0VGltZSkgLyAxMDAwKSk7XG4gICAgaWYgKCF0aW1lckludGVydmFsKSB7XG4gICAgICB0aW1lckludGVydmFsID0gc3RhcnRSZWNUaW1lcigpO1xuICAgIH1cbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBkZXRlY3RMaXZlTG9jYXRpb24oKTogUHJvbWlzZTx2b2lkPiB7XG4gIGNvbnN0IHNhdmVMb2NhdGlvbiA9IGFzeW5jIChjaXR5OiBzdHJpbmcsIHNvdXJjZTogc3RyaW5nLCBsYXQ6IG51bWJlciB8IG51bGwgPSBudWxsLCBsb246IG51bWJlciB8IG51bGwgPSBudWxsKTogUHJvbWlzZTx2b2lkPiA9PiB7XG4gICAgbGl2ZUNpdHkgPSBjaXR5O1xuICAgIGxpdmVMb2NhdGlvblJlYXNvbiA9IGAke3NvdXJjZSA9PT0gJ2dlb2xvY2F0aW9uJyA/ICdMaXZlIGxvY2F0aW9uJyA6ICdOZXR3b3JrIGxvY2F0aW9uJ30gc2F5cyAke2NpdHl9JHtiZz8uY2l0eSAmJiBiZy5jaXR5ICE9PSBjaXR5ID8gYCBcdTIwMTQgb3ZlcnJpZGluZyBjYWxlbmRhci1kZXJpdmVkICR7YmcuY2l0eX1gIDogJyd9YDtcbiAgICBhd2FpdCB3KGBDUkVBVEUgVEFCTEUgSUYgTk9UIEVYSVNUUyBsb2NhdGlvbl9vdmVycmlkZSAoaWQgVEVYVCBQUklNQVJZIEtFWSwgY2l0eSBURVhUIERFRkFVTFQgJycsIGxhdCBSRUFMLCBsb24gUkVBTCwgc291cmNlIFRFWFQgREVGQVVMVCAnJywgdXBkYXRlZF9hdCBJTlRFR0VSIERFRkFVTFQgKHN0cmZ0aW1lKCclcycsJ25vdycpKSlgKTtcbiAgICBhd2FpdCB3KGBJTlNFUlQgSU5UTyBsb2NhdGlvbl9vdmVycmlkZSAoaWQsIGNpdHksIGxhdCwgbG9uLCBzb3VyY2UsIHVwZGF0ZWRfYXQpIFZBTFVFUyAoJ2xhdGVzdCcsID8sID8sID8sID8sIHN0cmZ0aW1lKCclcycsJ25vdycpKSBPTiBDT05GTElDVChpZCkgRE8gVVBEQVRFIFNFVCBjaXR5PWV4Y2x1ZGVkLmNpdHksIGxhdD1leGNsdWRlZC5sYXQsIGxvbj1leGNsdWRlZC5sb24sIHNvdXJjZT1leGNsdWRlZC5zb3VyY2UsIHVwZGF0ZWRfYXQ9ZXhjbHVkZWQudXBkYXRlZF9hdGAsIFtjaXR5LCBsYXQsIGxvbiwgc291cmNlXSk7XG4gICAgcmVuZGVyKCk7XG4gICAgaWYgKGNpdHkgIT09IGJnPy5jaXR5KSB7XG4gICAgICBhd2FpdCBydW5Kb2IoQkdfSk9CKS5jYXRjaCgoKSA9PiB7fSk7XG4gICAgICBhd2FpdCBzbGVlcCgxODAwKTtcbiAgICAgIGF3YWl0IGxvYWRBbGwoKTtcbiAgICB9XG4gIH07XG5cbiAgaWYgKCdnZW9sb2NhdGlvbicgaW4gbmF2aWdhdG9yKSB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHBvcyA9IGF3YWl0IG5ldyBQcm9taXNlPEdlb2xvY2F0aW9uUG9zaXRpb24+KChyZXNvbHZlLCByZWplY3QpID0+IG5hdmlnYXRvci5nZW9sb2NhdGlvbi5nZXRDdXJyZW50UG9zaXRpb24ocmVzb2x2ZSwgcmVqZWN0LCB7IGVuYWJsZUhpZ2hBY2N1cmFjeTogZmFsc2UsIHRpbWVvdXQ6IDM1MDAsIG1heGltdW1BZ2U6IDYwICogNjAgKiAxMDAwIH0pKTtcbiAgICAgIGNvbnN0IGxhdCA9IHBvcy5jb29yZHMubGF0aXR1ZGU7XG4gICAgICBjb25zdCBsb24gPSBwb3MuY29vcmRzLmxvbmdpdHVkZTtcbiAgICAgIGNvbnN0IHIgPSBhd2FpdCBmZXRjaChgaHR0cHM6Ly9ub21pbmF0aW0ub3BlbnN0cmVldG1hcC5vcmcvcmV2ZXJzZT9mb3JtYXQ9anNvbnYyJmxhdD0ke2xhdH0mbG9uPSR7bG9ufWAsIHsgaGVhZGVyczogeyAnQWNjZXB0JzogJ2FwcGxpY2F0aW9uL2pzb24nIH0gfSk7XG4gICAgICBjb25zdCBkYXRhID0gYXdhaXQgci5qc29uKCk7XG4gICAgICBjb25zdCBhZGRyID0gZGF0YS5hZGRyZXNzIHx8IHt9O1xuICAgICAgY29uc3QgY2l0eSA9IGFkZHIuY2l0eSB8fCBhZGRyLnRvd24gfHwgYWRkci52aWxsYWdlIHx8IGFkZHIuY291bnR5IHx8IGRhdGEubmFtZSB8fCAnJztcbiAgICAgIGlmIChjaXR5KSB7XG4gICAgICAgIGF3YWl0IHNhdmVMb2NhdGlvbihjaXR5LCAnZ2VvbG9jYXRpb24nLCBsYXQsIGxvbik7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9IGNhdGNoIHt9XG4gIH1cblxuICB0cnkge1xuICAgIGNvbnN0IHIgPSBhd2FpdCBmZXRjaCgnaHR0cHM6Ly9pcGFwaS5jby9qc29uLycpO1xuICAgIGNvbnN0IGRhdGEgPSBhd2FpdCByLmpzb24oKTtcbiAgICBjb25zdCBjaXR5ID0gZGF0YT8uY2l0eSB8fCBkYXRhPy5yZWdpb24gfHwgJyc7XG4gICAgaWYgKGNpdHkpIGF3YWl0IHNhdmVMb2NhdGlvbihjaXR5LCAnaXAnKTtcbiAgfSBjYXRjaCB7fVxufVxuXG5hc3luYyBmdW5jdGlvbiBkZWxldGVNZWV0aW5nKGlkOiBzdHJpbmcsIGU6IEV2ZW50KTogUHJvbWlzZTx2b2lkPiB7XG4gIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gIGF3YWl0IHcoXCJERUxFVEUgRlJPTSBtZWV0aW5ncyBXSEVSRSBpZD0/XCIsIFtpZF0pO1xuICBpZiAoc2VsZWN0ZWRJZCA9PT0gaWQpIHsgc2VsZWN0ZWRJZCA9IG51bGw7IHZpZXcgPSAnaG9tZSc7IH1cbiAgYXdhaXQgbG9hZEFsbCgpO1xufVxuXG5mdW5jdGlvbiBvcGVuTWVldGluZyhpZDogc3RyaW5nLCB0YWI/OiBzdHJpbmcpOiB2b2lkIHtcbiAgc2VsZWN0ZWRJZCA9IGlkOyB2aWV3ID0gJ21lZXRpbmcnOyBhY3RpdmVUYWIgPSAodGFiIGFzIGFueSkgfHwgJ25vdGVzJztcbiAgY29uc3QgbSA9IG1lZXRpbmdzLmZpbmQoeCA9PiB4LmlkID09PSBpZCk7XG4gIGlmIChtKSB7XG4gICAgY29uc3QgbGlua2VkRXYgPSBmaW5kTGlua2VkQ2FsRXZlbnQobSk7XG4gICAgc2VsZWN0ZWRDYWxJZCA9IGxpbmtlZEV2Py5pZCB8fCBudWxsO1xuICAgIC8vIFJlY292ZXIgcmVjb3JkaW5nIHN0YXRlIGlmIG5hdmlnYXRpbmcgYmFjayB0byBhbiBhY3RpdmUgcmVjb3JkaW5nXG4gICAgaWYgKG0uc3RhdHVzID09PSAncmVjb3JkaW5nJyAmJiAhaXNSZWNvcmRpbmcpIHtcbiAgICAgIGlzUmVjb3JkaW5nID0gdHJ1ZTtcbiAgICAgIHJlY29yZGluZ0lkID0gaWQ7XG4gICAgICBwZXJtaXNzaW9uR3JhbnRlZCA9IHRydWU7XG4gICAgICBpZiAoIXRpbWVySW50ZXJ2YWwpIHtcbiAgICAgICAgY29uc3Qgc3RhcnRUaW1lID0gbmV3IERhdGUobS5kYXRlKS5nZXRUaW1lKCk7XG4gICAgICAgIGVsYXBzZWRTZWNvbmRzID0gTWF0aC5tYXgoMCwgTWF0aC5mbG9vcigoRGF0ZS5ub3coKSAtIHN0YXJ0VGltZSkgLyAxMDAwKSk7XG4gICAgICAgIHRpbWVySW50ZXJ2YWwgPSBzdGFydFJlY1RpbWVyKCk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChbJ3N0b3BwaW5nJywncmVjb3JkZWQnLCd0cmFuc2NyaWJpbmcnLCdwZW5kaW5nJ10uaW5jbHVkZXMobS5zdGF0dXMpKSBzdGFydFBvbGwoaWQpO1xuICAgIGlmIChtLnN0YXR1cyA9PT0gJ3N0b3BwaW5nJykgdHJpZ2dlcldoaXNwZXJXaGVuUmVhZHkoaWQpO1xuICAgIGlmIChtLnN0YXR1cyA9PT0gJ3JlY29yZGVkJykgcnVuSm9iKFdISVNQRVJfSk9CKS5jYXRjaCgoKSA9PiB7fSk7XG4gICAgaWYgKG0uc3RhdHVzID09PSAncGVuZGluZycpIHJ1bkpvYihTVU1NQVJJWkVSX0pPQikuY2F0Y2goKCkgPT4ge30pO1xuICB9IGVsc2Uge1xuICAgIGNvbnN0IGV2ID0gY2FsRXZlbnRzLmZpbmQoZSA9PiBlLmlkID09PSBpZCk7XG4gICAgaWYgKGV2KSB7XG4gICAgICBzZWxlY3RlZENhbElkID0gZXYuaWQ7XG4gICAgICBzZWxlY3RlZElkID0gZXYubWVldGluZ19pZCB8fCBudWxsO1xuICAgICAgYWN0aXZlVGFiID0gdGFiIHx8ICdwcmVwJztcbiAgICB9XG4gIH1cbiAgcmVuZGVyKCk7XG59XG5cbi8vIFRhZ3MgXHUyMDE0IExMTS1nZW5lcmF0ZWQsIHN0b3JlZCBhcyBKU09OIGFycmF5IGluIERCXG5mdW5jdGlvbiBleHRyYWN0VGFncyhtOiBNZWV0aW5nKTogc3RyaW5nW10ge1xuICBpZiAoIW0udGFncykgcmV0dXJuIFtdO1xuICB0cnkgeyByZXR1cm4gSlNPTi5wYXJzZShtLnRhZ3MpIGFzIHN0cmluZ1tdOyB9IGNhdGNoIHsgcmV0dXJuIFtdOyB9XG59XG5mdW5jdGlvbiBnZXRBbGxUYWdzKCk6IHN0cmluZ1tdIHtcbiAgY29uc3QgYWxsID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIG1lZXRpbmdzLmZvckVhY2gobSA9PiBleHRyYWN0VGFncyhtKS5mb3JFYWNoKHQgPT4gYWxsLmFkZCh0KSkpO1xuICByZXR1cm4gWy4uLmFsbF07XG59XG5mdW5jdGlvbiBnZXRBbGxQZW9wbGUoKTogQXR0ZW5kZWVbXSB7XG4gIGNvbnN0IHNlZW4gPSBuZXcgTWFwPHN0cmluZywgQXR0ZW5kZWU+KCk7XG4gIG1lZXRpbmdzLmZvckVhY2gobSA9PiB7XG4gICAgY29uc3QgZXYgPSBmaW5kTGlua2VkQ2FsRXZlbnQobSk7XG4gICAgaWYgKGV2KSB7XG4gICAgICBwYXJzZUF0dGVuZGVlcyhldi5hdHRlbmRlZXMpLmZvckVhY2goYSA9PiB7XG4gICAgICAgIGlmICghc2Vlbi5oYXMoYS5lbWFpbCkpIHNlZW4uc2V0KGEuZW1haWwsIGEpO1xuICAgICAgfSk7XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIFsuLi5zZWVuLnZhbHVlcygpXS5zb3J0KChhLCBiKSA9PiAoYS5uYW1lIHx8IGEuZW1haWwpLmxvY2FsZUNvbXBhcmUoYi5uYW1lIHx8IGIuZW1haWwpKTtcbn1cbmZ1bmN0aW9uIGZpbHRlck1lZXRpbmdzKCk6IE1lZXRpbmdbXSB7XG4gIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCk7XG4gIGNvbnN0IHRvZGF5U3RhcnQgPSBuZXcgRGF0ZShub3cuZ2V0RnVsbFllYXIoKSwgbm93LmdldE1vbnRoKCksIG5vdy5nZXREYXRlKCkpO1xuICBjb25zdCB3ZWVrU3RhcnQgPSBuZXcgRGF0ZSh0b2RheVN0YXJ0KTsgd2Vla1N0YXJ0LnNldERhdGUodG9kYXlTdGFydC5nZXREYXRlKCkgLSA3KTtcbiAgY29uc3QgbW9udGhTdGFydCA9IG5ldyBEYXRlKG5vdy5nZXRGdWxsWWVhcigpLCBub3cuZ2V0TW9udGgoKSwgMSk7XG4gIHJldHVybiBtZWV0aW5ncy5maWx0ZXIobSA9PiB7XG4gICAgY29uc3QgZCA9IG5ldyBEYXRlKG0uZGF0ZSk7XG4gICAgaWYgKGFjdGl2ZUZpbHRlciA9PT0gJ3RvZGF5JyAmJiBkIDwgdG9kYXlTdGFydCkgcmV0dXJuIGZhbHNlO1xuICAgIGlmIChhY3RpdmVGaWx0ZXIgPT09ICd3ZWVrJyAmJiBkIDwgd2Vla1N0YXJ0KSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKGFjdGl2ZUZpbHRlciA9PT0gJ21vbnRoJyAmJiBkIDwgbW9udGhTdGFydCkgcmV0dXJuIGZhbHNlO1xuICAgIGlmIChhY3RpdmVUYWdzLmxlbmd0aCA+IDAgJiYgIWFjdGl2ZVRhZ3Muc29tZSh0ID0+IGV4dHJhY3RUYWdzKG0pLmluY2x1ZGVzKHQpKSkgcmV0dXJuIGZhbHNlO1xuICAgIGlmIChhY3RpdmVQZW9wbGUubGVuZ3RoID4gMCkge1xuICAgICAgY29uc3QgZXYgPSBmaW5kTGlua2VkQ2FsRXZlbnQobSk7XG4gICAgICBpZiAoIWV2KSByZXR1cm4gZmFsc2U7XG4gICAgICBjb25zdCBlbWFpbHMgPSBwYXJzZUF0dGVuZGVlcyhldi5hdHRlbmRlZXMpLm1hcChhID0+IGEuZW1haWwpO1xuICAgICAgaWYgKCFhY3RpdmVQZW9wbGUuc29tZShwID0+IGVtYWlscy5pbmNsdWRlcyhwKSkpIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH0pO1xufVxuXG4vLyBDYWxlbmRhciBoZWxwZXJzXG5mdW5jdGlvbiBsb2NhbERhdGVTdHIoZCA9IG5ldyBEYXRlKCkpOiBzdHJpbmcge1xuICByZXR1cm4gYCR7ZC5nZXRGdWxsWWVhcigpfS0ke1N0cmluZyhkLmdldE1vbnRoKCkrMSkucGFkU3RhcnQoMiwnMCcpfS0ke1N0cmluZyhkLmdldERhdGUoKSkucGFkU3RhcnQoMiwnMCcpfWA7XG59XG5mdW5jdGlvbiBnZXRUb2RheUV2ZW50cygpOiBDYWxFdmVudFtdIHtcbiAgY29uc3QgdG9kYXlTdHIgPSBsb2NhbERhdGVTdHIoKTtcbiAgcmV0dXJuIGNhbEV2ZW50cy5maWx0ZXIoZSA9PiBlLnN0YXJ0X3RpbWUuc3RhcnRzV2l0aCh0b2RheVN0cikpO1xufVxuZnVuY3Rpb24gZ2V0V2Vla0V2ZW50cygpOiBNYXA8c3RyaW5nLCBDYWxFdmVudFtdPiB7XG4gIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCk7XG4gIGNvbnN0IHN0YXJ0T2ZXZWVrID0gbmV3IERhdGUobm93KTsgc3RhcnRPZldlZWsuc2V0RGF0ZShub3cuZ2V0RGF0ZSgpIC0gbm93LmdldERheSgpKTtcbiAgY29uc3QgZW5kT2ZXZWVrID0gbmV3IERhdGUoc3RhcnRPZldlZWspOyBlbmRPZldlZWsuc2V0RGF0ZShzdGFydE9mV2Vlay5nZXREYXRlKCkgKyA2KTtcbiAgY29uc3QgYnlEYXkgPSBuZXcgTWFwPHN0cmluZywgQ2FsRXZlbnRbXT4oKTtcbiAgZm9yIChsZXQgZCA9IG5ldyBEYXRlKHN0YXJ0T2ZXZWVrKTsgZCA8PSBlbmRPZldlZWs7IGQuc2V0RGF0ZShkLmdldERhdGUoKSArIDEpKSB7XG4gICAgYnlEYXkuc2V0KGxvY2FsRGF0ZVN0cihkKSwgW10pO1xuICB9XG4gIGNhbEV2ZW50cy5mb3JFYWNoKGUgPT4ge1xuICAgIGNvbnN0IGsgPSBlLnN0YXJ0X3RpbWUuc2xpY2UoMCwgMTApO1xuICAgIGlmIChieURheS5oYXMoaykpIGJ5RGF5LmdldChrKSEucHVzaChlKTtcbiAgfSk7XG4gIHJldHVybiBieURheTtcbn1cbmZ1bmN0aW9uIGdldE1vbnRoRXZlbnRzKCk6IHsgd2Vla3M6IHtkYXk6IG51bWJlciwgZGF0ZTogc3RyaW5nLCBpc1RvZGF5OiBib29sZWFuLCBldmVudHM6IENhbEV2ZW50W119W11bXSB9IHtcbiAgY29uc3Qgbm93ID0gbmV3IERhdGUoKTtcbiAgY29uc3QgeSA9IG5vdy5nZXRGdWxsWWVhcigpLCBtbyA9IG5vdy5nZXRNb250aCgpO1xuICBjb25zdCBmaXJzdCA9IG5ldyBEYXRlKHksIG1vLCAxKTtcbiAgY29uc3QgbGFzdCA9IG5ldyBEYXRlKHksIG1vICsgMSwgMCk7XG4gIGNvbnN0IHRvZGF5U3RyID0gbG9jYWxEYXRlU3RyKG5vdyk7XG4gIGNvbnN0IHdlZWtzOiB7ZGF5OiBudW1iZXIsIGRhdGU6IHN0cmluZywgaXNUb2RheTogYm9vbGVhbiwgZXZlbnRzOiBDYWxFdmVudFtdfVtdW10gPSBbXTtcbiAgbGV0IHdlZWs6IHR5cGVvZiB3ZWVrc1swXSA9IFtdO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGZpcnN0LmdldERheSgpOyBpKyspIHdlZWsucHVzaCh7ZGF5OiAwLCBkYXRlOiAnJywgaXNUb2RheTogZmFsc2UsIGV2ZW50czogW119KTtcbiAgZm9yIChsZXQgZCA9IDE7IGQgPD0gbGFzdC5nZXREYXRlKCk7IGQrKykge1xuICAgIGNvbnN0IGRzID0geSArICctJyArIFN0cmluZyhtbysxKS5wYWRTdGFydCgyLCcwJykgKyAnLScgKyBTdHJpbmcoZCkucGFkU3RhcnQoMiwnMCcpO1xuICAgIGNvbnN0IGV2cyA9IGNhbEV2ZW50cy5maWx0ZXIoZSA9PiBlLnN0YXJ0X3RpbWUuc3RhcnRzV2l0aChkcykpO1xuICAgIHdlZWsucHVzaCh7ZGF5OiBkLCBkYXRlOiBkcywgaXNUb2RheTogZHMgPT09IHRvZGF5U3RyLCBldmVudHM6IGV2c30pO1xuICAgIGlmICh3ZWVrLmxlbmd0aCA9PT0gNykgeyB3ZWVrcy5wdXNoKHdlZWspOyB3ZWVrID0gW107IH1cbiAgfVxuICBpZiAod2Vlay5sZW5ndGgpIHsgd2hpbGUgKHdlZWsubGVuZ3RoIDwgNykgd2Vlay5wdXNoKHtkYXk6IDAsIGRhdGU6ICcnLCBpc1RvZGF5OiBmYWxzZSwgZXZlbnRzOiBbXX0pOyB3ZWVrcy5wdXNoKHdlZWspOyB9XG4gIHJldHVybiB7d2Vla3N9O1xufVxuZnVuY3Rpb24gc2hvcnREYXkoaTogbnVtYmVyKTogc3RyaW5nIHsgcmV0dXJuIFsnU3VuJywnTW9uJywnVHVlJywnV2VkJywnVGh1JywnRnJpJywnU2F0J11baV07IH1cbmZ1bmN0aW9uIGlzRXZlbnROb3coZTogQ2FsRXZlbnQpOiBib29sZWFuIHtcbiAgY29uc3Qgbm93ID0gbmV3IERhdGUoKTtcbiAgcmV0dXJuIG5ldyBEYXRlKGUuc3RhcnRfdGltZSkgPD0gbm93ICYmIG5vdyA8PSBuZXcgRGF0ZShlLmVuZF90aW1lKTtcbn1cbmZ1bmN0aW9uIGlzRXZlbnRTb29uKGU6IENhbEV2ZW50KTogYm9vbGVhbiB7XG4gIGNvbnN0IGRpZmYgPSAobmV3IERhdGUoZS5zdGFydF90aW1lKS5nZXRUaW1lKCkgLSBEYXRlLm5vdygpKSAvIDYwMDAwO1xuICByZXR1cm4gZGlmZiA+IDAgJiYgZGlmZiA8PSAzMDtcbn1cblxuLy8gRm9ybWF0dGluZ1xuZnVuY3Rpb24gZm10RHVyKHM6IG51bWJlcik6IHN0cmluZyB7XG4gIGNvbnN0IGggPSBNYXRoLmZsb29yKHMvMzYwMCksIG0gPSBNYXRoLmZsb29yKChzJTM2MDApLzYwKSwgc2VjID0gcyU2MDtcbiAgcmV0dXJuIGggPiAwID8gYCR7aH06JHtwYWQobSl9OiR7cGFkKHNlYyl9YCA6IGAke219OiR7cGFkKHNlYyl9YDtcbn1cbmZ1bmN0aW9uIHBhZChuOiBudW1iZXIpIHsgcmV0dXJuIFN0cmluZyhuKS5wYWRTdGFydCgyLCcwJyk7IH1cbmZ1bmN0aW9uIGZtdERhdGUoZDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIG5ldyBEYXRlKGQpLnRvTG9jYWxlRGF0ZVN0cmluZyh1bmRlZmluZWQsIHt3ZWVrZGF5OidzaG9ydCcsIG1vbnRoOidzaG9ydCcsIGRheTonbnVtZXJpYycsIGhvdXI6JzItZGlnaXQnLCBtaW51dGU6JzItZGlnaXQnfSk7XG59XG5mdW5jdGlvbiBmbXRUaW1lKHQ6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBuZXcgRGF0ZSh0KS50b0xvY2FsZVRpbWVTdHJpbmcodW5kZWZpbmVkLCB7aG91cjonMi1kaWdpdCcsIG1pbnV0ZTonMi1kaWdpdCd9KTtcbn1cbmZ1bmN0aW9uIGZtdERheUxhYmVsKHQ6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IGQgPSBuZXcgRGF0ZSh0KSwgbm93ID0gbmV3IERhdGUoKTtcbiAgY29uc3QgdG9tID0gbmV3IERhdGUobm93KTsgdG9tLnNldERhdGUobm93LmdldERhdGUoKSArIDEpO1xuICBpZiAoZC50b0RhdGVTdHJpbmcoKSA9PT0gbm93LnRvRGF0ZVN0cmluZygpKSByZXR1cm4gJ1RvZGF5JztcbiAgaWYgKGQudG9EYXRlU3RyaW5nKCkgPT09IHRvbS50b0RhdGVTdHJpbmcoKSkgcmV0dXJuICdUb21vcnJvdyc7XG4gIHJldHVybiBkLnRvTG9jYWxlRGF0ZVN0cmluZyh1bmRlZmluZWQsIHt3ZWVrZGF5Oidsb25nJywgbW9udGg6J3Nob3J0JywgZGF5OidudW1lcmljJ30pO1xufVxuZnVuY3Rpb24gZXNjKHM6IHN0cmluZyk6IHN0cmluZyB7IGNvbnN0IGQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTsgZC50ZXh0Q29udGVudCA9IHMgfHwgJyc7IHJldHVybiBkLmlubmVySFRNTDsgfVxuZnVuY3Rpb24gc3RhdHVzTGFiZWwoczogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIHtyZWNvcmRpbmc6J1JlY29yZGluZycsIHN0b3BwaW5nOidQcm9jZXNzaW5nJywgcmVjb3JkZWQ6J1RyYW5zY3JpYmluZycsIHRyYW5zY3JpYmluZzonVHJhbnNjcmliaW5nJyxcbiAgICBwZW5kaW5nOidTdW1tYXJpemluZycsIHN1bW1hcml6ZWQ6J0NvbXBsZXRlJywgc3luY2VkOidDb21wbGV0ZScsIGZhaWxlZDonRmFpbGVkJywgc2NoZWR1bGVkOidTY2hlZHVsZWQnfVtzXSB8fCAnJztcbn1cbmZ1bmN0aW9uIHN0YXR1c0NsYXNzKHM6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiB7cmVjb3JkaW5nOidzdGF0dXMtcmVjb3JkaW5nJywgc3RvcHBpbmc6J3N0YXR1cy1wcm9jZXNzaW5nJywgcmVjb3JkZWQ6J3N0YXR1cy1wcm9jZXNzaW5nJyxcbiAgICB0cmFuc2NyaWJpbmc6J3N0YXR1cy1wcm9jZXNzaW5nJywgcGVuZGluZzonc3RhdHVzLXByb2Nlc3NpbmcnLFxuICAgIHN1bW1hcml6ZWQ6J3N0YXR1cy1kb25lJywgZmFpbGVkOidzdGF0dXMtZmFpbGVkJ31bc10gfHwgJyc7XG59XG5mdW5jdGlvbiBmb3JtYXRTdW1tYXJ5KHRleHQ6IHN0cmluZyk6IHN0cmluZyB7XG4gIGlmICghdGV4dCkgcmV0dXJuICcnO1xuICBjb25zdCBsaW5lcyA9IHRleHQuc3BsaXQoJ1xcbicpO1xuICBsZXQgaHRtbCA9ICcnO1xuICBsZXQgaW5MaXN0ID0gZmFsc2U7XG4gIGxldCBpblRhYmxlID0gZmFsc2U7XG4gIGxldCB0YWJsZUhlYWRlciA9IGZhbHNlO1xuICBmb3IgKGNvbnN0IGxpbmUgb2YgbGluZXMpIHtcbiAgICBjb25zdCB0cmltbWVkID0gbGluZS50cmltKCk7XG4gICAgaWYgKCF0cmltbWVkKSB7XG4gICAgICBpZiAoaW5MaXN0KSB7IGh0bWwgKz0gJzwvdWw+JzsgaW5MaXN0ID0gZmFsc2U7IH1cbiAgICAgIGlmIChpblRhYmxlKSB7IGh0bWwgKz0gJzwvdGJvZHk+PC90YWJsZT4nOyBpblRhYmxlID0gZmFsc2U7IHRhYmxlSGVhZGVyID0gZmFsc2U7IH1cbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICAvLyBUYWJsZSByb3dzIChwaXBlcylcbiAgICBpZiAoL15cXHwoLispXFx8JC8udGVzdCh0cmltbWVkKSkge1xuICAgICAgaWYgKGluTGlzdCkgeyBodG1sICs9ICc8L3VsPic7IGluTGlzdCA9IGZhbHNlOyB9XG4gICAgICAvLyBTa2lwIHNlcGFyYXRvciByb3dzIGxpa2UgfC0tLXwtLS18XG4gICAgICBpZiAoL15cXHxbXFxzXFwtOnxdK1xcfCQvLnRlc3QodHJpbW1lZCkpIHtcbiAgICAgICAgdGFibGVIZWFkZXIgPSBmYWxzZTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBjb25zdCBjZWxscyA9IHRyaW1tZWQuc3BsaXQoJ3wnKS5maWx0ZXIoYyA9PiBjLnRyaW0oKSAhPT0gJycpLm1hcChjID0+IGMudHJpbSgpLnJlcGxhY2UoL1xcKlxcKiguKz8pXFwqXFwqL2csICc8c3Ryb25nPiQxPC9zdHJvbmc+JykpO1xuICAgICAgaWYgKCFpblRhYmxlKSB7XG4gICAgICAgIGh0bWwgKz0gJzx0YWJsZSBjbGFzcz1cIm1kLXRhYmxlXCI+PHRoZWFkPjx0cj4nO1xuICAgICAgICBjZWxscy5mb3JFYWNoKGMgPT4gaHRtbCArPSBgPHRoPiR7Y308L3RoPmApO1xuICAgICAgICBodG1sICs9ICc8L3RyPjwvdGhlYWQ+PHRib2R5Pic7XG4gICAgICAgIGluVGFibGUgPSB0cnVlO1xuICAgICAgICB0YWJsZUhlYWRlciA9IHRydWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBodG1sICs9ICc8dHI+JztcbiAgICAgICAgY2VsbHMuZm9yRWFjaChjID0+IGh0bWwgKz0gYDx0ZD4ke2N9PC90ZD5gKTtcbiAgICAgICAgaHRtbCArPSAnPC90cj4nO1xuICAgICAgfVxuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGlmIChpblRhYmxlKSB7IGh0bWwgKz0gJzwvdGJvZHk+PC90YWJsZT4nOyBpblRhYmxlID0gZmFsc2U7IHRhYmxlSGVhZGVyID0gZmFsc2U7IH1cbiAgICAvLyBIZWFkZXJzXG4gICAgaWYgKC9eIyMgKC4rKS8udGVzdCh0cmltbWVkKSkge1xuICAgICAgaWYgKGluTGlzdCkgeyBodG1sICs9ICc8L3VsPic7IGluTGlzdCA9IGZhbHNlOyB9XG4gICAgICBodG1sICs9IGA8aDM+JHt0cmltbWVkLnJlcGxhY2UoL14jIyAvLCAnJyl9PC9oMz5gO1xuICAgIH0gZWxzZSBpZiAoL14jIyMgKC4rKS8udGVzdCh0cmltbWVkKSkge1xuICAgICAgaWYgKGluTGlzdCkgeyBodG1sICs9ICc8L3VsPic7IGluTGlzdCA9IGZhbHNlOyB9XG4gICAgICBodG1sICs9IGA8aDQ+JHt0cmltbWVkLnJlcGxhY2UoL14jIyMgLywgJycpfTwvaDQ+YDtcbiAgICB9XG4gICAgLy8gQWN0aW9uIGl0ZW1zXG4gICAgZWxzZSBpZiAoL14tIFxcWyBcXF0gKC4rKS8udGVzdCh0cmltbWVkKSkge1xuICAgICAgaWYgKGluTGlzdCkgeyBodG1sICs9ICc8L3VsPic7IGluTGlzdCA9IGZhbHNlOyB9XG4gICAgICBodG1sICs9IGA8bGFiZWwgY2xhc3M9XCJhY3Rpb24taXRlbVwiPjxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIj4gJHt0cmltbWVkLnJlcGxhY2UoL14tIFxcWyBcXF0gLywgJycpLnJlcGxhY2UoL1xcKlxcKiguKz8pXFwqXFwqL2csICc8c3Ryb25nPiQxPC9zdHJvbmc+Jyl9PC9sYWJlbD5gO1xuICAgIH0gZWxzZSBpZiAoL14tIFxcW3hcXF0gKC4rKS8udGVzdCh0cmltbWVkKSkge1xuICAgICAgaWYgKGluTGlzdCkgeyBodG1sICs9ICc8L3VsPic7IGluTGlzdCA9IGZhbHNlOyB9XG4gICAgICBodG1sICs9IGA8bGFiZWwgY2xhc3M9XCJhY3Rpb24taXRlbSBkb25lXCI+PGlucHV0IHR5cGU9XCJjaGVja2JveFwiIGNoZWNrZWQ+ICR7dHJpbW1lZC5yZXBsYWNlKC9eLSBcXFt4XFxdIC8sICcnKS5yZXBsYWNlKC9cXCpcXCooLis/KVxcKlxcKi9nLCAnPHN0cm9uZz4kMTwvc3Ryb25nPicpfTwvbGFiZWw+YDtcbiAgICB9XG4gICAgLy8gTGlzdCBpdGVtc1xuICAgIGVsc2UgaWYgKC9eWy0qXSAoLispLy50ZXN0KHRyaW1tZWQpKSB7XG4gICAgICBpZiAoIWluTGlzdCkgeyBodG1sICs9ICc8dWw+JzsgaW5MaXN0ID0gdHJ1ZTsgfVxuICAgICAgaHRtbCArPSBgPGxpPiR7dHJpbW1lZC5yZXBsYWNlKC9eWy0qXSAvLCAnJykucmVwbGFjZSgvXFwqXFwqKC4rPylcXCpcXCovZywgJzxzdHJvbmc+JDE8L3N0cm9uZz4nKX08L2xpPmA7XG4gICAgfVxuICAgIC8vIFJlZ3VsYXIgdGV4dFxuICAgIGVsc2Uge1xuICAgICAgaWYgKGluTGlzdCkgeyBodG1sICs9ICc8L3VsPic7IGluTGlzdCA9IGZhbHNlOyB9XG4gICAgICBodG1sICs9IGA8cD4ke3RyaW1tZWQucmVwbGFjZSgvXFwqXFwqKC4rPylcXCpcXCovZywgJzxzdHJvbmc+JDE8L3N0cm9uZz4nKX08L3A+YDtcbiAgICB9XG4gIH1cbiAgaWYgKGluTGlzdCkgaHRtbCArPSAnPC91bD4nO1xuICBpZiAoaW5UYWJsZSkgaHRtbCArPSAnPC90Ym9keT48L3RhYmxlPic7XG4gIHJldHVybiBodG1sO1xufVxuXG5mdW5jdGlvbiBpY29uKG5hbWU6IHN0cmluZywgc2l6ZSA9IDE4KTogc3RyaW5nIHtcbiAgY29uc3QgaTogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcbiAgICBtaWM6IGA8c3ZnIHdpZHRoPVwiJHtzaXplfVwiIGhlaWdodD1cIiR7c2l6ZX1cIiB2aWV3Qm94PVwiMCAwIDI0IDI0XCIgZmlsbD1cIm5vbmVcIiBzdHJva2U9XCJjdXJyZW50Q29sb3JcIiBzdHJva2Utd2lkdGg9XCIxLjVcIiBzdHJva2UtbGluZWNhcD1cInJvdW5kXCIgc3Ryb2tlLWxpbmVqb2luPVwicm91bmRcIj48cGF0aCBkPVwiTTEyIDFhMyAzIDAgMCAwLTMgM3Y4YTMgMyAwIDAgMCA2IDBWNGEzIDMgMCAwIDAtMy0zelwiLz48cGF0aCBkPVwiTTE5IDEwdjJhNyA3IDAgMCAxLTE0IDB2LTJcIi8+PGxpbmUgeDE9XCIxMlwiIHkxPVwiMTlcIiB4Mj1cIjEyXCIgeTI9XCIyM1wiLz48bGluZSB4MT1cIjhcIiB5MT1cIjIzXCIgeDI9XCIxNlwiIHkyPVwiMjNcIi8+PC9zdmc+YCxcbiAgICBzdG9wOiBgPHN2ZyB3aWR0aD1cIiR7c2l6ZX1cIiBoZWlnaHQ9XCIke3NpemV9XCIgdmlld0JveD1cIjAgMCAyNCAyNFwiIGZpbGw9XCJjdXJyZW50Q29sb3JcIj48cmVjdCB4PVwiNlwiIHk9XCI2XCIgd2lkdGg9XCIxMlwiIGhlaWdodD1cIjEyXCIgcng9XCIyXCIvPjwvc3ZnPmAsXG4gICAgYmFjazogYDxzdmcgd2lkdGg9XCIke3NpemV9XCIgaGVpZ2h0PVwiJHtzaXplfVwiIHZpZXdCb3g9XCIwIDAgMjQgMjRcIiBmaWxsPVwibm9uZVwiIHN0cm9rZT1cImN1cnJlbnRDb2xvclwiIHN0cm9rZS13aWR0aD1cIjJcIiBzdHJva2UtbGluZWNhcD1cInJvdW5kXCIgc3Ryb2tlLWxpbmVqb2luPVwicm91bmRcIj48cG9seWxpbmUgcG9pbnRzPVwiMTUgMTggOSAxMiAxNSA2XCIvPjwvc3ZnPmAsXG4gICAgbG9jazogYDxzdmcgd2lkdGg9XCIke3NpemV9XCIgaGVpZ2h0PVwiJHtzaXplfVwiIHZpZXdCb3g9XCIwIDAgMjQgMjRcIiBmaWxsPVwibm9uZVwiIHN0cm9rZT1cImN1cnJlbnRDb2xvclwiIHN0cm9rZS13aWR0aD1cIjEuNVwiIHN0cm9rZS1saW5lY2FwPVwicm91bmRcIiBzdHJva2UtbGluZWpvaW49XCJyb3VuZFwiPjxyZWN0IHg9XCIzXCIgeT1cIjExXCIgd2lkdGg9XCIxOFwiIGhlaWdodD1cIjExXCIgcng9XCIyXCIvPjxwYXRoIGQ9XCJNNyAxMVY3YTUgNSAwIDAgMSAxMCAwdjRcIi8+PC9zdmc+YCxcbiAgICBzZXR0aW5nczogYDxzdmcgd2lkdGg9XCIke3NpemV9XCIgaGVpZ2h0PVwiJHtzaXplfVwiIHZpZXdCb3g9XCIwIDAgMjQgMjRcIiBmaWxsPVwibm9uZVwiIHN0cm9rZT1cImN1cnJlbnRDb2xvclwiIHN0cm9rZS13aWR0aD1cIjEuNVwiIHN0cm9rZS1saW5lY2FwPVwicm91bmRcIiBzdHJva2UtbGluZWpvaW49XCJyb3VuZFwiPjxjaXJjbGUgY3g9XCIxMlwiIGN5PVwiMTJcIiByPVwiM1wiLz48cGF0aCBkPVwiTTE5LjQgMTVhMS42NSAxLjY1IDAgMCAwIC4zMyAxLjgybC4wNi4wNmEyIDIgMCAwIDEtMi44MyAyLjgzbC0uMDYtLjA2YTEuNjUgMS42NSAwIDAgMC0xLjgyLS4zMyAxLjY1IDEuNjUgMCAwIDAtMSAxLjUxVjIxYTIgMiAwIDAgMS00IDB2LS4wOUExLjY1IDEuNjUgMCAwIDAgOSAxOS40YTEuNjUgMS42NSAwIDAgMC0xLjgyLjMzbC0uMDYuMDZhMiAyIDAgMCAxLTIuODMtMi44M2wuMDYtLjA2QTEuNjUgMS42NSAwIDAgMCA0LjY4IDE1YTEuNjUgMS42NSAwIDAgMC0xLjUxLTFIM2EyIDIgMCAwIDEgMC00aC4wOUExLjY1IDEuNjUgMCAwIDAgNC42IDlhMS42NSAxLjY1IDAgMCAwLS4zMy0xLjgybC0uMDYtLjA2YTIgMiAwIDAgMSAyLjgzLTIuODNsLjA2LjA2QTEuNjUgMS42NSAwIDAgMCA5IDQuNjhhMS42NSAxLjY1IDAgMCAwIDEtMS41MVYzYTIgMiAwIDAgMSA0IDB2LjA5YTEuNjUgMS42NSAwIDAgMCAxIDEuNTEgMS42NSAxLjY1IDAgMCAwIDEuODItLjMzbC4wNi0uMDZhMiAyIDAgMCAxIDIuODMgMi44M2wtLjA2LjA2QTEuNjUgMS42NSAwIDAgMCAxOS40IDlhMS42NSAxLjY1IDAgMCAwIDEuNTEgMUgyMWEyIDIgMCAwIDEgMCA0aC0uMDlhMS42NSAxLjY1IDAgMCAwLTEuNTEgMXpcIi8+PC9zdmc+YCxcbiAgICBjaGVjazogYDxzdmcgd2lkdGg9XCIke3NpemV9XCIgaGVpZ2h0PVwiJHtzaXplfVwiIHZpZXdCb3g9XCIwIDAgMjQgMjRcIiBmaWxsPVwibm9uZVwiIHN0cm9rZT1cImN1cnJlbnRDb2xvclwiIHN0cm9rZS13aWR0aD1cIjIuNVwiIHN0cm9rZS1saW5lY2FwPVwicm91bmRcIj48cG9seWxpbmUgcG9pbnRzPVwiMjAgNiA5IDE3IDQgMTJcIi8+PC9zdmc+YCxcbiAgICBjb3B5OiBgPHN2ZyB3aWR0aD1cIiR7c2l6ZX1cIiBoZWlnaHQ9XCIke3NpemV9XCIgdmlld0JveD1cIjAgMCAyNCAyNFwiIGZpbGw9XCJub25lXCIgc3Ryb2tlPVwiY3VycmVudENvbG9yXCIgc3Ryb2tlLXdpZHRoPVwiMS41XCIgc3Ryb2tlLWxpbmVjYXA9XCJyb3VuZFwiIHN0cm9rZS1saW5lam9pbj1cInJvdW5kXCI+PHJlY3QgeD1cIjlcIiB5PVwiOVwiIHdpZHRoPVwiMTNcIiBoZWlnaHQ9XCIxM1wiIHJ4PVwiMlwiIHJ5PVwiMlwiLz48cGF0aCBkPVwiTTUgMTVINGEyIDIgMCAwMS0yLTJWNGEyIDIgMCAwMTItMmg5YTIgMiAwIDAxMiAydjFcIi8+PC9zdmc+YCxcbiAgICB0cmFzaDogYDxzdmcgd2lkdGg9XCIke3NpemV9XCIgaGVpZ2h0PVwiJHtzaXplfVwiIHZpZXdCb3g9XCIwIDAgMjQgMjRcIiBmaWxsPVwibm9uZVwiIHN0cm9rZT1cImN1cnJlbnRDb2xvclwiIHN0cm9rZS13aWR0aD1cIjEuNVwiIHN0cm9rZS1saW5lY2FwPVwicm91bmRcIiBzdHJva2UtbGluZWpvaW49XCJyb3VuZFwiPjxwb2x5bGluZSBwb2ludHM9XCIzIDYgNSA2IDIxIDZcIi8+PHBhdGggZD1cIk0xOSA2djE0YTIgMiAwIDAgMS0yIDJIN2EyIDIgMCAwIDEtMi0yVjZtMyAwVjRhMiAyIDAgMCAxIDItMmg0YTIgMiAwIDAgMSAyIDJ2MlwiLz48L3N2Zz5gLFxuICAgIGNsb2NrOiBgPHN2ZyB3aWR0aD1cIiR7c2l6ZX1cIiBoZWlnaHQ9XCIke3NpemV9XCIgdmlld0JveD1cIjAgMCAyNCAyNFwiIGZpbGw9XCJub25lXCIgc3Ryb2tlPVwiY3VycmVudENvbG9yXCIgc3Ryb2tlLXdpZHRoPVwiMS41XCIgc3Ryb2tlLWxpbmVjYXA9XCJyb3VuZFwiPjxjaXJjbGUgY3g9XCIxMlwiIGN5PVwiMTJcIiByPVwiMTBcIi8+PHBvbHlsaW5lIHBvaW50cz1cIjEyIDYgMTIgMTIgMTYgMTRcIi8+PC9zdmc+YCxcbiAgICBjYWw6IGA8c3ZnIHdpZHRoPVwiJHtzaXplfVwiIGhlaWdodD1cIiR7c2l6ZX1cIiB2aWV3Qm94PVwiMCAwIDI0IDI0XCIgZmlsbD1cIm5vbmVcIiBzdHJva2U9XCJjdXJyZW50Q29sb3JcIiBzdHJva2Utd2lkdGg9XCIxLjVcIiBzdHJva2UtbGluZWNhcD1cInJvdW5kXCIgc3Ryb2tlLWxpbmVqb2luPVwicm91bmRcIj48cmVjdCB4PVwiM1wiIHk9XCI0XCIgd2lkdGg9XCIxOFwiIGhlaWdodD1cIjE4XCIgcng9XCIyXCIvPjxsaW5lIHgxPVwiMTZcIiB5MT1cIjJcIiB4Mj1cIjE2XCIgeTI9XCI2XCIvPjxsaW5lIHgxPVwiOFwiIHkxPVwiMlwiIHgyPVwiOFwiIHkyPVwiNlwiLz48bGluZSB4MT1cIjNcIiB5MT1cIjEwXCIgeDI9XCIyMVwiIHkyPVwiMTBcIi8+PC9zdmc+YCxcbiAgICBjaGV2cm9uOiBgPHN2ZyB3aWR0aD1cIiR7c2l6ZX1cIiBoZWlnaHQ9XCIke3NpemV9XCIgdmlld0JveD1cIjAgMCAyNCAyNFwiIGZpbGw9XCJub25lXCIgc3Ryb2tlPVwiY3VycmVudENvbG9yXCIgc3Ryb2tlLXdpZHRoPVwiMS41XCIgc3Ryb2tlLWxpbmVjYXA9XCJyb3VuZFwiPjxwb2x5bGluZSBwb2ludHM9XCI2IDkgMTIgMTUgMTggOVwiLz48L3N2Zz5gLFxuICAgIG5vdGU6IGA8c3ZnIHdpZHRoPVwiJHtzaXplfVwiIGhlaWdodD1cIiR7c2l6ZX1cIiB2aWV3Qm94PVwiMCAwIDI0IDI0XCIgZmlsbD1cIm5vbmVcIiBzdHJva2U9XCJjdXJyZW50Q29sb3JcIiBzdHJva2Utd2lkdGg9XCIxLjVcIiBzdHJva2UtbGluZWNhcD1cInJvdW5kXCIgc3Ryb2tlLWxpbmVqb2luPVwicm91bmRcIj48cGF0aCBkPVwiTTE0IDJINmEyIDIgMCAwIDAtMiAydjE2YTIgMiAwIDAgMCAyIDJoMTJhMiAyIDAgMCAwIDItMlY4elwiLz48cG9seWxpbmUgcG9pbnRzPVwiMTQgMiAxNCA4IDIwIDhcIi8+PC9zdmc+YCxcbiAgICBzcGFya2xlOiBgPHN2ZyB3aWR0aD1cIiR7c2l6ZX1cIiBoZWlnaHQ9XCIke3NpemV9XCIgdmlld0JveD1cIjAgMCAyNCAyNFwiIGZpbGw9XCJub25lXCIgc3Ryb2tlPVwiY3VycmVudENvbG9yXCIgc3Ryb2tlLXdpZHRoPVwiMS41XCIgc3Ryb2tlLWxpbmVjYXA9XCJyb3VuZFwiIHN0cm9rZS1saW5lam9pbj1cInJvdW5kXCI+PHBhdGggZD1cIk0xMiAybDIuNCA3LjJMMjIgMTJsLTcuNiAyLjhMMTIgMjJsLTIuNC03LjJMMiAxMmw3LjYtMi44elwiLz48L3N2Zz5gLFxuICAgIHJlZnJlc2g6IGA8c3ZnIHdpZHRoPVwiJHtzaXplfVwiIGhlaWdodD1cIiR7c2l6ZX1cIiB2aWV3Qm94PVwiMCAwIDI0IDI0XCIgZmlsbD1cIm5vbmVcIiBzdHJva2U9XCJjdXJyZW50Q29sb3JcIiBzdHJva2Utd2lkdGg9XCIxLjVcIiBzdHJva2UtbGluZWNhcD1cInJvdW5kXCIgc3Ryb2tlLWxpbmVqb2luPVwicm91bmRcIj48cG9seWxpbmUgcG9pbnRzPVwiMjMgNCAyMyAxMCAxNyAxMFwiLz48cGF0aCBkPVwiTTIwLjQ5IDE1YTkgOSAwIDEgMS0yLjEyLTkuMzZMMjMgMTBcIi8+PC9zdmc+YCxcbiAgICB0YWc6IGA8c3ZnIHdpZHRoPVwiJHtzaXplfVwiIGhlaWdodD1cIiR7c2l6ZX1cIiB2aWV3Qm94PVwiMCAwIDI0IDI0XCIgZmlsbD1cIm5vbmVcIiBzdHJva2U9XCJjdXJyZW50Q29sb3JcIiBzdHJva2Utd2lkdGg9XCIxLjVcIiBzdHJva2UtbGluZWNhcD1cInJvdW5kXCIgc3Ryb2tlLWxpbmVqb2luPVwicm91bmRcIj48cGF0aCBkPVwiTTIwLjU5IDEzLjQxbC03LjE3IDcuMTdhMiAyIDAgMCAxLTIuODMgMEwyIDEyVjJoMTBsOC41OSA4LjU5YTIgMiAwIDAgMSAwIDIuODJ6XCIvPjxsaW5lIHgxPVwiN1wiIHkxPVwiN1wiIHgyPVwiNy4wMVwiIHkyPVwiN1wiLz48L3N2Zz5gLFxuICAgIHBlcnNvbjogYDxzdmcgd2lkdGg9XCIke3NpemV9XCIgaGVpZ2h0PVwiJHtzaXplfVwiIHZpZXdCb3g9XCIwIDAgMjQgMjRcIiBmaWxsPVwibm9uZVwiIHN0cm9rZT1cImN1cnJlbnRDb2xvclwiIHN0cm9rZS13aWR0aD1cIjEuNVwiIHN0cm9rZS1saW5lY2FwPVwicm91bmRcIiBzdHJva2UtbGluZWpvaW49XCJyb3VuZFwiPjxwYXRoIGQ9XCJNMjAgMjF2LTJhNCA0IDAgMCAwLTQtNEg4YTQgNCAwIDAgMC00IDR2MlwiLz48Y2lyY2xlIGN4PVwiMTJcIiBjeT1cIjdcIiByPVwiNFwiLz48L3N2Zz5gLFxuICAgIGV5ZTogYDxzdmcgd2lkdGg9XCIke3NpemV9XCIgaGVpZ2h0PVwiJHtzaXplfVwiIHZpZXdCb3g9XCIwIDAgMjQgMjRcIiBmaWxsPVwibm9uZVwiIHN0cm9rZT1cImN1cnJlbnRDb2xvclwiIHN0cm9rZS13aWR0aD1cIjEuNVwiIHN0cm9rZS1saW5lY2FwPVwicm91bmRcIiBzdHJva2UtbGluZWpvaW49XCJyb3VuZFwiPjxwYXRoIGQ9XCJNMSAxMnM0LTggMTEtOCAxMSA4IDExIDgtNCA4LTExIDgtMTEtOC0xMS04elwiLz48Y2lyY2xlIGN4PVwiMTJcIiBjeT1cIjEyXCIgcj1cIjNcIi8+PC9zdmc+YCxcbiAgICAnZXllLW9mZic6IGA8c3ZnIHdpZHRoPVwiJHtzaXplfVwiIGhlaWdodD1cIiR7c2l6ZX1cIiB2aWV3Qm94PVwiMCAwIDI0IDI0XCIgZmlsbD1cIm5vbmVcIiBzdHJva2U9XCJjdXJyZW50Q29sb3JcIiBzdHJva2Utd2lkdGg9XCIxLjVcIiBzdHJva2UtbGluZWNhcD1cInJvdW5kXCIgc3Ryb2tlLWxpbmVqb2luPVwicm91bmRcIj48cGF0aCBkPVwiTTE3Ljk0IDE3Ljk0QTEwLjA3IDEwLjA3IDAgMCAxIDEyIDIwYy03IDAtMTEtOC0xMS04YTE4LjQ1IDE4LjQ1IDAgMCAxIDUuMDYtNS45NE05LjkgNC4yNEE5LjEyIDkuMTIgMCAwIDEgMTIgNGM3IDAgMTEgOCAxMSA4YTE4LjUgMTguNSAwIDAgMS0yLjE2IDMuMTltLTYuNzItMS4wN2EzIDMgMCAxIDEtNC4yNC00LjI0XCIvPjxsaW5lIHgxPVwiMVwiIHkxPVwiMVwiIHgyPVwiMjNcIiB5Mj1cIjIzXCIvPjwvc3ZnPmAsXG4gICAgYWxlcnQ6IGA8c3ZnIHdpZHRoPVwiJHtzaXplfVwiIGhlaWdodD1cIiR7c2l6ZX1cIiB2aWV3Qm94PVwiMCAwIDI0IDI0XCIgZmlsbD1cIm5vbmVcIiBzdHJva2U9XCJjdXJyZW50Q29sb3JcIiBzdHJva2Utd2lkdGg9XCIxLjVcIiBzdHJva2UtbGluZWNhcD1cInJvdW5kXCIgc3Ryb2tlLWxpbmVqb2luPVwicm91bmRcIj48cGF0aCBkPVwiTTEwLjI5IDMuODZMMS44MiAxOGEyIDIgMCAwIDAgMS43MSAzaDE2Ljk0YTIgMiAwIDAgMCAxLjcxLTNMMTMuNzEgMy44NmEyIDIgMCAwIDAtMy40MiAwelwiLz48bGluZSB4MT1cIjEyXCIgeTE9XCI5XCIgeDI9XCIxMlwiIHkyPVwiMTNcIi8+PGxpbmUgeDE9XCIxMlwiIHkxPVwiMTdcIiB4Mj1cIjEyLjAxXCIgeTI9XCIxN1wiLz48L3N2Zz5gLFxuICB9O1xuICByZXR1cm4gaVtuYW1lXSB8fCBpWydzZXR0aW5ncyddIHx8ICcnO1xufVxuXG4vLyBSZW5kZXIgXHUyMDE0IGJhY2tncm91bmQgaW1hZ2UgaGFuZGxpbmdcbmxldCBjYWNoZWRCZ0Jsb2JVcmwgPSAnJztcblxuZnVuY3Rpb24gcmVuZGVyQmFja2dyb3VuZExheWVyKCk6IHN0cmluZyB7XG4gIHJldHVybiBgPGRpdiBjbGFzcz1cImFtYmllbnRcIiBhcmlhLWhpZGRlbj1cInRydWVcIj5cbiAgICA8ZGl2IGNsYXNzPVwib3JiIG9yYi0xXCI+PC9kaXY+PGRpdiBjbGFzcz1cIm9yYiBvcmItMlwiPjwvZGl2PjxkaXYgY2xhc3M9XCJvcmIgb3JiLTNcIj48L2Rpdj5cbiAgPC9kaXY+YDtcbn1cblxuXG5mdW5jdGlvbiByZW5kZXIoKTogdm9pZCB7XG4gIGNvbnN0IHJvb3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncm9vdCcpITtcbiAgY29uc3QgaG9tZU1haW4gPSByb290LnF1ZXJ5U2VsZWN0b3IoJy5ob21lLW1haW4nKSBhcyBIVE1MRWxlbWVudCB8IG51bGw7XG4gIGNvbnN0IHByZXNlcnZlZFNjcm9sbFRvcCA9IHZpZXcgPT09ICdob21lJyA/IChob21lTWFpbj8uc2Nyb2xsVG9wIHx8IDApIDogMDtcbiAgY29uc3QgY29udGVudCA9IHNob3dQZXJtTW9kYWwgPyByZW5kZXJQZXJtTW9kYWwoKSA6ICh2aWV3ID09PSAnaG9tZScgPyByZW5kZXJIb21lKCkgOiByZW5kZXJNZWV0aW5nKCkpO1xuICByb290LmlubmVySFRNTCA9IGAke3JlbmRlckJhY2tncm91bmRMYXllcigpfTxkaXYgY2xhc3M9XCJhcHAtc2hlbGxcIj4ke2NvbnRlbnR9PC9kaXY+YDtcbiAgYXR0YWNoTGlzdGVuZXJzKCk7XG4gIGlmICh2aWV3ID09PSAnaG9tZScpIHtcbiAgICBjb25zdCBuZXh0SG9tZU1haW4gPSByb290LnF1ZXJ5U2VsZWN0b3IoJy5ob21lLW1haW4nKSBhcyBIVE1MRWxlbWVudCB8IG51bGw7XG4gICAgaWYgKG5leHRIb21lTWFpbikgbmV4dEhvbWVNYWluLnNjcm9sbFRvcCA9IHByZXNlcnZlZFNjcm9sbFRvcDtcbiAgfVxufVxuXG5mdW5jdGlvbiByZW5kZXJQZXJtTW9kYWwoKTogc3RyaW5nIHtcbiAgcmV0dXJuIGBcbiAgICA8ZGl2IGNsYXNzPVwicGVybS1vdmVybGF5XCI+XG4gICAgICA8ZGl2IGNsYXNzPVwicGVybS1tb2RhbFwiPlxuICAgICAgICA8ZGl2IGNsYXNzPVwicGVybS1zaGllbGRcIj5cbiAgICAgICAgICA8c3ZnIHdpZHRoPVwiMzJcIiBoZWlnaHQ9XCIzMlwiIHZpZXdCb3g9XCIwIDAgMjQgMjRcIiBmaWxsPVwibm9uZVwiIHN0cm9rZT1cImN1cnJlbnRDb2xvclwiIHN0cm9rZS13aWR0aD1cIjEuNVwiIHN0cm9rZS1saW5lY2FwPVwicm91bmRcIiBzdHJva2UtbGluZWpvaW49XCJyb3VuZFwiPlxuICAgICAgICAgICAgPHJlY3QgeD1cIjJcIiB5PVwiM1wiIHdpZHRoPVwiMjBcIiBoZWlnaHQ9XCIxNFwiIHJ4PVwiMlwiIHJ5PVwiMlwiLz48bGluZSB4MT1cIjhcIiB5MT1cIjIxXCIgeDI9XCIxNlwiIHkyPVwiMjFcIi8+PGxpbmUgeDE9XCIxMlwiIHkxPVwiMTdcIiB4Mj1cIjEyXCIgeTI9XCIyMVwiLz5cbiAgICAgICAgICA8L3N2Zz5cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIDxoMj5TY3JlZW4gJiBBdWRpbyBSZWNvcmRpbmc8L2gyPlxuICAgICAgICA8cCBjbGFzcz1cInBlcm0tc3VidGl0bGVcIj5QYXByd29yayBjYXB0dXJlcyBzeXN0ZW0gYXVkaW8gZnJvbSBab29tLCBUZWFtcywgYW5kIE1lZXQgdG8gdHJhbnNjcmliZSB5b3VyIG1lZXRpbmdzLjwvcD5cbiAgICAgICAgPGRpdiBjbGFzcz1cInBlcm0tc3RlcHNcIj5cbiAgICAgICAgICA8ZGl2IGNsYXNzPVwicGVybS1zdGVwXCI+XG4gICAgICAgICAgICA8c3BhbiBjbGFzcz1cInBlcm0tc3RlcC1udW1cIj4xPC9zcGFuPlxuICAgICAgICAgICAgPHNwYW4+T3BlbiA8c3Ryb25nPlN5c3RlbSBTZXR0aW5ncyBcdTIxOTIgUHJpdmFjeSAmIFNlY3VyaXR5PC9zdHJvbmc+PC9zcGFuPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDxkaXYgY2xhc3M9XCJwZXJtLXN0ZXBcIj5cbiAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwicGVybS1zdGVwLW51bVwiPjI8L3NwYW4+XG4gICAgICAgICAgICA8c3Bhbj5GaW5kIDxzdHJvbmc+U2NyZWVuICYgQXVkaW8gUmVjb3JkaW5nPC9zdHJvbmc+PC9zcGFuPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDxkaXYgY2xhc3M9XCJwZXJtLXN0ZXBcIj5cbiAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwicGVybS1zdGVwLW51bVwiPjM8L3NwYW4+XG4gICAgICAgICAgICA8c3Bhbj5Ub2dnbGUgb24gPHN0cm9uZz5FbGVjdHJvbjwvc3Ryb25nPiAoZGV2KSBvciA8c3Ryb25nPlBhcHIgV29yazwvc3Ryb25nPjwvc3Bhbj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8ZGl2IGNsYXNzPVwicGVybS1zdGVwXCI+XG4gICAgICAgICAgICA8c3BhbiBjbGFzcz1cInBlcm0tc3RlcC1udW1cIj40PC9zcGFuPlxuICAgICAgICAgICAgPHNwYW4+UmVzdGFydCB0aGUgYXBwIGFmdGVyIGVuYWJsaW5nPC9zcGFuPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5cbiAgICAgICAgPGRpdiBjbGFzcz1cInBlcm0tYnRuc1wiPlxuICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJwZXJtLWJ0bi1zZXR0aW5nc1wiIGlkPVwiYnRuLW9wZW4tc2V0dGluZ3NcIj5PcGVuIFN5c3RlbSBTZXR0aW5nczwvYnV0dG9uPlxuICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJwZXJtLWJ0bi1yZXRyeVwiIGlkPVwiYnRuLXJldHJ5LXBlcm1cIj5JJ3ZlIGVuYWJsZWQgaXQgXHUyMDE0IHJldHJ5PC9idXR0b24+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9kaXY+XG4gICAgPC9kaXY+YDtcbn1cblxuZnVuY3Rpb24gcmVuZGVyQXR0ZW5kZWVzKGF0dGVuZGVlczogQXR0ZW5kZWVbXSwgbWF4ID0gNSk6IHN0cmluZyB7XG4gIGlmICghYXR0ZW5kZWVzLmxlbmd0aCkgcmV0dXJuICcnO1xuICBjb25zdCBzaG93biA9IGF0dGVuZGVlcy5zbGljZSgwLCBtYXgpO1xuICBjb25zdCBleHRyYSA9IGF0dGVuZGVlcy5sZW5ndGggLSBtYXg7XG4gIHJldHVybiBgPGRpdiBjbGFzcz1cImF0dGVuZGVlLXJvd1wiPlxuICAgICR7c2hvd24ubWFwKGEgPT4gYDxkaXYgY2xhc3M9XCJhdmF0YXJcIiBzdHlsZT1cImJhY2tncm91bmQ6JHthdmF0YXJDb2xvcihhLm5hbWUgfHwgYS5lbWFpbCl9XCIgdGl0bGU9XCIke2VzYyhhLm5hbWUgfHwgYS5lbWFpbCl9XCI+JHtnZXRJbml0aWFscyhhLm5hbWUgfHwgYS5lbWFpbCl9PC9kaXY+YCkuam9pbignJyl9XG4gICAgJHtleHRyYSA+IDAgPyBgPGRpdiBjbGFzcz1cImF2YXRhciBhdmF0YXItbW9yZVwiPiske2V4dHJhfTwvZGl2PmAgOiAnJ31cbiAgPC9kaXY+YDtcbn1cblxuZnVuY3Rpb24gdG9nZ2xlQmdIZXJvKCk6IHZvaWQge1xuICAvLyBiZyByZW1vdmVkIFx1MjAxNCBuby1vcFxufVxuXG5mdW5jdGlvbiByZW5kZXJCYWNrZ3JvdW5kSGVybygpOiBzdHJpbmcge1xuICByZXR1cm4gJyc7XG59XG5cblxuZnVuY3Rpb24gcmVuZGVySG9tZSgpOiBzdHJpbmcge1xuICBjb25zdCB0b2RheUV2cyA9IGdldFRvZGF5RXZlbnRzKCk7XG4gIGNvbnN0IGZpbHRlcmVkID0gZmlsdGVyTWVldGluZ3MoKTtcbiAgY29uc3QgYWxsVGFncyA9IGdldEFsbFRhZ3MoKTtcbiAgY29uc3QgYWxsUGVvcGxlID0gZ2V0QWxsUGVvcGxlKCk7XG5cbiAgcmV0dXJuIGBcbiAgICA8ZGl2IGNsYXNzPVwiaG9tZS1sYXlvdXRcIj5cbiAgICAgIDxoZWFkZXIgY2xhc3M9XCJob21lLWhlYWRlciBnbGFzc1wiPlxuICAgICAgICA8bmF2IGNsYXNzPVwiaG9tZS1uYXZcIj5cbiAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwiaG9tZS1uYXYtdGFiJHttYWluUGFnZSA9PT0gJ21lZXRpbmdzJyA/ICcgYWN0aXZlJyA6ICcnfVwiIGRhdGEtcGFnZT1cIm1lZXRpbmdzXCI+TWVldGluZ3M8L2J1dHRvbj5cbiAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwiaG9tZS1uYXYtdGFiJHttYWluUGFnZSA9PT0gJ25vdGVzJyA/ICcgYWN0aXZlJyA6ICcnfVwiIGRhdGEtcGFnZT1cIm5vdGVzXCI+Tm90ZXM8L2J1dHRvbj5cbiAgICAgICAgPC9uYXY+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJoZWFkZXItYWN0aW9uc1wiPlxuICAgICAgICAgIDxkaXYgY2xhc3M9XCJhdWRpby1kZXZpY2Utd3JhcHBlclwiPlxuICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cImJ0bi1hdWRpby1kZXZpY2VcIiBpZD1cImJ0bi1hdWRpby1kZXZpY2VcIiB0aXRsZT1cIiR7c2VsZWN0ZWRBdWRpb0RldmljZS5uYW1lIHx8ICdTZWxlY3QgbWljcm9waG9uZSd9XCI+XG4gICAgICAgICAgICAgICR7aWNvbignbWljJywgMTQpfVxuICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cImF1ZGlvLWRldmljZS1sYWJlbFwiPiR7c2VsZWN0ZWRBdWRpb0RldmljZS5uYW1lIHx8ICdObyBtaWMnfTwvc3Bhbj5cbiAgICAgICAgICAgICAgJHtpY29uKCdjaGV2cm9uJywgMTApfVxuICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAke3Nob3dBdWRpb01lbnUgPyBgPGRpdiBjbGFzcz1cImF1ZGlvLWRldmljZS1tZW51IGdsYXNzXCI+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJhdWRpby1tZW51LWhlYWRlclwiPlxuICAgICAgICAgICAgICAgIDxzcGFuPkF1ZGlvIElucHV0PC9zcGFuPlxuICAgICAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJhdWRpby1yZWZyZXNoLWJ0blwiIGlkPVwiYnRuLXJlZnJlc2gtZGV2aWNlc1wiPiR7aWNvbigncmVmcmVzaCcsIDEyKX08L2J1dHRvbj5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICR7YXVkaW9EZXZpY2VzLm1hcChkID0+IGBcbiAgICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwiYXVkaW8tZGV2aWNlLW9wdGlvbiR7ZC5kZXZpY2VfaW5kZXggPT09IHNlbGVjdGVkQXVkaW9EZXZpY2UuaW5kZXggPyAnIHNlbGVjdGVkJyA6ICcnfVwiIFxuICAgICAgICAgICAgICAgICAgZGF0YS1kZXYtaWR4PVwiJHtkLmRldmljZV9pbmRleH1cIiBkYXRhLWRldi1uYW1lPVwiJHtlc2MoZC5uYW1lKX1cIj5cbiAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwiYXVkaW8tZGV2LW5hbWVcIj4ke2VzYyhkLm5hbWUpfTwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgICR7ZC5kZXZpY2VfaW5kZXggPT09IHNlbGVjdGVkQXVkaW9EZXZpY2UuaW5kZXggPyBpY29uKCdjaGVjaycsIDE0KSA6ICcnfVxuICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICBgKS5qb2luKCcnKX1cbiAgICAgICAgICAgICAgJHthdWRpb0RldmljZXMubGVuZ3RoID09PSAwID8gJzxkaXYgY2xhc3M9XCJhdWRpby1uby1kZXZpY2VzXCI+Tm8gZGV2aWNlcyBmb3VuZC4gQ2xpY2sgcmVmcmVzaC48L2Rpdj4nIDogJyd9XG4gICAgICAgICAgICA8L2Rpdj5gIDogJyd9XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cImJ0bi1yZWNvcmRcIiBpZD1cImJ0bi1uZXctcmVjXCI+XG4gICAgICAgICAgICBOZXcgTm90ZVxuICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvaGVhZGVyPlxuICAgICAgPGRpdiBjbGFzcz1cImhvbWUtbWFpblwiPlxuICAgICAgICAke3JlbmRlckJhY2tncm91bmRIZXJvKCl9XG5cbiAgICAgICAgJHttYWluUGFnZSA9PT0gJ21lZXRpbmdzJyA/IGBcbiAgICAgICAgPHNlY3Rpb24gY2xhc3M9XCJob21lLXNlY3Rpb25cIj5cbiAgICAgICAgICA8ZGl2IGNsYXNzPVwic2VjdGlvbi1oZWFkZXJcIj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjYWwtcGlsbHMtcm93XCI+XG4gICAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJ3ZWVrLW5hdi1idG5cIiBvbmNsaWNrPVwiZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7IHNoaWZ0V2VlaygtMSlcIj4mIzgyNDk7PC9idXR0b24+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjYWwtcGlsbHNcIj5cbiAgICAgICAgICAgICAgICAke2dldFdlZWtEYXlQaWxscygpfVxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cIndlZWstbmF2LWJ0blwiIG9uY2xpY2s9XCJldmVudC5zdG9wUHJvcGFnYXRpb24oKTsgc2hpZnRXZWVrKDEpXCI+JiM4MjUwOzwvYnV0dG9uPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgJHtyZW5kZXJDYWxWaWV3KCl9XG4gICAgICAgIDwvc2VjdGlvbj5cbiAgICAgICAgYCA6IGBcbiAgICAgICAgPHNlY3Rpb24gY2xhc3M9XCJob21lLXNlY3Rpb25cIj5cbiAgICAgICAgICA8ZGl2IGNsYXNzPVwic2VjdGlvbi1oZWFkZXJcIj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWx0ZXItYmFyXCI+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWx0ZXItcGlsbHNcIj5cbiAgICAgICAgICAgICAgICAkeyhbJ2FsbCcsJ3RvZGF5Jywnd2VlaycsJ21vbnRoJ10gYXMgRmlsdGVyW10pLm1hcChmID0+IGBcbiAgICAgICAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJwaWxsJHthY3RpdmVGaWx0ZXIgPT09IGYgPyAnIHBpbGwtYWN0aXZlJyA6ICcnfVwiIGRhdGEtZmlsdGVyPVwiJHtmfVwiPlxuICAgICAgICAgICAgICAgICAgICAke2YgPT09ICdhbGwnID8gJ0FsbCcgOiBmID09PSAndG9kYXknID8gJ1RvZGF5JyA6IGYgPT09ICd3ZWVrJyA/ICdUaGlzIFdlZWsnIDogJ1RoaXMgTW9udGgnfVxuICAgICAgICAgICAgICAgICAgPC9idXR0b24+YCkuam9pbignJyl9XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmlsdGVyLXNlbGVjdG9yc1wiPlxuICAgICAgICAgICAgICAgICR7YWxsVGFncy5sZW5ndGggPyBgXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpbHRlci1zZWxlY3Qtd3JhcFwiPlxuICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cImZpbHRlci1zZWxlY3Qke2FjdGl2ZVRhZ3MubGVuZ3RoID8gJyBoYXMtc2VsZWN0aW9uJyA6ICcnfVwiIGlkPVwiYnRuLXRvcGljLXNlbGVjdFwiPlxuICAgICAgICAgICAgICAgICAgICAke2ljb24oJ3RhZycsIDEzKX1cbiAgICAgICAgICAgICAgICAgICAgJHthY3RpdmVUYWdzLmxlbmd0aCA/IGFjdGl2ZVRhZ3Muam9pbignLCAnKSA6ICdUb3BpY3MnfVxuICAgICAgICAgICAgICAgICAgICAke2ljb24oJ2NoZXZyb24nLCAxMCl9XG4gICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWx0ZXItZHJvcGRvd25cIiBpZD1cImRyb3Bkb3duLXRvcGljc1wiPlxuICAgICAgICAgICAgICAgICAgICAke2FsbFRhZ3MubWFwKHQgPT4gYFxuICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbCBjbGFzcz1cImZpbHRlci1vcHRpb25cIj48aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgdmFsdWU9XCIke2VzYyh0KX1cIiAke2FjdGl2ZVRhZ3MuaW5jbHVkZXModCkgPyAnY2hlY2tlZCcgOiAnJ30gZGF0YS10b3BpYy1jaGVjaz4gJHtlc2ModCl9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgYCkuam9pbignJyl9XG4gICAgICAgICAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJmaWx0ZXItY2xlYXJcIiBpZD1cImJ0bi1jbGVhci10b3BpY3NcIj5DbGVhcjwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+YCA6ICcnfVxuICAgICAgICAgICAgICAgICR7YWxsUGVvcGxlLmxlbmd0aCA/IGBcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmlsdGVyLXNlbGVjdC13cmFwXCI+XG4gICAgICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwiZmlsdGVyLXNlbGVjdCR7YWN0aXZlUGVvcGxlLmxlbmd0aCA/ICcgaGFzLXNlbGVjdGlvbicgOiAnJ31cIiBpZD1cImJ0bi1wZW9wbGUtc2VsZWN0XCI+XG4gICAgICAgICAgICAgICAgICAgICR7aWNvbigncGVyc29uJywgMTMpfVxuICAgICAgICAgICAgICAgICAgICAke2FjdGl2ZVBlb3BsZS5sZW5ndGggPyBhY3RpdmVQZW9wbGUubGVuZ3RoICsgJyBzZWxlY3RlZCcgOiAnUGVvcGxlJ31cbiAgICAgICAgICAgICAgICAgICAgJHtpY29uKCdjaGV2cm9uJywgMTApfVxuICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmlsdGVyLWRyb3Bkb3duXCIgaWQ9XCJkcm9wZG93bi1wZW9wbGVcIj5cbiAgICAgICAgICAgICAgICAgICAgJHthbGxQZW9wbGUubWFwKHAgPT4gYFxuICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbCBjbGFzcz1cImZpbHRlci1vcHRpb25cIj48aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgdmFsdWU9XCIke2VzYyhwLmVtYWlsKX1cIiAke2FjdGl2ZVBlb3BsZS5pbmNsdWRlcyhwLmVtYWlsKSA/ICdjaGVja2VkJyA6ICcnfSBkYXRhLXBlb3BsZS1jaGVjaz5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwiYXZhdGFyLXNtXCIgc3R5bGU9XCJiYWNrZ3JvdW5kOiR7YXZhdGFyQ29sb3IocC5uYW1lfHxwLmVtYWlsKX1cIj4ke2dldEluaXRpYWxzKHAubmFtZXx8cC5lbWFpbCl9PC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICAgICAgJHtlc2MocC5uYW1lIHx8IHAuZW1haWwpfVxuICAgICAgICAgICAgICAgICAgICAgIDwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgIGApLmpvaW4oJycpfVxuICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwiZmlsdGVyLWNsZWFyXCIgaWQ9XCJidG4tY2xlYXItcGVvcGxlXCI+Q2xlYXI8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PmAgOiAnJ31cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8ZGl2IGNsYXNzPVwibWVldGluZy1saXN0XCI+XG4gICAgICAgICAgICAkeygoKSA9PiB7XG4gICAgICAgICAgICAgIGNvbnN0IHdpdGhDb250ZW50ID0gZmlsdGVyZWQuZmlsdGVyKG0gPT4gbS5zdW1tYXJ5ICYmIG0uc3VtbWFyeS50cmltKCkpO1xuICAgICAgICAgICAgICBpZiAoIXdpdGhDb250ZW50Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAnPGRpdiBjbGFzcz1cImVtcHR5LXN0YXRlXCI+Tm8gc3VtbWFyaWVzIHlldCBcXHUyMDE0IHN1bW1hcmllcyBhcHBlYXIgaGVyZSBhZnRlciBtZWV0aW5ncyBhcmUgcHJvY2Vzc2VkPC9kaXY+JztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICByZXR1cm4gd2l0aENvbnRlbnQubWFwKG0gPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHRhZ3MgPSBleHRyYWN0VGFncyhtKTtcbiAgICAgICAgICAgICAgICBjb25zdCBzbmlwcGV0ID0gbS5zdW1tYXJ5LnJlcGxhY2UoLzxbXj5dKz4vZywgJyAnKS5yZXBsYWNlKC9cXHMrL2csICcgJykudHJpbSgpLnNsaWNlKDAsIDEyMCk7XG4gICAgICAgICAgICAgICAgY29uc3Qgc25pcHBldEVsID0gc25pcHBldCA/ICc8ZGl2IGNsYXNzPVwibm90ZXMtc25pcHBldFwiPicgKyBlc2Moc25pcHBldCkgKyAnXFx1MjAyNjwvZGl2PicgOiAnJztcbiAgICAgICAgICAgICAgICBjb25zdCB0YWdzRWwgPSB0YWdzLmxlbmd0aCA/ICc8ZGl2IGNsYXNzPVwiY2FyZC10YWdzXFxcIj4nICsgdGFncy5tYXAodCA9PiAnPHNwYW4gY2xhc3M9XCJwaWxsXCI+JyArIGVzYyh0KSArICc8L3NwYW4+Jykuam9pbignJykgKyAnPC9kaXY+JyA6ICcnO1xuICAgICAgICAgICAgICAgIHJldHVybiAnPGRpdiBjbGFzcz1cIm1lZXRpbmctY2FyZCBub3Rlcy1jYXJkXCIgZGF0YS1tZWV0aW5nLWlkPVwiJyArIG0uaWQgKyAnXCI+J1xuICAgICAgICAgICAgICAgICAgKyAnPGRpdiBjbGFzcz1cImNhcmQtcm93XCI+PGRpdiBjbGFzcz1cImNhcmQtaW5mb1wiPidcbiAgICAgICAgICAgICAgICAgICsgJzxkaXYgY2xhc3M9XCJjYXJkLXRpdGxlXCI+JyArIGVzYyhtLnRpdGxlKSArICc8L2Rpdj4nXG4gICAgICAgICAgICAgICAgICArICc8ZGl2IGNsYXNzPVwiY2FyZC1tZXRhXCI+JyArIGljb24oJ2Nsb2NrJywgMTIpICsgJyAnICsgZm10RGF0ZShtLmRhdGUpICsgKG0uZHVyYXRpb24gPyAnIFxceGI3ICcgKyBmbXREdXIobS5kdXJhdGlvbikgOiAnJykgKyAnPC9kaXY+J1xuICAgICAgICAgICAgICAgICAgKyBzbmlwcGV0RWwgKyB0YWdzRWxcbiAgICAgICAgICAgICAgICAgICsgJzwvZGl2PidcbiAgICAgICAgICAgICAgICAgICsgJzxkaXYgY2xhc3M9XCJjYXJkLWFjdGlvbnNcIj48YnV0dG9uIGNsYXNzPVwiYnRuLWljb24gY2FyZC1kZWxcIiBkYXRhLWlkPVwiJyArIG0uaWQgKyAnXCIgdGl0bGU9XCJEZWxldGVcIj4nICsgaWNvbigndHJhc2gnLCAxMykgKyAnPC9idXR0b24+PC9kaXY+J1xuICAgICAgICAgICAgICAgICAgKyAnPC9kaXY+PC9kaXY+JztcbiAgICAgICAgICAgICAgfSkuam9pbignJyk7XG4gICAgICAgICAgICB9KSgpfVxuXG4gICAgICAgIDwvc2VjdGlvbj5cbiAgICAgICAgYH1cbiAgICAgIDwvZGl2PlxuICAgIDwvZGl2PmA7XG59XG5cbmZ1bmN0aW9uIGdldFdlZWtEYXlQaWxscygpOiBzdHJpbmcge1xuICBjb25zdCB0b2RheSA9IG5ldyBEYXRlKCk7XG4gIGNvbnN0IHRvZGF5U3RyID0gbG9jYWxEYXRlU3RyKHRvZGF5KTtcbiAgY29uc3Qgd2Vla1N0YXJ0ID0gbmV3IERhdGUodG9kYXkpO1xuICB3ZWVrU3RhcnQuc2V0RGF0ZSh0b2RheS5nZXREYXRlKCkgLSB0b2RheS5nZXREYXkoKSArIChjYWxXZWVrT2Zmc2V0ICogNykpO1xuICBjb25zdCB0b2RheURvdyA9IHRvZGF5LmdldERheSgpO1xuICBjb25zdCBpc1dlZWtlbmQgPSB0b2RheURvdyA9PT0gMCB8fCB0b2RheURvdyA9PT0gNjtcbiAgY29uc3QgaW5kaWNlcyA9IGlzV2Vla2VuZCA/IFswLDEsMiwzLDQsNSw2XSA6IFsxLDIsMyw0LDVdO1xuICByZXR1cm4gaW5kaWNlcy5tYXAoaSA9PiB7XG4gICAgY29uc3QgZCA9IG5ldyBEYXRlKHdlZWtTdGFydCk7XG4gICAgZC5zZXREYXRlKHdlZWtTdGFydC5nZXREYXRlKCkgKyBpKTtcbiAgICBjb25zdCBkcyA9IGxvY2FsRGF0ZVN0cihkKTtcbiAgICBjb25zdCBpc1RvZGF5ID0gZHMgPT09IHRvZGF5U3RyO1xuICAgIGNvbnN0IGlzQWN0aXZlID0gY2FsVmlldyA9PT0gZHM7XG4gICAgY29uc3QgZGF5TmFtZSA9IGQudG9Mb2NhbGVEYXRlU3RyaW5nKHVuZGVmaW5lZCwge3dlZWtkYXk6ICdzaG9ydCd9KTtcbiAgICBjb25zdCBkYXlOdW0gPSBkLmdldERhdGUoKTtcbiAgICBjb25zdCBoYXNFdmVudHMgPSBjYWxFdmVudHMuc29tZShlID0+IGUuc3RhcnRfdGltZS5zcGxpdCgnVCcpWzBdID09PSBkcylcbiAgICAgIHx8IG1lZXRpbmdzLnNvbWUobSA9PiBtLmRhdGUgJiYgbG9jYWxEYXRlU3RyKG5ldyBEYXRlKG0uZGF0ZSkpID09PSBkcyAmJiAhZmluZExpbmtlZENhbEV2ZW50KG0pKTtcbiAgICByZXR1cm4gJzxidXR0b24gY2xhc3M9XCJkYXktcGlsbCcgKyAoaXNBY3RpdmUgPyAnIHBpbGwtYWN0aXZlJyA6ICcnKSArIChpc1RvZGF5ICYmICFpc0FjdGl2ZSA/ICcgZGF5LXBpbGwtdG9kYXknIDogJycpICsgJ1wiIGRhdGEtY2Fsdmlldz1cIicgKyBkcyArICdcIj4nXG4gICAgICArICc8c3BhbiBjbGFzcz1cImRheS1waWxsLW5hbWVcIj4nICsgZGF5TmFtZSArICc8L3NwYW4+J1xuICAgICAgKyAnPHNwYW4gY2xhc3M9XCJkYXktcGlsbC1udW0nICsgKGlzVG9kYXkgPyAnIGRheS1waWxsLW51bS10b2RheScgOiAnJykgKyAnXCI+JyArIGRheU51bSArICc8L3NwYW4+J1xuICAgICAgKyAoaGFzRXZlbnRzID8gJzxzcGFuIGNsYXNzPVwiZGF5LXBpbGwtZG90XCI+PC9zcGFuPicgOiAnJylcbiAgICAgICsgJzwvYnV0dG9uPic7XG4gIH0pLmpvaW4oJycpO1xufVxuXG5mdW5jdGlvbiByZW5kZXJDYWxWaWV3KCk6IHN0cmluZyB7XG4gIGlmICghY2FsVmlldykge1xuICAgIGNvbnN0IHRvZGF5U3RyID0gbG9jYWxEYXRlU3RyKG5ldyBEYXRlKCkpO1xuICAgIGNvbnN0IHdlZWtEYXlzID0gZ2V0V2Vla0RheXMoKTtcbiAgICBjYWxWaWV3ID0gd2Vla0RheXMuaW5jbHVkZXModG9kYXlTdHIpID8gdG9kYXlTdHIgOiB3ZWVrRGF5c1swXTtcbiAgfVxuICByZXR1cm4gcmVuZGVyQ2FsRGF5KGNhbFZpZXcpO1xufVxuXG5mdW5jdGlvbiBnZXRXZWVrRGF5cygpOiBzdHJpbmdbXSB7XG4gIGNvbnN0IHRvZGF5ID0gbmV3IERhdGUoKTtcbiAgY29uc3Qgd2Vla1N0YXJ0ID0gbmV3IERhdGUodG9kYXkpO1xuICB3ZWVrU3RhcnQuc2V0RGF0ZSh0b2RheS5nZXREYXRlKCkgLSB0b2RheS5nZXREYXkoKSArIChjYWxXZWVrT2Zmc2V0ICogNykpO1xuICBjb25zdCB0b2RheURvdyA9IHRvZGF5LmdldERheSgpO1xuICBjb25zdCBpc1dlZWtlbmQgPSAoY2FsV2Vla09mZnNldCA9PT0gMCAmJiAodG9kYXlEb3cgPT09IDAgfHwgdG9kYXlEb3cgPT09IDYpKTtcbiAgY29uc3QgaW5kaWNlcyA9IGlzV2Vla2VuZCA/IFswLDEsMiwzLDQsNSw2XSA6IFsxLDIsMyw0LDVdO1xuICByZXR1cm4gaW5kaWNlcy5tYXAoaSA9PiB7XG4gICAgY29uc3QgZCA9IG5ldyBEYXRlKHdlZWtTdGFydCk7XG4gICAgZC5zZXREYXRlKHdlZWtTdGFydC5nZXREYXRlKCkgKyBpKTtcbiAgICByZXR1cm4gbG9jYWxEYXRlU3RyKGQpO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gZ2V0UHJlcFNuaXBwZXQocHJlcERvYzogc3RyaW5nKTogc3RyaW5nIHtcbiAgaWYgKCFwcmVwRG9jKSByZXR1cm4gJyc7XG4gIHRyeSB7XG4gICAgY29uc3QgbyA9IEpTT04ucGFyc2UocHJlcERvYyk7XG4gICAgaWYgKG8udGxkcikgcmV0dXJuIGA8ZGl2IGNsYXNzPVwicHJlcC1zbmlwLXRsZHJcIj4ke2VzYyhvLnRsZHIuc2xpY2UoMCwgMzAwKSl9PC9kaXY+YDtcbiAgICBpZiAoby5ldmVudF9pZCkgcmV0dXJuICcnOyAvLyBvbGQgZm9ybWF0IHBsYWNlaG9sZGVyXG4gIH0gY2F0Y2gge31cbiAgcmV0dXJuICcnO1xufVxuXG5mdW5jdGlvbiByZW5kZXJDYWxEYXkoZGF0ZVN0cjogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgZXZzID0gY2FsRXZlbnRzLmZpbHRlcihlID0+IGUuc3RhcnRfdGltZS5zcGxpdCgnVCcpWzBdID09PSBkYXRlU3RyKTtcbiAgY29uc3QgbGlua2VkSWRzID0gbmV3IFNldChldnMubWFwKGUgPT4gZ2V0TGlua2VkTWVldGluZ0ZvckV2ZW50KGUpPy5pZCkuZmlsdGVyKEJvb2xlYW4pKTtcbiAgLy8gTWVldGluZ3Mgd2l0aCBubyBsaW5rZWQgQ2FsRXZlbnQgXHUyMDE0IHN5bnRoZXNpemUgb25lIHNvIHRoZXkgdXNlIHRoZSBzYW1lIGNhcmRcbiAgY29uc3Qgb3JwaGFuRXZzOiBDYWxFdmVudFtdID0gbWVldGluZ3NcbiAgICAuZmlsdGVyKG0gPT4ge1xuICAgICAgaWYgKCFtLmRhdGUpIHJldHVybiBmYWxzZTtcbiAgICAgIHJldHVybiBsb2NhbERhdGVTdHIobmV3IERhdGUobS5kYXRlKSkgPT09IGRhdGVTdHJcbiAgICAgICAgJiYgIWxpbmtlZElkcy5oYXMobS5pZClcbiAgICAgICAgJiYgIWZpbmRMaW5rZWRDYWxFdmVudChtKTtcbiAgICB9KVxuICAgIC5tYXAobSA9PiAoe1xuICAgICAgaWQ6IG0uaWQsIHRpdGxlOiBtLnRpdGxlLFxuICAgICAgc3RhcnRfdGltZTogbS5kYXRlLCBlbmRfdGltZTogbS5kYXRlLFxuICAgICAgY2FsZW5kYXJfbmFtZTogJycsIG1lZXRpbmdfaWQ6IG0uaWQsXG4gICAgICBhdHRlbmRlZXM6ICdbXScsIHByZXBfc3RhdHVzOiAnJywgcHJlcF9kb2M6ICcnXG4gICAgfSkpO1xuICBjb25zdCBhbGxFdnMgPSBbLi4uZXZzLCAuLi5vcnBoYW5FdnNdLnNvcnQoKGEsIGIpID0+IGEuc3RhcnRfdGltZS5sb2NhbGVDb21wYXJlKGIuc3RhcnRfdGltZSkpO1xuICBpZiAoIWFsbEV2cy5sZW5ndGgpIHJldHVybiAnPGRpdiBjbGFzcz1cImRheS1lbXB0eVwiPk5vIG1lZXRpbmdzIHRoaXMgZGF5PC9kaXY+JztcbiAgcmV0dXJuICc8ZGl2IGNsYXNzPVwiZGF5LWNhcmRzXCI+JyArIGFsbEV2cy5tYXAoZXYgPT4gcmVuZGVyTWVldGluZ0NhcmQoZXYpKS5qb2luKCcnKSArICc8L2Rpdj4nO1xufVxuXG5cbmZ1bmN0aW9uIHJlbmRlck1lZXRpbmdDYXJkKGU6IENhbEV2ZW50KTogc3RyaW5nIHtcbiAgY29uc3Qgbm93ID0gbmV3IERhdGUoKTtcbiAgY29uc3Qgc3QgPSBuZXcgRGF0ZShlLnN0YXJ0X3RpbWUpO1xuICBjb25zdCBldCA9IG5ldyBEYXRlKGUuZW5kX3RpbWUpO1xuICBjb25zdCBpc0xpdmUgPSBub3cgPj0gc3QgJiYgbm93IDw9IGV0O1xuICBjb25zdCBpc1Nvb24gPSAhaXNMaXZlICYmIHN0LmdldFRpbWUoKSAtIG5vdy5nZXRUaW1lKCkgPCA5MDAwMDAgJiYgc3QgPiBub3c7XG4gIGNvbnN0IGlzUGFzdCA9IG5vdyA+IGV0O1xuICBjb25zdCBsaW5rZWQgPSBnZXRMaW5rZWRNZWV0aW5nRm9yRXZlbnQoZSk7XG4gIGNvbnN0IGxpbmtlZEhhc0NvbnRlbnQgPSBoYXNNZWV0aW5nQ29udGVudChsaW5rZWQpO1xuICBjb25zdCBhdHRlbmRlZXMgPSBwYXJzZUF0dGVuZGVlcyhlLmF0dGVuZGVlcyk7XG4gIGNvbnN0IG1pbnNMZWZ0ID0gaXNMaXZlID8gTWF0aC5yb3VuZCgoZXQuZ2V0VGltZSgpIC0gbm93LmdldFRpbWUoKSkgLyA2MDAwMCkgOiAwO1xuICBjb25zdCBtaW5zVGlsbCA9IGlzU29vbiA/IE1hdGgucm91bmQoKHN0LmdldFRpbWUoKSAtIG5vdy5nZXRUaW1lKCkpIC8gNjAwMDApIDogMDtcblxuICAvLyBTdGF0dXMgXHUyMDE0IHNob3cgbWVldGluZyBwaXBlbGluZSBzdGF0dXMgaWYgbGlua2VkLCBlbHNlIHRpbWUtYmFzZWRcbiAgY29uc3QgbVN0YXR1cyA9IGxpbmtlZCAmJiBsaW5rZWQuc3RhdHVzICE9PSAnc2NoZWR1bGVkJyA/IGxpbmtlZC5zdGF0dXMgOiBudWxsO1xuICBjb25zdCBzdGF0dXNCYWRnZSA9IG1TdGF0dXMgPT09ICdyZWNvcmRpbmcnXG4gICAgPyAnPHNwYW4gY2xhc3M9XCJtYy1iYWRnZSBtYy1iYWRnZS1saXZlXCI+PHNwYW4gY2xhc3M9XCJwdWxzZS1kb3QgcmVkXCI+PC9zcGFuPlJlY29yZGluZzwvc3Bhbj4nXG4gICAgOiBtU3RhdHVzID09PSAnc3RvcHBpbmcnIHx8IG1TdGF0dXMgPT09ICdyZWNvcmRlZCdcbiAgICA/ICc8c3BhbiBjbGFzcz1cIm1jLWJhZGdlIG1jLWJhZGdlLXByb2NcIj48c3BhbiBjbGFzcz1cInNwaW5uZXItc21cIj48L3NwYW4+IFNhdmluZyBhdWRpbzwvc3Bhbj4nXG4gICAgOiBtU3RhdHVzID09PSAndHJhbnNjcmliaW5nJ1xuICAgID8gJzxzcGFuIGNsYXNzPVwibWMtYmFkZ2UgbWMtYmFkZ2UtcHJvY1wiPjxzcGFuIGNsYXNzPVwic3Bpbm5lci1zbVwiPjwvc3Bhbj4gVHJhbnNjcmliaW5nPC9zcGFuPidcbiAgICA6IG1TdGF0dXMgPT09ICdwZW5kaW5nJ1xuICAgID8gJzxzcGFuIGNsYXNzPVwibWMtYmFkZ2UgbWMtYmFkZ2UtcHJvY1wiPjxzcGFuIGNsYXNzPVwic3Bpbm5lci1zbVwiPjwvc3Bhbj4gU3VtbWFyaXppbmc8L3NwYW4+J1xuICAgIDogbVN0YXR1cyA9PT0gJ3N1bW1hcml6ZWQnIHx8IG1TdGF0dXMgPT09ICdzeW5jZWQnXG4gICAgPyAnPHNwYW4gY2xhc3M9XCJtYy1iYWRnZSBtYy1iYWRnZS1kb25lXCI+XHUyNzEzIFJlYWR5PC9zcGFuPidcbiAgICA6IG1TdGF0dXMgPT09ICdmYWlsZWQnXG4gICAgPyAnPHNwYW4gY2xhc3M9XCJtYy1iYWRnZSBtYy1iYWRnZS1mYWlsXCI+RmFpbGVkPC9zcGFuPidcbiAgICA6IGlzTGl2ZVxuICAgID8gJzxzcGFuIGNsYXNzPVwibWMtYmFkZ2UgbWMtYmFkZ2UtbGl2ZVwiPjxzcGFuIGNsYXNzPVwicHVsc2UtZG90IHJlZFwiPjwvc3Bhbj5MaXZlIFxcdTAwYjcgJyArIG1pbnNMZWZ0ICsgJ20gbGVmdDwvc3Bhbj4nXG4gICAgOiBpc1Nvb25cbiAgICA/ICc8c3BhbiBjbGFzcz1cIm1jLWJhZGdlIG1jLWJhZGdlLXNvb25cIj5JbiAnICsgbWluc1RpbGwgKyAnbTwvc3Bhbj4nXG4gICAgOiBpc1Bhc3RcbiAgICA/ICc8c3BhbiBjbGFzcz1cIm1jLWJhZGdlIG1jLWJhZGdlLXBhc3RcIj5QYXN0PC9zcGFuPidcbiAgICA6ICcnO1xuXG4gIC8vIEF2YXRhcnNcbiAgY29uc3QgYXZhdGFyc0h0bWwgPSBhdHRlbmRlZXMuc2xpY2UoMCwgNSkubWFwKChhLCBpKSA9PlxuICAgICc8ZGl2IGNsYXNzPVwibWMtYXZhdGFyXCIgc3R5bGU9XCJiYWNrZ3JvdW5kOicgKyBhdmF0YXJDb2xvcihhLm5hbWUgfHwgYS5lbWFpbCkgKyAnO3otaW5kZXg6JyArICgxMCAtIGkpICsgJ1wiIHRpdGxlPVwiJyArIGVzYyhhLm5hbWUgfHwgYS5lbWFpbCkgKyAnXCI+JyArIGdldEluaXRpYWxzKGEubmFtZSB8fCBhLmVtYWlsKSArICc8L2Rpdj4nXG4gICkuam9pbignJyk7XG4gIGNvbnN0IG92ZXJmbG93ID0gYXR0ZW5kZWVzLmxlbmd0aCA+IDUgPyAnPHNwYW4gY2xhc3M9XCJtYy1hdmF0YXItbW9yZVwiPisnICsgKGF0dGVuZGVlcy5sZW5ndGggLSA1KSArICc8L3NwYW4+JyA6ICcnO1xuXG4gIC8vIFByZXAgc25pcHBldFxuICBjb25zdCBzbmlwcGV0ID0gZS5wcmVwX3N0YXR1cyA9PT0gJ3JlYWR5JyA/IGdldFByZXBTbmlwcGV0KGUucHJlcF9kb2MpIDogJyc7XG4gIGNvbnN0IHNuaXBwZXRIdG1sID0gc25pcHBldCA/ICc8ZGl2IGNsYXNzPVwibWMtcHJlcFwiPicgKyBzbmlwcGV0ICsgJzwvZGl2PicgOiAnJztcblxuICAvLyBBY3Rpb25zXG4gIGNvbnN0IHByZXBCdG4gPSBlLnByZXBfc3RhdHVzID09PSAncmVhZHknXG4gICAgPyAnPGJ1dHRvbiBjbGFzcz1cIm1jLWJ0biBtYy1idG4tZ2xhc3NcIiBvbmNsaWNrPVwiZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7b3Blbk1lZXRpbmcoXFwnJyArIChsaW5rZWQ/LmlkIHx8IGUuaWQpICsgJ1xcJyxcXCdwcmVwXFwnKVwiPlZpZXcgUHJlcDwvYnV0dG9uPidcbiAgICA6IGUucHJlcF9zdGF0dXMgPT09ICdwcmVwYXJpbmcnXG4gICAgPyBgPGJ1dHRvbiBjbGFzcz1cIm1jLWJ0biBtYy1idG4tZ2xhc3NcIiBvbmNsaWNrPVwiZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7dmlld1ByZXAoJyR7ZS5pZH0nKVwiPjxzcGFuIGNsYXNzPVwic3Bpbm5lci1zbVwiPjwvc3Bhbj4gUHJlcHBpbmdcXHUyMDI2PC9idXR0b24+YFxuICAgIDogZS5wcmVwX3N0YXR1cyA9PT0gJ2ZhaWxlZCdcbiAgICA/ICc8YnV0dG9uIGNsYXNzPVwibWMtYnRuIG1jLWJ0bi13YXJuXCIgb25jbGljaz1cImV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO3RyaWdnZXJQcmVwKFxcJycgKyBlLmlkICsgJ1xcJylcIj5SZXRyeSBQcmVwPC9idXR0b24+J1xuICAgIDogJzxidXR0b24gY2xhc3M9XCJtYy1idG4gbWMtYnRuLWdsYXNzXCIgb25jbGljaz1cImV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO3RyaWdnZXJQcmVwKFxcJycgKyBlLmlkICsgJ1xcJylcIj5cXHUyNzI2IFByZXA8L2J1dHRvbj4nO1xuXG4gIGNvbnN0IGFjdGlvbkJ0biA9IGxpbmtlZEhhc0NvbnRlbnRcbiAgICA/ICc8YnV0dG9uIGNsYXNzPVwibWMtYnRuIG1jLWJ0bi1wcmltYXJ5XCIgb25jbGljaz1cImV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO29wZW5NZWV0aW5nKFxcJycgKyBsaW5rZWQuaWQgKyAnXFwnKVwiPlZpZXcgTm90ZXM8L2J1dHRvbj4nXG4gICAgOiBsaW5rZWQgJiYgbGlua2VkLnN0YXR1cyAhPT0gJ3NjaGVkdWxlZCcgJiYgbGlua2VkLnN0YXR1cyA9PT0gJ3JlY29yZGluZydcbiAgICA/ICc8YnV0dG9uIGNsYXNzPVwibWMtYnRuIG1jLWJ0bi13YXJuXCIgb25jbGljaz1cImV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO29wZW5NZWV0aW5nKFxcJycgKyBsaW5rZWQuaWQgKyAnXFwnKVwiPlxcdTIzZjkgU3RvcDwvYnV0dG9uPidcbiAgICA6IGxpbmtlZCAmJiBsaW5rZWQuc3RhdHVzICE9PSAnc2NoZWR1bGVkJ1xuICAgID8gJzxidXR0b24gY2xhc3M9XCJtYy1idG4gbWMtYnRuLWdsYXNzXCIgb25jbGljaz1cImV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO29wZW5NZWV0aW5nKFxcJycgKyBsaW5rZWQuaWQgKyAnXFwnKVwiPicgKyBzdGF0dXNMYWJlbChsaW5rZWQuc3RhdHVzKSArICdcXHUyMDI2PC9idXR0b24+J1xuICAgIDogJzxidXR0b24gY2xhc3M9XCJtYy1idG4gbWMtYnRuLXByaW1hcnlcIiBvbmNsaWNrPVwiZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7c3RhcnRSZWNvcmRpbmcoXFwnJyArIGUuaWQgKyAnXFwnKVwiPlxcdTI1YjYgU3RhcnQ8L2J1dHRvbj4nO1xuXG5cbiAgY29uc3QgY2FyZENsYXNzID0gJ21jJyArIChpc0xpdmUgPyAnIG1jLWxpdmUnIDogJycpICsgKGlzU29vbiA/ICcgbWMtc29vbicgOiAnJykgKyAoaXNQYXN0ID8gJyBtYy1wYXN0JyA6ICcnKTtcbiAgY29uc3QgY2xpY2tBdHRyID0gbGlua2VkICYmIChsaW5rZWRIYXNDb250ZW50IHx8IGxpbmtlZC5zdGF0dXMgIT09ICdzY2hlZHVsZWQnKSA/ICcgb25jbGljaz1cIm9wZW5NZWV0aW5nKFxcJycgKyBsaW5rZWQuaWQgKyAnXFwnKVwiJyA6ICcnO1xuXG4gIHJldHVybiAnPGRpdiBjbGFzcz1cIicgKyBjYXJkQ2xhc3MgKyAnXCInICsgY2xpY2tBdHRyICsgJz4nICtcbiAgICAnPGRpdiBjbGFzcz1cIm1jLWlubmVyXCI+JyArXG4gICAgICAnPGRpdiBjbGFzcz1cIm1jLWxlZnRcIj4nICtcbiAgICAgICAgJzxkaXYgY2xhc3M9XCJtYy10aXRsZS1yb3dcIj4nICtcbiAgICAgICAgICAnPHNwYW4gY2xhc3M9XCJtYy10aXRsZVwiPicgKyBlc2MoZS50aXRsZSkgKyAnPC9zcGFuPicgK1xuICAgICAgICAgIHN0YXR1c0JhZGdlICtcbiAgICAgICAgJzwvZGl2PicgK1xuICAgICAgICAnPGRpdiBjbGFzcz1cIm1jLW1ldGFcIj4nICtcbiAgICAgICAgICAnPHNwYW4gY2xhc3M9XCJtYy10aW1lXCI+JyArIGZtdFRpbWUoZS5zdGFydF90aW1lKSArICcgXFx1MjAxMyAnICsgZm10VGltZShlLmVuZF90aW1lKSArICc8L3NwYW4+JyArXG4gICAgICAgICAgJzxzcGFuIGNsYXNzPVwibWMtY2FsXCI+JyArIGVzYyhlLmNhbGVuZGFyX25hbWUgfHwgJ0NhbGVuZGFyJykgKyAnPC9zcGFuPicgK1xuICAgICAgICAnPC9kaXY+JyArXG4gICAgICAgIChhdHRlbmRlZXMubGVuZ3RoID8gJzxkaXYgY2xhc3M9XCJtYy1hdmF0YXJzXCI+JyArIGF2YXRhcnNIdG1sICsgb3ZlcmZsb3cgKyAnPC9kaXY+JyA6ICcnKSArXG4gICAgICAnPC9kaXY+JyArXG4gICAgICAnPGRpdiBjbGFzcz1cIm1jLXJpZ2h0XCI+JyArXG4gICAgICAgIHByZXBCdG4gKyBhY3Rpb25CdG4gK1xuICAgICAgJzwvZGl2PicgK1xuICAgICc8L2Rpdj4nICtcbiAgICAoc25pcHBldCA/ICc8ZGl2IGNsYXNzPVwibWMtcHJlcC1yb3dcIj4nICsgc25pcHBldCArICc8L2Rpdj4nIDogJycpICtcbiAgJzwvZGl2Pic7XG59XG5cblxuZnVuY3Rpb24gcmVuZGVyQ2FsV2VlaygpOiBzdHJpbmcge1xuICBjb25zdCB3ZWVrTWFwID0gZ2V0V2Vla0V2ZW50cygpO1xuICBjb25zdCBub3cgPSBuZXcgRGF0ZSgpO1xuICBjb25zdCB0b2RheVN0ciA9IGxvY2FsRGF0ZVN0cihub3cpO1xuICBjb25zdCBlbnRyaWVzID0gWy4uLndlZWtNYXAuZW50cmllcygpXS5maWx0ZXIoKFssZXZzXSkgPT4gZXZzLmxlbmd0aCA+IDApO1xuICBpZiAoIWVudHJpZXMubGVuZ3RoKSByZXR1cm4gJzxkaXYgY2xhc3M9XCJlbXB0eS1zdGF0ZVwiPk5vIG1lZXRpbmdzIHRoaXMgd2VlazwvZGl2Pic7XG4gIHJldHVybiBgXG4gICAgPGRpdiBjbGFzcz1cIndlZWstbGlzdFwiPlxuICAgICAgJHtlbnRyaWVzLm1hcCgoW2RhdGVTdHIsIGV2c10pID0+IHtcbiAgICAgICAgY29uc3QgZCA9IG5ldyBEYXRlKGRhdGVTdHIgKyAnVDEyOjAwJyk7XG4gICAgICAgIGNvbnN0IGlzVG9kYXkgPSBkYXRlU3RyID09PSB0b2RheVN0cjtcbiAgICAgICAgY29uc3QgZGF5TGFiZWwgPSBpc1RvZGF5ID8gJ1RvZGF5JyA6IGQudG9Mb2NhbGVEYXRlU3RyaW5nKHVuZGVmaW5lZCwge3dlZWtkYXk6J2xvbmcnLCBtb250aDonc2hvcnQnLCBkYXk6J251bWVyaWMnfSk7XG4gICAgICAgIHJldHVybiBgXG4gICAgICAgIDxkaXYgY2xhc3M9XCJ3ZWVrLWRheS1ncm91cFwiPlxuICAgICAgICAgIDxkaXYgY2xhc3M9XCJ3ZWVrLWRheS1oZWFkaW5nJHtpc1RvZGF5ID8gJyB3ZWVrLWRheS10b2RheScgOiAnJ31cIj4ke2RheUxhYmVsfTwvZGl2PlxuICAgICAgICAgIDxkaXYgY2xhc3M9XCJ3ZWVrLWRheS1ldmVudHNcIj5cbiAgICAgICAgICAgICR7ZXZzLm1hcChlID0+IHtcbiAgICAgICAgICAgICAgY29uc3QgbGlua2VkTWVldGluZyA9IGdldExpbmtlZE1lZXRpbmdGb3JFdmVudChlKTtcbiAgICAgICAgICAgICAgY29uc3QgbGlua2VkID0gbGlua2VkTWVldGluZz8uaWQgfHwgJyc7XG4gICAgICAgICAgICAgIGNvbnN0IHByZXBSZWFkeSA9IGUucHJlcF9zdGF0dXMgPT09ICdyZWFkeSc7XG4gICAgICAgICAgICAgIGNvbnN0IHByZXBCdXN5ICA9IGUucHJlcF9zdGF0dXMgPT09ICdwcmVwYXJpbmcnO1xuICAgICAgICAgICAgICBjb25zdCBjbGljayA9IGxpbmtlZCA/IGBvbmNsaWNrPVwib3Blbk1lZXRpbmcoJyR7bGlua2VkfScpXCJgIDogJyc7XG4gICAgICAgICAgICAgIHJldHVybiBgXG4gICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ3ZWVrLXJvdyR7bGlua2VkID8gJyB3ZWVrLXJvdy1saW5rZWQnIDogJyd9XCIgJHtjbGlja30+XG4gICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJ3ZWVrLXJvdy10aW1lXCI+JHtmbXRUaW1lKGUuc3RhcnRfdGltZSl9PC9zcGFuPlxuICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwid2Vlay1yb3ctZG90XCIgc3R5bGU9XCJiYWNrZ3JvdW5kOiR7ZS5jYWxlbmRhcl9uYW1lID8gJ3ZhcigtLWFjY2VudCknIDogJ3ZhcigtLW11dGVkKSd9XCI+PC9zcGFuPlxuICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwid2Vlay1yb3ctdGl0bGVcIj4ke2VzYyhlLnRpdGxlKX08L3NwYW4+XG4gICAgICAgICAgICAgICAgJHtlLmNhbGVuZGFyX25hbWUgPyBgPHNwYW4gY2xhc3M9XCJ3ZWVrLXJvdy1jYWxcIj4ke2VzYyhlLmNhbGVuZGFyX25hbWUpfTwvc3Bhbj5gIDogJyd9XG4gICAgICAgICAgICAgICAgJHtoYXNNZWV0aW5nQ29udGVudChsaW5rZWRNZWV0aW5nKSA/IGA8c3BhbiBjbGFzcz1cIndlZWstcm93LW5vdGVzXCI+JHtpY29uKCdub3RlJywgMTIpfSBOb3Rlczwvc3Bhbj5gIDogJyd9XG4gICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJ3ZWVrLXJvdy1hY3Rpb25zXCI+XG4gICAgICAgICAgICAgICAgICAke3ByZXBSZWFkeVxuICAgICAgICAgICAgICAgICAgICA/IGA8YnV0dG9uIGNsYXNzPVwid2Vlay1hY3Rpb24tYnRuXCIgb25jbGljaz1cImV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO29wZW5NZWV0aW5nKCcke2xpbmtlZH0nKVwiPiR7aWNvbignc3BhcmtsZScsMTIpfSBWaWV3IFByZXA8L2J1dHRvbj5gXG4gICAgICAgICAgICAgICAgICAgIDogcHJlcEJ1c3lcbiAgICAgICAgICAgICAgICAgICAgPyBgPGJ1dHRvbiBjbGFzcz1cIndlZWstYWN0aW9uLWJ0blwiIG9uY2xpY2s9XCJldmVudC5zdG9wUHJvcGFnYXRpb24oKTt2aWV3UHJlcCgnJHtlLmlkfScpXCI+JHtpY29uKCdzcGFya2xlJywxMil9IFByZXBwaW5nXHUyMDI2PC9idXR0b24+YFxuICAgICAgICAgICAgICAgICAgICA6IGUucHJlcF9zdGF0dXMgPT09ICdmYWlsZWQnXG4gICAgICAgICAgICAgID8gYDxidXR0b24gY2xhc3M9XCJ3ZWVrLWFjdGlvbi1idG4gd2Vlay1hY3Rpb24td2FyblwiIG9uY2xpY2s9XCJldmVudC5zdG9wUHJvcGFnYXRpb24oKTt0cmlnZ2VyUHJlcCgnJHtlLmlkfScpXCI+JHtpY29uKCdzcGFya2xlJywxMil9IFJldHJ5PC9idXR0b24+YFxuICAgICAgICAgICAgICA6IGA8YnV0dG9uIGNsYXNzPVwid2Vlay1hY3Rpb24tYnRuXCIgb25jbGljaz1cImV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO3RyaWdnZXJQcmVwKCcke2UuaWR9JylcIj4ke2ljb24oJ3NwYXJrbGUnLDEyKX0gUHJlcDwvYnV0dG9uPmBcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJ3ZWVrLWFjdGlvbi1idG4gd2Vlay1hY3Rpb24tcHJpbWFyeVwiIG9uY2xpY2s9XCJldmVudC5zdG9wUHJvcGFnYXRpb24oKTtzdGFydFJlY29yZGluZygnJHtlLmlkfScpXCI+JHtpY29uKCdyZWNvcmQnLDEyKX0gU3RhcnQ8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICAgICAgIDwvZGl2PmA7XG4gICAgICAgICAgICB9KS5qb2luKCcnKX1cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC9kaXY+YDtcbiAgICAgIH0pLmpvaW4oJycpfVxuICAgIDwvZGl2PmA7XG59XG5mdW5jdGlvbiByZW5kZXJDYWxNb250aCgpOiBzdHJpbmcge1xuICBjb25zdCB7d2Vla3N9ID0gZ2V0TW9udGhFdmVudHMoKTtcbiAgY29uc3Qgbm93ID0gbmV3IERhdGUoKTtcbiAgY29uc3QgbW9udGhOYW1lID0gbm93LnRvTG9jYWxlRGF0ZVN0cmluZyh1bmRlZmluZWQsIHttb250aDogJ2xvbmcnLCB5ZWFyOiAnbnVtZXJpYyd9KTtcbiAgcmV0dXJuIGBcbiAgICA8ZGl2IGNsYXNzPVwibW9udGgtdmlld1wiPlxuICAgICAgPGRpdiBjbGFzcz1cIm1vbnRoLWhlYWRlci1sYWJlbFwiPiR7bW9udGhOYW1lfTwvZGl2PlxuICAgICAgPGRpdiBjbGFzcz1cIm1vbnRoLWdyaWRcIj5cbiAgICAgICAgPGRpdiBjbGFzcz1cIm1vbnRoLWRheS1sYWJlbHNcIj5cbiAgICAgICAgICAke1snU3VuJywnTW9uJywnVHVlJywnV2VkJywnVGh1JywnRnJpJywnU2F0J10ubWFwKGQgPT4gYDxkaXYgY2xhc3M9XCJtb250aC1kYXktbGFiZWxcIj4ke2R9PC9kaXY+YCkuam9pbignJyl9XG4gICAgICAgIDwvZGl2PlxuICAgICAgICAke3dlZWtzLm1hcCh3ZWVrID0+IGBcbiAgICAgICAgICA8ZGl2IGNsYXNzPVwibW9udGgtd2Vla1wiPlxuICAgICAgICAgICAgJHt3ZWVrLm1hcChjZWxsID0+IGBcbiAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cIm1vbnRoLWNlbGwke2NlbGwuaXNUb2RheSA/ICcgbW9udGgtdG9kYXknIDogJyd9JHtjZWxsLmRheSA9PT0gMCA/ICcgbW9udGgtY2VsbC1lbXB0eScgOiAnJ31cIlxuICAgICAgICAgICAgICAgICR7Y2VsbC5kYXkgPiAwICYmIGNlbGwuZXZlbnRzLmxlbmd0aCA/IGBvbmNsaWNrPVwic2hvd01vbnRoRGF5KCcke2NlbGwuZGF0ZX0nKVwiIHN0eWxlPVwiY3Vyc29yOnBvaW50ZXJcImAgOiAnJ30+XG4gICAgICAgICAgICAgICAgJHtjZWxsLmRheSA+IDAgPyBgXG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwibW9udGgtY2VsbC1udW0ke2NlbGwuaXNUb2RheSA/ICcgdG9kYXktbnVtJyA6ICcnfVwiPiR7Y2VsbC5kYXl9PC9kaXY+XG4gICAgICAgICAgICAgICAgICAke2NlbGwuZXZlbnRzLmxlbmd0aCA/IGBcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cIm1vbnRoLWRvdHNcIj5cbiAgICAgICAgICAgICAgICAgICAgICAke2NlbGwuZXZlbnRzLnNsaWNlKDAsIDMpLm1hcChlID0+IGA8c3BhbiBjbGFzcz1cIm1vbnRoLWRvdCR7Z2V0TGlua2VkTWVldGluZ0ZvckV2ZW50KGUpID8gJyBtb250aC1kb3QtbGlua2VkJyA6ICcnfVwiPjwvc3Bhbj5gKS5qb2luKCcnKX1cbiAgICAgICAgICAgICAgICAgICAgICAke2NlbGwuZXZlbnRzLmxlbmd0aCA+IDMgPyBgPHNwYW4gY2xhc3M9XCJtb250aC1kb3QtbW9yZVwiPiske2NlbGwuZXZlbnRzLmxlbmd0aCAtIDN9PC9zcGFuPmAgOiAnJ31cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+YCA6ICcnfVxuICAgICAgICAgICAgICAgIGAgOiAnJ31cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICBgKS5qb2luKCcnKX1cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgYCkuam9pbignJyl9XG4gICAgICA8L2Rpdj5cbiAgICAgIDxkaXYgY2xhc3M9XCJtb250aC1kYXktZGV0YWlsXCIgaWQ9XCJtb250aC1kYXktZGV0YWlsXCI+PC9kaXY+XG4gICAgPC9kaXY+YDtcbn1cblxuZnVuY3Rpb24gc2hvd01vbnRoRGF5KGRhdGVTdHI6IHN0cmluZyk6IHZvaWQge1xuICBjb25zdCBldnMgPSBjYWxFdmVudHMuZmlsdGVyKGUgPT4gZS5zdGFydF90aW1lLnNwbGl0KCdUJylbMF0gPT09IGRhdGVTdHIpO1xuICBjb25zdCBkZXRhaWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbW9udGgtZGF5LWRldGFpbCcpO1xuICBpZiAoIWRldGFpbCB8fCAhZXZzLmxlbmd0aCkgcmV0dXJuO1xuICBjb25zdCBkID0gbmV3IERhdGUoZGF0ZVN0ciArICdUMTI6MDAnKTtcbiAgY29uc3QgbGFiZWwgPSBkLnRvTG9jYWxlRGF0ZVN0cmluZyh1bmRlZmluZWQsIHt3ZWVrZGF5Oidsb25nJywgbW9udGg6J2xvbmcnLCBkYXk6J251bWVyaWMnfSk7XG4gIGRldGFpbC5pbm5lckhUTUwgPSBgXG4gICAgPGRpdiBjbGFzcz1cIm1vbnRoLWRldGFpbC1oZWFkZXJcIj4ke2xhYmVsfTwvZGl2PlxuICAgIDxkaXYgY2xhc3M9XCJ3ZWVrLWRheS1ldmVudHNcIj5cbiAgICAgICR7ZXZzLm1hcChlID0+IHtcbiAgICAgICAgY29uc3QgbGlua2VkTWVldGluZyA9IGdldExpbmtlZE1lZXRpbmdGb3JFdmVudChlKTtcbiAgICAgICAgY29uc3QgbGlua2VkID0gbGlua2VkTWVldGluZz8uaWQgfHwgJyc7XG4gICAgICAgIHJldHVybiBgXG4gICAgICAgIDxkaXYgY2xhc3M9XCJ3ZWVrLXJvdyR7bGlua2VkID8gJyB3ZWVrLXJvdy1saW5rZWQnIDogJyd9XCIgJHtsaW5rZWQgPyBgb25jbGljaz1cIm9wZW5NZWV0aW5nKCcke2xpbmtlZH0nKVwiYCA6ICcnfT5cbiAgICAgICAgICA8c3BhbiBjbGFzcz1cIndlZWstcm93LXRpbWVcIj4ke2ZtdFRpbWUoZS5zdGFydF90aW1lKX08L3NwYW4+XG4gICAgICAgICAgPHNwYW4gY2xhc3M9XCJ3ZWVrLXJvdy1kb3RcIiBzdHlsZT1cImJhY2tncm91bmQ6dmFyKC0tYWNjZW50KVwiPjwvc3Bhbj5cbiAgICAgICAgICA8c3BhbiBjbGFzcz1cIndlZWstcm93LXRpdGxlXCI+JHtlc2MoZS50aXRsZSl9PC9zcGFuPlxuICAgICAgICAgICR7ZS5jYWxlbmRhcl9uYW1lID8gYDxzcGFuIGNsYXNzPVwid2Vlay1yb3ctY2FsXCI+JHtlc2MoZS5jYWxlbmRhcl9uYW1lKX08L3NwYW4+YCA6ICcnfVxuICAgICAgICAgICR7aGFzTWVldGluZ0NvbnRlbnQobGlua2VkTWVldGluZykgPyBgPHNwYW4gY2xhc3M9XCJ3ZWVrLXJvdy1ub3Rlc1wiPiR7aWNvbignbm90ZScsIDEyKX0gTm90ZXM8L3NwYW4+YCA6ICcnfVxuICAgICAgICAgIDxzcGFuIGNsYXNzPVwid2Vlay1yb3ctYWN0aW9uc1wiPlxuICAgICAgICAgICAgJHtlLnByZXBfc3RhdHVzID09PSAncmVhZHknXG4gICAgICAgICAgICAgID8gYDxidXR0b24gY2xhc3M9XCJ3ZWVrLWFjdGlvbi1idG5cIiBvbmNsaWNrPVwiZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7b3Blbk1lZXRpbmcoJyR7bGlua2VkfScpXCI+JHtpY29uKCdzcGFya2xlJywxMil9IFZpZXcgUHJlcDwvYnV0dG9uPmBcbiAgICAgICAgICAgICAgOiBlLnByZXBfc3RhdHVzID09PSAncHJlcGFyaW5nJ1xuICAgICAgICAgICAgICA/IGA8YnV0dG9uIGNsYXNzPVwid2Vlay1hY3Rpb24tYnRuXCIgb25jbGljaz1cImV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO3ZpZXdQcmVwKCcke2UuaWR9JylcIj4ke2ljb24oJ3NwYXJrbGUnLDEyKX0gUHJlcHBpbmdcdTIwMjY8L2J1dHRvbj5gXG4gICAgICAgICAgICAgIDogZS5wcmVwX3N0YXR1cyA9PT0gJ2ZhaWxlZCdcbiAgICAgICAgICAgICAgPyBgPGJ1dHRvbiBjbGFzcz1cIndlZWstYWN0aW9uLWJ0biB3ZWVrLWFjdGlvbi13YXJuXCIgb25jbGljaz1cImV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO3RyaWdnZXJQcmVwKCcke2UuaWR9JylcIj4ke2ljb24oJ3NwYXJrbGUnLDEyKX0gUmV0cnk8L2J1dHRvbj5gXG4gICAgICAgICAgICAgIDogYDxidXR0b24gY2xhc3M9XCJ3ZWVrLWFjdGlvbi1idG5cIiBvbmNsaWNrPVwiZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7dHJpZ2dlclByZXAoJyR7ZS5pZH0nKVwiPiR7aWNvbignc3BhcmtsZScsMTIpfSBQcmVwPC9idXR0b24+YFxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cIndlZWstYWN0aW9uLWJ0biB3ZWVrLWFjdGlvbi1wcmltYXJ5XCIgb25jbGljaz1cImV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO3N0YXJ0UmVjb3JkaW5nKCcke2UuaWR9JylcIj4ke2ljb24oJ3JlY29yZCcsMTIpfSBTdGFydDwvYnV0dG9uPlxuICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgPC9kaXY+YDtcbiAgICAgIH0pLmpvaW4oJycpfVxuICAgIDwvZGl2PmA7XG59XG5cblxuZnVuY3Rpb24gcmVuZGVyUHJlcFZpZXcoZXY6IENhbEV2ZW50KTogc3RyaW5nIHtcbiAgY29uc3QgYXR0ZW5kZWVzID0gcGFyc2VBdHRlbmRlZXMoZXYuYXR0ZW5kZWVzKTtcbiAgY29uc3QgaXNQcmVwYXJpbmcgPSBldi5wcmVwX3N0YXR1cyA9PT0gJ3ByZXBhcmluZyc7XG4gIGNvbnN0IGlzUmVhZHkgPSBldi5wcmVwX3N0YXR1cyA9PT0gJ3JlYWR5JztcblxuICAvLyBQYXJzZSBzdHJ1Y3R1cmVkIEpTT04gcHJlcCBkb2NcbiAgbGV0IHByZXA6IGFueSA9IG51bGw7XG4gIGlmIChpc1JlYWR5ICYmIGV2LnByZXBfZG9jKSB7XG4gICAgdHJ5IHsgcHJlcCA9IEpTT04ucGFyc2UoZXYucHJlcF9kb2MpOyB9IGNhdGNoIHt9XG4gIH1cblxuICBmdW5jdGlvbiByZW5kZXJQcmVwUmVhZHkoKTogc3RyaW5nIHtcbiAgICBpZiAoIXByZXApIHJldHVybiBgPGRpdiBjbGFzcz1cIm5vdGVzLWVkaXRvciBub3Rlcy1lZGl0YWJsZVwiIGNvbnRlbnRlZGl0YWJsZT1cImZhbHNlXCI+JHtmb3JtYXRTdW1tYXJ5KGV2LnByZXBfZG9jKX08L2Rpdj5gO1xuICAgIC8vIE1lcmdlIGNhbGVuZGFyIGF0dGVuZGVlcyB3aXRoIGVucmljaGVkIGF0dGVuZGVlIGRhdGEgZnJvbSBwcmVwXG4gICAgY29uc3QgZW5yaWNoZWQ6IHtbazpzdHJpbmddOmFueX0gPSB7fTtcbiAgICAocHJlcC5hdHRlbmRlZXMgfHwgW10pLmZvckVhY2goKGE6YW55KSA9PiB7IGlmKGEubmFtZSkgZW5yaWNoZWRbYS5uYW1lLnRvTG93ZXJDYXNlKCldID0gYTsgfSk7XG5cbiAgICByZXR1cm4gYFxuICAgICAgPGRpdiBjbGFzcz1cInByZXAtZG9jXCI+XG4gICAgICAgICR7cHJlcC50bGRyID8gYFxuICAgICAgICA8ZGl2IGNsYXNzPVwicHJlcC1jYXJkIHByZXAtY2FyZC10bGRyXCI+XG4gICAgICAgICAgPGRpdiBjbGFzcz1cInByZXAtY2FyZC1sYWJlbFwiPiR7aWNvbignc3BhcmtsZScsMTMpfSBXYWxraW5nIGluPC9kaXY+XG4gICAgICAgICAgPHAgY2xhc3M9XCJwcmVwLXRsZHItdGV4dFwiPiR7ZXNjKHByZXAudGxkcil9PC9wPlxuICAgICAgICA8L2Rpdj5gIDogJyd9XG5cbiAgICAgICAgPGRpdiBjbGFzcz1cInByZXAtY2FyZFwiPlxuICAgICAgICAgIDxkaXYgY2xhc3M9XCJwcmVwLWNhcmQtbGFiZWxcIj4ke2ljb24oJ3BlcnNvbicsMTMpfSBBdHRlbmRlZXM8L2Rpdj5cbiAgICAgICAgICA8ZGl2IGNsYXNzPVwicHJlcC1wZW9wbGVcIj5cbiAgICAgICAgICAgICR7YXR0ZW5kZWVzLnNsaWNlKDAsMTIpLm1hcChhID0+IHtcbiAgICAgICAgICAgICAgY29uc3Qga2V5ID0gKGEubmFtZXx8JycpLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICAgIGNvbnN0IGluZm8gPSBlbnJpY2hlZFtrZXldIHx8IHt9O1xuICAgICAgICAgICAgICByZXR1cm4gYDxkaXYgY2xhc3M9XCJwcmVwLXBlcnNvblwiPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJhdmF0YXJcIiBzdHlsZT1cImJhY2tncm91bmQ6JHthdmF0YXJDb2xvcihhLm5hbWV8fGEuZW1haWwpfVwiPiR7Z2V0SW5pdGlhbHMoYS5uYW1lfHxhLmVtYWlsKX08L2Rpdj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwicHJlcC1wZXJzb24taW5mb1wiPlxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInByZXAtcGVyc29uLW5hbWVcIj4ke2VzYyhhLm5hbWV8fGEuZW1haWwuc3BsaXQoJ0AnKVswXSl9PC9kaXY+XG4gICAgICAgICAgICAgICAgICAke2luZm8udGl0bGV8fGluZm8uY29tcGFueSA/IGA8ZGl2IGNsYXNzPVwicHJlcC1wZXJzb24tcm9sZVwiPiR7ZXNjKFtpbmZvLnRpdGxlLGluZm8uY29tcGFueV0uZmlsdGVyKEJvb2xlYW4pLmpvaW4oJyBcdTAwQjcgJykpfTwvZGl2PmAgOiBgPGRpdiBjbGFzcz1cInByZXAtcGVyc29uLWVtYWlsXCI+JHtlc2MoYS5lbWFpbCl9PC9kaXY+YH1cbiAgICAgICAgICAgICAgICAgICR7aW5mby5iaW8gPyBgPGRpdiBjbGFzcz1cInByZXAtcGVyc29uLWJpb1wiPiR7ZXNjKGluZm8uYmlvKX08L2Rpdj5gIDogJyd9XG4gICAgICAgICAgICAgICAgICAke2luZm8ubGlua2VkaW4gPyBgPGEgY2xhc3M9XCJwcmVwLXBlcnNvbi1saW5rZWRpblwiIGhyZWY9XCIke2luZm8ubGlua2VkaW59XCIgdGFyZ2V0PVwiX2JsYW5rXCI+JHtpY29uKCdwZXJzb24nLCAxMSl9IExpbmtlZEluPC9hPmAgOiAnJ31cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgPC9kaXY+YDtcbiAgICAgICAgICAgIH0pLmpvaW4oJycpfVxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5cblxuICAgICAgICAke3ByZXAuY29udGV4dCAmJiBwcmVwLmNvbnRleHQgIT09ICdObyBwcmlvciBjb250ZXh0IGZvdW5kLicgPyBgXG4gICAgICAgIDxkaXYgY2xhc3M9XCJwcmVwLWNhcmRcIj5cbiAgICAgICAgICA8ZGl2IGNsYXNzPVwicHJlcC1jYXJkLWxhYmVsXCI+JHtpY29uKCdub3RlJywxMyl9IENvbnRleHQ8L2Rpdj5cbiAgICAgICAgICA8cCBjbGFzcz1cInByZXAtY2FyZC1ib2R5XCI+JHtlc2MocHJlcC5jb250ZXh0KX08L3A+XG4gICAgICAgIDwvZGl2PmAgOiAnJ31cblxuICAgICAgICAke3ByZXAub3Blbkl0ZW1zICYmIHByZXAub3Blbkl0ZW1zLmxlbmd0aCA/IGBcbiAgICAgICAgPGRpdiBjbGFzcz1cInByZXAtY2FyZFwiPlxuICAgICAgICAgIDxkaXYgY2xhc3M9XCJwcmVwLWNhcmQtbGFiZWxcIj4ke2ljb24oJ2NoZWNrJywxMyl9IE9wZW4gaXRlbXM8L2Rpdj5cbiAgICAgICAgICA8dWwgY2xhc3M9XCJwcmVwLWxpc3RcIj5cbiAgICAgICAgICAgICR7cHJlcC5vcGVuSXRlbXMubWFwKChpdGVtOnN0cmluZykgPT4gYDxsaT4ke2VzYyhpdGVtKX08L2xpPmApLmpvaW4oJycpfVxuICAgICAgICAgIDwvdWw+XG4gICAgICAgIDwvZGl2PmAgOiAnJ31cblxuICAgICAgICAke3ByZXAudGFsa2luZ1BvaW50cyAmJiBwcmVwLnRhbGtpbmdQb2ludHMubGVuZ3RoID8gYFxuICAgICAgICA8ZGl2IGNsYXNzPVwicHJlcC1jYXJkXCI+XG4gICAgICAgICAgPGRpdiBjbGFzcz1cInByZXAtY2FyZC1sYWJlbFwiPiR7aWNvbignY2hhdCcsMTMpfSBUYWxraW5nIHBvaW50czwvZGl2PlxuICAgICAgICAgIDx1bCBjbGFzcz1cInByZXAtbGlzdCBwcmVwLWxpc3QtdGFsa2luZ1wiPlxuICAgICAgICAgICAgJHtwcmVwLnRhbGtpbmdQb2ludHMubWFwKCh0cDpzdHJpbmcpID0+IGA8bGk+JHtlc2ModHApfTwvbGk+YCkuam9pbignJyl9XG4gICAgICAgICAgPC91bD5cbiAgICAgICAgPC9kaXY+YCA6ICcnfVxuXG4gICAgICAgICR7cHJlcC5uZXdzID8gYFxuICAgICAgICA8ZGl2IGNsYXNzPVwicHJlcC1jYXJkXCI+XG4gICAgICAgICAgPGRpdiBjbGFzcz1cInByZXAtY2FyZC1sYWJlbFwiPiR7aWNvbigncmVmcmVzaCcsMTMpfSBSZWNlbnQgbmV3czwvZGl2PlxuICAgICAgICAgIDxwIGNsYXNzPVwicHJlcC1jYXJkLWJvZHlcIj4ke2VzYyhwcmVwLm5ld3MpfTwvcD5cbiAgICAgICAgPC9kaXY+YCA6ICcnfVxuXG4gICAgICAgICR7cHJlcC5xdWVzdGlvbnNUb0FzayAmJiBwcmVwLnF1ZXN0aW9uc1RvQXNrLmxlbmd0aCA/IGBcbiAgICAgICAgPGRpdiBjbGFzcz1cInByZXAtY2FyZCBwcmVwLXF1ZXN0aW9ucy1jYXJkXCI+XG4gICAgICAgICAgPGRpdiBjbGFzcz1cInByZXAtY2FyZC1sYWJlbFwiPiR7aWNvbignY2hhdCcsMTMpfSBUb3AgMyBRdWVzdGlvbnMgdG8gQXNrICR7cHJlcC5tZWV0aW5nVHlwZSA9PT0gJ3ZjJyA/ICc8c3BhbiBjbGFzcz1cInByZXAtdmMtYmFkZ2VcIj5WQyBcdTAwQjcgUnVicmljLXNjb3JlZDwvc3Bhbj4nIDogJyd9PC9kaXY+XG4gICAgICAgICAgPGRpdiBjbGFzcz1cInByZXAtcXVlc3Rpb25zLWxpc3RcIj5cbiAgICAgICAgICAgICR7cHJlcC5xdWVzdGlvbnNUb0Fzay5tYXAoKHFxOiBhbnksIGk6IG51bWJlcikgPT4gYFxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwicHJlcC1xLWl0ZW1cIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwicHJlcC1xLWhlYWRlclwiPlxuICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJwcmVwLXEtbnVtXCI+JHtpICsgMX08L3NwYW4+XG4gICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cInByZXAtcS1jYXRlZ29yeVwiPiR7ZXNjKChxcS5jYXRlZ29yeSB8fCAnJykucmVwbGFjZSgvXy9nLCAnICcpKX08L3NwYW4+XG4gICAgICAgICAgICAgICAgICAke3FxLnNjb3JlID8gYDxzcGFuIGNsYXNzPVwicHJlcC1xLXNjb3JlXCI+JHtOdW1iZXIocXEuc2NvcmUpLnRvRml4ZWQoMSl9PC9zcGFuPmAgOiAnJ31cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwicHJlcC1xLXRleHRcIj4ke2VzYyhxcS5xdWVzdGlvbil9PC9kaXY+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInByZXAtcS13aHlcIj4ke2VzYyhxcS53aHkpfTwvZGl2PlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIGApLmpvaW4oJycpfVxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5gIDogJyd9XG4gICAgICA8L2Rpdj5gO1xuICB9XG5cbiAgcmV0dXJuIGBcbiAgICA8ZGl2IGNsYXNzPVwibWVldGluZy1sYXlvdXRcIj5cbiAgICAgIDxkaXYgY2xhc3M9XCJtZWV0aW5nLXRvcGJhciBnbGFzc1wiPlxuICAgICAgICA8YnV0dG9uIGNsYXNzPVwiYnRuLWljb25cIiBpZD1cImJ0bi1iYWNrXCI+JHtpY29uKCdiYWNrJywgMjApfTwvYnV0dG9uPlxuICAgICAgICA8ZGl2IGNsYXNzPVwibWVldGluZy10b3BiYXItdGl0bGVcIj4ke2ljb24oJ3NwYXJrbGUnLCAxNil9IFByZXA6ICR7ZXNjKGV2LnRpdGxlKX08L2Rpdj5cbiAgICAgICAgPGRpdiBjbGFzcz1cInRvcGJhci1yaWdodFwiPlxuICAgICAgICAgIDxzcGFuIGNsYXNzPVwiY2FsLXRpbWUtY2hpcFwiPiR7Zm10VGltZShldi5zdGFydF90aW1lKX0gXHUyMDEzICR7Zm10VGltZShldi5lbmRfdGltZSl9PC9zcGFuPlxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvZGl2PlxuICAgICAgPGRpdiBjbGFzcz1cIm1lZXRpbmctYm9keVwiPlxuICAgICAgICAke2lzUHJlcGFyaW5nID8gYFxuICAgICAgICAgIDxkaXYgY2xhc3M9XCJwcmVwLWxpdmVcIj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJwcmVwLWxpdmUtaGVhZGVyXCI+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJzcGlubmVyXCI+PC9kaXY+XG4gICAgICAgICAgICAgIDxzcGFuPkFnZW50IGlzIHJlc2VhcmNoaW5nIHlvdXIgcHJlcCBkb2NcdTIwMjY8L3NwYW4+XG4gICAgICAgICAgICAgICR7cHJlcFN0YXJ0VGltZSA/IGA8c3BhbiBjbGFzcz1cInByZXAtZWxhcHNlZFwiPiR7TWF0aC5mbG9vcigoRGF0ZS5ub3coKS1wcmVwU3RhcnRUaW1lKS8xMDAwKX1zPC9zcGFuPmAgOiAnJ31cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgJHtwcmVwTG9ncy5sZW5ndGggPT09IDAgPyBgXG4gICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJwcmVwLWxpdmUtZW1wdHlcIj5TdGFydGluZyB1cFx1MjAyNjwvZGl2PlxuICAgICAgICAgICAgYCA6IGBcbiAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInByZXAtbG9nLWNhcmRcIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwicHJlcC1sb2ctbGF0ZXN0XCI+JHtpY29uKHByZXBMb2dzW3ByZXBMb2dzLmxlbmd0aC0xXS5zcGxpdCgnOicpWzBdLDE0KX0gJHtlc2MocHJlcExvZ3NbcHJlcExvZ3MubGVuZ3RoLTFdLnNwbGl0KCc6Jykuc2xpY2UoMSkuam9pbignOicpKX08L2Rpdj5cbiAgICAgICAgICAgICAgICAke3ByZXBMb2dzLmxlbmd0aCA+IDEgPyBgXG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwicHJlcC1sb2ctaGlzdG9yeVwiPlxuICAgICAgICAgICAgICAgICAgICAke3ByZXBMb2dzLnNsaWNlKC04LC0xKS5yZXZlcnNlKCkubWFwKGwgPT4gYDxkaXYgY2xhc3M9XCJwcmVwLWxvZy1saW5lXCI+JHtpY29uKGwuc3BsaXQoJzonKVswXSwxMil9ICR7ZXNjKGwuc3BsaXQoJzonKS5zbGljZSgxKS5qb2luKCc6JykpfTwvZGl2PmApLmpvaW4oJycpfVxuICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgYCA6ICcnfVxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIGB9XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgIGAgOiBpc1JlYWR5ID8gcmVuZGVyUHJlcFJlYWR5KCkgOiBldi5wcmVwX3N0YXR1cyA9PT0gJ2ZhaWxlZCcgPyBgXG4gICAgICAgICAgPGRpdiBjbGFzcz1cInByZXAtZmFpbGVkLWNhcmRcIj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJwcmVwLWZhaWxlZC1pY29uXCI+JHtpY29uKCdhbGVydCcsIDI0KX08L2Rpdj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJwcmVwLWZhaWxlZC10ZXh0XCI+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJwcmVwLWZhaWxlZC10aXRsZVwiPlByZXAgY291bGRuJ3QgY29tcGxldGU8L2Rpdj5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInByZXAtZmFpbGVkLXN1YlwiPlRoZSBhZ2VudCByYW4gaW50byBhbiBpc3N1ZS4gVGhpcyB1c3VhbGx5IHJlc29sdmVzIG9uIHJldHJ5LjwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwicHJlcC1yZXRyeS1idG5cIiBvbmNsaWNrPVwidHJpZ2dlclByZXAoJyR7ZXYuaWR9JylcIj4ke2ljb24oJ3JlZnJlc2gnLCAxNCl9IFRyeSBhZ2FpbjwvYnV0dG9uPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICBgIDogYFxuICAgICAgICAgIDxkaXYgY2xhc3M9XCJwcmVwLWVtcHR5XCI+XG4gICAgICAgICAgICA8cD5DbGljayA8c3Ryb25nPlByZXA8L3N0cm9uZz4gb24gYSBjYWxlbmRhciBldmVudCB0byBnZW5lcmF0ZSBhIHByZXAgZG9jdW1lbnQgd2l0aCBhdHRlbmRlZSByZXNlYXJjaCwgcHJpb3IgbWVldGluZyBjb250ZXh0LCBhbmQgdGFsa2luZyBwb2ludHMuPC9wPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICBgfVxuICAgICAgPC9kaXY+XG4gICAgPC9kaXY+YDtcbn1cblxuXG5cbmZ1bmN0aW9uIHJlbmRlck1lZXRpbmcoKTogc3RyaW5nIHtcbiAgLy8gQ2hlY2sgaWYgdmlld2luZyBhIHByZXAgZG9jIG9yIGEgY2FsZW5kYXIgZXZlbnQgd2l0aCBubyBsaW5rZWQgbWVldGluZ1xuICBpZiAoc2VsZWN0ZWRDYWxJZCkge1xuICAgIGNvbnN0IGV2ID0gY2FsRXZlbnRzLmZpbmQoZSA9PiBlLmlkID09PSBzZWxlY3RlZENhbElkKTtcbiAgICBpZiAoZXYgJiYgKGFjdGl2ZVRhYiA9PT0gJ3ByZXAnIHx8ICFtZWV0aW5ncy5maW5kKHggPT4geC5pZCA9PT0gc2VsZWN0ZWRJZCkpKSB7XG4gICAgICByZXR1cm4gcmVuZGVyUHJlcFZpZXcoZXYpO1xuICAgIH1cbiAgfVxuICBjb25zdCBtID0gbWVldGluZ3MuZmluZCh4ID0+IHguaWQgPT09IHNlbGVjdGVkSWQpO1xuICBjb25zdCBldiA9IG0gPyBmaW5kTGlua2VkQ2FsRXZlbnQobSkgOiB1bmRlZmluZWQ7XG4gIGNvbnN0IGlzUmVjID0gc2VsZWN0ZWRJZCA9PT0gcmVjb3JkaW5nSWQ7XG4gIGNvbnN0IHRpdGxlID0gbT8udGl0bGUgfHwgJ05ldyBNZWV0aW5nJztcbiAgY29uc3Qgc3RhdHVzID0gbT8uc3RhdHVzIHx8IChpc1JlYyA/ICdyZWNvcmRpbmcnIDogJycpO1xuXG4gIGNvbnN0IGJvZHlIdG1sID0gaXNSZWMgPyBgXG4gICAgPGRpdiBpZD1cIm5vdGVzLWVkaXRvclwiIGNsYXNzPVwibm90ZXMtZWRpdG9yIGlzLWVtcHR5XCIgY29udGVudGVkaXRhYmxlPVwidHJ1ZVwiIHNwZWxsY2hlY2s9XCJ0cnVlXCJcbiAgICAgIGRhdGEtcGxhY2Vob2xkZXI9XCJXcml0ZSB5b3VyIG5vdGVzXFx1MjAyNiYjMTA7JiMxMDtLZXkgZGVjaXNpb25zLCBhY3Rpb24gaXRlbXMsIGNvbnRleHQgXFx1MjAxNCB3aGF0ZXZlciBtYXR0ZXJzIHRvIHlvdS5cIj48L2Rpdj5cbiAgYCA6IHJlbmRlckRldGFpbEJvZHkobSk7XG5cbiAgY29uc3QgaGFzTm90ZXMgPSBtPy5ub3Rlcz8udHJpbSgpO1xuICBjb25zdCBoYXNUcmFuc2NyaXB0ID0gbT8udHJhbnNjcmlwdD8udHJpbSgpO1xuICBjb25zdCBzaG93VGFicyA9ICFpc1JlYyAmJiAoaGFzTm90ZXMgfHwgaGFzVHJhbnNjcmlwdCB8fCBldj8ucHJlcF9zdGF0dXMgPT09ICdyZWFkeScpO1xuXG4gIHJldHVybiBgXG4gICAgPGRpdiBjbGFzcz1cIm1lZXRpbmctbGF5b3V0XCI+XG4gICAgICA8ZGl2IGNsYXNzPVwibWVldGluZy10b3BiYXIgZ2xhc3NcIj5cbiAgICAgICAgPGJ1dHRvbiBjbGFzcz1cImJ0bi1pY29uXCIgaWQ9XCJidG4tYmFja1wiPiR7aWNvbignYmFjaycsIDIwKX08L2J1dHRvbj5cbiAgICAgICAgPGRpdiBjbGFzcz1cIm1lZXRpbmctdG9wYmFyLXRpdGxlXCIgaWQ9XCJtZWV0aW5nLXRpdGxlXCIgY29udGVudGVkaXRhYmxlPVwiJHshaXNSZWN9XCIgc3BlbGxjaGVjaz1cImZhbHNlXCI+JHtlc2ModGl0bGUpfTwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzPVwidG9wYmFyLXJpZ2h0XCI+XG4gICAgICAgICAgJHtpc1JlYyA/IGBcbiAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwicmVjLWluZGljYXRvclwiPiR7aWNvbignbWljJywgMTQpfSA8c3BhbiBpZD1cInJlYy10aW1lclwiPiR7Zm10RHVyKGVsYXBzZWRTZWNvbmRzKX08L3NwYW4+PC9zcGFuPlxuICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cImJ0bi1zdG9wXCIgaWQ9XCJidG4tc3RvcFwiPiR7aWNvbignc3RvcCcsIDE0KX0gU3RvcCBSZWNvcmRpbmc8L2J1dHRvbj5cbiAgICAgICAgICBgIDogYFxuICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJzdGF0dXMtY2hpcCAke3N0YXR1c0NsYXNzKHN0YXR1cyl9XCI+JHtzdGF0dXNMYWJlbChzdGF0dXMpfTwvc3Bhbj5cbiAgICAgICAgICBgfVxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvZGl2PlxuICAgICAgJHtzaG93VGFicyA/IGBcbiAgICAgIDxkaXYgY2xhc3M9XCJtZWV0aW5nLXRhYnNcIj5cbiAgICAgICAgPGRpdiBjbGFzcz1cIm1lZXRpbmctdGFicy1sZWZ0XCI+XG4gICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cIm1lZXRpbmctdGFiJHthY3RpdmVUYWIgPT09ICdub3RlcycgPyAnIGFjdGl2ZScgOiAnJ31cIiBkYXRhLXRhYj1cIm5vdGVzXCI+JHtpY29uKCdub3RlJywgMTQpfSBOb3RlczwvYnV0dG9uPlxuICAgICAgICAgICR7ZXY/LnByZXBfc3RhdHVzID09PSAncmVhZHknID8gYDxidXR0b24gY2xhc3M9XCJtZWV0aW5nLXRhYiR7YWN0aXZlVGFiID09PSAncHJlcCcgPyAnIGFjdGl2ZScgOiAnJ31cIiBkYXRhLXRhYj1cInByZXBcIj4ke2ljb24oJ3NwYXJrbGUnLCAxNCl9IFByZXA8L2J1dHRvbj5gIDogJyd9XG4gICAgICAgICAgJHtoYXNUcmFuc2NyaXB0ID8gYDxidXR0b24gY2xhc3M9XCJtZWV0aW5nLXRhYiR7YWN0aXZlVGFiID09PSAndHJhbnNjcmlwdCcgPyAnIGFjdGl2ZScgOiAnJ31cIiBkYXRhLXRhYj1cInRyYW5zY3JpcHRcIj4ke2ljb24oJ21pYycsIDE0KX0gVHJhbnNjcmlwdDwvYnV0dG9uPmAgOiAnJ31cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJtZWV0aW5nLXRhYnMtcmlnaHRcIj5cbiAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwidGFiLWNvcHktYnRuXCIgaWQ9XCJidG4tY29weS10YWJcIiB0aXRsZT1cIkNvcHkgJHthY3RpdmVUYWJ9XCIgYXJpYS1sYWJlbD1cIkNvcHkgJHthY3RpdmVUYWJ9XCI+JHtpY29uKCdjb3B5JywgMTQpfTwvYnV0dG9uPlxuICAgICAgICAgICR7cmVuZGVyTWVldGluZ01ldGEobSl9XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9kaXY+YCA6ICcnfVxuICAgICAgPGRpdiBjbGFzcz1cIm1lZXRpbmctYm9keVwiPiR7Ym9keUh0bWx9PC9kaXY+XG4gICAgPC9kaXY+YDtcbn1cblxuZnVuY3Rpb24gcmVuZGVyTWVldGluZ01ldGEobTogTWVldGluZyk6IHN0cmluZyB7XG4gIGNvbnN0IHRhZ3MgPSBleHRyYWN0VGFncyhtKTtcbiAgY29uc3QgbGlua2VkID0gZmluZExpbmtlZENhbEV2ZW50KG0pO1xuICBjb25zdCBhdHRlbmRlZXMgPSBsaW5rZWQgPyBwYXJzZUF0dGVuZGVlcyhsaW5rZWQuYXR0ZW5kZWVzKSA6IFtdO1xuICBpZiAoIXRhZ3MubGVuZ3RoICYmICFhdHRlbmRlZXMubGVuZ3RoKSByZXR1cm4gJyc7XG4gIHJldHVybiBgPGRpdiBjbGFzcz1cIm1lZXRpbmctbWV0YVwiPlxuICAgICR7dGFncy5sZW5ndGggPyBgPGRpdiBjbGFzcz1cIm1lZXRpbmctbWV0YS10YWdzXCI+JHt0YWdzLm1hcCh0ID0+IGA8c3BhbiBjbGFzcz1cIm1ldGEtdGFnXCI+JHtlc2ModCl9PC9zcGFuPmApLmpvaW4oJycpfTwvZGl2PmAgOiAnJ31cbiAgICAke2F0dGVuZGVlcy5sZW5ndGggPyBgPGRpdiBjbGFzcz1cIm1lZXRpbmctbWV0YS1wZW9wbGVcIj5cbiAgICAgICR7YXR0ZW5kZWVzLnNsaWNlKDAsOCkubWFwKGEgPT4gYDxzcGFuIGNsYXNzPVwibWV0YS1hdmF0YXJcIiBzdHlsZT1cImJhY2tncm91bmQ6JHthdmF0YXJDb2xvcihhLm5hbWV8fGEuZW1haWwpfVwiIHRpdGxlPVwiJHtlc2MoYS5uYW1lfHxhLmVtYWlsKX1cIj4keyhhLm5hbWV8fGEuZW1haWwpWzBdLnRvVXBwZXJDYXNlKCl9PC9zcGFuPmApLmpvaW4oJycpfVxuICAgICAgJHthdHRlbmRlZXMubGVuZ3RoID4gOCA/IGA8c3BhbiBjbGFzcz1cIm1ldGEtYXZhdGFyLW1vcmVcIj4rJHthdHRlbmRlZXMubGVuZ3RoLTh9PC9zcGFuPmAgOiAnJ31cbiAgICA8L2Rpdj5gIDogJyd9XG4gIDwvZGl2PmA7XG59XG5cbmZ1bmN0aW9uIHJlbmRlckRldGFpbEJvZHkobTogTWVldGluZyB8IHVuZGVmaW5lZCk6IHN0cmluZyB7XG4gIGlmICghbSkgcmV0dXJuICc8cCBzdHlsZT1cInBhZGRpbmc6NDBweDtvcGFjaXR5Oi40XCI+TWVldGluZyBub3QgZm91bmQ8L3A+JztcbiAgaWYgKFsnc3RvcHBpbmcnLCdyZWNvcmRlZCcsJ3RyYW5zY3JpYmluZycsJ3BlbmRpbmcnXS5pbmNsdWRlcyhtLnN0YXR1cykpIHtcbiAgICBjb25zdCBzID0gbS5zdGF0dXM7XG4gICAgY29uc3QgcmVjRG9uZSA9IHMgIT09ICdzdG9wcGluZyc7XG4gICAgY29uc3Qgd29yQWN0aXZlID0gcyA9PT0gJ3JlY29yZGVkJyB8fCBzID09PSAndHJhbnNjcmliaW5nJztcbiAgICBjb25zdCB3b3JEb25lID0gcyA9PT0gJ3BlbmRpbmcnO1xuICAgIGNvbnN0IHN1bUFjdGl2ZSA9IHMgPT09ICdwZW5kaW5nJztcbiAgICByZXR1cm4gYFxuICAgICAgJHttLm5vdGVzID8gYDxkaXYgY2xhc3M9XCJub3Rlcy1lZGl0b3Igbm90ZXMtcmVhZG9ubHlcIj4key88W2Etel1bXFxzXFxTXSo+L2kudGVzdChtLm5vdGVzKSA/IG0ubm90ZXMgOiBmb3JtYXRTdW1tYXJ5KG0ubm90ZXMpfTwvZGl2PmAgOiAnJ31cbiAgICAgIDxkaXYgY2xhc3M9XCJwaXBlbGluZS1wcm9ncmVzc1wiPlxuICAgICAgICA8ZGl2IGNsYXNzPVwicGlwZWxpbmUtc3RlcCAke3JlY0RvbmUgPyAnZG9uZScgOiAnYWN0aXZlJ31cIj48ZGl2IGNsYXNzPVwicGlwZWxpbmUtc3RlcC1kb3RcIj48L2Rpdj48c3Bhbj4ke3JlY0RvbmUgPyAnUmVjb3JkZWQnIDogJ1NhdmluZyBhdWRpb1xcdTIwMjYnfTwvc3Bhbj48L2Rpdj5cbiAgICAgICAgPGRpdiBjbGFzcz1cInBpcGVsaW5lLWNvbm5lY3RvclwiPjwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzPVwicGlwZWxpbmUtc3RlcCAke3dvckRvbmUgPyAnZG9uZScgOiB3b3JBY3RpdmUgPyAnYWN0aXZlJyA6ICcnfVwiPjxkaXYgY2xhc3M9XCJwaXBlbGluZS1zdGVwLWRvdFwiPjwvZGl2PjxzcGFuPlRyYW5zY3JpYmluZzwvc3Bhbj48L2Rpdj5cbiAgICAgICAgPGRpdiBjbGFzcz1cInBpcGVsaW5lLWNvbm5lY3RvclwiPjwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzPVwicGlwZWxpbmUtc3RlcCAke3N1bUFjdGl2ZSA/ICdhY3RpdmUnIDogJyd9XCI+PGRpdiBjbGFzcz1cInBpcGVsaW5lLXN0ZXAtZG90XCI+PC9kaXY+PHNwYW4+U3VtbWFyaXppbmc8L3NwYW4+PC9kaXY+XG4gICAgICA8L2Rpdj5gO1xuICB9XG4gIGlmIChtLnN0YXR1cyA9PT0gJ2ZhaWxlZCcpIHtcbiAgICByZXR1cm4gYDxkaXYgY2xhc3M9XCJwaXBlbGluZS1mYWlsZWQtYmFyIGdsYXNzXCI+XG4gICAgICA8ZGl2IGNsYXNzPVwicGlwZWxpbmUtZmFpbGVkLWlubmVyXCI+XG4gICAgICAgICR7aWNvbignYWxlcnQnLCAxNil9XG4gICAgICAgIDxzcGFuPlByb2Nlc3NpbmcgZGlkbid0IGNvbXBsZXRlPC9zcGFuPlxuICAgICAgICA8YnV0dG9uIGNsYXNzPVwicGlwZWxpbmUtcmV0cnktYnRuXCIgaWQ9XCJidG4tcmV0cnktcGlwZWxpbmVcIj4ke2ljb24oJ3JlZnJlc2gnLCAxMyl9IFJldHJ5PC9idXR0b24+XG4gICAgICA8L2Rpdj5cbiAgICA8L2Rpdj5gO1xuICB9XG4gIGNvbnN0IGhhc1N1bW1hcnkgPSBtLnN1bW1hcnk/LnRyaW0oKTtcblxuICBpZiAoYWN0aXZlVGFiID09PSAnbm90ZXMnKSB7XG4gICAgY29uc3QgaXNIdG1sID0gKHM6IHN0cmluZykgPT4gLzxbYS16XVtcXHNcXFNdKj4vaS50ZXN0KHMpO1xuICAgIGNvbnN0IGZtdCA9IChzOiBzdHJpbmcpID0+IGlzSHRtbChzKSA/IHMgOiBmb3JtYXRTdW1tYXJ5KHMpO1xuICAgIGNvbnN0IGNvbnRlbnQgPSBoYXNTdW1tYXJ5ID8gZm10KG0uc3VtbWFyeSkgOiAnJztcbiAgICByZXR1cm4gYDxkaXYgaWQ9XCJub3Rlcy1lZGl0b3JcIiBjbGFzcz1cIm5vdGVzLWVkaXRvciBub3Rlcy1lZGl0YWJsZSR7IWNvbnRlbnQgPyAnIGlzLWVtcHR5JyA6ICcnfVwiIGNvbnRlbnRlZGl0YWJsZT1cInRydWVcIiBzcGVsbGNoZWNrPVwidHJ1ZVwiIGRhdGEtcGxhY2Vob2xkZXI9XCJBZGQgeW91ciBub3Rlc1xcdTIwMjZcIj4ke2NvbnRlbnR9PC9kaXY+YDtcbiAgfVxuXG5cbiAgaWYgKGFjdGl2ZVRhYiA9PT0gJ3ByZXAnKSB7XG4gICAgY29uc3QgZXYgPSBmaW5kTGlua2VkQ2FsRXZlbnQobSk7XG4gICAgY29uc3QgcHJlcERvYyA9IGV2Py5wcmVwX2RvYyB8fCAnJztcbiAgICBpZiAocHJlcERvYykge1xuICAgICAgcmV0dXJuIGA8ZGl2IGlkPVwibm90ZXMtZWRpdG9yXCIgY2xhc3M9XCJub3Rlcy1lZGl0b3Igbm90ZXMtZWRpdGFibGVcIiBjb250ZW50ZWRpdGFibGU9XCJ0cnVlXCIgc3BlbGxjaGVjaz1cInRydWVcIj4ke2Zvcm1hdFN1bW1hcnkocHJlcERvYyl9PC9kaXY+YDtcbiAgICB9XG4gICAgcmV0dXJuICc8cCBzdHlsZT1cInBhZGRpbmc6NDBweDtvcGFjaXR5Oi40XCI+Tm8gcHJlcCBhdmFpbGFibGUgeWV0PC9wPic7XG4gIH1cbiAgaWYgKGFjdGl2ZVRhYiA9PT0gJ3RyYW5zY3JpcHQnICYmIG0udHJhbnNjcmlwdCkge1xuICAgIHJldHVybiBgPGRpdiBpZD1cIm5vdGVzLWVkaXRvclwiIGNsYXNzPVwibm90ZXMtZWRpdG9yIG5vdGVzLWVkaXRhYmxlXCIgY29udGVudGVkaXRhYmxlPVwiZmFsc2VcIiBzcGVsbGNoZWNrPVwiZmFsc2VcIj4ke2Zvcm1hdFN1bW1hcnkobS50cmFuc2NyaXB0KX08L2Rpdj5gO1xuICB9XG4gIC8vIEZhbGxiYWNrIHRvIG5vdGVzXG4gIHJldHVybiBgPGRpdiBpZD1cIm5vdGVzLWVkaXRvclwiIGNsYXNzPVwibm90ZXMtZWRpdG9yIG5vdGVzLWVkaXRhYmxlIGlzLWVtcHR5XCJcbiAgICAgIGNvbnRlbnRlZGl0YWJsZT1cInRydWVcIiBzcGVsbGNoZWNrPVwidHJ1ZVwiIGRhdGEtcGxhY2Vob2xkZXI9XCJBZGQgeW91ciBub3Rlc1xcdTIwMjZcIj48L2Rpdj5gO1xufVxuXG4vLyBDb3B5IHRoZSBhY3RpdmUgdGFiIChub3RlcyAvIHByZXAgLyB0cmFuc2NyaXB0KSBhcyBwbGFpbiB0ZXh0LlxuYXN5bmMgZnVuY3Rpb24gY29weUFjdGl2ZVRhYigpOiBQcm9taXNlPHZvaWQ+IHtcbiAgY29uc3QgYnRuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2J0bi1jb3B5LXRhYicpO1xuICBjb25zdCBlZGl0b3IgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbm90ZXMtZWRpdG9yJyk7XG4gIGNvbnN0IHRleHQgPSAoZWRpdG9yPy5pbm5lclRleHQgfHwgJycpLnRyaW0oKTtcbiAgaWYgKCFidG4pIHJldHVybjtcbiAgaWYgKCF0ZXh0KSB7IHNob3dUb2FzdCgnaW5mbycsICdOb3RoaW5nIHRvIGNvcHknKTsgcmV0dXJuOyB9XG4gIHRyeSB7XG4gICAgYXdhaXQgbmF2aWdhdG9yLmNsaXBib2FyZC53cml0ZVRleHQodGV4dCk7XG4gICAgYnRuLmlubmVySFRNTCA9IGljb24oJ2NoZWNrJywgMTQpO1xuICAgIGJ0bi5jbGFzc0xpc3QuYWRkKCdpcy1jb3BpZWQnKTtcbiAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIGJ0bi5pbm5lckhUTUwgPSBpY29uKCdjb3B5JywgMTQpO1xuICAgICAgYnRuLmNsYXNzTGlzdC5yZW1vdmUoJ2lzLWNvcGllZCcpO1xuICAgIH0sIDE2MDApO1xuICB9IGNhdGNoIHtcbiAgICBzaG93VG9hc3QoJ2Vycm9yJywgJ0NvcHkgZmFpbGVkIFxcdTIwMTQgY2xpcGJvYXJkIHVuYXZhaWxhYmxlJyk7XG4gIH1cbn1cblxuZnVuY3Rpb24gYXR0YWNoTGlzdGVuZXJzKCk6IHZvaWQge1xuICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYnRuLWNvcHktdGFiJyk/LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4geyB2b2lkIGNvcHlBY3RpdmVUYWIoKTsgfSk7XG4gIC8vIFRhYiBzd2l0Y2hpbmdcbiAgZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLm1lZXRpbmctdGFiJykuZm9yRWFjaChidG4gPT4ge1xuICAgIGJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcbiAgICAgIGZsdXNoU2F2ZSgpO1xuICAgICAgYWN0aXZlVGFiID0gKGJ0biBhcyBIVE1MRWxlbWVudCkuZGF0YXNldC50YWIgYXMgYW55IHx8ICdub3Rlcyc7XG4gICAgICBsb2FkQWxsKCk7XG4gICAgfSk7XG4gIH0pO1xuICAvLyBQZXJtIG1vZGFsXG4gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdidG4tb3Blbi1zZXR0aW5ncycpPy5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcbiAgICBmZXRjaCgnL2FwaS9zaGVsbCcsIHttZXRob2Q6J1BPU1QnLCBoZWFkZXJzOnsnQ29udGVudC1UeXBlJzonYXBwbGljYXRpb24vanNvbid9LFxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe2NvbW1hbmQ6XCJvcGVuICd4LWFwcGxlLnN5c3RlbXByZWZlcmVuY2VzOmNvbS5hcHBsZS5wcmVmZXJlbmNlLnNlY3VyaXR5P1ByaXZhY3lfU2NyZWVuQ2FwdHVyZSdcIn0pXG4gICAgfSkuY2F0Y2goKCk9Pnt9KTtcbiAgfSk7XG4gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdidG4tcmV0cnktcGVybScpPy5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGFzeW5jICgpID0+IHtcbiAgICBzaG93UGVybU1vZGFsID0gZmFsc2U7XG4gICAgY29uc3Qgb2sgPSBhd2FpdCBjaGVja1Blcm0oKTtcbiAgICBpZiAoIW9rKSB7IHNob3dQZXJtTW9kYWwgPSB0cnVlOyByZW5kZXIoKTsgcmV0dXJuOyB9XG4gICAgc3RhcnRSZWNvcmRpbmcoKTtcbiAgfSk7XG5cbiAgLy8gSG9tZVxuICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYnRuLW5ldy1yZWMnKT8uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiBzdGFydFJlY29yZGluZygpKTtcbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2J0bi1hdWRpby1kZXZpY2UnKT8uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoZSkgPT4ge1xuICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgc2hvd0F1ZGlvTWVudSA9ICFzaG93QXVkaW9NZW51O1xuICAgIHJlbmRlcigpO1xuICB9KTtcbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2J0bi1yZWZyZXNoLWRldmljZXMnKT8uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoZSkgPT4ge1xuICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgcmVmcmVzaEF1ZGlvRGV2aWNlcygpO1xuICB9KTtcbiAgZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLmF1ZGlvLWRldmljZS1vcHRpb24nKS5mb3JFYWNoKGVsID0+IHtcbiAgICBlbC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChlKSA9PiB7XG4gICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgY29uc3QgaWR4ID0gcGFyc2VJbnQoKGVsIGFzIEhUTUxFbGVtZW50KS5kYXRhc2V0LmRldklkeCB8fCAnLTEnKTtcbiAgICAgIGNvbnN0IG5hbWUgPSAoZWwgYXMgSFRNTEVsZW1lbnQpLmRhdGFzZXQuZGV2TmFtZSB8fCAnJztcbiAgICAgIHNlbGVjdEF1ZGlvRGV2aWNlKGlkeCwgbmFtZSk7XG4gICAgfSk7XG4gIH0pO1xuICAvLyBDbG9zZSBhdWRpbyBtZW51IG9uIG91dHNpZGUgY2xpY2tcbiAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7IGlmIChzaG93QXVkaW9NZW51KSB7IHNob3dBdWRpb01lbnUgPSBmYWxzZTsgcmVuZGVyKCk7IH0gfSk7XG4gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdidG4tdG9nZ2xlLWJnJyk/LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4gdG9nZ2xlQmdIZXJvKCkpO1xuICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYnRuLXJlZnJlc2gtYmcnKT8uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBhc3luYyAoKSA9PiB7XG4gICAgYXdhaXQgcnVuSm9iKEJHX0pPQikuY2F0Y2goKCkgPT4ge30pO1xuICAgIGF3YWl0IHNsZWVwKDIwMDApO1xuICAgIGF3YWl0IGxvYWRBbGwoKTtcbiAgfSk7XG4gIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ1tkYXRhLWNhbC1pZF0nKS5mb3JFYWNoKGJ0biA9PiB7XG4gICAgYnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGUpID0+IHsgZS5zdG9wUHJvcGFnYXRpb24oKTsgc3RhcnRSZWNvcmRpbmcoKGJ0biBhcyBIVE1MRWxlbWVudCkuZGF0YXNldC5jYWxJZCEpOyB9KTtcbiAgfSk7XG4gIC8vIFByZXAgYnV0dG9uc1xuICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCdbZGF0YS1jYWwtcHJlcC10cmlnZ2VyXScpLmZvckVhY2goYnRuID0+IHtcbiAgICBidG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoZSkgPT4geyBlLnN0b3BQcm9wYWdhdGlvbigpOyB0cmlnZ2VyUHJlcCgoYnRuIGFzIEhUTUxFbGVtZW50KS5kYXRhc2V0LmNhbFByZXBUcmlnZ2VyISk7IH0pO1xuICB9KTtcbiAgZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnW2RhdGEtY2FsLXByZXBdJykuZm9yRWFjaChidG4gPT4ge1xuICAgIGJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChlKSA9PiB7XG4gICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgc2VsZWN0ZWRDYWxJZCA9IChidG4gYXMgSFRNTEVsZW1lbnQpLmRhdGFzZXQuY2FsUHJlcCE7XG4gICAgICB2aWV3ID0gJ21lZXRpbmcnOyBhY3RpdmVUYWIgPSAncHJlcCc7XG4gICAgICByZW5kZXIoKTtcbiAgICB9KTtcbiAgfSk7XG4gIFxuICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCdbZGF0YS1wYWdlXScpLmZvckVhY2goYiA9PiBiLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4geyBtYWluUGFnZSA9IChiIGFzIEhUTUxFbGVtZW50KS5kYXRhc2V0LnBhZ2UgYXMgJ21lZXRpbmdzJyB8ICdub3Rlcyc7IHJlbmRlcigpOyB9KSk7XG5cbiAgZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnW2RhdGEtY2Fsdmlld10nKS5mb3JFYWNoKGIgPT4gYi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHsgY2FsVmlldyA9IChiIGFzIEhUTUxFbGVtZW50KS5kYXRhc2V0LmNhbHZpZXcgYXMgYW55OyByZW5kZXIoKTsgfSkpO1xuXG5cbiAgZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnW2RhdGEtZmlsdGVyXScpLmZvckVhY2goYnRuID0+IHtcbiAgICBidG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7IGFjdGl2ZUZpbHRlciA9IChidG4gYXMgSFRNTEVsZW1lbnQpLmRhdGFzZXQuZmlsdGVyIGFzIEZpbHRlcjsgcmVuZGVyKCk7IH0pO1xuICB9KTtcbiAgLy8gVG9waWMgZHJvcGRvd24gdG9nZ2xlXG4gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdidG4tdG9waWMtc2VsZWN0Jyk/LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGUpID0+IHtcbiAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdkcm9wZG93bi10b3BpY3MnKT8uY2xhc3NMaXN0LnRvZ2dsZSgnb3BlbicpO1xuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdkcm9wZG93bi1wZW9wbGUnKT8uY2xhc3NMaXN0LnJlbW92ZSgnb3BlbicpO1xuICB9KTtcbiAgLy8gUGVvcGxlIGRyb3Bkb3duIHRvZ2dsZVxuICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYnRuLXBlb3BsZS1zZWxlY3QnKT8uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoZSkgPT4ge1xuICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2Ryb3Bkb3duLXBlb3BsZScpPy5jbGFzc0xpc3QudG9nZ2xlKCdvcGVuJyk7XG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2Ryb3Bkb3duLXRvcGljcycpPy5jbGFzc0xpc3QucmVtb3ZlKCdvcGVuJyk7XG4gIH0pO1xuICAvLyBUb3BpYyBjaGVja2JveCBjaGFuZ2VzXG4gIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ1tkYXRhLXRhZ10nKS5mb3JFYWNoKGNiID0+IHtcbiAgICBjYi5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCAoKSA9PiB7XG4gICAgICBjb25zdCB0ID0gKGNiIGFzIEhUTUxJbnB1dEVsZW1lbnQpLmRhdGFzZXQudGFnITtcbiAgICAgIGlmICgoY2IgYXMgSFRNTElucHV0RWxlbWVudCkuY2hlY2tlZCkgeyBpZiAoIWFjdGl2ZVRhZ3MuaW5jbHVkZXModCkpIGFjdGl2ZVRhZ3MucHVzaCh0KTsgfVxuICAgICAgZWxzZSB7IGFjdGl2ZVRhZ3MgPSBhY3RpdmVUYWdzLmZpbHRlcih4ID0+IHggIT09IHQpOyB9XG4gICAgICByZW5kZXIoKTtcbiAgICB9KTtcbiAgfSk7XG4gIC8vIFBlb3BsZSBjaGVja2JveCBjaGFuZ2VzXG4gIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ1tkYXRhLXBlcnNvbl0nKS5mb3JFYWNoKGNiID0+IHtcbiAgICBjYi5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCAoKSA9PiB7XG4gICAgICBjb25zdCBwID0gKGNiIGFzIEhUTUxJbnB1dEVsZW1lbnQpLmRhdGFzZXQucGVyc29uITtcbiAgICAgIGlmICgoY2IgYXMgSFRNTElucHV0RWxlbWVudCkuY2hlY2tlZCkgeyBpZiAoIWFjdGl2ZVBlb3BsZS5pbmNsdWRlcyhwKSkgYWN0aXZlUGVvcGxlLnB1c2gocCk7IH1cbiAgICAgIGVsc2UgeyBhY3RpdmVQZW9wbGUgPSBhY3RpdmVQZW9wbGUuZmlsdGVyKHggPT4geCAhPT0gcCk7IH1cbiAgICAgIHJlbmRlcigpO1xuICAgIH0pO1xuICB9KTtcbiAgLy8gQ2xlYXIgYnV0dG9uc1xuICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2xlYXItdG9waWNzJyk/LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4geyBhY3RpdmVUYWdzID0gW107IHJlbmRlcigpOyB9KTtcbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NsZWFyLXBlb3BsZScpPy5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHsgYWN0aXZlUGVvcGxlID0gW107IHJlbmRlcigpOyB9KTtcbiAgLy8gQ2xvc2UgZHJvcGRvd25zIG9uIG91dHNpZGUgY2xpY2tcbiAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG4gICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLmZpbHRlci1kcm9wZG93bi5vcGVuJykuZm9yRWFjaChkID0+IGQuY2xhc3NMaXN0LnJlbW92ZSgnb3BlbicpKTtcbiAgfSwgeyBvbmNlOiB0cnVlIH0pO1xuICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcubWVldGluZy1jYXJkJykuZm9yRWFjaChjYXJkID0+IHtcbiAgICBjYXJkLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgIGlmICgoZS50YXJnZXQgYXMgSFRNTEVsZW1lbnQpLmNsb3Nlc3QoJy5kZWxldGUtYnRuLCAuYnRuLWljb24nKSkgcmV0dXJuO1xuICAgICAgb3Blbk1lZXRpbmcoKGNhcmQgYXMgSFRNTEVsZW1lbnQpLmRhdGFzZXQubWVldGluZ0lkISk7XG4gICAgfSk7XG4gIH0pO1xuICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcuY2FyZC1kZWwnKS5mb3JFYWNoKGJ0biA9PiB7XG4gICAgYnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGUpID0+IGRlbGV0ZU1lZXRpbmcoKGJ0biBhcyBIVE1MRWxlbWVudCkuZGF0YXNldC5pZCEsIGUpKTtcbiAgfSk7XG5cbiAgLy8gTWVldGluZ1xuICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYnRuLWJhY2snKT8uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7IGZsdXNoU2F2ZSgpOyB2aWV3ID0gJ2hvbWUnOyBsb2FkQWxsKCk7IH0pO1xuICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYnRuLXN0b3AnKT8uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiBzdG9wUmVjb3JkaW5nKCkpO1xuICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWVldGluZy10aXRsZScpPy5hZGRFdmVudExpc3RlbmVyKCdibHVyJywgYXN5bmMgKGUpID0+IHtcbiAgICBjb25zdCBlbCA9IGUudGFyZ2V0IGFzIEhUTUxFbGVtZW50O1xuICAgIGlmIChzZWxlY3RlZElkICYmIGVsLnRleHRDb250ZW50Py50cmltKCkpIHtcbiAgICAgIGF3YWl0IHcoXCJVUERBVEUgbWVldGluZ3MgU0VUIHRpdGxlPT8sIHVwZGF0ZWRfYXQ9c3RyZnRpbWUoJyVzJywnbm93JykgV0hFUkUgaWQ9P1wiLCBbZWwudGV4dENvbnRlbnQudHJpbSgpLCBzZWxlY3RlZElkXSk7XG4gICAgfVxuICB9KTtcbiAgY29uc3QgZWRpdG9yID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ25vdGVzLWVkaXRvcicpO1xuICBlZGl0b3I/LmFkZEV2ZW50TGlzdGVuZXIoJ2lucHV0JywgKCkgPT4ge1xuICAgIGVkaXRvci5jbGFzc0xpc3QudG9nZ2xlKCdpcy1lbXB0eScsICFlZGl0b3IuaW5uZXJUZXh0LnRyaW0oKSk7XG4gICAgYXV0b1NhdmUoKTtcbiAgfSk7XG4gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdidG4tcmV0cnktcGlwZWxpbmUnKT8uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG4gICAgaWYgKHNlbGVjdGVkSWQpIHsgcnVuSm9iKFdISVNQRVJfSk9CKS5jYXRjaCgoKT0+e30pOyBzdGFydFBvbGwoc2VsZWN0ZWRJZCk7IH1cbiAgfSk7XG59XG5cbi8vIEV4cG9zZSBmdW5jdGlvbnMgY2FsbGVkIHZpYSBpbmxpbmUgb25jbGljayBpbiBIVE1MIHRlbXBsYXRlc1xuKHdpbmRvdyBhcyBhbnkpLnNoaWZ0V2VlayA9IGFzeW5jIChkaXI6IG51bWJlcikgPT4ge1xuICBjYWxXZWVrT2Zmc2V0ICs9IGRpcjtcbiAgY29uc3QgdG9kYXkgPSBuZXcgRGF0ZSgpO1xuICBjb25zdCB0b2RheVN0ciA9IGxvY2FsRGF0ZVN0cih0b2RheSk7XG4gIGNvbnN0IHdlZWtTdGFydCA9IG5ldyBEYXRlKHRvZGF5KTtcbiAgd2Vla1N0YXJ0LnNldERhdGUodG9kYXkuZ2V0RGF0ZSgpIC0gdG9kYXkuZ2V0RGF5KCkgKyAoY2FsV2Vla09mZnNldCAqIDcpKTtcbiAgY29uc3QgaW5kaWNlcyA9IChjYWxXZWVrT2Zmc2V0ID09PSAwICYmICh0b2RheS5nZXREYXkoKSA9PT0gMCB8fCB0b2RheS5nZXREYXkoKSA9PT0gNikpID8gWzAsMSwyLDMsNCw1LDZdIDogWzEsMiwzLDQsNV07XG4gIGNvbnN0IGRheXMgPSBpbmRpY2VzLm1hcChpID0+IHsgY29uc3QgZCA9IG5ldyBEYXRlKHdlZWtTdGFydCk7IGQuc2V0RGF0ZSh3ZWVrU3RhcnQuZ2V0RGF0ZSgpICsgaSk7IHJldHVybiBsb2NhbERhdGVTdHIoZCk7IH0pO1xuICBjYWxWaWV3ID0gZGF5cy5pbmNsdWRlcyh0b2RheVN0cikgPyB0b2RheVN0ciA6IGRheXNbMF07XG4gIHJlbmRlcigpO1xuICAvLyBGZXRjaCBjYWxlbmRhciBldmVudHMgZm9yIHRoaXMgd2VlayB0aGVuIHJlLXJlbmRlciB3aXRoIGZyZXNoIGRhdGFcbiAgcnVuSm9iKENBTEVOREFSX0pPQikuY2F0Y2goKCkgPT4ge30pO1xuICBhd2FpdCBzbGVlcCgzMDAwKTtcbiAgYXdhaXQgbG9hZEFsbCgpO1xufTtcbih3aW5kb3cgYXMgYW55KS5vcGVuTWVldGluZyAgID0gb3Blbk1lZXRpbmc7XG4od2luZG93IGFzIGFueSkuc2hvd01vbnRoRGF5ICA9IHNob3dNb250aERheTtcbih3aW5kb3cgYXMgYW55KS50cmlnZ2VyUHJlcCAgID0gdHJpZ2dlclByZXA7XG4od2luZG93IGFzIGFueSkudmlld1ByZXAgICAgICA9IGFzeW5jIChpZDogc3RyaW5nKSA9PiB7XG4gIHNlbGVjdGVkQ2FsSWQgPSBpZDsgdmlldyA9ICdtZWV0aW5nJzsgYWN0aXZlVGFiID0gJ3ByZXAnO1xuICBpZiAoIXByZXBTdGFydFRpbWUpIHByZXBTdGFydFRpbWUgPSBEYXRlLm5vdygpO1xuICByZW5kZXIoKTsgLy8gc2hvdyBpbW1lZGlhdGVseSB3aXRoIGNhY2hlZCBkYXRhXG4gIGF3YWl0IGxvYWRBbGwoKTsgLy8gcmVmcmVzaCBmcm9tIERCIFx1MjAxNCBwaWNrcyB1cCBjb21wbGV0ZWQgcHJlcHMgaW5zdGFudGx5XG4gIGZldGNoUHJlcExvZ3MoKTtcbiAgaWYgKCFwcmVwUG9sbEludGVydmFsKSB7IHN0YXJ0UHJlcFBvbGwoaWQpOyB9XG59O1xuKHdpbmRvdyBhcyBhbnkpLnN0YXJ0UmVjb3JkaW5nID0gc3RhcnRSZWNvcmRpbmc7XG5cbi8vIEluaXRcbihhc3luYyAoKSA9PiB7XG4gIGNhbFZpZXcgPSBsb2NhbERhdGVTdHIobmV3IERhdGUoKSk7IC8vIGRlZmF1bHQgdG8gdG9kYXlcbiAgYXdhaXQgbG9hZEFsbCgpOyAvLyBzaG93IGNhY2hlZCBldmVudHMgaW1tZWRpYXRlbHkgaWYgd2UgaGF2ZSB0aGVtXG4gIGF3YWl0IHJ1bkpvYihDQUxFTkRBUl9KT0IpLmNhdGNoKCgpID0+IHt9KTtcbiAgYXdhaXQgcnVuSm9iKEJHX0pPQikuY2F0Y2goKCkgPT4ge30pO1xuICBhd2FpdCBzbGVlcCgxNTAwKTtcbiAgYXdhaXQgbG9hZEFsbCgpOyAvLyByZWZyZXNoIGFmdGVyIHRoZSBzeW5jIGpvYiBmaW5pc2hlc1xuICBhd2FpdCByZWNvdmVyUmVjb3JkaW5nU3RhdGUoKTtcbiAgYXdhaXQgcmVjb3ZlclN0dWNrUHJlcHMoKTtcbiAgZGV0ZWN0TGl2ZUxvY2F0aW9uKCkuY2F0Y2goKCkgPT4ge30pO1xuICAvLyBMaXZlIHVwZGF0ZXM6IHJlZnJlc2ggd2hlbmV2ZXIgYW55IHBpcGVsaW5lIGpvYiB3cml0ZXMgdG8gdGhlIGRhdGFiYXNlXG4gIHN1YnNjcmliZUpvYkV2ZW50cyh7XG4gICAgam9iSWRzOiBbQ0FMRU5EQVJfSk9CLCBSRUNPUkRFUl9KT0IsIFNUT1BfSk9CLCBXSElTUEVSX0pPQiwgU1VNTUFSSVpFUl9KT0IsIFBSRVBfSk9CLCBCR19KT0JdLFxuICAgIG9uRGJDaGFuZ2VkOiAoKSA9PiB7IGxvYWRBbGwoKS5jYXRjaCgoKSA9PiB7fSk7IH0sXG4gICAgb25TdGF0dXNDaGFuZ2VkOiAoKSA9PiB7IGxvYWRBbGwoKS5jYXRjaCgoKSA9PiB7fSk7IH1cbiAgfSk7XG59KSgpO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUVBLFNBQVMsMEJBQTBCO0FBRW5DLElBQU0sU0FBUztBQUNmLElBQU0sWUFBWTtBQUNsQixJQUFNLGVBQWtCO0FBQ3hCLElBQU0sV0FBa0I7QUFDeEIsSUFBTSxjQUFrQjtBQUN4QixJQUFNLGlCQUFrQjtBQUN4QixJQUFNLFdBQWtCO0FBQ3hCLElBQU0sZUFBa0I7QUFDeEIsSUFBTSxXQUFrQjtBQUN4QixJQUFNLFNBQWtCO0FBQ3hCLElBQU0sb0JBQW9CO0FBcUIxQixJQUFJLE9BQWE7QUFDakIsSUFBSSxXQUFzQixDQUFDO0FBQzNCLElBQUksWUFBd0IsQ0FBQztBQUM3QixJQUFJLEtBQWdDO0FBQ3BDLElBQUksV0FBVztBQUNmLElBQUkscUJBQXFCO0FBQ3pCLElBQUksYUFBNEI7QUFDaEMsSUFBSSxjQUFjO0FBQ2xCLElBQUksY0FBNkI7QUFDakMsSUFBSSxvQkFBb0M7QUFDeEMsSUFBSSxnQkFBZ0I7QUFDcEIsSUFBSSxpQkFBaUI7QUFDckIsSUFBSSxnQkFBdUQ7QUFDM0QsSUFBSSxlQUFzRDtB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
