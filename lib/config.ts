// API Configuration
export const API_CONFIG = {
  FASTAPI_URL: process.env.FASTAPI_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : 'https://epic-crm-backend.onrender.com'),
  NEXTJS_API_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
} as const

// Supabase Configuration
export const SUPABASE_CONFIG = {
  URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
} as const

// API Endpoints
export const API_ENDPOINTS = {
  // CRE Users
  CRE_USERS: '/api/cre-users',
  CRE_USER_BY_ID: (id: string) => `/api/cre-users/${id}`,
  
  // PS Users  
  PS_USERS: '/api/ps-users',
  PS_USER_BY_ID: (id: string) => `/api/ps-users/${id}`,
  
  // Leads
  LEADS: '/api/leads',
  LEADS_STATISTICS: '/api/leads/statistics',
  LEADS_UNASSIGNED: '/api/leads/unassigned',
  LEADS_UNASSIGNED_BY_SOURCE: (source: string) => `/api/leads/unassigned/${encodeURIComponent(source)}`,
  LEADS_ASSIGN: '/api/leads/assign',
  
  // Admin
  ADMIN_LEADS: '/api/admin/leads',
} as const
