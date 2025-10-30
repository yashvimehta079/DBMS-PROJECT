document.addEventListener("DOMContentLoaded", () => {
    const registerForm = document.getElementById("registerForm");

    registerForm.addEventListener("submit", (e) => {
        e.preventDefault();

        const name = registerForm.querySelector("input[type='text']").value.trim();
        const email = registerForm.querySelector("input[type='email']").value.trim();
        const password = registerForm.querySelector("input[type='password']").value.trim();
        const userType = registerForm.querySelector("select").value;

        if (!name || !email || !password || !userType) {
            showToast("All fields are required!", "error");
            return;
        }

        showToast(`Account created successfully as ${userType}!`, "success");

        setTimeout(() => {
            window.location.href = "login.html";
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
