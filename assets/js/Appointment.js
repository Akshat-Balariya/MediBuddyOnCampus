const appointmentForm = document.getElementById('appointmentForm');
const submitButton = document.getElementById('subBtn');

// Don't let the date picker offer times that have already passed
function setMinimumDate() {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('appointment_date').min = now.toISOString().slice(0, 16);
}

// Fill in the name and phone from the student's profile, if they're still empty
async function prefillFromProfile() {
    try {
        const { profile } = await apiFetch('/api/student_profile');
        const nameInput = document.getElementById('name');
        const phoneInput = document.getElementById('phone');
        if (!nameInput.value) nameInput.value = profile.name || '';
        if (!phoneInput.value) phoneInput.value = profile.contact || '';
    } catch (error) {
        // Prefilling is a convenience; the form still works without it
        console.error('Could not load profile:', error);
    }
}

// The registration number comes from the login token on the server, so it isn't sent from here
appointmentForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    try {
        await withButtonDisabled(submitButton, () =>
            apiFetch('/api/book_appointment', {
                method: 'POST',
                body: JSON.stringify(Object.fromEntries(new FormData(appointmentForm)))
            })
        );
        window.location.href = '/confirmappointment';
    } catch (error) {
        console.error('Error:', error);
        notify(error.message || 'Could not book the appointment', 'error');
    }
});

setMinimumDate();
prefillFromProfile();
