import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import axios from 'axios'
import ScoreBadge from '../components/ScoreBadge.jsx'

function Result() {
  const location = useLocation()
  const navigate = useNavigate()
  const {
    image,
    mimeType = 'image/jpeg',
    originalPrompt,
    enhancedPrompt,
    judgeResult,
    optimization,
    failures = [],
  } = location.state || {}
  const [failureReason, setFailureReason] = useState('')
  const [savingFeedback, setSavingFeedback] = useState(false)

  if (!image) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] fade-in">
        <div className="glass-card p-10 text-center max-w-md">
          <p className="text-slate-400 mb-6">No image data found. Start from the home page.</p>
          <button className="btn-glow" onClick={() => navigate('/')}>Go Home</button>
        </div>
      </div>
    )
  }

  const handleSave = () => {
    const link = document.createElement('a')
    const extension = mimeType.split('/')[1]?.split('+')[0] || 'jpg'
    link.href = `data:${mimeType};base64,${image}`
    link.download = `promptpixel_${Date.now()}.${extension}`
    link.click()
    toast.success('Image downloaded successfully!')
  }

  const handleTryAgain = async () => {
    if (!failureReason.trim()) {
      toast.error('Describe what did not work so PromptPixel can learn from it.')
      return
    }

    setSavingFeedback(true)
    try {
      await axios.post('/api/log-failure', {
        original_prompt: originalPrompt,
        enhanced_prompt: enhancedPrompt,
        prompt_type: judgeResult?.prompt_type || 'scene',
        failure_reason: failureReason.trim(),
        judge_score: judgeResult?.score || 0,
        judge_feedback: judgeResult?.feedback || '',
      })
      toast.success('PromptPixel has learned from this failure', {
        icon: '🧠',
        duration: 3000,
      })
      setTimeout(() => navigate('/'), 800)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save feedback. Please try again.')
    } finally {
      setSavingFeedback(false)
    }
  }

  const handleRefine = () => {
    navigate('/enhance', {
      state: {
        originalPrompt,
        enhancedPrompt,
        judgeResult,
        optimization,
        failures,
      },
    })
  }

  return (
    <div className="max-w-3xl mx-auto fade-in">
      <div className="page-heading result-heading">
        <span className="section-kicker">STEP 3 OF 3</span>
        <h2>Your image</h2>
        <p>Download it, refine the prompt, or leave a note about what you would change.</p>
      </div>

      {/* Image display */}
      <div className="result-image-card slide-up">
        <div className="result-image-frame">
          <img
            src={`data:${mimeType};base64,${image}`}
            alt="Generated image"
            className="result-image"
          />
        </div>
        <div className="result-image-caption">
          <span><span className="status-dot" /> Generated image</span>
          <span>Created with PromptPixel</span>
        </div>
      </div>

      {/* Prompt and score info */}
      <div className="glass-card result-prompt-card slide-up" style={{ animationDelay: '0.1s' }}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <span className="section-kicker">PROMPT USED</span>
          {judgeResult && <ScoreBadge score={judgeResult.score} />}
        </div>
        <p className="result-prompt-copy">
          {enhancedPrompt}
        </p>
        {judgeResult?.feedback && (
          <p className="text-xs text-slate-500">
            <span className="text-slate-400 font-medium">Prompt review:</span> {judgeResult.feedback}
          </p>
        )}
      </div>

      <div className="glass-card feedback-card mb-8">
        <label htmlFor="failure-reason" className="block text-sm font-medium text-slate-300 mb-2">
          What would you change? <span className="text-slate-500">(optional)</span>
        </label>
        <textarea
          id="failure-reason"
          className="prompt-textarea feedback-textarea"
          rows="2"
          maxLength={300}
          placeholder="For example: the subject was too small, the image felt too dark, or the style was wrong."
          value={failureReason}
          onChange={(event) => setFailureReason(event.target.value)}
        />
      </div>

      {/* Action buttons */}
      <div className="result-actions slide-up" style={{ animationDelay: '0.2s' }}>
        <button className="btn-glow result-action" onClick={handleSave} id="save-btn">
          <span className="flex items-center justify-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download image
          </span>
        </button>
        <button className="btn-secondary result-action" onClick={handleRefine} id="refine-prompt-btn">
          Refine this prompt
        </button>
        <button
          className="btn-danger result-action"
          onClick={handleTryAgain}
          disabled={savingFeedback}
          id="retry-btn"
        >
          <span className="flex items-center justify-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
            </svg>
            {savingFeedback ? 'Saving note...' : 'Save feedback'}
          </span>
        </button>
      </div>
    </div>
  )
}

export default Result
