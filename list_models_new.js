const { GoogleGenAI } = require("@google/genai");
require("dotenv").config();

async function main() {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.list();
        console.log("Raw Response:", JSON.stringify(response, null, 2));
    } catch (error) {
        console.error("LIST MODELS ERROR:", error);
    }
}

main();
