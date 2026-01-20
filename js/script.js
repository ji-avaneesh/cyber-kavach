// 1. Mobile Navbar Toggle (Menu khulne aur band hone ke liye)
const mobileMenu = document.querySelector('#mobile-menu');
const navLinks = document.querySelector('.nav-links');

if (mobileMenu) {
    mobileMenu.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        
        // Icon badalne ke liye (Bars se Cross icon)
        const icon = mobileMenu.querySelector('i');
        if (icon.classList.contains('fa-bars')) {
            icon.classList.replace('fa-bars', 'fa-times');
        } else {
            icon.classList.replace('fa-times', 'fa-bars');
        }
    });
}

// 2. FAQ Accordion (Sawal par click karne se jawab khulega)
const faqQuestions = document.querySelectorAll('.faq-question');

faqQuestions.forEach(question => {
    question.addEventListener('click', () => {
        const item = question.parentElement; // faq-item ko pakda
        
        // Pehle se khule hue dusre FAQ ko band karne ke liye (Optional)
        document.querySelectorAll('.faq-item').forEach(otherItem => {
            if (otherItem !== item) {
                otherItem.classList.remove('active');
            }
        });

        // Current FAQ ko toggle karein
        item.classList.toggle('active');
    });
});

// 3. Smooth Scrolling (Navbar links par click karne se smoothly scroll hoga)
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});

// 4. Navbar Background Change on Scroll (Jab page niche jaye toh nav dark ho jaye)
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('#navbar');
    if (window.scrollY > 50) {
        navbar.style.background = 'rgba(2, 6, 23, 0.95)'; // Thoda aur dark
        navbar.style.padding = '10px 80px'; // Navbar patla ho jayega
    } else {
        navbar.style.background = 'rgba(2, 6, 23, 0.85)';
        navbar.style.padding = '15px 80px'; // Wapas normal size
    }
});