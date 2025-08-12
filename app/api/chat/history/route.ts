import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import jwt from "jsonwebtoken"

export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    const authToken = authHeader ? authHeader.replace(/^Bearer /i, "").trim() : null

    if (!authToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const decoded = jwt.verify(authToken, process.env.NEXTAUTH_SECRET || "fallback-secret") as any
    console.log("🗑️ Clear chat history request from user:", decoded.id)

    const db = await getDatabase()
    
    // Delete all chat messages for this user
    const result = await db.collection("chat_messages").deleteMany({ 
      userId: decoded.id 
    })

    console.log(`✅ Cleared ${result.deletedCount} chat messages for user ${decoded.id}`)

    return NextResponse.json({ 
      success: true, 
      deletedCount: result.deletedCount,
      message: "Chat history cleared successfully"
    })
  } catch (error) {
    console.error("❌ Clear chat history error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// GET endpoint to get chat history for current agent
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    const authToken = authHeader ? authHeader.replace(/^Bearer /i, "").trim() : null

    if (!authToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const agent = searchParams.get("agent")
    const limit = parseInt(searchParams.get("limit") || "50")

    const decoded = jwt.verify(authToken, process.env.NEXTAUTH_SECRET || "fallback-secret") as any

    const db = await getDatabase()
    
    const query: any = { userId: decoded.id }
    if (agent) {
      query.agent = agent
    }

    const messages = await db.collection("chat_messages")
      .find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray()

    return NextResponse.json({ 
      messages: messages.reverse(), // Reverse to show oldest first
      count: messages.length
    })
  } catch (error) {
    console.error("❌ Get chat history error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
