# Reusable UI Components - CRE Dashboard Style System

## Button Tiers

### Primary Button
```jsx
<button 
  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm bg-green-600 text-white hover:bg-green-700 focus:ring-2 focus:ring-green-300 transition-all duration-150 min-h-[44px] min-w-[44px]"
  onClick={handleClick}
  aria-label="Primary action"
>
  <Icon className="h-4 w-4" />
  Button Text
</button>
```

### Secondary Button
```jsx
<button 
  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm border bg-white text-gray-800 hover:shadow-sm focus:ring-2 focus:ring-blue-100 transition-all duration-150 min-h-[44px] min-w-[44px]"
  onClick={handleClick}
  aria-label="Secondary action"
>
  <Icon className="h-4 w-4" />
  Button Text
</button>
```

### Ghost Button
```jsx
<button 
  className="px-2 py-1 rounded-md text-sm text-gray-600 hover:bg-gray-50 focus:ring-2 focus:ring-gray-100 transition-all duration-150 min-h-[44px] min-w-[44px]"
  onClick={handleClick}
  aria-label="Ghost action"
>
  <Icon className="h-4 w-4" />
</button>
```

## Filter Pills/Tabs

### Active Filter Pill
```jsx
<button 
  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-150 min-h-[44px] min-w-[44px] bg-blue-100 text-blue-800 border-blue-300 shadow-sm"
  onClick={() => setActiveFilter("value")}
  aria-label="Active filter"
>
  <Icon className="h-4 w-4" />
  <div className="text-center leading-tight">
    <div>Filter Name</div>
    <div>({count})</div>
  </div>
</button>
```

### Inactive Filter Pill
```jsx
<button 
  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-150 min-h-[44px] min-w-[44px] bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
  onClick={() => setActiveFilter("value")}
  aria-label="Inactive filter"
>
  <Icon className="h-4 w-4" />
  <div className="text-center leading-tight">
    <div>Filter Name</div>
    <div>({count})</div>
  </div>
</button>
```

## Search Box

### Search Input with Icon
```jsx
<div className="relative">
  <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
  <input 
    type="text"
    placeholder="Search by UID, name..." 
    className="w-full sm:w-64 pl-10 pr-3 py-2 rounded-lg border border-gray-200 bg-white placeholder-gray-400 focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all duration-150 text-sm md:text-base"
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    aria-label="Search leads"
  />
</div>
```

### Select Dropdown
```jsx
<select 
  className="w-full sm:w-64 px-3 py-2 rounded-lg border border-gray-200 bg-white placeholder-gray-400 focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all duration-150 text-sm md:text-base"
  value={selectedValue} 
  onChange={(e) => setSelectedValue(e.target.value)}
  aria-label="Select option"
>
  <option>Option 1</option>
  <option>Option 2</option>
  <option>Option 3</option>
</select>
```

## KPI Card with Apple-Magnus Effect

### Glassy KPI Card
```jsx
<Card className="relative overflow-hidden bg-gradient-to-br from-blue-100/90 to-blue-200/70 text-slate-800 border border-blue-300/30 shadow-md rounded-xl backdrop-blur-[6px] h-40 md:h-44">
  {/* Apple-Magnus glassy effect layers */}
  <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-blue-300/25"></div>
  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent"></div>
  <div className="absolute inset-0 backdrop-filter backdrop-blur-[6px]"></div>
  
  <CardContent className="relative p-4 md:p-5 flex flex-col h-full items-center justify-between">
    {/* Title at top center */}
    <div className="flex items-center justify-center mb-2">
      <p className="text-slate-700 text-sm md:text-base font-medium text-center">Card Title</p>
    </div>
    
    {/* Main count in center */}
    <div className="flex items-center justify-center">
      <p className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-slate-800 text-center leading-none">{count}</p>
    </div>
    
    {/* Sub-values below count with Apple-Magnus glassy effect */}
    <div className="flex items-center justify-center space-x-2 mt-3">
      <span className="relative w-7 h-7 flex items-center justify-center text-sm rounded-full font-semibold shadow-lg backdrop-blur-sm overflow-hidden">
        {/* Blue circle with glassy effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-blue-600"></div>
        <div className="absolute inset-0 bg-gradient-to-tr from-white/40 via-transparent to-transparent"></div>
        <div className="absolute inset-0 backdrop-filter backdrop-blur-[2px]"></div>
        <span className="relative text-white z-10 font-bold">{subCount1}</span>
      </span>
      <span className="relative w-7 h-7 flex items-center justify-center text-sm rounded-full font-semibold shadow-lg backdrop-blur-sm overflow-hidden">
        {/* Gray circle with glassy effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-400 to-slate-600"></div>
        <div className="absolute inset-0 bg-gradient-to-tr from-white/40 via-transparent to-transparent"></div>
        <div className="absolute inset-0 backdrop-filter backdrop-blur-[2px]"></div>
        <span className="relative text-white z-10 font-bold">{subCount2}</span>
      </span>
      <span className="relative w-7 h-7 flex items-center justify-center text-sm rounded-full font-semibold shadow-lg backdrop-blur-sm overflow-hidden">
        {/* Amber circle with glassy effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-amber-600"></div>
        <div className="absolute inset-0 bg-gradient-to-tr from-white/40 via-transparent to-transparent"></div>
        <div className="absolute inset-0 backdrop-filter backdrop-blur-[2px]"></div>
        <span className="relative text-white z-10 font-bold">{subCount3}</span>
      </span>
    </div>
  </CardContent>
</Card>
```

## Color Variants for KPI Cards

### Blue Card
```jsx
className="bg-gradient-to-br from-blue-100/90 to-blue-200/70 border-blue-300/30"
```

### Yellow Card
```jsx
className="bg-gradient-to-br from-yellow-100/90 to-yellow-200/70 border-yellow-300/30"
```

### Orange Card
```jsx
className="bg-gradient-to-br from-orange-100/90 to-orange-200/70 border-orange-300/30"
```

### Green Card
```jsx
className="bg-gradient-to-br from-green-100/90 to-green-200/70 border-green-300/30"
```

### Emerald Card
```jsx
className="bg-gradient-to-br from-emerald-100/90 to-emerald-200/70 border-emerald-300/30"
```

### Red Card
```jsx
className="bg-gradient-to-br from-red-100/90 to-red-200/70 border-red-300/30"
```

## Accessibility Features

- **Minimum touch targets**: `min-h-[44px] min-w-[44px]`
- **Focus rings**: `focus:ring-2 focus:ring-{color}-100`
- **ARIA labels**: `aria-label="Descriptive text"`
- **Keyboard navigation**: All interactive elements are focusable
- **Screen reader support**: Semantic HTML and proper labeling

## Responsive Typography

- **Small screens**: `text-sm`
- **Medium screens**: `text-sm md:text-base`
- **Large screens**: `text-sm md:text-base lg:text-lg`
- **KPI counts**: `text-2xl md:text-3xl lg:text-4xl`

## Transition Effects

- **Standard transition**: `transition-all duration-150`
- **Hover effects**: `hover:bg-{color}-50`, `hover:shadow-sm`
- **Focus effects**: `focus:ring-2 focus:ring-{color}-100`
