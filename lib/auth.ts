// Simple authentication without Supabase complications
export interface User {
  username: string
  role: string
  email: string
  access_token: string
}

export interface LoginData {
  username: string
  password: string
}

// Store user in localStorage for simplicity
export const setUser = (user: User) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('user', JSON.stringify(user))
  }
}

export const getUser = (): User | null => {
  if (typeof window !== 'undefined') {
    const userData = localStorage.getItem('user')
    return userData ? JSON.parse(userData) : null
  }
  return null
}

export const logout = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('user')
    window.location.href = '/auth/login'
  }
}

// API login function
export const login = async (credentials: LoginData): Promise<User> => {
  const response = await fetch('http://localhost:8000/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  })

  if (!response.ok) {
    throw new Error('Invalid credentials')
  }

  const data = await response.json()
  
  const user: User = {
    username: data.username,
    role: data.role,
    email: data.username + '@epiccrm.com',
    access_token: data.access_token
  }
  
  setUser(user)
  return user
}
