"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function DebugAPIPage() {
  const [testResult, setTestResult] = useState<string>('')
  const [creTestResult, setCRETestResult] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const testBasicAPI = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/test', {
        method: 'GET',
      })
      const data = await response.json()
      setTestResult(JSON.stringify(data, null, 2))
    } catch (error) {
      setTestResult(`Error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const testCREAPI = async () => {
    setLoading(true)
    try {
      // Test GET request first
      const getResponse = await fetch('/api/cre-users', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer test-token',
          'Content-Type': 'application/json',
        },
      })
      
      if (getResponse.ok) {
        const data = await getResponse.json()
        setCRETestResult(`GET Success: ${JSON.stringify(data, null, 2)}`)
      } else {
        const errorText = await getResponse.text()
        setCRETestResult(`GET Error (${getResponse.status}): ${errorText}`)
      }
    } catch (error) {
      setCRETestResult(`Error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const testFastAPIDirectly = async () => {
    setLoading(true)
    try {
      const response = await fetch('http://localhost:8000/api/cre-users', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer test-token',
          'Content-Type': 'application/json',
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        setCRETestResult(`Direct FastAPI Success: ${JSON.stringify(data, null, 2)}`)
      } else {
        const errorText = await response.text()
        setCRETestResult(`Direct FastAPI Error (${response.status}): ${errorText}`)
      }
    } catch (error) {
      setCRETestResult(`Direct FastAPI Error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">API Debug Page</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Test Basic API</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={testBasicAPI} 
                disabled={loading}
                className="w-full"
              >
                Test /api/test
              </Button>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-40">
                {testResult || 'No test run yet'}
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Test CRE API</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Button 
                  onClick={testCREAPI} 
                  disabled={loading}
                  className="w-full"
                >
                  Test /api/cre-users (via Next.js)
                </Button>
                <Button 
                  onClick={testFastAPIDirectly} 
                  disabled={loading}
                  className="w-full bg-orange-500 hover:bg-orange-600"
                >
                  Test FastAPI Directly (port 8000)
                </Button>
              </div>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-40">
                {creTestResult || 'No test run yet'}
              </pre>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Troubleshooting Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li><strong>Restart Next.js:</strong> Stop the Next.js server (Ctrl+C) and run <code>npm run dev</code> again</li>
              <li><strong>Check FastAPI:</strong> Make sure FastAPI is running on <code>http://localhost:8000</code></li>
              <li><strong>Test FastAPI directly:</strong> Go to <code>http://localhost:8000/docs</code> to see if FastAPI is running</li>
              <li><strong>Clear cache:</strong> Try opening in incognito mode or clear browser cache</li>
              <li><strong>Check ports:</strong> Make sure no other services are using ports 3000 or 8000</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
