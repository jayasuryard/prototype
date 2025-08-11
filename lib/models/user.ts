export interface UserProfile {
  _id?: string
  googleId: string
  email: string
  name: string
  picture?: string

  // Onboarding data
  onboardingData?: {
    dateOfBirth: string
    age: number
    profession: "medico" | "non-medico"

    // Medico specific fields
    usage?: "practice" | "personal"
    specialty?: string
    experienceYears?: number

    // Personal/health fields
    gender?: string
    height?: number // in cm
    weight?: number // in kg
    habits?: string
    mealsPerDay?: number
    waterIntake?: number // glasses per day
    exerciseRoutine?: string
  }

  // Generated personalized prompt for AI
  personalizedPrompt?: string

  // Status flags
  onboardingCompleted: boolean

  // Timestamps
  createdAt: Date
  updatedAt: Date
}

export interface ChatMessage {
  _id?: string
  userId: string // Google ID
  agent: "normal" | "jiva" | "suri"
  userMessage: string
  aiResponse: string
  timestamp: Date
}

// Helper function to generate personalized prompt
export function generatePersonalizedPrompt(data: UserProfile["onboardingData"]): string {
  if (!data) return ""

  let prompt = `User Profile: ${data.age}-year-old `

  if (data.profession === "medico") {
    if (data.usage === "practice") {
      prompt += `medical professional specializing in ${data.specialty} with ${data.experienceYears} years of experience. `
    } else {
      prompt += `medical professional using the system for personal health management. `
    }
  } else {
    prompt += `individual seeking healthcare guidance. `
  }

  if (data.gender) {
    prompt += `Gender: ${data.gender}. `
  }

  if (data.height && data.weight) {
    const bmi = (data.weight / (data.height / 100) ** 2).toFixed(1)
    prompt += `Physical stats: ${data.height}cm, ${data.weight}kg (BMI: ${bmi}). `
  }

  if (data.habits) {
    prompt += `Lifestyle habits: ${data.habits}. `
  }

  if (data.mealsPerDay) {
    prompt += `Eats ${data.mealsPerDay} meals per day. `
  }

  if (data.waterIntake) {
    prompt += `Drinks ${data.waterIntake} glasses of water daily. `
  }

  if (data.exerciseRoutine) {
    prompt += `Exercise routine: ${data.exerciseRoutine}. `
  }

  prompt += "Please provide personalized healthcare advice considering this profile."
  return prompt
}
