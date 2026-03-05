import React, { useState } from 'react'
import { ChevronUp, ChevronDown, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Column<T> {
  key: keyof T
  label: string
  sortable?: boolean
  render?: (value: any, row: T) => React.ReactNode
  width?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  isLoading?: boolean
  searchPlaceholder?: string
  onSearch?: (query: string) => void
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  onSort?: (column: string) => void
  pagination?: {
    page: number
    limit: number
    total: number
    onPageChange: (page: number) => void
  }
}

function DataTable<T extends { id: string }>({
  columns,
  data,
  isLoading = false,
  searchPlaceholder = 'Buscar...',
  onSearch,
  sortBy,
  sortOrder = 'asc',
  onSort,
  pagination,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    onSearch?.(query)
  }

  const handleSort = (column: string) => {
    if (sortBy === column && sortOrder === 'asc') {
      onSort?.(column)
    } else if (sortBy === column && sortOrder === 'desc') {
      onSort?.('')
    } else {
      onSort?.(column)
    }
  }

  const totalPages = pagination ? Math.ceil(pagination.total / pagination.limit) : 1

  return (
    <div className="space-y-4">
      {onSearch && (
        <div className="relative">
          <Search className="absolute left-3 top-3 text-slate-400" size={18} />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={cn(
                    'px-6 py-3 text-left text-sm font-semibold text-slate-700',
                    column.width
                  )}
                  style={{ width: column.width }}
                >
                  {column.sortable ? (
                    <button
                      onClick={() => handleSort(String(column.key))}
                      className="flex items-center gap-2 hover:text-primary transition-colors"
                    >
                      {column.label}
                      {sortBy === String(column.key) && (
                        sortOrder === 'asc' ? (
                          <ChevronUp size={16} />
                        ) : (
                          <ChevronDown size={16} />
                        )
                      )}
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-8 text-center text-slate-500">
                  Carregando...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-8 text-center text-slate-500">
                  Nenhum registro encontrado
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr key={row.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                  {columns.map((column) => (
                    <td key={`${row.id}-${String(column.key)}`} className="px-6 py-4 text-sm text-slate-700">
                      {column.render
                        ? column.render(row[column.key], row)
                        : String(row[column.key] || '-')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-600">
            Mostrando {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)} a{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="btn-secondary btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            <div className="flex items-center gap-2">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum = i + 1
                if (totalPages > 5 && pagination.page > 3) {
                  pageNum = pagination.page - 2 + i
                }
                if (pageNum > totalPages) return null
                return (
                  <button
                    key={pageNum}
                    onClick={() => pagination.onPageChange(pageNum)}
                    className={cn(
                      'btn-sm px-3 py-1 rounded-lg transition-colors',
                      pageNum === pagination.page
                        ? 'btn-primary'
                        : 'btn-secondary hover:bg-slate-300'
                    )}
                  >
                    {pageNum}
                  </button>
                )
              })}
            </div>
            <button
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page === totalPages}
              className="btn-secondary btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Próximo
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default DataTable
