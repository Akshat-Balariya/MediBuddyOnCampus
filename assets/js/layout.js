// Shared header, footer, login check and logout for the logged-in pages.
//
// A page opts in with:
//   <body data-role="student">            (or "doctor")
//   <header data-layout></header>
//   <script src="/assets/js/layout.js"></script>   (straight after the header)
//   ...
//   <footer data-layout></footer>
//
// The login check here only stops the page from showing; the server still
// checks the token on every API request.

const NAV_LINKS = {
    student: [
        ['/homepage', 'Home'],
        ['/studapmtlst', 'Medical History'],
        ['/Appointment', 'Appointment'],
        ['/Ambulance', 'Request Ambulance'],
        ['/contact', 'Contact'],
    ],
    doctor: [
        ['/homepagedoc', 'Home'],
        ['/apmtlst', 'Current Appointments'],
        ['/Prescriptions', 'Drug Records'],
        ['/editMedicines', 'Edit Medicines'],
    ],
};

const HOME_PAGE = { student: '/homepage', doctor: '/homepagedoc' };
const LOGIN_PAGE = { student: '/studlogin', doctor: '/doctorlogin' };

// Reads the saved token and returns its payload, or null if missing or expired
function getSession() {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try {
        const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(base64));
        if (!payload.role || payload.exp * 1000 <= Date.now()) return null;
        return payload;
    } catch (err) {
        return null;
    }
}

function clearSession() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('reg_no');
}

function logout() {
    clearSession();
    window.location.href = '/';
}

// Shows a short message at the top of the page. type: 'info' | 'success' | 'error'
function notify(message, type = 'info', duration = 4000) {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        container.setAttribute('role', 'status');
        container.setAttribute('aria-live', 'polite');
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), duration);
}

function renderHeader(header, role) {
    const currentPath = window.location.pathname.replace(/\/$/, '').toLowerCase();
    const links = NAV_LINKS[role].map(([href, label]) => {
        const current = href.toLowerCase() === currentPath ? ' aria-current="page"' : '';
        return `<li><a href="${href}"${current}>${label}</a></li>`;
    }).join('');

    const profileLink = role === 'student' ? '<li><a href="/stud_profile">My Profile</a></li>' : '';

    header.innerHTML = `
        <div class="header-area">
            <div class="logo-img">
                <a href="${HOME_PAGE[role]}">
                    <img src="/assets/images/VITLogoEmblem.png" alt="VIT Logo Emblem">
                </a>
            </div>
            <button class="hamburger" type="button" aria-label="Open menu" aria-expanded="false">☰</button>
            <nav class="main-menu">
                <ul id="navigation">${links}</ul>
            </nav>
            <div class="profile">
                <button class="profile-button" type="button" aria-label="Account menu" aria-haspopup="true" aria-expanded="false">
                    <img src="/assets/icons/image.png" alt="">
                </button>
                <div class="hover-menu">
                    <ul>
                        ${profileLink}
                        <li><button type="button" data-logout>Log out</button></li>
                    </ul>
                </div>
            </div>
        </div>
    `;

    const profile = header.querySelector('.profile');
    const profileButton = header.querySelector('.profile-button');
    profileButton.addEventListener('click', (event) => {
        event.stopPropagation();
        const open = profile.classList.toggle('open');
        profileButton.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', (event) => {
        if (!profile.contains(event.target)) {
            profile.classList.remove('open');
            profileButton.setAttribute('aria-expanded', 'false');
        }
    });

    header.querySelector('[data-logout]').addEventListener('click', logout);

    const hamburger = header.querySelector('.hamburger');
    const menu = header.querySelector('.main-menu');
    hamburger.addEventListener('click', () => {
        const open = menu.style.display !== 'flex';
        menu.style.display = open ? 'flex' : 'none';
        hamburger.setAttribute('aria-expanded', String(open));
    });
}

function renderFooter(footer) {
    footer.classList.add('footer');
    footer.innerHTML = `
        <div class="footer_top">
            <div class="footer_widget1">
                <img id="footerimg" src="/assets/images/symbol-of-caduceus-removebg-preview.png" alt="Caduceus Symbol">
                <p>VIT Bhopal University<br>Bhopal-Indore Highway<br>Kothrikalan, Sehore<br>Madhya Pradesh - 466114</p>
                <p>&copy; ${new Date().getFullYear()} VITB Medical Portal by Group 81</p>
            </div>
        </div>
    `;
}

(function initLayout() {
    const pageRole = document.body.dataset.role;
    if (!pageRole) return;

    // Login check: send logged-out users to the right login page, and users
    // with the other role back to their own home page
    const session = getSession();
    if (!session || session.role !== pageRole) {
        // Hide the page so its content doesn't flash before the redirect
        document.documentElement.style.display = 'none';
    }
    if (!session) {
        const hadToken = Boolean(localStorage.getItem('token'));
        clearSession();
        window.location.replace(LOGIN_PAGE[pageRole] + (hadToken ? '?expired=1' : ''));
        return;
    }
    if (session.role !== pageRole) {
        window.location.replace(HOME_PAGE[session.role] || '/');
        return;
    }

    const header = document.querySelector('header[data-layout]');
    if (header) renderHeader(header, pageRole);

    document.addEventListener('DOMContentLoaded', () => {
        const footer = document.querySelector('footer[data-layout]');
        if (footer) renderFooter(footer);
    });
})();
