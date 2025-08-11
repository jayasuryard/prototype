import { type NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { getDatabase } from "@/lib/mongodb"
import { generatePersonalizedPrompt, type UserProfile } from "@/lib/models/user"

export async function POST(request: NextRequest) {
  try {
    const authToken = request.cookies.get("auth-token")?.value

    if (!authToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const decoded = jwt.verify(authToken, process.env.NEXTAUTH_SECRET || "fallback-secret") as any
    const onboardingData = await request.json()

    // Generate personalized prompt based on user data
    const personalizedPrompt = generatePersonalizedPrompt(onboardingData)

    const db = await getDatabase()
    await db.collection("users").updateOne(
      { googleId: decoded.id },
      {
        $set: {
          onboardingData,
          personalizedPrompt,
          onboardingCompleted: true,
          updatedAt: new Date(),
        },
      },
    )

    return NextResponse.json({
      success: true,
      message: "Onboarding completed successfully",
    })
  } catch (error) {
    console.error("Onboarding API error:", error)
    return NextResponse.json({ error: "Failed to save onboarding data" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const authToken = request.cookies.get("auth-token")?.value

    if (!authToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const decoded = jwt.verify(authToken, process.env.NEXTAUTH_SECRET || "fallback-secret") as any

    const db = await getDatabase()
    const userProfile = (await db.collection("users").findOne({ googleId: decoded.id })) as UserProfile | null

    if (!userProfile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    return NextResponse.json(userProfile)
  } catch (error) {
    console.error("Get profile API error:", error)
    return NextResponse.json({ error: "Failed to get user profile" }, { status: 500 })
  }
}
