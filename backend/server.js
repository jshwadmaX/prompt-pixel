require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// API Routes
app.use('/api', apiRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'PromptPixel API is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n  PromptPixel API Server`);
  console.log(`  Running on http://localhost:${PORT}`);
  console.log(`  Image providers: Hugging Face Inference / Pollinations.ai\n`);
});
