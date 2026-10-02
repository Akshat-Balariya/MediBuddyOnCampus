let dataCache = [];
let medicineData = [];

// Fetch all appointments from the server
function fetchData() {
    apiFetch('/api/appointment')
        .then(data => {
            if (!Array.isArray(data)) {
                throw new Error('Unexpected data format');
            }
            dataCache = data;
            buildTable(dataCache);
        })
        .catch(error => {
            console.error('Error fetching data:', error);
            document.getElementById('myTable').innerHTML =
                '<tr><td colspan="5">Error loading data. Please try again later.</td></tr>';
        });
}

// Fetch medicine data for the dispensing autocomplete
function fetchMedicineData() {
    return apiFetch('/api/medicines')
        .then(data => {
            medicineData = Array.isArray(data) ? data : [];
        })
        .catch(error => {
            console.error('Error fetching medicine data:', error);
        });
}

// Build table from data. Rows are keyed by apmtid so they stay correct after sorting or searching.
function buildTable(data) {
    const tableBody = document.getElementById('myTable');
    tableBody.innerHTML = ''; // Clear existing rows

    data.forEach(row => {
        const tr = document.createElement('tr');
        tr.id = `row-${row.apmtid}`;

        [row.name || 'N/A', row.age || 'N/A', formatDate(row.appointment_date), row.status || 'N/A']
            .forEach(value => {
                const td = document.createElement('td');
                td.textContent = value;
                tr.appendChild(td);
            });

        const buttonCell = document.createElement('td');
        const button = document.createElement('button');
        button.textContent = '+';
        button.addEventListener('click', () => handleButtonClick(row.apmtid));
        buttonCell.appendChild(button);
        tr.appendChild(buttonCell);

        tableBody.appendChild(tr);
    });
}

// Filter table by search input (name, status or appointment date)
function searchTable() {
    const searchValue = document.getElementById('searchInput').value.toLowerCase();
    const filteredData = dataCache.filter(row =>
        row.name?.toLowerCase().includes(searchValue) ||
        row.status?.toLowerCase().includes(searchValue) ||
        formatDate(row.appointment_date, '').includes(searchValue)
    );
    buildTable(filteredData);
}

// Sort table based on column
function sortTable(column, header) {
    const currentOrder = header.getAttribute('data-order');
    const newOrder = currentOrder === 'asc' ? 'desc' : 'asc';
    header.setAttribute('data-order', newOrder);

    const displayName = column.charAt(0).toUpperCase() + column.slice(1).replace(/_/g, ' ');
    header.textContent = `${displayName} ${newOrder === 'asc' ? '↑' : '↓'}`;

    dataCache.sort((a, b) => {
        let comparison = 0;

        switch (column) {
            case 'age':
                comparison = (a.age || 0) - (b.age || 0);
                break;
            case 'appointment_date':
                comparison = new Date(a.appointment_date) - new Date(b.appointment_date);
                break;
            case 'status': {
                const statusOrder = { open: 1, closed: 2 }; // Define priority
                comparison = (statusOrder[a.status?.toLowerCase()] || 3) -
                             (statusOrder[b.status?.toLowerCase()] || 3);
                break;
            }
            default:
                comparison = String(a[column] || '').localeCompare(String(b[column] || ''));
        }

        return newOrder === 'asc' ? comparison : -comparison;
    });

    searchTable();
}

// Toggle the medicine dispensing row under an appointment
function handleButtonClick(apmtid) {
    const existingDetailsRow = document.getElementById(`details-row-${apmtid}`);
    if (existingDetailsRow) {
        existingDetailsRow.remove();
        return;
    }

    // Only one dispensing form open at a time, since its inputs use fixed IDs
    document.querySelectorAll('[id^="details-row-"]').forEach(row => row.remove());

    const appointment = dataCache.find(row => row.apmtid === apmtid);
    const clickedRow = document.getElementById(`row-${apmtid}`);
    if (!appointment || !clickedRow) {
        console.error(`Appointment ${apmtid} not found`);
        return;
    }

    const isClosed = appointment.status?.toLowerCase() === 'closed';
    const additionalInfo = `
        <tr id="details-row-${apmtid}">
            <td colspan="5">
                <div class="details-content" style="padding: 10px;">
                    <div style="margin-bottom: 8px;">Medicine Dispensing for ${escapeHtml(appointment.name || 'N/A')}</div>
                    ${isClosed ? '<div>This appointment is closed.</div>' : `
                    <div class="medicine-input-container">
                        <input type="text" id="medicineSearch" placeholder="Search Medicine" autocomplete="off">
                        <div id="medicineSuggestions" class="suggestions-container"></div>
                        <span id="availableCount" style="margin-left: 10px;"></span>
                        <input type="number" id="medicineCount" placeholder="Medicine Count" min="1">
                        <button id="submitMedicine">Submit</button>
                    </div>`}
                </div>
            </td>
        </tr>
    `;

    clickedRow.insertAdjacentHTML('afterend', additionalInfo);

    if (!isClosed) {
        document.getElementById('submitMedicine')
            .addEventListener('click', () => submitMedicineUsage(apmtid));
        fetchMedicineData().then(setupMedicineAutocomplete);
    }
}

// Setup autocomplete for medicine search
function setupMedicineAutocomplete() {
    const medicineInput = document.getElementById('medicineSearch');
    if (!medicineInput) return;

    medicineInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const suggestionsContainer = document.getElementById('medicineSuggestions');
        suggestionsContainer.innerHTML = '';

        if (searchTerm.length > 0) {
            const filteredMedicines = medicineData.filter(med =>
                med.name.toLowerCase().includes(searchTerm)
            );

            filteredMedicines.forEach(med => {
                const div = document.createElement('div');
                div.textContent = `${med.name} (Available: ${med.count})`;
                div.classList.add('suggestion-item');
                div.addEventListener('click', () => {
                    medicineInput.value = med.name;
                    suggestionsContainer.innerHTML = '';
                    updateAvailableCount(med);
                });
                suggestionsContainer.appendChild(div);
            });
        }
    });
}

// Update available count display
function updateAvailableCount(medicine) {
    const availableCountSpan = document.getElementById('availableCount');
    availableCountSpan.textContent = `Available: ${medicine.count}`;
}

// Handle medicine submission
function submitMedicineUsage(apmtid) {
    const medicineName = document.getElementById('medicineSearch').value;
    const requestedCount = parseInt(document.getElementById('medicineCount').value);

    // Validate inputs
    if (!medicineName || isNaN(requestedCount) || requestedCount <= 0) {
        notify('Please enter a valid medicine and count', 'error');
        return;
    }

    // Find the specific medicine
    const selectedMedicine = medicineData.find(med => med.name === medicineName);

    if (!selectedMedicine) {
        notify('Medicine not found', 'error');
        return;
    }

    // Check if sufficient quantity is available
    if (requestedCount > selectedMedicine.count) {
        notify(`Insufficient quantity. Only ${selectedMedicine.count} available.`, 'error');
        return;
    }

    withButtonDisabled(document.getElementById('submitMedicine'), () =>
        apiFetch('/api/update-medicine-and-appointment', {
            method: 'POST',
            body: JSON.stringify({
                appointmentId: apmtid,
                medicineName: medicineName,
                count: requestedCount
            })
        })
    )
    .then(() => {
        notify('Medicine dispensed and appointment closed', 'success');
        fetchData();
    })
    .catch(error => {
        console.error('Error:', error);
        notify(error.message || 'An error occurred while updating', 'error');
    });
}

// Basic CSS for suggestions
const style = document.createElement('style');
style.textContent = `
    .suggestions-container {
        max-height: 200px;
        overflow-y: auto;
        border: 1px solid #ddd;
        display: none;
    }
    #medicineSearch:focus + .suggestions-container,
    .suggestions-container:hover {
        display: block;
    }
    .suggestion-item {
        padding: 5px;
        cursor: pointer;
    }
    .suggestion-item:hover {
        background-color: #f1f1f1;
    }
`;
document.head.appendChild(style);

// Initial setup and event listeners
document.addEventListener('DOMContentLoaded', () => {
    fetchData();

    document.querySelectorAll('th[data-colname]').forEach(header => {
        const column = header.getAttribute('data-colname');
        header.setAttribute('data-order', 'desc');
        header.addEventListener('click', () => sortTable(column, header));
    });
});
