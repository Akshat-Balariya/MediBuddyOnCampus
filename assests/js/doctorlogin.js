// Handle form submission
document.getElementById('doctorlogin').addEventListener('submit', async function (e) {
    e.preventDefault();

    // Collect form data
    const empNo = document.getElementById('name').value;
    const password = document.getElementById('password').value;

    // Prepare data to be sent to the backend
    const loginData = {
        empNo: empNo,
        password: password
    };

    const errorMessageDiv = document.getElementById('error-message');

    // Send the data to the Node.js server
    try {
        const response = await fetch('/api/doctor_login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(loginData),
        });

        const data = await response.json();

        if (data.success) {
            // Store the JWT so the doctor pages can call protected routes
            localStorage.setItem('token', data.token);
            localStorage.setItem('role', 'doctor');
            localStorage.removeItem('reg_no');

            alert("Login successful!");
            window.location.href = 'homepagedoc';
        } else {
            errorMessageDiv.textContent = data.message || 'Invalid Employee ID or Password';
        }
    } catch (error) {
        errorMessageDiv.textContent = 'Error connecting to the server';
    }
});
