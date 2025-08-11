import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }
    // Expecting: Bearer <sessionId>
    const sessionId = authHeader.replace(/^Bearer /i, "").trim()
    if (!sessionId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }
    const { db } = await connectToDatabase()
    // Find user by session
    const session = await db.collection("sessions").findOne({ sessionId })
    if (!session) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 })
    }
    // Get user profile
    const userProfile = await db.collection("users").findOne({ googleId: session.googleId })
    if (!userProfile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 })
    }
    // Return user profile data (excluding sensitive info)
    const { _id, ...profileData } = userProfile
    return NextResponse.json({ userData: profileData })
  } catch (error) {
    console.error("Profile fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
  }
}
