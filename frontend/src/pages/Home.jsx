import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import axios from 'axios'
import LoadingOverlay from '../components/LoadingOverlay.jsx'

const STEPS = [
  'Reviewing your prompt...',
  'Checking related feedback...',
  'Preparing suggested details...',
]

const EXAMPLES = [
  'A quiet bookshop on a rainy evening',
  'A tiny astronaut tending a garden on Mars',
  'A ceramic teacup filled with wildflowers',
]

function Home() {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const navigate = useNavigate()

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt first')
      return
    }

    setLoading(true)
    setCurrentStep(0)

    try {
      const judgeRes = await axios.post('/api/judge', { prompt: prompt.trim() })
      const judgeResult = judgeRes.data

      setCurrentStep(1)
      const searchRes = await axios.post('/api/search-failures', { prompt: prompt.trim() })
      const failures = searchRes.data.failures || []

      setCurrentStep(2)
      const enhanceRes = await axios.post('/api/enhance', {
        prompt: prompt.trim(),
        judgeResult,
        failures,
      })

      navigate('/enhance', {
        state: {
          originalPrompt: prompt.trim(),
          enhancedPrompt: enhanceRes.data.enhanced_prompt,
          optimization: enhanceRes.data.optimization,
          judgeResult,
          failures,
        },
      })
    } catch (err) {
      toast.error(err.response?.data?.error || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {loading && <LoadingOverlay steps={STEPS} currentStep={currentStep} />}
      <div className="home-layout home-page fade-in">
        <section className="home-intro">
          <div className="eyebrow">
            <span className="eyebrow-dot" />
            A MORE THOUGHTFUL WAY TO MAKE IMAGES
          </div>
          <h1 className="home-title">Start with an idea.</h1>
          <p className="home-description">
            Turn a simple thought into an image prompt you can understand, edit, and refine.
          </p>

          <div className="feature-list" aria-label="How PromptPixel helps">
            <div className="feature-item">
              <span className="feature-number">01</span>
              <span>
                <strong>Your idea stays yours</strong>
                <small>The original prompt remains visible while you review suggestions.</small>
              </span>
            </div>
            <div className="feature-item">
              <span className="feature-number">02</span>
              <span>
                <strong>Every suggestion has a reason</strong>
                <small>See which visual details were added and why they may help.</small>
              </span>
            </div>
            <div className="feature-item">
              <span className="feature-number">03</span>
              <span>
                <strong>Keep refining the result</strong>
                <small>Edit your prompt and build on the image you just made.</small>
              </span>
            </div>
          </div>
        </section>

        <section className="composer-card" aria-labelledby="composer-title">
          <div className="composer-heading">
            <div>
              <span className="section-kicker">NEW IMAGE</span>
              <h2 id="composer-title">What would you like to see?</h2>
            </div>
            <span className="composer-icon" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.64 5.64l2.12 2.12m8.48 8.48 2.12 2.12m0-12.72-2.12 2.12m-8.48 8.48-2.12 2.12" />
                <circle cx="12" cy="12" r="4" />
              </svg>
            </span>
          </div>

          <label className="composer-label" htmlFor="prompt-input">Describe your image</label>
          <textarea
            id="prompt-input"
            className="prompt-textarea composer-textarea"
            rows="5"
            maxLength={1000}
            placeholder="A quiet bookshop on a rainy evening, warm light glowing through the windows..."
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                handleGenerate()
              }
            }}
          />
          <div className="composer-meta">
            <span><kbd>Enter</kbd> to continue <span aria-hidden="true">·</span> <kbd>Shift</kbd> + <kbd>Enter</kbd> for a new line</span>
            <span>{prompt.length} / 1000</span>
          </div>

          <div className="example-prompts">
            <span className="example-label">Need a starting point?</span>
            <div className="example-list">
              {EXAMPLES.map((example) => (
                <button
                  type="button"
                  className="example-chip"
                  key={example}
                  onClick={() => {
                    setPrompt(example)
                    document.getElementById('prompt-input')?.focus()
                  }}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          <button
            className="btn-glow composer-submit"
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            id="generate-btn"
          >
            <span>Review prompt</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
          <p className="composer-footnote">You can edit every suggestion before creating your image.</p>
        </section>
      </div>
    </>
  )
}

export default Home
