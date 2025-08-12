"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Menu, X, LogOut, Trash2, User } from "lucide-react"
import InstallButton from "@/components/InstallButton"

interface Message {
  role: "user" | "assistant"
  content: string
  timestamp: Date
  isTyping?: boolean
}

// Gemini-style animation component
function GeminiAnimation({ text, onComplete }: { text: string; onComplete?: () => void }) {
  const [visibleWords, setVisibleWords] = useState<number>(0)
  const words = text.split(' ')

  useEffect(() => {
    if (visibleWords >= words.length) {
      onComplete?.()
      return
    }
    
    const timer = setTimeout(() => {
      setVisibleWords(prev => prev + 1)
    }, 80) // Gemini-like speed - word by word
    
    return () => clearTimeout(timer)
  }, [visibleWords, words.length, onComplete])

  // Reset when text changes
  useEffect(() => {
    setVisibleWords(0)
  }, [text])

  return (
    <span className="inline-block">
      {words.map((word, index) => (
        <span
          key={index}
          className={`inline-block transition-all duration-300 ${
            index < visibleWords 
              ? 'opacity-100 transform translate-y-0' 
              : 'opacity-0 transform translate-y-2'
          }`}
          style={{
            transitionDelay: `${index * 50}ms`
          }}
        >
          {word}{index < words.length - 1 ? ' ' : ''}
        </span>
      ))}
      {visibleWords < words.length && (
        <span className="inline-block w-0.5 h-4 bg-blue-500 ml-1 animate-pulse"></span>
      )}
    </span>
  )
}

interface UserData {
  personalizedPrompt?: string
  name?: string
  email?: string
}

interface UserProfile {
  name?: string
  email?: string
  picture?: string
  onboardingData?: {
    profession?: string
    usage?: string
  }
}

function useStoreTokenFromUrl() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const token = url.searchParams.get("token");
    if (token) {
      localStorage.setItem("auth-token", token);
      url.searchParams.delete("token");
      window.history.replaceState({}, document.title, url.pathname + url.search);
    }
  }, []);
}

export default function ChatPage() {
  useStoreTokenFromUrl()
  
  // Handle PWA shortcut parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const agentParam = urlParams.get('agent')
    if (agentParam && ['normal', 'jiva', 'suri'].includes(agentParam)) {
      setSelectedAgent(agentParam)
    }
  }, [])
  
  // Helper function to check if user is medical professional
  const isMedicalProfessional = () => {
    return userProfile?.onboardingData?.profession === "medico"
  }

  // Helper function to get appropriate welcome message
  const getWelcomeMessage = (agent: string) => {
    const isMedico = isMedicalProfessional()
    
    if (agent === "normal") {
      return {
        title: "🤖 Welcome to Auto Mode!",
        description: isMedico 
          ? "Clinical decision support system ready. I can assist with differential diagnosis, treatment protocols, and evidence-based recommendations."
          : "I'm here to help with your general health questions.",
        additionalInfo: isMedico
          ? "Access to clinical terminology, ICD-10 classifications, and peer-reviewed research integration available."
          : "For specialized expertise, you can switch to Dr. Jiva (Ayurvedic) or Dr. Suri (Modern Medicine).",
        prompt: isMedico
          ? "What clinical case or medical inquiry can I assist you with today?"
          : "What health question can I help you with today?"
      }
    } else {
      const agentInfo = agents[agent as keyof typeof agents]
      return {
        title: `Welcome to ${agentInfo.name}!`,
        description: isMedico 
          ? `${agentInfo.name} - Clinical consultation mode with specialized ${agent === 'jiva' ? 'Ayurvedic' : 'evidence-based'} expertise.`
          : `${agentInfo.description} - Feel free to ask me anything about your health and wellness.`,
        prompt: isMedico
          ? "How may I assist with your clinical consultation today?"
          : "How can I help you today?"
      }
    }
  };
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState("")
  const [selectedAgent, setSelectedAgent] = useState("normal")
  const [isLoading, setIsLoading] = useState(false)
  const [userData, setUserData] = useState<UserData>({})
  const [userProfile, setUserProfile] = useState<UserProfile>({})
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [typingMessageIndex, setTypingMessageIndex] = useState<number | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Check if device is mobile
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const agents = {
    normal: { name: "Auto Mode", color: "bg-gray-100 text-gray-800", description: "Smart AI with both Ayurvedic & Allopathic expertise" },
    jiva: { name: "Dr. Jiva", color: "bg-green-100 text-green-800", description: "Your personal Ayurvedic expert - Traditional Indian medicine" },
    suri: { name: "Dr. Suri", color: "bg-blue-100 text-blue-800", description: "Your personal Allopathic expert - Modern medical science" },
  }

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const token = localStorage.getItem("auth-token")
        const response = await fetch("/api/user/profile", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        if (response.ok) {
          const data = await response.json()
          setUserData(data.userData || {})
          setUserProfile({
            name: data.profile?.name,
            email: data.profile?.email,
            picture: data.profile?.picture,
            onboardingData: data.onboardingData
          })
        } else {
          console.error("Failed to fetch user profile")
        }
      } catch (error) {
        console.error("Error fetching user profile:", error)
      } finally {
        setIsLoadingProfile(false)
      }
    }

    fetchUserProfile()
  }, [])

  // Clear chat when agent changes
  const handleAgentChange = async (newAgent: string) => {
    if (newAgent !== selectedAgent) {
      setMessages([]) // Clear current messages immediately
      setSelectedAgent(newAgent)
      
      // Also clear from server
      try {
        const token = localStorage.getItem("auth-token")
        await fetch("/api/chat/history", {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        console.log("✅ Chat history cleared when switching agents")
      } catch (error) {
        console.error("Failed to clear chat history on server:", error)
      }
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("auth-token")
    window.location.href = "/"
  }

  const clearChat = async () => {
    setMessages([])
    try {
      const token = localStorage.getItem("auth-token")
      await fetch("/api/chat/history", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      console.log("✅ Chat history cleared manually")
    } catch (error) {
      console.error("Failed to clear chat history:", error)
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    const userMessage: Message = {
      role: "user",
      content: inputMessage,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputMessage("")
    setIsLoading(true)

    try {
      const token = localStorage.getItem("auth-token")
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: inputMessage,
          agent: selectedAgent,
          userData,
          conversationHistory: messages.slice(-10),
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to get response")
      }

      const data = await response.json()
      const assistantMessage: Message = {
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
        isTyping: true,
      }

      // Add message and start typing animation
      setMessages((prev) => {
        const newMessages = [...prev, assistantMessage]
        setTypingMessageIndex(newMessages.length - 1)
        return newMessages
      })
    } catch (error) {
      console.error("Chat error:", error)
      const errorMessage: Message = {
        role: "assistant",
        content: "I apologize, but I'm having trouble responding right now. Please try again.",
        timestamp: new Date(),
        isTyping: true,
      }
      setMessages((prev) => {
        const newMessages = [...prev, errorMessage]
        setTypingMessageIndex(newMessages.length - 1)
        return newMessages
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !isMobile) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (isLoadingProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div className={`fixed top-0 left-0 h-full w-80 bg-white shadow-lg transform transition-transform duration-300 ease-in-out z-50 lg:hidden ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
            <Button
              variant="ghost" 
              size="sm"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
        
        <div className="p-4 space-y-4">
          {/* User Profile Section */}
          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
            {userProfile.picture ? (
              <img 
                src={userProfile.picture} 
                alt="Profile" 
                className="w-10 h-10 rounded-full"
              />
            ) : (
              <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                <User className="h-5 w-5 text-gray-600" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {userProfile.name || "User"}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {userProfile.email || ""}
              </p>
            </div>
          </div>

          {/* Agent Selection */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Choose Your AI Agent</label>
            <Select value={selectedAgent} onValueChange={handleAgentChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(agents).map(([key, agent]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center space-x-2">
                      <Badge className={`${agent.color} text-xs`}>
                        {agent.name}
                      </Badge>
                      {key === "normal" && <span className="text-xs">🤖</span>}
                      {key === "jiva" && <span className="text-xs">🌿</span>}
                      {key === "suri" && <span className="text-xs">⚕️</span>}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Install App Button for Mobile */}
          <div className="mb-4">
            <InstallButton variant="mobile" />
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={clearChat}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Chat
            </Button>
            
            <Button
              variant="outline"
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            
            <div>
              <h1 className="text-xl font-bold text-gray-900">Ryo Forge AI</h1>
              <p className="text-sm text-gray-600">Your personalized health companion</p>
            </div>
          </div>
          
          {/* Desktop Controls */}
          <div className="hidden lg:flex items-center gap-4">
            <InstallButton />
            
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Agent:</span>
              <Select value={selectedAgent} onValueChange={handleAgentChange}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(agents).map(([key, agent]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <span>{agent.name}</span>
                        {key === "normal" && <span className="text-sm">🤖</span>}
                        {key === "jiva" && <span className="text-sm">🌿</span>}
                        {key === "suri" && <span className="text-sm">⚕️</span>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button variant="outline" size="sm" onClick={clearChat}>
              <Trash2 className="h-4 w-4 mr-2" />
              Clear
            </Button>
            
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
        <div className="flex-1 p-4">
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {selectedAgent === "normal" ? (
                    <div className="flex items-center gap-2">
                      <span>You are in</span>
                      <Badge className={agents[selectedAgent as keyof typeof agents].color}>
                        {agents[selectedAgent as keyof typeof agents].name}
                      </Badge>
                      <span className="text-sm font-normal text-gray-600">🤖</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span>Chatting with</span>
                      <Badge className={agents[selectedAgent as keyof typeof agents].color}>
                        {agents[selectedAgent as keyof typeof agents].name}
                      </Badge>
                    </div>
                  )}
                </CardTitle>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-gray-600">{agents[selectedAgent as keyof typeof agents].description}</p>
                  {isMedicalProfessional() && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                      Clinical Mode
                    </Badge>
                  )}
                </div>
                {selectedAgent === "normal" && (
                  <div className={`border-l-4 p-3 rounded-r-lg ${
                    isMedicalProfessional() 
                      ? 'bg-blue-50 border-blue-400' 
                      : 'bg-gray-50 border-gray-400'
                  }`}>
                    <p className="text-sm text-gray-700">
                      <strong>{isMedicalProfessional() ? 'Clinical Auto Mode:' : 'Auto Mode Active:'}</strong> {
                        isMedicalProfessional() 
                          ? 'Clinical decision support with evidence-based recommendations and diagnostic assistance.'
                          : 'General health guidance for everyday questions. For specialized help, switch to Dr. Jiva or Dr. Suri modes.'
                      }
                    </p>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-0">
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      {(() => {
                        const welcomeMsg = getWelcomeMessage(selectedAgent)
                        const isMedico = isMedicalProfessional()
                        
                        return selectedAgent === "normal" ? (
                          <div className="space-y-4">
                            <h3 className="text-lg font-medium mb-2">
                              {welcomeMsg.title}
                            </h3>
                            <div className={`border rounded-lg p-4 text-left max-w-md mx-auto ${
                              isMedico ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                            }`}>
                              <p className="mb-3 text-gray-700">{welcomeMsg.description}</p>
                              {!isMedico && (
                                <>
                                  <p className="text-sm text-gray-600">For specialized expertise, you can switch to:</p>
                                  <div className="space-y-1 text-sm mt-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-green-600 flex-shrink-0">🌿</span>
                                      <div className="flex-1">
                                        <strong>Dr. Jiva</strong> - Natural remedies & Ayurvedic guidance
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-blue-600 flex-shrink-0">⚕️</span>
                                      <div className="flex-1">
                                        <strong>Dr. Suri</strong> - Medical advice & modern treatments
                                      </div>
                                    </div>
                                  </div>
                                </>
                              )}
                              {isMedico && (
                                <p className="text-sm text-blue-600 mb-2">{welcomeMsg.additionalInfo}</p>
                              )}
                              <p className="mt-3 text-gray-600 text-sm">{welcomeMsg.prompt}</p>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <h3 className="text-lg font-medium mb-2">
                              {welcomeMsg.title}
                            </h3>
                            <p className="mb-2">{welcomeMsg.prompt}</p>
                            <p className="text-sm">
                              {welcomeMsg.description}
                            </p>
                          </div>
                        )
                      })()}
                    </div>
                  )}
                  {messages.map((message, index) => (
                    <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-2 ${
                          message.role === "user" ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-900 border"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">
                          {message.role === "assistant" && message.isTyping && typingMessageIndex === index ? (
                            <GeminiAnimation 
                              text={message.content} 
                              onComplete={() => {
                                setTypingMessageIndex(null)
                                setMessages(prev => prev.map((msg, i) => 
                                  i === index ? { ...msg, isTyping: false } : msg
                                ))
                              }}
                            />
                          ) : (
                            message.content
                          )}
                        </p>
                        <p className={`text-xs mt-1 ${message.role === "user" ? "text-blue-100" : "text-gray-500"}`}>
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 rounded-lg px-4 py-3 border">
                        <div className="flex items-center space-x-3">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: "0.2s" }}></div>
                            <div className="w-2 h-2 bg-gray-300 rounded-full animate-pulse" style={{ animationDelay: "0.4s" }}></div>
                            <div className="w-2 h-2 bg-gray-200 rounded-full animate-pulse" style={{ animationDelay: "0.6s" }}></div>
                          </div>
                          <span className="text-sm text-gray-600 animate-pulse">{agents[selectedAgent as keyof typeof agents].name} is thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              <div className="border-t border-gray-200 p-4">
                <div className="flex gap-2">
                  <Textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder={
                      isMedicalProfessional() 
                        ? `Describe your clinical case or medical inquiry for ${agents[selectedAgent as keyof typeof agents].name}...`
                        : `Ask ${agents[selectedAgent as keyof typeof agents].name} anything about your health...`
                    }
                    disabled={isLoading}
                    className="flex-1 max-h-32"
                    rows={2}
                  />
                  <Button onClick={sendMessage} disabled={!inputMessage.trim() || isLoading}>
                    Send
                  </Button>
                </div>
                {!isMobile && (
                  <p className="text-xs text-gray-500 mt-2">Press Enter to send, Shift+Enter for new line</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
