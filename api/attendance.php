<?php
/**
 * Attendance API
 * Handles all attendance log operations
 */

require_once 'config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
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
        // Get all attendance logs or filter by date/user/event
        // JOIN with users and events tables
        $sql = "SELECT al.log_id, al.user_id, al.full_name, al.attendance_time, al.created_at, 
                       al.event_id, al.attendance_type, al.is_late,
                       u.role, e.event_name, e.event_date
                FROM attendance_logs al 
                LEFT JOIN users u ON al.user_id = u.id
                LEFT JOIN events e ON al.event_id = e.event_id";
        
        $conditions = [];
        if (isset($_GET['userId'])) {
            $userId = $conn->real_escape_string($_GET['userId']);
            $conditions[] = "al.user_id = '$userId'";
        }
        if (isset($_GET['eventId'])) {
            $eventId = intval($_GET['eventId']);
            $conditions[] = "al.event_id = $eventId";
        }
        if (isset($_GET['date'])) {
            $date = $conn->real_escape_string($_GET['date']);
            $conditions[] = "DATE(al.attendance_time) = '$date'";
        }
        if (isset($_GET['today'])) {
            $conditions[] = "DATE(al.attendance_time) = CURDATE()";
        }
        if (isset($_GET['attendanceType'])) {
            $type = $conn->real_escape_string($_GET['attendanceType']);
            $conditions[] = "al.attendance_type = '$type'";
        }
        
        if (!empty($conditions)) {
            $sql .= " WHERE " . implode(' AND ', $conditions);
        }
        
        $sql .= " ORDER BY al.attendance_time DESC";
        
        if (isset($_GET['limit'])) {
            $limit = intval($_GET['limit']);
            $sql .= " LIMIT $limit";
        }
        
        $result = $conn->query($sql);
        
        $logs = [];
        if ($result && $result->num_rows > 0) {
            while ($row = $result->fetch_assoc()) {
                $logs[] = $row;
            }
        }
        sendSuccess($logs);
        break;
        
    case 'POST':
        // Add attendance log
        if (!isset($input['userId']) || !isset($input['fullName'])) {
            sendError('Missing required fields: userId, fullName');
        }
        
        $userId = $conn->real_escape_string($input['userId']);
        $fullName = $conn->real_escape_string($input['fullName']);
        $eventId = isset($input['eventId']) ? intval($input['eventId']) : null;
        $attendanceType = isset($input['attendanceType']) ? $conn->real_escape_string($input['attendanceType']) : 'time_in';
        
        // Validate attendance type
        if (!in_array($attendanceType, ['time_in', 'time_out'])) {
            sendError('Invalid attendance type. Must be time_in or time_out');
        }
        
        // Check if user exists
        $userCheck = $conn->query("SELECT id FROM users WHERE id = '$userId'");
        if (!$userCheck || $userCheck->num_rows === 0) {
            sendError('User not found', 404);
        }
        
        // If event is provided, validate it exists and get time windows
        $isLate = 0;
        if ($eventId) {
            $eventCheck = $conn->query("SELECT time_in_start, time_in_end, time_out_start, time_out_end, event_date FROM events WHERE event_id = $eventId");
            if (!$eventCheck || $eventCheck->num_rows === 0) {
                sendError('Event not found', 404);
            }
            $event = $eventCheck->fetch_assoc();
            
            // Check for duplicate attendance for this event and type
            $duplicateCheck = $conn->query("SELECT log_id FROM attendance_logs WHERE user_id = '$userId' AND event_id = $eventId AND attendance_type = '$attendanceType'");
            if ($duplicateCheck && $duplicateCheck->num_rows > 0) {
                sendError('Attendance already marked for this event and type', 409);
            }
            
            // Calculate if late based on attendance type and current time
            $attendanceTime = isset($input['time']) ? $conn->real_escape_string($input['time']) : date('Y-m-d H:i:s');
            $timeOnly = date('H:i:s', strtotime($attendanceTime));
            
            if ($attendanceType === 'time_in') {
                // Check if time is after time_in_end
                if ($timeOnly > $event['time_in_end']) {
                    $isLate = 1;
                }
            } else if ($attendanceType === 'time_out') {
                // Check if time is before time_out_start (early checkout)
                if ($timeOnly < $event['time_out_start']) {
                    $isLate = 1; // Mark as late if checking out too early (optional logic)
                }
            }
        } else {
            // No event - check for duplicate attendance today
            $todayCheck = $conn->query("SELECT log_id FROM attendance_logs WHERE user_id = '$userId' AND DATE(attendance_time) = CURDATE() AND attendance_type = '$attendanceType'");
            if ($todayCheck && $todayCheck->num_rows > 0) {
                sendError('Attendance already marked for today', 409);
            }
            $attendanceTime = isset($input['time']) ? $conn->real_escape_string($input['time']) : date('Y-m-d H:i:s');
        }
        
        // Insert attendance log
        $eventIdSql = $eventId ? $eventId : 'NULL';
        $sql = "INSERT INTO attendance_logs (user_id, full_name, event_id, attendance_type, attendance_time, is_late) VALUES ('$userId', '$fullName', $eventIdSql, '$attendanceType', '$attendanceTime', $isLate)";
        
        if ($conn->query($sql) === TRUE) {
            $logId = $conn->insert_id;
            sendSuccess([
                'logId' => $logId,
                'userId' => $userId,
                'fullName' => $fullName,
                'eventId' => $eventId,
                'attendanceType' => $attendanceType,
                'attendanceTime' => $attendanceTime,
                'isLate' => $isLate
            ], 'Attendance logged successfully');
        } else {
            sendError('Error logging attendance: ' . $conn->error, 500);
        }
        break;
        
    default:
        sendError('Method not allowed', 405);
        break;
}

$conn->close();

