import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Navbar from './components/Navbar.jsx'
import Home from './pages/Home.jsx'
import Enhancement from './pages/Enhancement.jsx'
import Result from './pages/Result.jsx'
import Memory from './pages/Memory.jsx'

function App() {
  return (
    <div className="bg-gradient-animated min-h-screen">
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#FFFFFF',
            color: '#25364A',
            border: '1px solid #D9E3EF',
            borderRadius: '8px',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#287A54', secondary: '#FFFFFF' } },
          error: { iconTheme: { primary: '#B54745', secondary: '#FFFFFF' } },
        }}
      />
      <Navbar />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/enhance" element={<Enhancement />} />
          <Route path="/result" element={<Result />} />
          <Route path="/memory" element={<Memory />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
