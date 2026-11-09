import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { mountKeyDot } from './lib/eduai'

// Green dot (top right): AI is connected through teachingtools.dev. Never shows a key.
mountKeyDot()

createRoot(document.getElementById("root")!).render(<App />);
