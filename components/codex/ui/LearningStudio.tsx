'use client'

/**
 * Learning Studio - Unified Flashcard, Quiz & Question Interface
 * @module codex/ui/LearningStudio
 * 
 * @remarks
 * Combines all learning tools in one beautiful tabulated interface:
 * - Flashcards with FSRS spaced repetition
 * - Quizzes (multiple choice, true/false, fill blank)
 * - Global glossary with multi-strand aggregation
 * - Suggested questions from NLP
 * 
 * Features:
 * - Single strand mode (from codex viewer)
 * - Multi-strand mode (select strands for global generation)
 * - Spiral learning path integration
 * 
 * Can be used as:
 * - Popover (from toolbar)
 * - Full page at /codex/learn
 */

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { getConfiguredProviders } from '@/lib/config/apiKeyStorage'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion'
import {
  X, Brain, Zap, Check, RotateCcw, ChevronRight, ChevronLeft,
  Sparkles, Trophy, Target, Clock, BookOpen, Play, Pause,
  Settings, ArrowRight, Star, Flame, Lightbulb, Code, Layers,
  HelpCircle, RefreshCw, ChevronDown, Maximize2, Minimize2,
  PanelLeftClose, PanelLeftOpen, GraduationCap, ListChecks,
  MessageCircleQuestion, Award, Pencil, SkipForward, Book,
  Trash2, Edit3, LayoutList, Info, Cpu, Cloud, RotateCw,
  Library, Globe, Plus, Filter, Hash, Tag, FolderTree, Search,
  FileText, Network
} from 'lucide-react'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import { useIsTouchDevice } from '../hooks/useIsTouchDevice'
import { useFlashcards, useFlashcardGeneration } from '../hooks/useFlashcards'
import type { Flashcard, FlashcardRating } from '../hooks/useFlashcards'
import { useQuizGeneration, type QuizQuestion } from '../hooks/useQuizGeneration'
import { useQuizEdits } from '../hooks/useQuizEdits'
import { useGlobalGlossary, type GlobalGlossaryFilters } from '../hooks/useGlobalGlossary'
import { useMultiStrandContent, type StrandSummary, type StrandWithContent } from '../hooks/useMultiStrandContent'
import type { StrandMetadata } from '../types'
import { recordCardReview, addXP, getLearningStats, type LearningStats } from './LearningProgressDashboard'
import CitationDisplay from './CitationDisplay'
import GlossaryPanel from './GlossaryPanel'
import FlashcardGrid from './FlashcardGrid'
import MultiStrandPicker from './MultiStrandPicker'
import { InlineEditableText } from './InlineEditableText'
import { ConfirmableAction } from './ConfirmableAction'
import { formatInterval } from '@/lib/fsrs'
import { useMindmapGeneration } from '@/hooks/useMindmapGeneration'
import { MindmapControls } from './MindmapControls'
import MindmapDisplay from './MindmapDisplay'
import {
  generateHierarchyData,
  generateGraphData,
  type StrandContent
} from '@/lib/mindmap/contentAggregator'
import { extractConcepts, mergeConceptData } from '@/lib/mindmap/conceptExtractor'
import { exportSVG, exportPNG, exportJSON } from '@/lib/mindmap/exportUtils'
import TeachMode from './TeachMode'

/* ═══════════════════════════════════════════════════════════════════════════
   SVG DECORATIONS
═══════════════════════════════════════════════════════════════════════════ */

/** Decorative corner frame SVG */
function CornerFrame({ className = '', position = 'top-left' }: { className?: string; position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' }) {
  const transforms: Record<string, string> = {
    'top-left': '',
    'top-right': 'scale(-1, 1)',
    'bottom-left': 'scale(1, -1)',
    'bottom-right': 'scale(-1, -1)',
  }
  
  return (
    <svg 
      className={className} 
      width="48" 
      height="48" 
      viewBox="0 0 48 48" 
      fill="none"
      style={{ transform: transforms[position] }}
    >
      <path 
        d="M2 46V12C2 6.477 6.477 2 12 2H46" 
        stroke="currentColor" 
        strokeWidth="3" 
        strokeLinecap="round"
        className="opacity-30"
      />
      <path 
        d="M6 46V16C6 10.477 10.477 6 16 6H46" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        strokeLinecap="round"
        className="opacity-50"
      />
      <circle cx="2" cy="46" r="3" fill="currentColor" className="opacity-60" />
    </svg>
  )
}

/** Decorative divider */
function Divider({ isDark, className = '' }: { isDark: boolean; className?: string }) {
  return (
    <svg className={`w-full h-3 ${className}`} viewBox="0 0 200 12" fill="none" preserveAspectRatio="none">
      <path 
        d="M0 6H70L80 2L90 10L100 2L110 10L120 6H200" 
        stroke={isDark ? '#3f3f46' : '#e4e4e7'} 
        strokeWidth="1"
        className="opacity-50"
      />
      <circle cx="100" cy="6" r="3" fill={isDark ? '#10b981' : '#059669'} className="opacity-60" />
    </svg>
  )
}

/** Brain icon with pulse animation */
function AnimatedBrain({ className = '' }: { className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <Brain className="w-full h-full relative z-10" />
      <motion.div
        className="absolute inset-0 rounded-full bg-current opacity-20"
        animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0, 0.2] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  )
}

/** Tab indicator with gradient and glow */
function TabIndicator({ isDark }: { isDark: boolean }) {
  return (
    <motion.div
      layoutId="tab-indicator"
      className={`absolute inset-0 rounded-xl ${
        isDark 
          ? 'bg-gradient-to-r from-emerald-900/60 to-cyan-900/40 border border-emerald-700/50 shadow-lg shadow-emerald-500/10' 
          : 'bg-gradient-to-r from-emerald-100 to-cyan-100 border border-emerald-300/50 shadow-lg shadow-emerald-500/20'
      }`}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    />
  )
}

/** View Mode Toggle - Single Strand vs Multi-Strand */
function ViewModeToggle({
  mode,
  onChange,
  isDark,
  disabled = false
}: {
  mode: ViewMode
  onChange: (mode: ViewMode) => void
  isDark: boolean
  disabled?: boolean
}) {
  return (
    <div className={`
      flex rounded-lg p-0.5 gap-0.5
      ${isDark ? 'bg-zinc-800/80' : 'bg-zinc-100'}
      ${disabled ? 'opacity-50 pointer-events-none' : ''}
    `}>
      <button
        onClick={() => onChange('single')}
        className={`
          flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all
          ${mode === 'single'
            ? isDark ? 'bg-zinc-700 text-emerald-400' : 'bg-white text-emerald-600 shadow-sm'
            : isDark ? 'text-zinc-400 hover:text-zinc-300' : 'text-zinc-500 hover:text-zinc-700'
          }
        `}
        title="Single Strand Mode"
      >
        <FileText className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Single</span>
      </button>
      <button
        onClick={() => onChange('multi')}
        className={`
          flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all
          ${mode === 'multi'
            ? isDark ? 'bg-zinc-700 text-purple-400' : 'bg-white text-purple-600 shadow-sm'
            : isDark ? 'text-zinc-400 hover:text-zinc-300' : 'text-zinc-500 hover:text-zinc-700'
          }
        `}
        title="Multi-Strand Mode"
      >
        <Library className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Multi</span>
      </button>
    </div>
  )
}

/** Selection Badge - Shows count of selected strands */
function SelectionBadge({
  count,
  isDark,
  onClick
}: {
  count: number
  isDark: boolean
  onClick: () => void
}) {
  if (count === 0) return null

  return (
    <motion.button
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      onClick={onClick}
      className={`
        flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
        transition-colors
        ${isDark 
          ? 'bg-purple-900/50 text-purple-300 hover:bg-purple-800/60 border border-purple-700/50' 
          : 'bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-200'
        }
      `}
    >
      <Library className="w-3 h-3" />
      {count} strand{count !== 1 ? 's' : ''}
    </motion.button>
  )
}

/** Global Glossary Filter Bar */
function GlossaryFilterBar({
  filters,
  onFiltersChange,
  categories,
  isDark
}: {
  filters: GlobalGlossaryFilters
  onFiltersChange: (filters: GlobalGlossaryFilters) => void
  categories: string[]
  isDark: boolean
}) {
  const [searchQuery, setSearchQuery] = useState(filters.search || '')

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value)
    // Debounce search
    const timer = setTimeout(() => {
      onFiltersChange({ ...filters, search: value || undefined })
    }, 300)
    return () => clearTimeout(timer)
  }, [filters, onFiltersChange])

  return (
    <div className={`
      flex flex-wrap items-center gap-2 p-3 rounded-xl mb-4
      ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'}
    `}>
      {/* Search */}
      <div className={`
        flex items-center gap-2 flex-1 min-w-[200px] px-3 py-1.5 rounded-lg
        ${isDark ? 'bg-zinc-700/50' : 'bg-white border border-zinc-200'}
      `}>
        <Search className={`w-4 h-4 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search terms..."
          className={`
            flex-1 text-sm bg-transparent outline-none
            ${isDark ? 'text-zinc-200 placeholder-zinc-500' : 'text-zinc-800 placeholder-zinc-400'}
          `}
        />
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-1">
        {categories.slice(0, 5).map(category => (
          <button
            key={category}
            onClick={() => {
              const current = filters.categories || []
              const updated = current.includes(category)
                ? current.filter(c => c !== category)
                : [...current, category]
              onFiltersChange({ ...filters, categories: updated.length ? updated : undefined })
            }}
            className={`
              px-2 py-1 rounded text-xs font-medium transition-colors
              ${(filters.categories || []).includes(category)
                ? isDark ? 'bg-emerald-900/50 text-emerald-300' : 'bg-emerald-100 text-emerald-700'
                : isDark ? 'bg-zinc-700 text-zinc-400 hover:text-zinc-300' : 'bg-white text-zinc-500 hover:text-zinc-700 border border-zinc-200'
              }
            `}
          >
            {category}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Global Glossary View - displays all terms with filtering */
function GlobalGlossaryView({
  globalGlossary,
  isDark,
  filterOptions,
  onTermClick
}: {
  globalGlossary: ReturnType<typeof useGlobalGlossary>
  isDark: boolean
  filterOptions: LearningStudioProps['filterOptions']
  onTermClick?: (term: any) => void
}) {
  const [filters, setFilters] = useState<GlobalGlossaryFilters>({})
  const [expandedTerms, setExpandedTerms] = useState<Set<string>>(new Set())
  
  // Filtered terms
  const filteredTerms = useMemo(() => {
    let terms = globalGlossary.terms
    
    if (filters.search) {
      const query = filters.search.toLowerCase()
      terms = terms.filter(t => 
        t.term.toLowerCase().includes(query) || 
        t.definition.toLowerCase().includes(query)
      )
    }
    
    if (filters.categories?.length) {
      terms = terms.filter(t => filters.categories!.includes(t.category))
    }
    
    if (filters.sourceStrandIds?.length) {
      terms = terms.filter(t => t.sourceStrandId && filters.sourceStrandIds!.includes(t.sourceStrandId))
    }
    
    return terms
  }, [globalGlossary.terms, filters])
  
  const toggleTerm = (id: string) => {
    setExpandedTerms(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-4">
      {/* Header with stats */}
      <div className={`
        flex items-center justify-between p-4 rounded-xl
        ${isDark ? 'bg-emerald-900/20 border border-emerald-800/50' : 'bg-emerald-50 border border-emerald-200'}
      `}>
        <div className="flex items-center gap-3">
          <Globe className={`w-5 h-5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
          <div>
            <p className={`text-sm font-semibold ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
              Global Glossary
            </p>
            <p className={`text-xs ${isDark ? 'text-emerald-400/70' : 'text-emerald-600/70'}`}>
              {globalGlossary.stats?.totalTerms ?? 0} terms from {Object.keys(globalGlossary.stats?.bySource ?? {}).length} strands
            </p>
          </div>
        </div>
        
        <button
          onClick={() => globalGlossary.loadTerms()}
          className={`
            p-2 rounded-lg transition-colors
            ${isDark ? 'hover:bg-emerald-800/30 text-emerald-400' : 'hover:bg-emerald-100 text-emerald-600'}
          `}
        >
          <RefreshCw className={`w-4 h-4 ${globalGlossary.loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      
      {/* Filters */}
      <GlossaryFilterBar
        filters={filters}
        onFiltersChange={setFilters}
        categories={Object.keys(globalGlossary.stats?.byCategory ?? {})}
        isDark={isDark}
      />
      
      {/* Loading state */}
      {globalGlossary.loading && (
        <div className={`text-center py-8 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
          <RefreshCw className="w-6 h-6 mx-auto animate-spin mb-2" />
          <p className="text-sm">Loading glossary...</p>
        </div>
      )}
      
      {/* Empty state */}
      {!globalGlossary.loading && filteredTerms.length === 0 && (
        <div className={`text-center py-12 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
          <Book className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm font-medium">No terms found</p>
          <p className="text-xs mt-1">
            {globalGlossary.terms.length === 0 
              ? 'Generate glossaries from strands to populate the global glossary'
              : 'Try adjusting your filters'
            }
          </p>
        </div>
      )}
      
      {/* Terms list */}
      {filteredTerms.length > 0 && (
        <div className="space-y-2">
          {filteredTerms.map(term => (
            <motion.div
              key={term.id}
              layout
              whileHover={{ scale: 1.01 }}
              className={`
                rounded-xl border overflow-hidden shadow-sm transition-shadow hover:shadow-md
                ${isDark ? 'bg-zinc-800/50 border-zinc-700 shadow-zinc-900/30 hover:shadow-zinc-900/50' : 'bg-white border-zinc-200 shadow-zinc-100 hover:shadow-zinc-200'}
              `}
            >
              <button
                onClick={() => toggleTerm(term.id)}
                className={`
                  w-full flex items-center justify-between p-3 text-left
                  ${isDark ? 'hover:bg-zinc-700/50' : 'hover:bg-zinc-50'}
                `}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className={`text-sm font-semibold truncate ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                    {term.term}
                  </span>
                  <span className={`
                    px-2 py-0.5 rounded text-xs
                    ${isDark ? 'bg-zinc-700 text-zinc-400' : 'bg-zinc-100 text-zinc-500'}
                  `}>
                    {term.category}
                  </span>
                </div>
                <ChevronDown className={`
                  w-4 h-4 transition-transform flex-shrink-0
                  ${expandedTerms.has(term.id) ? 'rotate-180' : ''}
                  ${isDark ? 'text-zinc-500' : 'text-zinc-400'}
                `} />
              </button>
              
              <AnimatePresence>
                {expandedTerms.has(term.id) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className={`
                      p-3 pt-0 space-y-2
                      ${isDark ? 'text-zinc-300' : 'text-zinc-600'}
                    `}>
                      <p className="text-sm">{term.definition}</p>
                      
                      {/* Source */}
                      {term.sourceStrandPath && (
                        <button
                          onClick={() => onTermClick?.(term)}
                          className={`
                            flex items-center gap-1.5 text-xs
                            ${isDark ? 'text-zinc-500 hover:text-emerald-400' : 'text-zinc-400 hover:text-emerald-600'}
                          `}
                        >
                          <FileText className="w-3 h-3" />
                          {term.sourceStrandPath.split('/').pop()?.replace('.md', '')}
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

type TabType = 'flashcards' | 'quiz' | 'teach' | 'glossary' | 'mindmaps' | 'questions'
type GenerationMode = 'offline' | 'llm'
type ViewMode = 'single' | 'multi' // Single strand vs multi-strand mode

// QuizQuestion is imported from useQuizGeneration hook

/** Tooltip component for explaining features */
function Tooltip({
  children,
  content,
  isDark
}: {
  children: React.ReactNode
  content: string
  isDark: boolean
}) {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
      >
        {children}
      </div>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className={`
              absolute z-50 px-3 py-2 text-xs rounded-lg shadow-lg
              bottom-full left-1/2 -translate-x-1/2 mb-2
              min-w-[200px] max-w-[280px] text-center
              ${isDark
                ? 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                : 'bg-white text-zinc-700 border border-zinc-200'
              }
            `}
          >
            {content}
            <div
              className={`
                absolute left-1/2 -translate-x-1/2 top-full
                border-4 border-transparent
                ${isDark ? 'border-t-zinc-800' : 'border-t-white'}
              `}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Generation mode toggle component */
function GenerationModeToggle({
  mode,
  onModeChange,
  isDark,
  disabled = false,
  compact = false,
  hasLLMApiKey = false,
}: {
  mode: GenerationMode
  onModeChange: (mode: GenerationMode) => void
  isDark: boolean
  disabled?: boolean
  compact?: boolean
  hasLLMApiKey?: boolean
}) {
  const llmDisabled = disabled || !hasLLMApiKey
  const llmTooltip = !hasLLMApiKey
    ? "Requires an API key. Go to Settings → API Keys to add your OpenAI, Anthropic, or other LLM provider key."
    : "Smarter, more varied results using AI. Uses your configured LLM provider for high-quality content generation."

  return (
    <div className={`flex items-center gap-2 ${compact ? '' : 'p-1 rounded-lg bg-black/5 dark:bg-white/5'}`}>
      <Tooltip
        content="Fast, private, works offline. Uses pattern matching and NLP keyword extraction. Best for quick generation."
        isDark={isDark}
      >
        <button
          onClick={() => onModeChange('offline')}
          disabled={disabled}
          className={`
            flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all
            ${mode === 'offline'
              ? isDark
                ? 'bg-emerald-900/60 text-emerald-300 shadow-sm'
                : 'bg-emerald-100 text-emerald-700 shadow-sm'
              : isDark
                ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <Cpu className="w-3.5 h-3.5" />
          {!compact && <span>Offline NLP</span>}
        </button>
      </Tooltip>

      <Tooltip
        content={llmTooltip}
        isDark={isDark}
      >
        <button
          onClick={() => onModeChange('llm')}
          disabled={llmDisabled}
          className={`
            flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all relative
            ${mode === 'llm'
              ? isDark
                ? 'bg-purple-900/60 text-purple-300 shadow-sm'
                : 'bg-purple-100 text-purple-700 shadow-sm'
              : llmDisabled
                ? isDark
                  ? 'text-zinc-600'
                  : 'text-zinc-400'
                : isDark
                  ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                  : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100'
            }
            ${llmDisabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <Cloud className="w-3.5 h-3.5" />
          {!compact && <span>LLM (AI)</span>}
          {!hasLLMApiKey && (
            <span className={`
              absolute -top-1.5 -right-1.5 px-1 py-0.5 text-[8px] font-bold rounded
              ${isDark ? 'bg-amber-900/80 text-amber-300' : 'bg-amber-100 text-amber-700'}
            `}>
              KEY
            </span>
          )}
        </button>
      </Tooltip>
    </div>
  )
}

/** Badge showing generation method used */
function GenerationMethodBadge({
  method,
  isDark,
  fromCache = false,
}: {
  method: 'offline' | 'llm' | 'cached'
  isDark: boolean
  fromCache?: boolean
}) {
  const config = {
    offline: {
      icon: Cpu,
      label: 'Offline NLP',
      color: isDark ? 'bg-emerald-900/40 text-emerald-400 border-emerald-800' : 'bg-emerald-50 text-emerald-600 border-emerald-200',
    },
    llm: {
      icon: Cloud,
      label: 'AI Generated',
      color: isDark ? 'bg-purple-900/40 text-purple-400 border-purple-800' : 'bg-purple-50 text-purple-600 border-purple-200',
    },
    cached: {
      icon: Cpu,
      label: 'From Cache',
      color: isDark ? 'bg-zinc-800 text-zinc-400 border-zinc-700' : 'bg-zinc-100 text-zinc-500 border-zinc-200',
    },
  }

  const { icon: Icon, label, color } = fromCache ? config.cached : config[method]

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded border ${color}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  )
}

/** Regenerate button component */
function RegenerateButton({
  onClick,
  isDark,
  loading = false,
  disabled = false,
  label = 'Regenerate',
  compact = false,
}: {
  onClick: () => void
  isDark: boolean
  loading?: boolean
  disabled?: boolean
  label?: string
  compact?: boolean
}) {
  return (
    <Tooltip
      content="Generate new content, replacing the current set. Previous content will be lost."
      isDark={isDark}
    >
      <motion.button
        whileHover={!disabled && !loading ? { scale: 1.02 } : {}}
        whileTap={!disabled && !loading ? { scale: 0.98 } : {}}
        onClick={onClick}
        disabled={disabled || loading}
        className={`
          flex items-center gap-1.5 rounded-lg font-medium transition-all
          ${compact ? 'px-2 py-1 text-[10px]' : 'px-3 py-1.5 text-xs'}
          ${isDark
            ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
            : 'bg-white hover:bg-zinc-50 text-zinc-600 border border-zinc-200'
          }
          ${(disabled || loading) ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <RotateCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
        {!compact && <span>{loading ? 'Generating...' : label}</span>}
      </motion.button>
    </Tooltip>
  )
}

interface LearningStudioProps {
  /** Open state */
  isOpen: boolean
  /** Close callback */
  onClose: () => void
  /** Display mode */
  mode?: 'popover' | 'page'
  /** Current strand */
  strandSlug?: string
  /** Strand content */
  content?: string
  /** Theme */
  theme?: string
  /** Sidebar visible callback (page mode) */
  onToggleSidebar?: () => void
  /** Is sidebar visible (page mode) */
  sidebarVisible?: boolean
  /** Available strands for multi-strand mode */
  availableStrands?: StrandSummary[]
  /** Callback to fetch strand content */
  onFetchStrandContent?: (strandId: string) => Promise<string | null>
  /** Initial view mode */
  initialViewMode?: ViewMode
  /** Filter options for strand picker */
  filterOptions?: {
    tags: string[]
    subjects: string[]
    topics: string[]
    skills: string[]
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
═══════════════════════════════════════════════════════════════════════════ */

/** Rating button for flashcards */
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
      ? 'from-red-900/50 to-red-950/50 border-red-700/50 hover:border-red-500 text-red-400 active:border-red-400 shadow-md shadow-red-900/20 hover:shadow-red-800/30'
      : 'from-red-50 to-red-100 border-red-200 hover:border-red-400 text-red-600 active:border-red-500 shadow-md shadow-red-200/50 hover:shadow-red-300/60',
    orange: isDark
      ? 'from-orange-900/50 to-orange-950/50 border-orange-700/50 hover:border-orange-500 text-orange-400 active:border-orange-400 shadow-md shadow-orange-900/20 hover:shadow-orange-800/30'
      : 'from-orange-50 to-orange-100 border-orange-200 hover:border-orange-400 text-orange-600 active:border-orange-500 shadow-md shadow-orange-200/50 hover:shadow-orange-300/60',
    emerald: isDark
      ? 'from-emerald-900/50 to-emerald-950/50 border-emerald-700/50 hover:border-emerald-500 text-emerald-400 active:border-emerald-400 shadow-md shadow-emerald-900/20 hover:shadow-emerald-800/30'
      : 'from-emerald-50 to-emerald-100 border-emerald-200 hover:border-emerald-400 text-emerald-600 active:border-emerald-500 shadow-md shadow-emerald-200/50 hover:shadow-emerald-300/60',
    cyan: isDark
      ? 'from-cyan-900/50 to-cyan-950/50 border-cyan-700/50 hover:border-cyan-500 text-cyan-400 active:border-cyan-400 shadow-md shadow-cyan-900/20 hover:shadow-cyan-800/30'
      : 'from-cyan-50 to-cyan-100 border-cyan-200 hover:border-cyan-400 text-cyan-600 active:border-cyan-500 shadow-md shadow-cyan-200/50 hover:shadow-cyan-300/60',
  }

  return (
    <motion.button
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`
        flex-1 flex flex-col items-center justify-center gap-0.5
        ${isTouch ? 'p-3 min-h-[56px]' : 'p-2 sm:p-3 min-h-[48px]'}
        rounded-xl
        bg-gradient-to-b ${colorClasses[color]}
        border-2 transition-all
        touch-manipulation
      `}
    >
      <span className={`${isTouch ? 'text-sm' : 'text-xs sm:text-sm'} font-bold`}>{label}</span>
      <span className={`${isTouch ? 'text-[10px]' : 'text-[9px] sm:text-[10px]'} ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
        {interval}
      </span>
    </motion.button>
  )
}

/** Flashcard with flip animation */
function FlashcardDisplay({
  card,
  isFlipped,
  onFlip,
  isDark,
  isTouch = false,
}: {
  card: Flashcard
  isFlipped: boolean
  onFlip: () => void
  isDark: boolean
  isTouch?: boolean
}) {
  return (
    <div
      className={`
        relative w-full perspective-1000 cursor-pointer touch-manipulation
        ${isTouch ? 'h-[220px] sm:h-[260px]' : 'h-[200px] sm:h-[240px]'}
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
        {/* Front */}
        <div 
          className={`
            absolute inset-0 rounded-2xl p-4 sm:p-6 backface-hidden
            flex flex-col items-center justify-center text-center
            border-2 relative overflow-hidden
            shadow-lg
            ${isDark 
              ? 'bg-gradient-to-br from-zinc-800 to-zinc-900 border-zinc-700 shadow-zinc-900/50' 
              : 'bg-gradient-to-br from-white to-zinc-50 border-zinc-200 shadow-zinc-200/80'
            }
          `}
          style={{ backfaceVisibility: 'hidden' }}
        >
          {/* Corner decorations */}
          <CornerFrame position="top-left" className={`absolute top-2 left-2 ${isDark ? 'text-emerald-500' : 'text-emerald-600'}`} />
          <CornerFrame position="top-right" className={`absolute top-2 right-2 ${isDark ? 'text-cyan-500' : 'text-cyan-600'}`} />
          
          <div className={`absolute top-3 left-14 px-2 py-1 rounded-full text-[10px] font-semibold uppercase ${
            card.type === 'cloze' 
              ? isDark ? 'bg-cyan-900/50 text-cyan-400' : 'bg-cyan-100 text-cyan-600'
              : isDark ? 'bg-violet-900/50 text-violet-400' : 'bg-violet-100 text-violet-600'
          }`}>
            {card.type}
          </div>
          
          <p className={`text-base sm:text-lg font-medium leading-relaxed px-4 ${isDark ? 'text-zinc-100' : 'text-zinc-800'}`}>
            {card.front}
          </p>
          
          <div className={`absolute bottom-3 flex items-center gap-1 text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            <RotateCcw className="w-3 h-3" />
            <span>Tap to reveal</span>
          </div>
        </div>
        
        {/* Back */}
        <div 
          className={`
            absolute inset-0 rounded-2xl p-4 sm:p-6 backface-hidden
            flex flex-col items-center justify-center text-center
            border-2 relative overflow-hidden
            shadow-lg
            ${isDark 
              ? 'bg-gradient-to-br from-emerald-950/50 to-zinc-900 border-emerald-800/50 shadow-emerald-900/30' 
              : 'bg-gradient-to-br from-emerald-50 to-white border-emerald-200 shadow-emerald-200/80'
            }
          `}
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <CornerFrame position="bottom-left" className={`absolute bottom-2 left-2 ${isDark ? 'text-emerald-500' : 'text-emerald-600'}`} />
          <CornerFrame position="bottom-right" className={`absolute bottom-2 right-2 ${isDark ? 'text-cyan-500' : 'text-cyan-600'}`} />
          
          <div className={`absolute top-3 left-3 flex items-center gap-1 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
            <Check className="w-4 h-4" />
            <span className="text-xs font-semibold">Answer</span>
          </div>
          
          <p className={`text-lg sm:text-xl font-bold ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
            {card.back}
          </p>
          
          {card.hints && card.hints.length > 0 && (
            <p className={`mt-3 text-xs sm:text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              💡 {card.hints[0]}
            </p>
          )}
        </div>
      </motion.div>
    </div>
  )
}

/** Quiz question display */
function QuizDisplay({
  question,
  selectedAnswer,
  onSelectAnswer,
  showResult,
  isDark,
  onJumpToSource,
}: {
  question: QuizQuestion
  selectedAnswer: string | null
  onSelectAnswer: (answer: string) => void
  showResult: boolean
  isDark: boolean
  onJumpToSource?: (text: string) => void
}) {
  const isCorrect = selectedAnswer === question.answer

  return (
    <div className="space-y-4">
      {/* Question */}
      <div className={`p-4 sm:p-6 rounded-2xl relative overflow-hidden shadow-lg ${
        isDark ? 'bg-zinc-800/50 shadow-zinc-950/50' : 'bg-zinc-50 shadow-zinc-200/50'
      }`}>
        <CornerFrame position="top-left" className={`absolute top-1 left-1 ${isDark ? 'text-purple-500' : 'text-purple-600'} w-8 h-8`} />
        
        <div className={`absolute top-3 right-3 px-2 py-1 rounded-full text-[10px] font-semibold uppercase ${
          question.difficulty === 'easy' 
            ? isDark ? 'bg-emerald-900/50 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
            : question.difficulty === 'medium'
            ? isDark ? 'bg-amber-900/50 text-amber-400' : 'bg-amber-100 text-amber-600'
            : isDark ? 'bg-red-900/50 text-red-400' : 'bg-red-100 text-red-600'
        }`}>
          {question.difficulty}
        </div>
        
        <p className={`text-base sm:text-lg font-medium pt-6 ${isDark ? 'text-zinc-100' : 'text-zinc-800'}`}>
          {question.question}
        </p>
      </div>
      
      {/* Options */}
      <div className="space-y-2">
        {question.type === 'multiple_choice' && question.options?.map((option, idx) => {
          const isSelected = selectedAnswer === option
          const isAnswer = question.answer === option
          
          let optionClass = isDark 
            ? 'bg-zinc-800/30 border-zinc-700 hover:border-zinc-500' 
            : 'bg-white border-zinc-200 hover:border-zinc-400'
          
          if (showResult) {
            if (isAnswer) {
              optionClass = isDark 
                ? 'bg-emerald-900/30 border-emerald-500' 
                : 'bg-emerald-50 border-emerald-400'
            } else if (isSelected && !isCorrect) {
              optionClass = isDark 
                ? 'bg-red-900/30 border-red-500' 
                : 'bg-red-50 border-red-400'
            }
          } else if (isSelected) {
            optionClass = isDark 
              ? 'bg-purple-900/30 border-purple-500' 
              : 'bg-purple-50 border-purple-400'
          }
          
          return (
            <motion.button
              key={option}
              whileHover={!showResult ? { scale: 1.01 } : {}}
              whileTap={!showResult ? { scale: 0.99 } : {}}
              onClick={() => !showResult && onSelectAnswer(option)}
              disabled={showResult}
              className={`
                w-full p-3 sm:p-4 rounded-xl border-2 text-left transition-all
                flex items-center gap-3
                ${optionClass}
              `}
            >
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                isDark ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-100 text-zinc-600'
              }`}>
                {String.fromCharCode(65 + idx)}
              </span>
              <span className={isDark ? 'text-zinc-200' : 'text-zinc-700'}>{option}</span>
              {showResult && isAnswer && <Check className="w-5 h-5 ml-auto text-emerald-500" />}
            </motion.button>
          )
        })}
        
        {question.type === 'true_false' && ['True', 'False'].map((option) => {
          const isSelected = selectedAnswer === option
          const isAnswer = question.answer === option
          
          let optionClass = isDark 
            ? 'bg-zinc-800/30 border-zinc-700 hover:border-zinc-500' 
            : 'bg-white border-zinc-200 hover:border-zinc-400'
          
          if (showResult) {
            if (isAnswer) {
              optionClass = isDark 
                ? 'bg-emerald-900/30 border-emerald-500' 
                : 'bg-emerald-50 border-emerald-400'
            } else if (isSelected && !isCorrect) {
              optionClass = isDark 
                ? 'bg-red-900/30 border-red-500' 
                : 'bg-red-50 border-red-400'
            }
          } else if (isSelected) {
            optionClass = isDark 
              ? 'bg-purple-900/30 border-purple-500' 
              : 'bg-purple-50 border-purple-400'
          }
          
          return (
            <motion.button
              key={option}
              whileHover={!showResult ? { scale: 1.01 } : {}}
              onClick={() => !showResult && onSelectAnswer(option)}
              disabled={showResult}
              className={`
                flex-1 p-4 rounded-xl border-2 transition-all font-medium
                ${optionClass}
              `}
            >
              {option}
            </motion.button>
          )
        })}
      </div>
      
      {/* Explanation */}
      <AnimatePresence>
        {showResult && question.explanation && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`p-4 rounded-xl ${
              isCorrect
                ? isDark ? 'bg-emerald-900/20 border border-emerald-800/50' : 'bg-emerald-50 border border-emerald-200'
                : isDark ? 'bg-amber-900/20 border border-amber-800/50' : 'bg-amber-50 border border-amber-200'
            }`}
          >
            <p className="flex items-start gap-2 text-sm">
              <Lightbulb className={`w-4 h-4 shrink-0 mt-0.5 ${isCorrect ? 'text-emerald-500' : 'text-amber-500'}`} />
              <span className={isDark ? 'text-zinc-300' : 'text-zinc-600'}>{question.explanation}</span>
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Citation - show source text */}
      <AnimatePresence>
        {showResult && question.sourceText && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ delay: 0.2 }}
          >
            <CitationDisplay
              sourceText={question.sourceText}
              confidence={question.confidence}
              isDark={isDark}
              onJumpToSource={onJumpToSource}
              compact
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Editable quiz question card */
function QuizQuestionCard({
  question,
  isDark,
  onUpdateQuestion,
  onUpdateAnswer,
  onUpdateOptions,
  onUpdateExplanation,
  onDelete,
  onRestore,
  isEdited,
  isDeleted,
}: {
  question: QuizQuestion
  isDark: boolean
  onUpdateQuestion?: (text: string) => Promise<void>
  onUpdateAnswer?: (text: string) => Promise<void>
  onUpdateOptions?: (options: string[]) => Promise<void>
  onUpdateExplanation?: (text: string) => Promise<void>
  onDelete?: () => Promise<void>
  onRestore?: () => Promise<void>
  isEdited?: boolean
  isDeleted?: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const [editingOption, setEditingOption] = useState<number | null>(null)

  // Deleted state
  if (isDeleted && onRestore) {
    return (
      <div className={`p-3 rounded-xl border transition-all opacity-50 ${isDark ? 'bg-zinc-800/30 border-zinc-700/50' : 'bg-zinc-50 border-zinc-200/50'}`}>
        <div className="flex items-center justify-between">
          <span className={`text-sm line-through ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            {question.question.slice(0, 50)}...
          </span>
          <button
            onClick={onRestore}
            className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
              isDark ? 'hover:bg-zinc-700 text-cyan-400' : 'hover:bg-zinc-100 text-cyan-600'
            }`}
          >
            <RotateCcw className="w-3 h-3" />
            Restore
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`
        rounded-xl border overflow-hidden transition-all cursor-pointer
        ${isDark ? 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600' : 'bg-white border-zinc-200 hover:border-zinc-300'}
        ${isEdited ? (isDark ? 'ring-1 ring-purple-500/30' : 'ring-1 ring-purple-500/20') : ''}
      `}
      onClick={() => !expanded && setExpanded(true)}
    >
      {/* Header */}
      <div className="p-3 flex items-center gap-3">
        <div className={`
          p-1.5 rounded-lg border
          ${question.difficulty === 'easy'
            ? isDark ? 'bg-emerald-900/40 border-emerald-800 text-emerald-400' : 'bg-emerald-100 border-emerald-200 text-emerald-600'
            : question.difficulty === 'medium'
            ? isDark ? 'bg-amber-900/40 border-amber-800 text-amber-400' : 'bg-amber-100 border-amber-200 text-amber-600'
            : isDark ? 'bg-red-900/40 border-red-800 text-red-400' : 'bg-red-100 border-red-200 text-red-600'
          }
        `}>
          <ListChecks className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`font-medium truncate ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
              {question.question.slice(0, 60)}{question.question.length > 60 ? '...' : ''}
            </span>
            {isEdited && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'bg-purple-900/50 text-purple-400' : 'bg-purple-50 text-purple-600'}`}>
                Edited
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'bg-zinc-700 text-zinc-400' : 'bg-zinc-100 text-zinc-500'}`}>
              {question.type.replace('_', ' ')}
            </span>
            <span className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              Answer: {question.answer}
            </span>
          </div>
        </div>

        <ChevronRight
          className={`w-4 h-4 transition-transform duration-200 ${isDark ? 'text-zinc-500' : 'text-zinc-400'} ${expanded ? 'rotate-90' : ''}`}
        />
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className={`border-t p-3 space-y-3 ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`} onClick={(e) => e.stopPropagation()}>
          {/* Editable Question */}
          {onUpdateQuestion && (
            <div className="space-y-1">
              <label className={`text-[10px] uppercase tracking-wide ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                Question
              </label>
              <InlineEditableText
                value={question.question}
                onSave={onUpdateQuestion}
                isDark={isDark}
                multiline
                placeholder="Enter question..."
                displayClassName={`text-sm ${isDark ? 'text-zinc-200' : 'text-zinc-700'}`}
              />
            </div>
          )}

          {/* Options (for multiple choice) */}
          {question.type === 'multiple_choice' && question.options && onUpdateOptions && (
            <div className="space-y-1">
              <label className={`text-[10px] uppercase tracking-wide ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                Options
              </label>
              <div className="space-y-1.5">
                {question.options.map((option, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      option === question.answer
                        ? 'bg-emerald-500 text-white'
                        : isDark ? 'bg-zinc-700 text-zinc-400' : 'bg-zinc-200 text-zinc-500'
                    }`}>
                      {String.fromCharCode(65 + idx)}
                    </span>
                    {editingOption === idx ? (
                      <input
                        autoFocus
                        defaultValue={option}
                        className={`flex-1 text-sm px-2 py-1 rounded border ${
                          isDark
                            ? 'bg-zinc-800 border-zinc-600 text-zinc-100'
                            : 'bg-white border-zinc-300 text-zinc-900'
                        }`}
                        onBlur={async (e) => {
                          const newOptions = [...question.options!]
                          newOptions[idx] = e.target.value
                          await onUpdateOptions(newOptions)
                          setEditingOption(null)
                        }}
                        onKeyDown={async (e) => {
                          if (e.key === 'Enter') {
                            const newOptions = [...question.options!]
                            newOptions[idx] = (e.target as HTMLInputElement).value
                            await onUpdateOptions(newOptions)
                            setEditingOption(null)
                          }
                          if (e.key === 'Escape') {
                            setEditingOption(null)
                          }
                        }}
                      />
                    ) : (
                      <button
                        onClick={() => setEditingOption(idx)}
                        className={`flex-1 text-left text-sm px-2 py-1 rounded transition-colors ${
                          isDark ? 'hover:bg-zinc-700 text-zinc-200' : 'hover:bg-zinc-100 text-zinc-700'
                        }`}
                      >
                        {option}
                      </button>
                    )}
                    {option === question.answer && (
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Editable Answer */}
          {onUpdateAnswer && (
            <div className="space-y-1">
              <label className={`text-[10px] uppercase tracking-wide ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                Correct Answer
              </label>
              {question.type === 'true_false' ? (
                <div className="flex gap-2">
                  {['True', 'False'].map((opt) => (
                    <button
                      key={opt}
                      onClick={async () => await onUpdateAnswer(opt)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                        question.answer === opt
                          ? 'bg-emerald-500 text-white'
                          : isDark ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              ) : question.type === 'multiple_choice' && question.options ? (
                <select
                  value={question.answer}
                  onChange={async (e) => await onUpdateAnswer(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${
                    isDark
                      ? 'bg-zinc-800 border-zinc-600 text-zinc-100'
                      : 'bg-white border-zinc-300 text-zinc-900'
                  }`}
                >
                  {question.options.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : (
                <InlineEditableText
                  value={question.answer}
                  onSave={onUpdateAnswer}
                  isDark={isDark}
                  placeholder="Enter answer..."
                  displayClassName={`text-sm font-medium ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}
                />
              )}
            </div>
          )}

          {/* Editable Explanation */}
          {onUpdateExplanation && (
            <div className="space-y-1">
              <label className={`text-[10px] uppercase tracking-wide ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                Explanation
              </label>
              <InlineEditableText
                value={question.explanation || ''}
                onSave={onUpdateExplanation}
                isDark={isDark}
                multiline
                placeholder="Add explanation..."
                displayClassName={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-dashed ${isDark ? 'border-zinc-700' : 'border-zinc-200'}">
            <button
              onClick={() => setExpanded(false)}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
              }`}
            >
              Collapse
            </button>

            {onDelete && (
              <ConfirmableAction
                onConfirm={onDelete}
                icon={Trash2}
                variant="danger"
                isDark={isDark}
                size="sm"
                iconOnly
                title="Delete question"
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/** Floating sidebar toggle button */
function SidebarToggle({ 
  isVisible, 
  onClick, 
  isDark 
}: { 
  isVisible: boolean
  onClick: () => void 
  isDark: boolean 
}) {
  return (
    <motion.button
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className={`
        fixed left-4 top-1/2 -translate-y-1/2 z-50
        w-10 h-20 rounded-r-2xl
        flex flex-col items-center justify-center gap-1
        shadow-lg transition-colors
        ${isDark 
          ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border-r border-y border-zinc-700' 
          : 'bg-white hover:bg-zinc-50 text-zinc-500 hover:text-zinc-700 border-r border-y border-zinc-200'
        }
      `}
      title={isVisible ? 'Hide sidebar' : 'Show sidebar'}
    >
      {/* Decorative dots */}
      <span className={`w-1 h-1 rounded-full ${isDark ? 'bg-emerald-500' : 'bg-emerald-600'}`} />
      <motion.div
        animate={{ rotate: isVisible ? 0 : 180 }}
        transition={{ duration: 0.3 }}
      >
        {isVisible ? (
          <PanelLeftClose className="w-5 h-5" />
        ) : (
          <PanelLeftOpen className="w-5 h-5" />
        )}
      </motion.div>
      <span className={`w-1 h-1 rounded-full ${isDark ? 'bg-cyan-500' : 'bg-cyan-600'}`} />
    </motion.button>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function LearningStudio({
  isOpen,
  onClose,
  mode = 'popover',
  strandSlug,
  content,
  theme = 'light',
  onToggleSidebar,
  sidebarVisible = true,
  availableStrands = [],
  onFetchStrandContent,
  initialViewMode = 'single',
  filterOptions = { tags: [], subjects: [], topics: [], skills: [] },
}: LearningStudioProps) {
  const isDark = theme.includes('dark')
  const { isMobile, isTablet } = useBreakpoint()
  const isTouch = useIsTouchDevice()
  const [isMounted, setIsMounted] = useState(false)
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<TabType>('flashcards')
  const [isFlipped, setIsFlipped] = useState(false)
  const [quizIndex, setQuizIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [showQuizResult, setShowQuizResult] = useState(false)
  const [stats, setStats] = useState<LearningStats | null>(null)
  const [generationMode, setGenerationMode] = useState<GenerationMode>('offline')
  const [hasLLMApiKey, setHasLLMApiKey] = useState(false)
  
  // ─── Multi-strand mode state ───
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode)
  const [showStrandPicker, setShowStrandPicker] = useState(false)
  const [multiStrandContent, setMultiStrandContent] = useState<StrandWithContent[]>([])
  const [multiStrandLoading, setMultiStrandLoading] = useState(false)
  
  // Multi-strand content hook - needs two args: strands array and fetch function
  const fetchStrandContent = useCallback(async (strandPath: string): Promise<{ content: string; metadata: StrandMetadata }> => {
    if (!onFetchStrandContent) {
      return { content: '', metadata: {} as StrandMetadata }
    }
    const content = await onFetchStrandContent(strandPath) || ''
    return { content, metadata: {} as StrandMetadata }
  }, [onFetchStrandContent])
  
  const multiStrand = useMultiStrandContent(availableStrands, fetchStrandContent)
  
  // Global glossary hook
  const globalGlossary = useGlobalGlossary({
    autoLoad: viewMode === 'multi' && activeTab === 'glossary',
  })

  // Mindmap hook
  const mindmap = useMindmapGeneration({
    initialMindmapType: 'hierarchy',
    initialViewMode: 'single',
    initialGenerationMode: 'content',
    cacheEnabled: true,
  })

  // Computed: combined content for multi-strand generation
  const combinedContent = useMemo(() => {
    if (viewMode === 'single') return content
    return multiStrandContent.map(s => s.content).join('\n\n---\n\n')
  }, [viewMode, content, multiStrandContent])
  
  // Check for LLM API key availability on mount
  useEffect(() => {
    const checkApiKey = async () => {
      const providers = await getConfiguredProviders()
      setHasLLMApiKey(providers.length > 0)
    }
    checkApiKey()
  }, [])

  // Handle URL query parameters for tab navigation
  useEffect(() => {
    if (!searchParams) return

    const tabParam = searchParams.get('tab')
    if (tabParam && ['flashcards', 'quiz', 'glossary', 'mindmaps', 'questions'].includes(tabParam)) {
      setActiveTab(tabParam as TabType)
    }
  }, [searchParams])

  // Load content for selected strands
  const loadSelectedStrandContent = useCallback(async () => {
    if (!onFetchStrandContent || multiStrand.selectedStrands.length === 0) return
    
    setMultiStrandLoading(true)
    try {
      const results: StrandWithContent[] = []
      for (const strand of multiStrand.selectedStrands) {
        const strandContent = await onFetchStrandContent(strand.id)
        if (strandContent) {
          results.push({
            ...strand,
            content: strandContent,
            metadata: {} as any, // Basic metadata
          })
        }
      }
      setMultiStrandContent(results)
    } finally {
      setMultiStrandLoading(false)
    }
  }, [onFetchStrandContent, multiStrand.selectedStrands])
  
  // Handle strand picker confirm
  const handleStrandPickerConfirm = useCallback(async () => {
    setShowStrandPicker(false)
    await loadSelectedStrandContent()
  }, [loadSelectedStrandContent])
  
  // Flashcard hooks
  const {
    cards,
    dueCards,
    stats: cardStats,
    loading,
    session,
    currentCard,
    intervalPreview,
    startSession,
    endSession,
    rateCard,
    skipCard,
    createCard,
    deleteCard,
  } = useFlashcards({ 
    strandSlug: viewMode === 'single' ? strandSlug : 'multi-strand', 
    autoLoad: true 
  })

  // Flashcard generation hook
  const {
    generating: flashcardGenerating,
    error: flashcardGenError,
    generateAll: generateFlashcards,
    generateMultiStrand: generateFlashcardsMulti,
  } = useFlashcardGeneration()

  // Dynamic quiz question generation
  const {
    questions: quizQuestions,
    generating: quizGenerating,
    progress: quizProgress,
    error: quizError,
    generate: generateQuizQuestions,
    generateMultiStrand: generateQuizMulti,
  } = useQuizGeneration({ maxQuestions: 10 })

  // Quiz edits for persistence
  const {
    edits: quizEdits,
    updateQuestion: updateQuizEdit,
    deleteQuestion: deleteQuizQuestion,
    restoreQuestion: restoreQuizQuestion,
    mergeWithGenerated: mergeQuizEdits,
    hasEdit: hasQuizEdit,
    isDeleted: isQuizDeleted,
  } = useQuizEdits({ 
    cacheKey: viewMode === 'single' ? strandSlug : 'multi-strand', 
    autoLoad: true 
  })

  // Quiz view mode: 'quiz' for normal quiz mode, 'edit' for editing all questions
  const [quizViewMode, setQuizViewMode] = useState<'quiz' | 'edit'>('quiz')

  // Merged quiz questions with edits applied
  const mergedQuizQuestions = useMemo(
    () => mergeQuizEdits(quizQuestions),
    [quizQuestions, mergeQuizEdits]
  )

  // Create edit handlers for a quiz question
  const createQuizEditHandlers = useCallback((question: QuizQuestion) => {
    const onUpdateQuestion = async (text: string) => {
      await updateQuizEdit(question.id, { editedQuestion: text })
    }

    const onUpdateAnswer = async (text: string) => {
      await updateQuizEdit(question.id, { editedAnswer: text })
    }

    const onUpdateOptions = async (options: string[]) => {
      await updateQuizEdit(question.id, { editedOptions: options })
    }

    const onUpdateExplanation = async (text: string) => {
      await updateQuizEdit(question.id, { editedExplanation: text })
    }

    const onDelete = async () => {
      await deleteQuizQuestion(question.id)
    }

    const onRestore = async () => {
      await restoreQuizQuestion(question.id)
    }

    return {
      onUpdateQuestion,
      onUpdateAnswer,
      onUpdateOptions,
      onUpdateExplanation,
      onDelete,
      onRestore,
      isEdited: hasQuizEdit(question.id),
      isDeleted: isQuizDeleted(question.id),
    }
  }, [updateQuizEdit, deleteQuizQuestion, restoreQuizQuestion, hasQuizEdit, isQuizDeleted])

  // Handle flashcard generation
  const handleGenerateFlashcards = useCallback(async (forceRegenerate = false) => {
    // Multi-strand mode
    if (viewMode === 'multi' && multiStrandContent.length > 0) {
      const multiStrandData = multiStrandContent.map(s => ({
        id: s.id,
        path: s.path,
        title: s.title,
        content: s.content,
      }))
      
      const result = await generateFlashcardsMulti(multiStrandData, {
        forceRegenerate
      })
      
      // Save generated cards
      for (const cardData of result.cards) {
        await createCard(cardData)
      }
      return
    }
    
    // Single strand mode
    if (!content || !strandSlug) return

    const result = await generateFlashcards(content, strandSlug, {
      forceRegenerate,
      useLLM: generationMode === 'llm'
    })

    // Save generated cards
    for (const cardData of result.cards) {
      await createCard(cardData)
    }
  }, [content, strandSlug, viewMode, multiStrandContent, generateFlashcards, generateFlashcardsMulti, createCard, generationMode])

  // Handle flashcard regeneration (clears existing and generates fresh)
  const handleRegenerateFlashcards = useCallback(async () => {
    if (viewMode === 'single' && (!content || !strandSlug)) return
    if (viewMode === 'multi' && multiStrandContent.length === 0) return

    // Delete existing cards first
    for (const card of cards) {
      await deleteCard(card.id)
    }

    // Generate fresh
    await handleGenerateFlashcards(true)
  }, [content, strandSlug, viewMode, multiStrandContent, cards, deleteCard, handleGenerateFlashcards])

  // Handle quiz regeneration
  const handleRegenerateQuiz = useCallback(async () => {
    // Multi-strand mode
    if (viewMode === 'multi' && multiStrandContent.length > 0) {
      const multiStrandData = multiStrandContent.map(s => ({
        id: s.id,
        path: s.path,
        title: s.title,
        content: s.content,
      }))
      
      await generateQuizMulti(multiStrandData, { forceRegenerate: true })
      setQuizIndex(0)
      setSelectedAnswer(null)
      setShowQuizResult(false)
      return
    }
    
    // Single strand mode
    if (!content) return
    await generateQuizQuestions(content, { forceRegenerate: true })
    setQuizIndex(0)
    setSelectedAnswer(null)
    setShowQuizResult(false)
  }, [content, viewMode, multiStrandContent, generateQuizQuestions, generateQuizMulti])

  // Handle mindmap generation
  const handleGenerateMindmap = useCallback(async () => {
    // Build StrandContent array
    const strands: StrandContent[] = []

    if (viewMode === 'multi' && multiStrandContent.length > 0) {
      // Multi-strand mode
      multiStrandContent.forEach(strand => {
        strands.push({
          path: strand.path,
          title: strand.title,
          content: strand.content,
          metadata: strand.metadata as any,
        })
      })
    } else if (viewMode === 'single' && content && strandSlug) {
      // Single strand mode
      strands.push({
        path: strandSlug,
        title: strandSlug.split('/').pop() || strandSlug,
        content: content,
        metadata: {},
      })
    }

    if (strands.length === 0) return

    // Generate based on mindmap type
    if (mindmap.mindmapType === 'hierarchy') {
      const hierarchyData = generateHierarchyData(strands, {
        singleStrand: viewMode === 'single',
      })

      await mindmap.generate(JSON.stringify(hierarchyData), {
        type: 'hierarchy',
        strandCount: strands.length,
      })
    } else if (mindmap.mindmapType === 'graph') {
      const graphData = generateGraphData(strands, {
        currentStrandPath: viewMode === 'single' ? strandSlug : undefined,
        useTagRelationships: mindmap.generationMode === 'tags',
      })

      await mindmap.generate(JSON.stringify(graphData), {
        type: 'graph',
        strandCount: strands.length,
      })
    } else if (mindmap.mindmapType === 'concept') {
      // Extract concepts from each strand
      const conceptDataList = strands.map(strand =>
        extractConcepts(strand.content, {
          minFrequency: viewMode === 'single' ? 2 : 1,
          maxConcepts: viewMode === 'single' ? 50 : 30,
        })
      )

      // Merge concepts if multiple strands
      const conceptData = viewMode === 'multi' && conceptDataList.length > 1
        ? mergeConceptData(conceptDataList)
        : conceptDataList[0]

      await mindmap.generate(JSON.stringify(conceptData), {
        type: 'concept',
        strandCount: strands.length,
      })
    }
  }, [
    viewMode,
    content,
    strandSlug,
    multiStrandContent,
    mindmap.mindmapType,
    mindmap.generationMode,
    mindmap.generate,
  ])

  // Handle mindmap export
  const handleExportSVG = useCallback(() => {
    exportSVG(mindmap.mindmapType)
  }, [mindmap.mindmapType])

  const handleExportPNG = useCallback(() => {
    exportPNG(mindmap.mindmapType)
  }, [mindmap.mindmapType])

  const handleExportJSON = useCallback(() => {
    const data = mindmap.mindmapType === 'hierarchy' ? mindmap.hierarchyData
      : mindmap.mindmapType === 'graph' ? mindmap.graphData
      : mindmap.conceptData

    exportJSON(mindmap.mindmapType, data)
  }, [mindmap.mindmapType, mindmap.hierarchyData, mindmap.graphData, mindmap.conceptData])

  // NOTE: Quiz generation is now OPT-IN (not auto-generated)
  // Users must click "Generate Quiz" button for better perceived performance
  // This prevents blocking the UI when switching to the Quiz tab

  useEffect(() => {
    setIsMounted(true)
    setStats(getLearningStats())
    return () => setIsMounted(false)
  }, [])

  useEffect(() => {
    setIsFlipped(false)
  }, [currentCard?.id])

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (activeTab === 'flashcards' && currentCard) {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault()
          setIsFlipped(!isFlipped)
        }
        if (isFlipped) {
          if (e.key === '1') rateCard(1)
          if (e.key === '2') rateCard(2)
          if (e.key === '3') rateCard(3)
          if (e.key === '4') rateCard(4)
        }
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, activeTab, currentCard, isFlipped, rateCard])

  const handleRate = useCallback(async (rating: FlashcardRating) => {
    if (!currentCard) return
    await rateCard(rating)
    recordCardReview(rating >= 3, strandSlug)
    addXP(rating === 4 ? 15 : rating === 3 ? 10 : rating === 2 ? 5 : 2)
    setIsFlipped(false)
  }, [currentCard, rateCard, strandSlug])

  const handleQuizAnswer = useCallback((answer: string) => {
    setSelectedAnswer(answer)
    setShowQuizResult(true)
    
    const isCorrect = answer === quizQuestions[quizIndex].answer
    if (isCorrect) addXP(10)
    recordCardReview(isCorrect, strandSlug)
  }, [quizIndex, quizQuestions, strandSlug])

  const handleNextQuestion = useCallback(() => {
    if (quizIndex < quizQuestions.length - 1) {
      setQuizIndex(i => i + 1)
      setSelectedAnswer(null)
      setShowQuizResult(false)
    }
  }, [quizIndex, quizQuestions.length])

  /**
   * Jump to source text in the content viewer
   * Closes the popover and scrolls to the matching text
   */
  const handleJumpToSource = useCallback((sourceText: string) => {
    // Close the learning studio
    onClose()

    // Wait for close animation, then scroll to source
    setTimeout(() => {
      const contentEl = document.querySelector('.codex-content-scroll')
      if (!contentEl) return

      const walker = document.createTreeWalker(
        contentEl,
        NodeFilter.SHOW_TEXT,
        null
      )

      const normalizedSource = sourceText.toLowerCase().trim().slice(0, 50)

      let node: Text | null
      while ((node = walker.nextNode() as Text | null)) {
        const text = node.textContent?.toLowerCase().trim() || ''
        if (text.includes(normalizedSource)) {
          const parent = node.parentElement
          if (parent) {
            parent.scrollIntoView({ behavior: 'smooth', block: 'center' })
            parent.classList.add('ring-2', 'ring-cyan-500', 'ring-offset-2', 'bg-cyan-50', 'dark:bg-cyan-900/30')
            setTimeout(() => {
              parent.classList.remove('ring-2', 'ring-cyan-500', 'ring-offset-2', 'bg-cyan-50', 'dark:bg-cyan-900/30')
            }, 2000)
          }
          break
        }
      }
    }, 150)
  }, [onClose])

  const progress = useMemo(() => {
    if (!session.active || session.cards.length === 0) return 0
    return Math.round((session.reviewed / session.cards.length) * 100)
  }, [session])

  if (!isOpen || !isMounted) return null

  const tabs: { id: TabType; label: string; icon: React.ElementType; count?: number }[] = [
    { id: 'flashcards', label: 'Flashcards', icon: GraduationCap, count: dueCards.length },
    { id: 'quiz', label: 'Quiz', icon: ListChecks, count: quizQuestions.length },
    { id: 'teach', label: 'Teach', icon: Lightbulb },
    { id: 'glossary', label: 'Glossary', icon: Book },
    { id: 'mindmaps', label: 'Mindmaps', icon: Network },
    { id: 'questions', label: 'Questions', icon: MessageCircleQuestion },
  ]

  const studioContent = (
    <div className={`
      flex flex-col h-full
      ${mode === 'page' ? '' : 'max-h-[85vh]'}
    `}>
      {/* Header with SVG decoration */}
      <div className={`
        relative px-4 sm:px-6 py-4 border-b shrink-0 overflow-hidden
        ${isDark 
          ? 'border-zinc-800 bg-gradient-to-r from-emerald-950/30 via-zinc-900 to-purple-950/30' 
          : 'border-zinc-200 bg-gradient-to-r from-emerald-50/50 via-white to-purple-50/50'
        }
      `}>
        {/* SVG pattern background */}
        <svg className="absolute inset-0 w-full h-full opacity-10" preserveAspectRatio="none">
          <defs>
            <pattern id="learning-grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="currentColor" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#learning-grid)" />
        </svg>
        
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`
              relative p-2.5 rounded-xl
              ${isDark 
                ? 'bg-gradient-to-br from-emerald-900/70 to-purple-900/50 ring-1 ring-emerald-700/50' 
                : 'bg-gradient-to-br from-emerald-100 to-purple-100 ring-1 ring-emerald-200'
              }
            `}>
              <AnimatedBrain className={`w-6 h-6 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
            </div>
            <div>
              <h2 className={`text-lg sm:text-xl font-bold flex items-center gap-2 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                Learning Studio
                {stats && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-amber-900/50 text-amber-400' : 'bg-amber-100 text-amber-600'}`}>
                    Lv.{stats.level}
                  </span>
                )}
              </h2>
              <p className={`text-xs flex items-center gap-2 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                {viewMode === 'single' 
                  ? (strandSlug ? strandSlug.split('/').pop()?.replace('.md', '') : 'All strands')
                  : (
                    <span className="flex items-center gap-1">
                      <Layers className="w-3 h-3" />
                      {multiStrandContent.length > 0 
                        ? `${multiStrandContent.length} strands selected`
                        : 'Select strands to study'
                      }
                    </span>
                  )
                }
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <ViewModeToggle
              mode={viewMode}
              onChange={setViewMode}
              isDark={isDark}
              disabled={!availableStrands.length}
            />
            
            {/* Strand Picker Button - only in multi mode */}
            {viewMode === 'multi' && (
              <button
                onClick={() => setShowStrandPicker(true)}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                  transition-all touch-manipulation
                  ${isDark 
                    ? 'bg-purple-900/50 hover:bg-purple-800/60 text-purple-300 ring-1 ring-purple-700/50' 
                    : 'bg-purple-100 hover:bg-purple-200 text-purple-700 ring-1 ring-purple-200'
                  }
                `}
              >
                <Library className="w-4 h-4" />
                {multiStrandContent.length > 0 ? 'Edit Selection' : 'Pick Strands'}
              </button>
            )}
            {mode === 'popover' && (
              <button
                onClick={() => window.location.href = '/codex/learn'}
                className={`
                  rounded-xl transition-all touch-manipulation
                  ${isTouch ? 'p-2.5 min-w-[44px] min-h-[44px]' : 'p-2'}
                  ${isDark ? 'hover:bg-zinc-800 active:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-100 active:bg-zinc-200 text-zinc-500'}
                `}
                title="Open full page"
              >
                <Maximize2 className={isTouch ? 'w-5 h-5' : 'w-5 h-5'} />
              </button>
            )}
            <button
              onClick={onClose}
              className={`
                rounded-xl transition-all touch-manipulation
                ${isTouch ? 'p-2.5 min-w-[44px] min-h-[44px]' : 'p-2'}
                ${isDark ? 'hover:bg-zinc-800 active:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-100 active:bg-zinc-200 text-zinc-500'}
              `}
            >
              <X className={isTouch ? 'w-5 h-5' : 'w-5 h-5'} />
            </button>
          </div>
        </div>
        
        {/* Tabs - Horizontally scrollable on mobile */}
        <div className="relative mt-4 -mx-1 sm:mx-0">
          <div className={`
            flex gap-1 p-1 rounded-xl bg-black/5 dark:bg-white/5
            ${isMobile ? 'overflow-x-auto scrollbar-none snap-x snap-mandatory' : ''}
          `}>
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    relative flex items-center justify-center gap-1.5 rounded-lg
                    text-sm font-medium transition-colors z-10 touch-manipulation
                    ${isMobile ? 'flex-shrink-0 snap-center' : 'flex-1'}
                    ${isTouch ? 'py-2.5 px-3.5 min-h-[44px]' : 'py-2 px-3'}
                    ${isActive
                      ? isDark ? 'text-emerald-400' : 'text-emerald-700'
                      : isDark ? 'text-zinc-400 hover:text-zinc-200 active:text-zinc-100' : 'text-zinc-500 hover:text-zinc-700 active:text-zinc-800'
                    }
                  `}
                >
                  {isActive && <TabIndicator isDark={isDark} />}
                  <Icon className={`${isTouch ? 'w-5 h-5' : 'w-4 h-4'} relative z-10 flex-shrink-0`} />
                  <span className={`relative z-10 ${isMobile ? 'text-xs' : 'hidden sm:inline'}`}>{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className={`
                      relative z-10 text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0
                      ${isActive
                        ? isDark ? 'bg-emerald-900/50 text-emerald-300' : 'bg-emerald-200 text-emerald-700'
                        : isDark ? 'bg-zinc-700 text-zinc-400' : 'bg-zinc-200 text-zinc-500'
                      }
                    `}>
                      {tab.count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
        
        {/* Progress bar for active session */}
        <AnimatePresence>
          {session.active && activeTab === 'flashcards' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <Flame className={`w-4 h-4 ${session.streak >= 3 ? 'text-orange-500' : isDark ? 'text-zinc-600' : 'text-zinc-300'}`} />
                  <span className={`text-sm font-bold ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                    {session.streak}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      <Divider isDark={isDark} />
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {/* Empty state when no strand is selected */}
        {!content && !strandSlug && mode === 'page' && (
          <div className={`h-full flex flex-col items-center justify-center text-center p-8 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-100'}`}>
              <BookOpen className={`w-10 h-10 ${isDark ? 'text-emerald-500' : 'text-emerald-600'}`} />
            </div>
            <h3 className={`text-xl font-semibold mb-2 ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
              Select a Strand to Begin
            </h3>
            <p className={`text-sm max-w-md mb-6 ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
              Choose a strand from the sidebar to generate flashcards, quizzes, glossary terms, and AI-powered questions.
            </p>
            <div className="flex items-center gap-2 text-xs">
              <span className={`px-3 py-1.5 rounded-full ${isDark ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                <GraduationCap className="w-3.5 h-3.5 inline mr-1" />
                Flashcards
              </span>
              <span className={`px-3 py-1.5 rounded-full ${isDark ? 'bg-purple-900/40 text-purple-400' : 'bg-purple-100 text-purple-700'}`}>
                <ListChecks className="w-3.5 h-3.5 inline mr-1" />
                Quiz
              </span>
              <span className={`px-3 py-1.5 rounded-full ${isDark ? 'bg-cyan-900/40 text-cyan-400' : 'bg-cyan-100 text-cyan-700'}`}>
                <Book className="w-3.5 h-3.5 inline mr-1" />
                Glossary
              </span>
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* Flashcards Tab */}
          {activeTab === 'flashcards' && (
            <motion.div
              key="flashcards"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="h-full"
            >
              {loading ? (
                <div className={`p-8 rounded-2xl text-center space-y-4 ${isDark ? 'bg-gradient-to-br from-emerald-950/30 to-zinc-900' : 'bg-gradient-to-br from-emerald-50 to-zinc-50'}`}>
                  <div className="relative mx-auto w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20" />
                    <div className="absolute inset-0 rounded-full border-4 border-t-emerald-500 animate-spin" />
                    <GraduationCap className={`absolute inset-3 w-10 h-10 ${isDark ? 'text-emerald-400' : 'text-emerald-600'} animate-pulse`} />
                  </div>
                  <div>
                    <p className={`text-base font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                      Loading Flashcards...
                    </p>
                    <p className={`text-xs mt-1 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                      Preparing your study session
                    </p>
                  </div>
                </div>
              ) : !session.active ? (
                <div className="space-y-6">
                  {/* Generation Mode & Controls */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        Generation:
                      </span>
                      <GenerationModeToggle
                        mode={generationMode}
                        onModeChange={setGenerationMode}
                        isDark={isDark}
                        disabled={flashcardGenerating}
                        compact={isMobile}
                        hasLLMApiKey={hasLLMApiKey}
                      />
                    </div>
                    {cards.length > 0 && content && content.length > 100 && (
                      <RegenerateButton
                        onClick={handleRegenerateFlashcards}
                        isDark={isDark}
                        loading={flashcardGenerating}
                        compact={isMobile}
                      />
                    )}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: dueCards.length, label: 'Due Now', color: 'emerald' },
                      { value: cardStats.new, label: 'New', color: 'cyan' },
                      { value: cardStats.learning, label: 'Learning', color: 'amber' },
                    ].map((stat) => (
                      <div key={stat.label} className={`relative p-3 rounded-xl text-center overflow-hidden ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'}`}>
                        <p className={`text-2xl font-bold text-${stat.color}-${isDark ? '400' : '600'}`}>
                          {stat.value}
                        </p>
                        <p className={`text-[10px] uppercase tracking-wide ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                          {stat.label}
                        </p>
                      </div>
                    ))}
                  </div>
                  
                  {/* Generating state */}
                  {flashcardGenerating && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`p-6 rounded-xl text-center relative overflow-hidden ${isDark ? 'bg-emerald-900/20 shadow-lg shadow-emerald-900/20' : 'bg-emerald-50 shadow-lg shadow-emerald-200/50'}`}
                    >
                      {/* Animated gradient background */}
                      <div className="absolute inset-0 opacity-30">
                        <div className={`absolute inset-0 bg-gradient-to-r ${isDark ? 'from-emerald-900/0 via-emerald-700/30 to-emerald-900/0' : 'from-emerald-100/0 via-emerald-200/50 to-emerald-100/0'}`} 
                          style={{ 
                            backgroundSize: '200% 100%',
                            animation: 'codex-shimmer 2s ease-in-out infinite'
                          }} 
                        />
                      </div>
                      <div className="relative z-10">
                        <div className="relative mx-auto w-14 h-14 mb-4">
                          <div className={`absolute inset-0 rounded-full border-4 ${isDark ? 'border-emerald-500/20' : 'border-emerald-300/30'}`} />
                          <div className={`absolute inset-0 rounded-full border-4 border-t-emerald-500 ${isDark ? 'border-r-cyan-400' : 'border-r-cyan-500'} animate-spin`} />
                          <div className="absolute inset-2 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 opacity-20" />
                        </div>
                        <p className={`text-sm font-semibold ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
                          Generating Flashcards...
                        </p>
                        <div className="flex items-center justify-center gap-2 mt-2">
                          <GenerationMethodBadge method={generationMode} isDark={isDark} />
                          <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                            {generationMode === 'offline' ? 'Using local NLP' : 'Using AI model'}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Error state */}
                  {flashcardGenError && !flashcardGenerating && (
                    <div className={`p-4 rounded-xl text-center ${isDark ? 'bg-red-900/20 border border-red-900/50' : 'bg-red-50 border border-red-200'}`}>
                      <p className={`text-sm ${isDark ? 'text-red-300' : 'text-red-700'}`}>{flashcardGenError}</p>
                      <button
                        onClick={() => handleGenerateFlashcards()}
                        className={`mt-2 px-4 py-2 rounded-lg text-sm font-medium ${isDark ? 'bg-zinc-700 hover:bg-zinc-600' : 'bg-zinc-200 hover:bg-zinc-300'}`}
                      >
                        Try Again
                      </button>
                    </div>
                  )}

                  {/* Flashcard Grid - show all cards */}
                  {!flashcardGenerating && !flashcardGenError && cards.length > 0 && (
                    <FlashcardGrid
                      cards={cards}
                      isDark={isDark}
                      onDelete={deleteCard}
                      onStartReview={() => startSession()}
                      defaultCollapsed={dueCards.length > 0}
                    />
                  )}

                  {/* Due cards - start review */}
                  {!flashcardGenerating && !flashcardGenError && dueCards.length > 0 && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => startSession()}
                      className="w-full flex items-center justify-center gap-3 py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-bold text-lg shadow-lg shadow-emerald-500/20 hover:shadow-xl transition-shadow"
                    >
                      <Play className="w-6 h-6" />
                      Start Review ({dueCards.length})
                    </motion.button>
                  )}

                  {/* No cards at all - show generate button */}
                  {!flashcardGenerating && !flashcardGenError && cards.length === 0 && (
                    <div className={`p-6 rounded-2xl text-center space-y-4 ${isDark ? 'bg-zinc-800/30 border border-zinc-700/50' : 'bg-zinc-50 border border-zinc-200'}`}>
                      <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center ${isDark ? 'bg-emerald-900/40' : 'bg-emerald-100'}`}>
                        <GraduationCap className={`w-8 h-8 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                      </div>
                      <div>
                        <p className={`text-base font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                          {content && content.length > 100 ? 'Ready to Generate Flashcards' : 'No Flashcards Yet'}
                        </p>
                        <p className={`text-xs mt-1 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                          {content && content.length > 100
                            ? 'Create flashcards from this strand using AI'
                            : 'Select a strand with content to generate flashcards'}
                        </p>
                      </div>
                      {content && content.length > 100 && (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleGenerateFlashcards()}
                          className="px-8 py-3 rounded-xl text-base font-bold bg-gradient-to-r from-emerald-600 to-cyan-600 text-white shadow-lg shadow-emerald-500/20 hover:shadow-xl transition-shadow flex items-center gap-2 mx-auto"
                        >
                          <Sparkles className="w-5 h-5" />
                          Generate Flashcards
                        </motion.button>
                      )}
                    </div>
                  )}

                  {/* All caught up - cards exist but none due */}
                  {!flashcardGenerating && !flashcardGenError && cards.length > 0 && dueCards.length === 0 && (
                    <div className={`text-center py-8 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      <Trophy className={`w-16 h-16 mx-auto mb-3 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
                      <p className="font-bold text-lg">All caught up! 🎉</p>
                      <p className={`text-xs mt-1 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        Come back later for more reviews
                      </p>
                      {content && content.length > 100 && (
                        <button
                          onClick={() => handleGenerateFlashcards()}
                          className={`mt-4 px-4 py-2 rounded-lg text-sm font-medium ${isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-700'}`}
                        >
                          Generate More Cards
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : currentCard ? (
                <div className="space-y-4">
                  <FlashcardDisplay
                    card={currentCard}
                    isFlipped={isFlipped}
                    onFlip={() => setIsFlipped(!isFlipped)}
                    isDark={isDark}
                    isTouch={isTouch}
                  />
                  
                  <AnimatePresence>
                    {isFlipped && intervalPreview && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="flex gap-2"
                      >
                        <RatingButton rating={1} label="Again" interval="<1m" color="red" onClick={() => handleRate(1)} isDark={isDark} isTouch={isTouch} />
                        <RatingButton rating={2} label="Hard" interval={formatInterval(intervalPreview[2])} color="orange" onClick={() => handleRate(2)} isDark={isDark} isTouch={isTouch} />
                        <RatingButton rating={3} label="Good" interval={formatInterval(intervalPreview[3])} color="emerald" onClick={() => handleRate(3)} isDark={isDark} isTouch={isTouch} />
                        <RatingButton rating={4} label="Easy" interval={formatInterval(intervalPreview[4])} color="cyan" onClick={() => handleRate(4)} isDark={isDark} isTouch={isTouch} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  {!isFlipped && (
                    <div className="flex items-center justify-center gap-4">
                      {!isTouch && (
                        <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                          Press <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 font-mono">Space</kbd> to flip
                        </p>
                      )}
                      <button
                        onClick={() => {
                          skipCard()
                          setIsFlipped(false)
                        }}
                        className={`
                          flex items-center gap-1.5 rounded-lg font-medium transition-colors touch-manipulation
                          ${isTouch ? 'px-4 py-2.5 min-h-[44px] text-sm' : 'px-3 py-1.5 text-xs'}
                          ${isDark ? 'bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-zinc-400' : 'bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-600'}
                        `}
                      >
                        <SkipForward className={isTouch ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
                        Skip
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 space-y-4">
                  <Trophy className={`w-16 h-16 mx-auto ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
                  <h3 className={`text-xl font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                    Session Complete! 🎉
                  </h3>
                  <button
                    onClick={() => endSession()}
                    className={`px-6 py-2 rounded-xl font-medium ${isDark ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-zinc-100 hover:bg-zinc-200'}`}
                  >
                    Done
                  </button>
                </div>
              )}
            </motion.div>
          )}
          
          {/* Quiz Tab */}
          {activeTab === 'quiz' && (
            <motion.div
              key="quiz"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              {/* Loading state - Enhanced with progress tracking */}
              {quizGenerating && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`p-8 rounded-2xl text-center space-y-4 relative overflow-hidden shadow-lg ${isDark ? 'bg-gradient-to-br from-purple-950/30 to-zinc-900 shadow-purple-900/20' : 'bg-gradient-to-br from-purple-50 to-zinc-50 shadow-purple-200/50'}`}
                >
                  {/* Animated background shimmer */}
                  <div className="absolute inset-0 opacity-30">
                    <div className={`absolute inset-0 bg-gradient-to-r ${isDark ? 'from-purple-900/0 via-purple-700/30 to-purple-900/0' : 'from-purple-100/0 via-purple-200/50 to-purple-100/0'}`} 
                      style={{ 
                        backgroundSize: '200% 100%',
                        animation: 'codex-shimmer 2s ease-in-out infinite'
                      }} 
                    />
                  </div>
                  <div className="relative z-10">
                  <div className="relative mx-auto w-16 h-16">
                    <div className={`absolute inset-0 rounded-full border-4 ${isDark ? 'border-purple-500/20' : 'border-purple-300/30'}`} />
                    <div className={`absolute inset-0 rounded-full border-4 border-t-purple-500 ${isDark ? 'border-r-indigo-400' : 'border-r-indigo-500'} animate-spin`} />
                    <div className="absolute inset-2 rounded-full bg-gradient-to-br from-purple-400 to-indigo-400 opacity-20" />
                    <Sparkles className={`absolute inset-3 w-10 h-10 ${isDark ? 'text-purple-400' : 'text-purple-600'} animate-pulse`} />
                  </div>
                  <div>
                    <p className={`text-base font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                      {quizProgress.message || 'Generating Quiz Questions...'}
                    </p>
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <GenerationMethodBadge method={generationMode} isDark={isDark} />
                      <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        {generationMode === 'offline' ? 'Analyzing content with local NLP' : 'Using AI model'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="w-full max-w-xs mx-auto">
                    <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-zinc-700/50' : 'bg-zinc-200'}`}>
                      <motion.div 
                        className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${quizProgress.percent}%` }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                      />
                    </div>
                    <p className={`text-xs mt-1 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                      {quizProgress.percent}% complete
                    </p>
                  </div>
                  
                  {/* Skeleton cards */}
                  <div className="grid gap-2 mt-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className={`p-4 rounded-xl animate-pulse ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-100'}`}>
                        <div className={`h-3 w-3/4 rounded ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}`} />
                        <div className={`h-2 w-1/2 mt-2 rounded ${isDark ? 'bg-zinc-700/50' : 'bg-zinc-200/70'}`} />
                      </div>
                    ))}
                  </div>
                  </div>
                </motion.div>
              )}

              {/* Error state */}
              {!quizGenerating && quizError && (
                <div className={`p-6 rounded-xl text-center ${isDark ? 'bg-red-900/20 border border-red-900/50' : 'bg-red-50 border border-red-200'}`}>
                  <HelpCircle className={`w-10 h-10 mx-auto mb-3 ${isDark ? 'text-red-400' : 'text-red-500'}`} />
                  <p className={`text-sm font-medium ${isDark ? 'text-red-300' : 'text-red-700'}`}>
                    {quizError}
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => content && generateQuizQuestions(content)}
                    className={`mt-4 px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 mx-auto transition-all ${isDark ? 'bg-purple-700 hover:bg-purple-600 text-white' : 'bg-purple-600 hover:bg-purple-500 text-white'}`}
                  >
                    <RefreshCw className="w-4 h-4" />
                    Try Again
                  </motion.button>
                </div>
              )}

              {/* Empty state - with generate button */}
              {!quizGenerating && !quizError && quizQuestions.length === 0 && (
                <div className={`p-8 rounded-2xl text-center space-y-4 ${isDark ? 'bg-zinc-800/30 border border-zinc-700/50' : 'bg-zinc-50 border border-zinc-200'}`}>
                  <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center ${isDark ? 'bg-purple-900/40' : 'bg-purple-100'}`}>
                    <ListChecks className={`w-8 h-8 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                  </div>
                  <div>
                    <p className={`text-base font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                      {content && content.length > 100 ? 'Ready to Generate Quiz' : 'No Content Available'}
                    </p>
                    <p className={`text-xs mt-1 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                      {content && content.length > 100
                        ? 'Click below to generate quiz questions from this strand'
                        : 'Select a strand with content to generate quiz questions'}
                    </p>
                  </div>
                  {content && content.length > 100 && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => generateQuizQuestions(content)}
                      className="px-8 py-3 rounded-xl text-base font-bold bg-gradient-to-r from-purple-600 to-cyan-600 text-white shadow-lg shadow-purple-500/20 hover:shadow-xl transition-shadow flex items-center gap-2 mx-auto"
                    >
                      <Sparkles className="w-5 h-5" />
                      Generate Quiz
                    </motion.button>
                  )}
                </div>
              )}

              {/* Quiz content */}
              {!quizGenerating && !quizError && quizQuestions.length > 0 && (
                <>
                  {/* Generation Mode & Controls */}
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        Generation:
                      </span>
                      <GenerationModeToggle
                        mode={generationMode}
                        onModeChange={setGenerationMode}
                        isDark={isDark}
                        disabled={quizGenerating}
                        compact={isMobile}
                        hasLLMApiKey={hasLLMApiKey}
                      />
                    </div>
                    {content && content.length > 100 && (
                      <RegenerateButton
                        onClick={handleRegenerateQuiz}
                        isDark={isDark}
                        loading={quizGenerating}
                        compact={isMobile}
                      />
                    )}
                  </div>

                  {/* Mode Toggle */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setQuizViewMode('quiz')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          quizViewMode === 'quiz'
                            ? isDark ? 'bg-purple-900/50 text-purple-300' : 'bg-purple-100 text-purple-700'
                            : isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
                        }`}
                      >
                        <Play className="w-4 h-4" />
                        Quiz
                      </button>
                      <button
                        onClick={() => setQuizViewMode('edit')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          quizViewMode === 'edit'
                            ? isDark ? 'bg-purple-900/50 text-purple-300' : 'bg-purple-100 text-purple-700'
                            : isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
                        }`}
                      >
                        <Edit3 className="w-4 h-4" />
                        Edit ({quizQuestions.length})
                      </button>
                    </div>
                    {quizViewMode === 'quiz' && (
                      <div className="flex items-center gap-2">
                        <GenerationMethodBadge method="offline" isDark={isDark} />
                        <div className="flex gap-1">
                          {mergedQuizQuestions.map((_, idx) => (
                            <div
                              key={idx}
                              className={`w-2 h-2 rounded-full ${
                                idx === quizIndex
                                  ? 'bg-purple-500'
                                  : idx < quizIndex
                                    ? 'bg-emerald-500'
                                    : isDark ? 'bg-zinc-700' : 'bg-zinc-200'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Quiz Mode */}
                  {quizViewMode === 'quiz' && mergedQuizQuestions.length > 0 && (
                    <>
                      <div className={`text-xs mb-2 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        Question {quizIndex + 1} of {mergedQuizQuestions.length}
                      </div>

                      <QuizDisplay
                        question={mergedQuizQuestions[quizIndex] || mergedQuizQuestions[0]}
                        selectedAnswer={selectedAnswer}
                        onSelectAnswer={handleQuizAnswer}
                        showResult={showQuizResult}
                        isDark={isDark}
                        onJumpToSource={handleJumpToSource}
                      />

                      {showQuizResult && quizIndex < mergedQuizQuestions.length - 1 && (
                        <motion.button
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          whileHover={{ scale: 1.02 }}
                          onClick={handleNextQuestion}
                          className="mt-4 w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-bold flex items-center justify-center gap-2"
                        >
                          Next Question
                          <ArrowRight className="w-5 h-5" />
                        </motion.button>
                      )}
                    </>
                  )}

                  {/* Edit Mode - Show all questions */}
                  {quizViewMode === 'edit' && (
                    <div className="space-y-2">
                      <p className={`text-xs mb-3 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        Click a question to expand and edit. Changes auto-save.
                      </p>
                      {quizQuestions.map((question) => {
                        const handlers = createQuizEditHandlers(question)
                        return (
                          <QuizQuestionCard
                            key={question.id}
                            question={question}
                            isDark={isDark}
                            {...handlers}
                          />
                        )
                      })}
                    </div>
                  )}

                  {/* Empty after all deleted */}
                  {quizViewMode === 'quiz' && mergedQuizQuestions.length === 0 && (
                    <div className={`p-6 rounded-xl text-center ${isDark ? 'bg-zinc-800/30' : 'bg-zinc-50'}`}>
                      <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                        All questions have been deleted. Switch to Edit mode to restore them.
                      </p>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {/* Teach Tab - Feynman Technique */}
          {activeTab === 'teach' && (
            <motion.div
              key="teach"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <TeachMode
                strandSlug={strandSlug || 'untitled'}
                strandTitle={strandSlug?.split('/').pop()?.replace('.md', '').replace(/-/g, ' ') || 'Untitled'}
                strandContent={content || ''}
                isDark={isDark}
              />
            </motion.div>
          )}

          {/* Glossary Tab */}
          {activeTab === 'glossary' && (
            <motion.div
              key="glossary"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              {viewMode === 'multi' ? (
                <GlobalGlossaryView
                  globalGlossary={globalGlossary}
                  isDark={isDark}
                  filterOptions={filterOptions}
                  onTermClick={(term) => {
                    // Could navigate to source strand
                    if (term.sourceStrandPath && handleJumpToSource) {
                      handleJumpToSource(term.definition)
                    }
                  }}
                />
              ) : (
                <GlossaryPanel
                  content={content}
                  isDark={isDark}
                  onJumpToSource={handleJumpToSource}
                  strandSlug={strandSlug}
                  editable
                />
              )}
            </motion.div>
          )}

          {/* Mindmaps Tab */}
          {activeTab === 'mindmaps' && (
            <motion.div
              key="mindmaps"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              {/* View Mode Toggle */}
              {availableStrands.length > 1 && (
                <div className={`p-3 rounded-xl flex items-center gap-3 ${isDark ? 'bg-zinc-800/50 border border-zinc-700/50' : 'bg-zinc-50 border border-zinc-200'}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`text-xs font-medium ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                        {viewMode === 'single' ? 'Single Strand Mode' : 'Multi-Strand Mode'}
                      </p>
                      {viewMode === 'multi' && multiStrandContent.length > 0 && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-cyan-900/30 text-cyan-400' : 'bg-cyan-100 text-cyan-700'}`}>
                          {multiStrandContent.length} selected
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {viewMode === 'multi' && (
                      <button
                        onClick={() => setShowStrandPicker(true)}
                        className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                          isDark
                            ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-200'
                            : 'bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-300'
                        }`}
                      >
                        Select Strands
                      </button>
                    )}
                    <button
                      onClick={() => setViewMode(viewMode === 'single' ? 'multi' : 'single')}
                      className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                        isDark
                          ? 'bg-cyan-900/30 hover:bg-cyan-900/50 text-cyan-400'
                          : 'bg-cyan-50 hover:bg-cyan-100 text-cyan-700'
                      }`}
                    >
                      Switch to {viewMode === 'single' ? 'Multi' : 'Single'}
                    </button>
                  </div>
                </div>
              )}

              {/* Mindmap Controls */}
              <MindmapControls
                mindmapType={mindmap.mindmapType}
                viewMode={mindmap.viewMode}
                generationMode={mindmap.generationMode}
                onMindmapTypeChange={mindmap.setMindmapType}
                onViewModeChange={mindmap.setViewMode}
                onGenerationModeChange={mindmap.setGenerationMode}
                onExportSVG={handleExportSVG}
                onExportPNG={handleExportPNG}
                onExportJSON={handleExportJSON}
                loading={mindmap.loading}
                isDark={isDark}
              />

              {/* Generation Button */}
              {(!mindmap.hierarchyData && !mindmap.graphData && !mindmap.conceptData) && (
                <div className={`p-4 rounded-xl ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'}`}>
                  <button
                    onClick={handleGenerateMindmap}
                    disabled={mindmap.loading || (viewMode === 'single' && !content) || (viewMode === 'multi' && multiStrandContent.length === 0)}
                    className={`
                      w-full px-4 py-3 rounded-lg font-medium text-sm
                      transition-all duration-200
                      ${mindmap.loading
                        ? 'cursor-not-allowed opacity-50'
                        : isDark
                          ? 'bg-cyan-600 hover:bg-cyan-500 text-white'
                          : 'bg-cyan-500 hover:bg-cyan-600 text-white'
                      }
                    `}
                  >
                    {mindmap.loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        >
                          <RefreshCw className="w-4 h-4" />
                        </motion.div>
                        Generating...
                      </span>
                    ) : (
                      `Generate ${mindmap.mindmapType === 'hierarchy' ? 'Hierarchy' : mindmap.mindmapType === 'graph' ? 'Graph' : 'Concept'} Mindmap`
                    )}
                  </button>
                </div>
              )}

              {/* Mindmap Display */}
              <MindmapDisplay
                mindmapType={mindmap.mindmapType}
                hierarchyData={mindmap.hierarchyData}
                graphData={mindmap.graphData}
                conceptData={mindmap.conceptData}
                loading={mindmap.loading}
                progress={mindmap.progress}
                error={mindmap.error}
                isDark={isDark}
              />

              {/* Regenerate Button */}
              {(mindmap.hierarchyData || mindmap.graphData || mindmap.conceptData) && (
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={handleGenerateMindmap}
                    disabled={mindmap.loading}
                    className={`
                      px-4 py-2 rounded-lg text-sm font-medium
                      transition-all duration-200
                      ${isDark
                        ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-200'
                        : 'bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-300'
                      }
                      disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                  >
                    <RefreshCw className={`w-4 h-4 inline mr-2 ${mindmap.loading ? 'animate-spin' : ''}`} />
                    Regenerate
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* Questions Tab */}
          {activeTab === 'questions' && (
            <motion.div
              key="questions"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              <div className={`p-4 rounded-xl flex items-start gap-3 ${isDark ? 'bg-cyan-900/20 border border-cyan-800/50' : 'bg-cyan-50 border border-cyan-200'}`}>
                <Lightbulb className={`w-5 h-5 shrink-0 mt-0.5 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
                <div>
                  <p className={`text-sm font-medium ${isDark ? 'text-cyan-300' : 'text-cyan-800'}`}>
                    AI-Generated Questions
                  </p>
                  <p className={`text-xs mt-0.5 ${isDark ? 'text-cyan-400/70' : 'text-cyan-600/70'}`}>
                    Questions generated from this strand's content using NLP analysis
                  </p>
                </div>
              </div>

              {content && content.length > 100 ? (
                <div className="space-y-3">
                  {/* Quick action to open Oracle */}
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={onClose}
                    className={`w-full p-4 rounded-xl text-left flex items-center gap-4 transition-all ${isDark ? 'bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50' : 'bg-white hover:bg-zinc-50 border border-zinc-200'}`}
                  >
                    <div className={`p-3 rounded-xl ${isDark ? 'bg-purple-900/50' : 'bg-purple-100'}`}>
                      <Brain className={`w-6 h-6 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                        Ask the Codex Oracle
                      </p>
                      <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        Ask any question about this strand
                      </p>
                    </div>
                    <ChevronRight className={`w-5 h-5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
                  </motion.button>

                  {/* Sample suggested questions preview */}
                  <div className={`p-4 rounded-xl ${isDark ? 'bg-zinc-800/30' : 'bg-zinc-50'}`}>
                    <p className={`text-xs font-medium mb-3 flex items-center gap-2 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      <Sparkles className="w-3 h-3" />
                      Try asking:
                    </p>
                    <div className="space-y-2">
                      {[
                        `What is ${strandSlug?.split('/').pop()?.replace('.md', '').replace(/-/g, ' ')} about?`,
                        'Explain the key concepts in this document',
                        'What are the practical applications?',
                      ].map((q, i) => (
                        <button
                          key={i}
                          onClick={onClose}
                          className={`w-full p-2.5 rounded-lg text-left text-sm transition-colors ${isDark ? 'bg-zinc-700/50 hover:bg-zinc-700 text-zinc-300' : 'bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200'}`}
                        >
                          "{q}"
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className={`p-8 rounded-2xl text-center space-y-4 ${isDark ? 'bg-zinc-800/30 border border-zinc-700/50' : 'bg-zinc-50 border border-zinc-200'}`}>
                  <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center ${isDark ? 'bg-cyan-900/40' : 'bg-cyan-100'}`}>
                    <MessageCircleQuestion className={`w-8 h-8 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
                  </div>
                  <div>
                    <p className={`text-base font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                      No Content Available
                    </p>
                    <p className={`text-xs mt-1 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                      Select a strand to see AI-generated questions
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Footer */}
      <div className={`
        relative px-4 sm:px-6 py-3 border-t shrink-0
        ${isDark ? 'border-zinc-800 bg-zinc-950/50' : 'border-zinc-200 bg-zinc-50/50'}
      `}>
        <div className="flex items-center justify-between">
          <div className={`text-xs flex items-center gap-2 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            <Award className="w-4 h-4" />
            <span>{stats?.totalXP || 0} XP</span>
            <span className="opacity-50">•</span>
            <Flame className={`w-4 h-4 ${(stats?.currentStreak || 0) > 0 ? 'text-orange-500' : ''}`} />
            <span>{stats?.currentStreak || 0} streak</span>
          </div>

          <button
            onClick={onClose}
            className={`
              rounded-lg font-medium transition-colors touch-manipulation
              ${isTouch ? 'px-5 py-2.5 min-h-[44px] text-sm' : 'px-4 py-2 text-sm'}
              ${isDark ? 'bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600' : 'bg-zinc-200 hover:bg-zinc-300 active:bg-zinc-400'}
            `}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )

  // Multi-Strand Picker Modal
  const strandPickerModal = showStrandPicker && (
    <MultiStrandPicker
      isOpen={showStrandPicker}
      onClose={() => setShowStrandPicker(false)}
      onConfirm={handleStrandPickerConfirm}
      theme={theme}
      strands={availableStrands}
      selectedIds={new Set(multiStrand.selectedStrands.map(s => s.id))}
      onToggle={multiStrand.toggleStrand}
      onSelectMultiple={(strands) => strands.forEach(s => multiStrand.selectStrand(s))}
      onClear={multiStrand.clearSelection}
      stats={multiStrand.stats}
      filterOptions={filterOptions}
    />
  )

  // Popover mode: use portal
  if (mode === 'popover') {
    return createPortal(
      <>
        <AnimatePresence>
          {isOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[299]"
                onClick={onClose}
              />
              
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.98 }}
                className={`
                  fixed z-[300]
                  md:bottom-4 md:right-4 md:w-[min(95vw,520px)] md:max-h-[85vh]
                  max-md:inset-2
                  overflow-hidden rounded-2xl shadow-2xl
                  ${isDark 
                    ? 'bg-zinc-900 border border-zinc-700/80 shadow-zinc-950/80' 
                    : 'bg-white border border-zinc-200 shadow-zinc-400/30'
                  }
                `}
              >
                {studioContent}
              </motion.div>
            </>
          )}
        </AnimatePresence>
        {strandPickerModal}
      </>,
      document.body
    )
  }

  // Page mode: render directly with sidebar toggle
  return (
    <div className={`relative h-full ${isDark ? 'bg-zinc-950' : 'bg-zinc-50'}`}>
      {/* Sidebar toggle */}
      <SidebarToggle 
        isVisible={sidebarVisible}
        onClick={() => onToggleSidebar?.()}
        isDark={isDark}
      />
      
      <div className={`
        h-full overflow-hidden rounded-2xl mx-4 my-4
        shadow-xl
        ${isDark 
          ? 'bg-zinc-900 border border-zinc-800 shadow-zinc-950/80' 
          : 'bg-white border border-zinc-200 shadow-zinc-400/20'
        }
      `}>
        {studioContent}
      </div>
      
      {strandPickerModal}
    </div>
  )
}

