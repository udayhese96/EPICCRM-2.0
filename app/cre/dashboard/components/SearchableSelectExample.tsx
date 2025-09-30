/**
 * SearchableSelect Component Usage Example
 * 
 * This file demonstrates how to use the SearchableSelect component
 * in other forms throughout the application.
 */

import React, { useState } from 'react'
import { SearchableSelect } from './lead-update-modal'

// Example usage in a simple form
export const SearchableSelectExample = () => {
  const [selectedMake, setSelectedMake] = useState('')
  const [selectedModel, setSelectedModel] = useState('')

  const carMakes = [
    'Toyota', 'Honda', 'BMW', 'Mercedes-Benz', 'Audi', 'Volkswagen',
    'Ford', 'Chevrolet', 'Nissan', 'Hyundai', 'Kia', 'Mazda',
    'Subaru', 'Lexus', 'Infiniti', 'Acura', 'Cadillac', 'Lincoln',
    'Jaguar', 'Land Rover', 'Porsche', 'Ferrari', 'Lamborghini',
    'Maserati', 'Bentley', 'Rolls-Royce', 'Aston Martin', 'McLaren'
  ]

  const handleMakeChange = (make: string) => {
    setSelectedMake(make)
    setSelectedModel('') // Reset model when make changes
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-4">
      <h2 className="text-xl font-semibold mb-4">SearchableSelect Example</h2>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Vehicle Make
        </label>
        <SearchableSelect
          value={selectedMake}
          onValueChange={handleMakeChange}
          placeholder="Select Vehicle Make"
          options={carMakes}
          searchPlaceholder="Search makes..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Selected Make: {selectedMake || 'None'}
        </label>
      </div>

      <div className="text-sm text-gray-600">
        <h3 className="font-medium mb-2">Features:</h3>
        <ul className="list-disc list-inside space-y-1">
          <li>Live search filtering (case-insensitive)</li>
          <li>Keyboard navigation (Arrow keys, Enter, Escape, Home, End)</li>
          <li>Debounced input (200ms delay)</li>
          <li>Highlighted search matches</li>
          <li>Results count display</li>
          <li>Mobile-responsive design</li>
          <li>Accessibility support (ARIA labels, roles)</li>
        </ul>
      </div>
    </div>
  )
}

// Props API Documentation
export interface SearchableSelectProps {
  /** Current selected value */
  value: string
  /** Callback when value changes */
  onValueChange: (value: string) => void
  /** Placeholder text for the trigger button */
  placeholder: string
  /** Array of options to search through */
  options: string[]
  /** Placeholder text for the search input */
  searchPlaceholder?: string
  /** Whether the component is disabled */
  disabled?: boolean
  /** Additional CSS classes */
  className?: string
}

/**
 * Usage in other components:
 * 
 * import { SearchableSelect } from './SearchableSelect'
 * 
 * const MyComponent = () => {
 *   const [selectedValue, setSelectedValue] = useState('')
 *   
 *   return (
 *     <SearchableSelect
 *       value={selectedValue}
 *       onValueChange={setSelectedValue}
 *       placeholder="Select an option"
 *       options={myOptions}
 *       searchPlaceholder="Search options..."
 *     />
 *   )
 * }
 */
