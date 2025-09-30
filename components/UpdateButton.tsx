import React from 'react'
import { Edit3 } from 'lucide-react'

interface UpdateButtonProps {
  onClick: () => void
  disabled?: boolean
  className?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'outline' | 'ghost'
  showLabel?: boolean
}

export const UpdateButton: React.FC<UpdateButtonProps> = ({
  onClick,
  disabled = false,
  className = "",
  size = 'md',
  variant = 'default',
  showLabel = true
}) => {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs min-h-[36px] min-w-[36px]',
    md: 'px-3 py-2 text-sm min-h-[44px] min-w-[44px]',
    lg: 'px-4 py-3 text-base min-h-[52px] min-w-[52px]'
  }

  const variantClasses = {
    default: 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 hover:border-gray-400 shadow-sm hover:shadow-md',
    outline: 'bg-transparent hover:bg-gray-50 text-gray-700 border border-gray-300 hover:border-gray-400',
    ghost: 'bg-transparent hover:bg-gray-100 text-gray-700 border border-transparent'
  }

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex items-center gap-2 rounded-lg font-medium
        transition-all duration-200 focus:outline-none focus:ring-2 
        focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 
        disabled:cursor-not-allowed
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${className}
      `}
      aria-label="Update lead information"
    >
      <Edit3 className={iconSizes[size]} />
      {showLabel && <span>Update</span>}
    </button>
  )
}

export default UpdateButton
