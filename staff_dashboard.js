// staff_dashboard.js — backend-ready (no fake data)
// Endpoints:
// /api/staff/summary
// /api/staff/tasks
// /api/staff/guests
// /api/staff/performance  -> return { pie: [{label, count}], line: [{date, value}] }
// /api/staff/profile

const API = {
    summary: '/api/staff/summary',
    tasks: '/api/staff/tasks',
    guests: '/api/staff/guests',
    performance: '/api/staff/performance',
    profile: '/api/staff/profile',
    updateTask: '/api/staff/update_task',    // POST { task_id, status, remarks }
    updateProfile: '/api/staff/update_profile' // POST { name,email,phone }
};

function fmtAmt(n) { if (n == null || n === '') return '—'; return '₹' + Number(n).toLocaleString(); }
function debounce(fn, delay = 300) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), delay); }; }

document.addEventListener('DOMContentLoaded', () => {
    loadSummary();
    loadTasks();
    loadGuests();
    loadPerformance();
    loadProfile();
    attachHandlers();
});

function attachHandlers() {
    document.getElementById('refresh-tasks')?.addEventListener('click', loadTasks);
    document.getElementById('refresh-guests')?.addEventListener('click', loadGuests);

    // open modal via delegation for task update
    document.querySelector('#tbl-tasks tbody')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-update-task');
        if (!btn) return;
        const tr = btn.closest('tr');
        const taskId = tr?.dataset?.taskId;
        const status = tr?.querySelector('.task-status')?.innerText ?? 'pending';
        document.getElementById('modal-task-id').value = taskId;
        document.getElementById('modal-task-status').value = status.toLowerCase().replace(' ', '_');
        document.getElementById('modal-task-remarks').value = '';
        new bootstrap.Modal(document.getElementById('modalTaskUpdate')).show();
    });

    // submit task update
    document.getElementById('form-task-update')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const payload = Object.fromEntries(fd.entries());
        try {
            const res = await fetch(API.updateTask, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!res.ok) throw new Error('update failed');
            new bootstrap.Modal(document.getElementById('modalTaskUpdate')).hide();
            showToast('Task updated');
            loadTasks();
            loadSummary();
        } catch (err) {
            console.warn(err);
            showToast('Failed to update task', true);
        }
    });

    // profile edit controls
    document.getElementById('staff-edit-btn')?.addEventListener('click', () => {
        document.getElementById('staff-view-mode').classList.add('d-none');
        document.getElementById('staff-edit-mode').classList.remove('d-none');

        // prefill
        document.getElementById('staff-edit-name').value = document.getElementById('staff-name').innerText || '';
        document.getElementById('staff-edit-email').value = document.getElementById('staff-email').innerText || '';
        document.getElementById('staff-edit-phone').value = document.getElementById('staff-phone').innerText || '';
    });

    document.getElementById('staff-cancel-btn')?.addEventListener('click', () => {
        document.getElementById('staff-edit-mode').classList.add('d-none');
        document.getElementById('staff-view-mode').classList.remove('d-none');
    });

    document.getElementById('staff-save-btn')?.addEventListener('click', async () => {
        const name = document.getElementById('staff-edit-name').value.trim();
        const email = document.getElementById('staff-edit-email').value.trim();
        const phone = document.getElementById('staff-edit-phone').value.trim();
        try {
            const res = await fetch(API.updateProfile, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, phone }) });
            if (!res.ok) throw new Error('save failed');
            showToast('Profile saved');
            document.getElementById('staff-name').innerText = name || 'Staff Member';
            document.getElementById('staff-email').innerText = email || '';
            document.getElementById('staff-phone').innerText = phone || '';
            document.getElementById('staff-edit-mode').classList.add('d-none');
            document.getElementById('staff-view-mode').classList.remove('d-none');
        } catch (err) {
            console.warn(err);
            showToast('Failed to save profile', true);
        }
    });
}

// small toast
function showToast(msg, isErr = false) {
    const d = document.createElement('div');
    d.className = 'position-fixed top-0 end-0 m-3 p-2 rounded shadow';
    d.style.background = isErr ? 'rgba(255,60,60,0.95)' : 'rgba(212,175,55,0.95)';
    d.style.color = isErr ? '#fff' : '#000';
    d.innerText = msg;
    document.body.appendChild(d);
    setTimeout(() => { d.style.opacity = 0; setTimeout(() => d.remove(), 300); }, 2200);
}

// fetch helper
async function fetchJson(url) {
    try {
        const r = await fetch(url);
        if (!r.ok) throw new Error('network');
        return await r.json();
    } catch (e) {
        console.warn('API fail:', url);
        return null;
    }
}

/* ---------- Loaders (no fallback demo data) ---------- */

async function loadSummary() {
    const d = await fetchJson(API.summary);
    document.getElementById('stat-tasks').innerText = d?.assigned_tasks ?? '—';
    document.getElementById('stat-queries').innerText = d?.pending_queries ?? '—';
    document.getElementById('stat-guests').innerText = d?.guests_assisted ?? '—';
    document.getElementById('stat-completed').innerText = d?.completed_today ?? '—';
}

async function loadTasks() {
    const list = await fetchJson(API.tasks);
    const tbody = document.querySelector('#tbl-tasks tbody');
    tbody.innerHTML = '';
    if (!list?.length) return;
    list.forEach(t => {
        tbody.insertAdjacentHTML('beforeend',
            `<tr data-task-id="${t.task_id}">
         <td>${t.task_id}</td>
         <td>${t.assigned_to ?? '—'}</td>
         <td>${t.description ?? '—'}</td>
         <td>${t.priority ?? 'Normal'}</td>
         <td class="task-status">${t.status ?? 'pending'}</td>
         <td>${t.due_date ?? '—'}</td>
         <td>
           <button class="btn btn-sm btn-outline-secondary btn-update-task">Update</button>
         </td>
       </tr>`);
    });
}

async function loadGuests() {
    const list = await fetchJson(API.guests);
    const tbody = document.querySelector('#tbl-guests tbody');
    tbody.innerHTML = '';
    if (!list?.length) return;
    list.forEach(g => {
        tbody.insertAdjacentHTML('beforeend',
            `<tr>
         <td>${g.name ?? '—'}</td>
         <td>${g.room_no ?? '—'}</td>
         <td>${g.check_in ?? '—'}</td>
         <td>${g.check_out ?? '—'}</td>
         <td>${g.phone ?? '—'}</td>
         <td>${g.notes ?? ''}</td>
         <td>
           <button class="btn btn-sm btn-outline-secondary btn-view-guest" data-guest-id="${g.guest_id}">View</button>
         </td>
       </tr>`);
    });
}

/* Performance: draws charts only if data returned */
let staffPieChart, staffLineChart;
async function loadPerformance() {
    const d = await fetchJson(API.performance);
    if (!d) return;

    // Pie (completion)
    if (Array.isArray(d.pie) && d.pie.length) {
        const ctx = document.getElementById('staffPieChart').getContext('2d');
        if (staffPieChart) staffPieChart.destroy();
        staffPieChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: d.pie.map(x => x.label),
                datasets: [{ data: d.pie.map(x => x.count), backgroundColor: ['#d4af37', 'rgba(245,230,161,0.8)', 'rgba(212,175,55,0.6)'], borderColor: '#000' }]
            },
            options: { plugins: { legend: { position: 'bottom', labels: { color: '#f5e6a1' } } } }
        });
    }

    // Line (trend)
    if (Array.isArray(d.line) && d.line.length) {
        const ctx2 = document.getElementById('staffLineChart').getContext('2d');
        if (staffLineChart) staffLineChart.destroy();
        staffLineChart = new Chart(ctx2, {
            type: 'line',
            data: {
                labels: d.line.map(x => x.date),
                datasets: [{
                    label: 'Operations',
                    data: d.line.map(x => x.value),
                    borderColor: '#d4af37',
                    backgroundColor: 'rgba(212,175,55,0.2)',
                    tension: 0.3,
                    pointRadius: 3
                }]
            },
            options: {
                plugins: { legend: { display: false } },
                scales: { x: { ticks: { color: '#f5e6a1' }, grid: { color: 'rgba(255,255,255,0.06)' } }, y: { ticks: { color: '#f5e6a1' }, grid: { color: 'rgba(255,255,255,0.06)' } } }
            }
        });
    }
}

// ---------- STAFF PROFILE EDIT FUNCTIONALITY ----------
document.addEventListener("DOMContentLoaded", () => {
    const editBtn = document.getElementById("staff-edit-btn");
    const saveBtn = document.getElementById("staff-save-btn");
    const cancelBtn = document.getElementById("staff-cancel-btn");
    const viewMode = document.getElementById("staff-view-mode");
    const editMode = document.getElementById("staff-edit-mode");

    if (!editBtn) return; // safety check

    editBtn.addEventListener("click", () => {
        // Copy current details into input fields before showing edit mode
        document.getElementById("edit-staff-name").value =
            document.getElementById("staff-name").innerText;
        document.getElementById("edit-staff-email").value =
            document.getElementById("staff-email").innerText;
        document.getElementById("edit-staff-phone").value =
            document.getElementById("staff-phone").innerText;

        // toggle views
        viewMode.classList.add("d-none");
        editMode.classList.remove("d-none");
    });

    cancelBtn.addEventListener("click", () => {
        editMode.classList.add("d-none");
        viewMode.classList.remove("d-none");
    });

    saveBtn.addEventListener("click", () => {
        // read new values
        const newName = document.getElementById("edit-staff-name").value.trim();
        const newEmail = document.getElementById("edit-staff-email").value.trim();
        const newPhone = document.getElementById("edit-staff-phone").value.trim();

        // Update UI (later backend will save)
        document.getElementById("staff-name").innerText = newName || "—";
        document.getElementById("staff-email").innerText = newEmail || "—";
        document.getElementById("staff-phone").innerText = newPhone || "—";

        // Switch back
        editMode.classList.add("d-none");
        viewMode.classList.remove("d-none");

        // Optional small toast
        const toast = document.createElement("div");
        toast.className =
            "position-fixed top-0 end-0 m-3 p-2 px-3 rounded shadow";
        toast.style.background = "rgba(212, 175, 55, 0.9)";
        toast.style.color = "#000";
        toast.innerText = "Profile updated successfully!";
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = 0;
            setTimeout(() => toast.remove(), 500);
        }, 1800);
    });
});


