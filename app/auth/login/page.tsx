"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Building2, Users, TrendingUp, Shield, BarChart3, Zap, Eye, EyeOff, Lock, User } from "lucide-react"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  const handleLogin = async (e) => {
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
        name: data.user.first_name || data.user.username,
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

  const features = [
    {
      icon: Users,
      title: "Smart Lead Management",
      description: "AI-powered lead scoring and automated nurturing workflows",
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      icon: Building2,
      title: "Multi-Branch Operations", 
      description: "Seamless management across all your business locations",
      gradient: "from-emerald-500 to-teal-500"
    },
    {
      icon: BarChart3,
      title: "Advanced Analytics",
      description: "Real-time insights and predictive business intelligence", 
      gradient: "from-purple-500 to-violet-500"
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Bank-grade security with role-based access controls",
      gradient: "from-orange-500 to-red-500"
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" style={{animationDelay: '4s'}}></div>
      </div>

      <div className="relative z-10 min-h-screen flex flex-col lg:flex-row">
        {/* Left side - Branding & Features */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-center p-12 xl:p-16">
          <div className="max-w-lg">
            {/* Logo & Title */}
            <div className="mb-12">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-cyan-400 to-blue-600 rounded-xl flex items-center justify-center mr-4 shadow-lg">
                  <Zap className="w-7 h-7 text-white" />
                </div>
                <h1 className="text-4xl xl:text-5xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  EPIC CRM 2.0
                </h1>
              </div>
              <p className="text-xl text-gray-300 leading-relaxed">
                Transform your business relationships with intelligent automation and powerful insights.
              </p>
            </div>

            {/* Features Grid */}
            <div className="space-y-6">
              {features.map((feature, index) => (
                <div 
                  key={index}
                  className="group p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300 hover:scale-105 cursor-pointer"
                >
                  <div className="flex items-start space-x-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${feature.gradient} flex items-center justify-center flex-shrink-0 shadow-lg`}>
                      <feature.icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-lg mb-2 group-hover:text-cyan-300 transition-colors">
                        {feature.title}
                      </h3>
                      <p className="text-gray-400 text-sm leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div className="mt-12 grid grid-cols-3 gap-8">
              <div className="text-center">
                <div className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent mb-1">99.9%</div>
                <div className="text-sm text-gray-400">Uptime</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-teal-600 bg-clip-text text-transparent mb-1">10k+</div>
                <div className="text-sm text-gray-400">Active Users</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-violet-600 bg-clip-text text-transparent mb-1">24/7</div>
                <div className="text-sm text-gray-400">Support</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Login Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-4 lg:p-8">
          <div className="w-full max-w-md">
            {/* Mobile header */}
            <div className="lg:hidden text-center mb-8">
              <div className="flex items-center justify-center mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-cyan-400 to-blue-600 rounded-xl flex items-center justify-center mr-3 shadow-lg">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  EPIC CRM 2.0
                </h1>
              </div>
              <p className="text-gray-300">
                Welcome back to your business command center
              </p>
            </div>

            <Card className="shadow-2xl bg-white/10 backdrop-blur-xl border-white/20 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"></div>
              
              <CardHeader className="relative space-y-1 pb-8">
                <CardTitle className="text-2xl font-bold text-white text-center mb-2">
                  Welcome Back
                </CardTitle>
                <CardDescription className="text-gray-300 text-center">
                  Sign in to access your dashboard
                </CardDescription>
              </CardHeader>

              <CardContent className="relative">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-white font-medium flex items-center">
                      <User className="w-4 h-4 mr-2" />
                      Username
                    </Label>
                    <Input
                      id="username"
                      type="text"
                      placeholder="Enter your username"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="h-12 bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-cyan-400 focus:ring-cyan-400/20 transition-all"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-white font-medium flex items-center">
                      <Lock className="w-4 h-4 mr-2" />
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-12 bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-cyan-400 focus:ring-cyan-400/20 pr-12 transition-all"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-12 px-3 text-gray-400 hover:text-white hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-500/20 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg text-sm backdrop-blur-sm">
                      {error}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center">
                      <input 
                        type="checkbox" 
                        id="remember" 
                        className="mr-2 rounded border-white/20 bg-white/10 text-cyan-400 focus:ring-cyan-400/20"
                      />
                      <label htmlFor="remember" className="text-gray-300">Remember me</label>
                    </div>
                    <Link 
                      href="/auth/forgot-password" 
                      className="text-cyan-400 hover:text-cyan-300 transition-colors hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>

                  <Button 
                    onClick={handleLogin}
                    className="w-full h-12 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-medium rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-cyan-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Signing in...</span>
                      </div>
                    ) : (
                      <span className="flex items-center justify-center">
                        <Lock className="w-4 h-4 mr-2" />
                        Sign In
                      </span>
                    )}
                  </Button>
                </div>

                <div className="mt-8 text-center">
                  <p className="text-gray-400 text-sm">
                    Need access? {" "}
                    <Link 
                      href="/contact" 
                      className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors hover:underline"
                    >
                      Contact your administrator
                    </Link>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Mobile features preview */}
            <div className="lg:hidden mt-8 grid grid-cols-2 gap-4">
              <div className="text-center p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all">
                <TrendingUp className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
                <p className="text-white text-sm font-medium">Analytics</p>
                <p className="text-gray-400 text-xs">Real-time insights</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all">
                <Shield className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-white text-sm font-medium">Secure</p>
                <p className="text-gray-400 text-xs">Bank-grade security</p>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-8 text-center text-xs text-gray-500">
              <p>© 2024 EPIC CRM 2.0. All rights reserved.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}