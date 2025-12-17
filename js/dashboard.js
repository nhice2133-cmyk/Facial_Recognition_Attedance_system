/**
 * Dashboard Module
 * Handles dashboard statistics and rendering
 */

// DOM Elements
const statTotalMembers = document.getElementById('total-members-count');
const statPresentToday = document.getElementById('present-count');
const statAbsentToday = document.getElementById('absent-count');
const statLateToday = document.getElementById('late-count');
const dashboardEventSelect = document.getElementById('dashboard-event-select');

function animateStat(element, endValue) {
    if (!element) return;
    const startValue = parseInt(element.textContent.replace(/[^0-9.-]/g, ''), 10) || 0;
    const duration = 500;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const currentValue = Math.round(startValue + (endValue - startValue) * progress);
        element.textContent = currentValue.toString();
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

/**
 * Load events into dashboard event select
 */
async function loadDashboardEvents() {
    if (!dashboardEventSelect) return;

    try {
        const events = await getAllEvents(true); // Only active events
        dashboardEventSelect.innerHTML = '<option value="">All Events (Today)</option>';

        events.forEach(event => {
            const option = document.createElement('option');
            option.value = event.eventId;
            option.textContent = `${event.eventName} (${new Date(event.eventDate).toLocaleDateString()})`;
            dashboardEventSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading events for dashboard:', error);
    }
}

/**
 * Render dashboard statistics
 */
async function renderDashboard() {
    // Load events first
    await loadDashboardEvents();

    const totalMembers = await getUserCount();

    // Get selected event
    const selectedEventId = dashboardEventSelect && dashboardEventSelect.value ? parseInt(dashboardEventSelect.value) : null;

    let presentToday = 0;
    let lateToday = 0;

    if (selectedEventId) {
        // Get attendance for specific event
        const logs = await getAttendanceLogsByEvent(selectedEventId);
        const today = new Date().toISOString().split('T')[0];
        const todayLogs = logs.filter(log => {
            const logDate = new Date(log.time).toISOString().split('T')[0];
            return logDate === today && log.attendanceType === 'time_in';
        });
        presentToday = todayLogs.length;
        lateToday = todayLogs.filter(log => log.isLate).length;
    } else {
        // Get today's attendance (all events)
        presentToday = await getAttendanceCount();
        const allLogs = await getAllAttendanceLogs();
        const today = new Date().toISOString().split('T')[0];
        const todayLogs = allLogs.filter(log => {
            const logDate = new Date(log.time).toISOString().split('T')[0];
            return logDate === today && log.attendanceType === 'time_in';
        });
        lateToday = todayLogs.filter(log => log.isLate).length;
    }

    const absentToday = Math.max(totalMembers - presentToday, 0);

    animateStat(statTotalMembers, totalMembers);
    animateStat(statPresentToday, presentToday);
    animateStat(statAbsentToday, absentToday);
    animateStat(statLateToday, lateToday);
}

// Add event listener for event selection change
if (dashboardEventSelect) {
    dashboardEventSelect.addEventListener('change', () => {
        renderDashboard();
    });
}

