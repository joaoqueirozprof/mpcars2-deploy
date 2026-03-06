import React, { useState, useEffect } from 'react'
import { Download, FileText, DollarSign, Receipt, Users, Car, FileSpreadsheet, BarChart3, Building2, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import AppLayout from '@/components/layout/AppLayout'
import toast from 'react-hot-toast'
import api from '@/services/api'

interface VeiculoUso {
  id: number
  veiculo_id: number
  placa: string
  modelo: string
  marca: string
  km_inicial: number
  km_final: number | null
  km_percorrido: number | null
  km_referencia: number | null
  valor_km_extra: number | null
  valor_diaria_empresa: number | null
  data_inicio: string | null
  data_fim: string | null
  status: string
  selected: boolean
  km_input: string
  km_permitido_input: string
  valor_km_extra_input: string
}

const Relatorios: React.FC = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState<string | null>(null)

  // PDF states
  const [contratoId, setContratoId] = useState('')
  const [financeiroDates, setFinanceiroDates] = useState({ start: '', end: '' })
  const [contratos, setContratos] = useState<any[]>([])

  // NF states
  const [empresas, setEmpresas] = useState<any[]>([])
  const [selectedEmpresa, setSelectedEmpresa] = useState('')
  const [veiculosUso, setVeiculosUso] = useState<VeiculoUso[]>([])
  const [loadingUsos, setLoadingUsos] = useState(false)

  // Export states
  const [exportDates, setExportDates] = useState({ start: '', end: '' })
  const [exportStatus, setExportStatus] = useState('')

  useEffect(() => {
    loadContratos()
    loadEmpresas()
  }, [])

  useEffect(() => {
    if (selectedEmpresa) {
      loadVeiculosEmpresa(parseInt(selectedEmpresa))
    } else {
      setVeiculosUso([])
    }
  }, [selectedEmpresa])

  const loadContratos = async () => {
    try {
      const res = await api.get('/contratos/?limit=100')
      setContratos(res.data?.data || res.data || [])
    } catch { }
  }

  const loadEmpresas = async () => {
    try {
      const res = await api.get('/empresas/?limit=100')
      setEmpresas(res.data?.data || res.data || [])
    } catch { }
  }

  const loadVeiculosEmpresa = async (empresaId: number) => {
    setLoadingUsos(true)
    try {
      const res = await api.get(`/empresas/${empresaId}/usos`)
      const data = (res.data || []).map((u: any) => ({
        ...u,
        selected: false,
        km_input: '',
        km_permitido_input: u.km_referencia ? String(u.km_referencia) : '',
        valor_km_extra_input: u.valor_km_extra ? String(u.valor_km_extra) : '',
      }))
      setVeiculosUso(data)
    } catch {
      setVeiculosUso([])
    } finally {
      setLoadingUsos(false)
    }
  }

  const downloadFile = async (url: string, filename: string, method = 'GET', body?: any) => {
    let response
    if (method === 'POST') {
      response = await api.post(url, body, { responseType: 'blob' })
    } else {
      response = await api.get(url, { responseType: 'blob' })
    }
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
    if (!contratoId) { toast.error('Selecione um contrato'); return }
    setLoading('contrato-pdf')
    const tid = toast.loading('Gerando PDF do contrato...')
    try {
      await downloadFile(`/relatorios/contrato/${contratoId}/pdf`, `contrato_${contratoId}.pdf`)
      toast.dismiss(tid)
      toast.success('PDF do contrato gerado!')
    } catch (e: any) {
      toast.dismiss(tid)
      toast.error(e?.response?.status === 404 ? 'Contrato nao encontrado' : 'Erro ao gerar PDF')
    } finally { setLoading(null) }
  }

  const handlePdfFinanceiro = async () => {
    if (!financeiroDates.start || !financeiroDates.end) { toast.error('Selecione o periodo'); return }
    setLoading('financeiro-pdf')
    const tid = toast.loading('Gerando relatorio financeiro...')
    try {
      await downloadFile(
        `/relatorios/financeiro/pdf?data_inicio=${financeiroDates.start}&data_fim=${financeiroDates.end}`,
        `financeiro_${financeiroDates.start}_${financeiroDates.end}.pdf`
      )
      toast.dismiss(tid)
      toast.success('Relatorio financeiro gerado!')
    } catch (e: any) {
      toast.dismiss(tid)
      toast.error(e?.response?.data?.detail || 'Erro ao gerar relatorio financeiro')
    } finally { setLoading(null) }
  }

  // Gerar NF para 1 veiculo
  const handleNfSingle = async (uso: VeiculoUso) => {
    const km = parseFloat(uso.km_input)
    if (!km || km <= 0) { toast.error(`Informe o KM percorrido para ${uso.placa}`); return }
    setLoading(`nf-single-${uso.id}`)
    const tid = toast.loading(`Gerando NF para ${uso.placa}...`)
    try {
      let url = `/relatorios/nf/${uso.id}/pdf?km_percorrido=${km}`
      const kmPermitido = parseFloat(uso.km_permitido_input)
      const valorExtra = parseFloat(uso.valor_km_extra_input)
      if (kmPermitido >= 0 && uso.km_permitido_input) url += `&km_referencia=${kmPermitido}`
      if (valorExtra >= 0 && uso.valor_km_extra_input) url += `&valor_km_extra=${valorExtra}`
      await downloadFile(url, `nf_${uso.placa}.pdf`)
      toast.dismiss(tid)
      toast.success(`NF gerada para ${uso.placa}!`)
    } catch (e: any) {
      toast.dismiss(tid)
      toast.error(e?.response?.data?.detail || 'Erro ao gerar NF')
    } finally { setLoading(null) }
  }

  // Gerar NF consolidada para todos os selecionados
  const handleNfConsolidada = async () => {
    const selecionados = veiculosUso.filter(v => v.selected)
    if (selecionados.length === 0) { toast.error('Selecione ao menos um veiculo'); return }

    for (const v of selecionados) {
      const km = parseFloat(v.km_input)
      if (!km || km <= 0) {
        toast.error(`Informe o KM percorrido para ${v.placa}`)
        return
      }
    }

    setLoading('nf-consolidada')
    const tid = toast.loading(`Gerando NF consolidada (${selecionados.length} veiculos)...`)
    try {
      const body = {
        empresa_id: parseInt(selectedEmpresa),
        veiculos: selecionados.map(v => {
          const item: any = {
            uso_id: v.id,
            km_percorrido: parseFloat(v.km_input),
          }
          const kmPerm = parseFloat(v.km_permitido_input)
          const valExtra = parseFloat(v.valor_km_extra_input)
          if (kmPerm >= 0 && v.km_permitido_input) item.km_referencia = kmPerm
          if (valExtra >= 0 && v.valor_km_extra_input) item.valor_km_extra = valExtra
          return item
        }),
      }
      await downloadFile('/relatorios/nf/empresa/pdf', `nf_consolidada_empresa.pdf`, 'POST', body)
      toast.dismiss(tid)
      toast.success('NF consolidada gerada com sucesso!')
    } catch (e: any) {
      toast.dismiss(tid)
      toast.error(e?.response?.data?.detail || 'Erro ao gerar NF consolidada')
    } finally { setLoading(null) }
  }

  const toggleVeiculoSelection = (id: number) => {
    setVeiculosUso(prev => prev.map(v => v.id === id ? { ...v, selected: !v.selected } : v))
  }

  const selectAll = () => {
    const allSelected = veiculosUso.every(v => v.selected)
    setVeiculosUso(prev => prev.map(v => ({ ...v, selected: !allSelected })))
  }

  const updateKmInput = (id: number, value: string) => {
    setVeiculosUso(prev => prev.map(v => v.id === id ? { ...v, km_input: value } : v))
  }

  const updateKmPermitido = (id: number, value: string) => {
    setVeiculosUso(prev => prev.map(v => v.id === id ? { ...v, km_permitido_input: value } : v))
  }

  const updateValorKmExtra = (id: number, value: string) => {
    setVeiculosUso(prev => prev.map(v => v.id === id ? { ...v, valor_km_extra_input: value } : v))
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
      await downloadFile(url, `${entity}_${exportDates.start || 'geral'}.${formato}`)
      toast.dismiss(tid)
      toast.success(`${entity} exportado!`)
    } catch (e: any) {
      toast.dismiss(tid)
      toast.error(e?.response?.data?.detail || `Erro ao exportar ${entity}`)
    } finally { setLoading(null) }
  }

  const LoadingSpinner = () => (
    <span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></span>
  )

  const selectedCount = veiculosUso.filter(v => v.selected).length

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Card: PDF Contrato */}
            <div className="card card-hover">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-xl bg-blue-100 text-blue-700">
                  <FileText size={24} />
                </div>
                <span className="badge badge-info text-xs">PDF</span>
              </div>
              <h3 className="text-lg font-display font-bold text-slate-900 mb-2">Contrato de Locacao</h3>
              <p className="text-sm text-slate-600 mb-4">Contrato completo com clausulas, vistoria e valores</p>
              <div className="space-y-3">
                <div>
                  <label className="input-label">Contrato</label>
                  <select value={contratoId} onChange={(e) => setContratoId(e.target.value)} className="input-field">
                    <option value="">Selecione um contrato...</option>
                    {contratos.map((c: any) => (
                      <option key={c.id} value={c.id}>#{c.id} - {c.numero} ({c.status})</option>
                    ))}
                  </select>
                </div>
                <button onClick={handlePdfContrato} className="btn-primary w-full flex items-center justify-center gap-2" disabled={loading === 'contrato-pdf' || !contratoId}>
                  {loading === 'contrato-pdf' ? <LoadingSpinner /> : <Download size={16} />} Gerar PDF
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
                <button onClick={handlePdfFinanceiro} className="btn-primary w-full flex items-center justify-center gap-2" disabled={loading === 'financeiro-pdf' || !financeiroDates.start || !financeiroDates.end}>
                  {loading === 'financeiro-pdf' ? <LoadingSpinner /> : <Download size={16} />} Gerar PDF
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ====================== SEÇÃO 2: NF EMPRESA ====================== */}
        <div>
          <h2 className="text-xl font-display font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Building2 size={22} className="text-orange-600" />
            Nota Fiscal - Uso de Veiculo por Empresa
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            Selecione a empresa, informe o KM percorrido de cada veiculo e gere a NF individual ou consolidada para enviar ao contador.
          </p>

          <div className="card mb-4">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1">
                <label className="input-label">Empresa</label>
                <select
                  value={selectedEmpresa}
                  onChange={(e) => setSelectedEmpresa(e.target.value)}
                  className="input-field"
                >
                  <option value="">Selecione uma empresa...</option>
                  {empresas.map((e: any) => (
                    <option key={e.id} value={e.id}>{e.nome} - CNPJ: {e.cnpj}</option>
                  ))}
                </select>
              </div>
              {veiculosUso.length > 0 && (
                <div className="flex gap-2">
                  <button onClick={selectAll} className="btn-secondary text-xs py-2 px-3">
                    {veiculosUso.every(v => v.selected) ? 'Desmarcar Todos' : 'Selecionar Todos'}
                  </button>
                  <button
                    onClick={handleNfConsolidada}
                    className="btn-primary text-xs py-2 px-4 flex items-center gap-1"
                    disabled={loading === 'nf-consolidada' || selectedCount === 0}
                  >
                    {loading === 'nf-consolidada' ? <LoadingSpinner /> : <Receipt size={14} />}
                    NF Consolidada ({selectedCount})
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Lista de veículos da empresa */}
          {loadingUsos ? (
            <div className="card text-center py-8">
              <span className="animate-spin inline-block w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full"></span>
              <p className="text-sm text-slate-500 mt-3">Carregando veiculos...</p>
            </div>
          ) : selectedEmpresa && veiculosUso.length === 0 ? (
            <div className="card text-center py-8">
              <Car size={40} className="mx-auto text-slate-300 mb-2" />
              <p className="text-sm text-slate-500">Nenhum veiculo cadastrado para esta empresa.</p>
              <p className="text-xs text-slate-400 mt-1">Cadastre veiculos no menu Empresas para poder gerar NFs.</p>
            </div>
          ) : veiculosUso.length > 0 ? (
            <div className="space-y-4">
              {veiculosUso.map((v) => {
                const kmInput = parseFloat(v.km_input) || 0
                const kmPermitido = parseFloat(v.km_permitido_input) || 0
                const valorKmExtra = parseFloat(v.valor_km_extra_input) || 0
                const excedeu = kmInput > kmPermitido && kmPermitido > 0
                const kmExcedente = excedeu ? kmInput - kmPermitido : 0
                const valorExtra = kmExcedente * valorKmExtra

                return (
                  <div key={v.id} className={`card border-l-4 ${v.selected ? 'border-l-blue-500 bg-blue-50/30' : 'border-l-slate-200'}`}>
                    {/* Header: Checkbox + Placa + Info + NF Button */}
                    <div className="flex items-center gap-3 mb-3">
                      <input
                        type="checkbox"
                        checked={v.selected}
                        onChange={() => toggleVeiculoSelection(v.id)}
                        className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-lg">{v.placa}</span>
                          <span className="text-sm text-slate-500">{v.marca} {v.modelo}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${v.status === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                            {v.status}
                          </span>
                          {v.data_inicio && <span className="text-xs text-slate-400">Inicio: {new Date(v.data_inicio).toLocaleDateString('pt-BR')}</span>}
                          {v.valor_diaria_empresa && <span className="text-xs text-slate-400">Diaria: R$ {Number(v.valor_diaria_empresa).toFixed(2)}</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => handleNfSingle(v)}
                        className="btn-secondary text-xs py-2 px-3 whitespace-nowrap flex items-center gap-1"
                        disabled={loading === `nf-single-${v.id}` || !v.km_input}
                      >
                        {loading === `nf-single-${v.id}` ? <LoadingSpinner /> : <Download size={12} />}
                        NF Individual
                      </button>
                    </div>

                    {/* Campos editáveis */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block font-medium">KM Percorrido *</label>
                        <input
                          type="number"
                          value={v.km_input}
                          onChange={(e) => updateKmInput(v.id, e.target.value)}
                          className="input-field text-sm"
                          placeholder="Digitar KM"
                          min="0"
                          step="0.1"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block font-medium">KM Permitido</label>
                        <input
                          type="number"
                          value={v.km_permitido_input}
                          onChange={(e) => updateKmPermitido(v.id, e.target.value)}
                          className="input-field text-sm"
                          placeholder="KM limite"
                          min="0"
                          step="0.1"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block font-medium">Valor KM Extra (R$)</label>
                        <input
                          type="number"
                          value={v.valor_km_extra_input}
                          onChange={(e) => updateValorKmExtra(v.id, e.target.value)}
                          className="input-field text-sm"
                          placeholder="R$/km"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      {/* Status indicator */}
                      <div className="flex items-center justify-center">
                        {kmInput > 0 && kmPermitido > 0 ? (
                          <div className={`text-xs text-center px-3 py-2 rounded-lg w-full ${excedeu ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            {excedeu ? (
                              <>
                                <AlertTriangle size={14} className="inline mr-1" />
                                <span className="font-bold">+{kmExcedente.toFixed(0)} km excedente</span>
                                <div className="font-bold text-sm mt-0.5">R$ {valorExtra.toFixed(2)}</div>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 size={14} className="inline mr-1" />
                                <span className="font-bold">Dentro do limite</span>
                              </>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-center px-3 py-2 rounded-lg w-full bg-slate-50 text-slate-400">
                            Preencha os campos
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : null}
        </div>

        {/* ====================== SEÇÃO 3: EXPORTAÇÕES ====================== */}
        <div>
          <h2 className="text-xl font-display font-bold text-slate-900 mb-4 flex items-center gap-2">
            <FileSpreadsheet size={22} className="text-green-600" />
            Exportacoes CSV / XLSX
          </h2>

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
                <label className="input-label">Status</label>
                <select value={exportStatus} onChange={(e) => setExportStatus(e.target.value)} className="input-field">
                  <option value="">Todos</option>
                  <option value="ativo">Ativo</option>
                  <option value="finalizado">Finalizado</option>
                  <option value="disponivel">Disponivel</option>
                  <option value="alugado">Alugado</option>
                </select>
              </div>
              <div className="flex items-end">
                <button className="btn-secondary w-full" onClick={() => { setExportDates({ start: '', end: '' }); setExportStatus('') }}>
                  Limpar Filtros
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { key: 'clientes', icon: Users, color: 'cyan', label: 'Clientes', desc: 'Nome, CPF, CNH, contratos' },
              { key: 'veiculos', icon: Car, color: 'purple', label: 'Veiculos', desc: 'Placa, marca, KM, status' },
              { key: 'contratos', icon: FileText, color: 'blue', label: 'Contratos', desc: 'Cliente, veiculo, datas, valores' },
              { key: 'financeiro', icon: BarChart3, color: 'green', label: 'Financeiro', desc: 'Multi-aba: receitas, despesas' },
            ].map(({ key, icon: Icon, color, label, desc }) => (
              <div key={key} className="card card-hover">
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2.5 rounded-xl bg-${color}-100 text-${color}-700`}>
                    <Icon size={20} />
                  </div>
                </div>
                <h3 className="text-base font-display font-bold text-slate-900 mb-1">{label}</h3>
                <p className="text-xs text-slate-500 mb-4">{desc}</p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => handleExport(key, 'xlsx')} className="btn-primary py-2 text-xs flex items-center justify-center gap-1" disabled={loading === `${key}-xlsx`}>
                    {loading === `${key}-xlsx` ? <LoadingSpinner /> : <FileSpreadsheet size={14} />} XLSX
                  </button>
                  <button onClick={() => handleExport(key, 'csv')} className="btn-secondary py-2 text-xs flex items-center justify-center gap-1" disabled={loading === `${key}-csv`}>
                    {loading === `${key}-csv` ? <LoadingSpinner /> : <Download size={14} />} CSV
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
