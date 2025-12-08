/**
 * Attendance Module
 * Handles QR code scanning and face verification for attendance marking
 */

// DOM Elements
const scanVideo = document.getElementById('scan-video');
const scanCanvas = document.getElementById('scan-canvas');
const statusBox = document.getElementById('status-box');
const cameraSelect = document.getElementById('camera-select');
const eventSelect = document.getElementById('event-select');
const typeTimeInBtn = document.getElementById('type-time-in');
const typeTimeOutBtn = document.getElementById('type-time-out');
const startCameraBtn = document.getElementById('start-camera-btn');
const faceVerificationVideo = document.getElementById('face-verification-video');
const faceVerificationStatus = document.getElementById('face-verification-status');

// View elements
const qrScanningView = document.getElementById('qr-scanning-view');
const userFoundView = document.getElementById('user-found-view');
const userNotFoundView = document.getElementById('user-not-found-view');
const faceVerificationView = document.getElementById('face-verification-view');
const attendanceSuccessView = document.getElementById('attendance-success-view');
const userNameDisplay = document.getElementById('user-name-display');
const userIdDisplay = document.getElementById('user-id-display');
const successUserName = document.getElementById('success-user-name');
const successTimestamp = document.getElementById('success-timestamp');

// State variables
let verificationTimeout = null;
let currentEnrolledUser = null;
let faceMatcher = null;
let scanState = 'SCANNING_QR';
let availableCameras = [];
let faceVerificationLoop = null;
let currentAttendanceType = 'time_in'; // Default to time_in

/**
 * Ensure descriptor is a Float32Array as required by face-api.js
 * @param {any} descriptor
 * @returns {Float32Array|null}
 */
function toFloat32Descriptor(descriptor) {
    if (!descriptor) return null;
    if (descriptor instanceof Float32Array) return descriptor;

    let values = descriptor;
    if (Array.isArray(descriptor)) {
        values = descriptor;
    } else if (typeof descriptor === 'object') {
        values = Object.values(descriptor);
    }

    if (!values || typeof values.length === 'undefined') {
        return null;
    }

    try {
        return new Float32Array(values);
    } catch (err) {
        console.error('Unable to convert descriptor to Float32Array', err, descriptor);
        return null;
    }
}

/**
 * Cancel the active QR scanning animation loop
 */
function cancelScanLoop() {
    if (getCurrentScanLoop()) {
        cancelAnimationFrame(getCurrentScanLoop());
        setCurrentScanLoop(null);
    }
}

/**
 * Stop the current scan video stream
 */
function stopScanVideoStream() {
    const stream = getCurrentStream();
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setCurrentStream(null);
    }
    if (scanVideo) {
        scanVideo.srcObject = null;
    }
    cancelScanLoop();
}

/**
 * Load available cameras and populate select dropdown
 */
async function loadCameras() {
    if (!cameraSelect) return;

    try {
        // First, try to enumerate devices (may work without permission on some browsers)
        let devices = await navigator.mediaDevices.enumerateDevices();
        availableCameras = devices.filter(device => device.kind === 'videoinput');

        // If we have cameras but no labels, we need permission
        const needsPermission = availableCameras.some(cam => !cam.label);

        if (needsPermission || availableCameras.length === 0) {
            // Request permission with a temporary stream
            try {
                const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
                // Stop the temporary stream immediately
                tempStream.getTracks().forEach(track => track.stop());

                // Now enumerate again to get labels
                devices = await navigator.mediaDevices.enumerateDevices();
                availableCameras = devices.filter(device => device.kind === 'videoinput');
            } catch (permError) {
                console.error("Permission error:", permError);
                if (permError.name === 'NotAllowedError' || permError.name === 'PermissionDeniedError') {
                    cameraSelect.innerHTML = '<option value="">Camera access denied</option>';
                    setScanStatus("Please allow camera access in your browser settings and refresh.", "text-red-500");
                    if (startCameraBtn) {
                        startCameraBtn.disabled = true;
                    }
                    return;
                }
                throw permError;
            }
        }

        // Clear and populate select
        cameraSelect.innerHTML = '';

        if (availableCameras.length === 0) {
            cameraSelect.innerHTML = '<option value="">No cameras found</option>';
            setScanStatus("No cameras detected. Please connect a camera and refresh.", "text-yellow-500");
            return;
        }

        // Add cameras to select
        availableCameras.forEach((camera, index) => {
            const option = document.createElement('option');
            option.value = camera.deviceId;
            // Use label if available, otherwise create a descriptive name
            const label = camera.label || `Camera ${index + 1}${camera.deviceId.includes('droidcam') ? ' (DroidCam)' : ''}`;
            option.textContent = label;
            cameraSelect.appendChild(option);
        });

        // Set up change handler
        cameraSelect.onchange = async () => {
            stopAllStreams();
            await startCameraStream();
        };

        // Auto-select first camera if available
        if (availableCameras.length > 0) {
            cameraSelect.value = availableCameras[0].deviceId;
            // Don't auto-start, let user click "Start Camera" button
            setScanStatus("Camera selected. Click 'Start Camera' to begin.", "text-gray-500");
        }
    } catch (err) {
        console.error("Error loading cameras:", err);
        cameraSelect.innerHTML = '<option value="">Error loading cameras</option>';

        let errorMsg = "Error loading cameras. ";
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            errorMsg = "Camera access denied. Please allow camera access in your browser settings.";
        } else if (err.name === 'NotFoundError') {
            errorMsg = "No cameras found. Please connect a camera.";
        } else {
            errorMsg += err.message || "Please try refreshing.";
        }

        setScanStatus(errorMsg, "text-red-500");
    }
}

/**
 * Start camera stream with selected device
 */
async function startCameraStream() {
    // If no camera is selected, try to reload cameras first
    if (!cameraSelect || !cameraSelect.value || cameraSelect.value === "") {
        setScanStatus("Loading cameras...", "text-gray-500");
        await loadCameras();

        if (!cameraSelect || !cameraSelect.value || cameraSelect.value === "") {
            setScanStatus("Please select a camera from the dropdown.", "text-yellow-500");
            return;
        }
    }

    const selectedDeviceId = cameraSelect.value;

    // Stop any existing stream (but keep view state)
    stopScanVideoStream();

    // Reset status
    setScanStatus("Starting camera...", "text-gray-500");
    scanState = 'SCANNING_QR';
    currentEnrolledUser = null;

    // Update button state
    if (startCameraBtn) {
        startCameraBtn.disabled = true;
        startCameraBtn.textContent = "Starting...";
    }

    // Build constraints with selected device - try exact first, fallback to ideal
    let constraints = {
        video: {
            deviceId: { exact: selectedDeviceId },
            width: { ideal: 1280 },
            height: { ideal: 720 }
        }
    };

    try {
        let stream;
        try {
            // Try with exact device ID first
            stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (exactError) {
            // If exact fails, try with ideal (more flexible)
            console.log("Exact device match failed, trying ideal...", exactError);
            constraints = {
                video: {
                    deviceId: { ideal: selectedDeviceId },
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            };
            stream = await navigator.mediaDevices.getUserMedia(constraints);
        }

        setCurrentStream(stream);

        // Verify stream has active tracks
        const videoTracks = stream.getVideoTracks();
        if (videoTracks.length === 0) {
            throw new Error("No video tracks in stream");
        }

        console.log("Stream started with device:", videoTracks[0].label || selectedDeviceId);
        console.log("Video track settings:", videoTracks[0].getSettings());

        if (scanVideo) {
            // Clear any existing stream first
            if (scanVideo.srcObject) {
                scanVideo.srcObject.getTracks().forEach(track => track.stop());
            }

            // Set the new stream
            scanVideo.srcObject = stream;

            // Function to start video playback
            const startPlayback = async () => {
                try {
                    await scanVideo.play();
                    console.log("Video playing successfully");
                    setScanStatus("Please scan your QR code...", "text-gray-500");
                    setCurrentScanLoop(requestAnimationFrame(scanLoop));

                    // Update button state on success
                    if (startCameraBtn) {
                        startCameraBtn.disabled = false;
                        startCameraBtn.textContent = "Restart Camera";
                    }
                } catch (playError) {
                    console.error("Error playing video:", playError);
                    setScanStatus("Error playing video stream. Try clicking 'Start Camera' again.", "text-red-500");

                    // Update button state on error
                    if (startCameraBtn) {
                        startCameraBtn.disabled = false;
                        startCameraBtn.textContent = "Start Camera";
                    }
                }
            };

            // Try to play immediately
            try {
                await startPlayback();
            } catch (e) {
                // If immediate play fails, wait for video to be ready
                scanVideo.addEventListener('loadedmetadata', startPlayback, { once: true });
                scanVideo.addEventListener('canplay', startPlayback, { once: true });

                // Fallback: try after a short delay
                setTimeout(() => {
                    if (scanVideo.readyState >= 2) {
                        startPlayback();
                    }
                }, 500);
            }
        }
    } catch (err) {
        console.error("Error starting camera:", err);
        let errorMessage = "Error starting camera. ";
        if (err.name === 'NotAllowedError') {
            errorMessage += "Please allow camera access.";
        } else if (err.name === 'NotFoundError') {
            errorMessage += "Selected camera not found.";
        } else if (err.name === 'NotReadableError') {
            errorMessage += "Camera is being used by another application.";
        } else {
            errorMessage += "Please check your camera permissions.";
        }
        setScanStatus(errorMessage, "text-red-500");

        // Update button state on error
        if (startCameraBtn) {
            startCameraBtn.disabled = false;
            startCameraBtn.textContent = "Start Camera";
        }
    }
}

/**
 * Refresh camera list
 */
async function refreshCameras() {
    if (cameraSelect) {
        cameraSelect.innerHTML = '<option value="">Refreshing cameras...</option>';
    }
    await loadCameras();

    // Auto-start if camera is selected
    if (cameraSelect && cameraSelect.value) {
        await startCameraStream();
    }
}

/**
 * Show user found view
 */
function showUserFoundView(user) {
    cancelScanLoop();
    scanState = 'USER_FOUND';
    hideAllViews();
    if (userFoundView) userFoundView.classList.remove('hidden');
    if (userNameDisplay) userNameDisplay.textContent = user.fullName;
    if (userIdDisplay) userIdDisplay.textContent = `ID: ${user.id} | Role: ${user.role}`;
    setScanStatus(`QR OK for ${user.fullName}. Click 'Start Face Verification'.`, "text-blue-500");
    if (startCameraBtn) {
        startCameraBtn.disabled = false;
        startCameraBtn.textContent = "Restart Camera";
    }
}

/**
 * Show user not found view
 */
function showUserNotFoundView() {
    cancelScanLoop();
    scanState = 'USER_NOT_FOUND';
    hideAllViews();
    if (userNotFoundView) userNotFoundView.classList.remove('hidden');
    setScanStatus("Unknown user. Please enroll first or scan again.", "text-red-500");
}

/**
 * Hide all views
 */
function hideAllViews() {
    if (qrScanningView) qrScanningView.classList.add('hidden');
    if (userFoundView) userFoundView.classList.add('hidden');
    if (userNotFoundView) userNotFoundView.classList.add('hidden');
    if (faceVerificationView) faceVerificationView.classList.add('hidden');
    if (attendanceSuccessView) attendanceSuccessView.classList.add('hidden');
}

/**
 * Reset to QR scanning
 */
function resetToQRScan() {
    stopScanVideoStream();
    stopFaceVerification();
    currentEnrolledUser = null;
    scanState = 'SCANNING_QR';
    hideAllViews();
    if (qrScanningView) qrScanningView.classList.remove('hidden');
    if (statusBox) {
        setScanStatus("Please scan your QR code...", "text-gray-500");
    }
    // Restart camera if it was running
    if (cameraSelect && cameraSelect.value) {
        startCameraStream();
    }
    if (startCameraBtn) {
        startCameraBtn.disabled = false;
        startCameraBtn.textContent = "Start Camera";
    }
}

/**
 * Start face verification
 */
async function startFaceVerification() {
    if (!isFaceApiLoaded()) {
        alert("Face API models not loaded yet. Please wait.");
        return;
    }

    if (!currentEnrolledUser) {
        alert("No user selected. Please scan QR code again.");
        return;
    }

    // Stop the QR scanning stream before starting face verification
    stopScanVideoStream();
    scanState = 'VERIFYING_FACE';

    // Re-build FaceMatcher
    const users = await getAllUsers();
    if (users.length > 0) {
        const labeledDescriptors = users
            .map(user => {
                const descriptor = toFloat32Descriptor(user.descriptor);
                if (!descriptor) {
                    console.warn('Skipping user with invalid descriptor', user.id);
                    return null;
                }
                return new faceapi.LabeledFaceDescriptors(user.id, [descriptor]);
            })
            .filter(Boolean);
        faceMatcher = labeledDescriptors.length > 0 ? new faceapi.FaceMatcher(labeledDescriptors) : null;
    } else {
        faceMatcher = null;
    }

    hideAllViews();
    if (faceVerificationView) faceVerificationView.classList.remove('hidden');
    setScanStatus("Starting face verification...", "text-blue-500");

    // Build constraints using the same selected camera if available
    let constraints;
    const selectedDeviceId = cameraSelect ? cameraSelect.value : '';
    if (selectedDeviceId) {
        constraints = {
            video: {
                deviceId: { exact: selectedDeviceId },
                width: { ideal: 640 },
                height: { ideal: 480 }
            }
        };
    } else {
        constraints = {
            video: {
                facingMode: { ideal: 'user' },
                width: { ideal: 640 },
                height: { ideal: 480 }
            }
        };
    }

    try {
        let stream;
        try {
            stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (err) {
            // If exact device constraint fails, fallback to facingMode user
            if (selectedDeviceId) {
                console.warn("Exact device for face verification failed, falling back to user-facing camera", err);
                stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: { ideal: 'user' },
                        width: { ideal: 640 },
                        height: { ideal: 480 }
                    }
                });
            } else {
                throw err;
            }
        }
        if (faceVerificationVideo) {
            faceVerificationVideo.srcObject = stream;
            faceVerificationVideo.play().then(() => {
                if (faceVerificationStatus) {
                    faceVerificationStatus.textContent = "Please look at the camera...";
                    faceVerificationStatus.className = "mt-3 p-3 rounded-lg font-medium text-sm text-blue-700 dark:text-blue-200 bg-blue-200 dark:bg-blue-700 text-center";
                }
                faceVerificationLoop = requestAnimationFrame(verifyFaceLoop);
            });
        }
    } catch (err) {
        console.error("Error starting face verification camera:", err);
        if (faceVerificationStatus) {
            faceVerificationStatus.textContent = "Error starting camera. Please try again.";
            faceVerificationStatus.className = "mt-3 p-3 rounded-lg font-medium text-sm text-red-700 dark:text-red-200 bg-red-200 dark:bg-red-700 text-center";
        }
        setScanStatus("Unable to start face verification camera. Please try again.", "text-red-500");
    }
}

/**
 * Face verification loop
 */
async function verifyFaceLoop() {
    const video = faceVerificationVideo;
    if (!video || !currentEnrolledUser || !faceMatcher) return;

    try {
        const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks(true)
            .withFaceDescriptor();

        if (detection) {
            const bestMatch = faceMatcher.findBestMatch(detection.descriptor);

            // Check if the best match is the user from the QR code
            if (bestMatch.label === currentEnrolledUser.id && bestMatch.distance < 0.6) {
                // Success - mark attendance
                stopFaceVerification();

                // Get selected event and attendance type
                const selectedEventId = eventSelect && eventSelect.value ? parseInt(eventSelect.value) : null;
                const selectedAttendanceType = currentAttendanceType;

                await logAttendance(currentEnrolledUser, selectedEventId, selectedAttendanceType);
                showSuccessView(currentEnrolledUser);
                return;
            } else {
                if (faceVerificationStatus) {
                    faceVerificationStatus.textContent = "Face mismatch. Please ensure you are the registered user.";
                    faceVerificationStatus.className = "mt-3 p-3 rounded-lg font-medium text-sm text-yellow-700 dark:text-yellow-200 bg-yellow-200 dark:bg-yellow-700 text-center";
                }
            }
        } else {
            if (faceVerificationStatus) {
                faceVerificationStatus.textContent = "No face detected. Please look at the camera.";
                faceVerificationStatus.className = "mt-3 p-3 rounded-lg font-medium text-sm text-blue-700 dark:text-blue-200 bg-blue-200 dark:bg-blue-700 text-center";
            }
        }
    } catch (error) {
        console.error("Error during face verification:", error);
        if (faceVerificationStatus) {
            faceVerificationStatus.textContent = "Error during verification. Please try again.";
            faceVerificationStatus.className = "mt-3 p-3 rounded-lg font-medium text-sm text-red-700 dark:text-red-200 bg-red-200 dark:bg-red-700 text-center";
        }
    }

    // Continue loop
    if (faceVerificationLoop) {
        faceVerificationLoop = requestAnimationFrame(verifyFaceLoop);
    }
}

/**
 * Stop face verification
 */
function stopFaceVerification() {
    if (faceVerificationLoop) {
        cancelAnimationFrame(faceVerificationLoop);
        faceVerificationLoop = null;
    }
    if (faceVerificationVideo && faceVerificationVideo.srcObject) {
        faceVerificationVideo.srcObject.getTracks().forEach(track => track.stop());
        faceVerificationVideo.srcObject = null;
    }
    if (cameraSelect && cameraSelect.value) {
        // ensure start button re-enabled for scanning again
        if (startCameraBtn) {
            startCameraBtn.disabled = false;
            startCameraBtn.textContent = "Start Camera";
        }
    }
}

/**
 * Cancel face verification
 */
function cancelFaceVerification() {
    stopFaceVerification();
    if (currentEnrolledUser) {
        showUserFoundView(currentEnrolledUser);
    } else {
        resetToQRScan();
    }
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
 * Show success view
 */
function showSuccessView(user) {
    hideAllViews();
    if (attendanceSuccessView) attendanceSuccessView.classList.remove('hidden');
    if (successUserName) successUserName.textContent = user.fullName;
    if (successTimestamp) {
        const now = new Date();
        successTimestamp.textContent = `Marked at ${formatTimestamp(now)}`;
    }
    setScanStatus(`Success! ${user.fullName} marked present.`, "text-green-500");
}

/**
 * Load events into the event select dropdown
 */
async function loadEvents() {
    if (!eventSelect) return;

    try {
        const events = await getAllEvents(true); // Only active events
        eventSelect.innerHTML = '<option value="">No Event (General Attendance)</option>';

        events.forEach(event => {
            const option = document.createElement('option');
            option.value = event.eventId;
            option.textContent = `${event.eventName} (${new Date(event.eventDate).toLocaleDateString()})`;
            eventSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading events:', error);
    }
}

/**
 * Start the attendance scanner
 */
async function startAttendanceScanner() {
    // Reset views
    hideAllViews();
    if (qrScanningView) qrScanningView.classList.remove('hidden');

    // Load events
    await loadEvents();

    // Load cameras first
    await loadCameras();

    // Start stream if camera is selected
    if (cameraSelect && cameraSelect.value) {
        await startCameraStream();
    }
}

/**
 * Stop the attendance scanner
 */
function stopAttendanceScanner() {
    stopFaceVerification();
    stopScanVideoStream();
    if (verificationTimeout) {
        clearTimeout(verificationTimeout);
        verificationTimeout = null;
    }
    currentEnrolledUser = null;
    scanState = 'SCANNING_QR';
}

/**
 * Main scanning loop for QR code and face detection
 */
async function scanLoop() {
    const stream = getCurrentStream();
    if (!stream) return;

    const video = scanVideo;
    const canvas = scanCanvas;

    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        if (scanState === 'SCANNING_QR') {
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: "dontInvert",
            });

            if (code) {
                // Stop scanning loop
                if (getCurrentScanLoop()) {
                    cancelAnimationFrame(getCurrentScanLoop());
                    setCurrentScanLoop(null);
                }

                // Check if user exists
                const user = await getUserById(code.data);
                if (user) {
                    // User found - show user info
                    currentEnrolledUser = user;
                    showUserFoundView(user);
                } else {
                    // User not found - show error
                    showUserNotFoundView();
                }
            } else {
                setScanStatus("Please scan your QR code...", "text-gray-500");
            }
        }
    }

    // Continue loop if still scanning QR
    if (scanState === 'SCANNING_QR') {
        setCurrentScanLoop(requestAnimationFrame(scanLoop));
    }
}

/**
 * Update the scan status message
 * @param {string} text - Status message text
 * @param {string} colorClass - Tailwind color class
 */
function setScanStatus(text, colorClass) {
    if (!statusBox) return;

    statusBox.textContent = text;
    statusBox.className = `mt-3 p-3 rounded-lg font-medium text-sm ${colorClass} bg-gray-200 dark:bg-gray-700 text-center`;
}

/**
 * Initialize attendance type buttons
 */
function initAttendanceTypeButtons() {
    if (!typeTimeInBtn || !typeTimeOutBtn) return;

    // Helper to update UI
    const updateUI = (type) => {
        currentAttendanceType = type;

        // Reset both buttons to inactive state
        [typeTimeInBtn, typeTimeOutBtn].forEach(btn => {
            btn.className = "flex-1 py-2 px-4 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-all";
        });

        // Set active button style
        const activeBtn = type === 'time_in' ? typeTimeInBtn : typeTimeOutBtn;
        activeBtn.className = "flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-indigo-400";
    };

    typeTimeInBtn.onclick = () => updateUI('time_in');
    typeTimeOutBtn.onclick = () => updateUI('time_out');
}

// Initialize buttons when script loads
initAttendanceTypeButtons();
