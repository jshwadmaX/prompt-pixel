import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import axios from 'axios'
import ScoreBadge from '../components/ScoreBadge.jsx'

function Memory() {
  const [failures, setFailures] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFailures()
  }, [])

  const fetchFailures = async () => {
    try {
      const res = await axios.get('/api/failures')
      setFailures(res.data)
    } catch (err) {
      toast.error('Failed to fetch failure memory')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const truncate = (str, len = 60) => {
    if (!str) return '—'
    return str.length > len ? str.substring(0, len) + '...' : str
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div className="fade-in">
      <div className="page-heading memory-heading">
        <span className="section-kicker">SAVED FEEDBACK</span>
        <h2>Feedback notes</h2>
        <p>
          <strong>{failures.length}</strong> saved note{failures.length !== 1 ? 's' : ''} can help guide similar prompts.
        </p>
      </div>

      {failures.length === 0 ? (
        <div className="glass-card memory-empty">
          <div className="memory-empty-icon" aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3a7 7 0 0 0-4 12.74V19h8v-3.26A7 7 0 0 0 12 3Z" />
              <path d="M9 22h6M9 16h6" />
            </svg>
          </div>
          <h3>No feedback saved yet</h3>
          <p className="text-slate-400 text-sm">
            When an image misses the mark, note what you would change. That feedback may help with similar prompts later.
          </p>
        </div>
      ) : (
        <div className="glass-card memory-table-card">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Original Prompt</th>
                  <th>Enhanced Prompt</th>
                  <th>Type</th>
                  <th>Score</th>
                  <th>What went wrong</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {failures.map((f) => (
                  <tr key={f.id}>
                    <td className="min-w-[180px]">
                      <span className="text-slate-300" title={f.original_prompt}>
                        {truncate(f.original_prompt)}
                      </span>
                    </td>
                    <td className="min-w-[180px]">
                      <span className="text-slate-400 text-sm" title={f.enhanced_prompt}>
                        {truncate(f.enhanced_prompt)}
                      </span>
                    </td>
                    <td>
                      <span className="badge border text-xs bg-[rgba(59,130,246,0.1)] text-blue-300 border-blue-500/30">
                        {f.prompt_type || '—'}
                      </span>
                    </td>
                    <td>
                      <ScoreBadge score={f.judge_score || 0} />
                    </td>
                    <td className="min-w-[150px]">
                      <span className="text-slate-400 text-sm">
                        {truncate(f.failure_reason || f.judge_feedback, 50)}
                      </span>
                    </td>
                    <td className="text-xs text-slate-500 whitespace-nowrap">
                      {f.created_at ? formatDate(f.created_at) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default Memory
