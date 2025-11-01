// -------------------- CONFIG --------------------
const API_URL = "/api/transactions"; // backend endpoint (Flask)
const rowsPerPage = 6;

let transactions = [];
let currentPage = 1;
let sortField = "";
let sortAsc = true;

// -------------------- INITIAL LOAD --------------------
document.addEventListener("DOMContentLoaded", () => {
    loadTransactions();
    document.getElementById("searchBox").addEventListener("input", filterTable);
    document.getElementById("filterStatus").addEventListener("change", filterTable);
    document.getElementById("filterMode").addEventListener("change", filterTable);
    document.getElementById("exportCsv").addEventListener("click", exportCSV);
    document.getElementById("prevPage").addEventListener("click", prevPage);
    document.getElementById("nextPage").addEventListener("click", nextPage);

    document.querySelectorAll("#transactionTable th[data-sort]").forEach(th => {
        th.addEventListener("click", () => {
            const field = th.dataset.sort;
            sortAsc = sortField === field ? !sortAsc : true;
            sortField = field;
            renderTable();
        });
    });
});

// -------------------- FETCH DATA --------------------
async function loadTransactions() {
    try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error("Network error");
        transactions = await res.json();
    } catch (err) {
        console.warn("API unavailable — showing empty table");
        transactions = []; // No dummy data — backend will populate
    }
    renderTable();
}

// -------------------- RENDER TABLE --------------------
function renderTable() {
    const tbody = document.getElementById("transactionBody");
    tbody.innerHTML = "";

    let filtered = getFilteredData();

    // Sorting
    if (sortField) {
        filtered.sort((a, b) => {
            const valA = (a[sortField] ?? "").toString().toLowerCase();
            const valB = (b[sortField] ?? "").toString().toLowerCase();
            return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
        });
    }

    // Pagination
    const start = (currentPage - 1) * rowsPerPage;
    const paginated = filtered.slice(start, start + rowsPerPage);

    // Render rows
    paginated.forEach(tx => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${tx.payment_id ?? "—"}</td>
            <td>${tx.booking_id ?? "—"}</td>
            <td>${tx.guest_name ?? "—"}</td>
            <td>₹${tx.amount ?? "—"}</td>
            <td>${tx.mode ?? "—"}</td>
            <td>${tx.date ?? "—"}</td>
            <td><span class="badge ${statusColor(tx.status)}">${tx.status ?? "—"}</span></td>`;
        tbody.appendChild(tr);
    });

    // Update pagination text
    const totalPages = Math.ceil(filtered.length / rowsPerPage) || 1;
    document.getElementById("pageInfo").innerText = `Page ${currentPage} of ${totalPages}`;
    document.getElementById("prevPage").disabled = currentPage === 1;
    document.getElementById("nextPage").disabled = currentPage >= totalPages;
}

function statusColor(status) {
    switch ((status || "").toLowerCase()) {
        case "success": return "bg-success";
        case "pending": return "bg-warning text-dark";
        case "failed": return "bg-danger";
        default: return "bg-secondary";
    }
}

// -------------------- FILTERS --------------------
function getFilteredData() {
    const q = document.getElementById("searchBox").value.toLowerCase();
    const status = document.getElementById("filterStatus").value;
    const mode = document.getElementById("filterMode").value;

    return transactions.filter(tx =>
        (!q || tx.booking_id?.toString().includes(q) || tx.guest_name?.toLowerCase().includes(q)) &&
        (!status || tx.status === status) &&
        (!mode || tx.mode === mode)
    );
}

function filterTable() {
    currentPage = 1;
    renderTable();
}

// -------------------- PAGINATION --------------------
function nextPage() {
    currentPage++;
    renderTable();
}
function prevPage() {
    currentPage--;
    renderTable();
}

// -------------------- EXPORT CSV --------------------
function exportCSV() {
    const rows = [["Payment ID", "Booking ID", "Guest Name", "Amount", "Mode", "Date", "Status"]];
    getFilteredData().forEach(tx => {
        rows.push([
            tx.payment_id, tx.booking_id, tx.guest_name,
            tx.amount, tx.mode, tx.date, tx.status
        ]);
    });
    const csvContent = rows.map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "transactions.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}
