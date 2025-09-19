import { type NextRequest, NextResponse } from "next/server"

const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8000"

// Proxy login to FastAPI so roles/users are verified server-side (no hashes on client)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const resp = await fetch(`${FASTAPI_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

    const text = await resp.text()
    if (!resp.ok) {
      return NextResponse.json({ error: 'Invalid username or password', body: text }, { status: resp.status })
    }
    try {
      const data = JSON.parse(text)
      const res = NextResponse.json(data)
      if (data.access_token) {
        res.cookies.set('access_token', data.access_token, {
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
          secure: false, // set true in production with HTTPS
          maxAge: 60 * 60 * 24,
        })
      }
      return res
    } catch {
      return NextResponse.json({ ok: true }, { status: 200 })
    }
  } catch (error) {
    console.error("[proxy] Login API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
