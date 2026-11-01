const test = require('node:test');
const assert = require('node:assert/strict');
const { optimizePrompt } = require('../promptOptimizer');

test('preserves the original prompt and explains missing visual dimensions', () => {
  const prompt = 'A red bicycle beside a quiet lake';
  const result = optimizePrompt(prompt);

  assert.ok(result.enhancedPrompt.startsWith(`${prompt}. `));
  assert.equal(result.optimization.preservedIntent, prompt);
  assert.deepEqual(
    result.optimization.changes.map((change) => change.key),
    ['style', 'composition', 'lighting', 'mood', 'detail']
  );
  assert.equal(result.optimization.coverage.before, 0);
  assert.equal(result.optimization.coverage.after, 5);
});

test('does not add dimensions already specified by the user', () => {
  const prompt = 'A cinematic portrait, close-up, dramatic lighting, moody blue palette, crisp detail';
  const result = optimizePrompt(prompt);

  assert.equal(result.enhancedPrompt, prompt);
  assert.equal(result.optimization.changes.length, 0);
  assert.equal(result.optimization.coverage.before, 5);
});

test('uses specific related feedback but ignores generic negative ratings', () => {
  const result = optimizePrompt('A cat in a garden', [
    { failure_reason: 'User rated as bad' },
    { failure_reason: 'The subject was too dark and hard to see' },
  ]);

  assert.match(result.enhancedPrompt, /Avoid repeating these reported issues: The subject was too dark and hard to see/);
  assert.ok(result.optimization.changes.some((change) => change.key === 'feedback'));
});
