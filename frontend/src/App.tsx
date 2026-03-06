import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { ConfigProvider } from '@/contexts/ConfigContext'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Clientes from '@/pages/Clientes'
import Veiculos from '@/pages/Veiculos'
import Contratos from '@/pages/Contratos'
import Empresas from '@/pages/Empresas'
import Financeiro from '@/pages/Financeiro'
import Seguros from '@/pages/Seguros'
import Ipva from '@/pages/Ipva'
import Multas from '@/pages/Multas'
import Manutencoes from '@/pages/Manutencoes'
import Reservas from '@/pages/Reservas'
import Relatorios from '@/pages/Relatorios'
import Configuracoes from '@/pages/Configuracoes'
import DespesasLoja from '@/pages/DespesasLoja'
import Usuarios from '@/pages/Usuarios'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
})

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface">
        <div className="text-center">
          <h1 className="text-2xl font-display font-bold text-slate-900">MPCARS</h1>
          <p className="text-slate-600 mt-2">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

const PermissionRoute: React.FC<{ children: React.ReactNode; page: string }> = ({ children, page }) => {
  const { isAuthenticated, isLoading, canAccess } = useAuth()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface">
        <div className="text-center">
          <h1 className="text-2xl font-display font-bold text-slate-900">MPCARS</h1>
          <p className="text-slate-600 mt-2">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (!canAccess(page)) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, isAdmin } = useAuth()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface">
        <div className="text-center">
          <h1 className="text-2xl font-display font-bold text-slate-900">MPCARS</h1>
          <p className="text-slate-600 mt-2">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

const AppRoutes: React.FC = () => {
  const { isAuthenticated } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/clientes" element={<PermissionRoute page="clientes"><Clientes /></PermissionRoute>} />
      <Route path="/veiculos" element={<PermissionRoute page="veiculos"><Veiculos /></PermissionRoute>} />
      <Route path="/contratos" element={<PermissionRoute page="contratos"><Contratos /></PermissionRoute>} />
      <Route path="/empresas" element={<PermissionRoute page="empresas"><Empresas /></PermissionRoute>} />
      <Route path="/financeiro" element={<PermissionRoute page="financeiro"><Financeiro /></PermissionRoute>} />
      <Route path="/seguros" element={<PermissionRoute page="seguros"><Seguros /></PermissionRoute>} />
      <Route path="/ipva" element={<PermissionRoute page="ipva"><Ipva /></PermissionRoute>} />
      <Route path="/multas" element={<PermissionRoute page="multas"><Multas /></PermissionRoute>} />
      <Route path="/manutencoes" element={<PermissionRoute page="manutencoes"><Manutencoes /></PermissionRoute>} />
      <Route path="/reservas" element={<PermissionRoute page="reservas"><Reservas /></PermissionRoute>} />
      <Route path="/relatorios" element={<PermissionRoute page="relatorios"><Relatorios /></PermissionRoute>} />
      <Route path="/despesas-loja" element={<PermissionRoute page="despesas-loja"><DespesasLoja /></PermissionRoute>} />
      <Route path="/configuracoes" element={<PermissionRoute page="configuracoes"><Configuracoes /></PermissionRoute>} />
      <Route path="/usuarios" element={<AdminRoute><Usuarios /></AdminRoute>} />
      <Route path="/" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
      <Route path="*" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
    </Routes>
  )
}

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <ConfigProvider>
            <AppRoutes />
          </ConfigProvider>
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  )
}

export default App
