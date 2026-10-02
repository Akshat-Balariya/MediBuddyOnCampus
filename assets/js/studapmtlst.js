let dataCache = [];

// Fetch the logged-in student's appointments from the server
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
                '<tr><td colspan="4">Error loading data. Please try again later.</td></tr>';
        });
}

// Build table from data
function buildTable(data) {
    const tableBody = document.getElementById('myTable');
    tableBody.innerHTML = ''; // Clear existing rows

    data.forEach(row => {
        const tr = document.createElement('tr');

        [row.name || 'N/A', row.age || 'N/A', formatDate(row.appointment_date), row.status || 'N/A']
            .forEach(value => {
                const td = document.createElement('td');
                td.textContent = value;
                tr.appendChild(td);
            });

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

// Initial setup and event listeners
document.addEventListener('DOMContentLoaded', () => {
    fetchData();

    document.querySelectorAll('th[data-colname]').forEach(header => {
        const column = header.getAttribute('data-colname');
        header.setAttribute('data-order', 'desc');
        header.addEventListener('click', () => sortTable(column, header));
    });
});
