const errorMessageDiv = document.getElementById('error-message');
const submitButton = document.getElementById('subbutton');

function showMessage(text, color = 'red') {
    errorMessageDiv.textContent = text;
    errorMessageDiv.style.color = color;
}

// Messages passed along by the page that sent the user here
const params = new URLSearchParams(window.location.search);
if (params.has('expired')) {
    showMessage('Your session has expired. Please log in again.');
} else if (params.has('registered')) {
    showMessage('Registration successful! You can now log in.', 'green');
}

// Handle form submission
document.getElementById('studentLoginForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    // Collect form data
    const registrationNo = document.getElementById('name').value.trim(); // 'name' is the ID for the registration number input
    const password = document.getElementById('password').value;

    submitButton.disabled = true;
    showMessage('');

    // Send the data to the Node.js server
    try {
        const response = await fetch('/api/student_login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ registrationNo, password }),
        });

        const data = await response.json();
        if (data.success) {
            // Store registration number and JWT token in localStorage
            localStorage.setItem('reg_no', registrationNo);
            localStorage.setItem('token', data.token);
            localStorage.setItem('role', 'student');

            window.location.href = '/homepage';
            return;
        }

        // Show the server's message (e.g. wrong password, too many attempts)
        showMessage(data.message || 'Invalid Registration Number or Password');
    } catch (error) {
        console.error('Error connecting to the server:', error);
        showMessage('Error connecting to the server');
    }

    submitButton.disabled = false;
});
