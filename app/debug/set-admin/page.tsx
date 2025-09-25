"use client"

import { useState } from 'react'
import { setUser } from '@/lib/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function SetAdminPage() {
  const [username, setUsername] = useState('admin')
  const [email, setEmail] = useState('admin@epiccrm.com')
  const [isSet, setIsSet] = useState(false)

  const handleSetAdmin = () => {
    const adminUser = {
      username: username,
      role: 'admin',
      email: email,
      access_token: 'admin_token_' + Date.now()
    }
    
    setUser(adminUser)
    setIsSet(true)
    
    // Redirect to team leaders page after 2 seconds
    setTimeout(() => {
      window.location.href = '/admin/manage-team-leaders'
    }, 2000)
  }

  return (
    <div className="container mx-auto p-6 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Set Admin Role</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
            />
          </div>
          
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email"
            />
          </div>
          
          <Button onClick={handleSetAdmin} className="w-full">
            Set as Admin User
          </Button>
          
          {isSet && (
            <div className="p-3 bg-green-100 border border-green-300 rounded text-green-800">
              ✅ Admin role set successfully! Redirecting to team leaders page...
            </div>
          )}
          
          <div className="text-sm text-gray-600">
            <p><strong>Note:</strong> This will set your role as "admin" in localStorage.</p>
            <p>After clicking the button, you'll be redirected to the team leaders management page.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
