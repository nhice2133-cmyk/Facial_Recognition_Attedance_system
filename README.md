# QR + Face Attendance System

A modern attendance tracking system that combines QR code scanning with facial recognition for secure attendance marking.

## Project Structure

```
attendance-system/
├── index.html              # Main HTML file
├── css/
│   └── styles.css          # Custom styles and animations
├── js/
│   ├── storage.js          # Data management (users & attendance logs)
│   ├── auth.js             # Authentication logic
│   ├── face-api-loader.js  # Face API model loading
│   ├── main.js             # Initialization, navigation, theme
│   ├── enrollment.js       # User enrollment functionality
│   ├── dashboard.js        # Dashboard statistics
│   ├── members.js          # Members list and QR display
│   ├── attendance.js       # QR scanning and face verification
│   └── reports.js          # Attendance reports
└── README.md               # This file
```

## Features

- **User Enrollment**: Enroll users with face recognition and generate unique QR codes
- **Photo Preview**: Preview captured or uploaded photos before enrollment
- **Dual Authentication**: QR code + face verification for secure attendance
- **Dashboard**: Real-time statistics of members and attendance
- **Members Management**: View all enrolled members with their QR codes
- **Attendance Reports**: Track attendance history with timestamps
- **Dark/Light Theme**: Toggle between themes with persistent storage
- **Responsive Design**: Works on desktop and mobile devices

## File Descriptions

### `index.html`
Main HTML structure with all page sections and external library links.

### `css/styles.css`
Custom styles including:
- Sidebar gradient
- Page transitions
- Video and canvas styling
- Loading spinner animations

### `js/storage.js`
Manages in-browser data storage:
- `getAllUsers()` - Get all enrolled users
- `addUser(user)` - Add a new user
- `getUserById(id)` - Find user by ID
- `addAttendanceLog(log)` - Log attendance
- `getAllAttendanceLogs()` - Get all attendance records

### `js/auth.js`
Handles authentication logic:
- Login/Logout functionality
- Password visibility toggle
- Session management

### `js/face-api-loader.js`
Handles loading of face-api.js models from CDN.

### `js/main.js`
Core application logic:
- Theme management (dark/light mode)
- Navigation between pages
- Video stream management
- Application initialization

### `js/enrollment.js`
User enrollment functionality:
- Camera access for face capture
- Face detection and descriptor extraction
- QR code generation
- Photo capture and preview

### `js/dashboard.js`
Dashboard page logic:
- Statistics calculation
- Real-time updates

### `js/members.js`
Members list page:
- Display all enrolled users
- QR code generation for each user
- Print QR code functionality

### `js/attendance.js`
Attendance marking system:
- QR code scanning
- Face verification against enrolled users
- State management for scanning process
- Attendance logging

### `js/reports.js`
Reports page:
- Display attendance history
- Filter by Event, Date, and Search (Name/ID)
- Sortable columns (Name, ID, Role, etc.)
- Format timestamps
- Table rendering

## Usage

1. Open `index.html` in a web browser
2. Wait for AI models to load
3. Navigate to "Enrollment" to add new users
4. Use "Mark Attendance" to scan QR codes and verify faces
5. View statistics on "Dashboard" and reports on "Reports" page

## Dependencies

- **Tailwind CSS** (CDN) - Styling framework
- **face-api.js** - Facial recognition
- **jsQR** - QR code scanning
- **qrcode.js** - QR code generation
- **Google Fonts (Inter)** - Typography
- **Lucide Icons** - Icons (via React UMD)

## Browser Requirements

- Modern browser with WebRTC support (for camera access)
- JavaScript enabled
- HTTPS or localhost (required for camera access)

## Notes

- All data is stored in browser memory (lost on page refresh)
- For production use, integrate with a backend API
- Face recognition models are loaded from CDN on first load

