"use client"

import { GoogleLoginButton } from "@/components/google-login-button"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function HomePage() {
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem("auth-token")
        const response = await fetch("/api/auth/check", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        const data = await response.json()

        if (data.authenticated) {
          if (data.hasOnboarding) {
            router.push("/chat")
          } else {
            router.push("/onboarding")
          }
        }
      } catch (error) {
        console.error("Auth check failed:", error)
      } finally {
        setIsChecking(false)
      }
    }

    checkAuth()
  }, [router])

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Jiva-Suri</h1>
          <p className="text-lg text-gray-600 mb-8">Your Personalized Healthcare AI Assistant</p>
          <div className="space-y-4 text-sm text-gray-600">
            <div className="bg-white/50 rounded-lg p-4 border border-green-200">
              <p className="font-semibold text-green-700">Jiva</p>
              <p>Ayurvedic wisdom and holistic health guidance</p>
            </div>
            <div className="bg-white/50 rounded-lg p-4 border border-blue-200">
              <p className="font-semibold text-blue-700">Suri</p>
              <p>Modern allopathic medical expertise</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <GoogleLoginButton />
        </div>

        <p className="text-xs text-center text-gray-400">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  )
}
