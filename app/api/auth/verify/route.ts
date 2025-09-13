import { type NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"

const JWT_SECRET = "your-secret-key-here"

const USERS = {
  admin: { username: "admin", role: "admin", first_name: "Admin", last_name: "User" },
  cre: { username: "cre", role: "cre", first_name: "Customer", last_name: "Executive" },
  ps: { username: "ps", role: "ps", first_name: "Pre", last_name: "Sales" },
  branchhead: { username: "branchhead", role: "branch_head", first_name: "Branch", last_name: "Manager" },
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 })
    }

    const token = authHeader.substring(7)

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any
      const user = USERS[decoded.username as keyof typeof USERS]

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 401 })
      }

      return NextResponse.json({
        user: {
          username: user.username,
          role: user.role,
          first_name: user.first_name,
          last_name: user.last_name,
        },
      })
    } catch (jwtError) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }
  } catch (error) {
    console.error("Token verification error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
