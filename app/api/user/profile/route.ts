import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import jwt from "jsonwebtoken"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    const authToken = authHeader ? authHeader.replace(/^Bearer /i, "").trim() : null

    if (!authToken) {
      console.error("❌ No authorization token provided for profile")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const decoded = jwt.verify(authToken, process.env.NEXTAUTH_SECRET || "fallback-secret") as any
    console.log("👤 Profile request from user:", decoded.id)

    const db = await getDatabase()
    console.log("🔍 Searching for user profile...")

    const userProfile = await db.collection("users").findOne({ googleId: decoded.id })

    if (!userProfile) {
      console.error("❌ User profile not found for:", decoded.id)

      const totalUsers = await db.collection("users").countDocuments()
      console.log(`📊 Total users in database: ${totalUsers}`)

      return NextResponse.json({ error: "User profile not found" }, { status: 404 })
    }

    console.log("✅ User profile found:", {
      googleId: userProfile.googleId,
      email: userProfile.email,
      hasOnboardingData: !!userProfile.onboardingData,
      hasPersonalizedPrompt: !!userProfile.personalizedPrompt,
      onboardingCompleted: userProfile.onboardingCompleted,
    })

    const { _id, ...profileData } = userProfile
    return NextResponse.json({
      userData: profileData,
      personalizedPrompt: userProfile.personalizedPrompt,
      profile: {
        name: userProfile.name,
        email: userProfile.email,
        picture: userProfile.picture
      },
      onboardingData: userProfile.onboardingData
    })
  } catch (error) {
    console.error("❌ Profile fetch error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch profile",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
