import { type NextRequest, NextResponse } from "next/server"
import { SignJWT } from "jose"

const HARDCODED_USERS = {
  admin: {
    username: "admin",
    password: "admin123",
    role: "admin",
    email: "admin@company.com",
    full_name: "System Administrator",
  },
  cre: {
    username: "cre",
    password: "cre123",
    role: "cre",
    email: "cre@company.com",
    full_name: "Customer Relationship Executive",
  },
  ps: {
    username: "ps",
    password: "ps123",
    role: "ps",
    email: "ps@company.com",
    full_name: "Pre-Sales Executive",
  },
  branchhead: {
    username: "branchhead",
    password: "branch123",
    role: "branch_head",
    email: "branchhead@company.com",
    full_name: "Branch Manager",
  },
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password } = body

    console.log("[v0] Login attempt for username:", username)

    const user = HARDCODED_USERS[username as keyof typeof HARDCODED_USERS]

    if (!user || user.password !== password) {
      console.log("[v0] Invalid credentials for username:", username)
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    console.log("[v0] User authenticated:", user.username, "Role:", user.role)

    const secret = new TextEncoder().encode("your-secret-key-here")
    const token = await new SignJWT({
      username: user.username,
      role: user.role,
      email: user.email,
      full_name: user.full_name,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(secret)

    console.log("[v0] JWT token created successfully")

    return NextResponse.json({
      access_token: token,
      token_type: "bearer",
      user: {
        username: user.username,
        role: user.role,
        email: user.email,
        full_name: user.full_name,
      },
    })
  } catch (error) {
    console.error("[v0] Login API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
