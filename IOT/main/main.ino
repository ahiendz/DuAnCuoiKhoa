#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <Servo.h>

/* ===== LCD ===== */
LiquidCrystal_I2C lcd(0x27, 16, 2);

/* ===== SERVO ===== */
Servo doorServo;

/* ===== PIN ===== */
#define LED_PIN 2
#define SERVO_PIN 3

/* ===== CONFIG ===== */
#define SERVO_OPEN_ANGLE 90
#define SERVO_CLOSE_ANGLE 0
#define DOOR_OPEN_TIME 5000
#define ERROR_DISPLAY_TIME 3000

/* ===== STATE ===== */
unsigned long actionStartTime = 0;
bool doorOpen = false;
bool showingError = false;

void setup() {
  Serial.begin(9600);
  Serial.setTimeout(200);

  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  doorServo.attach(SERVO_PIN);
  doorServo.write(SERVO_CLOSE_ANGLE);

  lcd.init();
  lcd.backlight();

  showReady();
}

void loop() {

  if (Serial.available()) {
    String input = Serial.readStringUntil('\n');
    input.trim();

    if (input.length() == 0) return;

    String statusValue = extractStatus(input);

    if (statusValue == "Y") {
      handleSuccess(input);
    }
    else if (statusValue == "N") {
      handleFail();
    }
  }

  unsigned long currentMillis = millis();

  if (doorOpen && currentMillis - actionStartTime >= DOOR_OPEN_TIME) {
    closeDoor();
  }

  if (showingError && currentMillis - actionStartTime >= ERROR_DISPLAY_TIME) {
    showingError = false;
    showReady();
  }
}

/* ========================= */
/* ===== SUCCESS =========== */
/* ========================= */

void handleSuccess(String input) {

  digitalWrite(LED_PIN, HIGH);
  doorServo.write(SERVO_OPEN_ANGLE);

  String name = extractShortName(input);
  String className = extractClass(input);

  lcd.clear();

  lcd.setCursor(0, 0);
  lcd.print("DANG MO CUA");

  lcd.setCursor(0, 1);
  lcd.print(name);

  int nameLength = name.length();
  int classPosition = nameLength + 2;

  if (classPosition < 16) {
    lcd.setCursor(classPosition, 1);
    lcd.print(className);
  }

  doorOpen = true;
  actionStartTime = millis();
}

/* ========================= */
/* ===== FAIL ============== */
/* ========================= */

void handleFail() {

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("KHONG NHAN DIEN");

  showingError = true;
  actionStartTime = millis();
}

/* ========================= */
/* ===== CLOSE DOOR ======== */
/* ========================= */

void closeDoor() {
  doorServo.write(SERVO_CLOSE_ANGLE);
  digitalWrite(LED_PIN, LOW);

  doorOpen = false;
  showReady();
}

/* ========================= */
/* ===== READY SCREEN ====== */
/* ========================= */

void showReady() {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("HE THONG SAN SANG");
}

/* ========================= */
/* ===== EXTRACT STATUS ==== */
/* ========================= */

String extractStatus(String input) {

  int index = input.indexOf("\"status\"");
  if (index == -1) return "";

  int colon = input.indexOf(":", index);
  if (colon == -1) return "";

  int firstQuote = input.indexOf("\"", colon);
  if (firstQuote == -1) return "";

  int secondQuote = input.indexOf("\"", firstQuote + 1);
  if (secondQuote == -1) return "";

  return input.substring(firstQuote + 1, secondQuote);
}

/* ========================= */
/* ===== EXTRACT NAME ====== */
/* ========================= */

String extractShortName(String input) {

  int nameIndex = input.indexOf("\"name\"");
  if (nameIndex == -1) return "UNKNOWN";

  int colon = input.indexOf(":", nameIndex);
  int firstQuote = input.indexOf("\"", colon);
  int secondQuote = input.indexOf("\"", firstQuote + 1);

  if (firstQuote == -1 || secondQuote == -1) return "UNKNOWN";

  String fullName = input.substring(firstQuote + 1, secondQuote);

  int lastSpace = fullName.lastIndexOf(" ");
  if (lastSpace == -1) return fullName;

  int secondLastSpace = fullName.lastIndexOf(" ", lastSpace - 1);

  if (secondLastSpace != -1) {
    String twoWords = fullName.substring(secondLastSpace + 1);
    if (twoWords.length() <= 12) return twoWords;
  }

  return fullName.substring(lastSpace + 1);
}

/* ========================= */
/* ===== EXTRACT CLASS ===== */
/* ========================= */

String extractClass(String input) {

  int classIndex = input.indexOf("\"class\"");
  if (classIndex == -1) return "";

  int colon = input.indexOf(":", classIndex);
  int firstQuote = input.indexOf("\"", colon);
  int secondQuote = input.indexOf("\"", firstQuote + 1);

  if (firstQuote == -1 || secondQuote == -1) return "";

  return input.substring(firstQuote + 1, secondQuote);
}
