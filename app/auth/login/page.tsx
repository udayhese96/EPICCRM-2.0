"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Lock, User, Zap } from "lucide-react"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    console.log("🔐 Login attempt with:", { username, password })

    try {
      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      
      if (!resp.ok) {
        throw new Error('Invalid username or password')
      }
      
      const data = await resp.json()

      localStorage.setItem('supabase_user', JSON.stringify({
        id: data.user.id,
        username: data.user.username,
        email: data.user.email,
        role: data.user.role,
        branch: data.user.branch,
        name: data.user.full_name || data.user.first_name || data.user.username,
        full_name: data.user.full_name || data.user.first_name || data.user.username,
        access_token: data.access_token
      }))

      const userRole = data.user.role
      console.log("🔄 Redirecting based on role:", userRole)

      let redirectUrl = "/dashboard"
      switch (userRole) {
        case "admin":
          redirectUrl = "/admin/dashboard"
          break
        case "branch_head":
          redirectUrl = "/branch-head/dashboard"
          break
        case "cre_team_leader":
          redirectUrl = "/cre-team-leader/dashboard"
          break
        case "cre_icrop":
          redirectUrl = "/cre-icrop/dashboard"
          break
        case "cre":
          redirectUrl = "/cre/dashboard"
          break
        case "ps":
          redirectUrl = "/ps/dashboard"
          break
        case "sales_manager":
          redirectUrl = "/sales-manager/dashboard"
          break
        case "receptionist":
          redirectUrl = "/receptionist/dashboard"
          break
        default:
          redirectUrl = "/dashboard"
      }
      
      window.location.href = redirectUrl
    } catch (error) {
      console.error("🚨 Login error:", error)
      setError(error instanceof Error ? error.message : "Invalid username or password")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-orange-50 to-red-50 relative overflow-hidden flex items-center justify-center">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 -left-10 w-80 h-80 bg-orange-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse"></div>
        <div className="absolute top-40 -right-10 w-80 h-80 bg-red-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute -bottom-10 left-1/3 w-80 h-80 bg-orange-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" style={{animationDelay: '4s'}}></div>
      </div>

      <div className="relative z-10 w-full max-w-md px-4">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-6">
            <div className="w-12 h-12 bg-gradient-to-r from-orange-400 to-red-500 rounded-xl flex items-center justify-center mr-4 shadow-lg">
              <Zap className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
              EPIC CRM
            </h1>
          </div>
          <p className="text-lg text-gray-600 mb-4">
            Good to see you again
          </p>
        </div>

        {/* Login Form */}
        <Card className="shadow-2xl bg-white/90 backdrop-blur-xl border-white/50 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
          
          <CardContent className="relative p-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-gray-700 font-medium">
                  Username
                </Label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter your username"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="h-12 pl-10 bg-white border-gray-200 text-gray-700 placeholder:text-gray-400 focus:border-orange-400 focus:ring-orange-400/20 transition-all rounded-lg"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700 font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 pl-10 pr-12 bg-white border-gray-200 text-gray-700 placeholder:text-gray-400 focus:border-orange-400 focus:ring-orange-400/20 transition-all rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-12 px-3 text-gray-400 hover:text-gray-600 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <Button 
                onClick={handleLogin}
                className="w-full h-12 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-green-500/25 disabled:opacity-50 disabled:cursor-not-allowed" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Signing in...</span>
                  </div>
                ) : (
                  "Sign in"
                )}
              </Button>

            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}