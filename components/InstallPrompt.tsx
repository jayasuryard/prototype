'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Download, X, Smartphone } from 'lucide-react'

export default function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Check if already dismissed
    const isDismissed = localStorage.getItem('install-prompt-dismissed') === 'true'
    if (isDismissed) {
      setDismissed(true)
      return
    }

    // Check if app is already installed
    const standalone = window.matchMedia('(display-mode: standalone)').matches || 
                      (window.navigator as any).standalone === true
    if (standalone) {
      setIsInstalled(true)
      return
    }

    // Listen for the install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      
      // Show prompt after a short delay
      setTimeout(() => {
        setShowPrompt(true)
      }, 3000) // Show after 3 seconds
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // For mobile devices without install prompt support
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    if (isMobile && !standalone) {
      setTimeout(() => {
        setShowPrompt(true)
      }, 5000) // Show after 5 seconds on mobile
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
        setShowPrompt(false)
        setDeferredPrompt(null)
      } else {
        setShowPrompt(false)
      }
    } else {
      // For iOS or browsers without install prompt
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
      if (isIOS) {
        alert('To install this app:\n\n1. Tap the Share button (⬆️) in Safari\n2. Scroll down and tap "Add to Home Screen"\n3. Tap "Add" to confirm')
      }
      setShowPrompt(false)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    setDismissed(true)
    localStorage.setItem('install-prompt-dismissed', 'true')
  }

  if (isInstalled || dismissed || !showPrompt) {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 lg:left-auto lg:right-4 lg:w-80">
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 mx-auto">
        <div className="flex items-start justify-between">
          <div className="flex items-center flex-1">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
              <Smartphone className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-gray-900 mb-1">
                Install Ryo Forge AI
              </h3>
              <p className="text-xs text-gray-600 mb-3">
                Get faster access and work offline!
              </p>
              <div className="flex space-x-2">
                <Button 
                  size="sm"
                  onClick={handleInstall}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                >
                  <Download className="w-3 h-3 mr-1" />
                  Install
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleDismiss}
                  className="text-gray-600 border-gray-300 text-xs"
                >
                  Not now
                </Button>
              </div>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
