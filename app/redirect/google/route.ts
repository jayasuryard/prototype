import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import type { UserProfile } from "@/lib/models/user"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const error = searchParams.get("error")

  if (error) {
    console.error("OAuth error:", error)
    return NextResponse.redirect(new URL("/error?message=oauth_error", request.url))
  }

  if (!code) {
    console.error("No authorization code received")
    return NextResponse.redirect(new URL("/error?message=missing_code", request.url))
  }

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        code,
        grant_type: "authorization_code",
        redirect_uri: "http://localhost:3000/redirect/google",
      }),
    })

    if (!tokenResponse.ok) {
      throw new Error("Failed to exchange code for tokens")
    }

    const tokens = await tokenResponse.json()

    const profileResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    })

    if (!profileResponse.ok) {
      throw new Error("Failed to fetch user profile")
    }

    const profile = await profileResponse.json()

    // Create or update user in database
    const db = await getDatabase()
    console.log("✅ Database connection successful for user creation")

    const existingUser = await db.collection("users").findOne({ googleId: profile.id })
    
    if (!existingUser) {
      // Create new user document
      const newUser: Omit<UserProfile, '_id'> = {
        googleId: profile.id,
        email: profile.email,
        name: profile.name,
        picture: profile.picture,
        onboardingCompleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const result = await db.collection("users").insertOne(newUser)
      console.log("✅ New user created:", {
        insertedId: result.insertedId,
        googleId: profile.id,
        email: profile.email,
        name: profile.name,
      })
    } else {
      // Update existing user's basic info (in case name/picture changed)
      await db.collection("users").updateOne(
        { googleId: profile.id },
        {
          $set: {
            email: profile.email,
            name: profile.name,
            picture: profile.picture,
            updatedAt: new Date(),
          },
        }
      )
      console.log("✅ Existing user updated:", {
        googleId: profile.id,
        email: profile.email,
        name: profile.name,
      })
    }

    const jwt = require("jsonwebtoken")
    const token = jwt.sign(
      {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        picture: profile.picture,
      },
      process.env.NEXTAUTH_SECRET!,
      { expiresIn: "7d" },
    )

    // Redirect to onboarding if not completed, otherwise redirect to chat
    const redirectUrl = existingUser && existingUser.onboardingCompleted 
      ? `/chat?token=${token}` 
      : `/onboarding?token=${token}`
    
    const response = NextResponse.redirect(new URL(redirectUrl, request.url))
    return response
  } catch (error) {
    console.error("OAuth callback error:", error)
    return NextResponse.redirect(new URL("/error?message=auth_failed", request.url))
  }
}
