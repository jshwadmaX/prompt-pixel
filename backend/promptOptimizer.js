const VISUAL_DIMENSIONS = [
  {
    key: 'style',
    label: 'Style',
    pattern: /\b(?:visual style|photoreal(?:istic)?|cinematic|illustrat(?:ion|ed)|watercolor|watercolour|oil painting|digital art|anime|comic|sketch|3d render|claymation|pixel art|editorial)\b/i,
    addition: 'a coherent visual style that complements the subject',
    reason: 'A clear style helps the image model choose a consistent visual treatment.',
  },
  {
    key: 'composition',
    label: 'Composition',
    pattern: /\b(?:composition|close[- ]up|wide shot|medium shot|overhead|bird.s-eye|low angle|high angle|foreground|background|centered|framing|rule of thirds|depth of field)\b/i,
    addition: 'a clear focal subject with balanced framing and readable foreground and background',
    reason: 'Composition guidance makes the subject and its placement easier to understand.',
  },
  {
    key: 'lighting',
    label: 'Lighting',
    pattern: /\b(?:light(?:ing)?|shadow(?:s)?|golden hour|backlit|backlighting|daylight|moonlight|neon|sunlit|overcast|candlelit|soft[- ]box)\b/i,
    addition: 'soft, directional lighting suited to the scene',
    reason: 'Lighting guidance helps establish form, depth, and visual focus.',
  },
  {
    key: 'mood',
    label: 'Mood and color',
    pattern: /\b(?:mood|atmosphere|palette|color palette|colour palette|serene|peaceful|dramatic|joyful|melancholy|dreamy|eerie|vibrant|muted|warm tones|cool tones)\b/i,
    addition: 'a cohesive color palette and atmosphere that reinforce the intended mood',
    reason: 'A consistent palette and atmosphere help the image feel intentional.',
  },
  {
    key: 'detail',
    label: 'Detail',
    pattern: /\b(?:detailed|fine detail|texture|textures|intricate|crisp|sharp focus|high[- ]resolution|highly rendered|texture detail)\b/i,
    addition: 'crisp, intentional details with clearly separated forms',
    reason: 'Specific detail guidance improves clarity without relying on vague quality tags.',
  },
];

const GENERIC_FAILURE_REASONS = new Set([
  'user rated as bad',
  'not good',
]);

function optimizePrompt(prompt, failures = []) {
  const original = prompt.trim();
  const detected = VISUAL_DIMENSIONS.map((dimension) => ({
    ...dimension,
    present: dimension.pattern.test(original),
  }));
  const changes = detected
    .filter((dimension) => !dimension.present)
    .map(({ key, label, addition, reason }) => ({
      key,
      label,
      addition,
      reason,
    }));

  const failureReasons = failures
    .filter((failure) => failure && typeof failure.failure_reason === 'string')
    .map((failure) => failure.failure_reason.trim())
    .filter((reason) => reason && !GENERIC_FAILURE_REASONS.has(reason.toLowerCase()))
    .map((reason) => reason.slice(0, 180))
    .filter((reason, index, all) => all.indexOf(reason) === index)
    .slice(0, 3);

  if (failureReasons.length > 0) {
    changes.push({
      key: 'feedback',
      label: 'Related user feedback',
      addition: `Avoid repeating these reported issues: ${failureReasons.join('; ')}.`,
      reason: 'Specific feedback from similar attempts is included as a correction.',
    });
  }

  const additions = changes
    .filter((change) => change.key !== 'feedback')
    .map((change) => change.addition);
  const feedbackAddition = changes.find((change) => change.key === 'feedback')?.addition;
  const suffix = [...additions, feedbackAddition].filter(Boolean).join('. ');
  const enhancedPrompt = suffix
    ? `${original}${/[.!?]$/.test(original) ? ' ' : '. '}${suffix}.`
    : original;
  const coverageBefore = detected.filter((dimension) => dimension.present).length;
  const coverageAfter = VISUAL_DIMENSIONS.filter((dimension) =>
    dimension.pattern.test(enhancedPrompt)
  ).length;

  return {
    enhancedPrompt,
    optimization: {
      method: 'Intent-locked visual-slot optimization',
      preservedIntent: original,
      changes,
      coverage: {
        dimensions: VISUAL_DIMENSIONS.length,
        before: coverageBefore,
        after: coverageAfter,
      },
    },
  };
}

module.exports = { optimizePrompt };
