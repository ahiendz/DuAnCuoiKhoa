const { SerialPort } = require("serialport");

const SERIAL_PORT_PATH = process.env.ARDUINO_PORT || "COM8";
const SERIAL_BAUD_RATE = 9600;

let serialPort = null;

function normalizeText(value) {
  if (typeof value !== "string") {
    return value;
  }
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "");
}

function sanitizePayload(payload) {
  if (!payload || typeof payload !== "object") {
    return payload;
  }
  return {
    ...payload,
    name: normalizeText(payload.name),
    class: normalizeText(payload.class)
  };
}

function initPort() {
  try {
    serialPort = new SerialPort({
      path: SERIAL_PORT_PATH,
      baudRate: SERIAL_BAUD_RATE,
      autoOpen: false
    });

    serialPort.on("open", () => {
      console.log("Arduino port opened");
    });

    serialPort.on("error", error => {
      console.error("Arduino serial error:", error.message);
    });

    serialPort.open(error => {
      if (error) {
        console.error("Failed to open Arduino port:", error.message);
      }
    });
  } catch (error) {
    console.error("Failed to initialize Arduino serial:", error.message);
  }
}

function sendToArduino(payload) {
  try {
    if (!serialPort || !serialPort.isOpen) {
      console.error("Arduino port unavailable for write");
      return;
    }

    const safePayload = sanitizePayload(payload);
    const rawMessage = `${JSON.stringify(safePayload)}\n`;
    console.log(`Sending to Arduino: ${rawMessage.trim()}`);
    serialPort.write(rawMessage, error => {
      if (error) {
        console.error("Failed to write to Arduino:", error.message);
      }
    });
  } catch (error) {
    console.error("Arduino send failure:", error.message);
  }
}

initPort();

module.exports = {
  sendToArduino
};
