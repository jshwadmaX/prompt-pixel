const express = require('express');
const router = express.Router();
const axios = require('axios');
const { getDb } = require('../database');
const { addToIndex, searchIndex, getIndexSize } = require('../faissIndex');
const { optimizePrompt } = require('../promptOptimizer');

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
// Confirmed active on Groq (verified 2026-04-19)
const GROQ_MODEL = 'llama-3.1-8b-instant';

// ─────────────────────────────────────────────────────────────────────────────
// LOCAL EMBEDDINGS — simple TF-IDF-style bag-of-words, 128-dim
// No external APIs needed. Works offline. Good enough for similarity search.
// ─────────────────────────────────────────────────────────────────────────────
function getEmbedding(text) {
  try {
    const DIM = 128;
    const vec = new Array(DIM).fill(0);
    const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
    for (const word of words) {
      let hash = 5381;
      for (let i = 0; i < word.length; i++) {
        hash = ((hash << 5) + hash) ^ word.charCodeAt(i);
        hash = hash & 0x7fffffff; // keep positive 32-bit
      }
      const idx = hash % DIM;
      // also sprinkle a second bucket for better spread
      const idx2 = (hash * 31) % DIM;
      vec[idx] += 1;
      vec[idx2] += 0.5;
    }
    // L2-normalize
    const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
    return vec.map(v => v / norm);
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RULE-BASED JUDGE (instant fallback, no API needed)
// ─────────────────────────────────────────────────────────────────────────────
function ruleBasedJudge(prompt) {
  const words = prompt.trim().split(/\s+/);
  const score = Math.min(10, Math.max(1, Math.floor(words.length / 3) + 2));
  const hasStyle = /oil paint|watercolor|photorealistic|digital art|cinematic|anime/i.test(prompt);
  const hasLighting = /lighting|light|shadow|golden hour|backlit|neon/i.test(prompt);
  const promptType = /portrait|person|face|woman|man|girl|boy/i.test(prompt) ? 'portrait'
    : /landscape|mountain|ocean|forest|city|sky/i.test(prompt) ? 'scene'
    : /style|art|painting|render/i.test(prompt) ? 'style' : 'abstract';
  const feedback = !hasStyle && !hasLighting
    ? 'Add an art style (e.g. "photorealistic", "oil painting") and lighting details.'
    : !hasStyle ? 'Specify an art style for better results.'
    : !hasLighting ? 'Add lighting details like "golden hour" or "dramatic lighting".'
    : 'Good prompt — consider adding more compositional detail.';
  return { prompt_type: promptType, score, feedback };
}

// ─────────────────────────────────────────────────────────────────────────────
// TEXT GENERATION — Groq → rule-based judge fallback
// ─────────────────────────────────────────────────────────────────────────────
async function generateText(systemPrompt, userMessage) {
  if (GROQ_API_KEY && GROQ_API_KEY !== 'your_groq_key_here') {
    try {
      const response = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: GROQ_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          temperature: 0.7,
          max_tokens: 512,
        },
        {
          headers: {
            Authorization: `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );
      const text = response.data?.choices?.[0]?.message?.content;
      if (!text) throw new Error('Empty response from Groq');
      console.log('✓ Groq OK');
      return text.trim();
    } catch (err) {
      const detail = err.response?.data?.error?.message || err.message;
      console.warn('Groq error → using rule-based fallback:', detail);
    }
  } else {
    console.warn('No Groq key set → using rule-based fallback');
  }
  throw new Error('__USE_FALLBACK__');
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/judge
router.post('/judge', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const systemPrompt =
      'You are a prompt quality judge for AI image generation. Given a prompt, return ONLY a JSON object with fields: prompt_type (one of: scene, portrait, style, abstract), score (1-10), feedback (one line on what is weak). Be strict. Return ONLY valid JSON, no markdown, no explanation.';

    let judgeResult;
    try {
      const response = await generateText(systemPrompt, prompt);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      judgeResult = jsonMatch ? JSON.parse(jsonMatch[0]) : ruleBasedJudge(prompt);
    } catch (_) {
      judgeResult = ruleBasedJudge(prompt);
      console.log('Using rule-based judge');
    }

    const validTypes = ['scene', 'portrait', 'style', 'abstract'];
    if (!validTypes.includes(judgeResult.prompt_type)) judgeResult.prompt_type = 'scene';
    judgeResult.score = Math.max(1, Math.min(10, Number(judgeResult.score) || 5));
    res.json(judgeResult);
  } catch (err) {
    console.error('Judge error:', err.message);
    res.status(500).json({ error: 'Failed to judge prompt.' });
  }
});

// POST /api/enhance
router.post('/enhance', async (req, res) => {
  try {
    const { prompt, failures = [] } = req.body;
    if (typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    if (!Array.isArray(failures)) {
      return res.status(400).json({ error: 'Failures must be an array' });
    }

    const result = optimizePrompt(prompt, failures);
    res.json({
      enhanced_prompt: result.enhancedPrompt,
      optimization: result.optimization,
    });
  } catch (err) {
    console.error('Enhance error:', err.message);
    res.status(500).json({ error: 'Failed to enhance prompt.' });
  }
});

// POST /api/generate — Hugging Face Inference, with Pollinations as a fallback
router.post('/generate', async (req, res) => {
  let activeProvider = 'Pollinations.ai';
  const hasPollinationsKey = Boolean(
    process.env.POLLINATIONS_API_KEY &&
    process.env.POLLINATIONS_API_KEY !== 'your_pollinations_api_key_here'
  );
  try {
    const { prompt } = req.body;
    if (typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (process.env.HUGGINGFACE_API_KEY && process.env.HUGGINGFACE_API_KEY !== 'hf_your_api_key_here') {
      activeProvider = 'Hugging Face Inference';
      console.log('Generating image via Hugging Face Inference...');
      try {
      const response = await axios.post(
        'https://router.huggingface.co/hf-inference/models/stabilityai/stable-diffusion-3-medium-diffusers',
        {
          inputs: prompt.trim(),
          parameters: { width: 768, height: 768 },
          options: { wait_for_model: true },
        },
        {
          responseType: 'arraybuffer',
          timeout: 120000,
          headers: {
            Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );
      const mimeType = response.headers['content-type']?.split(';')[0];
      if (!mimeType?.startsWith('image/') || !response.data?.byteLength) {
        throw new Error(`Hugging Face returned an invalid response (${mimeType || 'unknown content type'})`);
      }
      const base64 = Buffer.from(response.data).toString('base64');
      console.log('✓ Image generated successfully via Hugging Face Inference');
      return res.json({ image: base64, mime_type: mimeType });
      } catch (huggingFaceError) {
        const fallbackStatuses = [401, 402, 403, 404, 429, 500, 502, 503];
        const canFallback = hasPollinationsKey && (
          fallbackStatuses.includes(huggingFaceError.response?.status) ||
          huggingFaceError.code === 'ECONNABORTED' ||
          !huggingFaceError.response
        );
        if (!canFallback) throw huggingFaceError;
        console.warn(
          `Hugging Face failed (${huggingFaceError.response?.status || huggingFaceError.code || 'invalid response'}); trying Pollinations.ai.`
        );
      }
    }

    activeProvider = 'Pollinations.ai';
    console.log('Generating image via Pollinations Gen API...');

    const encodedPrompt = encodeURIComponent(prompt);
    const seed = Math.floor(Math.random() * 999999);
    const url = `https://gen.pollinations.ai/image/${encodedPrompt}?width=768&height=768&seed=${seed}&model=flux`;
    const headers = { 'User-Agent': 'PromptPixel/1.0' };
    if (process.env.POLLINATIONS_API_KEY) {
      headers.Authorization = `Bearer ${process.env.POLLINATIONS_API_KEY}`;
    }

    const requestOptions = {
      responseType: 'arraybuffer',
      timeout: 120000,
    };
    let response;
    try {
      response = await axios.get(url, { ...requestOptions, headers });
    } catch (requestError) {
      if (![401, 403].includes(requestError.response?.status) || !headers.Authorization) {
        throw requestError;
      }
      console.warn('Configured Pollinations key was rejected; retrying keyless image generation.');
      response = await axios.get(url, {
        ...requestOptions,
        headers: { 'User-Agent': 'PromptPixel/1.0' },
      });
    }

    const mimeType = response.headers['content-type']?.split(';')[0];
    if (!mimeType?.startsWith('image/') || !response.data?.byteLength) {
      throw new Error(`Image provider returned an invalid response (${mimeType || 'unknown content type'})`);
    }

    const base64 = Buffer.from(response.data).toString('base64');
    console.log('✓ Image generated successfully');
    res.json({ image: base64, mime_type: mimeType });
  } catch (err) {
    console.error('Generate error:', err.message);
    if (err.code === 'ECONNABORTED') {
      res.status(503).json({ error: 'Image generation timed out. Please try again.' });
    } else if (err.response?.status === 402) {
      const message = activeProvider === 'Hugging Face Inference'
        ? 'Hugging Face Inference has no available credits for this request. Add credits to your Hugging Face account or configure Pollinations with available Pollen.'
        : hasPollinationsKey && process.env.HUGGINGFACE_API_KEY
          ? 'Hugging Face could not generate this image, and Pollinations.ai requires available Pollen. Check your Pollinations balance and API key.'
          : 'Pollinations.ai requires available Pollen for this request. Check your Pollinations balance and POLLINATIONS_API_KEY.';
      res.status(503).json({ error: message });
    } else if ([401, 403].includes(err.response?.status)) {
      const message = activeProvider === 'Hugging Face Inference'
        ? hasPollinationsKey
          ? 'Hugging Face rejected the configured key or model access, and Pollinations.ai also could not generate the image. Check provider keys and permissions.'
          : 'Hugging Face rejected the configured API key or model access. Check HUGGINGFACE_API_KEY and its Inference Providers permission.'
        : hasPollinationsKey
          ? 'Pollinations.ai rejected the configured API key. Check POLLINATIONS_API_KEY and its permissions.'
          : 'Pollinations.ai rejected keyless generation. Configure POLLINATIONS_API_KEY with provider access.';
      res.status(503).json({ error: message });
    } else {
      res.status(502).json({ error: 'Image generation provider failed. Please try again.' });
    }
  }
});

// POST /api/log-failure
router.post('/log-failure', async (req, res) => {
  try {
    const { original_prompt, enhanced_prompt, prompt_type, failure_reason, judge_score, judge_feedback } = req.body;
    if (!original_prompt) return res.status(400).json({ error: 'Original prompt is required' });

    // Use local embedding (no external API)
    const embedding = getEmbedding(original_prompt);
    const embeddingStr = embedding ? JSON.stringify(embedding) : null;

    const db = getDb();
    const result = db.prepare(`
      INSERT INTO failure_memory (original_prompt, enhanced_prompt, prompt_type, failure_reason, judge_score, judge_feedback, embedding)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      original_prompt,
      enhanced_prompt || '',
      prompt_type || 'scene',
      failure_reason || 'User rated as bad',
      judge_score || 0,
      judge_feedback || '',
      embeddingStr
    );

    if (embedding) addToIndex(result.lastInsertRowid, embedding);
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    console.error('Log failure error:', err.message);
    res.status(500).json({ error: 'Failed to log failure' });
  }
});

// GET /api/failures
router.get('/failures', (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare(
      'SELECT id, original_prompt, enhanced_prompt, prompt_type, failure_reason, judge_score, judge_feedback, created_at FROM failure_memory ORDER BY created_at DESC'
    ).all();
    res.json(rows);
  } catch (err) {
    console.error('Failures fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch failures' });
  }
});

// POST /api/search-failures
router.post('/search-failures', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

    if (getIndexSize() === 0) return res.json({ failures: [] });

    const embedding = getEmbedding(prompt); // local, synchronous
    if (!embedding) return res.json({ failures: [] });

    const results = searchIndex(embedding, 3).filter((result) => result.similarity >= 0.08);
    if (results.length === 0) return res.json({ failures: [] });

    const db = getDb();
    const matchIds = results.map((r) => r.id);
    const placeholders = matchIds.map(() => '?').join(',');
    const rows = db.prepare(`SELECT * FROM failure_memory WHERE id IN (${placeholders})`).all(...matchIds);
    const failuresById = new Map(rows.map((row) => [row.id, row]));
    const failures = results
      .map((result) => {
        const failure = failuresById.get(result.id);
        return failure ? { ...failure, similarity: result.similarity } : null;
      })
      .filter(Boolean);
    res.json({ failures });
  } catch (err) {
    console.error('Search failures error:', err.message);
    res.status(500).json({ error: 'Failed to search failures' });
  }
});

module.exports = router;
