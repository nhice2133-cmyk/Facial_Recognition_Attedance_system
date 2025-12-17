/**
 * Members Module
 * Handles the members list page and QR code display
 */

// DOM Elements
const membersList = document.getElementById('members-list');

/**
 * Render the list of enrolled members
 */
async function renderMembersList() {
    if (!membersList) return;

    membersList.innerHTML = '<p class="text-gray-500 col-span-full text-center">Loading members...</p>'; // Show loading

    const users = await getAllUsers();

    membersList.innerHTML = ''; // Clear list

    if (users.length === 0) {
        membersList.innerHTML = `<p class="text-gray-500 col-span-full text-center">No members enrolled yet.</p>`;
        return;
    }

    users.forEach(user => {
        const card = document.createElement('div');
        card.className = "bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden flex flex-col";
        card.innerHTML = `
            <img src="${user.photo}" alt="${user.fullName}" class="w-full h-32 object-cover">
            <div class="p-3 flex-grow">
                <h3 class="text-base font-bold mb-1 truncate">${user.fullName}</h3>
                <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">ID: ${user.id}</p>
                <span class="inline-block bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 text-xs font-semibold px-2 py-0.5 rounded-full">
                    ${user.role}
                </span>
            </div>
            <div class="p-3 border-t border-gray-200 dark:border-gray-700 text-center space-y-2">
                <canvas id="qr-member-${user.id}" class="w-24 h-24 mx-auto bg-white p-1 rounded-lg shadow-inner"></canvas>
                <button data-id="${user.id}" class="print-qr-btn w-full px-2 py-1.5 bg-gray-200 dark:bg-gray-700 text-xs font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all">
                    Print QR
                </button>
                <button data-id="${user.id}" class="download-qr-btn w-full px-2 py-1.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-medium rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition-all">
                    Download QR
                </button>
                <button data-id="${user.id}" data-name="${user.fullName}" class="delete-member-btn w-full px-2 py-1.5 bg-red-500 text-white text-xs font-medium rounded-lg hover:bg-red-600 transition-all flex items-center justify-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 6h18"/>
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                    </svg>
                    Delete
                </button>
            </div>
        `;
        membersList.appendChild(card);
    });

    // After adding all cards, generate their QRs
    users.forEach(user => {
        const canvasId = `qr-member-${user.id}`;
        const canvasEl = document.getElementById(canvasId);
        if (canvasEl) {
            QRCode.toCanvas(canvasEl, user.id, { width: 96 }, (error) => {
                if (error) {
                    console.error(`Error generating QR for ${user.id}`, error);
                }
            });
        }
    });

    // Add event listeners for the new print buttons
    addPrintButtonListeners();

    // Add event listeners for the new download buttons
    addDownloadButtonListeners();

    // Add event listeners for delete buttons
    addDeleteButtonListeners();
}

/**
 * Add event listeners to print QR code buttons
 */
function addPrintButtonListeners() {
    document.querySelectorAll('.print-qr-btn').forEach(button => {
        // A better way to avoid duplicate listeners
        button.onclick = async (e) => {
            const userId = e.currentTarget.getAttribute('data-id');
            const user = await getUserById(userId);
            if (user) {
                printUserQR(user);
            }
        };
    });
}

/**
 * Add event listeners to download QR code buttons
 */
function addDownloadButtonListeners() {
    document.querySelectorAll('.download-qr-btn').forEach(button => {
        button.onclick = async (e) => {
            const userId = e.currentTarget.getAttribute('data-id');
            const user = await getUserById(userId);
            if (user) {
                downloadUserQR(user);
            }
        };
    });
}

/**
 * Add event listeners to delete member buttons
 */
function addDeleteButtonListeners() {
    document.querySelectorAll('.delete-member-btn').forEach(button => {
        button.onclick = async (e) => {
            const userId = e.currentTarget.getAttribute('data-id');
            const userName = e.currentTarget.getAttribute('data-name');

            // Show confirmation dialog
            const confirmed = confirm(`Are you sure you want to delete "${userName}" (ID: ${userId})?\n\nThis action cannot be undone and will also delete all attendance records for this member.`);

            if (confirmed) {
                try {
                    // Disable button during deletion
                    e.currentTarget.disabled = true;
                    e.currentTarget.textContent = 'Deleting...';
                    e.currentTarget.classList.add('opacity-50', 'cursor-not-allowed');

                    // Delete user from database
                    await deleteUser(userId);

                    // Show success message (optional)
                    console.log(`Member "${userName}" deleted successfully`);

                    // Refresh the members list
                    await renderMembersList();

                    // Refresh dashboard if it's currently visible
                    const dashboardPage = document.getElementById('dashboard-page');
                    if (dashboardPage && dashboardPage.classList.contains('active')) {
                        if (typeof renderDashboard === 'function') {
                            renderDashboard();
                        }
                    }
                } catch (error) {
                    console.error('Error deleting member:', error);
                    alert(`Failed to delete member: ${error.message || 'Unknown error'}`);

                    // Re-enable button on error
                    e.currentTarget.disabled = false;
                    e.currentTarget.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M3 6h18"/>
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                        </svg>
                        Delete
                    `;
                    e.currentTarget.classList.remove('opacity-50', 'cursor-not-allowed');
                }
            }
        };
    });
}

/**
 * Print a user's QR code
 * @param {Object} user - User object
 */
function printUserQR(user) {
    const canvasId = `qr-member-${user.id}`;
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.error("Could not find canvas to print");
        return;
    }

    const qrImageData = canvas.toDataURL('image/png');

    const printWindow = window.open('', '_blank', 'height=500,width=500');
    printWindow.document.write('<html><head><title>Print QR Code</title>');
    printWindow.document.write('<style>body { width: 100%; text-align: center; font-family: Arial, sans-serif; padding-top: 50px; } img { width: 80%; max-width: 350px; } </style>');
    printWindow.document.write('</head><body onafterprint="window.close()">');
    printWindow.document.write(`<h2>${user.fullName}</h2>`);
    printWindow.document.write(`<p>ID: ${user.id}</p>`);
    printWindow.document.write(`<img src="${qrImageData}" alt="QR Code">`);
    printWindow.document.write('<script>window.print();</script>');
    printWindow.document.write('</body></html>');
    printWindow.document.write('</body></html>');
    printWindow.document.close();
}

/**
 * Download a user's QR code
 * @param {Object} user - User object
 */
function downloadUserQR(user) {
    const canvasId = `qr-member-${user.id}`;
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.error("Could not find canvas to download");
        return;
    }

    // Create a temporary link element
    const link = document.createElement('a');
    link.download = `QR-${user.fullName.replace(/\s+/g, '-')}-${user.id}.png`;
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

