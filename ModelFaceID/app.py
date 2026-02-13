"""
Face ID Authentication Web Application
Backend Flask server with Liveness Detection and Face Recognition
"""

import os
import pickle
import base64
import numpy as np
import cv2
import face_recognition
import dlib
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Configuration
FACE_DATA_FILE = 'face_data.pkl'
EAR_THRESHOLD = 0.22  # Eye Aspect Ratio - blink when below (0.2-0.25 typical)
FACE_MATCH_THRESHOLD = 0.45  # Face recognition threshold

# Initialize dlib face detector and landmark predictor
detector = dlib.get_frontal_face_detector()
predictor = None

# Load shape predictor from face_recognition_models (built-in, no download needed)
try:
    from face_recognition_models import pose_predictor_model_location
    predictor_path = pose_predictor_model_location()
    predictor = dlib.shape_predictor(predictor_path)
    print(f"✓ Loaded shape predictor: {predictor_path}")
except Exception as e:
    print(f"⚠ Warning: Liveness detection disabled. {e}")

# Load existing face encodings and user info
known_encodings = {}
known_names = []
user_info = {}  # {name: {email, phone}} - thông tin hiển thị sau xác thực

def load_face_data():
    """Load face encodings and user info from pickle file"""
    global known_encodings, known_names, user_info
    if os.path.exists(FACE_DATA_FILE):
        try:
            with open(FACE_DATA_FILE, 'rb') as f:
                data = pickle.load(f)
                known_encodings = data.get('encodings', {})
                known_names = data.get('names', [])
                user_info = data.get('user_info', {})
                # Backward compatibility: ensure user_info has entry for each name
                for name in known_names:
                    if name not in user_info:
                        user_info[name] = {'email': '', 'phone': ''}
            print(f"✓ Loaded {len(known_names)} registered faces")
        except Exception as e:
            print(f"⚠ Error loading face data: {e}")
            known_encodings = {}
            known_names = []
            user_info = {}

def save_face_data():
    """Save face encodings and user info to pickle file"""
    try:
        with open(FACE_DATA_FILE, 'wb') as f:
            pickle.dump({
                'encodings': known_encodings,
                'names': known_names,
                'user_info': user_info
            }, f)
        print(f"✓ Saved face data to {FACE_DATA_FILE}")
        return True
    except Exception as e:
        print(f"⚠ Error saving face data: {e}")
        return False

def check_face_already_registered(encoding):
    """Kiểm tra khuôn mặt đã đăng ký chưa - trả về tên nếu đã có"""
    for name, known_encoding in known_encodings.items():
        distance = face_recognition.face_distance([known_encoding], encoding)[0]
        if distance <= FACE_MATCH_THRESHOLD:
            return name
    return None

def decode_image(image_data):
    """Decode base64 image data to OpenCV format"""
    try:
        # Remove data URL prefix if present
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        
        # Decode base64
        image_bytes = base64.b64decode(image_data)
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        return img
    except Exception as e:
        print(f"Error decoding image: {e}")
        return None

def calculate_ear(eye_landmarks):
    """
    Calculate Eye Aspect Ratio (EAR) for blink detection
    EAR = (|p2-p6| + |p3-p5|) / (2 * |p1-p4|)
    """
    # Convert landmarks to numpy array
    points = np.array([(p.x, p.y) for p in eye_landmarks])
    
    # Calculate distances
    vertical_1 = np.linalg.norm(points[1] - points[5])
    vertical_2 = np.linalg.norm(points[2] - points[4])
    horizontal = np.linalg.norm(points[0] - points[3])
    
    # Calculate EAR
    ear = (vertical_1 + vertical_2) / (2.0 * horizontal)
    return ear

def detect_blink(face_rect, gray_frame):
    """
    Detect blink using dlib landmarks and EAR calculation
    Returns: (blink_detected: bool, left_ear: float, right_ear: float)
    """
    if predictor is None:
        return False, 0.0, 0.0
    
    try:
        # Get facial landmarks
        landmarks = predictor(gray_frame, face_rect)
        
        # Extract eye landmarks (indices for 68-point model)
        # Left eye: [36, 37, 38, 39, 40, 41]
        # Right eye: [42, 43, 44, 45, 46, 47]
        left_eye = [landmarks.part(i) for i in range(36, 42)]
        right_eye = [landmarks.part(i) for i in range(42, 48)]
        
        # Calculate EAR for both eyes
        left_ear = calculate_ear(left_eye)
        right_ear = calculate_ear(right_eye)
        
        # Average EAR
        avg_ear = (left_ear + right_ear) / 2.0
        
        # Blink detected if EAR is below threshold
        blink_detected = avg_ear < EAR_THRESHOLD
        
        return blink_detected, left_ear, right_ear
    except Exception as e:
        print(f"Error in blink detection: {e}")
        return False, 0.0, 0.0

def detect_face_encoding(image):
    """Detect face and return encoding"""
    try:
        # Convert BGR to RGB (face_recognition uses RGB)
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        # Find face locations and encodings
        face_locations = face_recognition.face_locations(rgb_image)
        if len(face_locations) == 0:
            return None, None
        
        # Get the first face encoding
        face_encodings = face_recognition.face_encodings(rgb_image, face_locations)
        if len(face_encodings) == 0:
            return None, None
        
        return face_encodings[0], face_locations[0]
    except Exception as e:
        print(f"Error in face encoding: {e}")
        return None, None

# Load face data on startup
load_face_data()

@app.route('/')
def index():
    """Render the main page"""
    return render_template('index.html')

@app.route('/register', methods=['POST'])
def register():
    """Register a new face"""
    try:
        data = request.json
        image_data = data.get('image')
        name = data.get('name', '').strip()
        email = data.get('email', '').strip()
        phone = data.get('phone', '').strip()
        
        print(f"[REGISTER] Attempting to register: {name}")
        print(f"[REGISTER] Image data length: {len(image_data) if image_data else 0}")
        
        if not name:
            print("[REGISTER] Error: Name is empty")
            return jsonify({
                'status': 'error',
                'message': 'Name is required'
            }), 400
        
        if not image_data:
            print("[REGISTER] Error: No image data")
            return jsonify({
                'status': 'error',
                'message': 'Image data is required'
            }), 400
        
        # Decode image
        print("[REGISTER] Decoding image...")
        image = decode_image(image_data)
        if image is None:
            print("[REGISTER] Error: Failed to decode image")
            return jsonify({
                'status': 'error',
                'message': 'Failed to decode image'
            }), 400
        
        print(f"[REGISTER] Image shape: {image.shape}")
        
        # Detect face and get encoding
        print("[REGISTER] Detecting face...")
        encoding, face_location = detect_face_encoding(image)
        if encoding is None:
            print("[REGISTER] Error: No face detected")
            return jsonify({
                'status': 'error',
                'message': 'No face detected. Please ensure your face is clearly visible.'
            }), 400
        
        print(f"[REGISTER] Face detected at location: {face_location}")
        
        # Check if face already registered (trùng khuôn mặt)
        existing_name = check_face_already_registered(encoding)
        if existing_name:
            print(f"[REGISTER] Face already registered as '{existing_name}'")
            return jsonify({
                'status': 'error',
                'message': f'Khuôn mặt này đã được đăng ký trước đó với tên "{existing_name}".'
            }), 400
        
        # Check if name already exists
        if name in known_names:
            print(f"[REGISTER] Error: Name '{name}' already exists")
            return jsonify({
                'status': 'error',
                'message': f'Name "{name}" already exists. Please use a different name.'
            }), 400
        
        # Store encoding and user info
        known_encodings[name] = encoding
        known_names.append(name)
        user_info[name] = {'email': email, 'phone': phone}
        print(f"[REGISTER] Face encoding stored for '{name}'")
        
        # Save to file
        print("[REGISTER] Saving data to file...")
        if save_face_data():
            print(f"[REGISTER] Success: '{name}' registered")
            return jsonify({
                'status': 'success',
                'message': f'Successfully registered "{name}"'
            })
        else:
            print("[REGISTER] Error: Failed to save data")
            return jsonify({
                'status': 'error',
                'message': 'Registration successful but failed to save data'
            }), 500
            
    except Exception as e:
        print(f"[REGISTER] Exception: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'status': 'error',
            'message': f'Registration failed: {str(e)}'
        }), 500

@app.route('/verify', methods=['POST'])
def verify():
    """Verify face with liveness detection"""
    try:
        data = request.json
        image_data = data.get('image')
        liveness_passed = data.get('liveness_passed', False)  # Client-side state
        
        if not image_data:
            return jsonify({
                'status': 'error',
                'message': 'Image data is required'
            }), 400
        
        # Decode image
        image = decode_image(image_data)
        if image is None:
            return jsonify({
                'status': 'error',
                'message': 'Failed to decode image'
            }), 400
        
        # Convert to grayscale for dlib
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Detect faces using dlib
        faces = detector(gray)
        
        if len(faces) == 0:
            return jsonify({
                'status': 'no_face',
                'message': 'No face detected. Please position yourself in front of the camera.'
            })
        
        # Get the largest face
        face_rect = max(faces, key=lambda rect: rect.width() * rect.height())
        
        # Step 1: Liveness Detection (Blink Check)
        # Bypass when predictor missing or user skips (having trouble with blink)
        skip_liveness = data.get('skip_liveness', False)
        if predictor is None or skip_liveness:
            liveness_passed = True
        if not liveness_passed:
            blink_detected, left_ear, right_ear = detect_blink(face_rect, gray)
            
            if blink_detected:
                return jsonify({
                    'status': 'blink_detected',
                    'message': 'Blink detected! Verifying identity...',
                    'liveness_passed': True
                })
            else:
                avg_ear = (left_ear + right_ear) / 2.0
                return jsonify({
                    'status': 'blink_wait',
                    'message': 'Please blink your eyes to verify you are human',
                    'ear': round(avg_ear, 3)
                })
        
        # Step 2: Face Recognition (only after liveness passed)
        encoding, face_location = detect_face_encoding(image)
        if encoding is None:
            return jsonify({
                'status': 'error',
                'message': 'Failed to extract face encoding'
            }), 400
        
        # Compare with known faces
        if len(known_encodings) == 0:
            return jsonify({
                'status': 'error',
                'message': 'No registered faces found. Please register first.'
            }), 400
        
        # Calculate distances to all known faces
        matches = []
        for name, known_encoding in known_encodings.items():
            distance = face_recognition.face_distance([known_encoding], encoding)[0]
            matches.append((name, distance))
        
        # Find best match
        matches.sort(key=lambda x: x[1])
        best_match_name, best_match_distance = matches[0]
        
        # Check if match is below threshold
        if best_match_distance <= FACE_MATCH_THRESHOLD:
            info = user_info.get(best_match_name, {'email': '', 'phone': ''})
            return jsonify({
                'status': 'success',
                'message': f'Welcome back, {best_match_name}!',
                'name': best_match_name,
                'confidence': round(1 - best_match_distance, 3),
                'user_info': {
                    'name': best_match_name,
                    'email': info.get('email', ''),
                    'phone': info.get('phone', '')
                }
            })
        else:
            return jsonify({
                'status': 'denied',
                'message': 'Access denied. Face not recognized.',
                'confidence': round(1 - best_match_distance, 3)
            })
            
    except Exception as e:
        print(f"Error in verify endpoint: {e}")
        return jsonify({
            'status': 'error',
            'message': f'Verification failed: {str(e)}'
        }), 500

@app.route('/status', methods=['GET'])
def status():
    """Get application status"""
    return jsonify({
        'registered_faces': len(known_names),
        'liveness_enabled': predictor is not None,
        'names': known_names
    })

@app.route('/admin')
def admin():
    """Trang quản trị danh sách tài khoản"""
    return render_template('admin.html')

@app.route('/api/admin/accounts', methods=['GET'])
def get_accounts():
    """Lấy danh sách tài khoản đã đăng ký"""
    accounts = []
    for name in known_names:
        info = user_info.get(name, {'email': '', 'phone': ''})
        accounts.append({
            'name': name,
            'email': info.get('email', ''),
            'phone': info.get('phone', '')
        })
    return jsonify({'accounts': accounts})

@app.route('/api/admin/accounts/<name>', methods=['DELETE'])
def delete_account(name):
    """Xóa tài khoản theo tên"""
    if name not in known_names:
        return jsonify({'status': 'error', 'message': 'Tài khoản không tồn tại'}), 404
    known_names.remove(name)
    del known_encodings[name]
    if name in user_info:
        del user_info[name]
    save_face_data()
    return jsonify({'status': 'success', 'message': f'Đã xóa "{name}"'})

if __name__ == '__main__':
    print("\n" + "="*50)
    print("Face ID Authentication Server")
    print("="*50)
    print(f"Registered faces: {len(known_names)}")
    print(f"Liveness detection: {'Enabled' if predictor else 'Disabled'}")
    print("="*50 + "\n")
    app.run(debug=True, host='0.0.0.0', port=5001)
