console.log("!!! ARDUINO SERVICE LOADED !!!");
const { SerialPort } = require("serialport");

const SERIAL_PORT_PATH = process.env.ARDUINO_PORT || "COM8";
const SERIAL_BAUD_RATE = 9600;

let serialPort = null;
let isConnected = false;
let retryTimer = null;

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
  if (serialPort && serialPort.isOpen) return;

  console.log(`[ARDUINO] Attempting to connect to ${SERIAL_PORT_PATH}...`);

  try {
    serialPort = new SerialPort({
      path: SERIAL_PORT_PATH,
      baudRate: SERIAL_BAUD_RATE,
      autoOpen: false
    });

    serialPort.on("open", () => {
      console.log("[ARDUINO] Port opened successfully!");
      isConnected = true;
      if (retryTimer) clearInterval(retryTimer);
    });

    serialPort.on("close", () => {
      console.warn("[ARDUINO] Port closed. Retrying in 5s...");
      isConnected = false;
      scheduleRetry();
    });

    serialPort.on("error", error => {
      console.error("[ARDUINO] Serial error:", error.message);
      if (error.message.includes("Access denied") || error.message.includes("File not found")) {
        isConnected = false;
        scheduleRetry();
      }
    });

    serialPort.open(error => {
      if (error) {
        console.error("[ARDUINO] Failed to open port:", error.message);
        scheduleRetry();
      }
    });
  } catch (error) {
    console.error("[ARDUINO] Init failure:", error.message);
    scheduleRetry();
  }
}

function scheduleRetry() {
  if (retryTimer) clearInterval(retryTimer);
  retryTimer = setTimeout(initPort, 5000);
}

function sendToArduino(payload) {
  try {
    const safePayload = sanitizePayload(payload);
    // LOG THE EXACT PAYLOAD FOR USER
    console.log("[ARDUINO] >>> PREPARING PAYLOAD:", JSON.stringify(safePayload));

    if (!serialPort || !isConnected) {
      console.error("[ARDUINO] Port unavailable. Cannot send:", JSON.stringify(safePayload));
      // Try to reconnect immediately if traffic comes in
      initPort();
      return;
    }

    const rawMessage = `${JSON.stringify(safePayload)}\n`;
    serialPort.write(rawMessage, error => {
      if (error) {
        console.error("[ARDUINO] Write Failed:", error.message);
      } else {
        console.log(`[ARDUINO] >>> SENT: ${rawMessage.trim()}`);
      }
    });
  } catch (error) {
    console.error("[ARDUINO] Send Exception:", error.message);
  }
}

// Start connection
initPort();

module.exports = {
  sendToArduino
};
