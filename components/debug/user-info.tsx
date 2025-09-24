"use client"

import { useEffect, useState } from 'react'
import { getUser } from '@/lib/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function UserInfoDebug() {
  const [userInfo, setUserInfo] = useState<any>(null)

  useEffect(() => {
    const user = getUser()
    setUserInfo(user)
  }, [])

  return (
    <Card className="fixed bottom-4 right-4 w-80 z-50">
      <CardHeader>
        <CardTitle className="text-sm">Debug: User Info</CardTitle>
      </CardHeader>
      <CardContent>
        <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
          {JSON.stringify(userInfo, null, 2)}
        </pre>
        <div className="mt-2 text-xs">
          <div>Role: {userInfo?.role || 'No role found'}</div>
          <div>Username: {userInfo?.username || 'No username'}</div>
        </div>
      </CardContent>
    </Card>
  )
}
