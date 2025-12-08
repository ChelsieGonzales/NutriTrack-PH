const STORAGE_KEY = 'NUTRI_CHILDREN_V1';

function readChildren(){
  try{
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  }catch(e){ return []; }
}

function writeChildren(list){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function uid(){ 
  return Date.now() + Math.floor(Math.random()*999); 
}

function updateMetrics(){
  const list = readChildren();
  const total = list.length;
  const counts = {Normal:0, Underweight:0, Overweight:0, Obese:0};
  list.forEach(c => {
    if(counts[c.status] !== undefined) counts[c.status]++;
  });

  document.getElementById('totalCount').textContent = total;
  document.getElementById('normalCount').textContent = counts.Normal || 0;
  document.getElementById('underCount').textContent = counts.Underweight || 0;
  document.getElementById('overCount').textContent = counts.Overweight || 0;
  document.getElementById('obeseCount').textContent = counts.Obese || 0;

}

function getChildren() {
  try {
    return JSON.parse(localStorage.getItem('NUTRI_CHILDREN_V1') || '[]');
  } catch {
    return [];
  }
}

function groupByBarangay(children) {
  const groups = {};

  children.forEach(child => {
    const b = (child.barangay || "Unknown").trim().toLowerCase();

    if (!groups[b]) {
      groups[b] = { total: 0, normal: 0, underweight: 0, overweight: 0, obese: 0 };
    }

    groups[b].total++;

    const status = (child.status || "").toLowerCase();
    if (status === "normal") groups[b].normal++;
    if (status === "underweight") groups[b].underweight++;
    if (status === "overweight") groups[b].overweight++;
    if (status === "obese") groups[b].obese++;
  });

  return groups;
}


function renderBarangayList(groups) {
  const container = document.getElementById("barangayList");
  container.innerHTML = "";

  for (let barangay in groups) {
    const g = groups[barangay];

    const div = document.createElement("div");
    div.className = "barangay-item";

    div.innerHTML = `
      <h4>${barangay}</h4>
      <p><strong>Total Children:</strong> ${g.total}</p>
      <p>Normal: ${g.normal}</p>
      <p>Underweight: ${g.underweight}</p>
      <p>Overweight: ${g.overweight}</p>
      <p>Obese: ${g.obese}</p>
    `;

    container.appendChild(div);
  }
}

function computeRisk(groups) {
  let highestObesity = null;
  let highestUnderweight = null;

  for (let b in groups) {
    const g = groups[b];
    if (g.total === 0) continue;

    const obeseRate = g.obese / g.total;
    const underRate = g.underweight / g.total;

    if (!highestObesity || obeseRate > highestObesity.rate) {
      highestObesity = { barangay: b, rate: obeseRate };
    }

    if (!highestUnderweight || underRate > highestUnderweight.rate) {
      highestUnderweight = { barangay: b, rate: underRate };
    }
  }

  document.getElementById("highestObesity").textContent =
    highestObesity
      ? `${capitalize(highestObesity.barangay)} (${(highestObesity.rate * 100).toFixed(1)}%)`
      : "—";

  document.getElementById("highestUnderweight").textContent =
    highestUnderweight
      ? `${capitalize(highestUnderweight.barangay)} (${(highestUnderweight.rate * 100).toFixed(1)}%)`
      : "—";
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}


function initBarangayStats() {
  const children = getChildren();
  const groups = groupByBarangay(children);
  renderBarangayList(groups);
  computeRisk(groups);
}

document.addEventListener("DOMContentLoaded", initBarangayStats);

