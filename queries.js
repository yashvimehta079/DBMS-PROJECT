/* Queries page JS
   - Expects backend endpoints:
     GET  /api/queries            -> returns array of queries [{query_id, user_id, user_name, subject, message, status, created_at, replies:[{by, msg, at}], ...}]
     GET  /api/queries/summary    -> { total, pending, resolved }
     GET  /api/queries/recent     -> [{query_id, user_name, subject, created_at}, ...] (recent pending)
     POST /api/queries/reply      -> { query_id, reply }  (body JSON)
     POST /api/queries/resolve    -> { query_id }         (body JSON)
     POST /api/queries/delete     -> { query_id }         (body JSON)   // admin only
     GET  /api/me                 -> { role: 'admin'|'staff' }
*/

const API_BASE = '/api/queries';
const ENDPOINTS = {
    list: API_BASE,
    summary: `${API_BASE}/summary`,
    recent: `${API_BASE}/recent`,
    reply: (id) => `${API_BASE}/reply/${id}`,
    resolve: (id) => `${API_BASE}/resolve/${id}`,
    del: (id) => `${API_BASE}/delete/${id}`,
    me: '/api/me'
};

let queries = [];
let currentPage = 1;
const perPage = 6;
let sortField = null;
let sortAsc = true;
let USER_ROLE = 'staff'; // fallback
let autoRefreshTimer = null;
const AUTO_REFRESH_INTERVAL = 30000; // 30s

// DOM refs
const $ = id => document.getElementById(id);

// init
document.addEventListener('DOMContentLoaded', async () => {
    // get user role if endpoint available
    try {
        const r = await fetch(ENDPOINTS.me);
        if (r.ok) {
            const me = await r.json();
            USER_ROLE = me.role || USER_ROLE;
        }
    } catch (e) { /* ignore */ }

    // attach handlers
    $('refreshQueries').addEventListener('click', loadAll);
    $('searchQuery').addEventListener('input', onFilterChange);
    $('filterStatus').addEventListener('change', onFilterChange);
    $('prevPage').addEventListener('click', () => changePage(-1));
    $('nextPage').addEventListener('click', () => changePage(1));
    $('exportCsv').addEventListener('click', exportCsv);
    $('exportXls').addEventListener('click', exportXls);
    $('exportPdf').addEventListener('click', exportPdf);
    $('autoRefreshToggle').addEventListener('change', onAutoToggle);
    $('openQueriesAll').addEventListener('click', (e) => { e.preventDefault(); window.open('queries.html', '_blank'); });

    // table header sorting
    document.querySelectorAll('#queryTable th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const key = th.dataset.sort;
            if (sortField === key) sortAsc = !sortAsc;
            else { sortField = key; sortAsc = true; }
            renderTable();
        });
    });

    // theme toggle
    initTheme();

    // load initial data
    await loadSummary();
    await loadRecent();
    await loadAll();

    // auto-refresh initial state from localStorage
    const auto = localStorage.getItem('queries_auto_refresh') === 'true';
    $('autoRefreshToggle').checked = auto;
    if (auto) startAutoRefresh();
});

// Load summary (counts + chart)
async function loadSummary() {
    try {
        const r = await fetch(ENDPOINTS.summary);
        if (!r.ok) throw new Error('no summary');
        const s = await r.json();
        $('statTotal').innerText = s.total ?? '—';
        $('statPending').innerText = s.pending ?? '—';
        $('statResolved').innerText = s.resolved ?? '—';
        renderChart(s.pending ?? 0, s.resolved ?? 0);
    } catch (e) {
        // fallback: blanks
        $('statTotal').innerText = '—';
        $('statPending').innerText = '—';
        $('statResolved').innerText = '—';
        renderChart(0, 0);
    }
}

function renderChart(pending, resolved) {
    try {
        const ctx = document.getElementById('queriesChart').getContext('2d');
        if (window._queriesChart) window._queriesChart.destroy();
        window._queriesChart = new Chart(ctx, {
            type: 'doughnut',
            data: { labels: ['Pending', 'Resolved'], datasets: [{ data: [pending, resolved], backgroundColor: ['#f5e6a1', '#2ecc71'] }] },
            options: { plugins: { legend: { position: 'bottom', labels: { color: '#eee' } } }, responsive: true }
        });
    } catch (e) { /* chart failed */ }
}

// recent notifications
async function loadRecent() {
    try {
        const r = await fetch(ENDPOINTS.recent);
        if (!r.ok) throw new Error('no recent');
        const list = await r.json();
        updateNotif(list);
    } catch (e) {
        updateNotif([]);
    }
}
function updateNotif(list) {
    const count = list.length || 0;
    const b = $('notifCount');
    const l = $('notifList');
    if (count > 0) { b.innerText = count; b.classList.remove('d-none'); } else { b.classList.add('d-none'); }
    l.innerHTML = '';
    if (!list.length) { l.innerHTML = '<div class="text-muted small">No new pending queries</div>'; return; }
    list.slice(0, 6).forEach(q => {
        const item = document.createElement('div');
        item.className = 'py-1 border-bottom';
        item.innerHTML = `<strong>${escapeHtml(q.user_name)}</strong> — <span class="small text-muted">${escapeHtml(q.subject)}</span><div class="small text-muted">${q.created_at}</div>`;
        item.addEventListener('click', () => openModalById(q.query_id));
        l.appendChild(item);
    });
}

// load all queries
async function loadAll() {
    try {
        const r = await fetch(ENDPOINTS.list);
        if (!r.ok) throw new Error('no queries');
        queries = await r.json();
    } catch (e) {
        queries = []; // keep it empty rather than fake data
        console.warn('Failed to load queries', e);
    }
    currentPage = 1;
    renderTable();
    await loadSummary();
    await loadRecent();
}

// render table with filtering, sorting, pagination
function renderTable() {
    const tbody = $('queryBody'); tbody.innerHTML = '';
    let data = getFiltered();

    // sorting
    if (sortField) {
        data.sort((a, b) => {
            const A = (a[sortField] ?? '').toString().toLowerCase();
            const B = (b[sortField] ?? '').toString().toLowerCase();
            return sortAsc ? A.localeCompare(B) : B.localeCompare(A);
        });
    }

    const totalPages = Math.max(1, Math.ceil(data.length / perPage));
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * perPage;
    const pageData = data.slice(start, start + perPage);

    pageData.forEach(q => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
      <td>${q.query_id}</td>
      <td>${escapeHtml(q.user_name || q.user_id || '—')}</td>
      <td>${escapeHtml(q.subject || '—')}</td>
      <td class="text-truncate" style="max-width:300px;">${escapeHtml(q.message || '—')}</td>
      <td><span class="badge ${badgeClass(q.status)}">${escapeHtml(q.status || '—')}</span></td>
      <td>${escapeHtml(q.created_at || '—')}</td>
      <td>
        <button class="btn btn-sm btn-gold me-1" onclick="openModalById(${q.query_id})"><i class="fa fa-eye"></i></button>
        <button class="btn btn-sm btn-outline-light me-1" onclick="openReplyQuick(${q.query_id})"><i class="fa fa-reply"></i></button>
        ${q.status === 'Pending' ? `<button class="btn btn-sm btn-outline-light me-1" onclick="resolveQuery(${q.query_id})"><i class="fa fa-check"></i></button>` : ''}
        ${USER_ROLE === 'admin' ? `<button class="btn btn-sm btn-danger" onclick="deleteQuery(${q.query_id})"><i class="fa fa-trash"></i></button>` : ''}
      </td>`;
        tbody.appendChild(tr);
    });

    $('pageInfo').innerText = `Showing ${Math.min(data.length, start + 1)}–${Math.min(data.length, start + pageData.length)} of ${data.length} results — Page ${currentPage} / ${totalPages}`;
    $('prevPage').disabled = currentPage <= 1;
    $('nextPage').disabled = currentPage >= totalPages;
}

// helpers
function badgeClass(status) {
    if (!status) return 'bg-secondary';
    switch (status.toLowerCase()) {
        case 'pending': return 'bg-warning text-dark';
        case 'resolved': return 'bg-success';
        default: return 'bg-secondary';
    }
}
function getFiltered() {
    const q = $('searchQuery').value.trim().toLowerCase();
    const status = $('filterStatus').value;
    return queries.filter(item => {
        const matchSearch = !q || (
            (item.user_name && item.user_name.toLowerCase().includes(q)) ||
            (item.subject && item.subject.toLowerCase().includes(q)) ||
            (item.message && item.message.toLowerCase().includes(q)) ||
            (item.query_id && item.query_id.toString().includes(q))
        );
        const matchStatus = !status || item.status === status;
        return matchSearch && matchStatus;
    });
}
function changePage(dir) { currentPage = Math.max(1, currentPage + dir); renderTable(); }
function onFilterChange() { currentPage = 1; renderTable(); }

// modal helpers
let currentModalQuery = null;
async function openModalById(id) {
    const q = queries.find(x => x.query_id === id);
    if (!q) return;
    currentModalQuery = q;
    $('modalMeta').innerText = `Query #${q.query_id} • ${q.user_name} • ${q.created_at}`;
    $('modalMessageBox').innerText = q.message || '—';
    // history
    const hist = q.replies && q.replies.length ? q.replies : [];
    const histEl = $('historyList'); histEl.innerHTML = '';
    if (!hist.length) histEl.innerHTML = '<div class="small text-muted">No replies yet</div>';
    hist.forEach(r => {
        const div = document.createElement('div');
        div.className = 'mb-2';
        div.innerHTML = `<div class="small text-muted">${escapeHtml(r.by)} • ${escapeHtml(r.at)}</div><div class="p-2" style="background: rgba(255,255,255,0.02); border-radius:6px;">${escapeHtml(r.msg)}</div>`;
        histEl.appendChild(div);
    });

    // modal controls based on role
    $('resolveBtn').classList.toggle('d-none', q.status === 'Resolved');
    $('deleteBtn').classList.toggle('d-none', USER_ROLE !== 'admin');

    // send reply button
    $('sendReplyBtn').onclick = async () => {
        await sendReply(q.query_id);
    };

    // resolve, delete
    $('resolveBtn').onclick = async () => {
        await resolveQuery(q.query_id);
        bootstrap.Modal.getInstance(document.getElementById('replyModal'))?.hide();
    };
    $('deleteBtn').onclick = async () => {
        if (!confirm('Delete this query?')) return;
        await deleteQuery(q.query_id);
        bootstrap.Modal.getInstance(document.getElementById('replyModal'))?.hide();
    };

    new bootstrap.Modal(document.getElementById('replyModal')).show();
}

// quick reply (open modal and focus textarea)
function openReplyQuick(id) {
    openModalById(id);
    setTimeout(() => $('replyMessage').focus(), 300);
}

// send reply
async function sendReply(id) {
    const msg = $('replyMessage').value.trim();
    if (!msg) { alert('Please enter a reply.'); return; }
    try {
        const r = await fetch(ENDPOINTS.reply(id), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reply: msg })
        });
        if (!r.ok) throw new Error('Reply failed');
        $('replyMessage').value = '';
        // reload queries to reflect reply
        await loadAll();
        // show success
        toast('Reply sent');
    } catch (e) {
        console.error(e); toast('Failed to send reply', true);
    }
}

// resolve
async function resolveQuery(id) {
    try {
        const r = await fetch(ENDPOINTS.resolve(id), { method: 'POST' });
        if (!r.ok) throw new Error('Resolve failed');
        await loadAll();
        toast('Query resolved');
    } catch (e) { console.error(e); toast('Failed to resolve', true); }
}

// delete
async function deleteQuery(id) {
    if (USER_ROLE !== 'admin') return alert('Only admin can delete.');
    try {
        const r = await fetch(ENDPOINTS.del(id), { method: 'POST' });
        if (!r.ok) throw new Error('Delete failed');
        await loadAll();
        toast('Query deleted');
    } catch (e) { console.error(e); toast('Failed to delete', true); }
}

// export CSV/XLS/PDF
function exportCsv() {
    const rows = [['Query ID', 'User', 'Subject', 'Message', 'Status', 'Date']];
    getFiltered().forEach(q => rows.push([q.query_id, q.user_name, q.subject, q.message, q.status, q.created_at]));
    downloadCSV(rows, 'queries.csv');
}
function exportXls() {
    const rows = [['Query ID', 'User', 'Subject', 'Message', 'Status', 'Date']];
    getFiltered().forEach(q => rows.push([q.query_id, q.user_name, q.subject, q.message, q.status, q.created_at]));
    // save as .xls (CSV format) for Excel compatibility
    downloadCSV(rows, 'queries.xls');
}
function exportPdf() {
    // print-friendly popup
    const win = window.open('', '_blank');
    const rows = getFiltered();
    let html = `<html><head><title>Queries</title><style>body{font-family:Arial}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ddd;padding:6px}</style></head><body><h3>Queries Export</h3><table><tr><th>ID</th><th>User</th><th>Subject</th><th>Message</th><th>Status</th><th>Date</th></tr>`;
    rows.forEach(q => {
        html += `<tr><td>${escapeHtml(q.query_id)}</td><td>${escapeHtml(q.user_name)}</td><td>${escapeHtml(q.subject)}</td><td>${escapeHtml(q.message)}</td><td>${escapeHtml(q.status)}</td><td>${escapeHtml(q.created_at)}</td></tr>`;
    });
    html += `</table></body></html>`;
    win.document.write(html); win.document.close();
    win.print();
}

function downloadCSV(rows, filename) {
    const csv = rows.map(r => r.map(cell => `"${(cell ?? '').toString().replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
}

// auto-refresh
function startAutoRefresh() {
    stopAutoRefresh();
    autoRefreshTimer = setInterval(() => { loadAll(); }, AUTO_REFRESH_INTERVAL);
}
function stopAutoRefresh() { if (autoRefreshTimer) { clearInterval(autoRefreshTimer); autoRefreshTimer = null; } }
function onAutoToggle(e) {
    const on = e.target.checked;
    localStorage.setItem('queries_auto_refresh', on);
    if (on) startAutoRefresh(); else stopAutoRefresh();
}

// small toast
function toast(msg, isError = false) {
    const d = document.createElement('div');
    d.className = 'position-fixed top-0 end-0 m-3 p-2 rounded shadow';
    d.style.background = isError ? 'rgba(255,60,60,0.95)' : 'rgba(212,175,55,0.95)';
    d.style.color = isError ? '#fff' : '#000';
    d.innerText = msg;
    document.body.appendChild(d);
    setTimeout(() => { d.style.opacity = 0; setTimeout(() => d.remove(), 400); }, 2000);
}

// util: escape
function escapeHtml(s) { if (s == null) return ''; return String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;'); }

// theme toggle (dark/gold base) — remembers in localStorage
function initTheme() {
    const cur = localStorage.getItem('site_theme') || 'dark';
    applyTheme(cur);
    $('themeToggle').addEventListener('click', () => {
        const cur = localStorage.getItem('site_theme') || 'dark';
        const next = cur === 'dark' ? 'light' : 'dark';
        applyTheme(next);
    });
}
function applyTheme(mode) {
    localStorage.setItem('site_theme', mode);
    const icon = $('themeIcon');
    if (mode === 'light') {
        document.documentElement.style.setProperty('--dark-bg', 'linear-gradient(180deg,#f6f6f6,#eaeaea)');
        document.documentElement.style.setProperty('--text-light', '#0b2340');
        icon.className = 'fa-solid fa-sun';
    } else {
        document.documentElement.style.setProperty('--dark-bg', 'linear-gradient(135deg,#1a1a1a,#2b2b2b)');
        document.documentElement.style.setProperty('--text-light', '#eee');
        icon.className = 'fa-solid fa-moon';
    }
}

// initial recent polling (to keep notif fresh)
setInterval(() => { loadRecent(); }, 45000); // every 45s (in addition to manual auto-refresh)

