import React, { useState } from 'react'
import { Download, FileText, BarChart3, TrendingUp, Users, Zap, Calendar } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import AppLayout from '@/components/layout/AppLayout'
import toast from 'react-hot-toast'

const Relatorios: React.FC = () => {
  const { user } = useAuth()
  const [dateRange, setDateRange] = useState({ start: '', end: '' })

  const reports = [
    {
      id: 1,
      name: 'Relatório de Contratos',
      description: 'Lista completa de contratos com detalhes de clientes e valores',
      icon: FileText,
      color: 'blue',
    },
    {
      id: 2,
      name: 'Relatório de Receitas',
      description: 'Resumo de receitas por período, cliente e tipo de serviço',
      icon: TrendingUp,
      color: 'green',
    },
    {
      id: 3,
      name: 'Relatório de Despesas',
      description: 'Detalhamento de despesas por categoria e veículo',
      icon: BarChart3,
      color: 'orange',
    },
    {
      id: 4,
      name: 'Relatório de Frota',
      description: 'Status atual da frota, manutenção e disponibilidade',
      icon: Zap,
      color: 'purple',
    },
    {
      id: 5,
      name: 'Relatório de Clientes',
      description: 'Análise de clientes, histórico de contratos e pagamentos',
      icon: Users,
      color: 'cyan',
    },
    {
      id: 6,
      name: 'Relatório de IPVA',
      description: 'Pendências, pagamentos e histórico de IPVA por veículo',
      icon: Calendar,
      color: 'red',
    },
  ]

  const handleGenerateReport = (reportName: string) => {
    if (!dateRange.start || !dateRange.end) {
      toast.error('Selecione o período do relatório')
      return
    }

    toast.loading('Gerando relatório...')
    setTimeout(() => {
      toast.dismiss()
      toast.success('Relatório gerado com sucesso! Download iniciado.')
    }, 2000)
  }

  const handleExportPDF = (reportName: string) => {
    if (!dateRange.start || !dateRange.end) {
      toast.error('Selecione o período do relatório')
      return
    }
    toast.success(`Exportando ${reportName} como PDF...`)
  }

  const handleExportExcel = (reportName: string) => {
    if (!dateRange.start || !dateRange.end) {
      toast.error('Selecione o período do relatório')
      return
    }
    toast.success(`Exportando ${reportName} como Excel...`)
  }

  const getColorClasses = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'bg-blue-50 text-blue-600 border-blue-200',
      green: 'bg-green-50 text-green-600 border-green-200',
      orange: 'bg-orange-50 text-orange-600 border-orange-200',
      purple: 'bg-purple-50 text-purple-600 border-purple-200',
      cyan: 'bg-cyan-50 text-cyan-600 border-cyan-200',
      red: 'bg-red-50 text-red-600 border-red-200',
    }
    return colors[color] || colors.blue
  }

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="page-title">Relatórios</h1>
          <p className="page-subtitle">Geração e exportação de relatórios do sistema com filtros por período</p>
        </div>

        <div className="card">
          <h2 className="text-lg font-display font-bold text-slate-900 mb-6">Filtro de Período</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="input-label">Data Início</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="input-field"
              />
            </div>

            <div>
              <label className="input-label">Data Fim</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="input-field"
              />
            </div>

            <div className="flex items-end">
              <button
                className="btn-primary w-full"
                onClick={() => {
                  if (dateRange.start && dateRange.end) {
                    toast.success('Período atualizado')
                  } else {
                    toast.error('Selecione ambas as datas')
                  }
                }}
              >
                Aplicar Filtro
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map((report) => {
            const IconComponent = report.icon
            const colorClasses = getColorClasses(report.color)

            return (
              <div key={report.id} className="card card-hover transition-all duration-200">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-lg border ${colorClasses}`}>
                    <IconComponent size={24} />
                  </div>
                </div>

                <h3 className="text-lg font-display font-bold text-slate-900 mb-2">{report.name}</h3>
                <p className="text-sm text-slate-600 mb-6 line-clamp-2">{report.description}</p>

                <div className="space-y-2">
                  <button
                    onClick={() => handleGenerateReport(report.name)}
                    className="btn-primary w-full flex items-center justify-center gap-2 py-2 text-sm"
                    disabled={!dateRange.start || !dateRange.end}
                  >
                    <Download size={16} />
                    Gerar
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleExportPDF(report.name)}
                      className="btn-secondary py-2 text-xs"
                      disabled={!dateRange.start || !dateRange.end}
                    >
                      PDF
                    </button>
                    <button
                      onClick={() => handleExportExcel(report.name)}
                      className="btn-secondary py-2 text-xs"
                      disabled={!dateRange.start || !dateRange.end}
                    >
                      Excel
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="card">
          <h2 className="text-lg font-display font-bold text-slate-900 mb-6">Relatórios Recentes</h2>
          <div className="space-y-3">
            {[
              { name: 'Relatório de Receitas - 2024', date: '5 de março de 2024', status: 'Completo' },
              { name: 'Relatório de Frota - 2024', date: '1 de março de 2024', status: 'Completo' },
              { name: 'Relatório de Clientes - 2024', date: '25 de fevereiro de 2024', status: 'Completo' },
            ].map((report, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
              >
                <div className="flex-1">
                  <p className="font-medium text-slate-900">{report.name}</p>
                  <p className="text-sm text-slate-500">{report.date}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="badge-success text-xs">{report.status}</span>
                  <button
                    className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="Download"
                  >
                    <Download size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

export default Relatorios
