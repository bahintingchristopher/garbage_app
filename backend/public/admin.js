const API = location.origin + '/api';
let TOKEN = localStorage.getItem('adminToken') || '';
let ME = null;
let currentTab = 'topups';

async function api(path, opts = {}) {
  const res = await fetch(API + path, {
    method: opts.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(TOKEN ? { Authorization: 'Bearer ' + TOKEN } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || ('HTTP ' + res.status));
  return json.data !== undefined ? json.data : json;
}
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const when = t => t ? new Date(t).toLocaleString() : '';

async function login() {
  try {
    const d = await api('/auth/login', { method:'POST', body:{ email: email.value, password: password.value }});
    if (d.user.role !== 'ADMIN') throw new Error('This console is for admins only.');
    TOKEN = d.token; ME = d.user;
    localStorage.setItem('adminToken', TOKEN);
    enter();
  } catch (e) { loginErr.textContent = e.message; }
}
function logout() { localStorage.removeItem('adminToken'); location.reload(); }

function enter() {
  document.getElementById('login').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  show(currentTab);
}

function show(tab) {
  currentTab = tab;
  document.querySelectorAll('nav button').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  ['topups','announcements','support','stats','materials','collectors','clients','pending'].forEach(t =>
    document.getElementById('tab-' + t).style.display = t === tab ? 'block' : 'none');
  loadTab(tab);
}

function loadTab(tab) {
  if (tab === 'topups') loadTopups();
  if (tab === 'announcements') loadAnnouncements();
  if (tab === 'support') loadTickets();
  if (tab === 'stats') loadStats();
  if (tab === 'materials') loadMaterials();
  if (tab === 'collectors') loadCollectors();
  if (tab === 'clients') loadClients();
  if (tab === 'pending') loadPending();
}

/* ---------- Top-ups ---------- */
async function loadTopups(status = 'PENDING') {
  const el = document.getElementById('tab-topups');
  const rows = await api('/topups' + (status && status !== 'ALL' ? '?status=' + status : ''));
  el.innerHTML = `
    <div class="card"><h3>eCoin top-up requests</h3>
      <select data-action="load-topups" style="width:auto">
        ${['PENDING','APPROVED','REJECTED','ALL'].map(s => `<option ${s===status?'selected':''}>${s}</option>`).join('')}
      </select></div>
    <div class="card"><table>
      <tr><th>ID</th><th>Collector</th><th>Amount</th><th>Method</th><th>Reference</th><th>Status</th><th>Created</th><th></th></tr>
      ${rows.map(r => `<tr>
        <td>${r.id}</td><td>${esc(r.collectorName)}</td><td>P${r.amount}</td>
        <td>${esc(r.paymentMethod)}</td><td>${esc(r.referenceNumber)}</td>
        <td><span class="pill ${r.status}">${r.status}</span></td><td>${when(r.createdAt)}</td>
        <td>${r.status === 'PENDING' ? `
          <button class="btn green" data-action="decide" data-id="${r.id}" data-decision="approve">Approve</button>
          <button class="btn red" data-action="decide" data-id="${r.id}" data-decision="reject">Reject</button>` : ''}
        </td></tr>`).join('') || '<tr><td colspan=8 class=muted>Nothing here.</td></tr>'}
    </table></div>`;
}
async function decideTopup(id, action) {
  let body = {};
  if (action === 'reject') {
    const reason = prompt('Rejection reason:');
    if (!reason) return;
    body.reason = reason;
  }
  try {
    const d = await api(`/topups/${id}/${action}`, { method:'POST', body });
    alert(d && d.message ? d.message : 'Done'); loadTopups();
  } catch (e) { alert(e.message); }
}

/* ---------- Announcements ---------- */
let editingAnnouncementId = null;
let annRows = [];

async function loadAnnouncements() {
  const el = document.getElementById('tab-announcements');
  const rows = await api('/announcements/all');
  annRows = rows;
  const editing = editingAnnouncementId != null ? rows.find(a => String(a.id) === String(editingAnnouncementId)) : null;
  el.innerHTML = `
    <div class="card"><h3>${editing ? 'Edit announcement #' + editing.id : 'New announcement'}</h3>
      <label>Title</label><input id="aTitle" value="${editing ? esc(editing.title) : ''}">
      <label>Content</label><textarea id="aBody" rows="3">${editing ? esc(editing.content) : ''}</textarea>
      <label>Audience</label>
      <select id="aAud">
        ${['GENERAL','CLIENT','COLLECTOR'].map(x => `<option ${editing && editing.audience === x ? 'selected' : ''}>${x}</option>`).join('')}
      </select>
      <p><button class="btn green" data-action="post-ann">${editing ? 'Save changes' : 'Publish'}</button>
      ${editing ? `<button class="btn grey" data-action="cancel-ann">Cancel edit</button>` : ''}</p></div>
    <div class="card"><h3>All announcements</h3><table>
      <tr><th>Title</th><th>Audience</th><th>Active</th><th>Created</th><th></th></tr>
      ${rows.map(a => `<tr><td><b>${esc(a.title)}</b><br><span class="muted">${esc(a.content)}</span></td>
        <td>${a.audience}</td><td>${a.isActive ? 'Yes' : 'No'}</td><td>${when(a.createdAt)}</td>
        <td>
          <button class="btn grey" data-action="edit-ann" data-id="${a.id}">Edit</button>
          <button class="btn red" data-action="delete-ann" data-id="${a.id}">Delete</button>
        </td></tr>`).join('') || '<tr><td colspan=5 class=muted>None yet.</td></tr>'}
    </table></div>`;
}
async function postAnnouncement() {
  try {
    const body = { title:aTitle.value, content:aBody.value, audience:aAud.value };
    if (editingAnnouncementId) {
      await api(`/announcements/${editingAnnouncementId}`, { method:'PATCH', body });
    } else {
      await api('/announcements', { method:'POST', body });
    }
    editingAnnouncementId = null;
    loadAnnouncements();
  } catch (e) { alert(e.message); }
}
function editAnnouncement(id) { editingAnnouncementId = id; loadAnnouncements(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
function cancelEdit() { editingAnnouncementId = null; }
async function deleteAnnouncement(id) {
  if (!confirm('Delete this announcement permanently?')) return;
  try {
    if (editingAnnouncementId === id) editingAnnouncementId = null;
    await api(`/announcements/${id}`, { method:'DELETE' });
    loadAnnouncements();
  } catch (e) { alert(e.message); }
}
/* ---------- Support ---------- */
let openTicketId = null;
async function loadTickets(status = 'OPEN') {
  const el = document.getElementById('tab-support');
  if (openTicketId) return renderTicket(el);
  const rows = await api('/support' + (status && status !== 'ALL' ? '?status=' + status : ''));
  el.innerHTML = `
    <div class="card"><h3>Support tickets</h3>
      <select data-action="load-tickets" style="width:auto">
        ${['OPEN','RESOLVED','ALL'].map(s => `<option ${s===status?'selected':''}>${s}</option>`).join('')}
      </select></div>
    <div class="card"><table>
      <tr><th>ID</th><th>Subject</th><th>From</th><th>Status</th><th>Created</th><th></th></tr>
      ${rows.map(t => `<tr><td>${t.id}</td><td>${esc(t.subject)}</td><td>${esc(t.owner?.name)}</td>
        <td><span class="pill ${t.status}">${t.status}</span></td><td>${when(t.createdAt)}</td>
        <td><button class="btn grey" data-action="open-ticket" data-id="${t.id}">Open</button></td></tr>`).join('') || '<tr><td colspan=6 class=muted>No tickets.</td></tr>'}
    </table></div>`;
}
async function openTicket(id) { openTicketId = id; renderTicket(document.getElementById('tab-support')); }
async function renderTicket(el) {
  const t = await api('/support/' + openTicketId);
  el.innerHTML = `
    <div class="card">
      <button class="btn grey" data-action="back-tickets">Back</button>
      <h3>#${t.id} ${esc(t.subject)} <span class="pill ${t.status}">${t.status}</span></h3>
      <div style="display:flex;flex-direction:column">
        ${(t.messages||[]).map(m => `<div class="msg ${m.sender?.role === 'ADMIN' ? 'admin' : 'user'}">
          <b>${esc(m.sender?.name)}</b> <span class="muted">${when(m.createdAt)}</span><br>${esc(m.message)}</div>`).join('')}
      </div>
      ${t.status === 'OPEN' ? `
        <label>Reply</label><textarea id="tReply" rows="2"></textarea>
        <p>
          <button class="btn green" data-action="reply-ticket" data-id="${t.id}">Send reply</button>
          <button class="btn grey" data-action="close-ticket" data-id="${t.id}">Mark resolved</button>
        </p>` : ''}
    </div>`;
}
async function replyTicket(id) {
  try { await api(`/support/${id}/messages`, { method:'POST', body:{ message:tReply.value } }); renderTicket(document.getElementById('tab-support')); }
  catch (e) { alert(e.message); }
}
async function closeTicket(id) {
  try { await api(`/support/${id}/resolve`, { method:'POST' }); openTicketId = null; loadTickets(); }
  catch (e) { alert(e.message); }
}

/* ---------- Materials & Prices ---------- */
async function loadMaterials() {
  const el = document.getElementById('tab-materials');
  const rows = await api('/materials');
  el.innerHTML = `
    <div class="card"><h3>Add material</h3>
      <label>Name</label><input id="mName" placeholder="e.g. Plain Sheet">
      <label>Price per kg (PHP)</label><input id="mPrice" type="number" min="0" step="0.01" placeholder="e.g. 15.00">
      <p><button class="btn green" data-action="add-material">Add material</button></p></div>
    <div class="card"><h3>All materials (${rows.length})</h3>
      <p class="muted">Hidden materials disappear from the client's booking form but old bookings keep their original prices.</p>
      <table>
      <tr><th>Name</th><th>Price / kg</th><th>Status</th><th></th></tr>
      ${rows.map(m => `<tr>
        <td><input id="mName-${m.id}" value="${esc(m.name)}"></td>
        <td style="max-width:150px"><input id="mPrice-${m.id}" type="number" min="0" step="0.01" value="${Number(m.pricePerKg).toFixed(2)}"></td>
        <td>${m.isActive ? '<span class="pill CONFIRMED">Active</span>' : '<span class="pill">Hidden</span>'}</td>
        <td>
          <button class="btn green" data-action="save-material" data-id="${m.id}">Save</button>
          <button class="btn grey" data-action="toggle-material" data-id="${m.id}" data-active="${!m.isActive}">${m.isActive ? 'Hide' : 'Show'}</button>
        </td></tr>`).join('') || '<tr><td colspan=4 class=muted>No materials yet.</td></tr>'}
      </table></div>`;
}
async function addMaterial() {
  try {
    await api('/materials', { method:'POST', body:{ name:mName.value, pricePerKg:Number(mPrice.value) } });
    mName.value = ''; mPrice.value = '';
    loadMaterials();
  } catch (e) { alert(e.message); }
}
async function saveMaterial(id) {
  const name = document.getElementById('mName-' + id).value;
  const pricePerKg = Number(document.getElementById('mPrice-' + id).value);
  if (!name.trim()) return alert('Name cannot be empty.');
  if (isNaN(pricePerKg) || pricePerKg < 0) return alert('Price must be a positive number.');
  try {
    await api(`/materials/${id}`, { method:'PATCH', body:{ name, pricePerKg } });
    loadMaterials();
  } catch (e) { alert(e.message); }
}
async function toggleMaterial(id, isActive) {
  try {
    await api(`/materials/${id}`, { method:'PATCH', body:{ isActive } });
    loadMaterials();
  } catch (e) { alert(e.message); }
}
/* ---------- Stats ---------- */
let statPeriod = '';
function monthValue(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}
function periodLabel(p) {
  if (!p) return 'all time';
  const [y, m] = p.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleString('en-PH', { month: 'long', year: 'numeric' });
}
async function loadStats(period) {
  if (period !== undefined) statPeriod = period;
  const s = await api('/stats/admin' + (statPeriod ? '?period=' + encodeURIComponent(statPeriod) : ''));
  const orders = Object.entries(s.ordersByStatus || {}).map(([k,v]) =>
    `<div class="stat"><b>${v}</b>${k.replaceAll('_',' ')}</div>`).join('');
  const invRows = (s.materialsInventory || []).map(m => {
    const left = m.collectedKg - m.disposedKg;
    const pill = left > 0
      ? `<span class="pill warn">On storage · ${left.toFixed(1)} kg</span>`
      : `<span class="pill ok">Disposed</span>`;
    const btn = left > 0
      ? `<button data-action="dispose-material" data-id="${m.materialId}" data-name="${esc(m.material)}">Dispose…</button>`
      : '';
    return `<tr><td>${esc(m.material)}</td><td>${m.collectedKg.toFixed(1)} kg</td><td>${pill}</td><td>${btn}</td></tr>`;
  }).join('');
  const now = new Date();
  const curM = monthValue(now);
  const prevM = monthValue(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const selVal = !statPeriod ? '' : statPeriod === curM ? '__current' : statPeriod === prevM ? '__prev' : '__custom';
  document.getElementById('tab-stats').innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap">
      <b>Period:</b>
      <select data-action="stat-period">
        <option value="" ${selVal===''?'selected':''}>All time</option>
        <option value="__current" ${selVal==='__current'?'selected':''}>Current month</option>
        <option value="__prev" ${selVal==='__prev'?'selected':''}>Previous month</option>
        <option value="__custom" ${selVal==='__custom'?'selected':''}>Custom…</option>
      </select>
      <input type="month" id="stat-month-input" value="${statPeriod||''}" style="display:${selVal==='__custom'?'':'none'}" data-action="load-stats-month">
      <span id="stat-period-label" class="muted">${esc(periodLabel(s.period))}</span>
    </div>
    <div class="stats">
      <div class="stat"><b>${s.totalClients}</b>Clients</div>
      <div class="stat"><b>${s.totalCollectors}</b>Collectors</div>
      <div class="stat"><b>${s.totalTransactions ?? 0}</b>Transactions</div>
      <div class="stat"><b>P${Number(s.totalMoneyProcessed ?? 0).toFixed(2)}</b>Total earnings</div>
      <div class="stat"><b>${Number(s.totalKilogramsRecycled ?? 0).toFixed(1)} kg</b>Waste collected</div>
      <div class="stat"><b>P${Number(s.systemFeesCollected ?? 0).toFixed(2)}</b>System fees (${s.systemFeePercent ?? 20}%)</div>
    </div>
    <h3 style="margin-top:20px">Orders by status</h3>
    <div class="stats">${orders}</div>
    <h3 style="margin-top:20px">Materials inventory</h3>
    <div class="card"><table>
      <tr><th>Materials</th><th>Collected</th><th>Status</th><th></th></tr>${invRows}
    </table></div>
    <h3 style="margin-top:20px">Collector eCoin balances</h3>
    <div class="card"><table>
      <tr><th>Collector</th><th>Balance</th></tr>
      ${(s.collectorBalances||[]).map(b => {
        const low = b.balance <= 0;
        return `<tr><td>${esc(b.name)}</td><td style="${low ? 'color:#c62828;font-weight:bold' : ''}">P${Number(b.balance).toFixed(2)}${low ? ' — needs top-up' : ''}</td></tr>`;
      }).join('') || '<tr><td colspan="2">No collectors yet</td></tr>'}
    </table></div>`;
}
function onStatPeriodChange(v) {
  document.getElementById('stat-month-input').style.display = v === '__custom' ? '' : 'none';
  if (v === '__custom') return;
  const now = new Date();
  loadStats(
    v === '__current' ? monthValue(now)
    : v === '__prev' ? monthValue(new Date(now.getFullYear(), now.getMonth() - 1, 1))
    : ''
  );
}
async function disposeMaterial(id, name) {
  const input = prompt(`Weight (kg) of ${name} sent for disposal:`);
  if (input === null) return;
  const kg = Number(input);
  if (!(kg > 0)) return alert('Enter a valid weight.');
  try {
    await api(`/materials/${id}/disposals`, { method: 'POST', body: { weightKg: kg } });
    loadStats();
  } catch (e) { alert(e.message); }
}
/* ---------- Directories ---------- */
async function loadCollectors() {
  const rows = await api('/users/collectors');
  document.getElementById('tab-collectors').innerHTML = `
    <div class="card"><h3>Collectors</h3><table>
      <tr><th>Name</th><th>Account #</th><th>Contact</th><th>Address</th><th>eCoin balance</th></tr>
      ${rows.map(c => `<tr>
        <td>${esc(c.name)}</td>
        <td>${esc(c.accountNumber || '')}</td>
        <td>${esc(c.contactNumber || '')}</td>
        <td>${esc(c.address || '')}</td>
        <td style="${c.ecoinBalance <= 0 ? 'color:#c62828;font-weight:bold' : ''}">P${Number(c.ecoinBalance).toFixed(2)}${c.ecoinBalance <= 0 ? ' — needs top-up' : ''}</td>
      </tr>`).join('') || '<tr><td colspan="5">No collectors yet</td></tr>'}
    </table></div>`;
}

async function loadClients() {
  const rows = await api('/users/clients');
  document.getElementById('tab-clients').innerHTML = `
    <div class="card"><h3>Clients</h3><table>
      <tr><th>Name</th><th>Address</th><th>Contact number</th></tr>
      ${rows.map(c => `<tr>
        <td>${esc(c.name)}</td>
        <td>${esc(c.address || '')}</td>
        <td>${esc(c.contactNumber || '')}</td>
      </tr>`).join('') || '<tr><td colspan="3">No clients yet</td></tr>'}
    </table></div>`;
}

/* ---------- Pending confirmations ---------- */
const minsLeft = t => Math.max(0, Math.round((new Date(t) - Date.now()) / 60000));
async function loadPending() {
  const el = document.getElementById('tab-pending');
  const rows = await api('/transactions/pending');
  el.innerHTML = `
    <div class="card">
      <h3>Pending confirmations (${rows.length})</h3>
      <p class="muted">Awaiting client approval. Auto-completes 1 hour after weighing &mdash; or force either outcome here.</p>
      <button data-action="auto-complete">Auto-complete overdue now</button>
      <table style="margin-top:10px">
        <tr><th>ID</th><th>Client</th><th>Collector</th><th>Gross</th><th>Fee</th><th>Net to client</th><th>Deadline</th><th>Photo</th><th>Action</th></tr>
        ${rows.map(x => `<tr>
          <td>#${x.id}</td>
          <td>${esc((x.client || {}).name || '')}</td>
          <td>${esc((x.collector || {}).name || '')}</td>
          <td>P${Number(x.totalAmount).toFixed(2)}</td>
          <td>P${Number(x.systemFee || 0).toFixed(2)}</td>
          <td>P${Number(x.netAmount ?? x.totalAmount).toFixed(2)}</td>
          <td>${minsLeft(x.confirmationDeadline)} min left</td>
          <td>${x.photoUrl ? `<a href="${API}${esc(x.photoUrl)}" target="_blank">view</a>` : '-'}</td>
          <td><button data-action="confirm-tx" data-id="${x.id}">Confirm now</button></td>
        </tr>`).join('') || '<tr><td colspan="9" class="muted">Nothing pending right now.</td></tr>'}
      </table>
    </div>`;
}

async function confirmTx(id) {
  if (!confirm(`Confirm payment for transaction #${id} on behalf of the client?`)) return;
  try {
    await api('/transactions/' + id + '/confirm', { method: 'POST', body: {} });
    loadPending();
  } catch (e) { alert(e.message); }
}

async function runAutoComplete() {
  try {
    const r = await api('/admin/run-auto-complete', { method: 'POST', body: {} });
    if (r && r.message) alert(r.message);
    loadPending();
  } catch (e) { alert(e.message); }
}

/* ---------- Event Delegation ---------- */
document.addEventListener('click', e => {
  const t = e.target.closest('[data-action]');
  if (!t) return;


  const action = t.dataset.action;
  const id = t.dataset.id ? Number(t.dataset.id) : undefined;

  switch (action) {
    case 'login': login(); break;
    case 'logout': logout(); break;
    case 'decide': decideTopup(id, t.dataset.decision); break;
    case 'post-ann': postAnnouncement(); break;
    case 'cancel-ann': cancelEdit(); loadAnnouncements(); break;
    case 'edit-ann': editAnnouncement(id); break;
    case 'delete-ann': deleteAnnouncement(id); break;
    case 'open-ticket': openTicket(id); break;
    case 'back-tickets': openTicketId = null; loadTickets(); break;
    case 'reply-ticket': replyTicket(id); break;
    case 'close-ticket': closeTicket(id); break;
    case 'add-material': addMaterial(); break;
    case 'save-material': saveMaterial(id); break;
    case 'toggle-material': toggleMaterial(id, t.dataset.active === 'true'); break;
    case 'dispose-material': disposeMaterial(id, t.dataset.name); break;
    case 'auto-complete': runAutoComplete(); break;
    case 'confirm-tx': confirmTx(id); break;
  }
});

document.addEventListener('change', e => {
  const t = e.target;
  const action = t.dataset.action;
  if (!action) return;

  switch (action) {
    case 'load-topups': loadTopups(t.value); break;
    case 'load-tickets': loadTickets(t.value); break;
    case 'stat-period': onStatPeriodChange(t.value); break;
    case 'load-stats-month': loadStats(t.value); break;
  }
});

/* Nav buttons use data-tab, handled separately */
document.querySelector('nav').addEventListener('click', e => {
  const btn = e.target.closest('[data-tab]');
  if (btn) show(btn.dataset.tab);
});

/* boot */
if (TOKEN) {
  api('/auth/me').then(u => { if (u.user.role === 'ADMIN' || u.role === 'ADMIN') { ME = u.user || u; enter(); } })
    .catch(() => localStorage.removeItem('adminToken'));
}
