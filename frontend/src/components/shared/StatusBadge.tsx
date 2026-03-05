import React from 'react'
import { getStatusColor, getStatusLabel } from '@/lib/utils'

interface StatusBadgeProps {
  status: string
  label?: string
  size?: 'sm' | 'md' | 'lg'
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, size = 'md' }) => {
  const colorClass = getStatusColor(status)
  const displayLabel = label || getStatusLabel(status)

  const sizeClass = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base',
  }[size]

  return (
    <span className={`badge ${colorClass} ${sizeClass}`}>
      {displayLabel}
    </span>
  )
}

export default StatusBadge
