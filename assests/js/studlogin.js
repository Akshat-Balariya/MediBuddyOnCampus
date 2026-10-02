// Handle form submission
document.getElementById('studentLoginForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    // Collect form data
    const registrationNo = document.getElementById('name').value; // Assuming 'name' is the ID for the registration number input
    const password = document.getElementById('password').value;

    // Prepare data to be sent to the backend
    const loginData = {
        registrationNo: registrationNo,
        password: password
    };

    const errorMessageDiv = document.getElementById('error-message');

    // Send the data to the Node.js server
    try {
        const response = await fetch('/api/student_login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(loginData),
        });

        const data = await response.json();
        if (data.success) {
            // Store registration number and JWT token in localStorage
            localStorage.setItem('reg_no', registrationNo); // Store registration number
            localStorage.setItem('token', data.token); // Store JWT token
            localStorage.setItem('role', 'student');

            alert("Login successful");

            // Redirect to the homepage or any other page
            window.location.href = './homepage';
        } else {
            // If login fails, show the server's message (e.g. wrong password, too many attempts)
            errorMessageDiv.textContent = data.message || 'Invalid Registration Number or Password';
            errorMessageDiv.style.color = 'red';
        }
    } catch (error) {
        // Handle any error from the request
        console.error('Error connecting to the server:', error);
        errorMessageDiv.textContent = 'Error connecting to the server';
        errorMessageDiv.style.color = 'red';
    }
});
