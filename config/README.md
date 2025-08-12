# Prompt Management System

A scalable, JSON-based prompt configuration system for personalized healthcare AI agents.

## 📁 Structure

```
config/
  └── prompts.json          # Main prompts configuration
lib/
  └── promptManager.ts      # Prompt management utility
app/api/chat/
  └── route.ts             # Updated chat API using prompt manager
```

## 🚀 Features

### Scalable Agent Configuration
- **Agent Personalities**: Each agent has unique personality, greeting style, and specializations
- **Dynamic System Prompts**: Rich, detailed prompts loaded from JSON
- **Customizable Greetings**: Time-aware, personalized greetings based on agent style
- **Response Length Control**: Configure response verbosity per agent

### Intelligent Message Categorization
- **Emergency Detection**: Immediate emergency response routing
- **Content Filtering**: Automatic inappropriate content handling
- **Health Query Classification**: Smart routing between routine and consultation-needed queries
- **Greeting Recognition**: Personalized responses for casual interactions

### Medical Safety & Compliance
- **WHO/FDA/Indian Guidelines**: Built-in medical safety protocols
- **Smart Doctor Recommendations**: Only suggests medical consultation when truly needed
- **Cultural Sensitivity**: Ayurvedic agent with traditional wisdom approach
- **Professional Boundaries**: Clear content policies and response guidelines

## 🛠️ Usage

### Adding a New Agent

1. **Update `config/prompts.json`**:
```json
{
  "agents": {
    "newAgent": {
      "name": "Dr. NewAgent",
      "description": "Agent description",
      "systemPrompt": "Your detailed system prompt...",
      "greetingStyle": "friendly", // or "nurturing", "professional"
      "responseLength": "medium", // or "short", "detailed"
      "specializations": ["specialty1", "specialty2"]
    }
  }
}
```

2. **Agent will be automatically available** - no code changes needed!

### Modifying Keywords/Patterns

Update keyword arrays in `config/prompts.json`:
```json
{
  "keywords": {
    "emergency": ["new emergency keyword"],
    "routine_health": ["new routine topic"],
    "consultation_needed": ["new consultation trigger"]
  }
}
```

### Customizing Response Guidance

Modify response templates in `config/prompts.json`:
```json
{
  "responseGuidance": {
    "new_scenario": {
      "guidance": "Custom guidance text",
      "priority": "medium"
    }
  }
}
```

## 🎭 Available Agents

### Dr. Riley (`normal`)
- **Style**: Friendly healthcare companion
- **Approach**: Conversational, like a trusted friend with medical expertise
- **Greetings**: Warm and encouraging
- **Specializations**: General health, wellness, prevention

### Jiva (`jiva`) 
- **Style**: Wise Ayurvedic grandmother
- **Approach**: Nurturing, family-like wisdom sharing
- **Greetings**: Traditional and caring ("Good morning, dear Name!")
- **Specializations**: Ayurveda, holistic health, natural remedies

### Dr. Suri (`suri`)
- **Style**: Compassionate medical expert
- **Approach**: Professional yet approachable, culturally sensitive
- **Greetings**: Professional and respectful
- **Specializations**: Evidence-based medicine, patient education

## 📊 Message Categories

The system automatically categorizes messages:

- **`emergency`**: Immediate medical emergencies → Emergency response
- **`inappropriate`**: Sexual/inappropriate content → Polite redirect
- **`greeting`**: Simple greetings → Personalized greeting response
- **`consultation_needed`**: Serious symptoms → Medical consultation guidance
- **`routine_health`**: Common health questions → Self-care advice
- **`general`**: Other topics → Standard response

## 🔧 API Usage

The chat API automatically uses the prompt manager:

```typescript
// Message is automatically categorized
const messageAnalysis = promptManager.categorizeMessage(message)

// Agent configuration is loaded dynamically
const agentConfig = promptManager.getAgent(agentType)

// Personalized greetings are generated
const greeting = promptManager.getPersonalizedGreeting(agentType, userName)
```

## 🧪 Testing New Prompts

1. Update `config/prompts.json`
2. Restart the development server (prompts are loaded at startup)
3. Test different message types with each agent
4. Check console logs for categorization debugging

## 📈 Analytics & Monitoring

Each chat message includes metadata:
- `messageCategory`: Detected message type
- `agentConfig`: Used agent configuration
- `flagged`: Emergency/inappropriate content flag
- `personalized`: Whether personalization was applied

## 🔒 Safety Features

- **Emergency Detection**: Immediate routing to emergency services
- **Content Filtering**: Blocks inappropriate sexual content
- **Medical Boundaries**: Smart doctor recommendation logic
- **Audit Trail**: All interactions logged with categorization

## 🚀 Future Enhancements

- **A/B Testing**: Multiple prompt variations per agent
- **Learning System**: Prompt optimization based on user feedback
- **Multi-language**: Localized prompts and cultural adaptations
- **Specialized Agents**: Mental health, pediatrics, elderly care
- **Voice Integration**: Audio-optimized prompt variations

## 🔄 Version Control

The prompt system includes versioning:
- **Version**: Currently v1.0.0
- **Last Updated**: 2025-08-13
- **Maintainer**: Healthcare AI Team

Check `promptManager.getMetadata()` for current version info.
