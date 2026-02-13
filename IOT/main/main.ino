#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <Servo.h>

/* ===== LCD ===== */
LiquidCrystal_I2C lcd(0x27, 16, 2);

/* ===== SERVO ===== */
Servo doorServo;

/* ===== PIN ===== */
#define LED_PIN 13
#define SERVO_PIN 3

/* ===== CONFIG ===== */
#define SERVO_OPEN_ANGLE 90
#define SERVO_CLOSE_ANGLE 0
#define DOOR_OPEN_TIME 5000   // 5 giây

bool waitingForName = false;

void setup() {
  Serial.begin(9600);

  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  doorServo.attach(SERVO_PIN);
  doorServo.write(SERVO_CLOSE_ANGLE);

  lcd.init();
  lcd.backlight();
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("HE THONG");
  lcd.setCursor(0, 1);
  lcd.print("CHO DIEM DANH");

  Serial.println("Go '1' de diem danh");
}

void loop() {
  if (Serial.available()) {
    String input = Serial.readStringUntil('\n');
    input.trim(); // xóa ký tự thừa

    // BƯỚC 1: GÕ SỐ 1
    if (input == "1") {
      digitalWrite(LED_PIN, HIGH);
      doorServo.write(SERVO_OPEN_ANGLE);

      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("MO CUA");
      lcd.setCursor(0, 1);
      lcd.print("NHAP TEN HS");

      Serial.println("Nhap ten hoc sinh:");
      waitingForName = true;

      delay(DOOR_OPEN_TIME);

      // Tự động đóng cửa
      doorServo.write(SERVO_CLOSE_ANGLE);
      digitalWrite(LED_PIN, LOW);
    }

    // BƯỚC 2: NHẬP TÊN HỌC SINH
    else if (waitingForName) {
      waitingForName = false;

      // Giới hạn 12 ký tự
      if (input.length() > 12) {
        input = input.substring(0, 12);
      }

      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("DA DIEM DANH");
      lcd.setCursor(0, 1);
      lcd.print("HS: ");
      lcd.print(input);

      Serial.print("Diem danh: ");
      Serial.println(input);

      delay(3000);

      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("SAN SANG");
      lcd.setCursor(0, 1);
      lcd.print("CHO TIEP");
    }
  }
}
