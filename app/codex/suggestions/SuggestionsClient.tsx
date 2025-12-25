'use client'

/**
 * Study Suggestions Client Component
 * @module codex/suggestions
 * 
 * Generates and displays personalized learning suggestions using
 * both static NLP and LLM-powered generation.
 */

import React, { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { 
  Lightbulb, 
  ArrowLeft, 
  RefreshCw, 
  Sparkles,
  Brain,
  Compass,
  Target,
  Link2,
  Filter,
  X,
  Loader2,
  CheckCircle2,
  Info
} from 'lucide-react'
import { usePreferences } from '@/components/codex/hooks/usePreferences'
import { REPO_CONFIG } from '@/components/codex/constants'

interface Suggestion {
  text: string
  category: 'clarification' | 'exploration' | 'application' | 'connection'
  relatedTopics?: string[]
}

interface GenerationResult {
  items: Suggestion[]
  source: 'static' | 'llm' | 'hybrid'
  metadata: {
    processingTime: number
    nlpConfidence: number
    llmUsed: boolean
  }
}

const CATEGORY_CONFIG = {
  clarification: {
    icon: Brain,
    label: 'Clarification',
    description: 'Questions to verify understanding',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
  },
  exploration: {
    icon: Compass,
    label: 'Exploration',
    description: 'Questions for deeper investigation',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/20',
  },
  application: {
    icon: Target,
    label: 'Application',
    description: 'Real-world use cases',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
  },
  connection: {
    icon: Link2,
    label: 'Connection',
    description: 'Links to related topics',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
  },
}

export default function SuggestionsClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { preferences } = usePreferences()
  
  const strandPath = searchParams.get('strand')
  
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [metadata, setMetadata] = useState<GenerationResult['metadata'] | null>(null)
  const [source, setSource] = useState<'static' | 'llm' | 'hybrid'>('static')
  const [useLLM, setUseLLM] = useState(false)
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [content, setContent] = useState<string>('')
  const [strandTitle, setStrandTitle] = useState<string>('')
  
  const isDark = preferences.theme?.includes('dark')

  // Fetch strand content
  const fetchContent = useCallback(async () => {
    if (!strandPath) return
    
    try {
      const res = await fetch(`https://raw.githubusercontent.com/${REPO_CONFIG.OWNER}/${REPO_CONFIG.NAME}/${REPO_CONFIG.BRANCH}/${strandPath}`)
      if (res.ok) {
        const text = await res.text()
        setContent(text)
        
        // Extract title from frontmatter or first heading
        const titleMatch = text.match(/^#\s+(.+)$/m) || text.match(/title:\s*['"]?([^'"\n]+)['"]?/m)
        if (titleMatch) {
          setStrandTitle(titleMatch[1])
        }
      }
    } catch (err) {
      console.error('Failed to fetch content:', err)
    }
  }, [strandPath])

  // Generate suggestions
  const generateSuggestions = useCallback(async () => {
    if (!content) return
    
    setLoading(true)
    setError(null)
    
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'suggestions',
          content,
          strandSlug: strandPath,
          title: strandTitle,
          useLLM,
          maxItems: 12,
        }),
      })
      
      if (!res.ok) {
        throw new Error('Failed to generate suggestions')
      }
      
      const data = await res.json() as GenerationResult & { success: boolean }
      
      if (data.success) {
        setSuggestions(data.items)
        setMetadata(data.metadata)
        setSource(data.source)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setLoading(false)
    }
  }, [content, strandPath, strandTitle, useLLM])

  // Fetch content on mount
  useEffect(() => {
    fetchContent()
  }, [fetchContent])

  // Generate when content is loaded
  useEffect(() => {
    if (content) {
      generateSuggestions()
    }
  }, [content, generateSuggestions])

  // Toggle filter
  const toggleFilter = (category: string) => {
    setActiveFilters(prev => 
      prev.includes(category) 
        ? prev.filter(f => f !== category)
        : [...prev, category]
    )
  }

  // Filter suggestions
  const filteredSuggestions = activeFilters.length > 0
    ? suggestions.filter(s => activeFilters.includes(s.category))
    : suggestions

  return (
    <div className={`min-h-screen ${isDark ? 'bg-zinc-900 text-white' : 'bg-zinc-50 text-zinc-900'}`}>
      {/* Header */}
      <header className={`sticky top-0 z-10 backdrop-blur-sm border-b ${isDark ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white/80 border-zinc-200'}`}>
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href={strandPath ? `/codex/${strandPath.replace('.md', '')}` : '/codex/'}
                className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}`}
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-semibold flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-amber-500" />
                  Study Suggestions
                </h1>
                {strandTitle && (
                  <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                    for "{strandTitle}"
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setUseLLM(!useLLM)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  useLLM 
                    ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30' 
                    : isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-600'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                {useLLM ? 'AI Enhanced' : 'AI Off'}
              </button>
              
              <button
                onClick={generateSuggestions}
                disabled={loading || !content}
                className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'} disabled:opacity-50`}
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <Filter className={`w-4 h-4 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
          {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
            const Icon = config.icon
            const isActive = activeFilters.includes(key)
            return (
              <button
                key={key}
                onClick={() => toggleFilter(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors border ${
                  isActive 
                    ? `${config.bgColor} ${config.color} ${config.borderColor}` 
                    : isDark 
                      ? 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-600' 
                      : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {config.label}
                {isActive && <X className="w-3 h-3 ml-1" />}
              </button>
            )
          })}
        </div>

        {/* Status */}
        {metadata && (
          <div className={`flex items-center gap-4 mb-6 text-sm ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              {filteredSuggestions.length} suggestions
            </span>
            <span>
              Generated via {source === 'hybrid' ? 'NLP + AI' : source === 'llm' ? 'AI' : 'NLP'}
            </span>
            <span>
              {metadata.processingTime}ms
            </span>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className={`p-4 rounded-lg border ${isDark ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-red-50 border-red-200 text-red-600'}`}>
            <p>{error}</p>
          </div>
        )}

        {/* No Content */}
        {!content && !loading && (
          <div className="text-center py-12">
            <Info className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`} />
            <p className={isDark ? 'text-zinc-400' : 'text-zinc-600'}>
              No strand selected. Go to a strand and click "Suggest" to get study suggestions.
            </p>
            <Link 
              href="/codex/"
              className="inline-block mt-4 px-4 py-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
            >
              Browse Codex
            </Link>
          </div>
        )}

        {/* Suggestions Grid */}
        {!loading && filteredSuggestions.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            <AnimatePresence mode="popLayout">
              {filteredSuggestions.map((suggestion, index) => {
                const config = CATEGORY_CONFIG[suggestion.category] || CATEGORY_CONFIG.clarification
                const Icon = config.icon
                
                return (
                  <motion.div
                    key={`${suggestion.text.slice(0, 20)}-${index}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.05 }}
                    className={`p-4 rounded-xl border transition-colors cursor-pointer group ${
                      isDark 
                        ? 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600' 
                        : 'bg-white border-zinc-200 hover:border-zinc-300 shadow-sm'
                    }`}
                    onClick={() => {
                      // Navigate to Q&A with this question
                      const params = new URLSearchParams()
                      if (strandPath) params.set('strand', strandPath)
                      params.set('q', suggestion.text)
                      router.push(`/codex/search?${params.toString()}`)
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${config.bgColor}`}>
                        <Icon className={`w-4 h-4 ${config.color}`} />
                      </div>
                      <div className="flex-1">
                        <p className={`font-medium ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                          {suggestion.text}
                        </p>
                        <p className={`text-xs mt-1 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                          {config.description}
                        </p>
                        {suggestion.relatedTopics && suggestion.relatedTopics.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {suggestion.relatedTopics.slice(0, 3).map(topic => (
                              <span 
                                key={topic}
                                className={`px-2 py-0.5 rounded text-xs ${
                                  isDark ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-100 text-zinc-600'
                                }`}
                              >
                                {topic}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  )
}

