import { type NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { getDatabase } from "@/lib/mongodb"
import type { UserProfile } from "@/lib/models/user"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")

  if (!code) {
    console.error("❌ No authorization code provided")
    return NextResponse.redirect("/error?message=No authorization code")
  }

  try {
    console.log("🔄 Starting OAuth callback process...")

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
        code,
        grant_type: "authorization_code",
        redirect_uri: "https://v0-image-analysis-phi-one-61.vercel.app/redirect/google",
      }),
    })

    const tokens = await tokenResponse.json()

    if (!tokens.access_token) {
      throw new Error("No access token received")
    }

    const userResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    })

    const user = await userResponse.json()

    console.log("👤 Google user data received:", { id: user.id, email: user.email, name: user.name })

    console.log("🔌 Connecting to database...")
    const db = await getDatabase()
    console.log("✅ Database connection established")

    const existingUser = (await db.collection("users").findOne({ googleId: user.id })) as UserProfile | null
    console.log("🔍 Existing user check:", existingUser ? "Found existing user" : "New user")

    const userData = {
      googleId: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture,
      updatedAt: new Date(),
    }

    const insertData = {
      createdAt: new Date(),
      onboardingCompleted: false,
    }

    console.log("💾 Attempting to save user data:", userData)

    const result = await db.collection("users").updateOne(
      { googleId: user.id },
      {
        $set: userData,
        $setOnInsert: insertData,
      },
      { upsert: true },
    )

    console.log("✅ User upsert completed:", {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      upsertedCount: result.upsertedCount,
      upsertedId: result.upsertedId,
      acknowledged: result.acknowledged,
    })

    const savedUser = (await db.collection("users").findOne({ googleId: user.id })) as UserProfile | null
    if (!savedUser) {
      console.error("❌ User was not saved to database!")
      throw new Error("Failed to save user to database")
    }

    console.log("✅ User verified in database:", {
      googleId: savedUser.googleId,
      email: savedUser.email,
      onboardingCompleted: savedUser.onboardingCompleted,
    })

    const jwtToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
      },
      process.env.NEXTAUTH_SECRET || "fallback-secret",
      { expiresIn: "7d" },
    )

    const redirectUrl = savedUser?.onboardingCompleted
      ? `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/chat?token=${jwtToken}`
      : `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/onboarding?token=${jwtToken}`

    console.log("🔄 Redirecting to:", redirectUrl)
    return NextResponse.redirect(redirectUrl)
  } catch (error) {
    console.error("❌ OAuth callback error:", error)
    return NextResponse.redirect(`/error?message=Authentication failed: ${error}`)
  }
}
