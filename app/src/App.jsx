import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { SettingsProvider } from './contexts/SettingsContext'
import { LlmHubProvider } from './contexts/LlmHubContext'
import { EvalConfigProvider } from './contexts/EvalConfigContext'
import { EvalRunProvider } from './contexts/EvalRunContext'
import Layout from './components/Layout'
import LayoutV2 from './components/LayoutV2'
import HomeView from './views/HomeView'
import ConfigureView from './views/ConfigureView'
import EvaluateView from './views/EvaluateView'
import HistoryView from './views/HistoryView'
import SettingsView from './views/SettingsView'

function App() {
  return (
    <SettingsProvider>
      <LlmHubProvider>
        <EvalConfigProvider>
          <EvalRunProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Layout />}>
                  <Route index element={<HomeView />} />
                  <Route path="configure" element={<ConfigureView />} />
                  <Route path="evaluate" element={<EvaluateView />} />
                  <Route path="settings" element={<SettingsView />} />
                </Route>
                <Route path="/v2" element={<LayoutV2 />}>
                  <Route index element={<Navigate to="/v2/evaluate" replace />} />
                  <Route path="configure" element={<ConfigureView variant="v2" />} />
                  <Route path="evaluate" element={<EvaluateView variant="v2" />} />
                  <Route path="history" element={<HistoryView />} />
                  <Route path="settings" element={<SettingsView />} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </EvalRunProvider>
        </EvalConfigProvider>
      </LlmHubProvider>
    </SettingsProvider>
  )
}

export default App
