import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// latin-only subsets: the full imports ship every unicode-range file (~50
// font files per build), which burned through Pinata's per-file quota fast.
// Non-latin glyphs fall back to system fonts.
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-600.css'
import '@fontsource/poppins/latin-600.css'
import '@fontsource/poppins/latin-700.css'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
