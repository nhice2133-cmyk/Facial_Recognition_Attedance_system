/**
 * Events Module
 * Handles event management (create, edit, delete events)
 */

// DOM Elements
const eventsList = document.getElementById('events-list');
const createEventBtn = document.getElementById('create-event-btn');
const eventFormModal = document.getElementById('event-form-modal');
const eventForm = document.getElementById('event-form');
const closeEventModalBtn = document.getElementById('close-event-modal-btn');

// State
let editingEventId = null;

/**
 * Initialize the events page
 */
async function renderEventsList() {
    if (!eventsList) return;
    
    eventsList.innerHTML = '<p class="text-gray-500 text-center p-4">Loading events...</p>';
    
    const events = await getAllEvents();
    
    eventsList.innerHTML = '';
    
    if (events.length === 0) {
        eventsList.innerHTML = '<p class="text-gray-500 text-center p-4">No events created yet. Click "Create Event" to add one.</p>';
        return;
    }
    
    events.forEach(event => {
        const card = document.createElement('div');
        card.className = "bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 mb-4";
        
        const statusBadge = event.isActive 
            ? '<span class="inline-block bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs font-semibold px-2 py-1 rounded-full">Active</span>'
            : '<span class="inline-block bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-semibold px-2 py-1 rounded-full">Inactive</span>';
        
        card.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <div>
                    <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-1">${event.eventName}</h3>
                    <p class="text-sm text-gray-500 dark:text-gray-400">Date: ${new Date(event.eventDate).toLocaleDateString()}</p>
                </div>
                ${statusBadge}
            </div>
            
            <div class="grid grid-cols-2 gap-4 mb-4">
                <div class="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg">
                    <p class="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1">Time In</p>
                    <p class="text-sm font-bold text-gray-900 dark:text-white">${formatTime(event.timeInStart)} - ${formatTime(event.timeInEnd)}</p>
                </div>
                <div class="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                    <p class="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-1">Time Out</p>
                    <p class="text-sm font-bold text-gray-900 dark:text-white">${formatTime(event.timeOutStart)} - ${formatTime(event.timeOutEnd)}</p>
                </div>
            </div>
            
            <div class="flex gap-2">
                <button data-id="${event.eventId}" class="edit-event-btn flex-1 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-all">
                    Edit
                </button>
                <button data-id="${event.eventId}" data-name="${event.eventName}" class="delete-event-btn flex-1 px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-all">
                    Delete
                </button>
                <button data-id="${event.eventId}" class="toggle-event-btn flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all">
                    ${event.isActive ? 'Deactivate' : 'Activate'}
                </button>
            </div>
        `;
        eventsList.appendChild(card);
    });
    
    // Add event listeners
    addEventButtonListeners();
}

/**
 * Format time from HH:MM:SS to 12-hour format (h:MM AM/PM)
 */
function formatTime(timeString) {
    if (!timeString) return '';
    
    // Extract hours and minutes (handle both HH:MM:SS and HH:MM formats)
    const timeParts = timeString.split(':');
    if (timeParts.length < 2) return timeString;
    
    let hours = parseInt(timeParts[0], 10);
    const minutes = timeParts[1];
    
    // Determine AM/PM
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    // Convert to 12-hour format
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12
    
    // Format: h:MM AM/PM
    return `${hours}:${minutes} ${ampm}`;
}

/**
 * Add event listeners to buttons
 */
function addEventButtonListeners() {
    // Edit buttons
    document.querySelectorAll('.edit-event-btn').forEach(button => {
        button.onclick = async (e) => {
            const eventId = parseInt(e.currentTarget.getAttribute('data-id'));
            await editEvent(eventId);
        };
    });
    
    // Delete buttons
    document.querySelectorAll('.delete-event-btn').forEach(button => {
        button.onclick = async (e) => {
            const eventId = parseInt(e.currentTarget.getAttribute('data-id'));
            const eventName = e.currentTarget.getAttribute('data-name');
            
            const confirmed = confirm(`Are you sure you want to delete "${eventName}"?\n\nThis action cannot be undone.`);
            
            if (confirmed) {
                try {
                    e.currentTarget.disabled = true;
                    e.currentTarget.textContent = 'Deleting...';
                    
                    await deleteEvent(eventId);
                    await renderEventsList();
                } catch (error) {
                    console.error('Error deleting event:', error);
                    alert(`Failed to delete event: ${error.message || 'Unknown error'}`);
                    e.currentTarget.disabled = false;
                    e.currentTarget.textContent = 'Delete';
                }
            }
        };
    });
    
    // Toggle active/inactive buttons
    document.querySelectorAll('.toggle-event-btn').forEach(button => {
        button.onclick = async (e) => {
            const eventId = parseInt(e.currentTarget.getAttribute('data-id'));
            try {
                const event = await getEventById(eventId);
                if (event) {
                    await updateEvent({
                        eventId: eventId,
                        eventName: event.eventName,
                        eventDate: event.eventDate,
                        timeInStart: event.timeInStart,
                        timeInEnd: event.timeInEnd,
                        timeOutStart: event.timeOutStart,
                        timeOutEnd: event.timeOutEnd,
                        isActive: !event.isActive
                    });
                    await renderEventsList();
                }
            } catch (error) {
                console.error('Error toggling event:', error);
                alert(`Failed to update event: ${error.message || 'Unknown error'}`);
            }
        };
    });
}

/**
 * Show create event form
 */
function showCreateEventForm() {
    editingEventId = null;
    if (eventForm) {
        eventForm.reset();
        // Set default date to today
        const dateInput = document.getElementById('event-date');
        if (dateInput) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }
        // Set default times
        const timeInStart = document.getElementById('time-in-start');
        const timeInEnd = document.getElementById('time-in-end');
        const timeOutStart = document.getElementById('time-out-start');
        const timeOutEnd = document.getElementById('time-out-end');
        if (timeInStart) timeInStart.value = '07:30';
        if (timeInEnd) timeInEnd.value = '08:30';
        if (timeOutStart) timeOutStart.value = '16:00';
        if (timeOutEnd) timeOutEnd.value = '17:00';
    }
    if (eventFormModal) {
        eventFormModal.classList.remove('hidden');
    }
    const formTitle = document.getElementById('event-form-title');
    if (formTitle) {
        formTitle.textContent = 'Create Event';
    }
    const submitBtn = document.getElementById('event-form-submit-btn');
    if (submitBtn) {
        submitBtn.textContent = 'Create Event';
    }
}

/**
 * Edit an event
 */
async function editEvent(eventId) {
    try {
        const event = await getEventById(eventId);
        if (!event) {
            alert('Event not found');
            return;
        }
        
        editingEventId = eventId;
        
        // Populate form
        const eventNameInput = document.getElementById('event-name');
        const eventDateInput = document.getElementById('event-date');
        const timeInStartInput = document.getElementById('time-in-start');
        const timeInEndInput = document.getElementById('time-in-end');
        const timeOutStartInput = document.getElementById('time-out-start');
        const timeOutEndInput = document.getElementById('time-out-end');
        const isActiveInput = document.getElementById('event-is-active');
        
        if (eventNameInput) eventNameInput.value = event.eventName;
        if (eventDateInput) eventDateInput.value = event.eventDate;
        if (timeInStartInput) timeInStartInput.value = formatTime(event.timeInStart);
        if (timeInEndInput) timeInEndInput.value = formatTime(event.timeInEnd);
        if (timeOutStartInput) timeOutStartInput.value = formatTime(event.timeOutStart);
        if (timeOutEndInput) timeOutEndInput.value = formatTime(event.timeOutEnd);
        if (isActiveInput) isActiveInput.checked = event.isActive;
        
        // Show modal
        if (eventFormModal) {
            eventFormModal.classList.remove('hidden');
        }
        const formTitle = document.getElementById('event-form-title');
        if (formTitle) {
            formTitle.textContent = 'Edit Event';
        }
        const submitBtn = document.getElementById('event-form-submit-btn');
        if (submitBtn) {
            submitBtn.textContent = 'Update Event';
        }
    } catch (error) {
        console.error('Error loading event:', error);
        alert(`Failed to load event: ${error.message || 'Unknown error'}`);
    }
}

/**
 * Handle event form submission
 */
async function handleEventFormSubmit(event) {
    event.preventDefault();
    
    const eventName = document.getElementById('event-name').value.trim();
    const eventDate = document.getElementById('event-date').value;
    const timeInStart = document.getElementById('time-in-start').value;
    const timeInEnd = document.getElementById('time-in-end').value;
    const timeOutStart = document.getElementById('time-out-start').value;
    const timeOutEnd = document.getElementById('time-out-end').value;
    const isActive = document.getElementById('event-is-active').checked;
    
    // Validation
    if (!eventName || !eventDate || !timeInStart || !timeInEnd || !timeOutStart || !timeOutEnd) {
        alert('Please fill in all fields');
        return;
    }
    
    // Validate time ranges
    if (timeInStart >= timeInEnd) {
        alert('Time In Start must be before Time In End');
        return;
    }
    
    if (timeOutStart >= timeOutEnd) {
        alert('Time Out Start must be before Time Out End');
        return;
    }
    
    const submitBtn = document.getElementById('event-form-submit-btn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';
    }
    
    try {
        const eventData = {
            eventName: eventName,
            eventDate: eventDate,
            timeInStart: timeInStart + ':00', // Add seconds
            timeInEnd: timeInEnd + ':00',
            timeOutStart: timeOutStart + ':00',
            timeOutEnd: timeOutEnd + ':00',
            isActive: isActive ? 1 : 0
        };
        
        if (editingEventId) {
            eventData.eventId = editingEventId;
            await updateEvent(eventData);
        } else {
            await addEvent(eventData);
        }
        
        // Close modal and refresh list
        if (eventFormModal) {
            eventFormModal.classList.add('hidden');
        }
        await renderEventsList();
    } catch (error) {
        console.error('Error saving event:', error);
        alert(`Failed to save event: ${error.message || 'Unknown error'}`);
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = editingEventId ? 'Update Event' : 'Create Event';
        }
    }
}

/**
 * Initialize events page
 */
function initializeEventsPage() {
    if (createEventBtn) {
        createEventBtn.onclick = showCreateEventForm;
    }
    
    const closeModal = () => {
        if (eventFormModal) {
            eventFormModal.classList.add('hidden');
        }
    };
    
    if (closeEventModalBtn) {
        closeEventModalBtn.onclick = closeModal;
    }
    
    const closeEventModalBtn2 = document.getElementById('close-event-modal-btn-2');
    if (closeEventModalBtn2) {
        closeEventModalBtn2.onclick = closeModal;
    }
    
    if (eventForm) {
        eventForm.onsubmit = handleEventFormSubmit;
    }
    
    // Close modal when clicking outside
    if (eventFormModal) {
        eventFormModal.onclick = (e) => {
            if (e.target === eventFormModal) {
                eventFormModal.classList.add('hidden');
            }
        };
    }
    
    renderEventsList();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeEventsPage);
} else {
    initializeEventsPage();
}

