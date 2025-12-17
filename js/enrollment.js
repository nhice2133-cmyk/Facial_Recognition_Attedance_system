/**
 * Enrollment Module
 * Handles user enrollment with face recognition and QR code generation
 */

// DOM Elements
const enrollBtn = document.getElementById('enroll-btn');
const idNumberInput = document.getElementById('id-number');
const firstNameInput = document.getElementById('first-name');
const lastNameInput = document.getElementById('last-name');
const roleInput = document.getElementById('role');
const photoUpload = document.getElementById('photo-upload');
const photoPreview = document.getElementById('photo-preview');
const photoPreviewModal = document.getElementById('photo-preview-modal');
const closePhotoPreviewModal = document.getElementById('close-photo-preview-modal');
const closePhotoPreviewBtn = document.getElementById('close-photo-preview-btn');
const previewPhotoBtn = document.getElementById('preview-photo-btn');
const qrModal = document.getElementById('qr-modal');
const closeQrModalBtn = document.getElementById('close-qr-modal-btn');
const qrCanvas = document.getElementById('qr-canvas');

// Camera Elements
const enrollVideo = document.getElementById('enroll-video');
const photoCanvas = document.getElementById('photo-canvas');
const captureBtn = document.getElementById('capture-btn');
const retakeBtn = document.getElementById('retake-btn');

// Store uploaded photo data URL
let uploadedPhotoDataUrl = null;
let capturedPhotoDataUrl = null; // Store captured photo

/**
 * Format ID number input to XXXX-XXXX format
 * Automatically inserts dash after 4 digits
 */
function formatIdNumber(input) {
    // Remove all non-digit characters
    let value = input.value.replace(/\D/g, '');

    // Limit to 8 digits
    if (value.length > 8) {
        value = value.substring(0, 8);
    }

    // Add dash after 4 digits
    if (value.length > 4) {
        value = value.substring(0, 4) + '-' + value.substring(4);
    }

    input.value = value;
}

/**
 * Validate ID number format (XXXX-XXXX)
 * @param {string} id - ID number to validate
 * @returns {boolean} True if valid format
 */
function isValidIdFormat(id) {
    const idPattern = /^[0-9]{4}-[0-9]{4}$/;
    return idPattern.test(id);
}

/**
 * Format name input to Title Case (first letter of each word uppercase)
 * Removes numbers, special characters, and capitalizes first letter of each word
 */
function formatName(input) {
    // Get cursor position before formatting
    const cursorPos = input.selectionStart;

    // Remove all non-letter characters (keep only A-Z and spaces)
    let value = input.value.replace(/[^A-Za-z\s]/g, '');

    // Remove multiple consecutive spaces (but keep single spaces)
    value = value.replace(/\s+/g, ' ');

    // Don't trim while typing - only remove leading spaces
    // This allows spaces to be typed naturally
    value = value.replace(/^\s+/, '');

    // Convert to Title Case (capitalize first letter of each word)
    value = value.toLowerCase().replace(/\b\w/g, function (char) {
        return char.toUpperCase();
    });

    input.value = value;

    // Restore cursor position (adjust for removed characters)
    const newCursorPos = Math.min(cursorPos, value.length);
    input.setSelectionRange(newCursorPos, newCursorPos);
}

/**
 * Validate name format (Title Case - letters and spaces only)
 * @param {string} name - Name to validate
 * @returns {boolean} True if valid format
 */
function isValidNameFormat(name) {
    // Only letters and spaces, at least 2 characters, must contain at least one letter
    const trimmed = name.trim();
    if (trimmed.length < 2) return false;
    // Allow any combination of letters and spaces
    const namePattern = /^[A-Za-z\s]+$/;
    // Ensure there's at least one letter (not just spaces)
    const hasLetter = /[A-Za-z]/.test(trimmed);
    return namePattern.test(trimmed) && hasLetter;
}

// Initialize ID number formatting when DOM is ready
function initializeIdNumberFormatting() {
    const idInput = document.getElementById('id-number');
    if (idInput) {
        idInput.addEventListener('input', function () {
            formatIdNumber(this);
        });
        // Handle paste events
        idInput.addEventListener('paste', function (e) {
            e.preventDefault();
            const pastedText = (e.clipboardData || window.clipboardData).getData('text');
            // Remove non-digits and limit to 8
            let digits = pastedText.replace(/\D/g, '').substring(0, 8);
            if (digits.length > 4) {
                this.value = digits.substring(0, 4) + '-' + digits.substring(4);
            } else {
                this.value = digits;
            }
            formatIdNumber(this);
        });
    }
}

// Initialize name formatting when DOM is ready
function initializeNameFormatting() {
    const inputs = [document.getElementById('first-name'), document.getElementById('last-name')];

    inputs.forEach(input => {
        if (input) {
            input.addEventListener('input', function () {
                formatName(this);
            });
            // Handle paste events
            input.addEventListener('paste', function (e) {
                e.preventDefault();
                const pastedText = (e.clipboardData || window.clipboardData).getData('text');
                // Remove non-letters, clean spaces
                let cleaned = pastedText.replace(/[^A-Za-z\s]/g, '');
                cleaned = cleaned.replace(/\s+/g, ' ').trim();
                // Convert to Title Case
                cleaned = cleaned.toLowerCase().replace(/\b\w/g, function (char) {
                    return char.toUpperCase();
                });
                this.value = cleaned;
                formatName(this);
            });
        }
    });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
        initializeIdNumberFormatting();
        initializeNameFormatting();
    });
} else {
    initializeIdNumberFormatting();
    initializeNameFormatting();
}

/**
 * Initialize the enrollment page
 */
function startEnrollmentVideo() {
    if (!isFaceApiLoaded()) return;

    // Clear form and hide QR
    if (idNumberInput) {
        idNumberInput.value = '';
    }
    if (firstNameInput) firstNameInput.value = '';
    if (lastNameInput) lastNameInput.value = '';
    if (roleInput) roleInput.value = 'Student';
    if (photoUpload) photoUpload.value = '';
    if (photoPreviewModal) photoPreviewModal.classList.add('hidden');
    uploadedPhotoDataUrl = null;
    capturedPhotoDataUrl = null;
    if (previewPhotoBtn) previewPhotoBtn.classList.add('hidden');
    if (enrollBtn) {
        enrollBtn.disabled = false;
        enrollBtn.textContent = 'Enroll';
        enrollBtn.classList.add('bg-indigo-600');
        enrollBtn.classList.remove('bg-green-600');
    }
    if (qrModal) qrModal.classList.add('hidden');

    // Reset camera UI
    if (photoCanvas) photoCanvas.classList.add('hidden');
    if (enrollVideo) enrollVideo.classList.remove('hidden');
    if (captureBtn) captureBtn.classList.remove('hidden');
    if (retakeBtn) retakeBtn.classList.add('hidden');

    // Start Camera
    startCamera();

    // Setup file upload preview
    if (photoUpload) {
        photoUpload.onchange = handlePhotoUpload;
    }

    if (enrollBtn) {
        enrollBtn.onclick = enrollFace;
    }

    // Setup capture buttons
    if (captureBtn) captureBtn.onclick = capturePhoto;
    if (retakeBtn) retakeBtn.onclick = retakePhoto;
}

/**
 * Start the camera stream
 */
async function startCamera() {
    if (!enrollVideo) return;

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
        enrollVideo.srcObject = stream;

        // Update global stream in main.js if available
        if (typeof setCurrentStream === 'function') {
            setCurrentStream(stream);
        }
    } catch (err) {
        console.error("Error accessing camera:", err);
        alert("Could not access camera. Please allow camera permissions or upload a photo.");
    }
}

/**
 * Capture photo from video stream
 */
function capturePhoto() {
    if (!enrollVideo || !photoCanvas) return;

    const context = photoCanvas.getContext('2d');
    photoCanvas.width = enrollVideo.videoWidth;
    photoCanvas.height = enrollVideo.videoHeight;
    context.drawImage(enrollVideo, 0, 0, photoCanvas.width, photoCanvas.height);

    capturedPhotoDataUrl = photoCanvas.toDataURL('image/png');

    // UI Updates
    enrollVideo.classList.add('hidden');
    photoCanvas.classList.remove('hidden');
    captureBtn.classList.add('hidden');
    retakeBtn.classList.remove('hidden');
    if (previewPhotoBtn) previewPhotoBtn.classList.remove('hidden');
}

/**
 * Retake photo (reset camera view)
 */
function retakePhoto() {
    capturedPhotoDataUrl = null;

    // UI Updates
    photoCanvas.classList.add('hidden');
    enrollVideo.classList.remove('hidden');
    retakeBtn.classList.add('hidden');
    if (previewPhotoBtn) previewPhotoBtn.classList.add('hidden');
    captureBtn.classList.remove('hidden');
}

/**
 * Show photo preview modal
 */
function showPhotoPreviewModal(imageSrc) {
    if (photoPreview) {
        photoPreview.src = imageSrc;
    }
    if (photoPreviewModal) {
        photoPreviewModal.classList.remove('hidden');
    }
}

/**
 * Close photo preview modal
 */
function closePhotoPreviewModalFunc() {
    if (photoPreviewModal) {
        photoPreviewModal.classList.add('hidden');
    }
}

/**
 * Handle photo file upload and show preview
 */
function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) {
        uploadedPhotoDataUrl = null;
        if (previewPhotoBtn) previewPhotoBtn.classList.add('hidden');
        return;
    }

    if (!file.type.startsWith('image/')) {
        alert('Please upload an image file.');
        event.target.value = '';
        uploadedPhotoDataUrl = null;
        if (previewPhotoBtn) previewPhotoBtn.classList.add('hidden');
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        uploadedPhotoDataUrl = e.target.result;
        showPhotoPreviewModal(uploadedPhotoDataUrl);
        // Show preview button
        if (previewPhotoBtn) previewPhotoBtn.classList.remove('hidden');

        // If user uploads a photo, we might want to reset the camera capture
        retakePhoto();
    };
    reader.readAsDataURL(file);
}

/**
 * Preview uploaded photo again
 */
function previewPhotoAgain() {
    if (uploadedPhotoDataUrl) {
        showPhotoPreviewModal(uploadedPhotoDataUrl);
    } else if (capturedPhotoDataUrl) {
        showPhotoPreviewModal(capturedPhotoDataUrl);
    } else {
        alert('No photo uploaded or captured yet.');
    }
}

// Initialize photo preview modal close buttons
if (closePhotoPreviewModal) {
    closePhotoPreviewModal.addEventListener('click', closePhotoPreviewModalFunc);
}

if (closePhotoPreviewBtn) {
    closePhotoPreviewBtn.addEventListener('click', closePhotoPreviewModalFunc);
}

// Initialize preview photo button
if (previewPhotoBtn) {
    previewPhotoBtn.addEventListener('click', previewPhotoAgain);
}

// Close modal when clicking outside
if (photoPreviewModal) {
    photoPreviewModal.addEventListener('click', function (e) {
        if (e.target === photoPreviewModal) {
            closePhotoPreviewModalFunc();
        }
    });
}

// Close QR Modal
if (closeQrModalBtn) {
    closeQrModalBtn.addEventListener('click', function () {
        if (qrModal) qrModal.classList.add('hidden');
        resetEnrollmentForm();
    });
}

/**
 * Reset the enrollment form and camera
 */
function resetEnrollmentForm() {
    if (idNumberInput) idNumberInput.value = '';
    if (firstNameInput) firstNameInput.value = '';
    if (lastNameInput) lastNameInput.value = '';
    if (roleInput) roleInput.value = 'Student';
    if (photoUpload) photoUpload.value = '';
    uploadedPhotoDataUrl = null;
    capturedPhotoDataUrl = null;
    retakePhoto(); // Reset camera view

    if (previewPhotoBtn) previewPhotoBtn.classList.add('hidden');
    closePhotoPreviewModalFunc();

    if (enrollBtn) {
        enrollBtn.disabled = false;
        enrollBtn.textContent = "Enroll";
        enrollBtn.classList.remove('bg-green-600');
        enrollBtn.classList.add('bg-indigo-600');
    }
}

/**
 * Enroll a new user's face
 */
async function enrollFace() {
    if (!isFaceApiLoaded()) {
        alert("Face API models are still loading. Please wait.");
        return;
    }

    const id = idNumberInput ? idNumberInput.value.trim() : '';
    const firstName = firstNameInput ? firstNameInput.value.trim() : '';
    const lastName = lastNameInput ? lastNameInput.value.trim() : '';
    const fullName = `${firstName} ${lastName}`.trim();
    const role = roleInput ? roleInput.value : 'Student';
    const file = photoUpload ? photoUpload.files[0] : null;

    // Validation
    if (!id || !firstName || !lastName) {
        alert("Please fill out ID Number, First Name, and Last Name.");
        return;
    }

    // Validate ID format (XXXX-XXXX)
    if (!isValidIdFormat(id)) {
        alert("Invalid ID Number format. Please use format: XXXX-XXXX (e.g., 1234-5678)");
        if (idNumberInput) idNumberInput.focus();
        return;
    }

    // Validate name format (Title Case - letters and spaces only)
    if (!isValidNameFormat(firstName)) {
        alert("Invalid First Name format. Please use letters and spaces only.");
        if (firstNameInput) {
            firstNameInput.focus();
            formatName(firstNameInput);
        }
        return;
    }

    if (!isValidNameFormat(lastName)) {
        alert("Invalid Last Name format. Please use letters and spaces only.");
        if (lastNameInput) {
            lastNameInput.focus();
            formatName(lastNameInput);
        }
        return;
    }

    // Check if we have a photo (either uploaded or captured)
    if (!file && !capturedPhotoDataUrl) {
        alert("Please upload a photo or capture one using the camera.");
        return;
    }

    const existingUser = await getUserById(id);
    if (existingUser) {
        alert("This ID Number is already enrolled.");
        return;
    }

    if (enrollBtn) {
        enrollBtn.disabled = true;
        enrollBtn.textContent = "Processing...";
    }

    try {
        let image;

        if (file) {
            // Load image from file
            image = await loadImageFromFile(file);
        } else if (capturedPhotoDataUrl) {
            // Load image from captured data URL
            image = await loadImageFromDataUrl(capturedPhotoDataUrl);
        }

        // Detect face in the image
        const detection = await faceapi.detectSingleFace(image, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks(true)
            .withFaceDescriptor();

        if (detection) {
            // Get photo as data URL
            let photo;
            if (file) {
                photo = await getImageDataURL(file);
            } else {
                photo = capturedPhotoDataUrl;
            }

            // Create user object
            const newUser = {
                id: id,
                fullName: fullName,
                role: role,
                descriptor: detection.descriptor,
                photo: photo
            };

            // Save to database
            const added = await addUser(newUser);
            if (added) {
                if (enrollBtn) {
                    enrollBtn.textContent = "Enrolled!";
                    enrollBtn.classList.remove('bg-indigo-600');
                    enrollBtn.classList.add('bg-green-600');
                }

                // Show QR Code
                generateQRCode(id); // Generate QR for the user's ID
                if (qrModal) qrModal.classList.remove('hidden');

                // Form reset is now handled when closing the modal
            } else {
                alert("Failed to enroll user. Please try again.");
                if (enrollBtn) {
                    enrollBtn.disabled = false;
                    enrollBtn.textContent = "Enroll";
                }
            }
        } else {
            alert("No face detected. Please ensure the face is clearly visible.");
            if (enrollBtn) {
                enrollBtn.disabled = false;
                enrollBtn.textContent = "Enroll";
            }
        }
    } catch (error) {
        console.error("Error during enrollment:", error);
        alert("Error occurred during enrollment. Please try again.");
        if (enrollBtn) {
            enrollBtn.disabled = false;
            enrollBtn.textContent = "Enroll";
        }
    }
}

/**
 * Load image from file and return HTMLImageElement
 * @param {File} file - Image file
 * @returns {Promise<HTMLImageElement>}
 */
function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const objectURL = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(objectURL); // Clean up object URL
            resolve(img);
        };
        img.onerror = (error) => {
            URL.revokeObjectURL(objectURL); // Clean up on error too
            reject(error);
        };
        img.src = objectURL;
    });
}

/**
 * Load image from Data URL and return HTMLImageElement
 * @param {string} dataUrl
 * @returns {Promise<HTMLImageElement>}
 */
function loadImageFromDataUrl(dataUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = dataUrl;
    });
}

/**
 * Get image as data URL from file
 * @param {File} file - Image file
 * @returns {Promise<string>} Data URL
 */
function getImageDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}


/**
 * Generate a QR code for the given data
 * @param {string} data - Data to encode in QR code
 */
function generateQRCode(data) {
    if (!qrCanvas) return;

    QRCode.toCanvas(qrCanvas, data, { width: 250 }, (error) => {
        if (error) {
            console.error('Error generating QR code:', error);
        } else {
            console.log('QR code generated!');
        }
    });
}

