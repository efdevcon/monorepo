'use client'

import React, { useEffect, useState } from 'react'
import { useLocalStorage } from 'usehooks-ts'
import { Button } from '@/components/ui/button'

interface InstallPWAProps {
  onClose?: () => void
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const InstallPWA: React.FC<InstallPWAProps> = ({ onClose }) => {
  const [showPopup, setShowPopup] = useState(false)
  const [showInstallPWA, setShowInstallPWA] = useLocalStorage('showInstallPWA', false)
  const [pwa] = useLocalStorage<boolean | null>('pwa', null)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    // Only show PWA prompt if not already installed and showInstallPWA is true
    if (pwa === false && showInstallPWA === true) {
      setShowPopup(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [pwa, showInstallPWA])

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          handleCloseClick()
        }
      })
    }
  }

  const handleCloseClick = () => {
    setShowPopup(false)
    setShowInstallPWA(false)
    if (onClose) {
      onClose()
    }
  }

  if (!showPopup) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl">
        <button
          onClick={handleCloseClick}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
        
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-4">
            Install this app for a better experience.
          </h3>
          
          <div className="bg-gradient-to-b from-gray-600 to-gray-700 rounded-2xl p-4 mb-4">
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 bg-white rounded-2xl shadow-lg mb-2 flex items-center justify-center">
                <img
                  src="/app-icon.png"
                  alt="App icon"
                  className="w-16 h-16 rounded-xl"
                />
              </div>
              <span className="text-white text-xs font-bold">Devconnect</span>
            </div>
          </div>
          
          <div className="space-y-4">
            {deferredPrompt ? (
              <div className="flex items-center justify-center gap-2">
                <Button onClick={handleInstallClick}>
                  Install
                </Button>
                <span className="text-sm text-gray-600">👈 Click & accept the prompt!</span>
              </div>
            ) : (
              <p className="text-sm text-gray-600">
                Instructions: Open this website in Safari, press the share button, then &quot;Add to home screen&quot;
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default InstallPWA 
