import { Navigate, Outlet, Route, Routes, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { ipc } from './utils/ipc.js'
import ProtectedRoute from './components/auth/ProtectedRoute.jsx'
import Sidebar from './components/layout/Sidebar.jsx'
import TopBar from './components/layout/TopBar.jsx'
import DeveloperResetGateway from './components/layout/DeveloperResetGateway.jsx'
import DeveloperDataManagerGateway from './components/layout/DeveloperDataManagerGateway.jsx'
import ScrollToTop from './components/shared/ScrollToTop.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Login from './pages/Login.jsx'
import BookDetail from './pages/BookDetail.jsx'
import Search from './pages/Search.jsx'
import PdfExport from './pages/PdfExport.jsx'
import Settings from './pages/Settings.jsx'
import Help from './pages/Help.jsx'
import useSettingsStore from './store/useSettingsStore.js'
import useThemeStore from './store/useThemeStore.js'

function AppLayout() {
  const fetchStoragePath = useSettingsStore((state) => state.fetchStoragePath)
  const navigate = useNavigate()

  useEffect(() => {
    let isMounted = true

    const verifyAndFetch = async () => {
      const verifyResult = await ipc.settingsVerifyStoragePath()
      await fetchStoragePath()

      if (isMounted && verifyResult.success && !verifyResult.valid) {
        navigate('/settings', { state: { storageError: true } })
      }
    }

    verifyAndFetch()

    return () => {
      isMounted = false
    }
  }, [fetchStoragePath, navigate])

  return (
    <div className="flex min-w-0 text-[var(--text-primary)]">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <TopBar />
        <DeveloperResetGateway />
        <DeveloperDataManagerGateway />
        <main className="px-8 pb-12 pt-6">
          <Outlet />
        </main>
      </div>
      <ScrollToTop />
    </div>
  )
}

export default function App() {
  const initializeTheme = useThemeStore((state) => state.initializeTheme)

  useEffect(() => {
    initializeTheme()
  }, [initializeTheme])

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="books/:id" element={<BookDetail />} />
          <Route path="search" element={<Search />} />
          <Route path="pdf-export" element={<PdfExport />} />
          <Route path="settings" element={<Settings />} />
          <Route path="help" element={<Help />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </Routes>
  )
}
