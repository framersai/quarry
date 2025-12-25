/**
 * Flashcard Quiz Popover - Anki-style spaced repetition interface
 * @module codex/ui/FlashcardQuizPopover
 * 
 * @remarks
 * Research-backed spaced repetition quiz system:
 * - FSRS algorithm (Free Spaced Repetition Scheduler)
 * - Smooth card flip animations
 * - Progress tracking with XP rewards
 * - Integration with spiral curriculum
 * - Auto-generation from strand content
 * 
 * Based on research from:
 * - Ebbinghaus forgetting curve (1885)
 * - Pimsleur graduated interval recall
 * - SuperMemo SM-2 algorithm (optimized as FSRS)
 */

'use client'

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Brain, Zap, Check, X as XIcon, RotateCcw, ChevronRight,
  Sparkles, Trophy, Target, Clock, BookOpen, Play, Pause,
  Settings, Volume2, VolumeX, ArrowRight, Star, Flame
} from 'lucide-react'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import { useIsTouchDevice } from '../hooks/useIsTouchDevice'
import { useFlashcards, useFlashcardGeneration } from '../hooks/useFlashcards'
import type { Flashcard, FlashcardRating } from '../hooks/useFlashcards'
import { recordCardReview, addXP } from './LearningProgressDashboard'
import { formatInterval } from '@/lib/fsrs'
import CitationDisplay from './CitationDisplay'
import { useModalAccessibility } from '../hooks/useModalAccessibility'

interface FlashcardQuizPopoverProps {
  /** Whether popover is open */
  isOpen: boolean
  /** Close callback */
  onClose: () => void
  /** Current strand slug for filtering cards */
  strandSlug?: string
  /** Current strand content for auto-generation */
  content?: string
  /** Theme */
  theme?: string
}

/**
 * Rating button component with preview interval
 */
function RatingButton({
  rating,
  label,
  interval,
  color,
  onClick,
  isDark,
  isTouch = false,
}: {
  rating: FlashcardRating
  label: string
  interval: string
  color: 'red' | 'orange' | 'emerald' | 'cyan'
  onClick: () => void
  isDark: boolean
  isTouch?: boolean
}) {
  const colorClasses = {
    red: isDark
      ? 'from-red-900/50 to-red-950/50 border-red-700/50 hover:border-red-600 text-red-400 active:border-red-400'
      : 'from-red-50 to-red-100 border-red-200 hover:border-red-400 text-red-600 active:border-red-500',
    orange: isDark
      ? 'from-orange-900/50 to-orange-950/50 border-orange-700/50 hover:border-orange-600 text-orange-400 active:border-orange-400'
      : 'from-orange-50 to-orange-100 border-orange-200 hover:border-orange-400 text-orange-600 active:border-orange-500',
    emerald: isDark
      ? 'from-emerald-900/50 to-emerald-950/50 border-emerald-700/50 hover:border-emerald-600 text-emerald-400 active:border-emerald-400'
      : 'from-emerald-50 to-emerald-100 border-emerald-200 hover:border-emerald-400 text-emerald-600 active:border-emerald-500',
    cyan: isDark
      ? 'from-cyan-900/50 to-cyan-950/50 border-cyan-700/50 hover:border-cyan-600 text-cyan-400 active:border-cyan-400'
      : 'from-cyan-50 to-cyan-100 border-cyan-200 hover:border-cyan-400 text-cyan-600 active:border-cyan-500',
  }

  return (
    <motion.button
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`
        flex-1 flex flex-col items-center justify-center gap-1 rounded-xl
        bg-gradient-to-b ${colorClasses[color]}
        border-2 transition-all touch-manipulation
        ${isTouch ? 'p-3.5 min-h-[64px]' : 'p-3 min-h-[56px] sm:min-h-[64px]'}
      `}
    >
      <span className={`font-bold ${isTouch ? 'text-sm' : 'text-xs sm:text-sm'}`}>{label}</span>
      <span className={`${isTouch ? 'text-[11px]' : 'text-[10px]'} ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
        {interval}
      </span>
    </motion.button>
  )
}

/**
 * Flashcard component with flip animation
 */
function FlashcardDisplay({
  card,
  isFlipped,
  onFlip,
  isDark,
  onJumpToSource,
  isTouch = false,
}: {
  card: Flashcard
  isFlipped: boolean
  onFlip: () => void
  isDark: boolean
  onJumpToSource?: (text: string) => void
  isTouch?: boolean
}) {
  return (
    <div
      className={`
        relative w-full perspective-1000 cursor-pointer touch-manipulation
        ${isTouch ? 'h-[260px] sm:h-[300px]' : 'h-[240px] sm:h-[280px]'}
      `}
      onClick={onFlip}
    >
      <motion.div
        className="w-full h-full relative"
        initial={false}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.5, type: 'spring', stiffness: 200, damping: 25 }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Front side */}
        <div
          className={`
            absolute inset-0 rounded-2xl p-6 backface-hidden
            flex flex-col items-center justify-center text-center
            border-2
            ${isDark
              ? 'bg-gradient-to-br from-zinc-800 to-zinc-900 border-zinc-700'
              : 'bg-gradient-to-br from-white to-zinc-50 border-zinc-200'
            }
          `}
          style={{ backfaceVisibility: 'hidden' }}
        >
          {/* Top badges row */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
            {/* Card type badge */}
            <div className={`px-2 py-1 rounded-full text-[10px] font-semibold uppercase ${
              card.type === 'cloze'
                ? isDark ? 'bg-cyan-900/50 text-cyan-400' : 'bg-cyan-100 text-cyan-600'
                : isDark ? 'bg-violet-900/50 text-violet-400' : 'bg-violet-100 text-violet-600'
            }`}>
              {card.type}
            </div>

            {/* Difficulty badge */}
            <div className={`px-2 py-1 rounded-full text-[10px] font-semibold ${
              card.fsrs.difficulty <= 3
                ? isDark ? 'bg-emerald-900/50 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
                : card.fsrs.difficulty <= 6
                  ? isDark ? 'bg-amber-900/50 text-amber-400' : 'bg-amber-100 text-amber-600'
                  : isDark ? 'bg-red-900/50 text-red-400' : 'bg-red-100 text-red-600'
            }`}>
              {card.fsrs.difficulty <= 3 ? 'Easy' :
               card.fsrs.difficulty <= 6 ? 'Medium' : 'Hard'}
            </div>
          </div>
          
          <p className={`text-lg font-medium leading-relaxed ${isDark ? 'text-zinc-100' : 'text-zinc-800'}`}>
            {card.front}
          </p>
          
          <div className={`absolute bottom-4 flex items-center gap-1 text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            <RotateCcw className="w-3 h-3" />
            <span>Tap to reveal</span>
          </div>
        </div>
        
        {/* Back side */}
        <div
          className={`
            absolute inset-0 rounded-2xl p-4 backface-hidden
            flex flex-col
            border-2 overflow-hidden
            ${isDark
              ? 'bg-gradient-to-br from-emerald-950/50 to-zinc-900 border-emerald-800/50'
              : 'bg-gradient-to-br from-emerald-50 to-white border-emerald-200'
            }
          `}
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <div className={`flex items-center gap-1 mb-2 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
            <Check className="w-4 h-4" />
            <span className="text-xs font-semibold">Answer</span>
          </div>

          <div className="flex-1 flex items-center justify-center text-center">
            <p className={`text-xl font-bold ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
              {card.back}
            </p>
          </div>

          {card.hints && card.hints.length > 0 && (
            <p className={`text-sm text-center ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              💡 {card.hints[0]}
            </p>
          )}

          {/* Citation - show source text */}
          {card.generation?.sourceText && (
            <div className="mt-2" onClick={(e) => e.stopPropagation()}>
              <CitationDisplay
                sourceText={card.generation.sourceText}
                method={card.generation.method}
                confidence={card.generation.confidence}
                isDark={isDark}
                onJumpToSource={onJumpToSource}
                compact
              />
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

/**
 * Progress ring component
 */
function ProgressRing({
  progress,
  size = 48,
  strokeWidth = 4,
  isDark,
}: {
  progress: number
  size?: number
  strokeWidth?: number
  isDark: boolean
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / 100) * circumference

  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={isDark ? '#27272a' : '#e4e4e7'}
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={isDark ? '#10b981' : '#059669'}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-500"
      />
    </svg>
  )
}

/**
 * Main flashcard quiz popover
 */
export default function FlashcardQuizPopover({
  isOpen,
  onClose,
  strandSlug,
  content,
  theme = 'light',
}: FlashcardQuizPopoverProps) {
  const isDark = theme.includes('dark')
  const { isMobile } = useBreakpoint()
  const isTouch = useIsTouchDevice()
  const [isMounted, setIsMounted] = useState(false)
  const [isFlipped, setIsFlipped] = useState(false)
  const [showGenerate, setShowGenerate] = useState(false)
  const [generating, setGenerating] = useState(false)
  
  const {
    cards,
    dueCards,
    stats,
    loading,
    session,
    currentCard,
    intervalPreview,
    startSession,
    endSession,
    rateCard,
    skipCard,
    createCard,
  } = useFlashcards({ strandSlug, autoLoad: true })

  const { generateFromKeywords, generateFromDefinitions } = useFlashcardGeneration()

  // Accessibility features
  const { backdropRef, contentRef, modalProps, handleBackdropClick } = useModalAccessibility({
    isOpen,
    onClose,
    closeOnEscape: true,
    closeOnClickOutside: true,
    trapFocus: true,
    lockScroll: true,
    modalId: 'flashcard-quiz-popover',
  })

  useEffect(() => {
    setIsMounted(true)
    return () => setIsMounted(false)
  }, [])

  // Reset flip state when card changes
  useEffect(() => {
    setIsFlipped(false)
  }, [currentCard?.id])

  // Close on escape
  useEffect(() => {
    if (!isOpen) return
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  const handleRate = useCallback(async (rating: FlashcardRating) => {
    if (!currentCard) return
    
    try {
      await rateCard(rating)
      
      // Track stats for learning dashboard
      const isCorrect = rating >= 3
      recordCardReview(isCorrect, strandSlug)
      
      // Award XP based on rating
      const xpReward = rating === 4 ? 15 : rating === 3 ? 10 : rating === 2 ? 5 : 2
      addXP(xpReward)
      
      setIsFlipped(false)
    } catch (err) {
      console.error('Failed to rate card:', err)
    }
  }, [currentCard, rateCard, strandSlug])

  const handleGenerateCards = useCallback(async () => {
    if (!content || !strandSlug) return
    
    setGenerating(true)
    try {
      const keywordCards = await generateFromKeywords(content, strandSlug)
      const definitionCards = await generateFromDefinitions(content, strandSlug)
      
      const allGenerated = [...keywordCards, ...definitionCards]
      
      for (const cardData of allGenerated.slice(0, 10)) {
        await createCard(cardData)
      }
      
      setShowGenerate(false)
    } catch (err) {
      console.error('Failed to generate cards:', err)
    } finally {
      setGenerating(false)
    }
  }, [content, strandSlug, generateFromKeywords, generateFromDefinitions, createCard])

  const progress = useMemo(() => {
    if (!session.active || session.cards.length === 0) return 0
    return Math.round((session.reviewed / session.cards.length) * 100)
  }, [session])

  /**
   * Jump to source text in the content viewer
   * Closes popover and scrolls to the matching text
   */
  const handleJumpToSource = useCallback((sourceText: string) => {
    // Close the popover first
    onClose()

    // Wait a tick for the popover to close, then scroll to source
    setTimeout(() => {
      // Find the content container
      const contentEl = document.querySelector('.codex-content-scroll')
      if (!contentEl) return

      // Try to find text that matches the source
      const walker = document.createTreeWalker(
        contentEl,
        NodeFilter.SHOW_TEXT,
        null
      )

      // Normalize source text for comparison
      const normalizedSource = sourceText.toLowerCase().trim().slice(0, 50)

      let node: Text | null
      while ((node = walker.nextNode() as Text | null)) {
        const text = node.textContent?.toLowerCase().trim() || ''
        if (text.includes(normalizedSource)) {
          // Found matching text - scroll its parent into view
          const parent = node.parentElement
          if (parent) {
            parent.scrollIntoView({ behavior: 'smooth', block: 'center' })
            // Highlight the element briefly
            parent.classList.add('ring-2', 'ring-cyan-500', 'ring-offset-2', 'bg-cyan-50', 'dark:bg-cyan-900/30')
            setTimeout(() => {
              parent.classList.remove('ring-2', 'ring-cyan-500', 'ring-offset-2', 'bg-cyan-50', 'dark:bg-cyan-900/30')
            }, 2000)
          }
          break
        }
      }
    }, 100)
  }, [onClose])

  if (!isOpen || !isMounted) return null

  const popoverContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            ref={backdropRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-[299]"
            onClick={handleBackdropClick}
          />

          {/* Popover */}
          <motion.div
            ref={contentRef}
            {...modalProps}
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ type: 'spring', duration: 0.3, bounce: 0.15 }}
            className={`
              fixed z-[300] flex flex-col
              md:bottom-4 md:right-4 md:w-[min(92vw,480px)] md:max-h-[85vh]
              max-md:inset-0 max-md:w-full max-md:h-full
              overflow-hidden md:rounded-2xl md:shadow-2xl
              ${isDark
                ? 'bg-zinc-900/95 border border-zinc-700/50'
                : 'bg-white/95 border border-zinc-200/50'
              }
            `}
          >
            {/* Header */}
            <div className={`
              relative px-4 py-4 border-b shrink-0
              ${isDark 
                ? 'border-zinc-800 bg-gradient-to-r from-emerald-950/50 via-zinc-900 to-cyan-950/30' 
                : 'border-zinc-200 bg-gradient-to-r from-emerald-50/80 via-white to-cyan-50/50'
              }
            `}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`
                    p-2.5 rounded-xl
                    ${isDark 
                      ? 'bg-gradient-to-br from-emerald-900/70 to-cyan-900/50 ring-1 ring-emerald-700/50' 
                      : 'bg-gradient-to-br from-emerald-100 to-cyan-100 ring-1 ring-emerald-200'
                    }
                  `}>
                    <Brain className={`w-5 h-5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                  </div>
                  <div>
                    <h2 className={`text-lg font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                      Flashcard Quiz
                    </h2>
                    <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      {session.active 
                        ? `${session.reviewed}/${session.cards.length} reviewed`
                        : `${dueCards.length} cards due`
                      }
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={onClose}
                  className={`
                    rounded-xl transition-all touch-manipulation
                    ${isTouch ? 'p-2.5 min-w-[44px] min-h-[44px]' : 'p-2'}
                    ${isDark
                      ? 'hover:bg-zinc-800 active:bg-zinc-700 text-zinc-400 hover:text-zinc-200'
                      : 'hover:bg-zinc-100 active:bg-zinc-200 text-zinc-500 hover:text-zinc-700'
                    }
                  `}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Progress bar */}
              {session.active && (
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex-1 h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Flame className={`w-4 h-4 ${session.streak >= 3 ? 'text-orange-500' : isDark ? 'text-zinc-600' : 'text-zinc-300'}`} />
                    <span className={`text-sm font-bold ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                      {session.streak}
                    </span>
                  </div>
                </div>
              )}
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="flex items-center justify-center h-48">
                  <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
                </div>
              ) : !session.active ? (
                /* Start screen */
                <div className="space-y-6">
                  {/* Stats cards */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className={`p-3 rounded-xl text-center ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'}`}>
                      <p className={`text-2xl font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                        {dueCards.length}
                      </p>
                      <p className={`text-[10px] uppercase tracking-wide ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        Due Now
                      </p>
                    </div>
                    <div className={`p-3 rounded-xl text-center ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'}`}>
                      <p className={`text-2xl font-bold ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}>
                        {stats.new}
                      </p>
                      <p className={`text-[10px] uppercase tracking-wide ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        New
                      </p>
                    </div>
                    <div className={`p-3 rounded-xl text-center ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'}`}>
                      <p className={`text-2xl font-bold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                        {stats.learning}
                      </p>
                      <p className={`text-[10px] uppercase tracking-wide ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        Learning
                      </p>
                    </div>
                  </div>
                  
                  {/* Start button */}
                  {dueCards.length > 0 ? (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => startSession()}
                      className={`
                        w-full flex items-center justify-center gap-3 rounded-xl
                        bg-gradient-to-r from-emerald-600 to-cyan-600
                        text-white font-bold
                        shadow-lg shadow-emerald-500/20
                        hover:shadow-xl hover:shadow-emerald-500/30
                        transition-shadow touch-manipulation
                        ${isTouch ? 'py-4 min-h-[56px] text-base' : 'py-4 text-lg'}
                      `}
                    >
                      <Play className={isTouch ? 'w-5 h-5' : 'w-6 h-6'} />
                      Start Review ({dueCards.length} cards)
                    </motion.button>
                  ) : (
                    <div className={`text-center py-8 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      <Trophy className="w-12 h-12 mx-auto mb-3 opacity-40" />
                      <p className="font-medium">All caught up!</p>
                      <p className="text-sm mt-1 opacity-70">No cards due for review</p>
                    </div>
                  )}
                  
                  {/* Generate cards option */}
                  {content && strandSlug && (
                    <div className={`p-4 rounded-xl border-2 border-dashed ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`}>
                      {showGenerate ? (
                        <div className="space-y-3">
                          <p className={`text-sm font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-700'}`}>
                            Choose generation method:
                          </p>
                          <div className="space-y-2">
                            {/* Offline NLP Option */}
                            <motion.button
                              whileTap={{ scale: 0.98 }}
                              onClick={handleGenerateCards}
                              disabled={generating}
                              className={`
                                w-full flex items-start gap-3 p-3 rounded-lg text-left
                                ${isDark
                                  ? 'bg-zinc-800/70 hover:bg-zinc-800 border border-zinc-700'
                                  : 'bg-zinc-50 hover:bg-zinc-100 border border-zinc-200'
                                }
                                disabled:opacity-50 transition-colors
                              `}
                            >
                              <div className={`p-2 rounded-lg shrink-0 ${isDark ? 'bg-emerald-900/50' : 'bg-emerald-100'}`}>
                                <Zap className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={`text-sm font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-800'}`}>
                                    Offline NLP
                                  </span>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'bg-emerald-900/50 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                                    Instant
                                  </span>
                                </div>
                                <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                                  Static text analysis - works offline, fast, privacy-first
                                </p>
                              </div>
                              {generating && (
                                <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin shrink-0" />
                              )}
                            </motion.button>

                            {/* LLM Enhanced Option */}
                            <motion.button
                              whileTap={{ scale: 0.98 }}
                              onClick={() => {
                                // TODO: Implement LLM generation
                                console.log('[Flashcards] LLM generation not yet implemented')
                              }}
                              disabled={true}
                              className={`
                                w-full flex items-start gap-3 p-3 rounded-lg text-left
                                ${isDark
                                  ? 'bg-zinc-800/70 hover:bg-zinc-800 border border-zinc-700'
                                  : 'bg-zinc-50 hover:bg-zinc-100 border border-zinc-200'
                                }
                                disabled:opacity-50 transition-colors
                              `}
                            >
                              <div className={`p-2 rounded-lg shrink-0 ${isDark ? 'bg-violet-900/50' : 'bg-violet-100'}`}>
                                <Sparkles className={`w-4 h-4 ${isDark ? 'text-violet-400' : 'text-violet-600'}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={`text-sm font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-800'}`}>
                                    LLM Enhanced
                                  </span>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'bg-violet-900/50 text-violet-400' : 'bg-violet-100 text-violet-700'}`}>
                                    Coming Soon
                                  </span>
                                </div>
                                <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                                  AI-powered generation - smarter cards, requires API key
                                </p>
                              </div>
                            </motion.button>
                          </div>
                          <button
                            onClick={() => setShowGenerate(false)}
                            className={`w-full py-2 rounded-lg text-sm ${isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-500 hover:text-zinc-700'}`}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowGenerate(true)}
                          className={`w-full flex items-center justify-center gap-2 text-sm ${isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-500 hover:text-zinc-700'}`}
                        >
                          <Sparkles className="w-4 h-4" />
                          Auto-generate flashcards from content
                        </button>
                      )}
                    </div>
                  )}
                  
                  {/* Research note */}
                  <div className={`p-3 rounded-lg text-xs ${isDark ? 'bg-zinc-800/30 text-zinc-500' : 'bg-zinc-50 text-zinc-400'}`}>
                    <p className="flex items-center gap-1.5">
                      <BookOpen className="w-3 h-3" />
                      <span className="font-medium">Research-backed</span>
                    </p>
                    <p className="mt-1 leading-relaxed">
                      Uses FSRS algorithm based on Ebbinghaus forgetting curve research. 
                      Cards are scheduled at optimal intervals for long-term retention.
                    </p>
                  </div>
                </div>
              ) : currentCard ? (
                /* Active study session */
                <div className="space-y-4">
                  {/* Card display */}
                  <FlashcardDisplay
                    card={currentCard}
                    isFlipped={isFlipped}
                    onFlip={() => setIsFlipped(!isFlipped)}
                    isDark={isDark}
                    onJumpToSource={handleJumpToSource}
                    isTouch={isTouch}
                  />
                  
                  {/* Rating buttons - only show when flipped */}
                  <AnimatePresence>
                    {isFlipped && intervalPreview && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="flex gap-2"
                      >
                        <RatingButton
                          rating={1}
                          label="Again"
                          interval="<1m"
                          color="red"
                          onClick={() => handleRate(1)}
                          isDark={isDark}
                          isTouch={isTouch}
                        />
                        <RatingButton
                          rating={2}
                          label="Hard"
                          interval={formatInterval(intervalPreview[2])}
                          color="orange"
                          onClick={() => handleRate(2)}
                          isDark={isDark}
                          isTouch={isTouch}
                        />
                        <RatingButton
                          rating={3}
                          label="Good"
                          interval={formatInterval(intervalPreview[3])}
                          color="emerald"
                          onClick={() => handleRate(3)}
                          isDark={isDark}
                          isTouch={isTouch}
                        />
                        <RatingButton
                          rating={4}
                          label="Easy"
                          interval={formatInterval(intervalPreview[4])}
                          color="cyan"
                          onClick={() => handleRate(4)}
                          isDark={isDark}
                          isTouch={isTouch}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  {/* Skip button */}
                  {!isFlipped && (
                    <button
                      onClick={skipCard}
                      className={`
                        w-full text-sm transition-colors touch-manipulation
                        ${isTouch ? 'py-3 min-h-[44px]' : 'py-2'}
                        ${isDark ? 'text-zinc-500 hover:text-zinc-300 active:text-zinc-200' : 'text-zinc-400 hover:text-zinc-600 active:text-zinc-700'}
                      `}
                    >
                      Skip this card
                    </button>
                  )}
                </div>
              ) : (
                /* Session complete */
                <div className="text-center py-8 space-y-4">
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', bounce: 0.5 }}
                  >
                    <Trophy className={`w-16 h-16 mx-auto ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
                  </motion.div>
                  
                  <div>
                    <h3 className={`text-xl font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                      Session Complete! 🎉
                    </h3>
                    <p className={`text-sm mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      You reviewed {session.reviewed} cards
                    </p>
                  </div>
                  
                  <div className="flex justify-center gap-6">
                    <div className="text-center">
                      <p className={`text-2xl font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                        {session.correct}
                      </p>
                      <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Correct</p>
                    </div>
                    <div className="text-center">
                      <p className={`text-2xl font-bold ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}>
                        +{session.xpEarned}
                      </p>
                      <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>XP Earned</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => endSession()}
                    className={`
                      mt-4 px-6 py-2 rounded-xl font-medium
                      ${isDark 
                        ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200' 
                        : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                      }
                    `}
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className={`
              px-4 py-3 border-t shrink-0
              flex items-center justify-between
              ${isDark ? 'border-zinc-800 bg-zinc-950/50' : 'border-zinc-200 bg-zinc-50/50'}
            `}>
              <div className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                <span className="font-medium">{cards.length}</span> total cards
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className={`
                    rounded-lg font-medium transition-colors touch-manipulation
                    ${isTouch ? 'px-5 py-2.5 min-h-[44px] text-sm' : 'px-4 py-2 text-sm'}
                    ${isDark
                      ? 'bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-zinc-300'
                      : 'bg-zinc-200 hover:bg-zinc-300 active:bg-zinc-400 text-zinc-700'
                    }
                  `}
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )

  return createPortal(popoverContent, document.body)
}

