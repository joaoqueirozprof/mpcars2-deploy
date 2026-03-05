import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X, LogOut } from 'lucide-react'
import {
  LayoutDashboard, Users, Car, FileText, Building2, DollarSign,
  ShieldAlert, FileCheck, AlertCircle, Wrench, Calendar, BarChart3, Settings
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'

const Sidebar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const location = useLocation()
  const { logout } = useAuth()

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
    { icon: Users, label: 'Clientes', href: '/clientes' },
    { icon: Car, label: 'Veículos', href: '/veiculos' },
    { icon: FileText, label: 'Contratos', href: '/contratos' },
    { icon: Building2, label: 'Empresas', href: '/empresas' },
    { icon: DollarSign, label: 'Financeiro', href: '/financeiro' },
    { icon: ShieldAlert, label: 'Seguros', href: '/seguros' },
    { icon: FileCheck, label: 'IPVA', href: '/ipva' },
    { icon: AlertCircle, label: 'Multas', href: '/multas' },
    { icon: Wrench, label: 'Manutenções', href: '/manutencoes' },
    { icon: Calendar, label: 'Reservas', href: '/reservas' },
    { icon: BarChart3, label: 'Relatórios', href: '/relatorios' },
    { icon: Settings, label: 'Configurações', href: '/configuracoes' },
  ]

  const isActive = (href: string) => location.pathname === href

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-40 md:hidden p-2 bg-primary text-white rounded-lg"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <div
        className={cn(
          'fixed inset-y-0 left-0 z-30 w-64 bg-sidebar text-white transition-transform duration-300 md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="h-full flex flex-col overflow-y-auto">
          <div className="px-6 py-8 border-b border-slate-700">
            <h1 className="text-2xl font-display font-bold text-white">MPCARS</h1>
            <p className="text-xs text-slate-400 mt-1">Sistema de Aluguel</p>
          </div>

          <nav className="flex-1 px-4 py-8 space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                    active
                      ? 'bg-primary text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  )}
                >
                  <Icon size={20} />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              )
            })}
          </nav>

          <div className="border-t border-slate-700 px-4 py-4">
            <button
              onClick={() => {
                logout()
                setIsOpen(false)
              }}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <LogOut size={20} />
              <span className="text-sm font-medium">Sair</span>
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}

export default Sidebar
