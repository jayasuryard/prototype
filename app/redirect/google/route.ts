import { type NextRequest, NextResponse } from "next/server"

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
        redirect_uri: "https://v0-image-analysis-phi-one-61.vercel.app/redirect/google",
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

  const response = NextResponse.redirect(new URL(`/onboarding?token=${token}`, request.url))
  return response
  } catch (error) {
    console.error("OAuth callback error:", error)
    return NextResponse.redirect(new URL("/error?message=auth_failed", request.url))
  }
}
