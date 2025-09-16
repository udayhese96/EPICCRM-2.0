"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Building2, Users, TrendingUp } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    console.log("🔐 Login attempt with:", { username, password })

    try {
      // Use backend login (no hashes in DB)
      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      if (!resp.ok) {
        throw new Error('Invalid username or password')
      }
      const data = await resp.json()

      // Save minimal session (no secrets)
      localStorage.setItem('supabase_user', JSON.stringify({
        id: data.user.id,
        username: data.user.username,
        email: data.user.email,
        role: data.user.role,
        name: data.user.first_name || data.user.username
      }))

      // Redirect based on role
      const userRole = data.user.role
      console.log("🔄 Redirecting based on role:", userRole)

      switch (userRole) {
        case "admin":
          console.log("👑 Redirecting to admin dashboard")
          router.push("/admin/dashboard")
          break
        case "branch_head":
          console.log("🏢 Redirecting to branch head dashboard")
          router.push("/branch-head/dashboard")
          break
        case "cre":
          console.log("📊 Redirecting to CRE dashboard")
          router.push("/cre/dashboard")
          break
        case "ps":
          console.log("📈 Redirecting to PS dashboard")
          router.push("/ps/dashboard")
          break
        default:
          console.log("🏠 Redirecting to default dashboard")
          router.push("/dashboard")
      }
    } catch (error: unknown) {
      console.error("🚨 Login error:", error)
      setError(error instanceof Error ? error.message : "Invalid username or password")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Left side - Branding */}
        <div className="hidden lg:block space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-gray-900">EPIC CRM 2.0</h1>
            <p className="text-xl text-gray-600">
              Streamline your customer relationships with our powerful CRM platform
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Lead Management</h3>
                <p className="text-gray-600">Track and nurture leads through your sales pipeline</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="bg-green-100 p-3 rounded-lg">
                <Building2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Branch Management</h3>
                <p className="text-gray-600">Manage multiple branches and teams efficiently</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="bg-purple-100 p-3 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Analytics & Reports</h3>
                <p className="text-gray-600">Get insights with comprehensive reporting tools</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Login Form */}
        <div className="w-full max-w-md mx-auto">
          <Card className="shadow-xl">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold text-center">Welcome Back</CardTitle>
              <CardDescription className="text-center">Sign in to your EPIC CRM account</CardDescription>
              <div className="bg-blue-50 p-3 rounded-lg mt-4">
                <p className="text-sm font-medium text-blue-800 mb-2">Test Credentials:</p>
                <div className="text-xs text-blue-700 space-y-1">
                  <div>👑 Admin: admin / admin123</div>
                  <div>🏢 Branch Head: branchhead / branchhead123</div>
                  <div>📊 CRE: cre / cre123</div>
                  <div>💼 Pre-Sales: ps / ps123</div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter your username"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11"
                  />
                </div>
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                    {error}
                  </div>
                )}
                <Button type="submit" className="w-full h-11 bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>
                
                {/* Quick Test Buttons */}
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setUsername("admin")
                      setPassword("admin123")
                    }}
                  >
                    👑 Admin
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setUsername("cre")
                      setPassword("cre123")
                    }}
                  >
                    📊 CRE
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setUsername("branchhead")
                      setPassword("branchhead123")
                    }}
                  >
                    🏢 Branch
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setUsername("ps")
                      setPassword("ps123")
                    }}
                  >
                    💼 PS
                  </Button>
                </div>
              </form>

              <div className="mt-6 text-center text-sm">
                <span className="text-gray-600">Don't have an account? </span>
                <Link href="/auth/register" className="text-blue-600 hover:text-blue-700 font-medium">
                  Contact your administrator
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}