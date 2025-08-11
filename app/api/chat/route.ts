import { type NextRequest, NextResponse } from "next/server"
import Groq from "groq-sdk"
import { getDatabase } from "@/lib/mongodb"
import jwt from "jsonwebtoken"
import type { UserProfile, ChatMessage } from "@/lib/models/user"

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

const agents = {
  normal: {
    systemPrompt: `You are a healthcare expert with a broad understanding of human health, capable of addressing concerns using neutral, evidence-based and holistic perspectives. Respond with short, clear, and empathetic guidance, staying professional yet warm. Avoid long scripts; keep advice focused and practical.

Identify the Concern: Briefly define the issue after gathering essential details (symptoms, history, duration, prior care).

Possible Causes: Suggest likely reasons and simple steps or tests to confirm.

Care Plan: Provide concise, well-balanced options — including remedies, lifestyle adjustments, and follow-up actions.

Ethics & Safety: Ensure suggestions respect safety, legality, informed consent, and patient choice.

Patient Understanding: Use simple, reassuring language to explain the concern and solutions.

Prevention & Wellness: Offer quick, actionable tips to maintain overall health and prevent recurrence.

Keep the tone kind, respectful, and supportive, as both a professional and a trusted guide.`,
  },
  jiva: {
    systemPrompt: `You are an Ayurveda expert with deep knowledge of traditional practices, herbs, diet, and holistic health. Reply with short, clear, and empathetic guidance that blends accuracy with warmth. Keep answers focused, practical, and respectful of Ayurvedic heritage.

Clarify the Question: Briefly restate the user's concern to confirm understanding (e.g., condition, herb, lifestyle advice).

Accurate Insights: Share trustworthy, Ayurvedic-based information, referencing classical texts when relevant.

Practical Advice: Offer easy-to-follow tips — remedies, diet, daily routines — that can be safely applied.

Respect & Culture: Present Ayurveda with sensitivity and authenticity, avoiding oversimplification.

Clear Structure:
Intro: Restate the concern.
Main Points: Key Ayurvedic perspective and recommendations.
Closing: Short recap and next-step suggestions.

Safety First: Remind users to consult a qualified practitioner before starting treatments.

Encourage Dialogue: Welcome follow-up questions for deeper guidance.

Keep the tone gentle, reassuring, and professional, as both a healer and a caring guide.`,
  },
  suri: {
    systemPrompt: `You are an allopathic medical expert with deep knowledge of human health and medicine. Respond with short, clear, and empathetic answers, balancing professionalism with a caring tone. Avoid long scripts; keep guidance precise and on point.

Identify the Issue: Briefly define the problem or symptoms after gathering key details (history, duration, past treatments).

Diagnosis: Suggest likely causes and essential tests based on medical guidelines.

Treatment: Provide concise, evidence-based steps — including medicines (dose, duration, key side effects), simple lifestyle changes, and follow-up advice.

Ethics & Law: Ensure recommendations follow medical laws, informed consent, and respect patient choices.

Patient Education: Use simple, reassuring language to help the patient understand their condition and care plan.

Prevention: Offer quick, practical tips for avoiding recurrence and promoting wellness.

Keep the tone warm, respectful, and supportive, as both a professional and a caretaker.`,
  },
}

export async function POST(request: NextRequest) {
  try {
    const { message, agent } = await request.json()
    const authToken = request.cookies.get("auth-token")?.value

    if (!authToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!message || !agent) {
      return NextResponse.json({ error: "Message and agent are required" }, { status: 400 })
    }

    const decoded = jwt.verify(authToken, process.env.NEXTAUTH_SECRET || "fallback-secret") as any
    const db = await getDatabase()

    // Get user profile for personalized context
    const userProfile = (await db.collection("users").findOne({ googleId: decoded.id })) as UserProfile | null

    // Get the system prompt for the selected agent
    const selectedAgent = agents[agent as keyof typeof agents]
    if (!selectedAgent) {
      return NextResponse.json({ error: "Invalid agent selected" }, { status: 400 })
    }

    // Build enhanced personalized context
    let personalizedContext = ""
    if (userProfile?.personalizedPrompt) {
      personalizedContext = `\n\nUser Context: ${userProfile.personalizedPrompt}`
    }

    // Build the conversation context
    const messages = [
      {
        role: "system" as const,
        content: selectedAgent.systemPrompt + personalizedContext,
      },
      {
        role: "user" as const,
        content: message,
      },
    ]

    // Call Groq API
    const completion = await groq.chat.completions.create({
      messages,
      model: "gemma2-9b-it",
      temperature: 0.7,
      max_tokens: 1000,
    })

    let response =
      completion.choices[0]?.message?.content || "I apologize, but I couldn't generate a response. Please try again."

    // Convert MDX/Markdown to plain text
    response = response
      .replace(/\*\*(.*?)\*\*/g, "$1") // Remove bold markdown
      .replace(/\*(.*?)\*/g, "$1") // Remove italic markdown
      .replace(/`(.*?)`/g, "$1") // Remove code markdown
      .replace(/#{1,6}\s/g, "") // Remove headers
      .replace(/\[(.*?)\]$$.*?$$/g, "$1") // Convert links to plain text
      .replace(/^\s*[-*+]\s/gm, "• ") // Convert bullet points
      .replace(/^\s*\d+\.\s/gm, "") // Remove numbered lists
      .trim()

    // Store chat message in MongoDB with proper structure
    const chatMessage: ChatMessage = {
      userId: decoded.id,
      agent: agent as "normal" | "jiva" | "suri",
      userMessage: message,
      aiResponse: response,
      timestamp: new Date(),
    }

    await db.collection("chat_messages").insertOne(chatMessage)

    return NextResponse.json({ response })
  } catch (error) {
    console.error("Chat API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
