import React, { createContext, useContext, useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'

interface SystemConfig {
  tema: string
  idioma: string
  valor_diaria_padrao: number
  taxa_juros: number
  notificacoes_email: boolean
  notificacoes_sms: boolean
  empresa_nome: string
  empresa_cnpj: string
  empresa_telefone: string
  empresa_email: string
  empresa_endereco: string
}

const defaultConfig: SystemConfig = {
  tema: 'light',
  idioma: 'pt-BR',
  valor_diaria_padrao: 150,
  taxa_juros: 2,
  notificacoes_email: false,
  notificacoes_sms: false,
  empresa_nome: 'MPCARS',
  empresa_cnpj: '',
  empresa_telefone: '',
  empresa_email: '',
  empresa_endereco: '',
}

const ConfigContext = createContext<SystemConfig>(defaultConfig)

export const useConfig = () => useContext(ConfigContext)

export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth()
  const [config, setConfig] = useState<SystemConfig>(defaultConfig)

  const { data: configs } = useQuery({
    queryKey: ['configuracoes'],
    queryFn: async () => {
      const { data } = await api.get('/configuracoes/')
      return data
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 2,
  })

  useEffect(() => {
    if (configs && Array.isArray(configs)) {
      const map: Record<string, string> = {}
      configs.forEach((c: any) => { map[c.chave] = c.valor })

      const newConfig: SystemConfig = {
        tema: map['sistema_tema'] || 'light',
        idioma: map['sistema_idioma'] || 'pt-BR',
        valor_diaria_padrao: parseFloat(map['sistema_valor_diaria_padrao'] || map['valor_diaria_padrao'] || '150'),
        taxa_juros: parseFloat(map['sistema_taxa_juros'] || '2'),
        notificacoes_email: map['sistema_notificacoes_email'] === 'true',
        notificacoes_sms: map['sistema_notificacoes_sms'] === 'true',
        empresa_nome: map['empresa_nome'] || 'MPCARS',
        empresa_cnpj: map['empresa_cnpj'] || '',
        empresa_telefone: map['empresa_telefone'] || '',
        empresa_email: map['empresa_email'] || '',
        empresa_endereco: map['empresa_endereco'] || '',
      }
      setConfig(newConfig)
    }
  }, [configs])

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement
    if (config.tema === 'dark') {
      root.classList.add('dark')
    } else if (config.tema === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (prefersDark) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    } else {
      root.classList.remove('dark')
    }
  }, [config.tema])

  return (
    <ConfigContext.Provider value={config}>
      {children}
    </ConfigContext.Provider>
  )
}
