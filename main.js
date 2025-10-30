// =============================
// Marriott Frontend JavaScript
// =============================

// Bootstrap ScrollSpy initialization
const scrollSpy = new bootstrap.ScrollSpy(document.body, {
    target: '#mainNav',
    offset: 80,
});

// Optional smooth scroll for nav links
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function (e) {
        if (this.hash) {
            e.preventDefault();
            const target = document.querySelector(this.hash);
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});
