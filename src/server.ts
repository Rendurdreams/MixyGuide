import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { OnboardingAgent } from './agents/onboarding/OnboardingAgent';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'test-interface')));

// Initialize agent
const agent = new OnboardingAgent(process.env.OPENAI_API_KEY || '');

// Routes
app.post('/api/initialize', async (req, res) => {
    try {
        const response = await agent.initialize();  // No parameters needed
        res.json({ response });
    } catch (error) {
        console.error('Initialization error:', error);
        res.status(500).json({ error: 'Failed to initialize agent' });
    }
});

app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;
        const response = await agent.processUserInput(message);
        res.json({ response });
    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: 'Failed to process message' });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});