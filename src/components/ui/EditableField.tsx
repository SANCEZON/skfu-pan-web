import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface EditableFieldProps {
  value: string
  onSave: (value: string) => void | Promise<void>
  type?: 'text' | 'time' | 'select'
  options?: { value: string; label: string }[]
  placeholder?: string
  className?: string
  disabled?: boolean
}

export default function EditableField({
  value,
  onSave,
  type = 'text',
  options,
  placeholder,
  className = '',
  disabled = false,
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const [isSaving, setIsSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      if (type === 'text' && inputRef.current instanceof HTMLInputElement) {
        inputRef.current.select()
      }
    }
  }, [isEditing, type])

  useEffect(() => {
    setEditValue(value)
  }, [value])

  const handleSave = async () => {
    if (editValue === value) {
      setIsEditing(false)
      return
    }

    setIsSaving(true)
    try {
      await onSave(editValue)
      setIsEditing(false)
    } catch (error) {
      console.error('Error saving:', error)
      setEditValue(value) // Revert on error
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setEditValue(value)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && type !== 'select') {
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  if (disabled) {
    return <span className={className}>{value || placeholder}</span>
  }

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        {!isEditing ? (
          <motion.div
            key="display"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            onClick={() => setIsEditing(true)}
            className={`cursor-pointer hover:bg-gray-50 rounded px-2 py-1 transition-colors ${className}`}
          >
            {value || <span className="text-gray-400">{placeholder}</span>}
          </motion.div>
        ) : (
          <motion.div
            key="edit"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="relative"
          >
            {type === 'select' && options ? (
              <select
                ref={inputRef as React.RefObject<HTMLSelectElement>}
                value={editValue}
                onChange={(e) => {
                  setEditValue(e.target.value)
                  // Auto-save on change for select
                  setTimeout(() => handleSave(), 100)
                }}
                onKeyDown={handleKeyDown}
                disabled={isSaving}
                className="w-full px-2 py-1 border border-primary rounded focus:outline-none focus:ring-2 focus:ring-primary"
                autoFocus
              >
                {options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                ref={inputRef as React.RefObject<HTMLInputElement>}
                type={type}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                disabled={isSaving}
                placeholder={placeholder}
                className="w-full px-2 py-1 border border-primary rounded focus:outline-none focus:ring-2 focus:ring-primary"
                autoFocus
              />
            )}
            {isSaving && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

