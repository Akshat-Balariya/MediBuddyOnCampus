// Reference the form element
const form = document.getElementById('ambulanceForm');

// Reference the location field
const locationField = document.getElementById('locationField');
const charCount = document.getElementById('charCount');

// Keep the "characters left" counter in step with the textarea
function updateCharCount() {
    const remaining = locationField.maxLength - locationField.value.length;
    charCount.textContent = `${remaining} characters left`;
}
locationField.addEventListener('input', updateCharCount);
updateCharCount();

// Ambulances can't be booked for a date that has passed
const today = new Date();
today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
document.getElementById('appointment-date').min = today.toISOString().slice(0, 10);

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
        notify('Please fill in all required fields', 'error');
        return;
    }

    try {
        await withButtonDisabled(document.getElementById('request-ambulance'), () =>
            apiFetch('/api/book_ambulance', {
                method: 'POST',
                body: JSON.stringify(formData)
            })
        );

        form.reset(); // Reset form after successful booking
        location.href = "/confirmambulancebooking";
    } catch (error) {
        console.error('Error:', error);
        notify(error.message || 'An unexpected error occurred', 'error');
    }
});
