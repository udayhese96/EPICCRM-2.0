"use client"

import { useEffect, useState } from 'react'
import { getUser } from '@/lib/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function UserDebugPage() {
  const [userInfo, setUserInfo] = useState<any>(null)
  const [localStorageData, setLocalStorageData] = useState<string>('')

  useEffect(() => {
    const user = getUser()
    setUserInfo(user)
    
    // Also show raw localStorage data
    if (typeof window !== 'undefined') {
      const rawData = localStorage.getItem('user')
      setLocalStorageData(rawData || 'No data found')
    }
  }, [])

  const clearUserData = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user')
      setUserInfo(null)
      setLocalStorageData('')
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">User Debug Information</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Current User Info</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 p-4 rounded text-sm">
            {JSON.stringify(userInfo, null, 2)}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Raw LocalStorage Data</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 p-4 rounded text-sm">
            {localStorageData}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Role Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div><strong>Role:</strong> {userInfo?.role || 'No role found'}</div>
            <div><strong>Username:</strong> {userInfo?.username || 'No username'}</div>
            <div><strong>Email:</strong> {userInfo?.email || 'No email'}</div>
            <div><strong>Is Admin:</strong> {userInfo?.role === 'admin' ? '✅ Yes' : '❌ No'}</div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={clearUserData} variant="destructive">
        Clear User Data (Logout)
      </Button>
    </div>
  )
}
