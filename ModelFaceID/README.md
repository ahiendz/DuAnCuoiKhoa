# Face ID Authentication Web Application

A modern, production-ready web application for Face ID Authentication with Liveness Detection using Flask, OpenCV, and dlib.

## Features

- 🔐 **Face Recognition**: Secure authentication using facial recognition
- 👁️ **Liveness Detection**: Anti-spoofing using Eye Aspect Ratio (EAR) blink detection
- 🎨 **Modern UI**: Clean, minimalist design with Tailwind CSS
- 📱 **Responsive**: Works on desktop and mobile devices
- ⚡ **Real-time Processing**: Live video feed with instant feedback

## Architecture

- **Backend**: Flask (Python) with RESTful API endpoints
- **Frontend**: HTML5, JavaScript (Vanilla), Tailwind CSS
- **Computer Vision**: OpenCV, face_recognition, dlib
- **Storage**: Pickle-based face encoding storage

## Prerequisites

- Python 3.8 or higher
- Webcam/camera access
- Internet connection (for Tailwind CSS CDN)

## Installation

### 1. Clone or Download the Project

```bash
cd ModelFaceID
```

### 2. Create Virtual Environment (Recommended)

```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

**Note**: Installing `dlib` and `face_recognition` may require additional system dependencies:

#### macOS:
```bash
brew install cmake
```

#### Ubuntu/Debian:
```bash
sudo apt-get install cmake libopenblas-dev liblapack-dev
```

#### Windows:
Install Visual Studio Build Tools or use pre-built wheels if available.

### 4. Download dlib Shape Predictor

The application requires the dlib 68-point facial landmark predictor for liveness detection.

**Download the file:**
- Visit: http://dlib.net/files/shape_predictor_68_face_landmarks.dat.bz2
- Extract the `.dat` file from the `.bz2` archive
- Place `shape_predictor_68_face_landmarks.dat` in the project root directory

**Quick download (Linux/macOS):**
```bash
wget http://dlib.net/files/shape_predictor_68_face_landmarks.dat.bz2
bunzip2 shape_predictor_68_face_landmarks.dat.bz2
```

**Or using curl:**
```bash
curl -O http://dlib.net/files/shape_predictor_68_face_landmarks.dat.bz2
bunzip2 shape_predictor_68_face_landmarks.dat.bz2
```

**Note**: The application will still run without this file, but liveness detection will be disabled.

## Usage

### 1. Start the Flask Server

```bash
python app.py
```

The server will start on `http://0.0.0.0:5000` (accessible at `http://localhost:5000`)

### 2. Open in Browser

Navigate to: `http://localhost:5000`

### 3. Register a Face

1. Enter your name in the registration field
2. Position your face clearly in the camera view
3. Click "Register"
4. Wait for confirmation

### 4. Verify Face (Login)

1. Click "Start Verification"
2. **Liveness Check**: Blink your eyes when prompted (yellow border)
3. **Recognition**: Once blink is detected, the system will verify your identity
4. **Result**: Green border = Access granted, Red border = Access denied

## API Endpoints

### `GET /`
Renders the main application page.

### `POST /register`
Register a new face.

**Request:**
```json
{
  "image": "data:image/jpeg;base64,...",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Successfully registered \"John Doe\""
}
```

### `POST /verify`
Verify face with liveness detection.

**Request:**
```json
{
  "image": "data:image/jpeg;base64,...",
  "liveness_passed": false
}
```

**Response (Blink Wait):**
```json
{
  "status": "blink_wait",
  "message": "Please blink your eyes to verify you are human",
  "ear": 0.32
}
```

**Response (Success):**
```json
{
  "status": "success",
  "message": "Welcome back, John Doe!",
  "name": "John Doe",
  "confidence": 0.92
}
```

### `GET /status`
Get application status.

**Response:**
```json
{
  "registered_faces": 3,
  "liveness_enabled": true,
  "names": ["John Doe", "Jane Smith", "Bob Johnson"]
}
```

## Configuration

You can modify these constants in `app.py`:

- `EAR_THRESHOLD = 0.25`: Eye Aspect Ratio threshold for blink detection (lower = more sensitive)
- `FACE_MATCH_THRESHOLD = 0.45`: Face recognition threshold (lower = stricter matching)
- `FACE_DATA_FILE = 'face_data.pkl'`: Path to face encoding storage file

## Project Structure

```
ModelFaceID/
├── app.py                      # Flask backend server
├── templates/
│   └── index.html             # Frontend HTML/JS/CSS
├── requirements.txt           # Python dependencies
├── README.md                  # This file
├── face_data.pkl             # Face encodings (created at runtime)
└── shape_predictor_68_face_landmarks.dat  # dlib predictor (download required)
```

## Troubleshooting

### Camera Not Working
- Ensure camera permissions are granted in your browser
- Check if another application is using the camera
- Try a different browser (Chrome, Firefox, Edge)

### dlib Installation Issues
- On macOS, ensure Xcode Command Line Tools are installed: `xcode-select --install`
- On Linux, install required system packages (see Installation section)
- Consider using conda: `conda install -c conda-forge dlib`

### Face Not Detected
- Ensure good lighting
- Position face directly in front of camera
- Remove glasses or hats if causing issues
- Check camera resolution settings

### Liveness Detection Not Working
- Verify `shape_predictor_68_face_landmarks.dat` is in the project root
- Check console for error messages
- Ensure face is clearly visible and eyes are open

## Security Considerations

⚠️ **Important**: This is a demonstration application. For production use:

- Implement proper authentication and session management
- Use HTTPS for all communications
- Store face encodings securely (encrypted database)
- Implement rate limiting and request validation
- Add logging and monitoring
- Consider additional anti-spoofing measures (3D face detection, texture analysis)

## License

This project is provided as-is for educational and demonstration purposes.

## Credits

- **face_recognition**: https://github.com/ageitgey/face_recognition
- **dlib**: http://dlib.net/
- **OpenCV**: https://opencv.org/
- **Flask**: https://flask.palletsprojects.com/
- **Tailwind CSS**: https://tailwindcss.com/
