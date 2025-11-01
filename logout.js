// Marriott — Logout Page JS
// (No countdown, no auto redirect — user chooses to return or exit)

document.addEventListener("DOMContentLoaded", () => {
    const toast = document.getElementById("toast");
    const exitBtn = document.getElementById("exitBtn");

    // --- Toast animation (appears for 3 seconds) ---
    setTimeout(() => {
        toast.classList.add("show");
        setTimeout(() => toast.classList.remove("show"), 3000);
    }, 800);

    // --- Exit button functionality ---
    exitBtn.addEventListener("click", () => {
        // Try closing the tab (works if user opened it directly or from script)
        window.close();

        // If browser blocks window.close(), show gentle message
        setTimeout(() => {
            if (!window.closed) {
                alert("You can now close this tab manually. 👋");
            }
        }, 500);
    });
});
