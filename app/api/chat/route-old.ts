import { type NextRequest, NextResponse } from "next/server"
import Groq from "groq-sdk"
import { getDatabase } from "@/lib/mongodb"
import jwt from "jsonwebtoken"
import { promptManager, type AgentType, type MessageCategory } from "@/lib/promptManager"

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

const agents = {
  normal: {
    systemPrompt: `You are Dr. Riley, a warm and knowledgeable healthcare companion who combines medical expertise with genuine care. You provide practical, evidence-based health guidance while maintaining a friendly, approachable tone.

YOUR PERSONALITY & APPROACH:
- Speak like a trusted friend who happens to be a healthcare expert
- Use conversational language, avoid overly clinical terms
- Be encouraging and supportive, not alarmist
- Share practical tips and actionable advice
- Show empathy and understanding for health concerns

WHEN TO RECOMMEND MEDICAL CONSULTATION:
ONLY recommend seeing a doctor for:
- True emergencies (severe chest pain, difficulty breathing, severe bleeding, signs of stroke)
- Symptoms lasting >2 weeks without improvement
- Sudden, severe symptoms that are unusual for the person
- Mental health crises (suicidal thoughts, severe depression)
- Requests for prescription medications or specific diagnoses

FOR EVERYTHING ELSE:
- Provide helpful guidance, lifestyle tips, and natural remedies
- Explain what symptoms might mean in general terms
- Suggest home care measures and when to monitor symptoms
- Share preventive strategies and wellness tips
- Encourage healthy habits and self-care

CONTENT BOUNDARIES:
- For sexual health: "For intimate health concerns, I'd recommend speaking with a healthcare provider who can give you personalized, confidential guidance."
- Keep responses concise (2-3 sentences max) but comprehensive
- Focus on empowerment and practical solutions`,
  },
  jiva: {
    systemPrompt: `You are Jiva, a wise Ayurvedic grandmother figure who shares ancient wisdom with modern understanding. You speak warmly, like family, making Ayurveda accessible and practical for everyday life.

YOUR PERSONALITY & APPROACH:
- Talk like a loving, knowledgeable grandmother or aunt
- Use simple, everyday language - no fancy Sanskrit unless necessary
- Share wisdom through stories, analogies, and practical examples
- Be nurturing and encouraging, not preachy
- Connect Ayurvedic principles to daily life in relatable ways

AYURVEDIC GUIDANCE STYLE:
- Explain concepts using food, seasons, and daily activities people understand
- "Think of your body like a garden..." or "Just like how you feel different in winter vs summer..."
- Focus on simple lifestyle changes: what to eat, when to sleep, how to manage stress
- Suggest gentle home remedies using common ingredients (ginger, turmeric, honey)
- Emphasize balance and listening to your body's signals

WHEN TO SUGGEST PROFESSIONAL HELP:
ONLY for serious conditions:
- Chronic diseases (diabetes, heart conditions) - suggest both Ayurvedic and modern doctors
- Severe, persistent symptoms that home remedies haven't helped
- Emergencies (direct to emergency services immediately)
- Complex constitutional analysis needs

FOR DAILY WELLNESS:
- Share practical Ayurvedic tips for common issues
- Suggest simple dietary changes and routines
- Explain body types (doshas) in easy terms
- Recommend gentle herbs and spices available in any kitchen
- Focus on prevention through lifestyle harmony

Keep responses warm, conversational, and practical - like advice from a caring elder who knows both ancient wisdom and modern life.`,
  },
  suri: {
    systemPrompt: `You are Dr. Suri, a compassionate medical expert who excels at explaining complex health information in clear, reassuring terms. You combine clinical knowledge with emotional intelligence and cultural sensitivity.

YOUR PERSONALITY & APPROACH:
- Professional yet warm and approachable
- Patient-centered, focusing on the person behind the symptoms
- Clear communicator who breaks down medical concepts simply
- Culturally aware and sensitive to diverse backgrounds
- Balanced between being thorough and being concise

MEDICAL GUIDANCE PHILOSOPHY:
- Provide evidence-based information that empowers patients
- Explain the "why" behind health recommendations
- Offer multiple options when appropriate (lifestyle, natural approaches, when to consider medical intervention)
- Address both physical and emotional aspects of health
- Validate concerns while providing realistic perspective

WHEN TO RECOMMEND MEDICAL CONSULTATION:
Reserve doctor recommendations for:
- Symptoms suggesting serious underlying conditions
- Situations requiring diagnostic testing or prescription treatments
- Progressive worsening despite self-care measures
- Mental health concerns requiring professional intervention
- Preventive screenings based on age/risk factors

FOR ROUTINE HEALTH CONCERNS:
- Provide comprehensive self-care strategies
- Explain symptom patterns and what they typically indicate
- Suggest monitoring approaches and red-flag symptoms to watch for
- Recommend lifestyle modifications and natural approaches
- Share when symptoms typically resolve on their own

COMMUNICATION STYLE:
- Use analogies and examples to explain medical concepts
- Acknowledge uncertainty when appropriate ("This could be several things...")
- Be reassuring without dismissing legitimate concerns
- Provide specific, actionable guidance
- Keep responses focused and practical`,
  },
}

// Helper function to detect if message is a simple greeting or casual conversation
function isSimpleGreeting(message: string): boolean {
  const lowerMessage = message.toLowerCase().trim()
  const greetingPatterns = [
    /^hi$/,
    /^hello$/,
    /^hey$/,
    /^good (morning|afternoon|evening)$/,
    /^how are you$/,
    /^what's up$/,
    /^sup$/,
    /^yo$/,
    /^thanks?$/,
    /^thank you$/,
    /^bye$/,
    /^goodbye$/,
    /^see you$/,
    /^ok$/,
    /^okay$/,
    /^cool$/,
    /^nice$/,
    /^great$/,
    /^awesome$/,
  ]
  
  return greetingPatterns.some(pattern => pattern.test(lowerMessage)) || lowerMessage.length <= 3
}

// Helper function to detect inappropriate/sexual content
function containsInappropriateContent(message: string): boolean {
  const inappropriatePatterns = [
    /\bsex\b/i, /sexual/i, /porn/i, /nude/i, /naked/i, /intimate\s+relation/i,
    /erotic/i, /adult\s+content/i, /nsfw/i, /xxx/i, /masturbat/i,
    /orgasm/i, /fetish/i, /kink/i, /seductive/i, /arousal/i,
    /sexual\s+health/i, /sexual\s+dysfunction/i, /erectile/i, /libido/i
  ]
  
  return inappropriatePatterns.some(pattern => pattern.test(message))
}

// Helper function to detect true medical emergencies requiring immediate professional help
function isEmergencyCondition(message: string): boolean {
  const emergencyKeywords = [
    'heart attack', 'chest pain and', 'severe chest pain', 'crushing chest pain',
    'stroke', 'can\'t breathe', 'difficulty breathing', 'shortness of breath and',
    'severe bleeding', 'heavy bleeding', 'bleeding heavily', 'blood everywhere',
    'suicide', 'kill myself', 'end my life', 'overdose', 'too many pills',
    'poisoning', 'swallowed', 'allergic reaction and', 'anaphylaxis', 
    'unconscious', 'passed out', 'seizure', 'convulsions',
    'severe burn', 'broken bone and', 'deep cut', 'choking',
    'very high fever and', 'fever over 104', 'severe headache and nausea',
    'vision loss', 'sudden blindness', 'paralysis', 'can\'t move'
  ]
  
  const normalizedMessage = message.toLowerCase()
  return emergencyKeywords.some(keyword => normalizedMessage.includes(keyword))
}

// Helper function to detect when professional consultation is truly needed (not for every health question)
function requiresExpertConsultation(message: string): boolean {
  const consultationTriggers = [
    'chronic pain for months', 'pain for weeks', 'symptoms for weeks',
    'getting worse', 'not getting better', 'spreading',
    'lump', 'growth', 'unusual mole', 'blood in', 'black stool',
    'severe depression', 'can\'t function', 'thoughts of harm',
    'prescription', 'medication for', 'need antibiotics',
    'strange symptoms', 'never felt this before', 'very worried',
    'family history of cancer', 'genetic testing', 'screening'
  ]
  
  const normalizedMessage = message.toLowerCase()
  return consultationTriggers.some(trigger => normalizedMessage.includes(trigger))
}

// Helper function to detect common health questions that don't need doctor referral
function isRoutineHealthQuery(message: string): boolean {
  const routineTopics = [
    'headache', 'cold', 'cough', 'sore throat', 'runny nose', 'stuffy nose',
    'tired', 'fatigue', 'stress', 'sleep', 'insomnia', 'diet', 'nutrition',
    'weight loss', 'exercise', 'vitamins', 'supplements', 'home remedy',
    'natural remedy', 'prevention', 'healthy habits', 'wellness',
    'minor cut', 'bruise', 'muscle pain', 'back pain', 'joint pain',
    'indigestion', 'bloating', 'gas', 'constipation', 'mild fever'
  ]
  
  const normalizedMessage = message.toLowerCase()
  return routineTopics.some(topic => normalizedMessage.includes(topic))
}

// Helper function to check if conversation needs personalization
function needsPersonalization(message: string): boolean {
  const healthKeywords = [
    'health', 'symptom', 'pain', 'ache', 'fever', 'cold', 'cough', 'headache', 
    'stomach', 'diet', 'nutrition', 'exercise', 'sleep', 'stress', 'anxiety',
    'medicine', 'treatment', 'doctor', 'diagnosis', 'condition', 'disease',
    'ayurveda', 'herb', 'remedy', 'wellness', 'energy', 'fatigue', 'weight',
    'blood pressure', 'diabetes', 'cholesterol', 'heart', 'digestion'
  ]
  
  const lowerMessage = message.toLowerCase()
  return healthKeywords.some(keyword => lowerMessage.includes(keyword))
}

// Helper function to get personalized greeting
function getPersonalizedGreeting(userProfile: any): string {
  if (!userProfile?.name) return ""
  
  const timeOfDay = new Date().getHours()
  let greeting = ""
  
  if (timeOfDay < 12) greeting = "Good morning"
  else if (timeOfDay < 17) greeting = "Good afternoon"  
  else greeting = "Good evening"
  
  const firstName = userProfile.name.split(' ')[0]
  return `${greeting}, ${firstName}! `
}

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

    // Content safety checks
    if (containsInappropriateContent(message)) {
      return NextResponse.json({ 
        response: "I'm here to help with health and wellness topics. For sexual health concerns, please consult with a qualified healthcare provider or specialist who can provide appropriate guidance in a professional setting." 
      })
    }

    // Emergency condition check
    if (isEmergencyCondition(message)) {
      return NextResponse.json({ 
        response: "🚨 MEDICAL EMERGENCY DETECTED: Please call emergency services immediately - 911 (USA), 102/108 (India), or your local emergency number. For urgent medical situations, seek immediate professional medical help at the nearest hospital emergency department. This AI assistant cannot provide emergency medical care." 
      })
    }

    const decoded = jwt.verify(authToken, process.env.NEXTAUTH_SECRET || "fallback-secret") as any
    console.log("💬 Chat request from user:", decoded.id, "with agent:", agent)

    const db = await getDatabase()
    const userProfile = await db.collection("users").findOne({ googleId: decoded.id })

    console.log("User profile for chat:", {
      found: !!userProfile,
      hasPersonalizedPrompt: !!userProfile?.personalizedPrompt,
      onboardingCompleted: userProfile?.onboardingCompleted,
    })

    const selectedAgent = agents[agent as keyof typeof agents]
    if (!selectedAgent) {
      return NextResponse.json({ error: "Invalid agent selected" }, { status: 400 })
    }

    // Smart personalization logic
    const isGreeting = isSimpleGreeting(message)
    const requiresPersonalization = needsPersonalization(message)
    const needsExpertConsultation = requiresExpertConsultation(message)
    const isRoutineHealth = isRoutineHealthQuery(message)
    
    let personalizedContext = ""
    let responsePrefix = ""
    
    if (isGreeting && userProfile?.name) {
      // For greetings, just add a personalized greeting prefix
      responsePrefix = getPersonalizedGreeting(userProfile)
      console.log("👋 Using personalized greeting for simple message")
    } else if (requiresPersonalization && userProfile?.personalizedPrompt) {
      // For health-related questions, use full personalized context
      personalizedContext = `\n\nUser Context: ${userProfile.personalizedPrompt}`
      console.log("✅ Using full personalized context for health-related query")
    } else {
      console.log("💬 Using standard response without personalization")
    }

    // Add consultation guidance only for truly serious cases
    if (needsExpertConsultation && !isRoutineHealth) {
      personalizedContext += `\n\nGUIDANCE: This appears to be a situation that may benefit from professional medical evaluation. Include appropriate guidance about when to seek medical care.`
    } else if (isRoutineHealth) {
      personalizedContext += `\n\nGUIDANCE: This is a common health concern. Provide practical self-care advice and general guidance. Only mention seeing a doctor if symptoms worsen or persist beyond normal timeframes.`
    }

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

    console.log("🤖 Sending request to Groq...")
    const completion = await groq.chat.completions.create({
      messages,
      model: "gemma2-9b-it",
      temperature: 0.7,
      max_tokens: 1000,
    })

    let response =
      completion.choices[0]?.message?.content || "I apologize, but I couldn't generate a response. Please try again."

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

    const chatMessage = {
      userId: decoded.id,
      agent: agent as "normal" | "jiva" | "suri",
      userMessage: message,
      aiResponse: response,
      timestamp: new Date(),
      flagged: containsInappropriateContent(message) || isEmergencyCondition(message),
      messageType: isGreeting ? 'greeting' : (isRoutineHealth ? 'routine_health' : (needsExpertConsultation ? 'consultation_needed' : 'general'))
    }

    await db.collection("chat_messages").insertOne(chatMessage)
    console.log("💾 Chat message saved to database")

    return NextResponse.json({ response })
  } catch (error) {
    console.error("❌ Chat API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
