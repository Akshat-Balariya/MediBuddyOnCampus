let medicines = []; // This will hold the medicine data

// Converts a date from the server into the YYYY-MM-DD format used by <input type="date">.
// Uses local date parts so the day doesn't shift for timezones ahead of UTC.
function toDateInputValue(value) {
    const date = new Date(value);
    if (!value || isNaN(date.getTime())) return '';
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
}

// Load the current medicines from the server
function loadMedicines() {
    apiFetch('/api/medicines')
        .then(data => {
            medicines = Array.isArray(data) ? data : [];
            renderMedicines();
        })
        .catch(error => {
            console.error('Error loading medicines:', error);
            document.getElementById('medicineTable').innerHTML =
                '<tr><td colspan="4">Error loading medicines. Please try again later.</td></tr>';
        });
}

// Function to render the medicines table
function renderMedicines() {
    const tableBody = document.getElementById('medicineTable');
    tableBody.innerHTML = ''; // Clear existing rows

    medicines.forEach((med, index) => {
        const tr = document.createElement('tr');

        [med.name, med.count, formatDate(med.expire)].forEach(value => {
            const td = document.createElement('td');
            td.textContent = value;
            tr.appendChild(td);
        });

        const actions = document.createElement('td');
        const editButton = document.createElement('button');
        editButton.textContent = 'Edit';
        editButton.addEventListener('click', () => editMedicine(index));
        const removeButton = document.createElement('button');
        removeButton.textContent = 'Remove';
        removeButton.addEventListener('click', () => removeMedicine(index));
        actions.append(editButton, ' ', removeButton);
        tr.appendChild(actions);

        tableBody.appendChild(tr);
    });
}

// Saves a medicine: updates it if it already exists, otherwise adds it
function saveMedicine(name, count, expire) {
    const exists = medicines.some(med => med.name === name);
    return apiFetch(exists ? '/api/update-medicine' : '/api/add-medicine', {
        method: 'POST',
        body: JSON.stringify({ name, count, expire })
    });
}

// Function to handle form submission
document.getElementById('medicineForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const name = document.getElementById('medicineName').value.trim();
    const count = document.getElementById('medicineCount').value;
    const expire = document.getElementById('medicineExpire').value;

    saveMedicine(name, count, expire)
        .then(result => {
            alert(result.message || 'Medicine saved');
            document.getElementById('medicineForm').reset();
            loadMedicines();
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Failed to save medicine: ' + error.message);
        });
});

// Function to edit a medicine
function editMedicine(index) {
    const med = medicines[index];
    const row = document.getElementById('medicineTable').rows[index];

    // Name is the key used to find the medicine, so it is shown but not editable here
    row.innerHTML = `
        <td colspan="4">
            <strong>${escapeHtml(med.name)}</strong>
            <input type="number" id="editMedicineCount" value="${escapeHtml(med.count)}" min="0" required>
            <input type="date" id="editMedicineExpire" value="${toDateInputValue(med.expire)}" required>
            <button id="updateMedicineBtn">Update</button>
            <button id="cancelEditBtn">Cancel</button>
        </td>
    `;

    document.getElementById('updateMedicineBtn').addEventListener('click', () => updateMedicine(index));
    document.getElementById('cancelEditBtn').addEventListener('click', renderMedicines);
}

// Function to remove a medicine
function removeMedicine(index) {
    const med = medicines[index];
    if (!confirm(`Remove ${med.name}?`)) return;

    apiFetch('/api/delete-medicine', {
        method: 'DELETE',
        body: JSON.stringify({ name: med.name })
    })
    .then(() => loadMedicines())
    .catch(error => {
        console.error('Error:', error);
        alert('Failed to remove medicine: ' + error.message);
    });
}

function updateMedicine(index) {
    const name = medicines[index].name;
    const count = document.getElementById('editMedicineCount').value;
    const expire = document.getElementById('editMedicineExpire').value;

    apiFetch('/api/update-medicine', {
        method: 'POST',
        body: JSON.stringify({ name, count, expire })
    })
    .then(() => {
        alert('Medicine updated successfully');
        loadMedicines();
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Failed to update medicine: ' + error.message);
    });
}

// Initial load
loadMedicines();
