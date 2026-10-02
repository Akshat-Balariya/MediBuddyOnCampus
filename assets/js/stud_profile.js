// Show the logged-in student's details
async function loadProfile() {
    const details = document.getElementById('profileDetails');

    try {
        const { profile } = await apiFetch('/api/student_profile');
        const fields = [
            ['Registration No.', profile.registrationNo],
            ['Name', profile.name],
            ['Gender', profile.gender],
            ['Blood Group', profile.bloodGroup],
            ['Contact', profile.contact],
            ['Hostel', profile.hostel],
            ['Room', profile.room],
            ['Medical Conditions', profile.medicalCondition],
        ];

        details.innerHTML = '';
        fields.forEach(([label, value]) => {
            const dt = document.createElement('dt');
            dt.textContent = label;
            const dd = document.createElement('dd');
            dd.textContent = value || 'Not provided';
            details.append(dt, dd);
        });
    } catch (error) {
        console.error('Could not load profile:', error);
        details.textContent = 'Could not load your details. Please try again later.';
    }
}

loadProfile();
