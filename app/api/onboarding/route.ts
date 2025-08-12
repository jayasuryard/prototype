import { type NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { getDatabase } from "@/lib/mongodb"
import { generatePersonalizedPrompt, type UserProfile } from "@/lib/models/user"

export async function POST(request: NextRequest) {
  try {
    console.log("📝 Onboarding POST request received")
    console.log("🌍 Environment check:", {
      hasMongoUri: !!process.env.MONGODB_URI,
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
      nodeEnv: process.env.NODE_ENV,
    })

    const authHeader = request.headers.get("authorization")
    const authToken = authHeader ? authHeader.replace(/^Bearer /i, "").trim() : null

    if (!authToken) {
      console.error("❌ No authorization token provided")
      return NextResponse.json({ error: "Unauthorized - No token provided" }, { status: 401 })
    }

    let decoded
    try {
      decoded = jwt.verify(authToken, process.env.NEXTAUTH_SECRET || "fallback-secret") as any
      console.log("✅ JWT token verified for user:", decoded.id)
    } catch (jwtError) {
      console.error("❌ JWT verification failed:", jwtError)
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 })
    }

    let onboardingData
    try {
      onboardingData = await request.json()
      console.log("📊 Onboarding data received:", JSON.stringify(onboardingData, null, 2))
    } catch (parseError) {
      console.error("❌ Failed to parse request body:", parseError)
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 })
    }

    console.log("📝 Received onboarding data for user:", decoded.id)
    console.log("📊 Onboarding data:", JSON.stringify(onboardingData, null, 2))

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

    let db
    try {
      console.log("🔌 Connecting to database for onboarding...")
      db = await getDatabase()
      console.log("✅ Database connection successful")
    } catch (dbError) {
      console.error("❌ Database connection failed:", dbError)
      return NextResponse.json(
        {
          error: "Database connection failed",
          details: dbError instanceof Error ? dbError.message : "Unknown database error",
        },
        { status: 500 },
      )
    }

    const existingUser = await db.collection("users").findOne({ googleId: decoded.id })
    if (!existingUser) {
      console.error("❌ User not found for onboarding:", decoded.id)
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    console.log("✅ User found for onboarding update")

    console.log("💾 Saving onboarding data...")
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

    console.log("✅ Onboarding update result:", {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      acknowledged: result.acknowledged,
    })

    if (result.matchedCount === 0) {
      console.error("❌ No user matched for onboarding update")
      return NextResponse.json({ error: "User not found for update" }, { status: 404 })
    }

    if (result.modifiedCount === 0) {
      console.warn("⚠️ No documents were modified during onboarding update")
    }

    const updatedUser = await db.collection("users").findOne({ googleId: decoded.id })
    console.log("✅ User after onboarding update:", {
      onboardingCompleted: updatedUser?.onboardingCompleted,
      hasOnboardingData: !!updatedUser?.onboardingData,
      hasPersonalizedPrompt: !!updatedUser?.personalizedPrompt,
    })

    return NextResponse.json({
      success: true,
      message: "Onboarding completed successfully",
    })
  } catch (error) {
    console.error("❌ Onboarding API critical error:", error)
    return NextResponse.json(
      {
        error: "Failed to save onboarding data",
        details: error instanceof Error ? error.message : "Unknown error",
        stack: process.env.NODE_ENV === "development" ? (error instanceof Error ? error.stack : undefined) : undefined,
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Simple health check first
    const url = new URL(request.url)
    if (url.searchParams.get("test") === "true") {
      return NextResponse.json({
        status: "OK",
        message: "Onboarding API is accessible",
        timestamp: new Date().toISOString(),
        env: {
          hasMongoUri: !!process.env.MONGODB_URI,
          hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
        },
      })
    }

    const authHeader = request.headers.get("authorization")
    const authToken = authHeader ? authHeader.replace(/^Bearer /i, "").trim() : null

    if (!authToken) {
      console.error("❌ No authorization token provided for GET profile")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let decoded
    try {
      decoded = jwt.verify(authToken, process.env.NEXTAUTH_SECRET || "fallback-secret") as any
    } catch (jwtError) {
      console.error("❌ JWT verification failed:", jwtError)
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    console.log("🔍 Getting profile for user:", decoded.id)

    let db
    try {
      db = await getDatabase()
      console.log("✅ Database connection successful for profile GET")
    } catch (dbError) {
      console.error("❌ Database connection failed:", dbError)
      return NextResponse.json(
        {
          error: "Database connection failed",
          details: dbError instanceof Error ? dbError.message : "Unknown database error",
        },
        { status: 500 },
      )
    }

    const userProfile = (await db.collection("users").findOne({ googleId: decoded.id })) as UserProfile | null

    if (!userProfile) {
      console.error("❌ Profile not found for user:", decoded.id)
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    console.log("✅ Profile found for user:", decoded.id)
    return NextResponse.json(userProfile)
  } catch (error) {
    console.error("❌ Get profile API error:", error)
    return NextResponse.json(
      {
        error: "Failed to get user profile",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
