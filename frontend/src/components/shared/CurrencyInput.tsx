import React from 'react'
import { formatCurrency, parseCurrency } from '@/lib/utils'

interface CurrencyInputProps {
  value: number
  onChange: (value: number) => void
  placeholder?: string
  disabled?: boolean
  label?: string
  error?: string
}

const CurrencyInput: React.FC<CurrencyInputProps> = ({
  value,
  onChange,
  placeholder = 'R$ 0,00',
  disabled = false,
  label,
  error,
}) => {
  const [displayValue, setDisplayValue] = React.useState(formatCurrency(value))

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let inputValue = e.target.value.replace(/\D/g, '')

    if (inputValue.length === 0) {
      setDisplayValue('')
      onChange(0)
      return
    }

    inputValue = inputValue.padStart(3, '0')
    const numValue = parseInt(inputValue) / 100

    setDisplayValue(formatCurrency(numValue))
    onChange(numValue)
  }

  const handleBlur = () => {
    if (displayValue === '') {
      setDisplayValue(formatCurrency(0))
      onChange(0)
    }
  }

  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>}
      <input
        type="text"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className={`input-field ${error ? 'border-danger' : ''}`}
      />
      {error && <p className="text-danger text-sm mt-1">{error}</p>}
    </div>
  )
}

export default CurrencyInput
