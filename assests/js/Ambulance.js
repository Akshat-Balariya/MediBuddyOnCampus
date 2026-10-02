// Reference the form element
const form = document.getElementById('ambulanceForm');

// Reference the location field
const locationField = document.getElementById('locationField');

// Add event listener to form
form.addEventListener('submit', async function (event) {
    event.preventDefault(); // Prevent default form submission

    // Collect form data
    const formData = {
        date: document.getElementById('appointment-date').value,
        location: document.getElementById('Place').value, // Use correct ID for the select field
        detail: locationField.value, // Use correct ID for the textarea
    };

    // Validate form data
    if (!formData.date || !formData.location || !formData.detail) {
        alert('Please fill in all required fields');
        return;
    }

    try {
        await apiFetch('/api/book_ambulance', {
            method: 'POST',
            body: JSON.stringify(formData)
        });

        form.reset(); // Reset form after successful booking
        location.href = "/confirmambulancebooking";
    } catch (error) {
        console.error('Error:', error);
        alert(`Error: ${error.message || 'An unexpected error occurred'}`);
    }
});
