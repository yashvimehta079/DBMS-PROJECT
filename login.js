document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");

    loginForm.addEventListener("submit", (e) => {
        e.preventDefault();

        const email = loginForm.querySelector("input[type='email']").value.trim();
        const password = loginForm.querySelector("input[type='password']").value.trim();
        const userType = loginForm.querySelector("select").value;

        if (!email || !password || !userType) {
            showToast("Please fill all fields!", "error");
            return;
        }

        showToast(`Welcome back, ${userType}!`, "success");

        setTimeout(() => {
            window.location.href = "dashboard.html"; // Change if needed
        }, 1500);
    });
});

function showToast(message, type) {
    let toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerText = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add("show"), 100);
    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 500);
    }, 2500);
}
