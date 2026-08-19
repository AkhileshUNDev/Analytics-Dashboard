// ══════════════════════════════════════════════════════════════
//  UTIL — XSS-safe escaping, formatting helpers
// ══════════════════════════════════════════════════════════════
function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
}

function titleCase(key) {
  if (key == null) return '';
  return String(key)
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(w => w.length ? w[0].toUpperCase() + w.slice(1) : w)
    .join(' ');
}

function fmtMoney(n) {
  if (n == null || isNaN(n)) return '—';
  return Math.round(Number(n)).toLocaleString('en-US');
}

function fmtNum(n) {
  if (n == null || isNaN(n)) return '—';
  const num = Number(n);
  return Number.isInteger(num) ? String(num) : num.toFixed(2);
}

function parseSessionTime(str) {
  if (!str) return null;
  const parts = str.split('-'); if (parts.length < 2) return null;
  const d = parts[0].split('.').map(Number), t = parts[1].split('.').map(Number);
  if (d.length < 3 || t.length < 3) return null;
  return new Date(d[0], d[1] - 1, d[2], t[0], t[1], t[2]);
}

function formatDuration(ms) {
  if (ms == null || isNaN(ms) || ms < 0) return '-';
  const total = Math.round(ms / 1000), m = Math.floor(total / 60), s = total % 60;
  return m > 0 ? (m + 'm ' + s + 's') : (s + 's');
}

function emptyState(msg) {
  return `<div class="empty-state"><div class="es-icon">∅</div><div class="es-text">${escapeHtml(msg)}</div></div>`;
}

function kvItem(label, val, wide) {
  return `<div class="kv-item${wide ? ' kv-item-wide' : ''}"><div class="kv-label">${escapeHtml(label)}</div><div class="kv-value">${escapeHtml(String(val))}</div></div>`;
}

// Compact, single-line rendering of the app's "YYYY.MM.DD-HH.MM.SS" timestamps
// (e.g. "2026.08.18-11.28.07" → "Aug 18 · 11:28:07") — used everywhere a raw
// session timestamp would otherwise be shown, so it never wraps to two lines.
function formatSessionTimestamp(str) {
  if (!str) return '—';
  const d = parseSessionTime(str);
  if (!d) return str;
  try {
    const datePart = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const timePart = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    return `${datePart} · ${timePart}`;
  } catch (e) {
    return str;
  }
}

// ── Generic dynamic-field renderer (handles fields not known in advance) ──
function formatDynVal(v) {
  if (v === null || v === undefined || v === '') return '<span class="kv-value mini">—</span>';
  if (typeof v === 'boolean') return `<span class="badge ${v ? 'badge-yes' : 'badge-no'}">${v ? 'Yes' : 'No'}</span>`;
  if (typeof v === 'number') return `<span class="kv-value">${fmtNum(v)}</span>`;
  if (Array.isArray(v)) {
    if (!v.length) return '<span class="kv-value mini">—</span>';
    return '<div class="chip-list">' + v.map(x => `<span class="chip">${escapeHtml(String(x))}</span>`).join('') + '</div>';
  }
  if (typeof v === 'object') return renderDynObject(v);
  return `<span class="kv-value mini">${escapeHtml(String(v))}</span>`;
}

function renderDynObject(obj) {
  const entries = Object.entries(obj || {});
  if (!entries.length) return '<span class="kv-value mini">—</span>';
  return `<div class="dyn-object">` + entries.map(([k, v]) =>
    `<div style="margin-bottom:.3rem"><div class="kv-label">${escapeHtml(titleCase(k))}</div>${formatDynVal(v)}</div>`
  ).join('') + `</div>`;
}

function renderKVGrid(obj, labelMap, wideKeys) {
  labelMap = labelMap || {};
  wideKeys = wideKeys || [];
  const keys = Object.keys(obj || {});
  if (!keys.length) return '';
  return '<div class="kv-grid">' + keys.map(k => {
    const label = labelMap[k] || titleCase(k);
    const wide = wideKeys.includes(k) ? ' kv-item-wide' : '';
    return `<div class="kv-item${wide}"><div class="kv-label">${escapeHtml(label)}</div>${formatDynVal(obj[k])}</div>`;
  }).join('') + '</div>';
}

function renderFilterUsage(fu) {
  if (!fu || !Object.keys(fu).length) return emptyState('No filter usage recorded.');
  const known = ['PriceRange', 'SurfaceRange', 'FloorRange', 'SelectedRooms', 'SelectedBuildings', 'SelectedStatus', 'FilteredApartmentCount'];
  let items = '';
  if (fu.PriceRange && typeof fu.PriceRange === 'object') items += kvItem('Price', fmtMoney(fu.PriceRange.Min) + ' → ' + fmtMoney(fu.PriceRange.Max), true);
  if (fu.SurfaceRange && typeof fu.SurfaceRange === 'object') items += kvItem('Surface (m²)', fmtNum(fu.SurfaceRange.Min) + ' → ' + fmtNum(fu.SurfaceRange.Max));
  if (fu.FloorRange && typeof fu.FloorRange === 'object') items += kvItem('Floor', fmtNum(fu.FloorRange.Min) + ' → ' + fmtNum(fu.FloorRange.Max));
  if (fu.SelectedRooms) items += `<div class="kv-item"><div class="kv-label">Rooms</div>${formatDynVal(fu.SelectedRooms)}</div>`;
  if (fu.SelectedBuildings) items += `<div class="kv-item"><div class="kv-label">Buildings</div>${formatDynVal(fu.SelectedBuildings)}</div>`;
  if (fu.SelectedStatus) items += `<div class="kv-item"><div class="kv-label">Status</div>${formatDynVal(fu.SelectedStatus)}</div>`;
  if (fu.FilteredApartmentCount != null) items += kvItem('Filtered Apartments', fu.FilteredApartmentCount);
  let html = items ? `<div class="kv-grid">${items}</div>` : '';
  const extraKeys = Object.keys(fu).filter(k => !known.includes(k));
  if (extraKeys.length) {
    const extraObj = {}; extraKeys.forEach(k => extraObj[k] = fu[k]);
    html += renderKVGrid(extraObj);
  }
  return html || emptyState('No filter usage recorded.');
}

function renderFavoritedUnits(favUnits, apartmentAnalytics, registry) {
  if (!favUnits || !favUnits.length) return emptyState('No favorited units.');
  return '<div class="mini-card-grid">' + favUnits.map(unitId => {
    const data = apartmentAnalytics && apartmentAnalytics[unitId];
    const reg = registry && registry[unitId];
    return `<div class="mini-card">
      <div class="mini-card-title">
        <span>${escapeHtml(unitId)}</span>
        <span class="mini-card-badges"><span class="badge badge-yellow">Favorite</span></span>
      </div>
      <div class="mini-card-sub">${reg ? escapeHtml(reg.Building || '-') + ' · ' + escapeHtml(reg.Status || '-') : 'Not found in registry'}</div>
      <div class="mini-card-stats">
        ${data ? `<span>Views ${data.ViewCount || 0}</span><span>${(data.TimeSpentInSeconds || 0).toFixed(2)}s</span>` : ''}
        ${reg ? `<span>${reg.TotalFavorites || 0} total favorites</span>` : ''}
      </div>
    </div>`;
  }).join('') + '</div>';
}

function renderApartmentAnalyticsCards(aa, registry, favoritedUnits) {
  const entries = Object.entries(aa || {});
  if (!entries.length) return emptyState('No apartment interactions recorded.');
  const favSet = new Set(favoritedUnits || []);
  return '<div class="mini-card-grid">' + entries.map(([unitId, data]) => {
    const reg = registry && registry[unitId];
    const isFav = favSet.has(unitId);
    return `<div class="mini-card">
      <div class="mini-card-title">
        <span>${escapeHtml(unitId)}</span>
        <span class="mini-card-badges">
          ${isFav ? '<span class="badge badge-yellow">Favorite</span>' : ''}
          ${data.PdfOpened ? '<span class="badge badge-yes">PDF</span>' : ''}
        </span>
      </div>
      <div class="mini-card-sub">${reg ? escapeHtml(reg.Building || '-') + ' · ' + escapeHtml(reg.Status || '-') : 'Not found in registry'}</div>
      <div class="mini-card-stats">
        <span>Views ${data.ViewCount || 0}</span>
        <span>${(data.TimeSpentInSeconds || 0).toFixed(2)}s</span>
        <span>Balcony ${data.BalconyViewCount || 0}</span>
        <span>Floor Cut ${data.FloorCutViewCount || 0}</span>
      </div>
    </div>`;
  }).join('') + '</div>';
}

const WEATHER_ICONS = { Rain: '🌧️', Snow: '❄️', Cloudy: '☁️', Clear: '☀️', 'Clear Skies': '☀️', Storm: '⛈️', Fog: '🌫️', Windy: '💨' };
const TIME_OF_DAY_ICONS = { Morning: '🌤️', Noon: '☀️', Evening: '🌆', Sunset: '🌇', Sunrise: '🌅', Midnight: '🌙', Night: '🌃', Golden: '🌇' };
function withIcon(map, val) { return val && map[val] ? `${map[val]} ${val}` : val; }

function renderEnvironmentDetail(env) {
  env = env || {};
  let html = sectionTitle('Environment');
  html += '<div class="env-section-title">Last Known State</div>';
  html += renderKVGrid({
    LastClockTime: env.LastClockTime,
    LastDate: env.LastDate,
    LastTimeOfDay: withIcon(TIME_OF_DAY_ICONS, env.LastTimeOfDay),
    LastWeather: withIcon(WEATHER_ICONS, env.LastWeather)
  }, { LastClockTime: 'Clock', LastDate: 'Date', LastTimeOfDay: 'Time of Day', LastWeather: 'Weather' }, ['LastDate']) || emptyState('No last-state data recorded.');
  html += chipCountsSection('Time of Day Selections', env.TimeOfDaySelectionCounts, TIME_OF_DAY_ICONS);
  html += chipCountsSection('Weather Selections', env.WeatherSelectionCounts, WEATHER_ICONS);
  const known = ['LastClockTime', 'LastDate', 'LastTimeOfDay', 'LastWeather', 'TimeOfDaySelectionCounts', 'WeatherSelectionCounts'];
  const extra = Object.keys(env).filter(k => !known.includes(k));
  if (extra.length) { const eo = {}; extra.forEach(k => eo[k] = env[k]); html += renderKVGrid(eo); }
  return html;
}

// Always renders a labeled subsection — even with zero entries — so a
// section never just silently vanishes and looks like the page is broken.
function chipCountsSection(title, obj, iconMap) {
  const entries = Object.entries(obj || {}).sort((a, b) => b[1] - a[1]);
  const body = entries.length
    ? `<div class="env-chips">${entries.map(([k, v]) => `<div class="env-chip">${iconMap && iconMap[k] ? iconMap[k] + ' ' : ''}${escapeHtml(k)}<span class="ec-count">${v}</span></div>`).join('')}</div>`
    : `<div class="env-chips-empty">No ${escapeHtml(title.toLowerCase())} recorded yet.</div>`;
  return `<div class="env-section"><div class="env-section-title">${escapeHtml(title)}</div>${body}</div>`;
}

function renderJourneyStepsHTML(journey) {
  if (!journey || !journey.length) return emptyState('No journey recorded.');
  const filterFieldOrder = ['PriceRange', 'SurfaceRange', 'FloorRange', 'FilteredCount', 'SelectedRooms', 'SelectedBuildings'];
  return '<div class="journey-timeline">' + journey.map((j, i) => {
    let filterHtml = '';
    if (j.FilterState) {
      const fs = j.FilterState, ordered = {};
      filterFieldOrder.forEach(k => { if (fs[k] !== undefined) ordered[k] = fs[k]; });
      Object.keys(fs).forEach(k => { if (!(k in ordered)) ordered[k] = fs[k]; });
      filterHtml = `<div class="js-filterstate">${renderKVGrid(ordered, {
        PriceRange: 'Price Range', SurfaceRange: 'Surface Range', FloorRange: 'Floor Range',
        SelectedRooms: 'Rooms', SelectedBuildings: 'Buildings', FilteredCount: 'Filtered Count'
      }, ['PriceRange', 'SelectedBuildings'])}</div>`;
    }
    const sub = j.SubActions && j.SubActions.length
      ? `<div class="chip-list journey-tchips">${j.SubActions.map(s => `<span class="chip">${escapeHtml(s)}</span>`).join('')}</div>` : '';
    return `<div class="journey-titem">
      <div class="journey-tnum">${i + 1}</div>
      <div class="journey-tcard">
        <div class="journey-taction">${escapeHtml(j.Action || '—')}</div>
        ${sub}
        ${filterHtml}
      </div>
    </div>`;
  }).join('') + '</div>';
}

// ══════════════════════════════════════════════════════════════
//  Supabase configuration
// ══════════════════════════════════════════════════════════════
const SUPABASE_URL = "https://thxjxjrtubnxnvmpzefc.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoeGp4anJ0dWJueG52bXB6ZWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NzM4NDYsImV4cCI6MjEwMjU0OTg0Nn0.rI7B75LPHMplhytkXdfuDjYi7FrVLFTNLtVql-To2hc";

// ── Theme toggle ────────────────────────────────────────────────
(function () {
  const root = document.documentElement;
  const sun = document.getElementById('theme-icon-sun'), moon = document.getElementById('theme-icon-moon');
  function apply(theme) {
    root.setAttribute('data-theme', theme);
    if (sun) sun.style.display = theme === 'light' ? 'block' : 'none';
    if (moon) moon.style.display = theme === 'light' ? 'none' : 'block';
    try { localStorage.setItem('ap-theme', theme); } catch (e) {}
  }
  let saved = 'dark';
  try { saved = localStorage.getItem('ap-theme') || 'dark'; } catch (e) {}
  apply(saved);
  const toggleBtn = document.getElementById('theme-toggle');
  if (toggleBtn) toggleBtn.addEventListener('click', () => apply(root.getAttribute('data-theme') === 'light' ? 'dark' : 'light'));
})();

document.getElementById('export-pdf-btn')?.addEventListener('click', () => exportPDF());
document.getElementById('pdf-export-caret')?.addEventListener('click', e => {
  e.stopPropagation();
  const menu = document.getElementById('pdf-export-menu');
  document.querySelectorAll('.custom-select-options.open').forEach(m => { if (m !== menu) m.classList.remove('open'); });
  menu.classList.toggle('open');
});
document.getElementById('pdf-export-all-opt')?.addEventListener('click', e => {
  e.stopPropagation();
  document.getElementById('pdf-export-menu').classList.remove('open');
  exportAllPDF();
});

const COLORS_HEX = ['#5b8cff', '#8b7cff', '#ff6fa8', '#22c98e', '#f2b134', '#2bc4e8', '#ff9a5c', '#a8db4f'];
const META_KEYS = ['ClickCount', 'OpenCount', 'TotalTime', 'AverageTime', 'LastOpenTime'];

// ── Global state ─────────────────────────────────────────────
let rawData = null;
let allVisitors = [];         // every visitor, flattened & derived
let spFilteredVisitors = [];  // filtered by salesPerson only (drives visitor dropdown)
let scopedVisitors = [];      // filtered by salesPerson + visitor (drives aggregate/detail rendering)
let currentLeaves = [];       // flattened hierarchy leaves (used by Top Interests + PDF)

const filterState = { scope: 'global', salesPerson: 'ALL', visitor: 'ALL' };
const sortState = {
  features: { key: null, dir: 'asc' },
  apartments: { key: null, dir: 'asc' },
  visitors: { key: 'start', dir: 'asc' }
};

// ── Toast ──────────────────────────────────────────────────────
let toastTimer = null;
function toast(msg, type = 'info', ms = 3000) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg; el.className = 'show ' + (type || '');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.className = '', ms);
}

window.onUnrealSaveSuccess = function () { toast('✓ File saved successfully!', 'success'); };
window.onUnrealSaveCancel = function () { toast('Save cancelled', 'info'); };

function show(id) {
  const waitingScreen = document.getElementById('waiting-screen');
  const dashboard = document.getElementById('dashboard');
  if (waitingScreen) waitingScreen.style.display = id === 'waiting-screen' ? 'flex' : 'none';
  if (dashboard) dashboard.style.display = id === 'dashboard' ? 'block' : 'none';
}

function showLoadError(msg) {
  const waitMsg = document.getElementById('wait-msg');
  if (!waitMsg) return;
  waitMsg.innerHTML = `<span style="color:var(--accent3)">Couldn't load analytics: ${escapeHtml(msg)}</span><br/>` +
    `<button id="retry-btn" style="margin-top:.8rem;padding:.5rem 1.1rem;border-radius:8px;border:1px solid var(--border);background:var(--surface2);color:var(--text);cursor:pointer;font-family:inherit;font-size:.78rem;">Retry</button>`;
  const btn = document.getElementById('retry-btn');
  if (btn) btn.onclick = () => { waitMsg.innerHTML = 'Retrying…'; fetchAnalyticsFromSupabase(); };
}

// ══════════════════════════════════════════════════════════════
//  SUPABASE DATA LAYER — fetch + normalize into the JSON model
// ══════════════════════════════════════════════════════════════
// Looks for an exact PascalCase match, then snake_case, then falls back to a
// case-insensitive scan — this last step matters because Postgres silently
// lowercases unquoted column names (an "AppEvents" column becomes
// "appevents"), which otherwise makes every field look empty.
function pickField(obj, camelKey, snakeKey, fallback) {
  if (!obj) return fallback;
  if (obj[camelKey] !== undefined) return obj[camelKey];
  if (obj[snakeKey] !== undefined) return obj[snakeKey];
  const lowerCamel = camelKey.toLowerCase(), lowerSnake = snakeKey.toLowerCase();
  for (const k of Object.keys(obj)) {
    const lk = k.toLowerCase();
    if (lk === lowerCamel || lk === lowerSnake) return obj[k];
  }
  return fallback;
}

// A Supabase row may wrap its JSON payload under any of these common column
// names (or have the fields directly on the row itself as JSONB columns).
function extractPayloadJSON(row) {
  if (!row || typeof row !== 'object') return {};
  const wrapperKeys = ['data', 'payload', 'session_data', 'analytics_data', 'json_data', 'body', 'record'];
  for (const k of wrapperKeys) {
    if (row[k] && typeof row[k] === 'object') return row[k];
  }
  return row;
}

// Looks a field up across several candidate source objects in priority
// order (e.g. a wrapped JSON payload, then the raw row) — needed because a
// single row can split its fields across both.
function pickFieldFrom(sources, camelKey, snakeKey, fallback) {
  for (const src of sources) {
    if (!src) continue;
    const v = pickField(src, camelKey, snakeKey, undefined);
    if (v !== undefined) return v;
  }
  return fallback;
}

function normalizeVisitorPayload(payload, secondarySource) {
  const sources = [payload || {}, secondarySource || {}];
  return {
    SessionStartTime: pickFieldFrom(sources, 'SessionStartTime', 'session_start_time', ''),
    SessionEndTime: pickFieldFrom(sources, 'SessionEndTime', 'session_end_time', ''),
    SessionOutcome: pickFieldFrom(sources, 'SessionOutcome', 'session_outcome', 'Presentation'),
    AppEvents: pickFieldFrom(sources, 'AppEvents', 'app_events', {}) || {},
    FilterUsage: pickFieldFrom(sources, 'FilterUsage', 'filter_usage', {}) || {},
    FavoritedUnits: pickFieldFrom(sources, 'FavoritedUnits', 'favorited_units', []) || [],
    ApartmentAnalytics: pickFieldFrom(sources, 'ApartmentAnalytics', 'apartment_analytics', {}) || {},
    FeatureTimeInSeconds: pickFieldFrom(sources, 'FeatureTimeInSeconds', 'feature_time_in_seconds', {}) || {},
    UserJourneyHierarchy: pickFieldFrom(sources, 'UserJourneyHierarchy', 'user_journey_hierarchy', []) || [],
    Environment: pickFieldFrom(sources, 'Environment', 'environment', {}) || {},
    HierarchyAnalytics: pickFieldFrom(sources, 'HierarchyAnalytics', 'hierarchy_analytics', {}) || {}
  };
}

function isEmptyValue(v) {
  if (v == null) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object') return Object.keys(v).length === 0;
  return false;
}

// Merge two already-normalized visitor records field by field, always keeping
// whichever side actually HAS data for that field. This is what stops a
// row that fails to parse (wrong column/wrapper name) from wiping out a
// visitor that was already populated from another source.
function mergeVisitorRecords(base, incoming) {
  const fields = ['SessionStartTime', 'SessionEndTime', 'SessionOutcome', 'AppEvents', 'FilterUsage',
    'FavoritedUnits', 'ApartmentAnalytics', 'FeatureTimeInSeconds', 'UserJourneyHierarchy', 'Environment', 'HierarchyAnalytics'];
  const merged = {};
  fields.forEach(f => {
    const b = base ? base[f] : undefined, i = incoming ? incoming[f] : undefined;
    merged[f] = !isEmptyValue(i) ? i : (!isEmptyValue(b) ? b : (i !== undefined ? i : b));
  });
  return merged;
}

function upsertVisitor(salesPersonsMap, spName, vName, normalized) {
  if (!salesPersonsMap[spName]) salesPersonsMap[spName] = { Visitors: {} };
  const existing = salesPersonsMap[spName].Visitors[vName];
  salesPersonsMap[spName].Visitors[vName] = existing ? mergeVisitorRecords(existing, normalized) : normalized;
}

// A `global_analytics` row can itself be the FULL document — TotalUsers,
// SalesPersons (with nested Visitors), GlobalAnalytics, and ApartmentRegistry
// all in one payload. Pull its SalesPersons tree in, keyed exactly as stored.
function mergeSalesPersonsInto(target, spObj) {
  if (!spObj || typeof spObj !== 'object') return;
  Object.entries(spObj).forEach(([spName, spData]) => {
    const visitors = (spData && spData.Visitors) || {};
    Object.entries(visitors).forEach(([vName, vData]) => {
      upsertVisitor(target, spName, vName, normalizeVisitorPayload(vData));
    });
  });
}

// ── Shape-aware deep field search (for global_analytics rows) ──
// Fixes a real ambiguity: a Supabase row can have a wrapper column whose
// NAME collides with the target field's own name (e.g. an entire document
// stored under a column literally called "global_analytics", one level
// above the actual GlobalAnalytics sub-object with the same-ish name).
// A plain name lookup would grab the wrapper instead of digging further in.
// This walks the whole row (bounded depth), collects every object whose KEY
// matches one of the candidate names, and prefers whichever candidate's
// VALUE actually has the expected shape — falling back to a bare name match
// only if nothing shape-valid was found anywhere in the tree.
function deepFindField(root, exactKeys, shapeCheckFn, maxDepth) {
  maxDepth = maxDepth == null ? 4 : maxDepth;
  const lowerKeys = exactKeys.map(k => k.toLowerCase());
  const candidates = [];
  const seen = new Set();
  function walk(obj, depth) {
    if (!obj || typeof obj !== 'object' || depth > maxDepth || seen.has(obj)) return;
    seen.add(obj);
    Object.keys(obj).forEach(k => {
      const val = obj[k];
      if (lowerKeys.includes(k.toLowerCase()) && val && typeof val === 'object' && !Array.isArray(val)) {
        candidates.push(val);
      }
      if (val && typeof val === 'object' && !Array.isArray(val)) walk(val, depth + 1);
    });
  }
  walk(root, 0);
  const shaped = candidates.find(c => !shapeCheckFn || shapeCheckFn(c));
  return shaped || candidates[0] || null;
}

// Same idea, for a plain numeric field (TotalUsers) rather than an object.
function deepFindNumber(root, exactKeys, maxDepth) {
  maxDepth = maxDepth == null ? 4 : maxDepth;
  const lowerKeys = exactKeys.map(k => k.toLowerCase());
  const seen = new Set();
  let found = null;
  function walk(obj, depth) {
    if (!obj || typeof obj !== 'object' || depth > maxDepth || seen.has(obj)) return;
    seen.add(obj);
    for (const k of Object.keys(obj)) {
      const val = obj[k];
      if (found == null && lowerKeys.includes(k.toLowerCase()) && typeof val === 'number') found = val;
      if (val && typeof val === 'object' && !Array.isArray(val)) walk(val, depth + 1);
    }
  }
  walk(root, 0);
  return found;
}

function looksLikeGlobalAnalyticsShape(obj) {
  return !!(obj && (obj.Clicks || obj.FeatureTimeInSeconds || obj.ConversionFunnel || obj.Insights || obj.FeatureOpenCount || obj.AverageTimeInSeconds));
}
function looksLikeApartmentRegistryShape(obj) {
  if (!obj || typeof obj !== 'object') return false;
  const vals = Object.values(obj);
  return vals.length > 0 && vals.some(v => v && typeof v === 'object' && ('TotalViews' in v || 'Building' in v || 'Status' in v || 'TotalFavorites' in v));
}
function looksLikeSalesPersonsShape(obj) {
  if (!obj || typeof obj !== 'object') return false;
  return Object.values(obj).some(v => v && typeof v === 'object' && v.Visitors && typeof v.Visitors === 'object');
}

function reconstructFromSupabase(userRows, globalRows) {
  let GlobalAnalytics = {}, ApartmentRegistry = {}, totalUsersFromGlobal = null;
  const SalesPersons = {};

  // 1. Seed everything from global_analytics — it may already contain the
  //    complete document (TotalUsers / SalesPersons / GlobalAnalytics / ApartmentRegistry),
  //    at any nesting depth and under any wrapper column name (including one
  //    that happens to collide with the field name itself). Shape checks
  //    disambiguate a wrapper from the real sub-object when names collide.
  (globalRows || []).forEach(row => {
    const ga = deepFindField(row, ['GlobalAnalytics', 'global_analytics'], looksLikeGlobalAnalyticsShape);
    if (ga && Object.keys(ga).length) GlobalAnalytics = ga;

    const ar = deepFindField(row, ['ApartmentRegistry', 'apartment_registry'], looksLikeApartmentRegistryShape);
    if (ar && Object.keys(ar).length) ApartmentRegistry = ar;

    const tu = deepFindNumber(row, ['TotalUsers', 'total_users']);
    if (tu != null) totalUsersFromGlobal = tu;

    const sp = deepFindField(row, ['SalesPersons', 'sales_persons'], looksLikeSalesPersonsShape);
    mergeSalesPersonsInto(SalesPersons, sp);
  });

  // 2. Overlay/append live per-session rows from user_sessions on top — these
  //    are the freshest per-visitor records, merged field-by-field so a row
  //    that fails to parse can never blank out data seeded in step 1.
  (userRows || []).forEach((row, idx) => {
    const payload = extractPayloadJSON(row);
    const spName = pickField(row, 'SalesPerson', 'sales_person', null)
      || pickField(payload, 'SalesPerson', 'sales_person', null) || 'Unassigned';
    const visitorName = pickField(row, 'VisitorName', 'visitor_name', null)
      || pickField(payload, 'VisitorName', 'visitor_name', null)
      || row.session_id || row.id || `Visitor ${idx + 1}`;
    upsertVisitor(SalesPersons, spName, visitorName, normalizeVisitorPayload(payload, row));
  });

  let TotalUsers = totalUsersFromGlobal;
  if (TotalUsers == null) {
    let count = 0;
    Object.values(SalesPersons).forEach(sp => { count += Object.keys(sp.Visitors || {}).length; });
    TotalUsers = count;
  }

  return { GlobalAnalytics, ApartmentRegistry, SalesPersons, TotalUsers };
}

async function fetchAnalyticsFromSupabase() {
  const { data: authData, error: authError } = await supabaseClient.auth.getSession();
  if (authError || !authData?.session) {
    setAuthGate(true);
    return;
  }

  const waitMsg = document.getElementById('wait-msg');
  if (waitMsg) waitMsg.textContent = 'Fetching visitor and global analytics from Supabase…';

  try {
    const headers = {
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json"
    };

    const [userRes, globalRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/user_sessions?select=*`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/global_analytics?select=*`, { headers })
    ]);

    if (!userRes.ok) throw new Error(`user_sessions: ${userRes.status} ${userRes.statusText}`);
    const userRows = await userRes.json();

    let globalRows = [];
    if (globalRes.ok) {
      globalRows = await globalRes.json();
    }

    const reconstructed = reconstructFromSupabase(userRows, globalRows);
    window.loadAnalyticsData(reconstructed);
  } catch (err) {
    console.error("Supabase load error:", err);
    showLoadError(err.message || String(err));
  }
}

/* ══════════════════════════════════════════════════════════════
   AUTHENTICATION — Supabase Auth + dashboard gate
   The anon/publishable key is safe for frontend use only when
   database RLS policies protect the data. Never use service_role here.
   ══════════════════════════════════════════════════════════════ */
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function setAuthGate(show) {
  const gate = document.getElementById('auth-gate');
  if (!gate) return;
  gate.setAttribute('aria-hidden', show ? 'false' : 'true');
}

function showAuthError(message) {
  const el = document.getElementById('auth-error');
  if (!el) return;
  el.textContent = message || 'Unable to sign in.';
  el.hidden = false;
}

function clearAuthError() {
  const el = document.getElementById('auth-error');
  if (!el) return;
  el.hidden = true;
  el.textContent = '';
}

async function handleLogin(event) {
  event.preventDefault();
  clearAuthError();

  const email = document.getElementById('auth-email')?.value.trim();
  const password = document.getElementById('auth-password')?.value || '';
  const btn = document.getElementById('auth-login-btn');
  const text = document.getElementById('auth-login-text');

  if (!email || !password) {
    showAuthError('Please enter your email and password.');
    return;
  }

  if (btn) btn.disabled = true;
  if (text) text.textContent = 'Signing in…';

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    if (!data?.session) throw new Error('Login succeeded but no session was returned.');

    setAuthGate(false);

    // Only fetch analytics after successful authentication.
    await fetchAnalyticsFromSupabase();
  } catch (error) {
    console.error('Supabase authentication error:', error);
    showAuthError(error?.message || 'Invalid email or password.');
    setAuthGate(true);
  } finally {
    if (btn) btn.disabled = false;
    if (text) text.textContent = 'Sign in';
  }
}

async function handleLogout() {
  try {
    await supabaseClient.auth.signOut();
  } catch (error) {
    console.error('Sign out error:', error);
  } finally {
    rawData = null;
    setAuthGate(true);
  }
}

async function initializeAuthentication() {
  setAuthGate(true);

  const { data, error } = await supabaseClient.auth.getSession();
  if (error) {
    console.error('Supabase session error:', error);
    return;
  }

  if (data?.session) {
    setAuthGate(false);
    await fetchAnalyticsFromSupabase();
  }

  const { data: listener } = supabaseClient.auth.onAuthStateChange(async (_event, session) => {
    if (session) {
      setAuthGate(false);
      // Do not fetch twice for the initial session if data is already loaded.
      if (!rawData) await fetchAnalyticsFromSupabase();
    } else {
      rawData = null;
      setAuthGate(true);
    }
  });

  window.addEventListener('beforeunload', () => {
    try { listener?.subscription?.unsubscribe(); } catch (e) {}
  });
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('auth-login-form')?.addEventListener('submit', handleLogin);
  document.getElementById('auth-logout-btn')?.addEventListener('click', handleLogout);

  document.getElementById('auth-toggle-password')?.addEventListener('click', () => {
    const input = document.getElementById('auth-password');
    const button = document.getElementById('auth-toggle-password');
    if (!input || !button) return;
    const visible = input.type === 'text';
    input.type = visible ? 'password' : 'text';
    button.textContent = visible ? 'Show' : 'Hide';
    button.setAttribute('aria-label', visible ? 'Show password' : 'Hide password');
  });

  // Existing dashboard UI can be wired immediately; data is gated.
  wireStaticUI();
  initializeAuthentication();
});

// Add or replace your existing sign-out event listener with this:
document.getElementById('auth-logout-btn')?.addEventListener('click', async () => {
  try {
    // 1. Sign out from Supabase (if using Supabase Auth)
    if (typeof supabase !== 'undefined' && supabase.auth) {
      await supabase.auth.signOut();
    }

    // 2. Clear input fields in the login form
    const loginForm = document.getElementById('auth-login-form');
    if (loginForm) {
      loginForm.reset();
    } else {
      // Fallback manual reset if form element is not targeted directly
      const emailInput = document.getElementById('auth-email');
      const passwordInput = document.getElementById('auth-password');
      if (emailInput) emailInput.value = '';
      if (passwordInput) passwordInput.value = '';
    }

    // 3. Reset password toggle state if hidden/shown
    const passwordInput = document.getElementById('auth-password');
    const toggleBtn = document.getElementById('auth-toggle-password');
    if (passwordInput && toggleBtn) {
      passwordInput.type = 'password';
      toggleBtn.textContent = 'Show';
    }

    // 4. Hide and clear any leftover authentication error messages
    const errorEl = document.getElementById('auth-error');
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.hidden = true;
    }

    // 5. Display the auth gate overlay again
    const authGate = document.getElementById('auth-gate');
    if (authGate) {
      authGate.setAttribute('aria-hidden', 'false');
    }

  } catch (error) {
    console.error('Error during sign out:', error);
  }
});
document.getElementById('auth-logout-btn')?.addEventListener('click', async () => {
  // Hide main dashboard content immediately on sign-out
  const dashboard = document.getElementById('dashboard');
  if (dashboard) dashboard.style.display = 'none';

  // Reset form inputs
  document.getElementById('auth-login-form')?.reset();

  // Show auth gate
  const authGate = document.getElementById('auth-gate');
  if (authGate) authGate.setAttribute('aria-hidden', 'false');
});

// Manual data-injection entry point (e.g. Unreal / dev testing)
window.loadAnalyticsData = function (input) {
  try {
    rawData = (typeof input === 'string') ? JSON.parse(input) : input;
    if (!rawData || typeof rawData !== 'object') throw new Error('Empty or malformed analytics payload.');
    filterState.scope = 'global';
    filterState.salesPerson = 'ALL';
    filterState.visitor = 'ALL';
    renderDashboard();
  } catch (e) {
    showLoadError(e.message);
  }
};

// ══════════════════════════════════════════════════════════════
//  DATA MODEL — extraction & aggregation
// ══════════════════════════════════════════════════════════════
function extractVisitors(data) {
  const list = [];
  if (data && data.SalesPersons) {
    Object.entries(data.SalesPersons).forEach(([spName, spData]) => {
      if (spData && spData.Visitors) {
        Object.entries(spData.Visitors).forEach(([vName, vData]) => {
          const featTimes = vData.FeatureTimeInSeconds || {};
          const topFeat = Object.entries(featTimes).sort((a, b) => b[1] - a[1])[0];
          const hierarchy = vData.HierarchyAnalytics || {};
          const derivedClicks = {}, derivedOpens = {};
          Object.entries(hierarchy).forEach(([k, v]) => {
            if (!k.includes('|')) { derivedClicks[k] = v.ClickCount || 0; derivedOpens[k] = v.OpenCount || 0; }
          });
          const start = parseSessionTime(vData.SessionStartTime), end = parseSessionTime(vData.SessionEndTime);
          list.push({
            key: spName + '::' + vName,
            id: vName,
            salesPerson: spName,
            startTime: vData.SessionStartTime || '',
            endTime: vData.SessionEndTime || '',
            durationMs: (start && end) ? (end - start) : null,
            outcome: vData.SessionOutcome || 'Presentation',
            appEvents: vData.AppEvents || {},
            filterUsage: vData.FilterUsage || {},
            favoritedUnits: vData.FavoritedUnits || [],
            apartmentAnalytics: vData.ApartmentAnalytics || {},
            featureTime: featTimes,
            derivedClicks, derivedOpens,
            journey: vData.UserJourneyHierarchy || [],
            environment: vData.Environment || {},
            hierarchy,
            totalTime: Object.values(featTimes).reduce((a, b) => a + b, 0),
            mostUsed: topFeat ? topFeat[0] : '-'
          });
        });
      }
    });
  }
  return list;
}

function currentRegistry() { return (rawData && rawData.ApartmentRegistry) || {}; }

// If the real ApartmentRegistry never loaded (data gap on the Supabase side),
// derive a partial one from every visitor's ApartmentAnalytics/FavoritedUnits
// so the registry section and unit lookups are never just blank. Building
// and Status can't be recovered this way, so they're marked "Unknown".
function buildDerivedRegistry() {
  const reg = {};
  const ensure = (unitId) => {
    if (!reg[unitId]) reg[unitId] = { Building: 'Unknown', Status: 'Unknown', TotalViews: 0, TotalFavorites: 0, TotalPdfOpens: 0, TotalBalconyViews: 0, TotalFloorCutViews: 0 };
    return reg[unitId];
  };
  allVisitors.forEach(v => {
    Object.entries(v.apartmentAnalytics || {}).forEach(([unitId, d]) => {
      const r = ensure(unitId);
      r.TotalViews += d.ViewCount || 0;
      r.TotalPdfOpens += d.PdfOpened ? 1 : 0;
      r.TotalBalconyViews += d.BalconyViewCount || 0;
      r.TotalFloorCutViews += d.FloorCutViewCount || 0;
    });
    (v.favoritedUnits || []).forEach(unitId => { ensure(unitId).TotalFavorites += 1; });
  });
  return reg;
}

// Returns { registry, derived } — the real registry when it has data,
// otherwise a best-effort derived one with `derived: true` so callers can
// show an honest "estimated from visitor activity" note instead of blanking.
function effectiveRegistry() {
  const real = currentRegistry();
  if (Object.keys(real).length) return { registry: real, derived: false };
  const derived = buildDerivedRegistry();
  return { registry: derived, derived: Object.keys(derived).length > 0 };
}

function computeSalesPersonStats(visitors) {
  const map = {};
  visitors.forEach(v => {
    if (!map[v.salesPerson]) map[v.salesPerson] = { name: v.salesPerson, visitorCount: 0, totalTime: 0, screenshots: 0, favorites: 0, apartmentsSet: new Set(), outcomes: {}, featureTimeAgg: {} };
    const s = map[v.salesPerson];
    s.visitorCount++;
    s.totalTime += v.totalTime;
    s.screenshots += v.appEvents.TotalScreenshots || 0;
    s.favorites += (v.favoritedUnits || []).length;
    Object.keys(v.apartmentAnalytics || {}).forEach(u => s.apartmentsSet.add(u));
    s.outcomes[v.outcome] = (s.outcomes[v.outcome] || 0) + 1;
    Object.entries(v.featureTime || {}).forEach(([f, t]) => { s.featureTimeAgg[f] = (s.featureTimeAgg[f] || 0) + t; });
  });
  return Object.values(map).map(s => {
    const top = Object.entries(s.featureTimeAgg).sort((a, b) => b[1] - a[1])[0];
    return { ...s, apartmentsViewed: s.apartmentsSet.size, avgDuration: s.visitorCount ? s.totalTime / s.visitorCount : 0, mostPopularFeature: top ? top[0] : '-' };
  }).sort((a, b) => b.visitorCount - a.visitorCount || b.totalTime - a.totalTime);
}

// Convert pipe-delimited HierarchyAnalytics strings into nested tree, aggregated over a set of visitors
function aggregatePipeHierarchy(visitorList) {
  const root = {};
  visitorList.forEach(vis => {
    const ha = vis.hierarchy || {};
    Object.entries(ha).forEach(([pipeKey, stats]) => {
      const parts = pipeKey.split('|');
      let current = root;
      parts.forEach((part, idx) => {
        if (!current[part]) current[part] = {};
        current = current[part];
        if (idx === parts.length - 1) {
          current.ClickCount = (current.ClickCount || 0) + (stats.ClickCount || 0);
          current.OpenCount = (current.OpenCount || 0) + (stats.OpenCount || 0);
          current.TotalTime = (current.TotalTime || 0) + (stats.TotalTimeInSeconds || 0);
          current.AverageTime = current.OpenCount ? (current.TotalTime / current.OpenCount) : 0;
          if (stats.LastOpenTime) current.LastOpenTime = stats.LastOpenTime;
        }
      });
    });
  });
  return root;
}

function flattenLeaves(obj, path, out) {
  if (!obj || typeof obj !== 'object') return;
  const childKeys = Object.keys(obj).filter(k => !META_KEYS.includes(k) && obj[k] && typeof obj[k] === 'object');
  if (childKeys.length === 0) {
    out.push({
      path: path.slice(), name: path[path.length - 1],
      clickCount: obj.ClickCount || 0, openCount: obj.OpenCount || 0,
      totalTime: obj.TotalTime || 0, avgTime: obj.AverageTime || 0, lastOpen: obj.LastOpenTime || null
    });
  } else {
    childKeys.forEach(k => flattenLeaves(obj[k], path.concat(k), out));
  }
}

function sortRows(rows, key, dir, keyFn) {
  const mul = dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    let av = keyFn ? keyFn(a, key) : a[key], bv = keyFn ? keyFn(b, key) : b[key];
    if (typeof av === 'string') av = av.toLowerCase();
    if (typeof bv === 'string') bv = bv.toLowerCase();
    if (av < bv) return -1 * mul;
    if (av > bv) return 1 * mul;
    return 0;
  });
}

function setupSort(headRowId, key2, applyFn) {
  const row = document.getElementById(headRowId);
  if (!row) return;
  row.querySelectorAll('th.sortable').forEach(th => {
    th.onclick = () => {
      const key = th.dataset.key;
      const st = sortState[key2];
      if (st.key === key) st.dir = st.dir === 'asc' ? 'desc' : 'asc';
      else { st.key = key; st.dir = 'asc'; }
      applyFn();
    };
    th.classList.remove('sort-asc', 'sort-desc');
    const st = sortState[key2];
    if (th.dataset.key === st.key) th.classList.add(st.dir === 'asc' ? 'sort-asc' : 'sort-desc');
  });
}

function createPager(items, pageSize, contentEl, pagerEl, renderItem, emptyHtml) {
  if (!contentEl || !pagerEl) return;
  let page = 0;
  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  function draw() {
    const start = page * pageSize, pageItems = items.slice(start, start + pageSize);
    contentEl.innerHTML = pageItems.length ? pageItems.map(renderItem).join('') : (emptyHtml || '<div class="empty-note">No data.</div>');
    if (pages <= 1) { pagerEl.innerHTML = ''; return; }
    const from = total ? start + 1 : 0, to = Math.min(start + pageSize, total);
    pagerEl.innerHTML =
      `<button class="pager-btn" data-dir="prev" ${page === 0 ? 'disabled' : ''} aria-label="Previous">‹</button>` +
      `<span class="pager-info">${from}\u2013${to} of ${total}</span>` +
      `<button class="pager-btn" data-dir="next" ${page >= pages - 1 ? 'disabled' : ''} aria-label="Next">›</button>`;
    pagerEl.querySelectorAll('.pager-btn').forEach(b => {
      b.onclick = () => { page += b.dataset.dir === 'next' ? 1 : -1; page = Math.max(0, Math.min(pages - 1, page)); draw(); };
    });
  }
  draw();
}

// ── Drill-Down Explorer (factory — supports multiple simultaneous instances) ──
function explorerChildKeys(obj) {
  return Object.keys(obj || {}).filter(k => !META_KEYS.includes(k) && obj[k] && typeof obj[k] === 'object');
}
function explorerLeafSum(obj) {
  const kids = explorerChildKeys(obj);
  if (kids.length === 0) return { time: obj.TotalTime || 0, opens: obj.OpenCount || 0, clicks: obj.ClickCount || 0, leaves: 1 };
  let time = 0, opens = 0, clicks = 0, leaves = 0;
  kids.forEach(k => { const s = explorerLeafSum(obj[k]); time += s.time; opens += s.opens; clicks += s.clicks; leaves += s.leaves; });
  return { time, opens, clicks, leaves };
}

function createExplorer(ids) {
  let root = {}, path = [];
  function nodeAt(p) { let node = root; for (const key of p) { node = node && node[key]; if (!node) return null; } return node; }
  function init(tree) { root = tree || {}; path = []; render(); }
  function render() {
    const crumbsEl = document.getElementById(ids.crumbs), gridEl = document.getElementById(ids.grid), leafEl = document.getElementById(ids.leaf);
    if (!crumbsEl || !gridEl || !leafEl) return;

    const crumbs = [{ label: 'All', path: [] }].concat(path.map((k, i) => ({ label: k, path: path.slice(0, i + 1) })));
    crumbsEl.innerHTML = crumbs.map((c, i) =>
      `<button class="crumb-btn ${i === crumbs.length - 1 ? 'active' : ''}" data-idx="${i}">${escapeHtml(c.label)}</button>` +
      (i < crumbs.length - 1 ? '<span class="crumb-sep">/</span>' : '')
    ).join('');
    crumbsEl.querySelectorAll('.crumb-btn').forEach((b, i) => { b.onclick = () => { path = crumbs[i].path; render(); }; });

    const node = nodeAt(path);
    if (!node) {
      gridEl.style.display = 'block'; leafEl.style.display = 'none';
      gridEl.innerHTML = emptyState('No drill-down data.');
      return;
    }

    let childKeys = explorerChildKeys(node);

    if (explorerChildKeys(node).length === 0 && path.length > 0) {
      gridEl.style.display = 'none'; leafEl.style.display = 'block';
      const opens = node.OpenCount || 0, clicks = node.ClickCount || 0, time = node.TotalTime || 0, avg = node.AverageTime || 0, last = node.LastOpenTime;
      leafEl.innerHTML = `
        <div class="leaf-icon">◆</div>
        <div class="leaf-name">${escapeHtml(path[path.length - 1])}</div>
        <div class="leaf-stats">
          <div class="leaf-stat"><div class="ls-val">${time.toFixed(2)}s</div><div class="ls-label">Total Time</div></div>
          <div class="leaf-stat"><div class="ls-val">${opens}</div><div class="ls-label">Opens</div></div>
          <div class="leaf-stat"><div class="ls-val">${clicks}</div><div class="ls-label">Clicks</div></div>
          <div class="leaf-stat"><div class="ls-val">${avg.toFixed(2)}s</div><div class="ls-label">Avg Time</div></div>
        </div>
        ${last ? `<div class="leaf-last">Last opened ${escapeHtml(formatSessionTimestamp(last))}</div>` : ''}
        <div class="leaf-last" style="margin-top:.4rem;opacity:.7">Path: ${escapeHtml(path.join(' › '))}</div>`;
      return;
    }

    leafEl.style.display = 'none';
    gridEl.style.display = 'grid';
    if (childKeys.length === 0) { gridEl.innerHTML = emptyState('No drill-down data.'); return; }

    const cards = childKeys.map(k => ({ key: k, sum: explorerLeafSum(node[k]), isLeaf: explorerChildKeys(node[k]).length === 0 })).sort((a, b) => b.sum.time - a.sum.time);
    const maxTime = Math.max(...cards.map(c => c.sum.time), 0.001);
    gridEl.innerHTML = cards.map(c => {
      const pct = (c.sum.time / maxTime * 100).toFixed(1);
      return `<button class="explorer-card" data-key="${escapeHtml(c.key)}">
        <div class="ec-top">
          <span class="ec-type">${c.isLeaf ? 'Option' : 'Section'}</span>
          ${!c.isLeaf ? `<span class="ec-count">${c.sum.leaves} item${c.sum.leaves !== 1 ? 's' : ''}</span>` : ''}
        </div>
        <div class="ec-name">${escapeHtml(c.key)}</div>
        <div class="ec-track"><div class="ec-fill" style="width:${pct}%"></div></div>
        <div class="ec-stats"><span>${c.sum.time.toFixed(2)}s</span><span>${c.sum.opens} opens</span><span>${c.sum.clicks} clicks</span></div>
      </button>`;
    }).join('');
    gridEl.querySelectorAll('.explorer-card').forEach(btn => { btn.onclick = () => { path = path.concat(btn.dataset.key); render(); }; });
  }
  return { init };
}

const explorerAgg = createExplorer({ crumbs: 'explorer-crumbs', grid: 'explorer-grid', leaf: 'explorer-leaf' });

// ══════════════════════════════════════════════════════════════
//  RENDER — shared chart primitives
// ══════════════════════════════════════════════════════════════
function renderBars(id, obj, color, unit) {
  const el = document.getElementById(id);
  if (!el) return;
  const entries = Object.entries(obj || {}).sort((a, b) => b[1] - a[1]);
  if (!entries.length) { el.innerHTML = emptyState('No data recorded.'); return; }
  const max = Math.max(...entries.map(e => e[1]), 0.001);
  el.innerHTML = entries.map(([k, v]) => `
    <div class="bar-row">
      <div class="bar-label" title="${escapeHtml(k)}">${escapeHtml(k)}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${(v / max * 100).toFixed(1)}%;background:${color}"></div></div>
      <div class="bar-val" style="color:${color}">${typeof v === 'number' ? (Number.isInteger(v) ? v : v.toFixed(2)) : v}${unit}</div>
    </div>`).join('');
}

function drawDonut(clicks) {
  const canvas = document.getElementById('donut-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const entries = Object.entries(clicks || {}), total = entries.reduce((s, [, v]) => s + v, 0) || 1;
  let start = -Math.PI / 2; ctx.clearRect(0, 0, 140, 140);
  const holeColor = getComputedStyle(document.documentElement).getPropertyValue('--surface').trim() || '#12151f';
  const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#e8eaf1';
  const mutedColor = getComputedStyle(document.documentElement).getPropertyValue('--muted').trim() || '#71778e';

  entries.forEach(([, v], i) => {
    const slice = (v / total) * Math.PI * 2;
    ctx.beginPath(); ctx.moveTo(70, 70); ctx.arc(70, 70, 55, start, start + slice);
    ctx.fillStyle = COLORS_HEX[i % COLORS_HEX.length]; ctx.fill();
    start += slice;
  });

  ctx.beginPath(); ctx.arc(70, 70, 32, 0, Math.PI * 2); ctx.fillStyle = holeColor; ctx.fill();
  ctx.fillStyle = textColor; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(total, 70, 64);
  ctx.font = '10px sans-serif'; ctx.fillStyle = mutedColor; ctx.fillText('clicks', 70, 79);

  const legend = document.getElementById('donut-legend');
  if (legend) {
    legend.innerHTML = entries.length ? entries.map(([k, v], i) => `
      <div class="legend-item"><span class="legend-dot" style="background:${COLORS_HEX[i % COLORS_HEX.length]}"></span>
      <span style="color:var(--muted)">${escapeHtml(k)}</span>
      <span style="margin-left:auto;font-weight:600;padding-left:.5rem">${v}</span></div>`).join('') : emptyState('No clicks recorded.');
  }
}

function renderFunnelCards(funnel) {
  const entries = Object.entries(funnel || {});
  if (!entries.length) return emptyState('No conversion funnel data recorded.');
  return entries.map(([k, v]) => `<div class="funnel-card"><div class="funnel-title">${escapeHtml(titleCase(k))}</div><div class="funnel-num">${escapeHtml(String(v))}</div></div>`).join('');
}

function renderTopInterests(leaves) {
  const el = document.getElementById('top-interests');
  if (!el) return;
  const ranked = leaves.filter(l => l.totalTime > 0 || l.openCount > 0 || l.clickCount > 0)
    .sort((a, b) => (b.totalTime - a.totalTime) || (b.openCount - a.openCount) || (b.clickCount - a.clickCount)).slice(0, 10);
  if (ranked.length === 0) { el.innerHTML = emptyState('No interaction data yet.'); return; }
  const maxTime = Math.max(...ranked.map(r => r.totalTime), 0.001);
  el.innerHTML = ranked.map((r, i) => {
    const crumb = r.path.slice(0, -1).join(' › ');
    const pct = (r.totalTime / maxTime * 100).toFixed(1);
    const timeLabel = r.totalTime > 0 ? r.totalTime.toFixed(2) + 's' : '—';
    const opensLabel = r.openCount > 0 ? r.openCount + ' open' + (r.openCount > 1 ? 's' : '') : (r.clickCount > 0 ? r.clickCount + ' click' + (r.clickCount > 1 ? 's' : '') : '');
    return `<div class="interest-row">
      <div class="rank-badge">${i + 1}</div>
      <div class="interest-main">
        ${crumb ? `<div class="interest-path">${escapeHtml(crumb)}</div>` : ''}
        <div class="interest-name">${escapeHtml(r.name)}</div>
        <div class="interest-track"><div class="interest-fill" style="width:${pct}%"></div></div>
      </div>
      <div class="interest-meta">
        <div class="interest-time">${timeLabel}</div>
        <div class="interest-opens">${opensLabel}</div>
      </div>
    </div>`;
  }).join('');
}

function renderEngagementLeaderboard(visitors) {
  const el = document.getElementById('engagement-leaderboard');
  const pagerEl = document.getElementById('engagement-pager');
  const arr = [...visitors].sort((a, b) => b.totalTime - a.totalTime);
  const max = Math.max(...arr.map(a => a.totalTime), 0.001);
  const rank = new Map(arr.map((a, i) => [a.key, i + 1]));
  createPager(arr, 5, el, pagerEl, a => {
    const pct = (a.totalTime / max * 100).toFixed(1);
    const r = rank.get(a.key);
    const rankCls = r === 1 ? 'rank-gold' : r === 2 ? 'rank-purple' : r === 3 ? 'rank-pink' : '';
    return `<div class="interest-row">
      <div class="rank-badge ${rankCls}">${r}</div>
      <div class="interest-main">
        <div class="interest-name">${escapeHtml(a.id)} <span style="color:var(--muted);font-weight:400;font-size:.72rem;">(${escapeHtml(a.salesPerson)})</span></div>
        <div class="interest-track"><div class="interest-fill" style="width:${pct}%"></div></div>
      </div>
      <div class="interest-meta">
        <div class="interest-time">${a.totalTime.toFixed(2)}s</div>
        <div class="interest-opens">${a.journey.length} step${a.journey.length !== 1 ? 's' : ''} · top: ${escapeHtml(a.mostUsed)}</div>
      </div>
    </div>`;
  }, emptyState('No visitors recorded.'));
}

function renderEnvironment(visitors) {
  const el = document.getElementById('env-context');
  if (!el) return;
  const timeCounts = {}, weatherCounts = {};
  visitors.forEach(v => {
    const env = v.environment || {};
    if (env.TimeOfDaySelectionCounts) Object.entries(env.TimeOfDaySelectionCounts).forEach(([k, val]) => timeCounts[k] = (timeCounts[k] || 0) + val);
    if (env.WeatherSelectionCounts) Object.entries(env.WeatherSelectionCounts).forEach(([k, val]) => weatherCounts[k] = (weatherCounts[k] || 0) + val);
  });
  const html = chipCountsSection('Time of Day Selections', timeCounts, TIME_OF_DAY_ICONS) + chipCountsSection('Weather Selections', weatherCounts, WEATHER_ICONS);
  el.innerHTML = html || emptyState('No environment selections recorded.');
}

function renderJourneySummaryChips(journey) {
  if (!journey || !journey.length) return '';
  return `<div class="chip-list journey-summary-chips">${journey.map((j, i) => `<span class="chip">${i + 1}. ${escapeHtml(j.Action || '—')}</span>`).join('')}</div>`;
}

function renderUserJourneys(visitors) {
  const el = document.getElementById('user-journeys');
  const pagerEl = document.getElementById('journeys-pager');
  createPager(visitors, 3, el, pagerEl, v => {
    const start = parseSessionTime(v.startTime), end = parseSessionTime(v.endTime);
    const dur = (start && end) ? formatDuration(end - start) : null;
    return `<div class="journey-user-row">
      <div class="journey-user-name">${escapeHtml(v.id)} <span class="jun-sp">via ${escapeHtml(v.salesPerson)}</span> ${dur ? `<span class="jun-dur">· ${dur}</span>` : ''}</div>
      ${renderJourneySummaryChips(v.journey)}
      <details class="journey-details">
        <summary>View step-by-step details</summary>
        ${renderJourneyStepsHTML(v.journey)}
      </details>
    </div>`;
  }, emptyState('No journeys recorded.'));
}

// ══════════════════════════════════════════════════════════════
//  VISITOR DETAIL — shared by the drawer AND the inline focus view
// ══════════════════════════════════════════════════════════════
function sectionTitle(label) {
  return `<div class="subsection-title">${escapeHtml(label)}</div>`;
}

function initialsOf(name) {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function buildVisitorDetailHTML(v, prefix) {
  const start = parseSessionTime(v.startTime), end = parseSessionTime(v.endTime);
  const dur = (start && end) ? formatDuration(end - start) : '-';
  const kpiAccents = ['accent-blue', 'accent-green', 'accent-yellow', 'accent-pink', 'accent-blue', 'accent-green'];

  return `
    <div class="vdetail-header">
      <div class="vdetail-identity">
        <div class="vdetail-avatar">${escapeHtml(initialsOf(v.id))}</div>
        <div>
          <div class="vdetail-name">${escapeHtml(v.id)}</div>
          <div class="vdetail-sub">via ${escapeHtml(v.salesPerson)}${v.phoneNumber && v.phoneNumber !== '-' ? ' · ' + escapeHtml(v.phoneNumber) : ''}</div>
          <div class="vdetail-outcome"><span class="badge badge-blue">${escapeHtml(v.outcome)}</span></div>
        </div>
      </div>
      <div class="vdetail-meta-grid">
        ${kvItem('Started', formatSessionTimestamp(v.startTime))}
        ${kvItem('Ended', formatSessionTimestamp(v.endTime))}
        ${kvItem('Duration', dur)}
      </div>
    </div>

    <div class="vdetail-kpis">
      <div class="vdetail-kpi ${kpiAccents[0]}"><div class="vk-val">${v.totalTime.toFixed(1)}s</div><div class="vk-label">Total Feature Time</div></div>
      <div class="vdetail-kpi ${kpiAccents[1]}"><div class="vk-val">${escapeHtml(v.mostUsed)}</div><div class="vk-label">Most Used Feature</div></div>
      <div class="vdetail-kpi ${kpiAccents[2]}"><div class="vk-val">${(v.journey || []).length}</div><div class="vk-label">Journey Steps</div></div>
      <div class="vdetail-kpi ${kpiAccents[3]}"><div class="vk-val">${v.appEvents.TotalScreenshots || 0}</div><div class="vk-label">Screenshots</div></div>
      <div class="vdetail-kpi ${kpiAccents[4]}"><div class="vk-val">${(v.favoritedUnits || []).length}</div><div class="vk-label">Favorites</div></div>
      <div class="vdetail-kpi ${kpiAccents[5]}"><div class="vk-val">${Object.keys(v.apartmentAnalytics || {}).length}</div><div class="vk-label">Apartments Viewed</div></div>
    </div>

    ${sectionTitle('App Events')}
    ${renderKVGrid(v.appEvents || {}, { TotalScreenshots: 'Total Screenshots', NormalScreenshots: 'Normal Screenshots', AdvancedScreenshots: 'Advanced Screenshots', LanguagesUsed: 'Languages Used' }) || emptyState('No app events recorded.')}

    ${sectionTitle('Filter Usage')}
    ${renderFilterUsage(v.filterUsage)}

    ${sectionTitle('Favorited Units')}
    ${renderFavoritedUnits(v.favoritedUnits, v.apartmentAnalytics, effectiveRegistry().registry)}

    ${sectionTitle('Apartment Analytics')}
    ${renderApartmentAnalyticsCards(v.apartmentAnalytics, effectiveRegistry().registry, v.favoritedUnits)}

    ${sectionTitle('Feature Time (sec)')}
    <div class="bar-group" id="${prefix}-feature-bars"></div>

    ${sectionTitle('User Journey')}
    ${renderJourneyStepsHTML(v.journey)}

    ${renderEnvironmentDetail(v.environment)}

    ${sectionTitle('Hierarchy Analytics Explorer')}
    <div class="explorer-crumbs" id="${prefix}-explorer-crumbs"></div>
    <div class="explorer-grid" id="${prefix}-explorer-grid"></div>
    <div class="explorer-leaf" id="${prefix}-explorer-leaf" style="display:none"></div>
  `;
}

function mountVisitorDetailExtras(v, prefix) {
  renderBars(prefix + '-feature-bars', v.featureTime || {}, 'var(--accent)', 's');
  const tree = aggregatePipeHierarchy([v]);
  createExplorer({ crumbs: prefix + '-explorer-crumbs', grid: prefix + '-explorer-grid', leaf: prefix + '-explorer-leaf' }).init(tree);
}

function openVisitorDrawer(key) {
  const v = allVisitors.find(x => x.key === key);
  if (!v) return;
  document.getElementById('drawer-content').innerHTML = buildVisitorDetailHTML(v, 'vdet');
  mountVisitorDetailExtras(v, 'vdet');
  document.getElementById('visitor-drawer-overlay').classList.add('open');
}
function closeDrawer() { document.getElementById('visitor-drawer-overlay').classList.remove('open'); }

function renderVisitorFocusView() {
  const v = scopedVisitors[0];
  const container = document.getElementById('visitor-focus-content');
  if (!v) { container.innerHTML = emptyState('This visitor could not be found under the current filters.'); return; }
  container.innerHTML = buildVisitorDetailHTML(v, 'vfocus');
  mountVisitorDetailExtras(v, 'vfocus');
}

// ══════════════════════════════════════════════════════════════
//  TABLES — apartment registry / visitors / feature breakdown
// ══════════════════════════════════════════════════════════════
// Natural (alphanumeric) comparison — "IT 2 A1" sorts before "IT 13 B8"
// instead of after it, unlike a plain string compare which would treat
// '1' < '2' at the first differing character and get it backwards.
function naturalCompare(a, b) {
  const ax = [], bx = [];
  String(a).replace(/(\d+)|(\D+)/g, (_, d, s) => { ax.push([d ? parseInt(d, 10) : Infinity, s || '']); return ''; });
  String(b).replace(/(\d+)|(\D+)/g, (_, d, s) => { bx.push([d ? parseInt(d, 10) : Infinity, s || '']); return ''; });
  while (ax.length && bx.length) {
    const an = ax.shift(), bn = bx.shift();
    const diff = (an[0] - bn[0]) || an[1].localeCompare(bn[1]);
    if (diff) return diff;
  }
  return ax.length - bx.length;
}

const APT_SORT_OPTIONS = [
  { value: 'id', label: 'Unit ID' },
  { value: 'Building', label: 'Building' },
  { value: 'TotalViews', label: 'Views' },
  { value: 'TotalFavorites', label: 'Favorites' },
  { value: 'TotalPdfOpens', label: 'PDF Opens' },
  { value: 'TotalBalconyViews', label: 'Balcony Views' },
  { value: 'TotalFloorCutViews', label: 'Floor Cut Views' }
];

function populateApartmentSortDropdown() {
  const st = sortState.apartments;
  if (!st.key) st.key = 'id';
  buildDropdown('apartment-sort-text', 'apartment-sort-menu', 'apartment-sort-wrap', APT_SORT_OPTIONS, st.key, 'Unit ID', val => {
    sortState.apartments.key = val;
    renderApartmentRegistry();
  });
  const btn = document.getElementById('apartment-sort-dir-btn');
  if (btn) {
    btn.textContent = st.dir === 'asc' ? '↑ Asc' : '↓ Desc';
    btn.onclick = () => { sortState.apartments.dir = sortState.apartments.dir === 'asc' ? 'desc' : 'asc'; renderApartmentRegistry(); };
  }
}

function renderApartmentRegistry() {
  const { registry, derived } = effectiveRegistry();
  const noteEl = document.getElementById('registry-note');
  if (noteEl) noteEl.style.display = derived ? 'block' : 'none';

  populateApartmentSortDropdown();
  const st = sortState.apartments;

  // Raw Data -> Apply Sort -> Render. Every step below produces a NEW array
  // (via .map/spread), so `registry` itself and the underlying rawData are
  // never touched.
  let rows = Object.entries(registry).map(([id, u]) => ({ id, ...u }));
  rows = st.key === 'id'
    ? [...rows].sort((a, b) => naturalCompare(a.id, b.id) * (st.dir === 'asc' ? 1 : -1))
    : sortRows(rows, st.key, st.dir, (r, key) => key === 'Building' ? (r[key] || '') : (r[key] || 0));

  const grid = document.getElementById('apartment-registry-grid');
  if (!grid) return;
  if (!Object.keys(registry).length) { grid.innerHTML = emptyState('No apartment registry data.'); return; }
  if (!rows.length) { grid.innerHTML = emptyState('No apartments found.'); return; }

  grid.innerHTML = rows.map(u => `
    <div class="mini-card">
      <div class="mini-card-title">
        <span>${escapeHtml(u.id)}</span>
        <span class="mini-card-badges"><span class="badge badge-green">${escapeHtml(u.Status || 'For sale')}</span></span>
      </div>
      <div class="mini-card-sub">${escapeHtml(u.Building || 'Unknown')}</div>
      <div class="mini-card-stats">
        <span>Views ${u.TotalViews || 0}</span>
        <span>Favorites ${u.TotalFavorites || 0}</span>
        <span>PDF Opens ${u.TotalPdfOpens || 0}</span>
        <span>Balcony ${u.TotalBalconyViews || 0}</span>
        <span>Floor Cut ${u.TotalFloorCutViews || 0}</span>
      </div>
    </div>
  `).join('');
}

function renderUsersTable(visitors) {
  let rows = visitors.map(v => {
    const start = parseSessionTime(v.startTime), end = parseSessionTime(v.endTime);
    return {
      key: v.key, id: v.id, sp: v.salesPerson, outcome: v.outcome,
      screenshots: v.appEvents.TotalScreenshots || 0,
      startRaw: v.startTime || '-', endRaw: v.endTime || '-',
      start: start ? start.getTime() : 0,
      durMs: (start && end) ? (end - start) : -1,
      dur: (start && end) ? formatDuration(end - start) : '-'
    };
  });
  const st = sortState.visitors;
  if (st.key) rows = sortRows(rows, st.key, st.dir);
  setupSort('users-table-head', 'visitors', () => renderUsersTable(visitors));

  const body = document.getElementById('users-table-body');
  const pagerEl = document.getElementById('users-pager');
  createPager(rows, 8, body, pagerEl, r =>
    `<tr class="clickable" data-key="${escapeHtml(r.key)}">
      <td><strong>${escapeHtml(r.id)}</strong></td>
      <td>${escapeHtml(r.sp)}</td>
      <td><span class="badge badge-blue">${escapeHtml(r.outcome)}</span></td>
      <td>${r.screenshots}</td>
      <td>${escapeHtml(formatSessionTimestamp(r.startRaw))}</td>
      <td>${escapeHtml(formatSessionTimestamp(r.endRaw))}</td>
      <td>${r.dur}</td>
    </tr>`
    , `<tr><td colspan="7" style="color:var(--muted)">No visitors match the current filters.</td></tr>`);

  body.onclick = (e) => { const tr = e.target.closest('tr.clickable'); if (tr) openVisitorDrawer(tr.dataset.key); };
}

function renderFeatureTable(rowsSrc) {
  let rows = rowsSrc;
  const st = sortState.features;
  if (st.key) rows = sortRows(rows, st.key, st.dir);
  setupSort('feature-table-head', 'features', () => renderFeatureTable(rowsSrc));
  const tbody = document.getElementById('table-body');
  tbody.innerHTML = rows.length ? rows.map(r => {
    const eng = r.avg >= 4 ? 'High' : r.avg >= 2 ? 'Medium' : 'Low';
    const badge = r.avg >= 4 ? 'badge-green' : r.avg >= 2 ? 'badge-yellow' : 'badge-blue';
    return `<tr><td><strong>${escapeHtml(r.name)}</strong></td><td>${r.clicks}</td><td>${r.opens}</td><td>${r.total.toFixed(2)}s</td><td>${r.avg.toFixed(2)}s</td><td><span class="badge ${badge}">${eng}</span></td></tr>`;
  }).join('') : `<tr><td colspan="6" style="color:var(--muted)">No feature data recorded.</td></tr>`;
}

// ══════════════════════════════════════════════════════════════
//  KPI BUILDERS
// ══════════════════════════════════════════════════════════════
function buildGlobalKPIs() {
  const ga = rawData.GlobalAnalytics || {};
  const clicks = ga.Clicks || {}, featureTimes = ga.FeatureTimeInSeconds || {}, insights = ga.Insights || {}, funnel = ga.ConversionFunnel || {};
  const registry = currentRegistry();
  const totalClicks = Object.values(clicks).reduce((a, b) => a + b, 0);
  const totalTime = Object.values(featureTimes).reduce((a, b) => a + b, 0);
  const apartmentsViewed = Object.values(registry).filter(u => (u.TotalViews || 0) > 0).length;
  const totalFavorites = Object.values(registry).reduce((a, u) => a + (u.TotalFavorites || 0), 0);
  const totalScreenshots = allVisitors.reduce((a, v) => a + (v.appEvents.TotalScreenshots || 0), 0);
  return [
    { label: 'Total Users', value: rawData.TotalUsers ?? allVisitors.length, sub: 'recorded overall', cls: 'accent-blue' },
    { label: 'Total Clicks', value: totalClicks, sub: 'across all features', cls: 'accent-green' },
    { label: 'Total Feature Time', value: totalTime.toFixed(1) + 's', sub: 'combined engagement', cls: 'accent-yellow' },
    { label: 'Top Feature', value: insights.MostTimeSpentFeature || '-', sub: 'avg ' + fmtNum(insights.MostTimeSpentAverageInSeconds) + 's', cls: 'accent-pink' },
    { label: 'Presentations', value: funnel.Presentations || 0, sub: 'conversion funnel', cls: 'accent-blue' },
    { label: 'Reservations', value: funnel.Reservations || 0, sub: 'conversion funnel', cls: 'accent-green' },
    { label: 'Purchases', value: funnel.Purchases || 0, sub: 'conversion funnel', cls: 'accent-yellow' },
    { label: 'Apartments Viewed', value: apartmentsViewed, sub: 'of ' + Object.keys(registry).length + ' listed', cls: 'accent-pink' },
    { label: 'Total Favorites', value: totalFavorites, sub: 'across registry', cls: 'accent-blue' },
    { label: 'Screenshots', value: totalScreenshots, sub: 'all sessions', cls: 'accent-green' }
  ];
}

function buildUserAggregateKPIs() {
  const visitors = scopedVisitors;
  const totalTime = visitors.reduce((a, v) => a + v.totalTime, 0);
  const totalScreenshots = visitors.reduce((a, v) => a + (v.appEvents.TotalScreenshots || 0), 0);
  const totalFavorites = visitors.reduce((a, v) => a + (v.favoritedUnits || []).length, 0);
  const featAgg = {};
  visitors.forEach(v => Object.entries(v.featureTime || {}).forEach(([f, t]) => { featAgg[f] = (featAgg[f] || 0) + t; }));
  const top = Object.entries(featAgg).sort((a, b) => b[1] - a[1])[0];
  const apartmentsSet = new Set();
  visitors.forEach(v => Object.keys(v.apartmentAnalytics || {}).forEach(u => apartmentsSet.add(u)));
  const totalClicks = visitors.reduce((a, v) => a + Object.values(v.derivedClicks || {}).reduce((x, y) => x + y, 0), 0);
  const label = filterState.salesPerson === 'ALL' ? 'all visitors' : filterState.salesPerson;
  return [
    { label: 'Filtered Visitors', value: visitors.length, sub: label, cls: 'accent-blue' },
    { label: 'Total Clicks', value: totalClicks, sub: 'derived, current filter', cls: 'accent-green' },
    { label: 'Total Feature Time', value: totalTime.toFixed(1) + 's', sub: 'combined engagement', cls: 'accent-yellow' },
    { label: 'Top Feature', value: top ? top[0] : '-', sub: top ? top[1].toFixed(1) + 's total' : '-', cls: 'accent-pink' },
    { label: 'Screenshots', value: totalScreenshots, sub: 'current filter', cls: 'accent-blue' },
    { label: 'Favorites', value: totalFavorites, sub: 'current filter', cls: 'accent-green' },
    { label: 'Apartments Interacted', value: apartmentsSet.size, sub: 'distinct units', cls: 'accent-yellow' }
  ];
}

function buildVisitorKPIs(v) {
  if (!v) return [];
  return [
    { label: 'Total Feature Time', value: v.totalTime.toFixed(1) + 's', sub: 'this session', cls: 'accent-blue' },
    { label: 'Most Used Feature', value: v.mostUsed, sub: 'by time spent', cls: 'accent-green' },
    { label: 'Journey Steps', value: (v.journey || []).length, sub: 'recorded actions', cls: 'accent-yellow' },
    { label: 'Screenshots', value: v.appEvents.TotalScreenshots || 0, sub: 'normal + advanced', cls: 'accent-pink' },
    { label: 'Favorites', value: (v.favoritedUnits || []).length, sub: 'saved units', cls: 'accent-blue' },
    { label: 'Outcome', value: v.outcome, sub: v.salesPerson, cls: 'accent-green' }
  ];
}

function renderKPIs() {
  const kpiGrid = document.getElementById('kpi-grid');
  if (!kpiGrid) return;
  let kpis;
  if (filterState.scope === 'global') kpis = buildGlobalKPIs();
  else if (filterState.visitor === 'ALL') kpis = buildUserAggregateKPIs();
  else kpis = buildVisitorKPIs(scopedVisitors[0]);
  kpiGrid.innerHTML = kpis.map(k => `
    <div class="kpi ${k.cls}">
      <div class="kpi-label">${escapeHtml(k.label)}</div>
      <div class="kpi-value">${escapeHtml(String(k.value))}</div>
      <div class="kpi-sub">${escapeHtml(String(k.sub))}</div>
    </div>`).join('');
}

// ══════════════════════════════════════════════════════════════
//  VIEW ORCHESTRATION
// ══════════════════════════════════════════════════════════════
function showViewPanel(id) {
  ['global-view', 'user-aggregate-view', 'visitor-focus-view'].forEach(pid => {
    const el = document.getElementById(pid);
    if (el) el.classList.toggle('active', pid === id);
  });
}

function updateScopeUI() {
  document.querySelectorAll('.scope-btn').forEach(b => b.classList.toggle('active', b.dataset.scope === filterState.scope));
  const spWrap = document.getElementById('salesperson-filter-wrap');
  const visWrap = document.getElementById('visitor-filter-wrap');
  const show = filterState.scope === 'user';
  if (spWrap) spWrap.style.display = show ? 'flex' : 'none';
  if (visWrap) visWrap.style.display = show ? 'flex' : 'none';
}

function renderSessionLabel() {
  const el = document.getElementById('session-label');
  if (!el) return;
  if (filterState.scope === 'global') { el.textContent = `${rawData.TotalUsers ?? allVisitors.length} Total Users · Global scope`; return; }
  if (filterState.visitor !== 'ALL') { const v = scopedVisitors[0]; el.textContent = v ? `Visitor: ${v.id} · ${v.salesPerson}` : 'Visitor not found'; return; }
  el.textContent = filterState.salesPerson === 'ALL' ? `${scopedVisitors.length} Visitors · All Sales Persons` : `${scopedVisitors.length} Visitors · ${filterState.salesPerson}`;
}

function renderGlobalView() {
  const ga = rawData.GlobalAnalytics || {};
  const clicks = ga.Clicks || {}, featureTimes = ga.FeatureTimeInSeconds || {}, avgTimes = ga.AverageTimeInSeconds || {}, opens = ga.FeatureOpenCount || {}, insights = ga.Insights || {}, funnel = ga.ConversionFunnel || {};

  document.getElementById('funnel-grid').innerHTML = renderFunnelCards(funnel);
  renderBars('global-clicks-bars', clicks, 'var(--yellow)', '');
  renderBars('time-bars', featureTimes, 'var(--accent)', 's');
  renderBars('avg-bars', avgTimes, 'var(--accent2)', 's');
  renderBars('open-bars', opens, 'var(--yellow)', '');
  drawDonut(clicks);

  const insightsGrid = document.getElementById('insights-grid');
  if (Object.keys(insights).length) {
    insightsGrid.innerHTML =
      kvItem('Most Time Spent Feature', insights.MostTimeSpentFeature || '—') +
      kvItem('Most Time Spent (avg s)', fmtNum(insights.MostTimeSpentAverageInSeconds)) +
      kvItem('Least Time Spent Feature', insights.LeastTimeSpentFeature || '—') +
      kvItem('Least Time Spent (avg s)', fmtNum(insights.LeastTimeSpentAverageInSeconds));
  } else {
    insightsGrid.innerHTML = emptyState('No insights recorded.');
  }

  const rows = Object.keys(featureTimes).map(f => ({ name: f, clicks: clicks[f] || 0, opens: opens[f] || 0, total: featureTimes[f] || 0, avg: avgTimes[f] || 0 }));
  renderFeatureTable(rows);
}

function renderUserAggregateView() {
  const visitors = scopedVisitors;

  const spStats = computeSalesPersonStats(allVisitors);
  const spGrid = document.getElementById('sp-card-grid');
  spGrid.innerHTML = spStats.length ? spStats.map(s => `
    <div class="sp-card ${s.name === filterState.salesPerson ? 'active-sp' : ''}" data-sp="${escapeHtml(s.name)}">
      <div class="sp-card-name">${escapeHtml(s.name)}</div>
      <div class="sp-card-row"><span>Visitors</span><b>${s.visitorCount}</b></div>
      <div class="sp-card-row"><span>Total Engagement</span><b>${s.totalTime.toFixed(1)}s</b></div>
      <div class="sp-card-row"><span>Avg Duration</span><b>${s.avgDuration.toFixed(1)}s</b></div>
      <div class="sp-card-row"><span>Screenshots</span><b>${s.screenshots}</b></div>
      <div class="sp-card-row"><span>Favorites</span><b>${s.favorites}</b></div>
      <div class="sp-card-row"><span>Apartments Viewed</span><b>${s.apartmentsViewed}</b></div>
      <div class="sp-card-row"><span>Most Popular</span><b>${escapeHtml(s.mostPopularFeature)}</b></div>
      <div class="chip-list" style="margin-top:.5rem">${Object.entries(s.outcomes).map(([o, c]) => `<span class="chip">${escapeHtml(o)}: ${c}</span>`).join('')}</div>
    </div>`).join('') : emptyState('No sales person records available.');
  spGrid.querySelectorAll('.sp-card').forEach(card => {
    card.onclick = () => { filterState.salesPerson = card.dataset.sp; filterState.visitor = 'ALL'; renderDashboard(); };
  });

  const outcomeCounts = {};
  visitors.forEach(v => { outcomeCounts[v.outcome] = (outcomeCounts[v.outcome] || 0) + 1; });
  document.getElementById('outcome-funnel-grid').innerHTML = Object.keys(outcomeCounts).length ? renderFunnelCards(outcomeCounts) : emptyState('No visitors to derive outcomes from.');

  const hierarchyTree = aggregatePipeHierarchy(visitors);
  currentLeaves = [];
  Object.entries(hierarchyTree).forEach(([k, v]) => flattenLeaves(v, [k], currentLeaves));
  renderTopInterests(currentLeaves);
  explorerAgg.init(hierarchyTree);

  renderEngagementLeaderboard(visitors);
  renderEnvironment(visitors);

  const apAgg = {};
  const favSetAgg = new Set();
  visitors.forEach(v => {
    Object.entries(v.apartmentAnalytics || {}).forEach(([unit, d]) => {
      if (!apAgg[unit]) apAgg[unit] = { ViewCount: 0, TimeSpentInSeconds: 0, PdfOpened: false, BalconyViewCount: 0, FloorCutViewCount: 0 };
      const a = apAgg[unit];
      a.ViewCount += d.ViewCount || 0; a.TimeSpentInSeconds += d.TimeSpentInSeconds || 0;
      a.PdfOpened = a.PdfOpened || !!d.PdfOpened;
      a.BalconyViewCount += d.BalconyViewCount || 0; a.FloorCutViewCount += d.FloorCutViewCount || 0;
    });
    (v.favoritedUnits || []).forEach(u => favSetAgg.add(u));
  });
  document.getElementById('visitor-apartment-analytics').innerHTML = renderApartmentAnalyticsCards(apAgg, effectiveRegistry().registry, Array.from(favSetAgg));

  renderUsersTable(visitors);
  renderUserJourneys(visitors);

  const featAgg = {}, openAgg = {};
  visitors.forEach(v => {
    Object.entries(v.featureTime || {}).forEach(([f, t]) => { featAgg[f] = (featAgg[f] || 0) + t; });
    Object.entries(v.derivedOpens || {}).forEach(([f, o]) => { openAgg[f] = (openAgg[f] || 0) + o; });
  });
  renderBars('agg-time-bars', featAgg, 'var(--accent)', 's');
  renderBars('agg-open-bars', openAgg, 'var(--yellow)', '');
}

function applyFilters() {
  allVisitors = extractVisitors(rawData);
  spFilteredVisitors = filterState.salesPerson === 'ALL' ? allVisitors : allVisitors.filter(v => v.salesPerson === filterState.salesPerson);
  if (filterState.visitor !== 'ALL' && !spFilteredVisitors.find(v => v.key === filterState.visitor)) filterState.visitor = 'ALL';
  scopedVisitors = filterState.visitor === 'ALL' ? spFilteredVisitors : spFilteredVisitors.filter(v => v.key === filterState.visitor);
}

function buildDropdown(triggerId, menuId, wrapId, options, selectedValue, allLabel, onSelect) {
  const trigger = document.getElementById(triggerId), menu = document.getElementById(menuId), wrap = document.getElementById(wrapId);
  if (!trigger || !menu || !wrap) return;
  const selOpt = options.find(o => (typeof o === 'string' ? o : o.value) === selectedValue);
  trigger.textContent = selectedValue === 'ALL' ? allLabel : (selOpt ? (typeof selOpt === 'string' ? selOpt : selOpt.label) : selectedValue);
  menu.innerHTML = options.map(opt => {
    const val = typeof opt === 'string' ? opt : opt.value;
    const label = typeof opt === 'string' ? (opt === 'ALL' ? allLabel : opt) : opt.label;
    return `<div class="custom-select-option ${val === selectedValue ? 'selected' : ''}" data-value="${escapeHtml(val)}">${escapeHtml(label)}</div>`;
  }).join('');
  wrap.onclick = (e) => { e.stopPropagation(); document.querySelectorAll('.custom-select-options.open').forEach(m => { if (m !== menu) m.classList.remove('open'); }); menu.classList.toggle('open'); };
  menu.querySelectorAll('.custom-select-option').forEach(opt => {
    opt.onclick = (e) => { e.stopPropagation(); menu.classList.remove('open'); onSelect(opt.dataset.value); };
  });
}

function populateSalesPersonDropdown() {
  const names = [...new Set(allVisitors.map(v => v.salesPerson))].sort();
  buildDropdown('sp-selected-text', 'sp-dropdown-menu', 'salesperson-filter-wrap', ['ALL', ...names], filterState.salesPerson, 'All Sales Persons', val => {
    filterState.salesPerson = val;
    if (filterState.visitor !== 'ALL') {
      const v = allVisitors.find(x => x.key === filterState.visitor);
      if (!v || (val !== 'ALL' && v.salesPerson !== val)) filterState.visitor = 'ALL';
    }
    renderDashboard();
  });
}

function populateVisitorDropdown() {
  const pool = filterState.salesPerson === 'ALL' ? allVisitors : allVisitors.filter(v => v.salesPerson === filterState.salesPerson);
  const options = ['ALL', ...pool.map(v => ({ value: v.key, label: filterState.salesPerson === 'ALL' ? `${v.id} (${v.salesPerson})` : v.id }))];
  buildDropdown('visitor-selected-text', 'visitor-dropdown-menu', 'visitor-filter-wrap', options, filterState.visitor, 'All Visitors', val => {
    filterState.visitor = val;
    if (val !== 'ALL') {
      const v = allVisitors.find(x => x.key === val);
      if (v) filterState.salesPerson = v.salesPerson;
    }
    renderDashboard();
  });
}

function renderDashboard() {
  if (!rawData) return;
  show('dashboard');
  applyFilters();
  populateSalesPersonDropdown();
  populateVisitorDropdown();
  updateScopeUI();
  renderSessionLabel();

  const isVisitorFocus = filterState.scope === 'user' && filterState.visitor !== 'ALL';

  // The visitor's own summary tiles already live inside the visitor detail
  // view itself, so the top-level Key Metrics grid is redundant (and shows
  // global-scope numbers) while one specific visitor is open.
  const kpiSection = document.getElementById('kpi-section');
  if (kpiSection) kpiSection.style.display = isVisitorFocus ? 'none' : 'block';
  if (!isVisitorFocus) renderKPIs();

  if (filterState.scope === 'global') {
    showViewPanel('global-view');
    renderGlobalView();
  } else if (filterState.visitor === 'ALL') {
    showViewPanel('user-aggregate-view');
    renderUserAggregateView();
  } else {
    showViewPanel('visitor-focus-view');
    renderVisitorFocusView();
  }

  // The registry is global reference data — not relevant while a single
  // visitor's own profile is open, so it's hidden rather than shown twice.
  const registryCard = document.getElementById('apartment-registry-card');
  if (registryCard) registryCard.style.display = isVisitorFocus ? 'none' : 'block';
  if (!isVisitorFocus) renderApartmentRegistry();
}

// ══════════════════════════════════════════════════════════════
//  STATIC UI WIRING (runs once)
// ══════════════════════════════════════════════════════════════
function wireStaticUI() {
  document.addEventListener('click', () => document.querySelectorAll('.custom-select-options.open').forEach(m => m.classList.remove('open')));

  document.getElementById('scope-toggle')?.addEventListener('click', e => {
    const btn = e.target.closest('.scope-btn'); if (!btn) return;
    filterState.scope = btn.dataset.scope;
    renderDashboard();
  });

  document.getElementById('reset-filters-btn')?.addEventListener('click', () => {
    filterState.scope = 'global'; filterState.salesPerson = 'ALL'; filterState.visitor = 'ALL';
    sortState.features = { key: null, dir: 'asc' };
    sortState.apartments = { key: null, dir: 'asc' };
    sortState.visitors = { key: 'start', dir: 'asc' };
    renderDashboard();
  });

  document.getElementById('drawer-close')?.addEventListener('click', closeDrawer);
  document.getElementById('visitor-drawer-overlay')?.addEventListener('click', e => { if (e.target.id === 'visitor-drawer-overlay') closeDrawer(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });
}

// ══════════════════════════════════════════════════════════════
//  EXPORT — PDF only (DOC export removed)
// ══════════════════════════════════════════════════════════════
function exportPDF() {
  if (!rawData) { toast('No analytics data loaded yet', 'error'); return; }
  toast('Generating PDF…', 'info');
  const { jsPDF } = window.jspdf || {}; if (!jsPDF) { toast('jsPDF not loaded', 'error'); return; }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const now = new Date().toLocaleString();
  let y = 34;

  const scopeLabel = filterState.scope === 'global' ? 'Global Analytics'
    : filterState.visitor !== 'ALL' ? `Visitor: ${scopedVisitors[0] ? scopedVisitors[0].id : '-'} (Sales Person: ${scopedVisitors[0] ? scopedVisitors[0].salesPerson : '-'})`
    : `User / Section Analytics — Sales Person: ${filterState.salesPerson}`;

  doc.setFillColor(15, 20, 36); doc.rect(0, 0, W, 22, 'F');
  doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255); doc.text('Analytics Report', 14, 14);
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(180, 190, 210); doc.text('Generated: ' + now, W - 14, 14, { align: 'right' });
  doc.setFontSize(9); doc.setTextColor(90, 100, 130); doc.text('Scope: ' + scopeLabel, 14, 28);

  // ── PDF-building helpers ──────────────────────────────────────
  function ensureSpace(needed) { if (y + needed > 280) { doc.addPage(); y = 20; } }
  function section(title) {
    ensureSpace(14);
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 40, 60);
    doc.text(title, 14, y);
    y += 5;
  }
  function table(head, body, opts) {
    if (!body.length) { doc.setFontSize(8); doc.setFont('helvetica', 'italic'); doc.setTextColor(140, 145, 160); doc.text('No data recorded.', 14, y); y += 8; return; }
    ensureSpace(18);
    doc.autoTable(Object.assign({
      startY: y, head: [head], body, theme: 'grid', styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [26, 58, 126], textColor: 255 }, margin: { left: 14, right: 14 }
    }, opts || {}));
    y = doc.lastAutoTable.finalY + 8;
  }
  function kvTable(pairs) { table(['Metric', 'Value'], pairs); }

  // ── Key Metrics (mirrors the top-of-page KPI row for this scope) ──
  let kpis;
  if (filterState.scope === 'global') kpis = buildGlobalKPIs();
  else if (filterState.visitor === 'ALL') kpis = buildUserAggregateKPIs();
  else kpis = buildVisitorKPIs(scopedVisitors[0]);
  section('Key Metrics');
  kvTable(kpis.map(k => [k.label, `${k.value} (${k.sub})`]));

  if (filterState.scope === 'global') {
    const ga = rawData.GlobalAnalytics || {};
    const clicks = ga.Clicks || {}, featureTimes = ga.FeatureTimeInSeconds || {}, avgTimes = ga.AverageTimeInSeconds || {}, opens = ga.FeatureOpenCount || {}, insights = ga.Insights || {}, funnel = ga.ConversionFunnel || {};

    section('Conversion Funnel (all-time totals)');
    kvTable(Object.entries(funnel).map(([k, v]) => [titleCase(k), String(v)]));

    section('Insights');
    kvTable([
      ['Most Time Spent Feature', insights.MostTimeSpentFeature || '-'],
      ['Most Time Spent (avg s)', fmtNum(insights.MostTimeSpentAverageInSeconds)],
      ['Least Time Spent Feature', insights.LeastTimeSpentFeature || '-'],
      ['Least Time Spent (avg s)', fmtNum(insights.LeastTimeSpentAverageInSeconds)]
    ]);

    section('Global Clicks');
    table(['Feature', 'Clicks'], Object.entries(clicks).map(([k, v]) => [k, String(v)]));

    section('Full Feature Breakdown');
    table(['Feature', 'Clicks', 'Opens', 'Total Time', 'Avg Time'],
      Object.keys(featureTimes).map(f => [f, String(clicks[f] || 0), String(opens[f] || 0), (featureTimes[f] || 0).toFixed(2) + 's', (avgTimes[f] || 0).toFixed(2) + 's']));

  } else if (filterState.visitor === 'ALL') {
    const visitors = scopedVisitors;

    section('Sales Person Analytics');
    const spStats = computeSalesPersonStats(allVisitors);
    table(['Sales Person', 'Visitors', 'Total Time', 'Avg Duration', 'Screenshots', 'Favorites', 'Apartments Viewed', 'Top Feature'],
      spStats.map(s => [s.name, String(s.visitorCount), s.totalTime.toFixed(1) + 's', s.avgDuration.toFixed(1) + 's', String(s.screenshots), String(s.favorites), String(s.apartmentsViewed), s.mostPopularFeature]));

    section('Session Outcome Distribution');
    const outcomeCounts = {};
    visitors.forEach(v => { outcomeCounts[v.outcome] = (outcomeCounts[v.outcome] || 0) + 1; });
    kvTable(Object.entries(outcomeCounts).map(([k, v]) => [k, String(v)]));

    section('Top Interests');
    const topRows = (currentLeaves || []).filter(l => l.totalTime > 0).sort((a, b) => b.totalTime - a.totalTime).slice(0, 15)
      .map(l => [l.path.join(' > '), l.totalTime.toFixed(2) + 's', String(l.openCount)]);
    table(['Path', 'Time Spent', 'Opens'], topRows);

    section('Most Engaged Visitors');
    table(['Visitor', 'Sales Person', 'Total Time', 'Top Feature'],
      [...visitors].sort((a, b) => b.totalTime - a.totalTime).slice(0, 20).map(v => [v.id, v.salesPerson, v.totalTime.toFixed(2) + 's', v.mostUsed]));

    section('Environment & Weather Context');
    const timeCounts = {}, weatherCounts = {};
    visitors.forEach(v => {
      const env = v.environment || {};
      if (env.TimeOfDaySelectionCounts) Object.entries(env.TimeOfDaySelectionCounts).forEach(([k, val]) => timeCounts[k] = (timeCounts[k] || 0) + val);
      if (env.WeatherSelectionCounts) Object.entries(env.WeatherSelectionCounts).forEach(([k, val]) => weatherCounts[k] = (weatherCounts[k] || 0) + val);
    });
    kvTable([
      ...Object.entries(timeCounts).map(([k, v]) => ['Time of Day: ' + k, String(v)]),
      ...Object.entries(weatherCounts).map(([k, v]) => ['Weather: ' + k, String(v)])
    ]);

    section('Visitor Apartment Interactions');
    const apAgg = {};
    visitors.forEach(v => {
      Object.entries(v.apartmentAnalytics || {}).forEach(([unit, d]) => {
        if (!apAgg[unit]) apAgg[unit] = { ViewCount: 0, TimeSpentInSeconds: 0, PdfOpened: false, BalconyViewCount: 0, FloorCutViewCount: 0 };
        const a = apAgg[unit];
        a.ViewCount += d.ViewCount || 0; a.TimeSpentInSeconds += d.TimeSpentInSeconds || 0; a.PdfOpened = a.PdfOpened || !!d.PdfOpened;
        a.BalconyViewCount += d.BalconyViewCount || 0; a.FloorCutViewCount += d.FloorCutViewCount || 0;
      });
    });
    table(['Unit', 'Views', 'Time Spent', 'PDF Opened', 'Balcony', 'Floor Cut'],
      Object.entries(apAgg).map(([id, d]) => [id, String(d.ViewCount), d.TimeSpentInSeconds.toFixed(2) + 's', d.PdfOpened ? 'Yes' : 'No', String(d.BalconyViewCount), String(d.FloorCutViewCount)]));

    section('All Visitors');
    table(['Visitor', 'Sales Person', 'Outcome', 'Screenshots', 'Started', 'Ended', 'Duration'],
      visitors.map(v => {
        const start = parseSessionTime(v.startTime), end = parseSessionTime(v.endTime);
        const dur = (start && end) ? formatDuration(end - start) : '-';
        return [v.id, v.salesPerson, v.outcome, String(v.appEvents.TotalScreenshots || 0), formatSessionTimestamp(v.startTime), formatSessionTimestamp(v.endTime), dur];
      }));

    section('Feature Time Breakdown (current filter)');
    const featAgg = {}, openAgg = {}, clickAgg = {};
    visitors.forEach(v => {
      Object.entries(v.featureTime || {}).forEach(([f, t]) => { featAgg[f] = (featAgg[f] || 0) + t; });
      Object.entries(v.derivedOpens || {}).forEach(([f, o]) => { openAgg[f] = (openAgg[f] || 0) + o; });
      Object.entries(v.derivedClicks || {}).forEach(([f, c]) => { clickAgg[f] = (clickAgg[f] || 0) + c; });
    });
    table(['Feature', 'Clicks', 'Opens', 'Total Time'],
      Object.keys(featAgg).map(f => [f, String(clickAgg[f] || 0), String(openAgg[f] || 0), featAgg[f].toFixed(2) + 's']));

  } else {
    const v = scopedVisitors[0];
    if (v) {
      section('Session Info');
      kvTable([
        ['Sales Person', v.salesPerson], ['Phone', v.phoneNumber && v.phoneNumber !== '-' ? v.phoneNumber : '-'], ['Outcome', v.outcome],
        ['Started', formatSessionTimestamp(v.startTime)], ['Ended', formatSessionTimestamp(v.endTime)]
      ]);

      section('App Events');
      kvTable(Object.entries(v.appEvents || {}).map(([k, val]) => [titleCase(k), Array.isArray(val) ? val.join(', ') : String(val)]));

      section('Filter Usage');
      const fu = v.filterUsage || {}, fuRows = [];
      if (fu.PriceRange) fuRows.push(['Price', fmtMoney(fu.PriceRange.Min) + ' - ' + fmtMoney(fu.PriceRange.Max)]);
      if (fu.SurfaceRange) fuRows.push(['Surface', fmtNum(fu.SurfaceRange.Min) + ' - ' + fmtNum(fu.SurfaceRange.Max)]);
      if (fu.FloorRange) fuRows.push(['Floor', fmtNum(fu.FloorRange.Min) + ' - ' + fmtNum(fu.FloorRange.Max)]);
      if (fu.SelectedRooms) fuRows.push(['Rooms', (fu.SelectedRooms || []).join(', ') || '-']);
      if (fu.SelectedBuildings) fuRows.push(['Buildings', (fu.SelectedBuildings || []).join(', ') || '-']);
      if (fu.SelectedStatus) fuRows.push(['Status', (fu.SelectedStatus || []).join(', ') || '-']);
      if (fu.FilteredApartmentCount != null) fuRows.push(['Filtered Apartments', String(fu.FilteredApartmentCount)]);
      kvTable(fuRows);

      section('Favorited Units');
      table(['Unit'], (v.favoritedUnits || []).map(u => [u]));

      section('Apartment Analytics');
      table(['Unit', 'Views', 'Time Spent', 'PDF Opened', 'Balcony', 'Floor Cut'],
        Object.entries(v.apartmentAnalytics || {}).map(([id, d]) => [id, String(d.ViewCount || 0), (d.TimeSpentInSeconds || 0).toFixed(2) + 's', d.PdfOpened ? 'Yes' : 'No', String(d.BalconyViewCount || 0), String(d.FloorCutViewCount || 0)]));

      section('Feature Time');
      table(['Feature', 'Time (s)'], Object.entries(v.featureTime || {}).map(([f, t]) => [f, t.toFixed(2)]));

      section('User Journey');
      table(['#', 'Action', 'Sub-Actions'], (v.journey || []).map((j, i) => [String(i + 1), j.Action || '-', (j.SubActions || []).join(', ') || '-']));

      section('Environment');
      const env = v.environment || {};
      kvTable([
        ['Clock', env.LastClockTime || '-'], ['Date', env.LastDate || '-'],
        ['Time of Day', env.LastTimeOfDay || '-'], ['Weather', env.LastWeather || '-']
      ]);

      section('Hierarchy Analytics');
      const tree = aggregatePipeHierarchy([v]);
      const leaves = [];
      Object.entries(tree).forEach(([k, val]) => flattenLeaves(val, [k], leaves));
      table(['Path', 'Time', 'Opens', 'Clicks'],
        leaves.filter(l => l.totalTime > 0 || l.openCount > 0 || l.clickCount > 0).sort((a, b) => b.totalTime - a.totalTime).slice(0, 25)
          .map(l => [l.path.join(' > '), l.totalTime.toFixed(2) + 's', String(l.openCount), String(l.clickCount)]));
    }
  }

  section('Apartment Registry');
  const registryRows = Object.entries(effectiveRegistry().registry).map(([id, u]) => [id, u.Building || '-', u.Status || '-', String(u.TotalViews || 0), String(u.TotalFavorites || 0), String(u.TotalPdfOpens || 0)]);
  table(['Unit', 'Building', 'Status', 'Views', 'Favorites', 'PDF Opens'], registryRows);

  const slugify = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  let filename = 'analytics-global.pdf';
  if (filterState.scope === 'user') {
    if (filterState.visitor !== 'ALL' && scopedVisitors[0]) filename = `analytics-visitor-${slugify(scopedVisitors[0].id)}.pdf`;
    else if (filterState.salesPerson !== 'ALL') filename = `analytics-salesperson-${slugify(filterState.salesPerson)}.pdf`;
    else filename = 'analytics-all-visitors.pdf';
  }

  downloadPdfDoc(doc, filename);
}

// Two download mechanisms fire together, since each is a no-op in the
// "wrong" environment and there's no reliable way to detect which browser
// context we're in from here:
//  1. jsPDF's own .save() — the standard way to trigger a file download in
//     a normal browser (Chrome, Firefox, Edge, Safari).
//  2. The "insightsave://" custom URL scheme — the app's embedded browser
//     (e.g. Unreal's WebBrowser widget) intercepts this on the native side
//     to write the file to disk. A normal browser has no handler registered
//     for this scheme and just silently ignores the navigation attempt, so
//     firing it alongside .save() is harmless there.
function downloadPdfDoc(doc, filename) {
  try { doc.save(filename); } catch (e) { console.error('Standard browser download failed:', e); }
  try {
    const dataUri = doc.output('datauristring');
    const payload = { filename, mime: 'application/pdf', encoding: 'datauri', content: dataUri };
    window.location.href = 'insightsave://' + encodeURIComponent(JSON.stringify(payload));
  } catch (e) { /* not running inside the embedded Unreal browser — ignore */ }
  toast('PDF ready — check your downloads', 'success');
}

// Ignores current filters entirely and compiles one comprehensive report:
// global feature breakdown, a rollup per sales person, every visitor, and
// the full apartment registry — for a single "everything, right now" export.
function exportAllPDF() {
  if (!rawData) { toast('No analytics data loaded yet', 'error'); return; }
  toast('Generating full report…', 'info');
  const { jsPDF } = window.jspdf || {}; if (!jsPDF) { toast('jsPDF not loaded', 'error'); return; }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth(), now = new Date().toLocaleString();

  doc.setFillColor(15, 20, 36); doc.rect(0, 0, W, 22, 'F');
  doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255); doc.text('Analytics — Full Report', 14, 14);
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(180, 190, 210); doc.text('Generated: ' + now, W - 14, 14, { align: 'right' });
  doc.setFontSize(9); doc.setTextColor(90, 100, 130); doc.text('Scope: every sales person & visitor', 14, 28);

  const ga = rawData.GlobalAnalytics || {};
  const timeMap = ga.FeatureTimeInSeconds || {}, opensMap = ga.FeatureOpenCount || {}, clicksMap = ga.Clicks || {}, avgMap = ga.AverageTimeInSeconds || {};
  let y = 34;
  doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 40, 60); doc.text('Global Feature Breakdown', 14, y); y += 4;
  doc.autoTable({
    startY: y, head: [['Feature', 'Clicks', 'Opens', 'Total Time', 'Avg Time']],
    body: Object.keys(timeMap).map(f => [f, String(clicksMap[f] || 0), String(opensMap[f] || 0), (timeMap[f] || 0).toFixed(2) + 's', (avgMap[f] || 0).toFixed(2) + 's']),
    theme: 'grid', styles: { fontSize: 8, cellPadding: 3 }, headStyles: { fillColor: [26, 58, 126], textColor: 255 }
  });

  const allV = extractVisitors(rawData);
  const spStats = computeSalesPersonStats(allV);
  let y2 = doc.lastAutoTable.finalY + 10;
  if (y2 > 250) { doc.addPage(); y2 = 20; }
  doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 40, 60); doc.text('Sales Person Rollup', 14, y2); y2 += 4;
  doc.autoTable({
    startY: y2, head: [['Sales Person', 'Visitors', 'Total Time', 'Avg Duration', 'Screenshots', 'Favorites', 'Apartments Viewed', 'Most Popular']],
    body: spStats.map(s => [s.name, String(s.visitorCount), s.totalTime.toFixed(1) + 's', s.avgDuration.toFixed(1) + 's', String(s.screenshots), String(s.favorites), String(s.apartmentsViewed), s.mostPopularFeature]),
    theme: 'grid', styles: { fontSize: 8, cellPadding: 3 }, headStyles: { fillColor: [26, 58, 126], textColor: 255 }
  });

  let y3 = doc.lastAutoTable.finalY + 10;
  if (y3 > 250) { doc.addPage(); y3 = 20; }
  doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 40, 60); doc.text('All Visitors', 14, y3); y3 += 4;
  const visRows = allV.map(v => {
    const start = parseSessionTime(v.startTime), end = parseSessionTime(v.endTime);
    const dur = (start && end) ? formatDuration(end - start) : '-';
    return [v.id, v.salesPerson, v.outcome, dur, v.totalTime.toFixed(1) + 's', v.mostUsed];
  });
  doc.autoTable({
    startY: y3, head: [['Visitor', 'Sales Person', 'Outcome', 'Duration', 'Total Time', 'Top Feature']],
    body: visRows, theme: 'grid', styles: { fontSize: 8, cellPadding: 3 }, headStyles: { fillColor: [26, 58, 126], textColor: 255 }
  });

  let y4 = doc.lastAutoTable.finalY + 10;
  if (y4 > 250) { doc.addPage(); y4 = 20; }
  doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 40, 60); doc.text('Apartment Registry', 14, y4); y4 += 4;
  const registryRows = Object.entries(effectiveRegistry().registry).map(([id, u]) => [id, u.Building || '-', u.Status || '-', String(u.TotalViews || 0), String(u.TotalFavorites || 0), String(u.TotalPdfOpens || 0)]);
  if (registryRows.length) {
    doc.autoTable({ startY: y4, head: [['Unit', 'Building', 'Status', 'Views', 'Favorites', 'PDF Opens']], body: registryRows, theme: 'grid', styles: { fontSize: 8, cellPadding: 3 }, headStyles: { fillColor: [26, 58, 126], textColor: 255 } });
  }

  downloadPdfDoc(doc, 'analytics-full-report.pdf');
}