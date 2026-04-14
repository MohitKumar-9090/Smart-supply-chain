require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const key = process.env.GEMINI_API_KEY;

if (!key || key === 'your_gemini_api_key_here') {
  console.error('GEMINI_API_KEY is missing in backend/.env');
  process.exit(1);
}

const safeKeyPreview =
  key.length >= 8 ? `${key.slice(0, 4)}...${key.slice(-4)}` : '***';

async function run() {
  try {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent('Reply with only: OK');
    const text = result?.response?.text?.()?.trim();

    console.log('Gemini key:', safeKeyPreview);
    console.log('Model:', model.model);
    console.log('Response:', text);
    console.log('Status: SUCCESS');
  } catch (e) {
    console.error('Gemini key:', safeKeyPreview);
    console.error('Status: FAILED');
    console.error('Error:', e?.message || e);
    process.exit(1);
  }
}

run();
