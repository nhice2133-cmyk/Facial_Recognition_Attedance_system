<?php
/**
 * Users API
 * Handles all user-related operations
 */

require_once 'config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$conn = getDBConnection();

if (!$conn) {
    sendError('Database connection failed', 500);
}

// Get request body
$input = json_decode(file_get_contents('php://input'), true);

switch ($method) {
    case 'GET':
        // Get all users or a specific user
        if (isset($_GET['id'])) {
            // Get single user by ID
            $id = $conn->real_escape_string($_GET['id']);
            $sql = "SELECT id, full_name, role, descriptor, photo, created_at, updated_at FROM users WHERE id = '$id'";
            $result = $conn->query($sql);
            
            if ($result && $result->num_rows > 0) {
                $user = $result->fetch_assoc();
                sendSuccess($user);
            } else {
                sendError('User not found', 404);
            }
        } else {
            // Get all users
            $sql = "SELECT id, full_name, role, descriptor, photo, created_at, updated_at FROM users ORDER BY full_name ASC";
            $result = $conn->query($sql);
            
            $users = [];
            if ($result && $result->num_rows > 0) {
                while ($row = $result->fetch_assoc()) {
                    $users[] = $row;
                }
            }
            sendSuccess($users);
        }
        break;
        
    case 'POST':
        // Add new user
        if (!isset($input['id']) || !isset($input['fullName']) || !isset($input['role']) || !isset($input['descriptor']) || !isset($input['photo'])) {
            sendError('Missing required fields: id, fullName, role, descriptor, photo');
        }
        
        $id = $conn->real_escape_string($input['id']);
        $fullName = $conn->real_escape_string($input['fullName']);
        $role = $conn->real_escape_string($input['role']);
        $descriptor = $conn->real_escape_string(json_encode($input['descriptor']));
        $photo = $conn->real_escape_string($input['photo']);
        
        // Check if user already exists
        $checkSql = "SELECT id FROM users WHERE id = '$id'";
        $checkResult = $conn->query($checkSql);
        if ($checkResult && $checkResult->num_rows > 0) {
            sendError('User with this ID already exists', 409);
        }
        
        $sql = "INSERT INTO users (id, full_name, role, descriptor, photo) VALUES ('$id', '$fullName', '$role', '$descriptor', '$photo')";
        
        if ($conn->query($sql) === TRUE) {
            sendSuccess(['id' => $id], 'User added successfully');
        } else {
            sendError('Error adding user: ' . $conn->error, 500);
        }
        break;
        
    case 'PUT':
        // Update user
        if (!isset($input['id'])) {
            sendError('User ID is required');
        }
        
        $id = $conn->real_escape_string($input['id']);
        $updates = [];
        
        if (isset($input['fullName'])) {
            $updates[] = "full_name = '" . $conn->real_escape_string($input['fullName']) . "'";
        }
        if (isset($input['role'])) {
            $updates[] = "role = '" . $conn->real_escape_string($input['role']) . "'";
        }
        if (isset($input['descriptor'])) {
            $updates[] = "descriptor = '" . $conn->real_escape_string(json_encode($input['descriptor'])) . "'";
        }
        if (isset($input['photo'])) {
            $updates[] = "photo = '" . $conn->real_escape_string($input['photo']) . "'";
        }
        
        if (empty($updates)) {
            sendError('No fields to update');
        }
        
        $sql = "UPDATE users SET " . implode(', ', $updates) . " WHERE id = '$id'";
        
        if ($conn->query($sql) === TRUE) {
            if ($conn->affected_rows > 0) {
                sendSuccess(['id' => $id], 'User updated successfully');
            } else {
                sendError('User not found or no changes made', 404);
            }
        } else {
            sendError('Error updating user: ' . $conn->error, 500);
        }
        break;
        
    case 'DELETE':
        // Delete user
        if (!isset($_GET['id'])) {
            sendError('User ID is required');
        }
        
        $id = $conn->real_escape_string($_GET['id']);
        $sql = "DELETE FROM users WHERE id = '$id'";
        
        if ($conn->query($sql) === TRUE) {
            if ($conn->affected_rows > 0) {
                sendSuccess(['id' => $id], 'User deleted successfully');
            } else {
                sendError('User not found', 404);
            }
        } else {
            sendError('Error deleting user: ' . $conn->error, 500);
        }
        break;
        
    default:
        sendError('Method not allowed', 405);
        break;
}

$conn->close();

