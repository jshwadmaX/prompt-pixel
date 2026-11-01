function LoadingOverlay({ steps, currentStep }) {
  return (
    <div className="loading-overlay fixed inset-0 backdrop-blur-md flex items-center justify-center z-50 fade-in">
      <div className="glass-card p-10 max-w-md w-full mx-4 text-center">
        <div className="spinner mx-auto mb-6"></div>
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div
              key={index}
              className={`flex items-center gap-3 text-sm transition-all duration-300 ${
                index < currentStep
                  ? 'text-green-400'
                  : index === currentStep
                  ? 'text-blue-400 font-medium'
                  : 'text-slate-500'
              }`}
            >
              <span className="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 text-xs" style={{
                borderColor: index < currentStep ? '#287A54' : index === currentStep ? '#426D9F' : '#D5E0EB',
                background: index < currentStep ? 'rgba(34,197,94,0.15)' : 'transparent'
              }}>
                {index < currentStep ? '✓' : index + 1}
              </span>
              <span>{step}</span>
              {index === currentStep && <span className="loading-dots"></span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default LoadingOverlay
