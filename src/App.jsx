import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { useEffect } from 'react'
import ProtectedRoute from './components/auth/ProtectedRoute.jsx'
import Sidebar from './components/layout/Sidebar.jsx'
import TopBar from './components/layout/TopBar.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Login from './pages/Login.jsx'
import BookDetail from './pages/BookDetail.jsx'
import PageViewer from './pages/PageViewer.jsx'
import Search from './pages/Search.jsx'
import PdfExport from './pages/PdfExport.jsx'
import Settings from './pages/Settings.jsx'
import useSettingsStore from './store/useSettingsStore.js'
import useThemeStore from './store/useThemeStore.js'

function AppLayout() {
  const fetchStoragePath = useSettingsStore((state) => state.fetchStoragePath)

  useEffect(() => {
    fetchStoragePath()
  }, [fetchStoragePath])

  return (
    <div className="min-h-screen text-[var(--text-primary)]">
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1">
          <TopBar />
          <main className="px-8 pb-12 pt-6">
            <Outlet />
          </main>
        </div>
      </div>
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
          <Route path="books/:id/pages/:pageId" element={<PageViewer />} />
          <Route path="search" element={<Search />} />
          <Route path="pdf-export" element={<PdfExport />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </Routes>
  )
}
