<?php
/**
 * Database Initialization Script
 * Run this once to create the database and tables
 * Access via: http://localhost/fr/attendance-system/api/db_init.php
 */

require_once 'config.php';

// Create database connection without selecting database
$conn = new mysqli(DB_HOST, DB_USER, DB_PASS);

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// Create database if it doesn't exist
$sql = "CREATE DATABASE IF NOT EXISTS " . DB_NAME . " CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci";
if ($conn->query($sql) === TRUE) {
    echo "Database '" . DB_NAME . "' created or already exists.<br>";
} else {
    die("Error creating database: " . $conn->error);
}

// Select the database
$conn->select_db(DB_NAME);

// Create users table
$sql = "CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    descriptor TEXT NOT NULL,
    photo TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_full_name (full_name),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

if ($conn->query($sql) === TRUE) {
    echo "Table 'users' created or already exists.<br>";
} else {
    die("Error creating users table: " . $conn->error);
}

// Create events table
$sql = "CREATE TABLE IF NOT EXISTS events (
    event_id INT AUTO_INCREMENT PRIMARY KEY,
    event_name VARCHAR(255) NOT NULL,
    event_date DATE NOT NULL,
    time_in_start TIME NOT NULL,
    time_in_end TIME NOT NULL,
    time_out_start TIME NOT NULL,
    time_out_end TIME NOT NULL,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_event_date (event_date),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

if ($conn->query($sql) === TRUE) {
    echo "Table 'events' created or already exists.<br>";
} else {
    die("Error creating events table: " . $conn->error);
}

// Create attendance_logs table (updated with event_id and attendance_type)
$sql = "CREATE TABLE IF NOT EXISTS attendance_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    event_id INT NULL,
    attendance_type ENUM('time_in', 'time_out') NOT NULL DEFAULT 'time_in',
    attendance_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_late TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_event_id (event_id),
    INDEX idx_attendance_time (attendance_time),
    INDEX idx_attendance_type (attendance_type),
    INDEX idx_full_name (full_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

if ($conn->query($sql) === TRUE) {
    echo "Table 'attendance_logs' created or already exists.<br>";
    
    // Check if table exists and add new columns if needed (for existing installations)
    $tableCheck = $conn->query("SHOW TABLES LIKE 'attendance_logs'");
    if ($tableCheck && $tableCheck->num_rows > 0) {
        // Check if columns exist
        $columns = $conn->query("SHOW COLUMNS FROM attendance_logs LIKE 'event_id'");
        if (!$columns || $columns->num_rows == 0) {
            $conn->query("ALTER TABLE attendance_logs ADD COLUMN event_id INT NULL");
            echo "Added event_id column to attendance_logs.<br>";
        }
        
        $columns = $conn->query("SHOW COLUMNS FROM attendance_logs LIKE 'attendance_type'");
        if (!$columns || $columns->num_rows == 0) {
            $conn->query("ALTER TABLE attendance_logs ADD COLUMN attendance_type ENUM('time_in', 'time_out') NOT NULL DEFAULT 'time_in'");
            echo "Added attendance_type column to attendance_logs.<br>";
        }
        
        $columns = $conn->query("SHOW COLUMNS FROM attendance_logs LIKE 'is_late'");
        if (!$columns || $columns->num_rows == 0) {
            $conn->query("ALTER TABLE attendance_logs ADD COLUMN is_late TINYINT(1) DEFAULT 0");
            echo "Added is_late column to attendance_logs.<br>";
        }
        
        // Add foreign key if it doesn't exist
        $fkCheck = $conn->query("SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'attendance_logs' AND COLUMN_NAME = 'event_id' AND CONSTRAINT_NAME != 'PRIMARY'");
        if ($fkCheck && $fkCheck->num_rows == 0) {
            // Check if events table exists first
            $eventsTableCheck = $conn->query("SHOW TABLES LIKE 'events'");
            if ($eventsTableCheck && $eventsTableCheck->num_rows > 0) {
                $conn->query("ALTER TABLE attendance_logs ADD CONSTRAINT fk_event_id FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE SET NULL");
                echo "Added foreign key constraint for event_id.<br>";
            }
        }
        
        // Add indexes if they don't exist
        $indexCheck = $conn->query("SHOW INDEX FROM attendance_logs WHERE Key_name = 'idx_event_id'");
        if (!$indexCheck || $indexCheck->num_rows == 0) {
            $conn->query("CREATE INDEX idx_event_id ON attendance_logs(event_id)");
        }
        
        $indexCheck = $conn->query("SHOW INDEX FROM attendance_logs WHERE Key_name = 'idx_attendance_type'");
        if (!$indexCheck || $indexCheck->num_rows == 0) {
            $conn->query("CREATE INDEX idx_attendance_type ON attendance_logs(attendance_type)");
        }
    }
} else {
    die("Error creating attendance_logs table: " . $conn->error);
}

$conn->close();

echo "<br><strong>Database initialization completed successfully!</strong><br>";
echo "<a href='../index.html'>Go to Attendance System</a>";

