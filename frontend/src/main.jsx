import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { InterventionModalProvider } from './contexts/InterventionModalContext.jsx'
import InterventionSimulator from './components/InterventionSimulator.jsx'

createRoot(document.getElementById('root')).render(
  <InterventionModalProvider>
    <App />
    <InterventionSimulator />
  </InterventionModalProvider>
)
