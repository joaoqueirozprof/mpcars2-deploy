import React, { useState, useEffect } from 'react'
import { Download, FileText, DollarSign, Receipt, Users, Car, FileSpreadsheet, BarChart3, Printer } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import AppLayout from '@/components/layout/AppLayout'
import toast from 'react-hot-toast'
import api from '@/services/api'

const Relatorios: React.FC = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState<string | null>(null)

  // PDF states
  const [contratoId, setContratoId] = useState('')
  const [financeiroDates, setFinanceiroDates] = useState({ start: '', end: '' })
  const [nfUsoId, setNfUsoId] = useState('')
  const [contratos, setContratos] = useState<any[]>([])
  const [usos, setUsos] = useState<any[]>([])

  // Export states
  const [exportDates, setExportDates] = useState({ start: '', end: '' })
  const [exportStatus, setExportStatus] = useState('')

  useEffect(() => {
    loadContratos()
    loadUsos()
  }, [])

  const loadContratos = async () => {
    try {
      const res = await api.get('/contratos/?limit=100')
      setContratos(res.data?.data || res.data || [])
    } catch { }
  }

  const loadUsos = async () => {
    try {
      const res = await api.get('/empresas/usos')
      setUsos(res.data || [])
    } catch { }
  }

  const downloadFile = async (url: string, filename: string) => {
    const response = await api.get(url, { responseType: 'blob' })
    const blob = new Blob([response.data], { type: response.headers['content-type'] })
    const downloadUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(downloadUrl)
  }

  const handlePdfContrato = async () => {
    if (!contratoId) { toast.error('Informe o ID do contrato'); return }
    setLoading('contrato-pdf')
    const tid = toast.loading('Gerando PDF do contrato...')
    try {
      await downloadFile(`/relatorios/contrato/${contratoId}/pdf`, `contrato_${contratoId}.pdf`)
      toast.dismiss(tid)
      toast.success('PDF do contrato gerado com sucesso!')
    } catch (e: any) {
      toast.dismiss(tid)
      const msg = e?.response?.status === 404 ? 'Contrato nao encontrado' : e?.response?.status === 422 ? 'Contrato com dados incompletos' : 'Erro ao gerar PDF do contrato'
      toast.error(msg)
    } finally { setLoading(null) }
  }

  const handlePdfFinanceiro = async () => {
    if (!financeiroDates.start || !financeiroDates.end) { toast.error('Selecione o periodo'); return }
    setLoading('financeiro-pdf')
    const tid = toast.loading('Gerando relatorio financeiro...')
    try {
      await downloadFile(`/relatorios/financeiro/pdf?data_inicio=${financeiroDates.start}&data_fim=${financeiroDates.end}`, `relatorio_financeiro_${financeiroDates.start}_${financeiroDates.end}.pdf`)
      toast.dismiss(tid)
      toast.success('Relatorio financeiro gerado com sucesso!')
    } catch (e: any) {
      toast.dismiss(tid)
      toast.error(e?.response?.data?.detail || 'Erro ao gerar relatorio financeiro')
    } finally { setLoading(null) }
  }

  const handlePdfNF = async () => {
    if (!nfUsoId) { toast.error('Selecione o uso do veiculo'); return }
    setLoading('nf-pdf')
    const tid = toast.loading('Gerando Nota Fiscal...')
    try {
      await downloadFile(`/relatorios/nf/${nfUsoId}/pdf`, `nf_${nfUsoId}.pdf`)
      toast.dismiss(tid)
      toast.success('Nota Fiscal gerada com sucesso!')
    } catch (e: any) {
      toast.dismiss(tid)
      const msg = e?.response?.status === 404 ? 'Uso de veiculo nao encontrado' : 'Erro ao gerar Nota Fiscal'
      toast.error(msg)
    } finally { setLoading(null) }
  }

  const handleExport = async (entity: string, formato: string) => {
    const key = `${entity}-${formato}`
    setLoading(key)
    const tid = toast.loading(`Exportando ${entity}...`)
    try {
      let url = `/relatorios/exportar/${entity}?formato=${formato}`
      if (exportDates.start && exportDates.end) {
        url += `&data_inicio=${exportDates.start}&data_fim=${exportDates.end}`
      }
      if (exportStatus && (entity === 'veiculos' || entity === 'contratos')) {
        url += `&status=${exportStatus}`
      }
      const ext = formato
      await downloadFile(url, `${entity}_${exportDates.start || 'geral'}.${ext}`)
      toast.dismiss(tid)
      toast.success(`${entity} exportado com sucesso!`)
    } catch (e: any) {
      toast.dismiss(tid)
      toast.error(e?.response?.data?.detail || `Erro ao exportar ${entity}`)
    } finally { setLoading(null) }
  }

  const LoadingSpinner = () => (
    <span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></span>
  )

  return (
    <AppLayout>
      <div className="space-y-8 stagger-children">
        <div>
          <h1 className="page-title">Relatorios</h1>
          <p className="page-subtitle">Geracao de PDFs e exportacao de dados do sistema</p>
        </div>

        {/* ====================== SEÇÃO 1: PDFs ====================== */}
        <div>
          <h2 className="text-xl font-display font-bold text-slate-900 mb-4 flex items-center gap-2">
            <FileText size={22} className="text-blue-600" />
            Geracao de PDFs
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Card: PDF Contrato */}
            <div className="card card-hover">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-xl bg-blue-100 text-blue-700">
                  <FileText size={24} />
                </div>
                <span className="badge badge-info text-xs">PDF</span>
              </div>
              <h3 className="text-lg font-display font-bold text-slate-900 mb-2">Contrato de Locacao</h3>
              <p className="text-sm text-slate-600 mb-4">Gera o contrato completo com clausulas, vistoria e valores</p>

              <div className="space-y-3">
                <div>
                  <label className="input-label">ID do Contrato</label>
                  <select
                    value={contratoId}
                    onChange={(e) => setContratoId(e.target.value)}
                    className="input-field"
                  >
                    <option value="">Selecione um contrato...</option>
                    {contratos.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        #{c.id} - {c.numero} ({c.status})
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handlePdfContrato}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                  disabled={loading === 'contrato-pdf' || !contratoId}
                >
                  {loading === 'contrato-pdf' ? <LoadingSpinner /> : <Download size={16} />}
                  Gerar PDF
                </button>
              </div>
            </div>

            {/* Card: PDF Financeiro */}
            <div className="card card-hover">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-xl bg-green-100 text-green-700">
                  <DollarSign size={24} />
                </div>
                <span className="badge badge-info text-xs">PDF</span>
              </div>
              <h3 className="text-lg font-display font-bold text-slate-900 mb-2">Relatorio Financeiro</h3>
              <p className="text-sm text-slate-600 mb-4">Receitas, despesas, lucro e comparativo por categoria</p>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="input-label">Data Inicio</label>
                    <input type="date" value={financeiroDates.start} onChange={(e) => setFinanceiroDates({ ...financeiroDates, start: e.target.value })} className="input-field" />
                  </div>
                  <div>
                    <label className="input-label">Data Fim</label>
                    <input type="date" value={financeiroDates.end} onChange={(e) => setFinanceiroDates({ ...financeiroDates, end: e.target.value })} className="input-field" />
                  </div>
                </div>
                <button
                  onClick={handlePdfFinanceiro}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                  disabled={loading === 'financeiro-pdf' || !financeiroDates.start || !financeiroDates.end}
                >
                  {loading === 'financeiro-pdf' ? <LoadingSpinner /> : <Download size={16} />}
                  Gerar PDF
                </button>
              </div>
            </div>

            {/* Card: PDF NF */}
            <div className="card card-hover">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-xl bg-orange-100 text-orange-700">
                  <Receipt size={24} />
                </div>
                <span className="badge badge-info text-xs">PDF</span>
              </div>
              <h3 className="text-lg font-display font-bold text-slate-900 mb-2">Nota Fiscal de Uso</h3>
              <p className="text-sm text-slate-600 mb-4">NF para uso de veiculo por empresa com KM e despesas</p>

              <div className="space-y-3">
                <div>
                  <label className="input-label">ID do Uso (Veiculo/Empresa)</label>
                  <input
                    type="number"
                    value={nfUsoId}
                    onChange={(e) => setNfUsoId(e.target.value)}
                    className="input-field"
                    placeholder="ID do uso_veiculo_empresa"
                    min="1"
                  />
                </div>
                <button
                  onClick={handlePdfNF}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                  disabled={loading === 'nf-pdf' || !nfUsoId}
                >
                  {loading === 'nf-pdf' ? <LoadingSpinner /> : <Download size={16} />}
                  Gerar NF
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ====================== SEÇÃO 2: EXPORTAÇÕES ====================== */}
        <div>
          <h2 className="text-xl font-display font-bold text-slate-900 mb-4 flex items-center gap-2">
            <FileSpreadsheet size={22} className="text-green-600" />
            Exportacoes CSV / XLSX
          </h2>

          {/* Filtros gerais */}
          <div className="card mb-6">
            <h3 className="text-sm font-display font-bold text-slate-700 mb-3">Filtros de Exportacao</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="input-label">Data Inicio</label>
                <input type="date" value={exportDates.start} onChange={(e) => setExportDates({ ...exportDates, start: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="input-label">Data Fim</label>
                <input type="date" value={exportDates.end} onChange={(e) => setExportDates({ ...exportDates, end: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="input-label">Status (veiculos/contratos)</label>
                <select value={exportStatus} onChange={(e) => setExportStatus(e.target.value)} className="input-field">
                  <option value="">Todos</option>
                  <option value="ativo">Ativo</option>
                  <option value="finalizado">Finalizado</option>
                  <option value="disponivel">Disponivel</option>
                  <option value="alugado">Alugado</option>
                  <option value="manutencao">Manutencao</option>
                </select>
              </div>
              <div className="flex items-end">
                <button className="btn-secondary w-full" onClick={() => { setExportDates({ start: '', end: '' }); setExportStatus(''); toast.success('Filtros limpos') }}>
                  Limpar Filtros
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

            {/* Card: Exportar Clientes */}
            <div className="card card-hover">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-cyan-100 text-cyan-700">
                  <Users size={20} />
                </div>
              </div>
              <h3 className="text-base font-display font-bold text-slate-900 mb-1">Clientes</h3>
              <p className="text-xs text-slate-500 mb-4">Nome, CPF, CNH, score, contratos</p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => handleExport('clientes', 'xlsx')} className="btn-primary py-2 text-xs flex items-center justify-center gap-1" disabled={loading === 'clientes-xlsx'}>
                  {loading === 'clientes-xlsx' ? <LoadingSpinner /> : <FileSpreadsheet size={14} />} XLSX
                </button>
                <button onClick={() => handleExport('clientes', 'csv')} className="btn-secondary py-2 text-xs flex items-center justify-center gap-1" disabled={loading === 'clientes-csv'}>
                  {loading === 'clientes-csv' ? <LoadingSpinner /> : <Download size={14} />} CSV
                </button>
              </div>
            </div>

            {/* Card: Exportar Veiculos */}
            <div className="card card-hover">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-purple-100 text-purple-700">
                  <Car size={20} />
                </div>
              </div>
              <h3 className="text-base font-display font-bold text-slate-900 mb-1">Veiculos</h3>
              <p className="text-xs text-slate-500 mb-4">Placa, marca, KM, status, ROI</p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => handleExport('veiculos', 'xlsx')} className="btn-primary py-2 text-xs flex items-center justify-center gap-1" disabled={loading === 'veiculos-xlsx'}>
                  {loading === 'veiculos-xlsx' ? <LoadingSpinner /> : <FileSpreadsheet size={14} />} XLSX
                </button>
                <button onClick={() => handleExport('veiculos', 'csv')} className="btn-secondary py-2 text-xs flex items-center justify-center gap-1" disabled={loading === 'veiculos-csv'}>
                  {loading === 'veiculos-csv' ? <LoadingSpinner /> : <Download size={14} />} CSV
                </button>
              </div>
            </div>

            {/* Card: Exportar Contratos */}
            <div className="card card-hover">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700">
                  <FileText size={20} />
                </div>
              </div>
              <h3 className="text-base font-display font-bold text-slate-900 mb-1">Contratos</h3>
              <p className="text-xs text-slate-500 mb-4">Cliente, veiculo, datas, KM, valores</p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => handleExport('contratos', 'xlsx')} className="btn-primary py-2 text-xs flex items-center justify-center gap-1" disabled={loading === 'contratos-xlsx'}>
                  {loading === 'contratos-xlsx' ? <LoadingSpinner /> : <FileSpreadsheet size={14} />} XLSX
                </button>
                <button onClick={() => handleExport('contratos', 'csv')} className="btn-secondary py-2 text-xs flex items-center justify-center gap-1" disabled={loading === 'contratos-csv'}>
                  {loading === 'contratos-csv' ? <LoadingSpinner /> : <Download size={14} />} CSV
                </button>
              </div>
            </div>

            {/* Card: Exportar Financeiro */}
            <div className="card card-hover">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-green-100 text-green-700">
                  <BarChart3 size={20} />
                </div>
              </div>
              <h3 className="text-base font-display font-bold text-slate-900 mb-1">Financeiro</h3>
              <p className="text-xs text-slate-500 mb-4">Multi-aba: receitas, despesas, seguros</p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => handleExport('financeiro', 'xlsx')} className="btn-primary py-2 text-xs flex items-center justify-center gap-1" disabled={loading === 'financeiro-xlsx'}>
                  {loading === 'financeiro-xlsx' ? <LoadingSpinner /> : <FileSpreadsheet size={14} />} XLSX
                </button>
                <button onClick={() => handleExport('financeiro', 'csv')} className="btn-secondary py-2 text-xs flex items-center justify-center gap-1" disabled={loading === 'financeiro-csv'}>
                  {loading === 'financeiro-csv' ? <LoadingSpinner /> : <Download size={14} />} CSV
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

export default Relatorios
