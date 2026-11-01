import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import axios from 'axios'
import ScoreBadge from '../components/ScoreBadge.jsx'

function Enhancement() {
  const location = useLocation()
  const navigate = useNavigate()
  const {
    originalPrompt,
    enhancedPrompt: initialEnhanced,
    judgeResult,
    optimization,
    failures = [],
  } = location.state || {}

  const [enhancedPrompt, setEnhancedPrompt] = useState(initialEnhanced || '')
  const [loading, setLoading] = useState(false)

  // Redirect if no data
  if (!originalPrompt) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] fade-in">
        <div className="glass-card p-10 text-center max-w-md">
          <p className="text-slate-400 mb-6">No prompt data found. Start from the home page.</p>
          <button className="btn-glow" onClick={() => navigate('/')}>Go Home</button>
        </div>
      </div>
    )
  }

  const handleGenerate = async () => {
    if (!enhancedPrompt.trim()) {
      toast.error('Enhanced prompt cannot be empty')
      return
    }

    setLoading(true)
    try {
      const res = await axios.post('/api/generate', { prompt: enhancedPrompt.trim() })
      navigate('/result', {
        state: {
          image: res.data.image,
          originalPrompt,
          enhancedPrompt: enhancedPrompt.trim(),
          mimeType: res.data.mime_type,
          judgeResult,
          optimization,
          failures,
        },
      })
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to generate image. Please try again.'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const getTypeColor = (type) => {
    const colors = {
      scene: 'from-emerald-500/20 to-emerald-600/20 text-emerald-300 border-emerald-500/30',
      portrait: 'from-violet-500/20 to-violet-600/20 text-violet-300 border-violet-500/30',
      style: 'from-amber-500/20 to-amber-600/20 text-amber-300 border-amber-500/30',
      abstract: 'from-rose-500/20 to-rose-600/20 text-rose-300 border-rose-500/30',
    }
    return colors[type] || colors.scene
  }

  return (
    <div className="enhancement-page fade-in">
    <div className="page-heading enhancement-heading">
        <span className="section-kicker">STEP 2 OF 3</span>
        <h2>Make the prompt your own</h2>
        <p>Compare the original with the suggestions. Edit the prompt before generating.</p>
      </div>
      <div className="workflow-steps enhancement-workflow" aria-label="Creation steps">
        <span className="workflow-step complete"><span>1</span> Describe</span>
        <span className="workflow-line active" />
        <span className="workflow-step current"><span>2</span> Refine</span>
        <span className="workflow-line" />
        <span className="workflow-step"><span>3</span> Create</span>
      </div>

      {/* Cards grid */}
      <div className="enhancement-prompt-grid">
        {/* Original prompt */}
        <div className="prompt-panel original-panel enhancement-prompt-card slide-up">
          <div className="prompt-panel-heading">
            <span className="prompt-panel-mark original-mark">1</span>
            <h3>Original prompt</h3>
          </div>
          <p className="prompt-panel-copy">{originalPrompt}</p>
          <span className="panel-caption">Your idea, kept intact</span>
        </div>

        {/* Enhanced prompt */}
        <div className="prompt-panel enhanced-panel enhancement-prompt-card slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="prompt-panel-heading">
            <span className="prompt-panel-mark enhanced-mark">2</span>
            <h3>Enhanced prompt</h3>
            <span className="editable-label">EDITABLE</span>
          </div>
          <textarea
            className="prompt-textarea text-[15px]"
            rows="5"
            value={enhancedPrompt}
            onChange={(e) => setEnhancedPrompt(e.target.value)}
            aria-label="Edit enhanced image prompt"
          />
          <span className="panel-caption">Change anything before generating</span>
        </div>
      </div>

      {optimization && (
        <section className="glass-card enhancement-details-card slide-up" aria-labelledby="optimization-title">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 id="optimization-title" className="text-sm font-semibold uppercase tracking-wider text-blue-300">
                Why these changes?
              </h3>
              <p className="text-xs text-slate-500 mt-1">{optimization.method}</p>
            </div>
            <span className="badge border bg-[rgba(59,130,246,0.1)] text-blue-300 border-blue-500/30">
              Visual detail coverage: {optimization.coverage.before}/{optimization.coverage.dimensions}
              {' → '}
              {optimization.coverage.after}/{optimization.coverage.dimensions}
            </span>
          </div>
          <p className="text-sm text-slate-400 mb-4">
            Your original prompt is kept intact at the start. Only the additions below were suggested; edit or remove anything before generating.
          </p>
          {optimization.changes.length > 0 ? (
            <ul className="enhancement-changes-grid">
              {optimization.changes.map((change) => (
                <li key={change.key} className="optimization-item rounded-xl border p-4">
                  <p className="text-sm font-medium text-slate-200">{change.label}</p>
                  <p className="text-sm text-blue-200 mt-1">{change.addition}</p>
                  <p className="text-xs text-slate-500 mt-2">{change.reason}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-emerald-300">
              Your prompt already covers all five visual dimensions, so no additions were needed.
            </p>
          )}
          {failures.filter((failure) => failure.failure_reason && failure.failure_reason !== 'User rated as bad').length > 0 && (
            <div className="mt-5 border-t border-[rgba(30,58,95,0.5)] pt-4">
              <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Related feedback used</p>
              <ul className="space-y-2">
                {failures
                  .filter((failure) => failure.failure_reason && failure.failure_reason !== 'User rated as bad')
                  .map((failure) => (
                    <li key={failure.id} className="text-sm text-slate-400">
                      “{failure.failure_reason}”
                      {typeof failure.similarity === 'number' && (
                        <span className="text-slate-600"> · local prompt similarity {Math.round(failure.similarity * 100)}%</span>
                      )}
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* Judge verdict */}
      {judgeResult && (
        <div className="glass-card enhancement-review-card slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center gap-2 mb-5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Prompt review</h3>
          </div>

          <div className="flex flex-wrap items-center gap-4 mb-4">
            <span className={`badge border bg-gradient-to-r ${getTypeColor(judgeResult.prompt_type)}`}>
              {judgeResult.prompt_type}
            </span>
            <ScoreBadge score={judgeResult.score} />
          </div>

          <p className="judge-feedback text-slate-300 text-sm leading-relaxed p-4 rounded-xl border">
            <span className="text-slate-500 font-medium mr-2">Feedback:</span>
            {judgeResult.feedback}
          </p>
        </div>
      )}

      {/* Generate button */}
      <div className="generate-cta enhancement-generate-cta slide-up" style={{ animationDelay: '0.3s' }}>
        <button
          className="btn-glow generate-cta-button"
          onClick={handleGenerate}
          disabled={loading}
          id="generate-image-btn"
        >
          {loading ? (
            <span className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Generating your image...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
              Generate Image
            </span>
          )}
        </button>
      </div>
    </div>
  )
}

export default Enhancement
