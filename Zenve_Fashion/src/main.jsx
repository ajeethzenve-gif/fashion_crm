import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { DataLoadingProvider } from './components/DataLoading.jsx'
import './index.css'
import { getAccessToken } from './services/authApi'
import { installExpiryFetch, SESSION_EXPIRED_EVENT } from './services/sessionExpiry'

installExpiryFetch(window, () => getAccessToken() || localStorage.getItem('access_token'), () => window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT)))

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <DataLoadingProvider><App /></DataLoadingProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
