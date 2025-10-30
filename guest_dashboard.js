// -------------------- HERO IMAGE SLIDER --------------------
let slides = document.querySelectorAll('.hero-slide');
let currentSlide = 0;

function nextSlide() {
    slides[currentSlide].classList.remove('active');
    currentSlide = (currentSlide + 1) % slides.length;
    slides[currentSlide].classList.add('active');
}
setInterval(nextSlide, 4000); // change image every 4s


// -------------------- PROFILE EDIT FUNCTIONALITY --------------------
const editBtn = document.getElementById("edit-btn");
const saveBtn = document.getElementById("save-btn");
const cancelBtn = document.getElementById("cancel-btn");
const viewMode = document.getElementById("view-mode");
const editMode = document.getElementById("edit-mode");

if (editBtn) {
    editBtn.addEventListener("click", () => {
        // Fill input fields with current values
        document.getElementById("edit-name").value = document.getElementById("profile-name").innerText;
        document.getElementById("edit-email").value = document.getElementById("profile-email").innerText;
        document.getElementById("edit-phone").value = document.getElementById("profile-phone").innerText;

        viewMode.classList.add("d-none");
        editMode.classList.remove("d-none");
    });
}

if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
        editMode.classList.add("d-none");
        viewMode.classList.remove("d-none");
    });
}

if (saveBtn) {
    saveBtn.addEventListener("click", () => {
        // Get new values
        const name = document.getElementById("edit-name").value.trim();
        const email = document.getElementById("edit-email").value.trim();
        const phone = document.getElementById("edit-phone").value.trim();

        // Update frontend values
        document.getElementById("profile-name").innerText = name || "Guest";
        document.getElementById("profile-email").innerText = email || "guest@example.com";
        document.getElementById("profile-phone").innerText = phone || "Not Provided";

        // Hide edit mode
        editMode.classList.add("d-none");
        viewMode.classList.remove("d-none");

        showToast("Profile updated successfully!", "success");

        // 🔜 LATER: Send data to backend using fetch() for Flask
        // fetch('/update_profile', { method: 'POST', body: JSON.stringify({ name, email, phone }) })
    });
}


// -------------------- TOAST NOTIFICATION --------------------
function showToast(message, type = "success") {
    const toast = document.createElement("div");
    toast.classList.add("toast");
    if (type === "error") toast.classList.add("error");
    toast.innerText = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add("show"), 100);
    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}


// -------------------- CHARTS --------------------
// Placeholder data (replace later with backend data)
const spendingChart = document.getElementById('spendingChart');
const bookingChart = document.getElementById('bookingChart');

if (spendingChart) {
    new Chart(spendingChart, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
            datasets: [{
                label: 'Total Spending (₹)',
                data: [12000, 15000, 11000, 18000, 16000],
                borderColor: '#d4af37',
                backgroundColor: 'rgba(212,175,55,0.2)',
                borderWidth: 2,
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            plugins: { legend: { labels: { color: "#f5e6a1" } } },
            scales: {
                x: { ticks: { color: "#fff" }, grid: { color: "rgba(255,255,255,0.1)" } },
                y: { ticks: { color: "#fff" }, grid: { color: "rgba(255,255,255,0.1)" } }
            }
        }
    });
}

if (bookingChart) {
    new Chart(bookingChart, {
        type: 'doughnut',
        data: {
            labels: ['Completed', 'Upcoming', 'Cancelled'],
            datasets: [{
                data: [5, 2, 1],
                backgroundColor: ['#d4af37', '#f5e6a1', '#888'],
                borderWidth: 0
            }]
        },
        options: {
            plugins: {
                legend: { position: 'bottom', labels: { color: "#f5e6a1" } }
            }
        }
    });
}


// -------------------- BACKEND PLACEHOLDERS --------------------
// 🔜 Future integration with Flask:
// 1️⃣ Fetch user profile:
// fetch('/api/user')
//     .then(res => res.json())
//     .then(data => {
//         document.getElementById("profile-name").innerText = data.name;
//         document.getElementById("profile-email").innerText = data.email;
//         document.getElementById("profile-phone").innerText = data.phone;
//     });

// 2️⃣ Fetch bookings/payments:
// fetch('/api/bookings')
//     .then(res => res.json())
//     .then(data => updateBookingsTable(data));
