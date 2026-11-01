import { NavLink } from 'react-router-dom'

function Navbar() {
  return (
    <nav className="site-nav">
      <div className="site-nav-inner">
        <NavLink to="/" className="brand-link" aria-label="PromptPixel home">
          <span className="brand-mark" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="m20.5 15-5-5L5 20.5" />
            </svg>
          </span>
          <span className="brand-copy">
            <span className="brand-name">PromptPixel</span>
            <span className="brand-caption">IDEA TO IMAGE</span>
          </span>
        </NavLink>

        <div className="nav-actions">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            Create
          </NavLink>
          <NavLink
            to="/memory"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3a7 7 0 0 0-4 12.74V19h8v-3.26A7 7 0 0 0 12 3Z" />
              <path d="M9 22h6M9 16h6" />
            </svg>
            Feedback notes
          </NavLink>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
