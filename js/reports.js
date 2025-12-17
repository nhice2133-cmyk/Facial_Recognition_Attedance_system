/**
 * Reports Module
 * Handles attendance reports and logging
 */

// DOM Elements
const reportsTableBody = document.getElementById('reports-table-body');
const reportsDateInput = document.getElementById('reports-date-input');
const reportsDateContainer = document.getElementById('reports-date-container');
const reportsEventSelect = document.getElementById('reports-event-select');
const reportsSearchInput = document.getElementById('reports-search-input');
const clearReportsFiltersBtn = document.getElementById('clear-reports-filters');
const downloadReportBtn = document.getElementById('download-report-btn');

// State
let currentReportLogs = [];
let reportsControlsInitialized = false;
let sortState = {
    column: 'time', // Default sort by timestamp
    direction: 'desc' // Default: newest first
};

/**
 * Log an attendance entry
 * @param {Object} user - User object
 * @param {number|null} eventId - Optional event ID
 * @param {string} attendanceType - 'time_in' or 'time_out'
 */
async function logAttendance(user, eventId = null, attendanceType = 'time_in') {
    const logEntry = {
        userId: user.id,
        fullName: user.fullName,
        eventId: eventId,
        attendanceType: attendanceType,
        time: new Date()
    };

    await addAttendanceLog(logEntry);
}

/**
 * Load events into reports event select
 */
async function loadReportsEvents() {
    if (!reportsEventSelect) return;

    try {
        const events = await getAllEvents(false); // All events
        reportsEventSelect.innerHTML = '<option value="">All Events</option>';

        events.forEach(event => {
            const option = document.createElement('option');
            option.value = event.eventId;
            option.textContent = `${event.eventName} (${new Date(event.eventDate).toLocaleDateString()})`;
            reportsEventSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading events for reports:', error);
    }
}

/**
 * Render the attendance reports table
 */
async function renderReports() {
    if (!reportsTableBody) return;

    initializeReportsControls();

    initializeReportsControls();

    // loadReportsEvents() is now called from main.js when entering the page
    // to prevent resetting the filter on every render

    reportsTableBody.innerHTML = '<tr><td colspan="7" class="text-center p-4 text-gray-500">Loading reports...</td></tr>'; // Show loading

    const selectedDate = reportsDateInput ? reportsDateInput.value : '';
    const selectedEventId = reportsEventSelect && reportsEventSelect.value ? parseInt(reportsEventSelect.value) : null;
    const searchTerm = reportsSearchInput ? reportsSearchInput.value.toLowerCase().trim() : '';

    let logs = [];
    if (selectedEventId) {
        logs = await getAttendanceLogsByEvent(selectedEventId);
        // Filter by date if selected
        if (selectedDate) {
            const filterDate = selectedDate;
            logs = logs.filter(log => {
                const logDate = new Date(log.time).toISOString().split('T')[0];
                return logDate === filterDate;
            });
        }
    } else if (selectedDate) {
        logs = await getAttendanceLogsByDate(selectedDate);
    } else {
    } else {
        logs = await getAllAttendanceLogs();
    }

    // Apply search filter
    if (searchTerm) {
        logs = logs.filter(log => {
            const fullName = (log.fullName || '').toLowerCase();
            const userId = (log.userId || '').toLowerCase();
            return fullName.includes(searchTerm) || userId.includes(searchTerm);
        });
    }

    // Apply sorting
    const sortedLogs = sortAttendanceLogs(logs, sortState.column, sortState.direction);
    currentReportLogs = sortedLogs;

    // Update sort indicators (must be before clearing table body)
    updateSortIndicators(sortState.column, sortState.direction);

    reportsTableBody.innerHTML = ''; // Clear table

    if (sortedLogs.length === 0) {
        reportsTableBody.innerHTML = `<tr><td colspan="7" class="text-center p-4 text-gray-500">No attendance marked yet.</td></tr>`;
        return;
    }

    sortedLogs.forEach(log => {
        const row = document.createElement('tr');
        row.className = "hover:bg-gray-100 dark:hover:bg-gray-800";

        // Style role badge
        const roleBadgeClass = log.role === 'Student'
            ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
            : log.role === 'Teacher'
                ? 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
                : 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';

        // Style attendance type badge
        const typeBadgeClass = log.attendanceType === 'time_in'
            ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200'
            : 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200';

        // Style late status badge
        const statusBadge = log.isLate && log.attendanceType === 'time_in'
            ? '<span class="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">Late</span>'
            : '<span class="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">On Time</span>';

        row.innerHTML = `
            <td class="py-3 px-4">${log.fullName}</td>
            <td class="py-3 px-4">${log.userId}</td>
            <td class="py-3 px-4">
                <span class="inline-block px-2 py-1 text-xs font-semibold rounded-full ${roleBadgeClass}">
                    ${log.role}
                </span>
            </td>
            <td class="py-3 px-4">${log.eventName || 'N/A'}</td>
            <td class="py-3 px-4">
                <span class="inline-block px-2 py-1 text-xs font-semibold rounded-full ${typeBadgeClass}">
                    ${log.attendanceType === 'time_in' ? 'Time In' : 'Time Out'}
                </span>
            </td>
            <td class="py-3 px-4">${statusBadge}</td>
            <td class="py-3 px-4">${formatTimestamp(log.time)}</td>
        `;
        reportsTableBody.appendChild(row);
    });
}

/**
 * Format timestamp to 12-hour format with date
 * @param {Date} date - Date object
 * @returns {string} Formatted date and time
 */
function formatTimestamp(date) {
    if (!date) return '';

    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '';

    // Format date
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    const year = d.getFullYear();

    // Format time in 12-hour format
    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12

    return `${month}/${day}/${year} ${hours}:${minutes} ${ampm}`;
}

/**
 * Sort attendance logs by column and direction
 * @param {Array} logs - Array of attendance log objects
 * @param {string} column - Column to sort by
 * @param {string} direction - 'asc' or 'desc'
 * @returns {Array} Sorted array
 */
function sortAttendanceLogs(logs, column, direction) {
    const sorted = [...logs];

    sorted.sort((a, b) => {
        let aVal, bVal;

        switch (column) {
            case 'fullName':
                aVal = (a.fullName || '').toLowerCase();
                bVal = (b.fullName || '').toLowerCase();
                break;
            case 'userId':
                aVal = (a.userId || '').toString();
                bVal = (b.userId || '').toString();
                break;
            case 'role':
                aVal = (a.role || '').toLowerCase();
                bVal = (b.role || '').toLowerCase();
                break;
            case 'eventName':
                aVal = (a.eventName || 'N/A').toLowerCase();
                bVal = (b.eventName || 'N/A').toLowerCase();
                break;
            case 'attendanceType':
                aVal = (a.attendanceType || '').toLowerCase();
                bVal = (b.attendanceType || '').toLowerCase();
                break;
            case 'status':
                // Sort by isLate status (false/0 first, then true/1)
                aVal = a.isLate ? 1 : 0;
                bVal = b.isLate ? 1 : 0;
                break;
            case 'time':
            default:
                // Sort by timestamp - handle both Date objects and date strings
                try {
                    aVal = a.time instanceof Date ? a.time.getTime() : (a.time ? new Date(a.time).getTime() : (a.attendance_time ? new Date(a.attendance_time).getTime() : 0));
                    bVal = b.time instanceof Date ? b.time.getTime() : (b.time ? new Date(b.time).getTime() : (b.attendance_time ? new Date(b.attendance_time).getTime() : 0));
                } catch (e) {
                    aVal = 0;
                    bVal = 0;
                }
                break;
        }

        // Compare values
        if (aVal < bVal) return direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return direction === 'asc' ? 1 : -1;
        return 0;
    });

    return sorted;
}

/**
 * Update sort indicators in table headers
 * @param {string} column - Currently sorted column
 * @param {string} direction - Sort direction ('asc' or 'desc')
 */
function updateSortIndicators(column, direction) {
    const indicators = document.querySelectorAll('.sort-indicator');
    indicators.forEach(indicator => {
        const indicatorColumn = indicator.getAttribute('data-column');
        indicator.classList.remove('active', 'asc', 'desc');

        if (indicatorColumn === column) {
            indicator.classList.add('active', direction);
        }
    });
}

/**
 * Handle column header click for sorting
 * @param {string} column - Column to sort by
 */
function handleSortClick(column) {
    // If clicking the same column, toggle direction
    if (sortState.column === column) {
        sortState.direction = sortState.direction === 'asc' ? 'desc' : 'asc';
    } else {
        // New column, default to ascending
        sortState.column = column;
        sortState.direction = 'asc';
    }

    // Re-render reports with new sort
    renderReports();
}

/**
 * Initialize report controls (date picker, event select, buttons)
 */
function initializeReportsControls() {
    if (reportsControlsInitialized) return;
    reportsControlsInitialized = true;

    if (reportsDateInput) {
        reportsDateInput.addEventListener('change', () => {
            renderReports();
        });
    }

    if (reportsEventSelect) {
        reportsEventSelect.addEventListener('change', () => {
            toggleDateFilterVisibility();
            renderReports();
        });
    }

    if (reportsSearchInput) {
        reportsSearchInput.addEventListener('input', () => {
            renderReports();
        });
    }

    if (clearReportsFiltersBtn) {
        clearReportsFiltersBtn.addEventListener('click', () => {
            if (reportsDateInput) reportsDateInput.value = '';
            if (reportsEventSelect) reportsEventSelect.value = '';
            if (reportsSearchInput) reportsSearchInput.value = '';
            toggleDateFilterVisibility();
            renderReports();
        });
    }

    if (downloadReportBtn) {
        downloadReportBtn.addEventListener('click', downloadAttendanceReport);
    }

    // Initialize sortable column headers
    const sortableHeaders = document.querySelectorAll('th[data-sort]');
    sortableHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const column = header.getAttribute('data-sort');
            handleSortClick(column);
        });
    });

    // Initial check
    toggleDateFilterVisibility();
}

/**
 * Toggle visibility of date filter based on event selection
 */
function toggleDateFilterVisibility() {
    if (!reportsDateContainer || !reportsEventSelect) return;

    if (reportsEventSelect.value) {
        // Event selected - hide date filter
        reportsDateContainer.classList.add('hidden');
        if (reportsDateInput) reportsDateInput.value = '';
    } else {
        // No event selected - show date filter
        reportsDateContainer.classList.remove('hidden');
    }
}

/**
 * Download the current attendance report as CSV
 */
function downloadAttendanceReport() {
    if (!currentReportLogs || currentReportLogs.length === 0) {
        alert('No attendance records to download.');
        return;
    }

    const selectedDate = reportsDateInput ? reportsDateInput.value : '';
    const csvRows = [];
    csvRows.push('"Full Name","ID Number","Role","Event","Type","Status","Timestamp"');

    currentReportLogs.forEach(log => {
        const fullName = String(log.fullName || '').replace(/"/g, '""');
        const userId = String(log.userId || '').replace(/"/g, '""');
        const role = String(log.role || 'N/A').replace(/"/g, '""');
        const eventName = String(log.eventName || 'N/A').replace(/"/g, '""');
        const type = String(log.attendanceType === 'time_in' ? 'Time In' : 'Time Out').replace(/"/g, '""');
        const status = String(log.isLate && log.attendanceType === 'time_in' ? 'Late' : 'On Time').replace(/"/g, '""');
        const timeString = formatTimestamp(log.time).replace(/"/g, '""');
        csvRows.push(`"${fullName}","${userId}","${role}","${eventName}","${type}","${status}","${timeString}"`);
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const filenameDatePart = selectedDate || new Date().toISOString().slice(0, 10);
    link.href = url;
    link.setAttribute('download', `attendance-report-${filenameDatePart}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

