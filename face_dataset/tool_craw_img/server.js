require("dotenv").config();
const express = require("express");
const fs = require("fs");

const upload = require("./backend/middleware/upload");
const cloudinary = require("./backend/config/cloudinary");

const app = express();

app.use(express.json());
app.use(express.static("public"));

/* ========================================= */
/* OPTION 1: Upload avatar (default folder) */
/* ========================================= */

const path = require("path");

app.post("/api/upload/avatar", upload.single("avatar"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        // 👇 LẤY TÊN FILE GỐC (không có đuôi)
        const originalName = path.parse(req.file.originalname).name;

        const result = await cloudinary.uploader.upload(req.file.path, {
            folder: "school_manager_pro/students",
            public_id: originalName,
            overwrite: true,
            transformation: [{ width: 300, height: 300, crop: "fill" }]
        });

        fs.unlinkSync(req.file.path);

        return res.json({
            url: result.secure_url,
            public_id: result.public_id
        });

    } catch (err) {
        console.error("Upload error:", err);
        return res.status(500).json({ error: err.message });
    }
});



/* ========================================= */
/* OPTION 2: Upload with dynamic folder */
/* ========================================= */

app.post("/api/upload/:folder", upload.single("avatar"), async (req, res) => {
    try {
        const folderName = req.params.folder;

        const result = await cloudinary.uploader.upload(req.file.path, {
            folder: `school_manager_pro/${folderName}`
        });

        fs.unlinkSync(req.file.path);

        return res.json({
            url: result.secure_url,
            public_id: result.public_id
        });

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});


/* ========================================= */
/* OPTION 3: Delete image */
/* ========================================= */

app.delete("/api/upload", async (req, res) => {
    try {
        const { public_id } = req.body;

        if (!public_id) {
            return res.status(400).json({ error: "Missing public_id" });
        }

        await cloudinary.uploader.destroy(public_id);

        return res.json({ success: true });

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});


/* ========================================= */
/* OPTION 4: Replace avatar */
/* ========================================= */

app.post("/api/upload/replace", upload.single("avatar"), async (req, res) => {
    try {
        const { old_public_id } = req.body;

        if (old_public_id) {
            await cloudinary.uploader.destroy(old_public_id);
        }

        const result = await cloudinary.uploader.upload(req.file.path, {
            folder: "school_manager_pro/students"
        });

        fs.unlinkSync(req.file.path);

        return res.json({
            url: result.secure_url,
            public_id: result.public_id
        });

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});


/* ========================================= */
/* START SERVER */
/* ========================================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
