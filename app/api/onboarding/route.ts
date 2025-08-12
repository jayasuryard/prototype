import { type NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { getDatabase } from "@/lib/mongodb"

function generatePersonalizedPrompt(data: any): string {
  let prompt = `User Profile: ${data.age} year old ${data.profession === "medico" ? "medical professional" : "individual"}`

  if (data.gender) prompt += `, ${data.gender}`
  if (data.height && data.weight) prompt += `, ${data.height}cm tall, ${data.weight}kg`
  if (data.habits) prompt += `. Lifestyle: ${data.habits}`
  if (data.exerciseRoutine) prompt += `. Exercise: ${data.exerciseRoutine}`
  if (data.mealsPerDay) prompt += `. Eats ${data.mealsPerDay} meals per day`
  if (data.waterIntake) prompt += `, drinks ${data.waterIntake} glasses of water daily`

  return prompt + ". Please provide personalized health advice based on this profile."
}

export async function POST(request: NextRequest) {
  try {
    console.log("📝 Onboarding POST request received")

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

    const onboardingData = await request.json()
    console.log("📊 Onboarding data received:", JSON.stringify(onboardingData, null, 2))

    let heightInCm = undefined
    if (onboardingData.heightFeet && onboardingData.heightInches !== undefined) {
      heightInCm = Math.round((onboardingData.heightFeet * 12 + onboardingData.heightInches) * 2.54)
    }

    const structuredData = {
      dateOfBirth: onboardingData.dateOfBirth,
      age: onboardingData.age,
      profession: onboardingData.profession,
      gender: onboardingData.gender,
      height: heightInCm,
      weight: onboardingData.weight,
      habits: Array.isArray(onboardingData.habits) ? onboardingData.habits.join(", ") : onboardingData.habits,
      mealsPerDay: onboardingData.mealsPerDay,
      waterIntake: onboardingData.waterIntake,
      exerciseRoutine: Array.isArray(onboardingData.exerciseRoutine)
        ? onboardingData.exerciseRoutine.join(", ")
        : onboardingData.exerciseRoutine,
      sleepHours: onboardingData.sleepHours,
      stressLevel: onboardingData.stressLevel,
      dietType: onboardingData.dietType,
      medicalConditions: Array.isArray(onboardingData.medicalConditions)
        ? onboardingData.medicalConditions.join(", ")
        : onboardingData.medicalConditions,
      // Medical professional specific fields
      ...(onboardingData.usage && { usage: onboardingData.usage }),
      ...(onboardingData.specialty && { specialty: onboardingData.specialty }),
      ...(onboardingData.experienceYears && { experienceYears: onboardingData.experienceYears }),
    }

    const personalizedPrompt = generatePersonalizedPrompt(structuredData)
    console.log("Generated personalized prompt:", personalizedPrompt)

    const db = await getDatabase()
    console.log("✅ Database connection successful")

    const existingUser = await db.collection("users").findOne({ googleId: decoded.id })
    if (!existingUser) {
      console.error("❌ User not found for onboarding:", decoded.id)
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    console.log("💾 Updating user with onboarding data...")
    const result = await db.collection("users").updateOne(
      { googleId: decoded.id },
      {
        $set: {
          onboardingData: structuredData,
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
      return NextResponse.json({ error: "User not found for update" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: "Onboarding completed successfully",
    })
  } catch (error) {
    console.error("❌ Onboarding API error:", error)
    return NextResponse.json(
      {
        error: "Failed to save onboarding data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    if (url.searchParams.get("test") === "true") {
      return NextResponse.json({
        status: "OK",
        message: "Onboarding API is accessible",
        timestamp: new Date().toISOString(),
      })
    }

    return NextResponse.json({ error: "Method not allowed" }, { status: 405 })
  } catch (error) {
    console.error("❌ Onboarding GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
