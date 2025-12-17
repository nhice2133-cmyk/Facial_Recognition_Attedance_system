<?php
/**
 * Events API
 * Handles all event-related operations
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
        // Get all events or a specific event
        if (isset($_GET['id'])) {
            // Get single event by ID
            $id = intval($_GET['id']);
            $sql = "SELECT event_id, event_name, event_date, time_in_start, time_in_end, time_out_start, time_out_end, is_active, created_at, updated_at FROM events WHERE event_id = $id";
            $result = $conn->query($sql);
            
            if ($result && $result->num_rows > 0) {
                $event = $result->fetch_assoc();
                sendSuccess($event);
            } else {
                sendError('Event not found', 404);
            }
        } else if (isset($_GET['active'])) {
            // Get only active events
            $sql = "SELECT event_id, event_name, event_date, time_in_start, time_in_end, time_out_start, time_out_end, is_active, created_at, updated_at FROM events WHERE is_active = 1 ORDER BY event_date DESC, event_name ASC";
            $result = $conn->query($sql);
            
            $events = [];
            if ($result && $result->num_rows > 0) {
                while ($row = $result->fetch_assoc()) {
                    $events[] = $row;
                }
            }
            sendSuccess($events);
        } else {
            // Get all events
            $sql = "SELECT event_id, event_name, event_date, time_in_start, time_in_end, time_out_start, time_out_end, is_active, created_at, updated_at FROM events ORDER BY event_date DESC, event_name ASC";
            $result = $conn->query($sql);
            
            $events = [];
            if ($result && $result->num_rows > 0) {
                while ($row = $result->fetch_assoc()) {
                    $events[] = $row;
                }
            }
            sendSuccess($events);
        }
        break;
        
    case 'POST':
        // Add new event
        if (!isset($input['eventName']) || !isset($input['eventDate']) || !isset($input['timeInStart']) || !isset($input['timeInEnd']) || !isset($input['timeOutStart']) || !isset($input['timeOutEnd'])) {
            sendError('Missing required fields: eventName, eventDate, timeInStart, timeInEnd, timeOutStart, timeOutEnd');
        }
        
        $eventName = $conn->real_escape_string($input['eventName']);
        $eventDate = $conn->real_escape_string($input['eventDate']);
        $timeInStart = $conn->real_escape_string($input['timeInStart']);
        $timeInEnd = $conn->real_escape_string($input['timeInEnd']);
        $timeOutStart = $conn->real_escape_string($input['timeOutStart']);
        $timeOutEnd = $conn->real_escape_string($input['timeOutEnd']);
        $isActive = isset($input['isActive']) ? intval($input['isActive']) : 1;
        
        $sql = "INSERT INTO events (event_name, event_date, time_in_start, time_in_end, time_out_start, time_out_end, is_active) VALUES ('$eventName', '$eventDate', '$timeInStart', '$timeInEnd', '$timeOutStart', '$timeOutEnd', $isActive)";
        
        if ($conn->query($sql) === TRUE) {
            $eventId = $conn->insert_id;
            sendSuccess(['eventId' => $eventId], 'Event created successfully');
        } else {
            sendError('Error creating event: ' . $conn->error, 500);
        }
        break;
        
    case 'PUT':
        // Update event
        if (!isset($input['eventId'])) {
            sendError('Event ID is required');
        }
        
        $eventId = intval($input['eventId']);
        $updates = [];
        
        if (isset($input['eventName'])) {
            $updates[] = "event_name = '" . $conn->real_escape_string($input['eventName']) . "'";
        }
        if (isset($input['eventDate'])) {
            $updates[] = "event_date = '" . $conn->real_escape_string($input['eventDate']) . "'";
        }
        if (isset($input['timeInStart'])) {
            $updates[] = "time_in_start = '" . $conn->real_escape_string($input['timeInStart']) . "'";
        }
        if (isset($input['timeInEnd'])) {
            $updates[] = "time_in_end = '" . $conn->real_escape_string($input['timeInEnd']) . "'";
        }
        if (isset($input['timeOutStart'])) {
            $updates[] = "time_out_start = '" . $conn->real_escape_string($input['timeOutStart']) . "'";
        }
        if (isset($input['timeOutEnd'])) {
            $updates[] = "time_out_end = '" . $conn->real_escape_string($input['timeOutEnd']) . "'";
        }
        if (isset($input['isActive'])) {
            $updates[] = "is_active = " . intval($input['isActive']);
        }
        
        if (empty($updates)) {
            sendError('No fields to update');
        }
        
        $sql = "UPDATE events SET " . implode(', ', $updates) . " WHERE event_id = $eventId";
        
        if ($conn->query($sql) === TRUE) {
            if ($conn->affected_rows > 0) {
                sendSuccess(['eventId' => $eventId], 'Event updated successfully');
            } else {
                sendError('Event not found or no changes made', 404);
            }
        } else {
            sendError('Error updating event: ' . $conn->error, 500);
        }
        break;
        
    case 'DELETE':
        // Delete event
        if (!isset($_GET['id'])) {
            sendError('Event ID is required');
        }
        
        $eventId = intval($_GET['id']);
        $sql = "DELETE FROM events WHERE event_id = $eventId";
        
        if ($conn->query($sql) === TRUE) {
            if ($conn->affected_rows > 0) {
                sendSuccess(['eventId' => $eventId], 'Event deleted successfully');
            } else {
                sendError('Event not found', 404);
            }
        } else {
            sendError('Error deleting event: ' . $conn->error, 500);
        }
        break;
        
    default:
        sendError('Method not allowed', 405);
        break;
}

$conn->close();

