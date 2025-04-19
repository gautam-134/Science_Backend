require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.API_KEY);

// Configure Multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Convert file buffer to generative part
function bufferToGenerativePart(buffer, mimeType) {
    return {
        inlineData: {
            data: buffer.toString("base64"),
            mimeType
        },
    };
}

app.post('/decompose-image', upload.single('image'), async(req, res) => {
    if (!req.file) {
        return res.status(400).send('Please upload an image.');
    }
    const prompt = "Give me summarized instructions to recycle or reuse this? (Give ans that are applicable on an individual scale. Also Don't give instruction's on living things or potentialy dangeours or illegal objects. ) make the bold text in html format";
    const imagePart = bufferToGenerativePart(req.file.buffer, req.file.mimetype);

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const text = await response.text(); // Ensure you await the .text() if it returns a promise
        res.json({ text });
        // console.log(text);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error processing your request');
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});