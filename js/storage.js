/**
 * Storage Module
 * Manages database operations via PHP API
 */

const API_BASE_URL = 'api';

/**
 * Helper function to make API calls
 * @param {string} endpoint - API endpoint
 * @param {string} method - HTTP method
 * @param {Object} data - Request body data
 * @returns {Promise<Object>} API response
 */
async function apiCall(endpoint, method = 'GET', data = null) {
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
        }
    };

    if (data && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(`${API_BASE_URL}/${endpoint}`, options);
        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'API request failed');
        }

        return result;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

/**
 * Convert database user format to app format
 * @param {Object} dbUser - User from database
 * @returns {Object} User in app format
 */
function formatUser(dbUser) {
    return {
        id: dbUser.id,
        fullName: dbUser.full_name,
        role: dbUser.role,
        descriptor: typeof dbUser.descriptor === 'string' ? JSON.parse(dbUser.descriptor) : dbUser.descriptor,
        photo: dbUser.photo
    };
}

/**
 * Convert database log format to app format
 * @param {Object} dbLog - Log from database
 * @returns {Object} Log in app format
 */
function formatLog(dbLog) {
    return {
        userId: dbLog.user_id,
        fullName: dbLog.full_name,
        role: dbLog.role || 'N/A',
        time: new Date(dbLog.attendance_time),
        eventId: dbLog.event_id || null,
        eventName: dbLog.event_name || null,
        eventDate: dbLog.event_date || null,
        attendanceType: dbLog.attendance_type || 'time_in',
        isLate: dbLog.is_late === 1 || dbLog.is_late === '1'
    };
}

/**
 * Get all users from the database
 * @returns {Promise<Array>} Array of user objects
 */
async function getAllUsers() {
    try {
        const result = await apiCall('users.php');
        return result.data.map(formatUser);
    } catch (error) {
        console.error('Error fetching users:', error);
        return [];
    }
}

/**
 * Add a new user to the database
 * @param {Object} user - User object with id, fullName, role, descriptor, photo
 * @returns {Promise<boolean>} True if added successfully, false if user already exists
 */
async function addUser(user) {
    try {
        await apiCall('users.php', 'POST', {
            id: user.id,
            fullName: user.fullName,
            role: user.role,
            descriptor: user.descriptor,
            photo: user.photo
        });
        return true;
    } catch (error) {
        console.error('Error adding user:', error);
        if (error.message.includes('already exists') || error.message.includes('409')) {
            return false;
        }
        throw error;
    }
}

/**
 * Find a user by ID
 * @param {string} userId - The user's ID number
 * @returns {Promise<Object|null>} User object or null if not found
 */
async function getUserById(userId) {
    try {
        const result = await apiCall(`users.php?id=${encodeURIComponent(userId)}`);
        return formatUser(result.data);
    } catch (error) {
        if (error.message.includes('404') || error.message.includes('not found')) {
            return null;
        }
        console.error('Error fetching user:', error);
        return null;
    }
}

/**
 * Delete a user from the database
 * @param {string} userId - The user's ID number
 * @returns {Promise<boolean>} True if deleted successfully, false otherwise
 */
async function deleteUser(userId) {
    try {
        await apiCall(`users.php?id=${encodeURIComponent(userId)}`, 'DELETE');
        return true;
    } catch (error) {
        console.error('Error deleting user:', error);
        throw error;
    }
}

/**
 * Get total number of users
 * @returns {Promise<number>} Total user count
 */
async function getUserCount() {
    try {
        const users = await getAllUsers();
        return users.length;
    } catch (error) {
        console.error('Error getting user count:', error);
        return 0;
    }
}

/**
 * Add an attendance log entry
 * @param {Object} logEntry - Object with userId, fullName, eventId (optional), attendanceType (optional), time (optional)
 * @returns {Promise<boolean>} True if added, false if duplicate
 */
async function addAttendanceLog(logEntry) {
    try {
        await apiCall('attendance.php', 'POST', {
            userId: logEntry.userId,
            fullName: logEntry.fullName,
            eventId: logEntry.eventId || null,
            attendanceType: logEntry.attendanceType || 'time_in',
            time: logEntry.time ? (() => {
                const d = new Date(logEntry.time);
                const pad = (n) => n.toString().padStart(2, '0');
                return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
            })() : undefined
        });
        return true;
    } catch (error) {
        console.error('Error adding attendance log:', error);
        if (error.message.includes('already marked') || error.message.includes('409')) {
            return false;
        }
        throw error;
    }
}

/**
 * Get all attendance logs
 * @returns {Promise<Array>} Array of attendance log entries
 */
async function getAllAttendanceLogs() {
    try {
        const result = await apiCall('attendance.php');
        return result.data.map(formatLog);
    } catch (error) {
        console.error('Error fetching attendance logs:', error);
        return [];
    }
}

/**
 * Get attendance logs for a specific date
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise<Array>} Attendance logs for the date
 */
async function getAttendanceLogsByDate(date) {
    if (!date) {
        return getAllAttendanceLogs();
    }
    try {
        const result = await apiCall(`attendance.php?date=${encodeURIComponent(date)}`);
        return result.data.map(formatLog);
    } catch (error) {
        console.error('Error fetching attendance logs by date:', error);
        return [];
    }
}

/**
 * Get attendance logs for a specific event
 * @param {number} eventId - Event ID
 * @returns {Promise<Array>} Attendance logs for the event
 */
async function getAttendanceLogsByEvent(eventId) {
    try {
        const result = await apiCall(`attendance.php?eventId=${eventId}`);
        return result.data.map(formatLog);
    } catch (error) {
        console.error('Error fetching attendance logs by event:', error);
        return [];
    }
}

/**
 * Get all events
 * @param {boolean} activeOnly - If true, only return active events
 * @returns {Promise<Array>} Array of event objects
 */
async function getAllEvents(activeOnly = false) {
    try {
        const endpoint = activeOnly ? 'events.php?active=1' : 'events.php';
        const result = await apiCall(endpoint);
        return result.data.map(event => ({
            eventId: event.event_id,
            eventName: event.event_name,
            eventDate: event.event_date,
            timeInStart: event.time_in_start,
            timeInEnd: event.time_in_end,
            timeOutStart: event.time_out_start,
            timeOutEnd: event.time_out_end,
            isActive: event.is_active === 1 || event.is_active === '1'
        }));
    } catch (error) {
        console.error('Error fetching events:', error);
        return [];
    }
}

/**
 * Get a single event by ID
 * @param {number} eventId - Event ID
 * @returns {Promise<Object|null>} Event object or null if not found
 */
async function getEventById(eventId) {
    try {
        const result = await apiCall(`events.php?id=${eventId}`);
        const event = result.data;
        return {
            eventId: event.event_id,
            eventName: event.event_name,
            eventDate: event.event_date,
            timeInStart: event.time_in_start,
            timeInEnd: event.time_in_end,
            timeOutStart: event.time_out_start,
            timeOutEnd: event.time_out_end,
            isActive: event.is_active === 1 || event.is_active === '1'
        };
    } catch (error) {
        if (error.message.includes('404') || error.message.includes('not found')) {
            return null;
        }
        console.error('Error fetching event:', error);
        return null;
    }
}

/**
 * Add a new event
 * @param {Object} event - Event object with eventName, eventDate, timeInStart, timeInEnd, timeOutStart, timeOutEnd, isActive (optional)
 * @returns {Promise<boolean>} True if added successfully
 */
async function addEvent(event) {
    try {
        await apiCall('events.php', 'POST', {
            eventName: event.eventName,
            eventDate: event.eventDate,
            timeInStart: event.timeInStart,
            timeInEnd: event.timeInEnd,
            timeOutStart: event.timeOutStart,
            timeOutEnd: event.timeOutEnd,
            isActive: event.isActive !== undefined ? event.isActive : 1
        });
        return true;
    } catch (error) {
        console.error('Error adding event:', error);
        throw error;
    }
}

/**
 * Update an event
 * @param {Object} event - Event object with eventId and fields to update
 * @returns {Promise<boolean>} True if updated successfully
 */
async function updateEvent(event) {
    try {
        await apiCall('events.php', 'PUT', {
            eventId: event.eventId,
            eventName: event.eventName,
            eventDate: event.eventDate,
            timeInStart: event.timeInStart,
            timeInEnd: event.timeInEnd,
            timeOutStart: event.timeOutStart,
            timeOutEnd: event.timeOutEnd,
            isActive: event.isActive
        });
        return true;
    } catch (error) {
        console.error('Error updating event:', error);
        throw error;
    }
}

/**
 * Delete an event
 * @param {number} eventId - Event ID
 * @returns {Promise<boolean>} True if deleted successfully
 */
async function deleteEvent(eventId) {
    try {
        await apiCall(`events.php?id=${eventId}`, 'DELETE');
        return true;
    } catch (error) {
        console.error('Error deleting event:', error);
        throw error;
    }
}

/**
 * Get attendance count for today
 * @returns {Promise<number>} Number of attendance entries for today
 */
async function getAttendanceCount() {
    try {
        const result = await apiCall('attendance.php?today=1');
        return result.data.length;
    } catch (error) {
        console.error('Error getting attendance count:', error);
        return 0;
    }
}

/**
 * Clear all data (for reset/demo purposes)
 * Note: This would require a DELETE endpoint or manual database clearing
 */
async function clearAllData() {
    console.warn('clearAllData() is not implemented for database storage. Use database management tools instead.');
}

