import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { SettingsProvider } from './contexts/SettingsContext'
import { EvalConfigProvider } from './contexts/EvalConfigContext'
import Layout from './components/Layout'
import HomeView from './views/HomeView'
import ConfigureView from './views/ConfigureView'
import EvaluateView from './views/EvaluateView'
import SettingsView from './views/SettingsView'

function App() {
  return (
    <SettingsProvider>
      <EvalConfigProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<HomeView />} />
              <Route path="configure" element={<ConfigureView />} />
              <Route path="evaluate" element={<EvaluateView />} />
              <Route path="settings" element={<SettingsView />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </EvalConfigProvider>
    </SettingsProvider>
  )
}

export default App
