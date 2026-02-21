const geminiService = require("../services/gemini.service");

class AIController {
    async handleChat(req, res) {
        try {
            const { message, history } = req.body;

            if (!message) {
                return res.status(400).json({
                    ok: false,
                    error: {
                        code: "INVALID_REQUEST",
                        message: "Message is required"
                    }
                });
            }

            const responseText = await geminiService.processChat(message, history);

            let parsedResponse;
            try {
                // With strict JSON mode, we expect direct JSON
                parsedResponse = JSON.parse(responseText);
            } catch (e) {
                console.warn("[AI CONTROLLER] Failed to parse JSON even with schema enforcement, attempting clean-up fallback.");
                try {
                    const cleanText = responseText.replace(/```json\n?|\n?```/g, '').trim();
                    parsedResponse = JSON.parse(cleanText);
                } catch (e2) {
                    parsedResponse = { points: [responseText.trim()] };
                }
            }

            return res.json(parsedResponse);

        } catch (error) {
            console.error("[AI CONTROLLER] Chat error:", error);
            return res.status(500).json({
                ok: false,
                error: {
                    code: "SERVER_ERROR",
                    message: "Failed to process chat message",
                    details: error.message
                }
            });
        }
    }
}

module.exports = new AIController();
