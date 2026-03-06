import React from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import { SidebarProvider, useSidebar } from '@/contexts/SidebarContext'

interface AppLayoutProps {
  children: React.ReactNode
}

const LayoutContent: React.FC<AppLayoutProps> = ({ children }) => {
  const { isCollapsed } = useSidebar()

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />

      {/* Main content area - shifts based on sidebar */}
      <div
        className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${
          isCollapsed ? 'md:ml-20' : 'md:ml-64'
        }`}
      >
        <Header />
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <SidebarProvider>
      <LayoutContent>{children}</LayoutContent>
    </SidebarProvider>
  )
}

export default AppLayout
