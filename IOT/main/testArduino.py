import serial
import time
import json

# ===== CONFIG =====
PORT = "COM8"      # ĐỔI COM CHO ĐÚNG
BAUD = 9600

# ===== CONNECT =====
arduino = serial.Serial(PORT, BAUD, timeout=1)
time.sleep(2)  # Đợi Arduino reset

print("Connected to Arduino")

def send(payload):
    message = json.dumps(payload) + "\n"
    arduino.write(message.encode())
    print("Sent:", payload)
    time.sleep(6)  # đợi servo đóng

# ===== TEST CASES =====

test_cases = [

    # ===== SUCCESS CASES =====
    {"status":"Y","name":"Ly Anh Hien","class":"9A1"},
    {"status": "Y", "name": "Tran Thi Thanh Thao", "class": "9A2"},
    {"status": "Y", "name": "Nguyen Van A", "class": "10A1"},
    {"status": "Y", "name": "Pham Quoc Hung", "class": "12C3"},
    {"status":"Y","name":"Ly Anh Hien","class":"9A1"},

    # ===== TÊN CỰC DÀI =====
    {"status": "Y", "name": "Nguyen Thi Thanh Huyen", "class": "11A3"},
    {"status": "Y", "name": "Tran Dinh Hoang Phuc", "class": "9C1"},

    # ===== FAIL CASES =====
    {"status": "N"},
    {"status": "N"},
]

# ===== RUN =====
for case in test_cases:
    send(case)

print("All tests completed.")
arduino.close()
