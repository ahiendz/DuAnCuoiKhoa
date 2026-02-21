const { GoogleGenerativeAI } = require("@google/generative-ai");

const MODEL_NAME = "gemini-2.5-flash-lite";
// gemini-2.5-flash-lite    gemini-2.5-pro
const SYSTEM_INSTRUCTION = `Bạn là Trợ lý ảo School Manager Pro (SMP).
CHỈ TRẢ VỀ JSON: {"points": ["...", "..."]}.
CẤM chào hỏi. CẤM giải thích. 
CHỈ trả lời về React, Node.js, PostgreSQL, ESP32-CAM trong phạm vi dự án SMP.
Nếu hỏi ngoài lề, trả về: {"points": ["Tôi chỉ hỗ trợ SMP.", "Vui lòng hỏi đúng chuyên môn."]}`;

class GeminiService {
    constructor() {
        if (!process.env.GEMINI_API_KEY) {
            console.error("[GEMINI SERVICE] CRITICAL: GEMINI_API_KEY is not defined in .env");
        }
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.model = this.genAI.getGenerativeModel({
            model: MODEL_NAME,
            systemInstruction: SYSTEM_INSTRUCTION,
            generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 150,
                responseMimeType: "application/json",
                responseSchema: {
                    type: "object",
                    properties: {
                        points: {
                            type: "array",
                            items: { type: "string" }
                        }
                    },
                    required: ["points"]
                }
            }
        });
    }

    async processChat(message, history = []) {
        console.log(`[GEMINI SERVICE] Processing: "${message.substring(0, 50)}..."`);
        const startTime = Date.now();
        try {
            const chatHistory = [];
            if (Array.isArray(history)) {
                // Ensure history is clean and alternates correctly
                history.forEach(h => {
                    const role = h.role === 'model' ? 'model' : 'user';
                    // SDK expects parts as an array
                    const parts = Array.isArray(h.parts) ? h.parts : [{ text: h.text || "" }];
                    chatHistory.push({ role, parts });
                });
            }

            const chat = this.model.startChat({
                history: chatHistory,
            });

            const result = await chat.sendMessage(message);
            const response = await result.response;
            const text = response.text();

            console.log(`[GEMINI SERVICE] Success in ${Date.now() - startTime}ms`);
            return text;
        } catch (error) {
            console.error("[GEMINI SERVICE] Error:", error.message);
            throw error;
        }
    }
}

module.exports = new GeminiService();
