'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Check, Smartphone, Share, Plus } from 'lucide-react'

interface InstallButtonProps {
  variant?: 'mobile' | 'desktop'
}

export default function InstallButton({ variant = 'desktop' }: InstallButtonProps) {
  const [isInstallable, setIsInstallable] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    setIsIOS(iOS)

    // Check if app is already installed (standalone mode)
    const standalone = window.matchMedia('(display-mode: standalone)').matches || 
                      (window.navigator as any).standalone === true
    setIsStandalone(standalone)
    
    if (standalone) {
      setIsInstalled(true)
      return
    }

    // Listen for the install prompt (works on Chrome, Edge, etc.)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setIsInstallable(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Check if we can install (for browsers that support it)
    if ('serviceWorker' in navigator && 'BeforeInstallPromptEvent' in window) {
      // App is installable but prompt hasn't fired yet
      setTimeout(() => {
        if (!isInstallable && !standalone) {
          setIsInstallable(true)
        }
      }, 1000)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        setIsInstallable(false)
        setDeferredPrompt(null)
      }
    } else if (isIOS) {
      // For iOS, we can't trigger the install directly, but we can show instructions
      alert('To install this app on your iOS device:\n\n1. Tap the Share button (⬆️) in Safari\n2. Scroll down and tap "Add to Home Screen"\n3. Tap "Add" to confirm')
    }
  }

  if (isInstalled || isStandalone) {
    if (variant === 'mobile') {
      return (
        <div className="flex items-center justify-center p-3 bg-green-50 border border-green-200 rounded-lg">
          <Check className="w-5 h-5 mr-2 text-green-600" />
          <span className="text-green-700 font-medium">App Installed ✨</span>
        </div>
      )
    }
    
    return (
      <div className="flex items-center text-green-600 text-sm font-medium">
        <Check className="w-4 h-4 mr-1" />
        App Installed
      </div>
    )
  }

  if (variant === 'mobile') {
    if (isIOS) {
      return (
        <Button 
          variant="outline" 
          className="w-full justify-center bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300 font-medium"
          onClick={handleInstall}
        >
          <Share className="w-4 h-4 mr-2" />
          Add to Home Screen
        </Button>
      )
    } else if (isInstallable || deferredPrompt) {
      return (
        <Button 
          variant="outline" 
          className="w-full justify-center bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300 font-medium"
          onClick={handleInstall}
        >
          <Plus className="w-4 h-4 mr-2" />
          Install App
        </Button>
      )
    } else {
      return (
        <div className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
          <div className="flex items-center mb-2">
            <Smartphone className="w-4 h-4 mr-2 text-blue-600" />
            <span className="text-blue-700 font-medium text-sm">Install Ryo Forge AI</span>
          </div>
          <p className="text-xs text-blue-600 mb-2">
            Get the full app experience with offline access!
          </p>
          <Button 
            variant="outline" 
            size="sm"
            className="w-full text-blue-700 border-blue-300 hover:bg-blue-100"
            onClick={handleInstall}
          >
            <Download className="w-3 h-3 mr-1" />
            Install Now
          </Button>
        </div>
      )
    }
  }

  // Desktop variant
  if (isInstallable || deferredPrompt) {
    return (
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleInstall}
        className="text-blue-600 border-blue-600 hover:bg-blue-50 font-medium"
      >
        <Download className="w-4 h-4 mr-1" />
        Install App
      </Button>
    )
  }

  return null
}
