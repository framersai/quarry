'use client'

/**
 * Unified Ask Interface - The Ultimate Knowledge Discovery Experience
 * @module codex/ui/UnifiedAskInterface
 * 
 * @description
 * Consolidates QAInterface + AskTab into one SUPER ADVANCED interface:
 * - Local on-device semantic/lexical search (transformers.js)
 * - LLM-powered conversational AI (Claude, OpenAI, Ollama)
 * - Hybrid mode combining both
 * - Beautiful TUI with tabs, voice input, TTS, suggested questions
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Brain, Cpu, Send, Loader2, StopCircle, Trash2,
  Sparkles, MessageSquare, Wifi, WifiOff, AlertCircle,
  ChevronDown, ChevronRight, HelpCircle, Zap, Clock, Check, Info,
  Settings2, Volume2, VolumeX, Mic, MicOff, Copy,
  ExternalLink, Search, Filter, BookOpen, Layers, FileText,
  XCircle, RefreshCw, Globe, Server, Terminal
} from 'lucide-react'
import { useStream } from '@/lib/llm/useStream'
import { isLLMAvailable, llm } from '@/lib/llm'
import StreamingText from './StreamingText'
import AskNavIcon from './AskNavIcon'
import VoiceInput from './VoiceInput'
import SuggestedQuestions from './SuggestedQuestions'
import AnswerCard from './AnswerCard'
import SemanticSearchInfoPopover from './SemanticSearchInfoPopover'
import QAContextSelector, { type ContextScope, type ContextFilters } from './QAContextSelector'
import type { BackendStatus } from '@/lib/search/embeddingEngine'
import { SemanticSearchEngine, type SearchResult } from '@/lib/search/semanticSearch'
import { getSearchEngine } from '@/lib/search/engine'
import type { CodexSearchResult } from '@/lib/search/types'
import { useTextToSpeech } from '../hooks/useTextToSpeech'
import { useToast } from './Toast'
import { useModalAccessibility } from '../hooks/useModalAccessibility'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export type AskMode = 'brain' | 'cloud' | 'hybrid'
export type SearchMode = 'semantic' | 'lexical' | 'auto'

interface Conversation {
  id: string
  question: string
  answer: string
  confidence: number
  sources: SearchResult[]
  timestamp: Date
  mode: AskMode
  isStreaming?: boolean
  latency?: number
}

export interface UnifiedAskInterfaceProps {
  isOpen: boolean
  onClose: () => void
  currentStrand?: string
  strandContent?: string
  strandTitle?: string
  theme?: string
  onSemanticStatusChange?: (status: 'ready' | 'degraded' | 'offline', message?: string) => void
  availableWeaves?: string[]
  availableLooms?: string[]
  availableTags?: string[]
  availableSubjects?: string[]
  availableTopics?: string[]
  totalStrands?: number
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPER FUNCTIONS
═══════════════════════════════════════════════════════════════════════════ */

function generateId(): string {
  return `ask-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function buildLexicalAnswer(question: string, results: CodexSearchResult[]): string {
  if (!results.length) return 'No matching documents found.'
  
  const headline = results[0]
  const summaryLines = [
    `**${headline.title}**`,
    headline.summary || 'No summary available.',
    '',
  ]

  const related = results.slice(1, 4)
  if (related.length > 0) {
    summaryLines.push('**Related:**')
    related.forEach((entry) => {
      summaryLines.push(`• ${entry.title}`)
    })
  }

  return summaryLines.join('\n')
}

/* ═══════════════════════════════════════════════════════════════════════════
   MODE TAB COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

interface ModeTabProps {
  mode: AskMode
  onModeChange: (mode: AskMode) => void
  llmAvailable: boolean
  localReady: boolean
  localLoading: boolean
  isDark: boolean
  backendStatus: BackendStatus | null
}

function ModeTabs({
  mode,
  onModeChange,
  llmAvailable,
  localReady,
  localLoading,
  isDark,
  backendStatus,
}: ModeTabProps) {
  const tabs: { id: AskMode; label: string; icon: typeof Brain; desc: string; requiresLLM?: boolean }[] = [
    { 
      id: 'brain', 
      label: 'Brain', 
      icon: Brain,
      desc: 'On-device semantic search',
    },
    { 
      id: 'hybrid', 
      label: 'Hybrid', 
      icon: Sparkles,
      desc: 'Local + Cloud enhance',
      requiresLLM: true,
    },
    { 
      id: 'cloud', 
      label: 'Cloud AI', 
      icon: Globe,
      desc: llmAvailable ? 'Claude / GPT / Ollama' : 'No API key',
      requiresLLM: true,
    },
  ]

  return (
    <div className={`flex rounded-xl p-1 ${isDark ? 'bg-zinc-800/80' : 'bg-zinc-100'}`}>
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = mode === tab.id
        const isLLMDisabled = tab.requiresLLM && !llmAvailable
        const isLocalDisabled = tab.id === 'brain' && !localReady && !localLoading
        const isDisabled = isLLMDisabled || isLocalDisabled
        
        return (
          <button
            key={tab.id}
            onClick={() => !isDisabled && onModeChange(tab.id)}
            disabled={isDisabled}
            title={isLLMDisabled ? 'Configure API keys in Settings' : undefined}
            className={`
              relative flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg transition-all
              ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
              ${isActive
                ? isDark
                  ? 'bg-gradient-to-br from-violet-600 via-purple-600 to-cyan-600 text-white shadow-lg shadow-purple-500/25'
                  : 'bg-gradient-to-br from-violet-500 via-purple-500 to-cyan-500 text-white shadow-md'
                : isDark
                  ? 'text-zinc-400 hover:text-white hover:bg-zinc-700/50'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/50'
              }
            `}
          >
            <Icon className="w-5 h-5" />
            <div className="flex flex-col items-start">
              <span className="text-sm font-bold">{tab.label}</span>
              <span className={`text-[10px] ${isActive ? 'text-white/80' : isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                {tab.desc}
              </span>
            </div>
            
            {/* Status dot */}
            <span className={`absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full ring-2 ${
              isActive ? 'ring-white/30' : isDark ? 'ring-zinc-800' : 'ring-zinc-100'
            } ${
              tab.id === 'brain'
                ? localReady 
                  ? 'bg-emerald-400 shadow-lg shadow-emerald-400/50' 
                  : localLoading 
                    ? 'bg-amber-400 animate-pulse shadow-lg shadow-amber-400/50'
                    : 'bg-zinc-400'
                : tab.requiresLLM
                  ? llmAvailable 
                    ? 'bg-emerald-400 shadow-lg shadow-emerald-400/50' 
                    : 'bg-rose-400 shadow-lg shadow-rose-400/50'
                  : 'bg-zinc-400'
            }`} />
          </button>
        )
      })}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   SEARCH MODE TOGGLE
═══════════════════════════════════════════════════════════════════════════ */

interface SearchModeToggleProps {
  searchMode: SearchMode
  onSearchModeChange: (mode: SearchMode) => void
  semanticAvailable: boolean
  isDark: boolean
}

function SearchModeToggle({ searchMode, onSearchModeChange, semanticAvailable, isDark }: SearchModeToggleProps) {
  return (
    <div className="flex items-center gap-2">
      <span className={`text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>Search:</span>
      <div className={`flex rounded-lg p-0.5 ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
        <button
          onClick={() => onSearchModeChange('semantic')}
          disabled={!semanticAvailable}
          className={`
            px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5
            ${searchMode === 'semantic'
              ? 'bg-purple-500 text-white shadow-sm'
              : isDark
                ? 'text-zinc-400 hover:text-white'
                : 'text-zinc-600 hover:text-zinc-900'
            }
            ${!semanticAvailable ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <Sparkles className="w-3 h-3" />
          Semantic
        </button>
        <button
          onClick={() => onSearchModeChange('lexical')}
          className={`
            px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5
            ${searchMode === 'lexical'
              ? 'bg-amber-500 text-white shadow-sm'
              : isDark
                ? 'text-zinc-400 hover:text-white'
                : 'text-zinc-600 hover:text-zinc-900'
            }
          `}
        >
          <Search className="w-3 h-3" />
          Lexical
        </button>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONVERSATION MESSAGE
═══════════════════════════════════════════════════════════════════════════ */

interface MessageProps {
  conversation: Conversation
  isDark: boolean
  onReadAloud?: (text: string) => void
  onStopReading?: () => void
  isSpeaking?: boolean
  ttsSupported?: boolean
}

function ConversationMessage({
  conversation,
  isDark,
  onReadAloud,
  onStopReading,
  isSpeaking,
  ttsSupported,
}: MessageProps) {
  const getModeIcon = () => {
    switch (conversation.mode) {
      case 'brain': return <Brain className="w-4 h-4" />
      case 'cloud': return <Globe className="w-4 h-4" />
      case 'hybrid': return <Sparkles className="w-4 h-4" />
    }
  }
  
  const getModeColor = () => {
    switch (conversation.mode) {
      case 'brain': return 'from-purple-500 to-violet-600'
      case 'cloud': return 'from-cyan-500 to-blue-600'
      case 'hybrid': return 'from-amber-500 to-orange-600'
    }
  }

  return (
    <AnswerCard
      question={conversation.question}
      answer={conversation.answer}
      confidence={conversation.confidence}
      sources={conversation.sources}
      timestamp={conversation.timestamp}
      theme={isDark ? 'dark' : 'light'}
      onReadAloud={onReadAloud}
      onStopReading={onStopReading}
      isSpeaking={isSpeaking}
      ttsSupported={ttsSupported}
    />
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function UnifiedAskInterface({
  isOpen,
  onClose,
  currentStrand,
  strandContent = '',
  strandTitle,
  theme = 'dark',
  onSemanticStatusChange,
  availableWeaves = [],
  availableLooms = [],
  availableTags = [],
  availableSubjects = [],
  availableTopics = [],
  totalStrands = 0,
}: UnifiedAskInterfaceProps) {
  const isDark = theme.includes('dark')
  const isTerminal = theme.includes('terminal')
  const isSepia = theme.includes('sepia')
  
  // Mode state
  const [mode, setMode] = useState<AskMode>('brain')
  const [searchMode, setSearchMode] = useState<SearchMode>('semantic')
  
  // Input state
  const [question, setQuestion] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [showVoiceInput, setShowVoiceInput] = useState(false)
  
  // Conversations
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [speakingConversationId, setSpeakingConversationId] = useState<string | null>(null)
  
  // Semantic engine
  const [searchEngine, setSearchEngine] = useState<SemanticSearchEngine | null>(null)
  const [backendStatus, setBackendStatus] = useState<BackendStatus | null>(null)
  const [localReady, setLocalReady] = useState(false)
  const [localLoading, setLocalLoading] = useState(false)
  const [initProgress, setInitProgress] = useState<{ message: string; percent: number } | null>(null)
  const [initAttempted, setInitAttempted] = useState(false)
  
  // LLM state
  const [llmAvailable, setLLMAvailable] = useState(false)
  const [llmError, setLLMError] = useState<string | null>(null)
  
  // Context
  const [contextScope, setContextScope] = useState<ContextScope>(currentStrand ? 'current' : 'all')
  const [contextFilters, setContextFilters] = useState<ContextFilters>({})
  const [showSettings, setShowSettings] = useState(false)
  
  // Refs
  const inputRef = useRef<HTMLInputElement>(null)
  const conversationsRef = useRef<HTMLDivElement>(null)
  
  // Hooks
  const tts = useTextToSpeech()
  const toast = useToast()

  // Accessibility features
  const { backdropRef, contentRef, modalProps, handleBackdropClick } = useModalAccessibility({
    isOpen,
    onClose,
    closeOnEscape: true,
    closeOnClickOutside: true,
    trapFocus: true,
    lockScroll: true,
    modalId: 'unified-ask-interface',
  })

  // LLM streaming
  const { text: streamingText, isStreaming, error: streamError, stream, abort, reset } = useStream({
    system: `You are a knowledgeable AI assistant for FABRIC Codex, a knowledge management system. ${
      strandTitle ? `The user is viewing "${strandTitle}". Context:\n\n${strandContent.slice(0, 4000)}` : ''
    }`,
    onComplete: useCallback((responseText: string) => {
      setConversations(prev => {
        const updated = [...prev]
        const lastIdx = updated.length - 1
        if (updated[lastIdx]?.isStreaming) {
          updated[lastIdx] = {
            ...updated[lastIdx],
            answer: responseText,
            isStreaming: false,
            confidence: 0.9,
          }
        }
        return updated
      })
    }, []),
    onError: useCallback((error: string) => {
      setConversations(prev => {
        const updated = [...prev]
        const lastIdx = updated.length - 1
        if (updated[lastIdx]?.isStreaming) {
          updated[lastIdx] = {
            ...updated[lastIdx],
            answer: `❌ **Error:** ${error}\n\n*Check your API keys in Settings.*`,
            isStreaming: false,
            confidence: 0,
          }
        }
        return updated
      })
    }, []),
  })

  // Update streaming message
  useEffect(() => {
    if (isStreaming && streamingText) {
      setConversations(prev => {
        const updated = [...prev]
        const lastIdx = updated.length - 1
        if (updated[lastIdx]?.isStreaming) {
          updated[lastIdx] = { ...updated[lastIdx], answer: streamingText }
        }
        return updated
      })
    }
  }, [streamingText, isStreaming])

  // Check LLM availability
  useEffect(() => {
    const checkLLM = () => {
      const available = isLLMAvailable()
      setLLMAvailable(available)
      if (!available && (mode === 'cloud' || mode === 'hybrid')) {
        setLLMError('No API keys configured. Go to Settings → API Keys.')
      } else {
        setLLMError(null)
      }
    }
    checkLLM()
    window.addEventListener('api-keys-changed', checkLLM)
    return () => window.removeEventListener('api-keys-changed', checkLLM)
  }, [mode])

  // Initialize semantic search
  useEffect(() => {
    if (isOpen && !searchEngine && !initAttempted) {
      setInitAttempted(true)
      setLocalLoading(true)
      
      const initSearch = async () => {
        try {
          const engine = new SemanticSearchEngine('info')
          await engine.initialize(
            (status: BackendStatus) => {
              setBackendStatus(status)
              if (status.type === 'ort' || status.type === 'transformers') {
                setLocalReady(true)
                setSearchMode('semantic')
                toast.success(`Brain ready! Using ${status.type === 'ort' ? status.deviceInfo : 'Transformers.js'}`)
                onSemanticStatusChange?.('ready')
              } else {
                setSearchMode('lexical')
                onSemanticStatusChange?.('offline', status.reason)
              }
            },
            (message: string, percent?: number) => {
              setInitProgress({ message, percent: percent ?? 0 })
            }
          )
          setSearchEngine(engine)
        } catch (err) {
          console.warn('[UnifiedAsk] Semantic init failed:', err)
          setSearchMode('lexical')
          onSemanticStatusChange?.('offline', 'Model unavailable')
        } finally {
          setLocalLoading(false)
          setInitProgress(null)
        }
      }
      initSearch()
    }
  }, [isOpen, searchEngine, initAttempted, onSemanticStatusChange, toast])

  // Scroll to bottom on new messages
  useEffect(() => {
    conversationsRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [conversations])

  // Focus input when opened
  useEffect(() => {
    if (isOpen) inputRef.current?.focus()
  }, [isOpen])

  // TTS tracking
  useEffect(() => {
    if (!tts.state.speaking && speakingConversationId) {
      setSpeakingConversationId(null)
    }
  }, [tts.state.speaking, speakingConversationId])

  /* ─────────────────────────────────────────────────────────────────────────
     HANDLERS
  ───────────────────────────────────────────────────────────────────────── */

  const handleLocalSearch = useCallback(async (q: string): Promise<Conversation> => {
    const startTime = performance.now()
    
    // Try semantic search first
    if (searchEngine && searchMode !== 'lexical') {
      try {
        const result = await searchEngine.answerQuestion(q)
        return {
          id: generateId(),
          question: q,
          answer: result.answer,
          confidence: result.confidence,
          sources: result.sources,
          timestamp: new Date(),
          mode: 'brain',
          latency: Math.round(performance.now() - startTime),
        }
      } catch (err) {
        console.warn('[UnifiedAsk] Semantic failed, trying lexical:', err)
      }
    }
    
    // Fallback to lexical
    const fallbackEngine = getSearchEngine()
    const results = await fallbackEngine.search(q, { limit: 5, semantic: false })
    const rawScore = results[0]?.combinedScore ?? 0
    const normalizedConfidence = Math.min(1, Math.max(0, rawScore / (rawScore + 5)))
    
    return {
      id: generateId(),
      question: q,
      answer: buildLexicalAnswer(q, results),
      confidence: normalizedConfidence,
      sources: [],
      timestamp: new Date(),
      mode: 'brain',
      latency: Math.round(performance.now() - startTime),
    }
  }, [searchEngine, searchMode])

  const handleCloudSearch = useCallback(async (q: string) => {
    if (!llmAvailable) {
      const errorConv: Conversation = {
        id: generateId(),
        question: q,
        answer: `⚠️ **LLM Not Configured**\n\nNo API keys are set up. Configure at least one provider:\n\n• **OpenAI** - [platform.openai.com](https://platform.openai.com)\n• **Anthropic** - [console.anthropic.com](https://console.anthropic.com)\n• **Ollama** - [ollama.com](https://ollama.com) (free, local)\n\nGo to **Settings → API Keys** to configure.`,
        confidence: 0,
        sources: [],
        timestamp: new Date(),
        mode: 'cloud',
      }
      setConversations(prev => [errorConv, ...prev])
      return
    }

    // Add streaming placeholder
    const streamingConv: Conversation = {
      id: generateId(),
      question: q,
      answer: '',
      confidence: 0,
      sources: [],
      timestamp: new Date(),
      mode: 'cloud',
      isStreaming: true,
    }
    setConversations(prev => [streamingConv, ...prev])

    // Build message history
    const history = conversations
      .filter(c => c.mode === 'cloud' || c.mode === 'hybrid')
      .slice(0, 5)
      .reverse()
      .flatMap(c => [
        { role: 'user' as const, content: c.question },
        { role: 'assistant' as const, content: c.answer },
      ])

    await stream([...history, { role: 'user', content: q }])
  }, [conversations, stream, llmAvailable])

  const handleHybridSearch = useCallback(async (q: string) => {
    // First get local results
    const localResult = await handleLocalSearch(q)
    
    // If high confidence, use local
    if (localResult.confidence > 0.75) {
      setConversations(prev => [{ ...localResult, mode: 'hybrid' }, ...prev])
      return
    }
    
    // Otherwise enhance with LLM
    if (!llmAvailable) {
      setConversations(prev => [{ ...localResult, mode: 'hybrid' }, ...prev])
      toast.info('Local answer shown (LLM unavailable for enhancement)')
      return
    }

    // Add streaming placeholder with local context
    const streamingConv: Conversation = {
      id: generateId(),
      question: q,
      answer: '',
      confidence: 0,
      sources: localResult.sources,
      timestamp: new Date(),
      mode: 'hybrid',
      isStreaming: true,
    }
    setConversations(prev => [streamingConv, ...prev])

    const enhancedPrompt = localResult.confidence > 0.3
      ? `Based on local search (${Math.round(localResult.confidence * 100)}% confidence): "${localResult.answer}"\n\nPlease expand on this: ${q}`
      : q

    await stream([{ role: 'user', content: enhancedPrompt }])
  }, [handleLocalSearch, stream, llmAvailable, toast])

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault()
    const q = question.trim()
    if (!q || isSearching || isStreaming) return

    setQuestion('')
    setIsSearching(true)

    try {
      switch (mode) {
        case 'brain':
          const result = await handleLocalSearch(q)
          setConversations(prev => [result, ...prev])
          break
        case 'cloud':
          await handleCloudSearch(q)
          break
        case 'hybrid':
          await handleHybridSearch(q)
          break
      }
    } catch (err) {
      toast.error('Search failed. Please try again.')
    } finally {
      setIsSearching(false)
    }
  }, [question, isSearching, isStreaming, mode, handleLocalSearch, handleCloudSearch, handleHybridSearch, toast])

  const handleVoiceInput = useCallback((transcript: string) => {
    setQuestion(transcript)
    setShowVoiceInput(false)
    if (transcript.trim().endsWith('?')) {
      setTimeout(() => handleSubmit(), 100)
    }
  }, [handleSubmit])

  const handleReadAloud = useCallback((id: string, text: string) => {
    setSpeakingConversationId(id)
    tts.speak(text)
  }, [tts])

  const handleStopReading = useCallback(() => {
    tts.stop()
    setSpeakingConversationId(null)
  }, [tts])

  const handleClear = useCallback(() => {
    setConversations([])
    reset()
  }, [reset])

  if (!isOpen) return null

  /* ─────────────────────────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────────────────────────── */

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        ref={backdropRef}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-40"
        onClick={handleBackdropClick}
      />

      {/* Panel */}
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed z-50 inset-4 md:inset-auto md:right-4 md:bottom-4 md:left-auto md:top-auto md:w-[min(95vw,780px)] md:h-[min(92vh,900px)] flex flex-col"
      >
        <div
          ref={contentRef}
          {...modalProps}
          className={`
            relative flex flex-col h-full overflow-hidden
            rounded-2xl border shadow-2xl
            ${isTerminal ? 'terminal-frame' : ''}
            ${isDark ? 'bg-zinc-900/95 border-zinc-700/50' : 'bg-white/95 border-zinc-200/50'}
          `}
        >
          {/* ════════════════════════════════════════════════════════════════
             HEADER
          ════════════════════════════════════════════════════════════════ */}
          <div className={`
            shrink-0 px-4 py-3 border-b
            ${isDark ? 'border-zinc-800 bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900' : 'border-zinc-200 bg-gradient-to-r from-zinc-50 via-white to-zinc-50'}
          `}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <AskNavIcon size={44} isActive theme={isDark ? 'dark' : 'light'} />
                  {/* Pulse ring */}
                  <span className="absolute inset-0 rounded-full animate-ping bg-purple-500/20" style={{ animationDuration: '2s' }} />
                </div>
                <div>
                  <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                    Ask the Codex Oracle
                  </h2>
                  <p className={`text-xs flex items-center gap-2 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                    Knowledge discovery engine
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                      mode === 'brain'
                        ? 'bg-purple-500/20 text-purple-400'
                        : mode === 'cloud'
                          ? 'bg-cyan-500/20 text-cyan-400'
                          : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {mode === 'brain' && (backendStatus?.type === 'ort' ? <><Zap className="w-2.5 h-2.5" /> ONNX</> : <><Sparkles className="w-2.5 h-2.5" /> TF.js</>)}
                      {mode === 'cloud' && <><Globe className="w-2.5 h-2.5" /> LLM</>}
                      {mode === 'hybrid' && <><Sparkles className="w-2.5 h-2.5" /> Hybrid</>}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <SemanticSearchInfoPopover status={backendStatus} theme={theme} />
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'}`}
                >
                  <Settings2 className="w-4 h-4" />
                </button>
                <button
                  onClick={handleClear}
                  className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'}`}
                  title="Clear history"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={onClose}
                  className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'}`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════════
             MODE TABS
          ════════════════════════════════════════════════════════════════ */}
          <div className={`shrink-0 px-4 py-3 border-b ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
            <ModeTabs
              mode={mode}
              onModeChange={setMode}
              llmAvailable={llmAvailable}
              localReady={localReady}
              localLoading={localLoading}
              isDark={isDark}
              backendStatus={backendStatus}
            />
            
            {/* LLM Error */}
            {llmError && (mode === 'cloud' || mode === 'hybrid') && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className={`mt-3 flex items-start gap-2 p-3 rounded-lg text-xs ${
                  isDark ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30' : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Cloud AI Unavailable</p>
                  <p className="opacity-80">{llmError}</p>
                </div>
              </motion.div>
            )}
          </div>

          {/* ════════════════════════════════════════════════════════════════
             INIT PROGRESS
          ════════════════════════════════════════════════════════════════ */}
          {initProgress && (
            <div className={`shrink-0 px-4 py-2 border-b ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
              <div className="flex items-center gap-2 text-xs">
                <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                <span className={isDark ? 'text-zinc-400' : 'text-zinc-600'}>{initProgress.message}</span>
                {initProgress.percent > 0 && (
                  <span className="ml-auto font-bold text-purple-500">{Math.round(initProgress.percent)}%</span>
                )}
              </div>
              {initProgress.percent > 0 && (
                <div className={`mt-2 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${initProgress.percent}%` }}
                    className="h-full bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full"
                  />
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
             CONTEXT SELECTOR (always visible)
          ════════════════════════════════════════════════════════════════ */}
          <div className={`shrink-0 px-4 py-3 border-b ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
            {/* Context Selector - Always visible */}
            <QAContextSelector
              scope={contextScope}
              onScopeChange={setContextScope}
              filters={contextFilters}
              onFiltersChange={setContextFilters}
              availableWeaves={availableWeaves}
              availableLooms={availableLooms}
              availableTags={availableTags}
              availableSubjects={availableSubjects}
              availableTopics={availableTopics}
              currentStrand={currentStrand}
              totalStrands={totalStrands}
            />

            {/* Current strand indicator or no-strand message */}
            {contextScope === 'current' && !currentStrand && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mt-3 p-3 rounded-lg text-xs flex items-center gap-2 ${
                  isDark
                    ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <div>
                  <p className="font-semibold">No strand selected</p>
                  <p className="opacity-80">Open a document first, or use &quot;All&quot; or &quot;Filter&quot; to search across your knowledge base.</p>
                </div>
              </motion.div>
            )}

            {contextScope === 'current' && currentStrand && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`mt-2 text-xs flex items-center gap-2 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="truncate font-medium">{strandTitle || currentStrand}</span>
              </motion.div>
            )}
          </div>

          {/* ════════════════════════════════════════════════════════════════
             ADVANCED SETTINGS (collapsible)
          ════════════════════════════════════════════════════════════════ */}
          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className={`shrink-0 overflow-hidden border-b ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}
              >
                <div className="p-4 space-y-4">
                  {/* Search Mode Toggle */}
                  {mode === 'brain' && (
                    <SearchModeToggle
                      searchMode={searchMode}
                      onSearchModeChange={setSearchMode}
                      semanticAvailable={!!searchEngine}
                      isDark={isDark}
                    />
                  )}

                  {/* Help Section */}
                  <details className={`rounded-lg ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-100'}`}>
                    <summary className={`cursor-pointer px-3 py-2 text-xs font-semibold flex items-center gap-2 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                      <HelpCircle className="w-3.5 h-3.5" />
                      How Ask Works
                    </summary>
                    <div className={`px-3 pb-3 pt-1 text-xs space-y-2 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                      <p><strong>Current:</strong> Ask questions about the currently open document only.</p>
                      <p><strong>All:</strong> Search your entire knowledge base ({totalStrands} strands).</p>
                      <p><strong>Filter:</strong> Select specific weaves, looms, or tags to narrow your search.</p>
                      <p className="pt-1 border-t border-zinc-700/30">
                        <strong>Tip:</strong> Use filters when you want to ask about a specific topic area without searching everything.
                      </p>
                    </div>
                  </details>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ════════════════════════════════════════════════════════════════
             INPUT
          ════════════════════════════════════════════════════════════════ */}
          <div className={`shrink-0 p-4 border-b ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className={`
                flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all
                ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}
                ${isSearching || isStreaming ? 'ring-2 ring-purple-500 shadow-lg shadow-purple-500/20' : ''}
              `}>
                <Search className={`w-5 h-5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
                <input
                  ref={inputRef}
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder={
                    mode === 'brain'
                      ? 'Ask the Oracle (on-device)...'
                      : mode === 'cloud'
                        ? 'Ask Cloud AI...'
                        : 'Ask anything (hybrid)...'
                  }
                  disabled={isSearching || isStreaming}
                  className={`flex-1 bg-transparent outline-none text-[16px] sm:text-sm ${isDark ? 'text-white placeholder-zinc-500' : 'text-zinc-900 placeholder-zinc-400'}`}
                />
                
                {/* Voice */}
                <button
                  type="button"
                  onClick={() => setShowVoiceInput(true)}
                  disabled={isSearching || isStreaming}
                  className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-200 text-zinc-500'}`}
                >
                  <Mic className="w-4 h-4" />
                </button>
                
                {/* Clear */}
                {question && (
                  <button
                    type="button"
                    onClick={() => setQuestion('')}
                    className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-200 text-zinc-500'}`}
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
                
                {/* Submit / Stop */}
                {isStreaming ? (
                  <button
                    type="button"
                    onClick={abort}
                    className="px-3 py-2 rounded-lg bg-rose-500 hover:bg-rose-600 text-white transition-colors"
                  >
                    <StopCircle className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!question.trim() || isSearching}
                    className={`
                      px-4 py-2 rounded-lg font-semibold text-sm transition-all
                      ${question.trim() && !isSearching
                        ? 'bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 text-white shadow-lg shadow-purple-500/25'
                        : isDark
                          ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                          : 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                      }
                    `}
                  >
                    {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                )}
              </div>
              
              {/* Character count */}
              <div className={`text-[10px] text-right ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
                {question.length} / 500
              </div>
            </form>

            {/* Suggested Questions */}
            <SuggestedQuestions
              currentStrand={currentStrand}
              strandContent={strandContent}
              onSelectQuestion={setQuestion}
              theme={theme}
              maxQuestions={4}
            />
          </div>

          {/* ════════════════════════════════════════════════════════════════
             CONVERSATIONS
          ════════════════════════════════════════════════════════════════ */}
          <div ref={conversationsRef} className="flex-1 min-h-[300px] overflow-y-auto p-4 space-y-4">
            <AnimatePresence>
              {conversations.map((conv, idx) => (
                <motion.div
                  key={conv.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: Math.min(idx * 0.05, 0.2) }}
                >
                  {conv.isStreaming ? (
                    <div className={`p-4 rounded-xl ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600">
                          <Globe className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm font-medium mb-2 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                            {conv.question}
                          </p>
                          <div className={`prose prose-sm max-w-none ${isDark ? 'prose-invert' : ''}`}>
                            <StreamingText text={conv.answer} isStreaming={true} />
                            <span className="inline-block w-2 h-4 bg-purple-500 animate-pulse ml-1" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <ConversationMessage
                      conversation={conv}
                      isDark={isDark}
                      onReadAloud={(text) => handleReadAloud(conv.id, text)}
                      onStopReading={handleStopReading}
                      isSpeaking={speakingConversationId === conv.id}
                      ttsSupported={tts.isSupported}
                    />
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Empty State */}
            {conversations.length === 0 && !isSearching && !isStreaming && (
              <div className="text-center py-12">
                <div className={`inline-flex p-5 rounded-full mb-4 ${isDark ? 'bg-purple-500/10' : 'bg-purple-100'}`}>
                  <HelpCircle className="w-14 h-14 text-purple-500" />
                </div>
                <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                  No questions yet
                </h3>
                <p className={`max-w-md mx-auto ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  Ask anything about FABRIC Codex! I can explain concepts,
                  find documentation, or guide you through implementations.
                </p>
              </div>
            )}

            {/* Loading State */}
            {isSearching && !isStreaming && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8"
              >
                <div className="inline-flex items-center gap-3">
                  <div className="w-2.5 h-2.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2.5 h-2.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2.5 h-2.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <p className={`mt-4 text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  Searching the knowledge fabric...
                </p>
              </motion.div>
            )}
          </div>

          {/* ════════════════════════════════════════════════════════════════
             FOOTER
          ════════════════════════════════════════════════════════════════ */}
          <div className={`
            shrink-0 px-4 py-3 border-t
            ${isDark ? 'border-zinc-800 bg-zinc-900/80' : 'border-zinc-200 bg-zinc-50'}
          `}>
            <div className="flex items-center justify-between text-xs">
              <div className={`flex items-center gap-2 ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
                <Info className="w-3 h-3" />
                <span>Tip: Ask &quot;how&quot;, &quot;what&quot;, or &quot;why&quot; questions for best results.</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
                  {totalStrands} strands indexed
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Voice Input Modal */}
      {showVoiceInput && (
        <VoiceInput
          isOpen={showVoiceInput}
          onClose={() => setShowVoiceInput(false)}
          onTranscript={handleVoiceInput}
          theme={theme}
        />
      )}
    </AnimatePresence>
  )
}

