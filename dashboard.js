// Dashboard JS — final black–gold theme (backend-ready, no fake data)

const API = {
    summary: '/api/admin/summary',
    revenue: '/api/admin/revenue',
    roles: '/api/admin/roles',
    recentBookings: '/api/admin/recent_bookings',
    users: '/api/admin/users',
    access: '/api/admin/access',
    transactions: '/api/admin/transactions',
    rooms: '/api/admin/rooms'
};

// ---------- Utility ----------
function fmtAmt(n) {
    if (n == null || n === "") return '—';
    return '₹' + Number(n).toLocaleString();
}

function debounce(fn, delay = 300) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

// ---------- Initialize ----------
document.addEventListener('DOMContentLoaded', () => {
    loadSummary();
    loadRevenueChart();
    loadRoleChart();
    loadRecentBookings();
    loadRooms();
    attachEventHandlers();
});

// ---------- Event Handlers ----------
function attachEventHandlers() {
    document.getElementById('btn-refresh-users')?.addEventListener('click', loadUsers);
    document.getElementById('tx-search')?.addEventListener('input', debounce(handleTxSearch, 300));

    document.querySelector('#tbl-access tbody')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-edit-access');
        if (!btn) return;
        const tr = btn.closest('tr');
        openEditAccessModal(tr?.dataset?.userId, tr);
    });

    document.getElementById('form-edit-access')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const payload = Object.fromEntries(formData.entries());

        try {
            const res = await fetch('/api/admin/update_access', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error('Update failed');
            bootstrap.Modal.getInstance(document.getElementById('modal-edit-access')).hide();
            loadAccess();
            showInlineToast('Access updated');
        } catch {
            showInlineToast('Failed to save changes', true);
        }
    });
}

// ---------- Toast ----------
function showInlineToast(msg, isError = false) {
    const div = document.createElement('div');
    div.className = 'position-fixed top-0 end-0 m-3 p-2 rounded shadow';
    div.style.background = isError ? 'rgba(255,60,60,0.95)' : 'rgba(212,175,55,0.95)';
    div.style.color = isError ? '#fff' : '#000';
    div.innerText = msg;
    document.body.appendChild(div);
    setTimeout(() => { div.style.opacity = 0; setTimeout(() => div.remove(), 400); }, 2000);
}

// ---------- Fetch Wrapper ----------
async function fetchJson(url) {
    try {
        const r = await fetch(url);
        if (!r.ok) throw new Error('Network');
        return await r.json();
    } catch {
        console.warn('API missing or failed for', url);
        return null;
    }
}

// ---------- Summary ----------
async function loadSummary() {
    const d = await fetchJson(API.summary);
    document.getElementById('stat-total-users').innerText = d?.total_users ?? '—';
    document.getElementById('stat-total-staff').innerText = d?.total_staff ?? '—';
    document.getElementById('stat-total-guests').innerText = d?.total_guests ?? '—';
    document.getElementById('stat-total-revenue').innerText = d?.total_revenue ? fmtAmt(d.total_revenue) : '—';
}

// ---------- Revenue Chart ----------
let revenueChart;
async function loadRevenueChart() {
    const d = await fetchJson(API.revenue);
    if (!d?.length) return;
    const ctx = document.getElementById('chart-revenue').getContext('2d');
    if (revenueChart) revenueChart.destroy();
    revenueChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: d.map(x => x.month),
            datasets: [{
                label: 'Revenue',
                data: d.map(x => x.amount),
                fill: true,
                borderColor: '#d4af37',
                backgroundColor: 'rgba(212,175,55,0.25)',
                tension: 0.4,
                pointBackgroundColor: '#f5e6a1',
                pointRadius: 4
            }]
        },
        options: {
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1a1a1a',
                    titleColor: '#f5e6a1',
                    bodyColor: '#fff'
                }
            },
            scales: {
                x: { ticks: { color: '#ccc' }, grid: { color: 'rgba(255,255,255,0.1)' } },
                y: { ticks: { color: '#ccc' }, grid: { color: 'rgba(255,255,255,0.1)' } }
            }
        }
    });
}

// ---------- Role Chart ----------
let roleChart;
async function loadRoleChart() {
    const d = await fetchJson(API.roles);
    if (!d?.length) return;
    const ctx = document.getElementById('chart-roles').getContext('2d');
    if (roleChart) roleChart.destroy();
    roleChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: d.map(x => x.role),
            datasets: [{
                data: d.map(x => x.count),
                backgroundColor: ['#d4af37', 'rgba(245,230,161,0.8)', 'rgba(212,175,55,0.5)'],
                borderColor: '#000'
            }]
        },
        options: {
            plugins: {
                legend: { position: 'bottom', labels: { color: '#f5e6a1' } }
            }
        }
    });
}

// ---------- Recent Bookings ----------
async function loadRecentBookings() {
    const d = await fetchJson(API.recentBookings);
    const tb = document.querySelector('#tbl-recent-bookings tbody');
    tb.innerHTML = '';
    if (!d?.length) return;
    d.forEach(r => {
        tb.insertAdjacentHTML('beforeend',
            `<tr><td>${r.booking_id}</td><td>${r.guest_name}</td><td>${r.room_no}</td><td>${r.check_in ?? '—'}</td><td>${r.status}</td></tr>`);
    });
}

// ---------- Users ----------
async function loadUsers() {
    const d = await fetchJson(API.users);
    const tb = document.querySelector('#tbl-users tbody');
    tb.innerHTML = '';
    if (!d?.length) return;
    d.forEach(u => {
        tb.insertAdjacentHTML('beforeend',
            `<tr><td>${u.user_id}</td><td>${u.username}</td><td>${u.email ?? '—'}</td><td>${u.phone ?? '—'}</td><td>${u.role}</td><td>${u.created_at ?? '—'}</td>
            <td><button class="btn btn-sm btn-outline-primary btn-edit-user" data-id="${u.user_id}">Edit</button></td></tr>`);
    });
}

// ---------- Access ----------
async function loadAccess() {
    const d = await fetchJson(API.access);
    const tb = document.querySelector('#tbl-access tbody');
    tb.innerHTML = '';
    if (!d?.length) return;
    d.forEach(u => {
        tb.insertAdjacentHTML('beforeend',
            `<tr data-user-id="${u.user_id}"><td>${u.user_id}</td><td>${u.username}</td><td>${u.role}</td><td>${u.last_login ?? '—'}</td><td>${u.status}</td>
            <td><button class="btn btn-sm btn-outline-secondary btn-edit-access">Edit</button></td></tr>`);
    });
}

function openEditAccessModal(userId, row) {
    const m = new bootstrap.Modal('#modal-edit-access');
    const f = document.getElementById('form-edit-access');
    f.user_id.value = userId;
    f.role.value = row?.children[2]?.innerText || 'guest';
    f.status.value = row?.children[4]?.innerText || 'active';
    m.show();
}

// ---------- Transactions ----------
async function loadTransactions(q = '') {
    const d = await fetchJson(API.transactions);
    const tb = document.querySelector('#tbl-transactions tbody');
    tb.innerHTML = '';
    if (!d?.length) return;
    d.filter(r => !q || JSON.stringify(r).toLowerCase().includes(q.toLowerCase()))
        .forEach(r => {
            tb.insertAdjacentHTML('beforeend',
                `<tr><td>${r.payment_id}</td><td>${r.booking_id}</td><td>${r.guest_name}</td><td>${fmtAmt(r.amount)}</td><td>${r.mode}</td><td>${r.date}</td><td>${r.status}</td></tr>`);
        });
}
function handleTxSearch(e) { loadTransactions(e.target.value.trim()); }

// ---------- Rooms ----------
let occChart, occTypeChart;
async function loadRooms() {
    const d = await fetchJson(API.rooms);
    const tb = document.querySelector('#tbl-rooms tbody');
    tb.innerHTML = '';
    if (!d?.length) return;
    d.forEach(r => {
        tb.insertAdjacentHTML('beforeend',
            `<tr><td>${r.room_no}</td><td>${r.room_type}</td><td>${fmtAmt(r.price_per_night)}</td><td>${r.status}</td></tr>`);
    });

    const occCtx = document.getElementById('chart-occupancy').getContext('2d');
    const total = d.length, occ = d.filter(r => (r.status || '').toLowerCase() === 'occupied').length;
    const avail = total - occ;
    if (occChart) occChart.destroy();
    occChart = new Chart(occCtx, {
        type: 'pie',
        data: {
            labels: ['Occupied', 'Available'],
            datasets: [{ data: [occ, avail], backgroundColor: ['#d4af37', 'rgba(255,255,255,0.2)'], borderColor: '#000' }]
        },
        options: { plugins: { legend: { position: 'bottom', labels: { color: '#f5e6a1' } } } }
    });

    const byType = d.reduce((a, r) => ((a[r.room_type] = (a[r.room_type] || 0) + 1), a), {});
    const ctx2 = document.getElementById('chart-occupancy-type').getContext('2d');
    if (occTypeChart) occTypeChart.destroy();
    occTypeChart = new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: Object.keys(byType),
            datasets: [{ label: 'Rooms', data: Object.values(byType), backgroundColor: 'rgba(212,175,55,0.6)', borderColor: '#d4af37', borderWidth: 1 }]
        },
        options: {
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: '#f5e6a1' }, grid: { color: 'rgba(255,255,255,0.1)' } },
                y: { ticks: { color: '#f5e6a1' }, grid: { color: 'rgba(255,255,255,0.1)' } }
            }
        }
    });
}

// ---------- Load per tab ----------
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('shown.bs.tab', e => {
        const t = e.target.getAttribute('href');
        if (t === '#pane-users') loadUsers();
        if (t === '#pane-access') loadAccess();
        if (t === '#pane-transactions') loadTransactions();
        if (t === '#pane-rooms') loadRooms();
    });
});
