import prompts from '@/config/prompts.json'

export interface Agent {
  name: string
  description: string
  systemPrompt: string
  systemPromptMedico?: string
  greetingStyle: 'friendly' | 'nurturing' | 'professional'
  responseLength: 'short' | 'medium' | 'detailed'
  specializations: string[]
}

export interface ResponseGuidance {
  message?: string
  guidance?: string
  priority: 'immediate' | 'high' | 'medium' | 'low'
}

export interface PromptsConfig {
  agents: Record<string, Agent>
  responseGuidance: Record<string, ResponseGuidance>
  keywords: Record<string, string[]>
  greetingTemplates: Record<string, Record<string, string>>
  metadata: {
    version: string
    lastUpdated: string
    description: string
    maintainer: string
  }
}

class PromptManager {
  private config: PromptsConfig

  constructor() {
    this.config = prompts as PromptsConfig
  }

  /**
   * Get agent configuration by agent type
   */
  getAgent(agentType: string): Agent | null {
    return this.config.agents[agentType] || null
  }

  /**
   * Get agent system prompt based on user type (medico vs regular)
   */
  getAgentSystemPrompt(agentType: string, isMedico: boolean = false, userName?: string): string {
    const agent = this.getAgent(agentType)
    if (!agent) return ""
    
    let prompt = isMedico && agent.systemPromptMedico ? agent.systemPromptMedico : agent.systemPrompt
    
    return prompt
  }

  /**
   * Get all available agents
   */
  getAllAgents(): Record<string, Agent> {
    return this.config.agents
  }

  /**
   * Check if message contains emergency keywords
   */
  isEmergencyCondition(message: string): boolean {
    const emergencyKeywords = this.config.keywords.emergency
    const normalizedMessage = message.toLowerCase()
    return emergencyKeywords.some(keyword => normalizedMessage.includes(keyword))
  }

  /**
   * Check if message requires expert consultation
   */
  requiresExpertConsultation(message: string): boolean {
    const consultationKeywords = this.config.keywords.consultation_needed
    const normalizedMessage = message.toLowerCase()
    return consultationKeywords.some(keyword => normalizedMessage.includes(keyword))
  }

  /**
   * Check if message is a routine health query
   */
  isRoutineHealthQuery(message: string): boolean {
    const routineKeywords = this.config.keywords.routine_health
    const normalizedMessage = message.toLowerCase()
    return routineKeywords.some(keyword => normalizedMessage.includes(keyword))
  }

  /**
   * Check if message contains inappropriate content
   */
  containsInappropriateContent(message: string): boolean {
    const inappropriatePatterns = this.config.keywords.inappropriate.map(pattern => new RegExp(pattern, 'i'))
    return inappropriatePatterns.some(pattern => pattern.test(message))
  }

  /**
   * Check if message is non-health related
   */
  isNonHealthQuery(message: string): boolean {
    const nonHealthKeywords = this.config.keywords.non_health || []
    const normalizedMessage = message.toLowerCase()
    return nonHealthKeywords.some(keyword => normalizedMessage.includes(keyword))
  }

  /**
   * Check if message requests dangerous advice
   */
  requestsDangerousAdvice(message: string): boolean {
    const dangerousKeywords = this.config.keywords.dangerous_advice || []
    const normalizedMessage = message.toLowerCase()
    return dangerousKeywords.some(keyword => normalizedMessage.includes(keyword))
  }

  /**
   * Check if message is empty or just whitespace
   */
  isEmptyMessage(message: string): boolean {
    return !message || message.trim().length === 0
  }

  /**
   * Check if message is too long (potential token limit issue)
   */
  isTooLongMessage(message: string): boolean {
    return message.length > 5000 // Reasonable limit for healthcare queries
  }

  /**
   * Check if message is a simple greeting
   */
  isSimpleGreeting(message: string): boolean {
    const lowerMessage = message.toLowerCase().trim()
    const greetingPatterns = this.config.keywords.greetings.map(pattern => new RegExp(pattern))
    return greetingPatterns.some(pattern => pattern.test(lowerMessage)) || lowerMessage.length <= 3
  }

  /**
   * Check if message needs personalization (health-related)
   */
  needsPersonalization(message: string): boolean {
    const healthKeywords = this.config.keywords.health_related
    const lowerMessage = message.toLowerCase()
    return healthKeywords.some(keyword => lowerMessage.includes(keyword))
  }

  /**
   * Get personalized greeting based on agent style and user name
   */
  getPersonalizedGreeting(agentType: string, userName?: string): string {
    if (!userName) return ""

    const agent = this.getAgent(agentType)
    if (!agent) return ""

    const greetingStyle = agent.greetingStyle
    const templates = this.config.greetingTemplates[greetingStyle]
    
    const timeOfDay = new Date().getHours()
    let timeTemplate = ""
    
    // Fix time awareness: 6 AM to 11:59 AM = morning, 12 PM to 5:59 PM = afternoon, 6 PM to 5:59 AM = evening
    if (timeOfDay >= 6 && timeOfDay < 12) {
      timeTemplate = templates.morning
    } else if (timeOfDay >= 12 && timeOfDay < 18) {
      timeTemplate = templates.afternoon  
    } else {
      timeTemplate = templates.evening
    }
    
    const firstName = userName.split(' ')[0]
    return timeTemplate.replace('{name}', firstName)
  }

  /**
   * Get response guidance for specific scenario
   */
  getResponseGuidance(scenario: string): ResponseGuidance | null {
    return this.config.responseGuidance[scenario] || null
  }

  /**
   * Get emergency response message
   */
  getEmergencyResponse(): string {
    return this.config.responseGuidance.emergency.message || ""
  }

  /**
   * Get inappropriate content response message
   */
  getInappropriateContentResponse(): string {
    return this.config.responseGuidance.inappropriate_content.message || ""
  }

  /**
   * Get non-health content response message
   */
  getNonHealthContentResponse(): string {
    return this.config.responseGuidance.non_health_content?.message || "I'm specialized in health and wellness topics. How can I help you with your health today?"
  }

  /**
   * Get dangerous advice response message
   */
  getDangerousAdviceResponse(): string {
    return this.config.responseGuidance.dangerous_advice?.message || "⚠️ I cannot provide guidance on that topic as it could be harmful. Please consult with a healthcare professional for safe medical advice."
  }

  /**
   * Determine message category and appropriate response guidance
   */
  categorizeMessage(message: string): {
    category: 'empty' | 'too_long' | 'emergency' | 'inappropriate' | 'dangerous' | 'non_health' | 'consultation_needed' | 'routine_health' | 'greeting' | 'general'
    guidance?: ResponseGuidance | null
  } {
    // Handle empty/whitespace messages
    if (this.isEmptyMessage(message)) {
      return {
        category: 'empty'
      }
    }

    // Handle overly long messages
    if (this.isTooLongMessage(message)) {
      return {
        category: 'too_long'
      }
    }

    if (this.isEmergencyCondition(message)) {
      return {
        category: 'emergency',
        guidance: this.getResponseGuidance('emergency')
      }
    }

    if (this.requestsDangerousAdvice(message)) {
      return {
        category: 'dangerous',
        guidance: this.getResponseGuidance('dangerous_advice')
      }
    }

    if (this.containsInappropriateContent(message)) {
      return {
        category: 'inappropriate',
        guidance: this.getResponseGuidance('inappropriate_content')
      }
    }

    if (this.isNonHealthQuery(message)) {
      return {
        category: 'non_health',
        guidance: this.getResponseGuidance('non_health_content')
      }
    }

    if (this.isSimpleGreeting(message)) {
      return {
        category: 'greeting'
      }
    }

    if (this.requiresExpertConsultation(message) && !this.isRoutineHealthQuery(message)) {
      return {
        category: 'consultation_needed',
        guidance: this.getResponseGuidance('consultation_needed')
      }
    }

    if (this.isRoutineHealthQuery(message)) {
      return {
        category: 'routine_health',
        guidance: this.getResponseGuidance('routine_health')
      }
    }

    return {
      category: 'general'
    }
  }

  /**
   * Get configuration metadata
   */
  getMetadata() {
    return this.config.metadata
  }

  /**
   * Validate agent type
   */
  isValidAgent(agentType: string): boolean {
    return agentType in this.config.agents
  }
}

// Export singleton instance
export const promptManager = new PromptManager()

// Export types for use in other files
export type AgentType = keyof typeof prompts.agents
export type MessageCategory = 'empty' | 'too_long' | 'emergency' | 'inappropriate' | 'dangerous' | 'non_health' | 'consultation_needed' | 'routine_health' | 'greeting' | 'general'
