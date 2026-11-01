function ScoreBadge({ score }) {
  const getScoreClass = (s) => {
    if (s < 4) return 'score-red';
    if (s <= 7) return 'score-yellow';
    return 'score-green';
  };

  const getScoreLabel = (s) => {
    if (s < 4) return 'Poor';
    if (s <= 7) return 'Fair';
    return 'Good';
  };

  return (
    <div className={`badge border ${getScoreClass(score)} flex items-center gap-2`}>
      <span className="text-lg font-bold">{score}</span>
      <span className="text-xs opacity-75">/10</span>
      <span className="text-xs ml-1">({getScoreLabel(score)})</span>
    </div>
  )
}

export default ScoreBadge
