/* access.js
   Expected backend endpoints (Flask):
   GET  /api/users                -> list users with fields { user_id, username, email, role, status, privileges:[], last_updated }
   GET  /api/users/audit          -> list audit logs [{id, actor, action, target, when}]
   POST /api/users/update/{id}    -> { role, status, privileges } update single user
   POST /api/users/bulk_update    -> { ids:[], role?, status? } bulk apply
   GET  /api/me                   -> { role } optional to show/hide admin-only controls
*/

const API = {
    users: '/api/users',
    audit: '/api/users/audit',
    update: (id) => `/api/users/update/${id}`,
    bulk: '/api/users/bulk_update',
    me: '/api/me'
};

let users = [];
let audit = [];
let currentPage = 1;
const perPage = 10;
let USER_ROLE = 'staff'; // fallback
let autoTimer = null;
const AUTO_INTERVAL = 60000; // 60s

// dom helpers
const $ = id => document.getElementById(id);

// init
document.addEventListener('DOMContentLoaded', async () => {
    // fetch role
    try {
        const r = await fetch(API.me);
        if (r.ok) { const me = await r.json(); USER_ROLE = me.role || USER_ROLE; }
    } catch (e) { /* ignore */ }

    // attach events
    $('refreshBtn').addEventListener('click', loadAll);
    $('refreshAudit').addEventListener('click', loadAudit);
    $('searchUser').addEventListener('input', onFilterChange);
    $('filterRole').addEventListener('change', onFilterChange);
    $('filterStatus').addEventListener('change', onFilterChange);
    $('prevPage').addEventListener('click', () => changePage(-1));
    $('nextPage').addEventListener('click', () => changePage(1));
    $('exportCsv').addEventListener('click', exportCsv);
    $('bulkAssignBtn').addEventListener('click', openBulkModal);
    $('applyBulkBtn').addEventListener('click', applyBulk);
    $('chkAll').addEventListener('change', onToggleAll);
    $('autoRefreshToggle').addEventListener('change', onAutoToggle);

    // pagination initial
    await loadAll();
    await loadAudit();
    // auto-refresh from localStorage
    const auto = localStorage.getItem('access_auto') === 'true';
    $('autoRefreshToggle').checked = auto;
    if (auto) startAuto();
});

// fetch users
async function loadAll() {
    try {
        const r = await fetch(API.users);
        if (!r.ok) throw new Error('no users');
        users = await r.json();
    } catch (e) {
        console.warn('Failed to fetch users', e);
        users = [];
    }
    currentPage = 1;
    renderTable();
    renderStats();
}

// fetch audit
async function loadAudit() {
    try {
        const r = await fetch(API.audit);
        if (!r.ok) throw new Error('no audit');
        audit = await r.json();
    } catch (e) { audit = []; }
    const el = $('auditList'); el.innerHTML = '';
    if (!audit.length) { el.innerHTML = '<div class="small text-muted">No recent changes</div>'; return; }
    audit.slice(0, 50).forEach(a => {
        const div = document.createElement('div');
        div.className = 'mb-2';
        div.innerHTML = `<div class="small text-muted">${escapeHtml(a.when)} • ${escapeHtml(a.actor)}</div><div>${escapeHtml(a.action)} <span class="small text-muted">→</span> <strong>${escapeHtml(a.target)}</strong></div>`;
        el.appendChild(div);
    });
}

// render stats
function renderStats() {
    const total = users.length;
    const admins = users.filter(u => u.role === 'admin').length;
    const staff = users.filter(u => u.role === 'staff').length;
    $('statUsers').innerText = total || '—';
    $('statAdmins').innerText = admins || '—';
    $('statStaff').innerText = staff || '—';
}

// filter, sort, paginate
function getFiltered() {
    const q = $('searchUser').value.trim().toLowerCase();
    const role = $('filterRole').value;
    const status = $('filterStatus').value;
    return users.filter(u => {
        const matchQ = !q || (u.username && u.username.toLowerCase().includes(q)) || (u.email && u.email.toLowerCase().includes(q)) || (String(u.user_id || '').includes(q));
        const matchRole = !role || u.role === role;
        const matchStatus = !status || u.status === status;
        return matchQ && matchRole && matchStatus;
    });
}

function renderTable() {
    const tbody = $('accessBody'); tbody.innerHTML = '';
    const data = getFiltered();
    const totalPages = Math.max(1, Math.ceil(data.length / perPage));
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * perPage;
    const slice = data.slice(start, start + perPage);

    slice.forEach(u => {
        const tr = document.createElement('tr');
        const privText = (u.privileges && u.privileges.length) ? u.privileges.join(', ') : '—';
        tr.innerHTML = `
      <td><input type="checkbox" class="rowChk" data-id="${u.user_id}"></td>
      <td>${u.user_id}</td>
      <td>${escapeHtml(u.username)}</td>
      <td>${escapeHtml(u.email || '—')}</td>
      <td>${escapeHtml(u.role)}</td>
      <td class="text-truncate" style="max-width:200px;">${escapeHtml(privText)}</td>
      <td>${escapeHtml(u.last_updated || '—')}</td>
      <td>
        <button class="btn btn-sm btn-outline-light me-1" onclick="openEdit(${u.user_id})"><i class="fa-solid fa-pen"></i></button>
      </td>`;
        tbody.appendChild(tr);
    });

    $('pageInfo').innerText = `Showing ${Math.min(data.length, start + 1)}–${Math.min(data.length, start + slice.length)} of ${data.length}`;
    $('prevPage').disabled = currentPage <= 1;
    $('nextPage').disabled = currentPage >= totalPages;

    // attach row checkbox events
    document.querySelectorAll('.rowChk').forEach(cb => cb.addEventListener('change', updateBulkCount));
}

// pagination
function changePage(dir) { currentPage = Math.max(1, currentPage + dir); renderTable(); }
function onFilterChange() { currentPage = 1; renderTable(); }

// open edit modal for a user
function openEdit(id) {
    const u = users.find(x => x.user_id === id);
    if (!u) return;
    $('editUserId').value = u.user_id;
    $('editUsername').innerText = u.username;
    $('editEmail').innerText = u.email || '—';
    $('editRole').value = u.role;
    $('editStatus').value = u.status || 'active';
    // privileges
    const privWrap = $('privilegeToggles'); privWrap.innerHTML = '';
    const allPrivs = ['SELECT', 'INSERT', 'UPDATE', 'DELETE']; // UI-level list, server enforces actual DB GRANTs
    allPrivs.forEach(p => {
        const chk = document.createElement('div');
        chk.innerHTML = `<div class="form-check form-switch me-2"><input class="form-check-input privChk" type="checkbox" id="priv_${p}" ${u.privileges && u.privileges.includes(p) ? 'checked' : ''}><label class="form-check-label small" for="priv_${p}">${p}</label></div>`;
        privWrap.appendChild(chk);
    });

    $('saveAccessBtn').onclick = saveAccess;
    new bootstrap.Modal(document.getElementById('editModal')).show();
}

// save single user access
async function saveAccess() {
    const id = $('editUserId').value;
    const payload = {
        role: $('editRole').value,
        status: $('editStatus').value,
        privileges: Array.from(document.querySelectorAll('.privChk')).filter(i => i.checked).map(i => i.id.replace('priv_', ''))
    };
    try {
        const r = await fetch(API.update(id), {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        });
        if (!r.ok) throw new Error('update failed');
        toast('Saved changes');
        await loadAll();
        await loadAudit();
        bootstrap.Modal.getInstance(document.getElementById('editModal'))?.hide();
    } catch (e) {
        console.error(e); toast('Failed to save', true);
    }
}

// bulk actions
function onToggleAll(e) {
    const checked = e.target.checked;
    document.querySelectorAll('.rowChk').forEach(cb => cb.checked = checked);
    updateBulkCount();
}
function updateBulkCount() {
    const count = document.querySelectorAll('.rowChk:checked').length;
    $('bulkCount').innerText = count;
}

// open bulk modal
function openBulkModal() {
    const count = document.querySelectorAll('.rowChk:checked').length;
    if (count === 0) return alert('Select at least one user for bulk update.');
    $('bulkCount').innerText = count;
    new bootstrap.Modal(document.getElementById('bulkModal')).show();
}

// apply bulk updates
async function applyBulk() {
    const ids = Array.from(document.querySelectorAll('.rowChk:checked')).map(i => Number(i.dataset.id));
    const payload = {
        ids,
        role: $('bulkRole').value || undefined,
        status: $('bulkStatus').value || undefined
    };
    try {
        const r = await fetch(API.bulk, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!r.ok) throw new Error('bulk failed');
        toast('Bulk update applied');
        await loadAll();
        await loadAudit();
        bootstrap.Modal.getInstance(document.getElementById('bulkModal'))?.hide();
    } catch (e) {
        console.error(e); toast('Failed bulk update', true);
    }
}

// export CSV
function exportCsv() {
    const data = getFiltered().map(u => [u.user_id, u.username, u.email, u.role, (u.privileges || []).join(';'), u.status, u.last_updated]);
    const rows = [['User ID', 'Username', 'Email', 'Role', 'Privileges', 'Status', 'Last Updated'], ...data];
    downloadCSV(rows, 'user_access.csv');
}
function downloadCSV(rows, filename) {
    const csv = rows.map(r => r.map(cell => `"${(cell ?? '').toString().replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click(); a.remove();
}

// auto-refresh handling
function startAuto() { stopAuto(); autoTimer = setInterval(() => { loadAll(); loadAudit(); }, AUTO_INTERVAL); }
function stopAuto() { if (autoTimer) { clearInterval(autoTimer); autoTimer = null; } }
function onAutoToggle(e) { const on = e.target.checked; localStorage.setItem('access_auto', on); if (on) startAuto(); else stopAuto(); }

// small toast
function toast(msg, isError = false) {
    const d = document.createElement('div');
    d.className = 'position-fixed top-0 end-0 m-3 p-2 rounded shadow';
    d.style.background = isError ? 'rgba(255,60,60,0.95)' : 'rgba(212,175,55,0.95)';
    d.style.color = isError ? '#fff' : '#000';
    d.innerText = msg;
    document.body.appendChild(d);
    setTimeout(() => { d.style.opacity = 0; setTimeout(() => d.remove(), 400); }, 1800);
}

// util
function escapeHtml(s) { if (s == null) return ''; return String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;'); }
