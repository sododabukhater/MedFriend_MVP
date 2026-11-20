import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { I18nProvider, initialLang } from './i18n'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider initial={initialLang()}>
      <App />
    </I18nProvider>
  </StrictMode>,
)
