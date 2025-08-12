'use client'

import { useEffect } from 'react'

export default function PWAInstall() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Register service worker
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          console.log('Service Worker registered successfully:', registration.scope)
        })
        .catch((error) => {
          console.log('Service Worker registration failed:', error)
        })

      // Handle app install prompt
      let deferredPrompt: any
      
      window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent Chrome 67 and earlier from automatically showing the prompt
        e.preventDefault()
        // Stash the event so it can be triggered later
        deferredPrompt = e
        
        // Show install button or banner
        showInstallPromotion()
      })

      window.addEventListener('appinstalled', () => {
        console.log('PWA was installed')
        // Hide install promotion
        hideInstallPromotion()
        // Track install event
        try {
          // @ts-ignore
          if (typeof gtag !== 'undefined') {
            // @ts-ignore
            gtag('event', 'pwa_install', {
              event_category: 'engagement',
              event_label: 'PWA Install'
            })
          }
        } catch (error) {
          console.log('Analytics tracking not available')
        }
      })

      // Function to show install promotion
      function showInstallPromotion() {
        const installBanner = document.createElement('div')
        installBanner.id = 'pwa-install-banner'
        installBanner.className = 'fixed bottom-4 left-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50 flex items-center justify-between max-w-sm mx-auto'
        installBanner.innerHTML = `
          <div class="flex items-center">
            <svg class="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
            <div>
              <p class="font-semibold text-sm">Install Ryo Forge AI</p>
              <p class="text-xs opacity-90">Quick access to your health assistant</p>
            </div>
          </div>
          <div class="flex">
            <button id="pwa-install-btn" class="bg-white text-blue-600 px-3 py-1 rounded text-sm font-medium mr-2">Install</button>
            <button id="pwa-dismiss-btn" class="text-white opacity-70 hover:opacity-100">✕</button>
          </div>
        `
        
        document.body.appendChild(installBanner)

        // Handle install button click
        document.getElementById('pwa-install-btn')?.addEventListener('click', async () => {
          if (deferredPrompt) {
            deferredPrompt.prompt()
            const { outcome } = await deferredPrompt.userChoice
            console.log(`User response to the install prompt: ${outcome}`)
            deferredPrompt = null
            hideInstallPromotion()
          }
        })

        // Handle dismiss button click
        document.getElementById('pwa-dismiss-btn')?.addEventListener('click', () => {
          hideInstallPromotion()
          // Remember user dismissed the prompt
          localStorage.setItem('pwa-dismissed', 'true')
        })

        // Auto-hide after 10 seconds
        setTimeout(() => {
          hideInstallPromotion()
        }, 10000)
      }

      // Function to hide install promotion
      function hideInstallPromotion() {
        const banner = document.getElementById('pwa-install-banner')
        if (banner) {
          banner.remove()
        }
      }

      // Check if user previously dismissed the prompt
      const wasDismissed = localStorage.getItem('pwa-dismissed')
      if (wasDismissed) {
        // Don't show the promotion if user dismissed it before
        return
      }

      // Check if app is already installed
      if (window.matchMedia('(display-mode: standalone)').matches) {
        console.log('App is running in standalone mode')
        return
      }
    }
  }, [])

  return null
}
