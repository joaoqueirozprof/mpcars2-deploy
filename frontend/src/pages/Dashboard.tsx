import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { TrendingUp, TrendingDown, DollarSign, Car, FileText, AlertCircle } from 'lucide-react'
import api from '@/services/api'
import AppLayout from '@/components/layout/AppLayout'
import SkeletonLoader from '@/components/shared/SkeletonLoader'
import StatusBadge from '@/components/shared/StatusBadge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { DashboardStats } from '@/types'

const Dashboard: React.FC = () => {
  const [alertFilter, setAlertFilter] = useState<'critica' | 'atencao' | 'info'>('critica')

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const { data } = await api.get<DashboardStats>('/dashboard')
      return data
    },
  })

  const KPICard = ({ icon: Icon, label, value, trend }: any) => (
    <div className="card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-600 text-sm font-medium">{label}</p>
          {isLoading ? (
            <SkeletonLoader height={32} width="200px" />
          ) : (
            <h3 className="text-3xl font-display font-bold text-slate-900 mt-2">{value}</h3>
          )}
        </div>
        <div className="bg-primary/10 p-3 rounded-lg">
          <Icon className="text-primary" size={24} />
        </div>
      </div>
      {trend && (
        <div className="flex items-center gap-1 mt-4 text-sm">
          {trend > 0 ? (
            <>
              <TrendingUp className="text-success" size={16} />
              <span className="text-success">+{trend}% vs mês anterior</span>
            </>
          ) : (
            <>
              <TrendingDown className="text-danger" size={16} />
              <span className="text-danger">{trend}% vs mês anterior</span>
            </>
          )}
        </div>
      )}
    </div>
  )

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-600 mt-1">Bem-vindo ao sistema de aluguel de veículos</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            icon={Car}
            label="Total de Veículos"
            value={isLoading ? '-' : stats?.total_veiculos || 0}
          />
          <KPICard
            icon={Car}
            label="Veículos Alugados"
            value={isLoading ? '-' : stats?.veiculos_alugados || 0}
          />
          <KPICard
            icon={FileText}
            label="Contratos Ativos"
            value={isLoading ? '-' : stats?.contratos_ativos || 0}
          />
          <KPICard
            icon={DollarSign}
            label="Receita Mês"
            value={isLoading ? '-' : formatCurrency(stats?.receita_mensal || 0)}
            trend={12}
          />
        </div>

        {/* Charts and Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Chart */}
          <div className="lg:col-span-2 card">
            <h2 className="text-lg font-display font-bold text-slate-900 mb-4">
              Receita vs Despesas
            </h2>
            {isLoading ? (
              <SkeletonLoader count={5} height={20} />
            ) : stats?.receita_vs_despesas && stats.receita_vs_despesas.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.receita_vs_despesas}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="mes" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="receita" fill="#2563EB" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="despesa" fill="#EF4444" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-slate-500 py-8">Sem dados disponíveis</p>
            )}
          </div>

          {/* Active Alerts */}
          <div className="card">
            <h2 className="text-lg font-display font-bold text-slate-900 mb-4">
              Alertas
            </h2>
            <div className="space-y-2">
              {['critica', 'atencao', 'info'].map((urgency) => (
                <button
                  key={urgency}
                  onClick={() => setAlertFilter(urgency as any)}
                  className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    alertFilter === urgency
                      ? 'bg-primary text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {urgency === 'critica' ? '⚠️ Crítica' : urgency === 'atencao' ? '⏱️ Atenção' : 'ℹ️ Info'}
                </button>
              ))}
            </div>
            <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">
              {isLoading ? (
                <SkeletonLoader count={3} height={20} />
              ) : stats?.alertas && stats.alertas.length > 0 ? (
                stats.alertas
                  .filter((a) => a.urgencia === alertFilter)
                  .map((alert) => (
                    <div
                      key={alert.id}
                      className="p-3 rounded-lg border-l-4 border-warning bg-amber-50"
                    >
                      <p className="font-medium text-sm text-slate-900">{alert.titulo}</p>
                      <p className="text-xs text-slate-600 mt-1">{alert.descricao}</p>
                    </div>
                  ))
              ) : (
                <p className="text-center text-slate-500 text-sm py-4">Sem alertas</p>
              )}
            </div>
          </div>
        </div>

        {/* Top Clients and Vehicles */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="text-lg font-display font-bold text-slate-900 mb-4">
              Top 5 Clientes
            </h2>
            {isLoading ? (
              <SkeletonLoader count={5} height={20} />
            ) : stats?.top_clientes && stats.top_clientes.length > 0 ? (
              <div className="space-y-3">
                {stats.top_clientes.map((cliente, idx) => (
                  <div key={idx} className="flex items-center justify-between py-3 border-b border-slate-200 last:border-0">
                    <div>
                      <p className="font-medium text-slate-900">{cliente.nome}</p>
                      <p className="text-xs text-slate-500">{cliente.contratos} contratos</p>
                    </div>
                    <p className="font-semibold text-primary">{formatCurrency(cliente.valor_total)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-slate-500">Sem dados</p>
            )}
          </div>

          <div className="card">
            <h2 className="text-lg font-display font-bold text-slate-900 mb-4">
              Top 5 Veículos
            </h2>
            {isLoading ? (
              <SkeletonLoader count={5} height={20} />
            ) : stats?.top_veiculos && stats.top_veiculos.length > 0 ? (
              <div className="space-y-3">
                {stats.top_veiculos.map((veiculo, idx) => (
                  <div key={idx} className="flex items-center justify-between py-3 border-b border-slate-200 last:border-0">
                    <div>
                      <p className="font-medium text-slate-900">{veiculo.placa}</p>
                      <p className="text-xs text-slate-500">{veiculo.modelo}</p>
                    </div>
                    <StatusBadge status="alugado" label={`${veiculo.alugadas}x`} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-slate-500">Sem dados</p>
            )}
          </div>
        </div>

        {/* Late Contracts and Expirations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="text-lg font-display font-bold text-slate-900 mb-4 flex items-center gap-2">
              <AlertCircle className="text-danger" size={20} />
              Contratos em Atraso
            </h2>
            {isLoading ? (
              <SkeletonLoader count={3} height={20} />
            ) : stats?.contratos_atrasados && stats.contratos_atrasados.length > 0 ? (
              <div className="space-y-2">
                {stats.contratos_atrasados.map((contrato) => (
                  <div key={contrato.id} className="p-3 bg-red-50 rounded-lg border border-red-200">
                    <p className="font-medium text-sm text-slate-900">{contrato.numero}</p>
                    <p className="text-xs text-slate-600 mt-1">
                      Vencimento: {formatDate(contrato.data_fim)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-slate-500 py-8">Nenhum atraso</p>
            )}
          </div>

          <div className="card">
            <h2 className="text-lg font-display font-bold text-slate-900 mb-4">
              Próximos 30 Dias
            </h2>
            {isLoading ? (
              <SkeletonLoader count={3} height={20} />
            ) : stats?.proximos_vencimentos && stats.proximos_vencimentos.length > 0 ? (
              <div className="space-y-2">
                {stats.proximos_vencimentos.map((item) => (
                  <div key={item.id} className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="font-medium text-sm text-slate-900">{item.titulo}</p>
                    <p className="text-xs text-slate-600 mt-1">
                      {item.tipo} - {formatDate(item.data_vencimento)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-slate-500 py-8">Nada pendente</p>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

export default Dashboard
