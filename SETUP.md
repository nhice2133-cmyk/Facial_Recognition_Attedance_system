# Database Setup Guide

This attendance system now uses MySQL database for persistent storage. Follow these steps to set it up:

## Prerequisites

- XAMPP installed and running
- MySQL service running in XAMPP
- Apache service running in XAMPP

## Setup Steps

### 1. Configure Database Connection

Edit `api/config.php` and update the database credentials if needed:

```php
define('DB_HOST', 'localhost');
define('DB_USER', 'root');        // Default XAMPP MySQL username
define('DB_PASS', '');            // Default XAMPP MySQL password (empty)
define('DB_NAME', 'attendance_system');
```

### 2. Initialize Database

Open your web browser and navigate to:
```
http://localhost/fr/attendance-system/api/db_init.php
```

This will:
- Create the `attendance_system` database
- Create the `users` table
- Create the `attendance_logs` table

You should see success messages confirming the database and tables were created.

### 3. Access the Application

Open the attendance system:
```
http://localhost/fr/attendance-system/index.html
```

## Database Structure

### Users Table
- `id` (VARCHAR) - Primary key, user ID number
- `full_name` (VARCHAR) - User's full name
- `role` (VARCHAR) - User role (Student, Teacher, Staff)
- `descriptor` (TEXT) - Face recognition descriptor (JSON)
- `photo` (TEXT) - Base64 encoded photo
- `created_at` (TIMESTAMP) - Creation timestamp
- `updated_at` (TIMESTAMP) - Last update timestamp

### Attendance Logs Table
- `log_id` (INT) - Primary key, auto-increment
- `user_id` (VARCHAR) - Foreign key to users table
- `full_name` (VARCHAR) - User's full name (denormalized for reports)
- `attendance_time` (TIMESTAMP) - When attendance was marked
- `created_at` (TIMESTAMP) - Creation timestamp

## API Endpoints

### Users API (`api/users.php`)

- **GET** `/api/users.php` - Get all users
- **GET** `/api/users.php?id={userId}` - Get user by ID
- **POST** `/api/users.php` - Add new user
- **PUT** `/api/users.php` - Update user
- **DELETE** `/api/users.php?id={userId}` - Delete user

### Attendance API (`api/attendance.php`)

- **GET** `/api/attendance.php` - Get all attendance logs
- **GET** `/api/attendance.php?today=1` - Get today's attendance
- **GET** `/api/attendance.php?userId={userId}` - Get logs for specific user
- **GET** `/api/attendance.php?date={YYYY-MM-DD}` - Get logs for specific date
- **POST** `/api/attendance.php` - Add attendance log

## Troubleshooting

### Database Connection Error
- Make sure MySQL is running in XAMPP Control Panel
- Check database credentials in `api/config.php`
- Verify MySQL port (default: 3306)

### Tables Not Created
- Make sure you accessed `db_init.php` in a browser
- Check MySQL error logs in XAMPP
- Verify you have permission to create databases

### API Not Working
- Check browser console for errors
- Verify API files are in the `api/` directory
- Make sure Apache is running
- Check PHP error logs

## Notes

- All data is now persisted in MySQL database
- Data will persist across browser sessions
- Face descriptors are stored as JSON in the database
- Photos are stored as base64 encoded strings
- The system prevents duplicate attendance entries for the same day

