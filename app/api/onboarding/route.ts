import { type NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { getDatabase } from "@/lib/mongodb"
import { generatePersonalizedPrompt, type UserProfile } from "@/lib/models/user"

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    const authToken = authHeader ? authHeader.replace(/^Bearer /i, "").trim() : null
    if (!authToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const decoded = jwt.verify(authToken, process.env.NEXTAUTH_SECRET || "fallback-secret") as any
    const onboardingData = await request.json()

    console.log("Received onboarding data for user:", decoded.id)
    console.log("Onboarding data structure:", JSON.stringify(onboardingData, null, 2))

    let heightInCm = undefined
    if (onboardingData.heightFeet && onboardingData.heightInches !== undefined) {
      heightInCm = Math.round((onboardingData.heightFeet * 12 + onboardingData.heightInches) * 2.54)
    }

    const structuredOnboardingData = {
      dateOfBirth: onboardingData.dateOfBirth,
      age: onboardingData.age,
      profession: onboardingData.profession,
      ...(onboardingData.usage && { usage: onboardingData.usage }),
      ...(onboardingData.specialty && { specialty: onboardingData.specialty }),
      ...(onboardingData.experienceYears && { experienceYears: onboardingData.experienceYears }),
      ...(onboardingData.gender && { gender: onboardingData.gender }),
      ...(heightInCm && { height: heightInCm }),
      ...(onboardingData.weight && { weight: onboardingData.weight }),
      ...(onboardingData.habits && {
        habits: Array.isArray(onboardingData.habits) ? onboardingData.habits.join(", ") : onboardingData.habits,
      }),
      ...(onboardingData.mealsPerDay && { mealsPerDay: onboardingData.mealsPerDay }),
      ...(onboardingData.waterIntake && { waterIntake: onboardingData.waterIntake }),
      ...(onboardingData.exerciseRoutine && {
        exerciseRoutine: Array.isArray(onboardingData.exerciseRoutine)
          ? onboardingData.exerciseRoutine.join(", ")
          : onboardingData.exerciseRoutine,
      }),
    }

    // Generate personalized prompt based on user data
    const personalizedPrompt = generatePersonalizedPrompt(structuredOnboardingData)

    console.log("Generated personalized prompt:", personalizedPrompt)

    const db = await getDatabase()
    const result = await db.collection("users").updateOne(
      { googleId: decoded.id },
      {
        $set: {
          onboardingData: structuredOnboardingData,
          personalizedPrompt,
          onboardingCompleted: true,
          updatedAt: new Date(),
        },
      },
    )

    console.log("Onboarding update result:", {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    })

    const updatedUser = await db.collection("users").findOne({ googleId: decoded.id })
    console.log("User after onboarding update:", {
      onboardingCompleted: updatedUser?.onboardingCompleted,
      hasOnboardingData: !!updatedUser?.onboardingData,
      hasPersonalizedPrompt: !!updatedUser?.personalizedPrompt,
    })

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
    const authHeader = request.headers.get("authorization")
    const authToken = authHeader ? authHeader.replace(/^Bearer /i, "").trim() : null
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
