import React from 'react'
import { Bell, Search, User, ChevronDown } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getInitials } from '@/lib/utils'

const Header: React.FC = () => {
  const { user, logout } = useAuth()
  const [showUserMenu, setShowUserMenu] = React.useState(false)

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm">
      <div className="flex items-center justify-between h-16 px-6 md:ml-64">
        <div className="flex-1 max-w-md">
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-3 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar..."
              className="input-field pl-10 py-2"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button className="relative p-2 text-slate-600 hover:text-primary transition-colors">
            <Bell size={20} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full" />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold">
                {user ? getInitials(user.nome) : '?'}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-slate-900">{user?.nome || 'Usuário'}</p>
                <p className="text-xs text-slate-500">{user?.role || 'Admin'}</p>
              </div>
              <ChevronDown size={16} className="text-slate-400" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-2">
                <button className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 transition-colors">
                  Perfil
                </button>
                <button className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 transition-colors">
                  Configurações
                </button>
                <hr className="my-2" />
                <button
                  onClick={() => {
                    logout()
                    setShowUserMenu(false)
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-danger hover:bg-red-50 transition-colors"
                >
                  Sair
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
