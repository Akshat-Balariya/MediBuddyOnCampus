// Shared helpers for talking to the server. Include this before any page script that calls the API.

function loginPageForRole() {
    return localStorage.getItem('role') === 'doctor' ? '/doctorlogin' : '/studlogin';
}

// Sends a JSON request with the saved login token. Resolves with the parsed
// response body, or rejects with an Error carrying the server's message.
// An expired or missing token sends the user back to their login page.
async function apiFetch(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    const token = localStorage.getItem('token');
    if (token) {
        headers.Authorization = 'Bearer ' + token;
    }

    const response = await fetch(path, { ...options, headers });

    let data = null;
    try {
        data = await response.json();
    } catch (parseError) {
        // Non-JSON response; handled below
    }

    if (response.status === 401) {
        const loginPage = loginPageForRole();
        localStorage.removeItem('token');
        alert('Your session has expired. Please log in again.');
        window.location.href = loginPage;
        throw new Error('Not logged in');
    }

    if (!response.ok || (data && data.success === false)) {
        throw new Error((data && data.message) || `Request failed (${response.status})`);
    }

    return data;
}

// Escapes text before it is placed inside an HTML string
function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Formats a date from the server as DD/MM/YYYY, or returns the fallback
function formatDate(value, fallback = 'N/A') {
    const date = new Date(value);
    return value && !isNaN(date.getTime()) ? date.toLocaleDateString('en-GB') : fallback;
}
