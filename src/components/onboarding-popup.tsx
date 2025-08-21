'use client'

import { useState } from 'react'
import { X, ArrowRight, ArrowLeft, ShoppingCart, Trophy, Users, Calendar, Target } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface OnboardingPopupProps {
  isOpen: boolean
  onClose: () => void
}

const slides = [
  {
    id: 1,
    title: "Welcome to the Loser Pool! 🏈",
    icon: <Trophy className="w-16 h-16 text-yellow-400 mb-4" />,
    content: (
      <div className="text-center space-y-4">
        <p className="text-lg text-white mb-4">
          You&apos;re about to join one of the most exciting NFL survivor pools around!
        </p>
        <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
          <h3 className="text-xl font-bold text-blue-200 mb-2">How It Works</h3>
          <p className="text-blue-100">
            Pick the team you think will <strong>LOSE</strong> each week. 
            If they lose, you survive. If they win, you&apos;re eliminated!
          </p>
        </div>
      </div>
    )
  },
  {
    id: 2,
    title: "The Rules 📋",
    icon: <Target className="w-16 h-16 text-red-400 mb-4" />,
    content: (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3">
          <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3">
            <h4 className="font-semibold text-green-200 mb-1">✅ Pick the LOSER</h4>
            <p className="text-green-100 text-sm">Choose the team you think will lose the game</p>
          </div>
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3">
            <h4 className="font-semibold text-red-200 mb-1">❌ IF they WIN, You&apos;re PICK is Eliminated</h4>
            <p className="text-red-100 text-sm">If all of your picks are wrong, then you&apos;re eliminated</p>
          </div>
          <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-3">
            <h4 className="font-semibold text-blue-200 mb-1">🏆 Last person standing wins!</h4>
            <p className="text-blue-100 text-sm">Survive the longest and take home the prize pool</p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 3,
    title: "Picks & Strategy 🎯",
    icon: <Users className="w-16 h-16 text-purple-400 mb-4" />,
    content: (
      <div className="space-y-4">
        <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg p-4">
          <h3 className="text-lg font-bold text-purple-200 mb-3">Picks Cost $21 Each</h3>
          <div className="grid grid-cols-1 gap-3 text-sm">
            <div className="flex items-center space-x-2">
              <span className="text-purple-300">•</span>
              <span className="text-purple-100">Buy up to 10 picks</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-purple-300">•</span>
              <span className="text-purple-100">You must use all your active picks every week</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-purple-300">•</span>
              <span className="text-purple-100">Only correctly chosen LOSER picks make it to the next week</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-purple-300">•</span>
              <span className="text-purple-100">Picks lock at Thursday kickoff</span>
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 4,
    title: "Ready to Get Started? 🚀",
    icon: <ShoppingCart className="w-16 h-16 text-green-400 mb-4" />,
    content: (
      <div className="text-center space-y-6">
        <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
          <h3 className="text-xl font-bold text-green-200 mb-2">You&apos;re All Set!</h3>
          <p className="text-green-100 mb-4">
            Now it&apos;s time to buy your picks and start your journey to becoming the last person standing!
          </p>
          <div className="text-sm text-green-200 space-y-1">
            <p>• Once the Regular season starts, you will not be able to purchase any more picks so buy up to 10 right now!</p>
            <p>• Picks are $21 each ($1 goes to administration costs and the other $20 goes to the pool!)</p>
            <p>• You can adjust picks up until TNF</p>
            <p>• All picks are locked and cannot be changed after kickoff TNF</p>
            <p>• You are picking the LOSER of the game - no takebacks!</p>
          </div>
        </div>
      </div>
    )
  }
]

export default function OnboardingPopup({ isOpen, onClose }: OnboardingPopupProps) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const router = useRouter()

  if (!isOpen) return null

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1)
    } else {
      // Final slide - go to purchase page
      router.push('/purchase')
      onClose()
    }
  }

  const handlePrevious = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1)
    }
  }

  const handleClose = () => {
    setCurrentSlide(0)
    onClose()
  }

  const currentSlideData = slides[currentSlide]

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">{currentSlide + 1}</span>
            </div>
            <span className="text-gray-300 text-sm">
              Step {currentSlide + 1} of {slides.length}
            </span>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="text-center mb-6">
            {currentSlideData.icon}
            <h2 className="text-2xl font-bold text-white mb-4">
              {currentSlideData.title}
            </h2>
          </div>
          
          <div className="text-gray-200">
            {currentSlideData.content}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-700">
          <button
            onClick={handlePrevious}
            disabled={currentSlide === 0}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <div className="flex space-x-2">
            {slides.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentSlide ? 'bg-blue-500' : 'bg-gray-600'
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <span>{currentSlide === slides.length - 1 ? 'Get Started' : 'Next'}</span>
            {currentSlide < slides.length - 1 && <ArrowRight className="w-4 h-4" />}
            {currentSlide === slides.length - 1 && <ShoppingCart className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  )
}
