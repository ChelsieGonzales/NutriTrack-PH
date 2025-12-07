// admin-dashboard.js — cleaned & consolidated
// Assumes Chart.js is loaded on pages that render charts.

const STORAGE_KEY = 'NUTRI_CHILDREN_V1';

function readChildren() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch (e) { return []; }
}

function writeChildren(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}
function uid() { return Date.now() + Math.floor(Math.random() * 999); }


function computeBMI(weightKg, heightCm) {
  if (!weightKg || !heightCm) return null;
  const h = heightCm / 100;
  return weightKg / (h * h);
}

function classifyBMI(bmi) {
  if (bmi === null || isNaN(bmi)) return { key: 'unknown', label: 'Unknown' };
  let key, label;
  if (bmi < 18.5) { key = 'underweight'; label = 'Underweight'; }
  else if (bmi < 25) { key = 'normal'; label = 'Normal'; }
  else if (bmi < 30) { key = 'overweight'; label = 'Overweight'; }
  else { key = 'obese'; label = 'Obese'; }
  return { key, label };
}

function saveChild(child) {
  // child: { name, barangay, age, weight, height }
  const list = readChildren();

  const bmi = computeBMI(Number(child.weight), Number(child.height));
  const cls = classifyBMI(bmi);

  const record = {
    id: child.id || uid(),
    name: String(child.name || '').trim(),
    barangay: String(child.barangay || '').trim() || 'Unknown',
    age: Number(child.age) || null,
    weight: Number(child.weight) || null,
    height: Number(child.height) || null,
    bmi: (bmi === null ? null : Number(bmi.toFixed(1))),
    statusKey: cls.key,      
    status: cls.label,      
    createdAt: Date.now()
  };

  list.push(record);
  writeChildren(list);
  return record;
}

/* ---------- Metrics / Dashboard ---------- */
function aggregateCounts(list) {
  const summary = { total: 0, normal: 0, underweight: 0, overweight: 0, obese: 0 };
  list.forEach(c => {
    summary.total++;
    const key = (c.statusKey || '').toLowerCase();
    if (key === 'normal') summary.normal++;
    else if (key === 'underweight') summary.underweight++;
    else if (key === 'overweight') summary.overweight++;
    else if (key === 'obese') summary.obese++;
  });
  return summary;
}

function updateMetrics() {
  const list = readChildren();
  const s = aggregateCounts(list);

  const setText = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.textContent = v;
  };

  setText('totalCount', s.total);
  setText('normalCount', s.normal);
  setText('underCount', s.underweight);
  setText('overCount', s.overweight);
  setText('obeseCount', s.obese);

  renderTableIfExists(list);
  renderAlerts(list);
}

/* ---------- Table rendering (children list) ---------- */
function renderTableIfExists(list) {
  const el = document.getElementById('childrenTable') || document.getElementById('childrenListTable');
  if (!el) return;

  // build table rows (simple)
  const rows = list.map(c => {
    return `<tr data-id="${c.id}">
      <td>${escapeHtml(c.name)}</td>
      <td>${escapeHtml(c.barangay)}</td>
      <td>${c.age ?? ''}</td>
      <td>${c.weight ?? ''}</td>
      <td>${c.height ?? ''}</td>
      <td>${c.bmi ?? '—'}</td>
      <td>${escapeHtml(c.status)}</td>
      <td>
        <button class="btn edit" data-id="${c.id}">Edit</button>
        <button class="btn del" data-id="${c.id}">Delete</button>
      </td>
    </tr>`;
  }).join('');

  // if table body exists, replace; else set innerHTML
  const tbody = el.querySelector('tbody');
  if (tbody) tbody.innerHTML = rows;
  else el.innerHTML = `<table class="table"><thead><!-- headers should be in HTML --></thead><tbody>${rows}</tbody></table>`;

  // attach handlers for delete/edit
  el.querySelectorAll('.del').forEach(btn => btn.onclick = () => {
    const id = btn.getAttribute('data-id');
    deleteChild(id);
  });
  // editing can be implemented if needed
}

function escapeHtml(s) {
  if (!s && s !== 0) return '';
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c]));
}

/* ---------- Alerts (example: flag malnutrition) ---------- */
function renderAlerts(list) {
  const alertsEl = document.getElementById('alertsContainer') || document.getElementById('alerts');
  if (!alertsEl) return;
  // Show up to 5 underweight children as alerts
  const under = list.filter(c => (c.statusKey || '').toLowerCase() === 'underweight').slice(0,5);
  if (under.length === 0) {
    alertsEl.innerHTML = `<div class="note">No current alerts</div>`;
    return;
  }
  alertsEl.innerHTML = under.map(c => `<div class="alert">⚠ ${escapeHtml(c.name)} — ${escapeHtml(c.barangay)} (${c.bmi ?? '—'})</div>`).join('');
}

/* ---------- Delete child ---------- */
function deleteChild(id) {
  const list = readChildren();
  const idx = list.findIndex(x => String(x.id) === String(id));
  if (idx === -1) return alert('Record not found');
  if (!confirm('Delete this record?')) return;
  list.splice(idx, 1);
  writeChildren(list);
  updateMetrics();
  renderBarangayStats(); // refresh barangay view
}

function groupByBarangay(children) {
  const groups = {};

  children.forEach(child => {
    const b = (child.barangay || 'Unknown').trim() || 'Unknown';

    if (!groups[b]) {
      groups[b] = { total: 0, normal: 0, underweight: 0, overweight: 0, obese: 0 };
    }

    groups[b].total++;

    // Normalize the status key
    const k = (child.statusKey || child.status || '').toLowerCase();

    if (k === 'normal' || k === 'healthy') groups[b].normal++;
    else if (k === 'underweight') groups[b].underweight++;
    else if (k === 'overweight') groups[b].overweight++;
    else if (k === 'obese') groups[b].obese++;
  });

  return groups;
}

function renderBarangayList(groups) {
  const container = document.getElementById('barangayList');
  if (!container) return;
  container.innerHTML = '';

  // sort barangays alphabetically for consistent display
  const keys = Object.keys(groups).sort((a,b) => a.localeCompare(b));
  keys.forEach(barangay => {
    const g = groups[barangay];
    const div = document.createElement('div');
    div.className = 'barangay-item';
    div.innerHTML = `
      <h4>${escapeHtml(barangay)}</h4>
      <p><strong>Total Children:</strong> ${g.total}</p>
      <p>Normal: ${g.normal}</p>
      <p>Underweight: ${g.underweight}</p>
      <p>Overweight: ${g.overweight}</p>
      <p>Obese: ${g.obese}</p>
    `;
    container.appendChild(div);
  });
}

function computeRisk(groups) {
  let highestObesity = null;
  let highestUnderweight = null;

  for (const barangay in groups) {
    const g = groups[barangay];
    const obeseRate = g.total > 0 ? g.obese / g.total : 0;
    const underRate = g.total > 0 ? g.underweight / g.total : 0;

    if (!highestObesity || obeseRate > highestObesity.rate) {
      highestObesity = { barangay, rate: obeseRate, total: g.total, count: g.obese };
    }
    if (!highestUnderweight || underRate > highestUnderweight.rate) {
      highestUnderweight = { barangay, rate: underRate, total: g.total, count: g.underweight };
    }
  }

  const setText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  setText('highestObesity', highestObesity ? `${highestObesity.barangay} (${(highestObesity.rate*100).toFixed(1)}% — ${highestObesity.count}/${highestObesity.total})` : '—');
  setText('highestUnderweight', highestUnderweight ? `${highestUnderweight.barangay} (${(highestUnderweight.rate*100).toFixed(1)}% — ${highestUnderweight.count}/${highestUnderweight.total})` : '—');
}

/* ---------- Full barangay render ---------- */
function renderBarangayStats() {
  const children = readChildren();
  const groups = groupByBarangay(children);
  renderBarangayList(groups);
  computeRisk(groups);
  renderBarangayCharts(groups);
}

/* ---------- Initialization & storage sync ---------- */
function initDashboard() {
  updateMetrics();
  renderBarangayStats();
}

/* keep pages in sync when localStorage changes (e.g., add-child page saves) */
window.addEventListener('storage', (e) => {
  if (e.key === STORAGE_KEY) {
    updateMetrics();
    renderBarangayStats();
  }
});

/* DOM ready */
document.addEventListener('DOMContentLoaded', initDashboard);

/* ---------- Utility: delete all sample (dev) ---------- */
function clearAllData(confirmMsg = true) {
  if (confirmMsg && !confirm('Delete all saved child records?')) return;
  localStorage.removeItem(STORAGE_KEY);
  updateMetrics();
  renderBarangayStats();
}

/* ---------- Expose some functions for other pages (optional) ---------- */
window.Nutri = {
  saveChild,
  readChildren,
  writeChildren,
  updateMetrics,
  renderBarangayStats,
  clearAllData
};

function normalizeStatus(status) {
  if (!status) return "normal";
  status = status.toLowerCase().trim();

  // Map synonyms to your standard 4 statuses
  if (status === "healthy") return "normal";

  return status;
}

