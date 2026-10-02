let dataCache = [];

// Toggle the details row under a medicine. Rows are keyed by position in the
// list currently shown, so look the medicine up by name.
function handleButtonClick(rowId, name) {
    const existingDetailsRow = document.getElementById(`details-row-${rowId}`);
    if (existingDetailsRow) {
        existingDetailsRow.remove();
        return;
    }

    const medicine = dataCache.find(row => row.name === name);
    const formattedLastUpdated = formatDate(medicine?.last_updated, 'Not Updated');

    const additionalInfo = `
        <tr id="details-row-${rowId}">
            <td colspan="4">
                <div class="details-content" style="padding: 10px;">
                    <div style="margin-bottom: 8px;">Additional details for ${escapeHtml(medicine?.name || 'N/A')}</div>
                    <div>Last Updated on: ${escapeHtml(formattedLastUpdated)}</div>
                </div>
            </td>
        </tr>
    `;

    const clickedRow = document.getElementById(`row-${rowId}`);
    if (clickedRow) {
        clickedRow.insertAdjacentHTML('afterend', additionalInfo);
    } else {
        console.error(`Row with ID #row-${rowId} not found`);
    }
}

// Fetch data from the server
function fetchData() {
    apiFetch('/api/data')
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
    tableBody.innerHTML = '';

    data.forEach((row, index) => {
        const tr = document.createElement('tr');
        tr.id = `row-${index}`;

        [row.name || 'N/A', row.count ?? 'N/A', formatDate(row.expire, 'Invalid Date')]
            .forEach(value => {
                const td = document.createElement('td');
                td.textContent = value;
                tr.appendChild(td);
            });

        const buttonCell = document.createElement('td');
        const button = document.createElement('button');
        button.textContent = '+';
        button.addEventListener('click', () => handleButtonClick(index, row.name));
        buttonCell.appendChild(button);
        tr.appendChild(buttonCell);

        tableBody.appendChild(tr);
    });
}

// Filter table by search input
function searchTable() {
    const searchValue = document.getElementById('searchInput').value.toLowerCase();
    const filteredData = dataCache.filter(row =>
        row.name?.toLowerCase().includes(searchValue) ||
        row.count?.toString().includes(searchValue) ||
        formatDate(row.expire, '').includes(searchValue)
    );
    buildTable(filteredData);
}

// Sort table based on column
function sortTable(column, header) {
    const currentOrder = header.getAttribute('data-order');
    const newOrder = currentOrder === 'asc' ? 'desc' : 'asc';
    header.setAttribute('data-order', newOrder);

    const displayName = column.charAt(0).toUpperCase() + column.slice(1);
    header.textContent = `${displayName} ${newOrder === 'asc' ? '↑' : '↓'}`;

    dataCache.sort((a, b) => {
        let comparison = 0;

        switch(column) {
            case 'count':
                comparison = (a.count || 0) - (b.count || 0);
                break;
            case 'expire':
                comparison = new Date(a.expire) - new Date(b.expire);
                break;
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
