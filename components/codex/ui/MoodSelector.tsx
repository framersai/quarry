/**
 * Mood Selector Component
 * @module codex/ui/MoodSelector
 * 
 * Elegant mood selection interface with custom SVG icons.
 * Allows users to set their current mood for personalized experience.
 */

'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check } from 'lucide-react'
import { 
  type MoodState, 
  MOOD_CONFIG, 
  getCurrentMood, 
  setCurrentMood, 
  clearCurrentMood 
} from '@/lib/codex/mood'

interface MoodSelectorProps {
  /** Called when mood is selected */
  onMoodChange?: (mood: MoodState | null) => void
  /** Compact mode for sidebar */
  compact?: boolean
  /** Show labels */
  showLabels?: boolean
  /** Current theme */
  theme?: string
}

/**
 * Custom SVG icons for each mood
 */
const MoodIcons: Record<MoodState, React.FC<{ className?: string }>> = {
  focused: ({ className }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {/* Target/bullseye icon */}
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
  ),
  
  creative: ({ className }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {/* Palette/brush icon */}
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z" />
      <circle cx="7.5" cy="11.5" r="1.5" fill="currentColor" />
      <circle cx="12" cy="7.5" r="1.5" fill="currentColor" />
      <circle cx="16.5" cy="11.5" r="1.5" fill="currentColor" />
    </svg>
  ),
  
  curious: ({ className }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {/* Magnifying glass with question */}
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
      <path d="M11 8v1" />
      <path d="M11 14h.01" />
      <path d="M9.5 10.5a1.5 1.5 0 1 1 3 0c0 1-1.5 1.5-1.5 2.5" />
    </svg>
  ),
  
  relaxed: ({ className }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {/* Leaf/nature icon */}
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
  ),
  
  energetic: ({ className }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {/* Lightning bolt */}
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="currentColor" fillOpacity="0.2" />
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  ),
  
  reflective: ({ className }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {/* Moon with stars */}
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
      <path d="M19 3v4" />
      <path d="M21 5h-4" />
    </svg>
  ),
}

const MOODS: MoodState[] = ['focused', 'creative', 'curious', 'relaxed', 'energetic', 'reflective']

/**
 * Elegant mood selector with custom icons
 */
export default function MoodSelector({
  onMoodChange,
  compact = false,
  showLabels = true,
  theme = 'light',
}: MoodSelectorProps) {
  const [currentMood, setCurrentMoodState] = useState<MoodState | null>(null)
  const [hoveredMood, setHoveredMood] = useState<MoodState | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  
  // Load current mood on mount
  useEffect(() => {
    const mood = getCurrentMood()
    setCurrentMoodState(mood)
  }, [])
  
  const handleMoodSelect = (mood: MoodState) => {
    if (currentMood === mood) {
      // Deselect
      clearCurrentMood()
      setCurrentMoodState(null)
      onMoodChange?.(null)
    } else {
      // Select new mood
      setCurrentMood(mood)
      setCurrentMoodState(mood)
      onMoodChange?.(mood)
    }
    setIsExpanded(false)
  }
  
  if (compact) {
    // Compact mode: show current mood or prompt to select
    return (
      <div className="relative">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200
            ${currentMood 
              ? `${MOOD_CONFIG[currentMood].color} ${MOOD_CONFIG[currentMood].darkColor}` 
              : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700'
            }`}
        >
          {currentMood ? (
            <>
              {React.createElement(MoodIcons[currentMood], { className: 'w-4 h-4' })}
              <span className="text-xs font-medium">{MOOD_CONFIG[currentMood].label}</span>
            </>
          ) : (
            <span className="text-xs text-zinc-500 dark:text-zinc-400">How are you feeling?</span>
          )}
        </button>
        
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 top-full mt-2 z-50 p-3 rounded-xl 
                bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700
                shadow-xl shadow-black/10 dark:shadow-black/30"
            >
              <div className="grid grid-cols-3 gap-2 min-w-[200px]">
                {MOODS.map((mood) => {
                  const config = MOOD_CONFIG[mood]
                  const Icon = MoodIcons[mood]
                  const isSelected = currentMood === mood
                  
                  return (
                    <button
                      key={mood}
                      onClick={() => handleMoodSelect(mood)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-200
                        ${isSelected 
                          ? `${config.color} ${config.darkColor} ring-2 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900`
                          : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
                        }`}
                    >
                      <Icon className={`w-5 h-5 ${isSelected ? '' : 'text-zinc-500 dark:text-zinc-400'}`} />
                      <span className={`text-[10px] font-medium ${isSelected ? '' : 'text-zinc-600 dark:text-zinc-400'}`}>
                        {config.label}
                      </span>
                    </button>
                  )
                })}
              </div>
              
              {currentMood && (
                <button
                  onClick={() => {
                    clearCurrentMood()
                    setCurrentMoodState(null)
                    onMoodChange?.(null)
                    setIsExpanded(false)
                  }}
                  className="w-full mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-700
                    text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                >
                  Clear mood
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }
  
  // Full mode: show all moods in a row/grid
  return (
    <div className="space-y-2">
      {/* Header with inline mood description on hover */}
      <div className="flex items-center justify-between min-h-[20px]">
        <div className="flex items-center gap-2 flex-1">
          <h3 className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide flex-shrink-0">
            Mood
          </h3>
          {/* Inline mood description - appears on hover without pushing content */}
          <AnimatePresence mode="wait">
            {hoveredMood && (
              <motion.span
                key={hoveredMood}
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 5 }}
                className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate"
              >
                {MOOD_CONFIG[hoveredMood].description}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        {currentMood && (
          <button
            onClick={() => {
              clearCurrentMood()
              setCurrentMoodState(null)
              onMoodChange?.(null)
            }}
            className="text-[10px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors flex-shrink-0"
          >
            Clear
          </button>
        )}
      </div>
      
      <div className="grid grid-cols-6 gap-1">
        {MOODS.map((mood) => {
          const config = MOOD_CONFIG[mood]
          const Icon = MoodIcons[mood]
          const isSelected = currentMood === mood
          const isHovered = hoveredMood === mood
          
          return (
            <motion.button
              key={mood}
              onClick={() => handleMoodSelect(mood)}
              onMouseEnter={() => setHoveredMood(mood)}
              onMouseLeave={() => setHoveredMood(null)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title={`${config.label}: ${config.description}`}
              className={`relative flex flex-col items-center gap-1 p-2 rounded-lg border 
                transition-all duration-150
                ${isSelected 
                  ? `${config.color} ${config.darkColor} border-current shadow-sm`
                  : 'border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                }`}
            >
              <motion.div
                animate={{
                  scale: isSelected ? 1.1 : isHovered ? 1.05 : 1,
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              >
                <Icon className={`w-4 h-4 ${isSelected ? '' : 'text-zinc-400 dark:text-zinc-500'}`} />
              </motion.div>
              
              {showLabels && (
                <span className={`text-[9px] font-medium leading-tight ${isSelected ? '' : 'text-zinc-500 dark:text-zinc-400'}`}>
                  {config.label}
                </span>
              )}
              
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 
                    flex items-center justify-center shadow-sm"
                >
                  <Check className="w-2 h-2 text-white" strokeWidth={3} />
                </motion.div>
              )}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

export { MoodIcons }












