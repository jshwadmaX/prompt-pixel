const path = require('path');
const fs = require('fs');

const INDEX_PATH = path.join(__dirname, 'failure_index.faiss');
const IDS_PATH = path.join(__dirname, 'failure_ids.json');

// We'll use a simple in-memory approach with cosine similarity
// since faiss-node can be tricky to install on Windows.
// This provides the same functionality with JSON-based persistence.

let embeddings = [];
let ids = [];

function loadIndex() {
  try {
    if (fs.existsSync(IDS_PATH)) {
      const data = JSON.parse(fs.readFileSync(IDS_PATH, 'utf-8'));
      embeddings = data.embeddings || [];
      ids = data.ids || [];
      console.log(`Loaded FAISS-like index with ${ids.length} entries`);
    } else {
      console.log('No existing index found, starting fresh');
    }
  } catch (err) {
    console.error('Error loading index:', err.message);
    embeddings = [];
    ids = [];
  }
}

function saveIndex() {
  try {
    fs.writeFileSync(IDS_PATH, JSON.stringify({ embeddings, ids }), 'utf-8');
    console.log(`Index saved with ${ids.length} entries`);
  } catch (err) {
    console.error('Error saving index:', err.message);
  }
}

function addToIndex(id, embedding) {
  ids.push(id);
  embeddings.push(embedding);
  saveIndex();
}

function cosineSimilarity(a, b) {
  if (a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (normA * normB);
}

function searchIndex(queryEmbedding, topK = 3) {
  if (embeddings.length === 0) {
    return [];
  }

  const similarities = embeddings.map((emb, idx) => ({
    id: ids[idx],
    similarity: cosineSimilarity(queryEmbedding, emb),
  }));

  similarities.sort((a, b) => b.similarity - a.similarity);
  return similarities.slice(0, topK);
}

function getIndexSize() {
  return ids.length;
}

// Initialize on load
loadIndex();

module.exports = { addToIndex, searchIndex, getIndexSize, loadIndex };
