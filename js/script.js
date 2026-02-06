// ==========================================
// 0. FIREBASE CONFIGURATION
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyCPr3W0cIVpACRScu-GfqjVYTq2ZfFu3hc",
    authDomain: "cyber-kavach-vpn.firebaseapp.com",
    projectId: "cyber-kavach-vpn",
    storageBucket: "cyber-kavach-vpn.firebasestorage.app",
    messagingSenderId: "594270548686",
    appId: "1:594270548686:web:524241325a3eacd3c1569f",
    measurementId: "G-78CTERSZ5G"
};

// Initialize Firebase (Compat)
if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
} else {
    console.error("Firebase SDK not loaded!");
}

// GOOGLE LOGIN HANDLER
async function handleGoogleLogin() {
    if (typeof firebase === 'undefined') {
        alert("Firebase not loaded. Please refresh.");
        return;
    }

    const provider = new firebase.auth.GoogleAuthProvider();

    try {
        const result = await firebase.auth().signInWithPopup(provider);
        const user = result.user;
        const idToken = await user.getIdToken();

        console.log("Google Sign-In Successful:", user.email);

        // Send Token to Backend
        await sendGoogleTokenToBackend(idToken);

    } catch (error) {
        console.error("Google Login Error:", error);
        alert("Google Login Failed: " + error.message);
    }
}

async function sendGoogleTokenToBackend(idToken) {
    const API_URL = 'http://localhost:5001/api/auth';

    try {
        const res = await fetch(`${API_URL}/google-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken })
        });

        const data = await res.json();

        if (res.ok) {
            // Save Token & User
            localStorage.setItem('auth-token', data.token);
            if (data.user) localStorage.setItem('user', JSON.stringify(data.user));

            alert("Login Successful! Welcome " + data.user.name);
            document.getElementById("auth-modal").style.display = "none";
            // Stay on page, update UI
            updateUIBasedOnUserStatus();
        } else {
            alert(data.message || "Google Backend Auth Failed");
        }
    } catch (error) {
        console.error("Backend Error:", error);
        alert("Failed to connect to backend server.");
    }
}

// ==========================================
// 1. UI INTERACTION LOGIC
// ==========================================

// Mobile Navbar Toggle
const mobileMenu = document.querySelector('#mobile-menu');
const navLinks = document.querySelector('.nav-links');

if (mobileMenu) {
    mobileMenu.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        const icon = mobileMenu.querySelector('i');
        if (icon.classList.contains('fa-bars')) {
            icon.classList.replace('fa-bars', 'fa-times');
        } else {
            icon.classList.replace('fa-times', 'fa-bars');
        }
    });
}

// FAQ Accordion
document.querySelectorAll('.faq-question').forEach(question => {
    question.addEventListener('click', () => {
        const item = question.parentElement;
        document.querySelectorAll('.faq-item').forEach(other => {
            if (other !== item) other.classList.remove('active');
        });
        item.classList.toggle('active');
    });
});

// Smooth Scroll
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
});

// Navbar Scroll Effect
window.addEventListener('scroll', () => {
    const navbar = document.getElementById('navbar');
    if (navbar) {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    }
});

// ==========================================
// 2. AUTH MODAL LOGIC
// ==========================================

const authModal = document.getElementById("auth-modal");
const closeBtn = document.querySelector(".close-modal");

// 1. Open Modal Triggers (Get Started + Buy Buttons + Hero Buttons)
const triggerButtons = document.querySelectorAll(".hero-btn, .vpn-btn:not([type='submit']), .buy-btn");

triggerButtons.forEach(btn => {
    btn.addEventListener("click", async (e) => {
        e.preventDefault();

        const token = localStorage.getItem('auth-token');

        // 0. CHECK LOGIN STATUS FOR 'GET STARTED' BUTTONS
        // If user is already logged in, "Get Started" should take them to Dashboard
        if (btn.innerText.toLowerCase().includes('get started') || btn.innerText.toLowerCase().includes('secure my web')) {
            if (token) {
                window.location.href = '../dashboard.html';
                return;
            }
        }

        // Payment Logic Check
        if (btn.classList.contains('buy-btn')) {
            const amount = btn.getAttribute('data-amount');
            const plan = btn.getAttribute('data-plan') || 'premium';

            if (token) {
                // User Connected -> Start Payment
                if (amount > 0) {
                    // Start Razorpay Payment
                    startPayment(amount, plan);
                } else {
                    showNotification("You are on the Free Plan. Enjoy!");
                    window.location.href = '../dashboard.html';
                }
                return; // Prevent Auth Modal
            }
            // If not logged in, Modal will open below
        }

        if (authModal) {
            authModal.style.display = "block";
            console.log("Modal opened by:", btn.innerText);
        }
    });
});

// DEMO MODE - Set to false for real Razorpay payments (with test keys)
const DEMO_MODE = true;

// MOCK PAYMENT FUNCTION (For Testing)
async function mockPayment(amount, plan) {
    try {
        const token = localStorage.getItem('auth-token');

        showNotification("🧪 DEMO MODE: Processing mock payment for " + plan + "...");

        const res = await fetch(`http://localhost:5001/api/payment/mock-payment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'auth-token': token
            },
            body: JSON.stringify({ amount: amount, plan: plan })
        });

        const data = await res.json();

        if (res.ok && data.success) {
            showNotification("✅ Mock Payment Successful! You are now Premium!");

            // Update local storage
            let user = JSON.parse(localStorage.getItem('user') || '{}');
            user.isPro = true;
            localStorage.setItem('user', JSON.stringify(user));

            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = '../dashboard.html';
            }, 1500);
        } else {
            showNotification("Mock payment failed: " + (data.message || "Unknown error"));
        }

    } catch (err) {
        console.error("Mock Payment Error:", err);
        showNotification("Error: Is the backend running?");
    }
}

// PAYMENT FUNCTION
async function startPayment(amount, plan) {
    // Use mock payment in demo mode
    if (DEMO_MODE) {
        return mockPayment(amount, plan);
    }

    try {
        const token = localStorage.getItem('auth-token');

        // 0. Get Public Key from Backend
        const configRes = await fetch(`http://localhost:5001/api/config`);
        const config = await configRes.json();

        if (!config.razorpayKeyId) {
            showNotification("System Error: Razorpay Key ID not found in backend config!");
            return;
        }

        if (typeof Razorpay === 'undefined') {
            showNotification("Error: Razorpay SDK not loaded. Check internet connection.");
            return;
        }

        // 1. Create Order
        const res = await fetch(`${API_URL.replace('/auth', '/payment')}/order`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'auth-token': token
            },
            body: JSON.stringify({ amount: amount, plan: plan })
        });

        let data;
        const text = await res.text();
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error("Server response was not JSON:", text);
            showNotification(`Server Error: ${text}`);
            return;
        }

        if (!res.ok) {
            if (res.status === 400 || res.status === 401) {
                // Token invalid or expired
                showNotification("Session expired. Please login again.");
                localStorage.removeItem('auth-token');
                localStorage.removeItem('user');

                // Open Login Modal
                if (authModal) authModal.style.display = "block";
                showAuth('login');
            } else {
                showNotification(data.message || "Order creation failed");
            }
            return;
        }

        // 2. Open Razorpay
        const options = {
            key: config.razorpayKeyId,
            amount: data.amount,
            currency: "INR",
            name: "Cyber Kavach",
            description: "Premium Subscription",
            order_id: data.id,
            handler: async function (response) {
                // 3. Verify Payment
                const verifyRes = await fetch(`${API_URL.replace('/auth', '/payment')}/verify`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'auth-token': token
                    },
                    body: JSON.stringify({
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_signature: response.razorpay_signature
                    })
                });

                if (verifyRes.ok) {
                    showNotification("Payment Successful! You are now a Premium Member.");

                    // Update local storage user
                    let user = JSON.parse(localStorage.getItem('user') || '{}');
                    user.isPro = true;
                    localStorage.setItem('user', JSON.stringify(user));

                    window.location.href = '../dashboard.html';
                } else {
                    showNotification("Payment Verification Failed");
                }
            },
            prefill: {
                name: JSON.parse(localStorage.getItem('user') || '{}').name,
                email: JSON.parse(localStorage.getItem('user') || '{}').email
            },
            theme: {
                color: "#f97316"
            }
        };

        const rzp1 = new Razorpay(options);
        rzp1.open();

    } catch (err) {
        console.error(err);
        showNotification("Payment Error. Is Backend Running?");
    }
}

if (closeBtn) {
    closeBtn.onclick = () => authModal.style.display = "none";
}

window.onclick = (event) => {
    if (event.target == authModal) authModal.style.display = "none";
};

window.showAuth = function (type) {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const tabs = document.querySelectorAll('.tab-btn');

    if (type === 'login') {
        if (loginForm) loginForm.style.display = 'block';
        if (signupForm) signupForm.style.display = 'none';
        if (tabs.length > 0) {
            tabs[0].classList.add('active');
            tabs[1].classList.remove('active');
        }
    } else {
        if (loginForm) loginForm.style.display = 'none';
        if (signupForm) signupForm.style.display = 'block';
        if (tabs.length > 0) {
            tabs[1].classList.add('active');
            tabs[0].classList.remove('active');
        }
    }
};

// ==========================================
// 3. BACKEND API CONNECTION
// ==========================================

const API_URL = 'http://localhost:5001/api/auth'; // Updated to sync with extension backend

function showNotification(msg, type = 'success') {
    // 1. Create container if not exists
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    // 2. Create Toast
    const toast = document.createElement('div');
    toast.className = `toast toast-${type === 'error' ? 'error' : 'success'}`;

    // Icon Selection
    let icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-exclamation-circle';
    if (type === 'info') icon = 'fa-info-circle';

    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${msg}</span>
    `;

    // 3. Add to Container
    container.appendChild(toast);

    // 4. Trigger Animation
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    // 5. Remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

// SIGNUP HANDLER
const signupForm = document.getElementById('signup-form');
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = signupForm.querySelector('input[name="name"]').value;
        const email = signupForm.querySelector('input[name="email"]').value;
        const password = signupForm.querySelector('input[name="password"]').value;
        const btn = signupForm.querySelector('button');

        try {
            btn.innerText = 'Creating Account...';
            btn.disabled = true;

            const res = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });

            const data = await res.json();
            if (res.ok) {
                showNotification("Success! Account created. Please Login.");
                showAuth('login'); // Sahi flow: Signup ke baad Login par bhejna
            } else {
                showNotification(data.message || "Signup Failed");
            }
        } catch (error) {
            showNotification("Server Error. Is the backend running?");
        } finally {
            btn.innerText = 'Create Account';
            btn.disabled = false;
        }
    });
}

// LOGIN HANDLER
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = loginForm.querySelector('input[name="email"]').value;
        const password = loginForm.querySelector('input[name="password"]').value;
        const btn = loginForm.querySelector('button');

        try {
            btn.innerText = 'Logging In...';
            btn.disabled = true;

            const res = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();
            if (res.ok) {
                // Token aur User save karein
                localStorage.setItem('auth-token', data.token);
                if (data.user) localStorage.setItem('user', JSON.stringify(data.user));

                showNotification("Login Successful! Welcome " + data.user.name);
                authModal.style.display = "none";

                // Stay on page, update UI
                updateUIBasedOnUserStatus();

                // Optional: Update UI to show 'Logout' or 'Profile'
            } else {
                showNotification(data.message || "Login Failed");
            }
        } catch (error) {
            showNotification("Server Error. Is the backend running?");
        } finally {
            btn.innerText = 'Login';
            btn.disabled = false;
        }
    });
}

// ==========================================
// NEWSLETTER SUBSCRIPTION
// ==========================================
const newsletterForm = document.getElementById('newsletter-form');
if (newsletterForm) {
    newsletterForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const emailInput = newsletterForm.querySelector('input[type="email"]');
        const email = emailInput.value;

        // Simulate newsletter subscription
        showNotification(`✅ Thank you! We've added ${email} to our newsletter!`);
        emailInput.value = '';
    });
}

// ==========================================
// CONTACT FORM SUBMISSION
// ==========================================
const contactForm = document.getElementById('contact-form');
if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = contactForm.querySelector('.submit-btn');
        const originalText = submitBtn.innerHTML;

        // Get form data
        const formData = {
            name: contactForm.querySelector('input[name="name"]').value,
            email: contactForm.querySelector('input[name="email"]').value,
            subject: contactForm.querySelector('select[name="subject"]').value,
            message: contactForm.querySelector('textarea[name="message"]').value
        };

        // Disable button and show loading
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

        // Simulate sending (replace with actual API call)
        setTimeout(() => {
            showNotification(`✅ Thank you ${formData.name}! Your message has been sent. We'll get back to you within 24 hours.`);
            contactForm.reset();

            // Reset button
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }, 1500);
    });
}

// ==========================================
// ADD EXTENSION BUTTON LOGIC
// ==========================================

const addExtensionBtn = document.getElementById('add-extension-btn');

if (addExtensionBtn) {
    addExtensionBtn.addEventListener('click', async (e) => {
        e.preventDefault();

        // Check if user is logged in
        const token = localStorage.getItem('auth-token');

        if (!token) {
            // User not logged in - show login modal
            showNotification('⚠️ Please login first to add the extension!');
            const authModal = document.getElementById('auth-modal');
            if (authModal) {
                authModal.style.display = 'flex';
                showAuth('login');
            }
            return;
        }

        // User is logged in - check if Pro
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');

            if (user.isPro === true || user.isPro === 'true') {
                // Pro user - redirect to extension store
                const extensionStoreURL = 'https://chrome.google.com/webstore/detail/YOUR_EXTENSION_ID_HERE';
                // For now, placeholder message
                showNotification('🎉 Pro Member! Extension download link will open soon...');

                // TODO: Replace with actual Chrome Web Store link when published
                // window.open(extensionStoreURL, '_blank');

                // Temporary: Open extension folder guide
                setTimeout(() => {
                    alert('📦 Extension Location:\nc:\\Users\\HP\\Desktop\\app\\chrome-extension\n\nLoad it in Chrome:\n1. Go to chrome://extensions/\n2. Enable Developer mode\n3. Click "Load unpacked"\n4. Select the chrome-extension folder');
                }, 500);
            } else {
                // Free user - show upgrade message
                showNotification('⚠️ Extension is available for Pro members only. Please upgrade to Pro!');

                // Scroll to pricing section
                const pricingSection = document.querySelector('#pricing');
                if (pricingSection) {
                    pricingSection.scrollIntoView({ behavior: 'smooth' });
                }
            }
        } catch (error) {
            console.error('Error checking user status:', error);
            showNotification('❌ Error checking user status. Please try again.');
        }
    });
}

// ==========================================
// CHECK USER STATUS ON PAGE LOAD
// ==========================================

function updateUIBasedOnUserStatus() {
    const token = localStorage.getItem('auth-token');
    const addExtensionBtn = document.getElementById('add-extension-btn');
    const navLoginBtn = document.querySelector('.nav-login');

    if (token) {
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');

            // 1. UPDATE EXTENSION BUTTON
            if (addExtensionBtn) {
                if (user.isPro === true || user.isPro === 'true') {
                    addExtensionBtn.innerHTML = '<i class="fas fa-download"></i> Download Extension';
                    addExtensionBtn.classList.add('pro-available');

                    // Clone to reset listeners
                    const newExtBtn = addExtensionBtn.cloneNode(true);
                    addExtensionBtn.parentNode.replaceChild(newExtBtn, addExtensionBtn);

                    newExtBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        showNotification('📦 Extension Location: c:\\Users\\HP\\Desktop\\app\\chrome-extension', 'info');
                        setTimeout(() => {
                            alert('Follow instructions in the popup to load unpacked extension.');
                        }, 500);
                    });
                } else {
                    addExtensionBtn.innerHTML = '<i class="fas fa-lock"></i> Add Extension (Pro)';
                    addExtensionBtn.classList.add('requires-pro');
                }
            }

            // 2. UPDATE NAVBAR LOGIN BUTTON -> PROFILE LINK
            if (navLoginBtn) {
                // Determine Avatar Source
                let iconHtml = `<i class="fas fa-user-circle" style="font-size: 1.2rem; margin-right: 8px;"></i>`;

                if (user.avatar || user.picture) {
                    const avatarSrc = user.avatar || user.picture;
                    iconHtml = `<img src="${avatarSrc}" class="nav-user-avatar" alt="Profile" onerror="this.src='assets/images/logo.png'">`;
                }

                navLoginBtn.innerHTML = `${iconHtml} ${user.name ? user.name.split(' ')[0] : 'Dashboard'}`;
                navLoginBtn.href = "../dashboard.html";
                navLoginBtn.removeAttribute('onclick');

                // Clone to ensure clean slate
                const newNavBtn = navLoginBtn.cloneNode(true);
                navLoginBtn.parentNode.replaceChild(newNavBtn, navLoginBtn);
            }

        } catch (error) {
            console.error('Error updating UI:', error);
        }
    } else {
        // Not logged in state
        if (addExtensionBtn) {
            addExtensionBtn.innerHTML = '<i class="fab fa-chrome"></i> Add Extension';
        }
    }
}

// Run on page load
window.addEventListener('DOMContentLoaded', updateUIBasedOnUserStatus);

// Run when storage changes (e.g., after login/payment)
window.addEventListener('storage', updateUIBasedOnUserStatus);