import React, { useState } from 'react'
import { Download, FileText, BarChart3 } from 'lucide-react'
import AppLayout from '@/components/layout/AppLayout'
import toast from 'react-hot-toast'

const Relatorios: React.FC = () => {
  const [dateRange, setDateRange] = useState({ start: '', end: '' })

  const reports = [
    { id: 1, name: 'Relatório de Contratos', description: 'Lista de todos os contratos com detalhes' },
    { id: 2, name: 'Relatório de Receitas', description: 'Resumo de receitas por período' },
    { id: 3, name: 'Relatório de Despesas', description: 'Detalhamento de despesas por categoria' },
    { id: 4, name: 'Relatório de Frota', description: 'Status da frota de veículos' },
    { id: 5, name: 'Relatório de Clientes', description: 'Análise de clientes e contratos' },
    { id: 6, name: 'Relatório de IPVA', description: 'Pendências e pagamentos de IPVA' },
  ]

  const handleGenerateReport = (reportName: string) => {
    if (!dateRange.start || !dateRange.end) {
      toast.error('Selecione o período do relatório')
      return
    }

    toast.success(`Gerando ${reportName}...`)
    setTimeout(() => {
      toast.success('Relatório gerado com sucesso! Download iniciado.')
    }, 1000)
  }

  const handleExportPDF = (reportName: string) => {
    toast.success(`Exportando ${reportName} como PDF...`)
  }

  const handleExportExcel = (reportName: string) => {
    toast.success(`Exportando ${reportName} como Excel...`)
  }

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Relatórios</h1>
          <p className="text-slate-600 mt-1">Geração e exportação de relatórios do sistema</p>
        </div>

        {/* Date Filter */}
        <div className="card">
          <h2 className="text-lg font-display font-bold text-slate-900 mb-4">Filtro de Período</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Data Início</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Data Fim</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="input-field"
              />
            </div>

            <div className="flex items-end">
              <button className="btn-primary w-full">Filtrar</button>
            </div>
          </div>
        </div>

        {/* Reports Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map((report) => (
            <div key={report.id} className="card hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="bg-primary/10 p-3 rounded-lg">
                  {report.id === 2 || report.id === 3 ? (
                    <BarChart3 className="text-primary" size={24} />
                  ) : (
                    <FileText className="text-primary" size={24} />
                  )}
                </div>
              </div>

              <h3 className="text-lg font-display font-bold text-slate-900 mb-2">{report.name}</h3>
              <p className="text-sm text-slate-600 mb-6">{report.description}</p>

              <div className="space-y-2">
                <button
                  onClick={() => handleGenerateReport(report.name)}
                  className="btn-primary w-full flex items-center justify-center gap-2 py-2"
                >
                  <Download size={16} />
                  Gerar
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleExportPDF(report.name)}
                    className="btn-secondary py-2 text-sm"
                  >
                    PDF
                  </button>
                  <button
                    onClick={() => handleExportExcel(report.name)}
                    className="btn-secondary py-2 text-sm"
                  >
                    Excel
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Reports */}
        <div className="card">
          <h2 className="text-lg font-display font-bold text-slate-900 mb-4">Relatórios Recentes</h2>
          <div className="space-y-3">
            {[
              { name: 'Relatório de Receitas - 2024', date: '5 de março, 2024' },
              { name: 'Relatório de Frota - 2024', date: '1 de março, 2024' },
              { name: 'Relatório de Clientes - 2024', date: '25 de fevereiro, 2024' },
            ].map((report, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                <div>
                  <p className="font-medium text-slate-900">{report.name}</p>
                  <p className="text-sm text-slate-500">{report.date}</p>
                </div>
                <button className="p-2 text-slate-600 hover:text-primary transition-colors">
                  <Download size={20} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

export default Relatorios
