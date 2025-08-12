import { type NextRequest, NextResponse } from "next/server"
import Groq from "groq-sdk"
import { getDatabase } from "@/lib/mongodb"
import jwt from "jsonwebtoken"
import { promptManager, type AgentType, type MessageCategory } from "@/lib/promptManager"

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { message, agent } = await request.json()
    const authHeader = request.headers.get("authorization")
    const authToken = authHeader ? authHeader.replace(/^Bearer /i, "").trim() : null

    if (!authToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!message || !agent) {
      return NextResponse.json({ error: "Message and agent are required" }, { status: 400 })
    }

    // Validate agent type
    if (!promptManager.isValidAgent(agent)) {
      return NextResponse.json({ error: "Invalid agent selected" }, { status: 400 })
    }

    // Categorize the message and get appropriate response guidance
    const messageAnalysis = promptManager.categorizeMessage(message)

    // Handle empty messages
    if (messageAnalysis.category === 'empty') {
      return NextResponse.json({ 
        response: "Please share your health concern or question so I can help you better."
      })
    }

    // Handle overly long messages
    if (messageAnalysis.category === 'too_long') {
      return NextResponse.json({ 
        response: "Your message seems quite long. Could you please share your main health concern in a shorter message so I can help you better?"
      })
    }

    // Handle emergency situations immediately
    if (messageAnalysis.category === 'emergency') {
      return NextResponse.json({ 
        response: promptManager.getEmergencyResponse()
      })
    }

    // Handle dangerous advice requests
    if (messageAnalysis.category === 'dangerous') {
      return NextResponse.json({ 
        response: promptManager.getDangerousAdviceResponse()
      })
    }

    // Handle inappropriate content
    if (messageAnalysis.category === 'inappropriate') {
      return NextResponse.json({ 
        response: promptManager.getInappropriateContentResponse()
      })
    }

    // Handle non-health queries
    if (messageAnalysis.category === 'non_health') {
      return NextResponse.json({ 
        response: promptManager.getNonHealthContentResponse()
      })
    }

    const decoded = jwt.verify(authToken, process.env.NEXTAUTH_SECRET || "fallback-secret") as any
    console.log("💬 Chat request from user:", decoded.id, "with agent:", agent, "category:", messageAnalysis.category)

    const db = await getDatabase()
    const userProfile = await db.collection("users").findOne({ googleId: decoded.id })

    console.log("User profile for chat:", {
      found: !!userProfile,
      hasPersonalizedPrompt: !!userProfile?.personalizedPrompt,
      onboardingCompleted: userProfile?.onboardingCompleted,
    })

    // Get agent configuration from prompt manager
    const agentConfig = promptManager.getAgent(agent)
    if (!agentConfig) {
      return NextResponse.json({ error: "Agent configuration not found" }, { status: 500 })
    }

    // Check if user is a medical professional
    const isMedico = userProfile?.onboardingData?.profession === "medico"
    const isForPractice = userProfile?.onboardingData?.usage === "practice"
    
    // Get appropriate system prompt based on user type
    const userName = userProfile?.name ? userProfile.name.split(' ')[0] : undefined // Get first name
    const systemPrompt = promptManager.getAgentSystemPrompt(agent, isMedico, userName)

    console.log("👩‍⚕️ User profile analysis:", {
      isMedico,
      isForPractice,
      userName,
      userProfileName: userProfile?.name,
      usingMedicoPrompt: isMedico && agentConfig.systemPromptMedico,
      promptContainsName: userName ? systemPrompt.includes(userName) : 'No name to check',
      promptContainsFallback: systemPrompt.includes('Doctor') || systemPrompt.includes('Colleague')
    })

    // Build personalized context based on message category
    let personalizedContext = ""
    let responsePrefix = ""
    
    if (messageAnalysis.category === 'greeting' && userProfile?.name) {
      // For greetings, add personalized greeting prefix
      responsePrefix = promptManager.getPersonalizedGreeting(agent, userProfile.name)
      console.log("👋 Using personalized greeting for simple message")
    } else if (promptManager.needsPersonalization(message) && userProfile?.personalizedPrompt) {
      // For health-related questions, use full personalized context
      personalizedContext = `\n\nUser Context: ${userProfile.personalizedPrompt}`
      console.log("✅ Using full personalized context for health-related query")
    } else {
      console.log("💬 Using standard response without personalization")
    }

    // Add response guidance based on message category
    if (messageAnalysis.guidance?.guidance) {
      personalizedContext += `\n\nGUIDANCE: ${messageAnalysis.guidance.guidance}`
    }

    // Retrieve conversation history for current agent to maintain continuity
    const recentMessages = await db.collection("chat_messages")
      .find({ 
        userId: decoded.id, 
        agent: agent 
      })
      .sort({ timestamp: -1 })
      .limit(10) // Get last 10 messages for context
      .toArray()

    // Prepare messages for AI including conversation history
    const messages: Array<{role: "system" | "user" | "assistant", content: string}> = [
      {
        role: "system",
        content: systemPrompt + personalizedContext,
      }
    ]

    // Add conversation history (oldest first)
    const historyMessages = recentMessages.reverse()
    for (const historyMsg of historyMessages) {
      messages.push({
        role: "user",
        content: historyMsg.userMessage,
      })
      messages.push({
        role: "assistant",
        content: historyMsg.botResponse,
      })
    }

    // Add current user message last
    messages.push({
      role: "user",
      content: message,
    })

    console.log("🤖 Sending request to Groq...")
    const completion = await groq.chat.completions.create({
      messages,
      model: "gemma2-9b-it",
      temperature: 0.7,
      max_tokens: 1000,
    })

    let response =
      completion.choices[0]?.message?.content || "I apologize, but I couldn't generate a response. Please try again."

    // Clean up response formatting
    response = response
      .replace(/\*\*(.*?)\*\*/g, "$1") // Remove bold markdown
      .replace(/\*(.*?)\*/g, "$1") // Remove italic markdown
      .replace(/`(.*?)`/g, "$1") // Remove code markdown
      .replace(/#{1,6}\s/g, "") // Remove headers
      .replace(/\[(.*?)\]$$.*?$$/g, "$1") // Convert links to plain text
      .replace(/^\s*[-*+]\s/gm, "• ") // Convert bullet points
      .replace(/^\s*\d+\.\s/gm, "") // Remove numbered lists
      .trim()

    // Add personalized greeting prefix for simple greetings
    if (responsePrefix) {
      response = responsePrefix + response
    }

    // Save chat message to database
    const chatMessage = {
      userId: decoded.id,
      agent: agent as AgentType,
      userMessage: message,
      aiResponse: response,
      timestamp: new Date(),
      messageCategory: messageAnalysis.category,
      flagged: false, // Emergency and inappropriate are handled earlier
      agentConfig: {
        name: agentConfig.name,
        greetingStyle: agentConfig.greetingStyle,
        responseLength: agentConfig.responseLength
      }
    }

    await db.collection("chat_messages").insertOne(chatMessage)
    console.log(`💾 Chat message saved - Category: ${messageAnalysis.category}, Agent: ${agentConfig.name}`)

    return NextResponse.json({ 
      response,
      metadata: {
        agent: agentConfig.name,
        category: messageAnalysis.category,
        personalized: !!responsePrefix || !!personalizedContext
      }
    })
  } catch (error) {
    console.error("❌ Chat API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
