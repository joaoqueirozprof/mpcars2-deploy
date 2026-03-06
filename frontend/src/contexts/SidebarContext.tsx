import React, { createContext, useContext, useState } from 'react'

interface SidebarContextType {
  isCollapsed: boolean
  isMobileOpen: boolean
  toggleCollapse: () => void
  toggleMobile: () => void
  closeMobile: () => void
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const toggleCollapse = () => setIsCollapsed(prev => !prev)
  const toggleMobile = () => setIsMobileOpen(prev => !prev)
  const closeMobile = () => setIsMobileOpen(false)

  return (
    <SidebarContext.Provider value={{ isCollapsed, isMobileOpen, toggleCollapse, toggleMobile, closeMobile }}>
      {children}
    </SidebarContext.Provider>
  )
}

export const useSidebar = () => {
  const context = useContext(SidebarContext)
  if (!context) throw new Error('useSidebar must be used within SidebarProvider')
  return context
}
