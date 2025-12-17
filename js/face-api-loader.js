/**
 * Face API Loader Module
 * Handles loading of face-api.js models
 */

let faceApiLoaded = false;

/**
 * Load face-api.js models from CDN
 * @returns {Promise<void>}
 */
async function loadFaceApiModels() {
    const MODEL_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights/';
    
    try {
        // These are small models for fast browser performance
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL);
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        faceApiLoaded = true;
        console.log("Face-api models loaded.");
        return true;
    } catch (err) {
        console.error("Error loading models:", err);
        throw err;
    }
}

/**
 * Check if face-api models are loaded
 * @returns {boolean}
 */
function isFaceApiLoaded() {
    return faceApiLoaded;
}

