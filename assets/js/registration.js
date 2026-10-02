document
  .getElementById("studentRegistrationForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    const registrationNo = document.getElementById("registrationNo").value;
    const name = document.getElementById("name").value;
    const contact = document.getElementById("contact").value;
    const hostel = document.getElementById("hostel").value;
    const room = document.getElementById("roomNo").value;
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const medicalCondition = document.getElementById("medicalCondition").value;
    const bloodGroup = document.getElementById("blood-group").value;
    const gender = document.querySelector(
      'input[name="gender"]:checked'
    )?.value; // Capture gender

    const errorMessageDiv = document.getElementById("error-message");

    // Validate password confirmation
    if (password !== confirmPassword) {
        errorMessageDiv.textContent = 'Passwords do not match.';
        return;
    }

    // Prepare data to be sent to the backend
    const registrationData = {
      registrationNo,
      name,
      gender,
      password,
      hostel,
      room,
      medicalCondition,
      bloodGroup,
      contact, // Include contact in the data
    };

    const registerButton = document.getElementById("registerButton");
    registerButton.disabled = true;
    errorMessageDiv.textContent = "";

    // Send the data to the Node.js server
    try {
      const response = await fetch("/api/student_register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(registrationData),
      });
    
      const responseText = await response.text();
    
      // Try to parse as JSON only if it's actually JSON
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse response as JSON:', parseError);
        throw new Error('Server returned invalid JSON');
      }
    
      if (!result.success) {
        throw new Error(result.message || 'Registration failed');
      }
    
      window.location.href = '/studlogin?registered=1';
    } catch (error) {
      console.error("Error during registration:", error);
      errorMessageDiv.textContent =
        error.message || "An error occurred. Please try again later.";
      registerButton.disabled = false;
    }});
