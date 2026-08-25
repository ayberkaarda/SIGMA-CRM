import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// i18n, App'TEN ÖNCE import edilir: `i18n.init()` senkron çalışıp `tr` sözlüğünü yerine
// koyar, böylece ilk render'da hiçbir bileşen ham anahtar basmaz (§1.1 — `tr` eager).
import './i18n'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
