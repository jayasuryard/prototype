import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import jwt from "jsonwebtoken"
import type { UserProfile } from "@/lib/models/user"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    const authToken = authHeader ? authHeader.replace(/^Bearer /i, "").trim() : null
    if (!authToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const decoded = jwt.verify(authToken, process.env.NEXTAUTH_SECRET || "fallback-secret") as any
    console.log("Profile request from user:", decoded.id)

    const db = await getDatabase()

    const userProfile = (await db.collection("users").findOne({ googleId: decoded.id })) as UserProfile | null

    if (!userProfile) {
      console.log("User profile not found for:", decoded.id)
      return NextResponse.json({ error: "User profile not found" }, { status: 404 })
    }

    console.log("User profile found:", {
      hasOnboardingData: !!userProfile.onboardingData,
      hasPersonalizedPrompt: !!userProfile.personalizedPrompt,
      onboardingCompleted: userProfile.onboardingCompleted,
    })

    const { _id, ...profileData } = userProfile
    return NextResponse.json({
      userData: profileData,
      personalizedPrompt: userProfile.personalizedPrompt,
    })
  } catch (error) {
    console.error("Profile fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
  }
}
