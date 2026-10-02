const errorMessageDiv = document.getElementById('error-message');
const submitButton = document.getElementById('subbutton');

// Message passed along when an expired session sent the user here
if (new URLSearchParams(window.location.search).has('expired')) {
    errorMessageDiv.textContent = 'Your session has expired. Please log in again.';
}

// Handle form submission
document.getElementById('doctorlogin').addEventListener('submit', async function (e) {
    e.preventDefault();

    // Collect form data
    const empNo = document.getElementById('name').value.trim();
    const password = document.getElementById('password').value;

    submitButton.disabled = true;
    errorMessageDiv.textContent = '';

    // Send the data to the Node.js server
    try {
        const response = await fetch('/api/doctor_login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ empNo, password }),
        });

        const data = await response.json();

        if (data.success) {
            // Store the JWT so the doctor pages can call protected routes
            localStorage.setItem('token', data.token);
            localStorage.setItem('role', 'doctor');
            localStorage.removeItem('reg_no');

            window.location.href = '/homepagedoc';
            return;
        }

        errorMessageDiv.textContent = data.message || 'Invalid Employee ID or Password';
    } catch (error) {
        errorMessageDiv.textContent = 'Error connecting to the server';
    }

    submitButton.disabled = false;
});
