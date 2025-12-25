/**
 * Suggested Questions - Dynamic NLP-Generated Questions
 * @module codex/ui/SuggestedQuestions
 * 
 * @remarks
 * Generates questions dynamically per strand using NLP analysis:
 * - Extracts keywords and entities from content
 * - Creates contextual questions based on content type
 * - Analyzes headings for topic-based questions
 * - No static JSON - everything generated on the fly
 */

'use client'

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, TrendingUp, BookOpen, Zap, RefreshCw, HelpCircle, Lightbulb, Code, Layers, ArrowRight } from 'lucide-react'

interface SuggestedQuestionsProps {
  /** Current strand context (file path) */
  currentStrand?: string
  /** Actual content of the strand for NLP analysis */
  strandContent?: string
  /** Callback when a question is selected */
  onSelectQuestion: (question: string) => void
  /** Theme */
  theme?: string
  /** Maximum questions to show */
  maxQuestions?: number
}

interface GeneratedQuestion {
  text: string
  type: 'definition' | 'comparison' | 'application' | 'exploration' | 'code' | 'concept'
  confidence: number
  source: string // What generated this (keyword, heading, entity, etc.)
}

// Stop words to filter out
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
  'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
  'this', 'that', 'these', 'those', 'it', 'its', 'i', 'you', 'he', 'she', 'we', 'they',
  'what', 'which', 'who', 'how', 'when', 'where', 'why', 'all', 'each', 'some', 'any',
  'more', 'most', 'other', 'into', 'over', 'such', 'no', 'not', 'only', 'same', 'so',
  'than', 'too', 'very', 'just', 'also', 'now', 'here', 'there', 'can', 'use', 'using',
])

// Tech entity patterns
const TECH_PATTERNS = {
  languages: /\b(JavaScript|TypeScript|Python|Rust|Go|Java|C\+\+|Ruby|PHP|Swift|Kotlin|SQL)\b/gi,
  frameworks: /\b(React|Vue|Angular|Next\.?js|Node\.?js|Express|Django|FastAPI|Spring|TensorFlow|PyTorch)\b/gi,
  concepts: /\b(API|REST|GraphQL|database|algorithm|function|component|module|class|interface|type|schema)\b/gi,
}

/**
 * Extract keywords from content using simple TF-like scoring
 */
function extractKeywords(content: string, limit = 10): string[] {
  const words = content
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !STOP_WORDS.has(w))
  
  const freq: Record<string, number> = {}
  for (const word of words) {
    freq[word] = (freq[word] || 0) + 1
  }
  
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word)
}

/**
 * Extract headings from markdown
 */
function extractHeadings(content: string): string[] {
  const headingPattern = /^#{1,3}\s+(.+)$/gm
  const headings: string[] = []
  let match
  while ((match = headingPattern.exec(content)) !== null) {
    headings.push(match[1].trim())
  }
  return headings
}

/**
 * Extract tech entities
 */
function extractTechEntities(content: string): string[] {
  const entities = new Set<string>()
  for (const pattern of Object.values(TECH_PATTERNS)) {
    const matches = content.matchAll(pattern)
    for (const match of matches) {
      entities.add(match[0])
    }
  }
  return Array.from(entities)
}

/**
 * Check if content has code blocks
 */
function hasCodeBlocks(content: string): boolean {
  return /```[\s\S]*?```/.test(content)
}

/**
 * Generate questions from content using NLP heuristics
 */
function generateQuestionsFromContent(content: string, strandPath?: string): GeneratedQuestion[] {
  if (!content || content.length < 100) return []
  
  const questions: GeneratedQuestion[] = []
  const keywords = extractKeywords(content, 15)
  const headings = extractHeadings(content)
  const techEntities = extractTechEntities(content)
  const hasCode = hasCodeBlocks(content)
  
  // Extract strand name for context
  const strandName = strandPath?.split('/').pop()?.replace('.md', '').replace(/-/g, ' ') || 'this topic'
  
  // 1. Questions from headings (high confidence)
  for (const heading of headings.slice(0, 3)) {
    // Skip generic headings
    if (/^(introduction|overview|summary|conclusion|references)$/i.test(heading)) continue
    
    questions.push({
      text: `What is ${heading.toLowerCase()}?`,
      type: 'definition',
      confidence: 0.9,
      source: 'heading',
    })
    
    if (heading.toLowerCase().includes('how')) {
      questions.push({
        text: heading.endsWith('?') ? heading : `${heading}?`,
        type: 'application',
        confidence: 0.85,
        source: 'heading',
      })
    }
  }
  
  // 2. Questions from tech entities (high confidence)
  for (const entity of techEntities.slice(0, 4)) {
    questions.push({
      text: `How is ${entity} used in ${strandName}?`,
      type: 'application',
      confidence: 0.85,
      source: 'entity',
    })
  }
  
  // 3. Questions from keywords (medium confidence)
  for (const keyword of keywords.slice(0, 5)) {
    // Skip if already covered by headings or entities
    if (headings.some(h => h.toLowerCase().includes(keyword))) continue
    if (techEntities.some(e => e.toLowerCase() === keyword)) continue
    
    questions.push({
      text: `Can you explain ${keyword} in the context of ${strandName}?`,
      type: 'concept',
      confidence: 0.7,
      source: 'keyword',
    })
  }
  
  // 4. Code-specific questions
  if (hasCode) {
    questions.push({
      text: `Walk me through the code examples in ${strandName}`,
      type: 'code',
      confidence: 0.8,
      source: 'code-detection',
    })
    questions.push({
      text: `What are the key implementation details shown in the code?`,
      type: 'code',
      confidence: 0.75,
      source: 'code-detection',
    })
  }
  
  // 5. Comparison questions (if multiple entities)
  if (techEntities.length >= 2) {
    const [first, second] = techEntities
    questions.push({
      text: `How does ${first} compare to ${second} in this context?`,
      type: 'comparison',
      confidence: 0.7,
      source: 'entity-comparison',
    })
  }
  
  // 6. Exploration questions
  questions.push({
    text: `What are the key takeaways from ${strandName}?`,
    type: 'exploration',
    confidence: 0.65,
    source: 'generic',
  })
  
  questions.push({
    text: `What should I learn next after understanding ${strandName}?`,
    type: 'exploration',
    confidence: 0.6,
    source: 'generic',
  })
  
  // Sort by confidence and dedupe
  const seen = new Set<string>()
  return questions
    .sort((a, b) => b.confidence - a.confidence)
    .filter(q => {
      const key = q.text.toLowerCase().slice(0, 30)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

const TYPE_CONFIG: Record<GeneratedQuestion['type'], { icon: React.ElementType; color: string }> = {
  definition: { icon: BookOpen, color: 'text-blue-500' },
  comparison: { icon: Layers, color: 'text-purple-500' },
  application: { icon: Zap, color: 'text-amber-500' },
  exploration: { icon: Lightbulb, color: 'text-emerald-500' },
  code: { icon: Code, color: 'text-cyan-500' },
  concept: { icon: HelpCircle, color: 'text-rose-500' },
}

/**
 * Dynamic question suggestions generated from strand content using NLP
 */
export default function SuggestedQuestions({
  currentStrand,
  strandContent,
  onSelectQuestion,
  theme = 'light',
  maxQuestions = 4,
}: SuggestedQuestionsProps) {
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([])
  const [loading, setLoading] = useState(false)
  const [contentFetched, setContentFetched] = useState(false)
  const [localContent, setLocalContent] = useState<string>('')
  
  const isDark = theme.includes('dark')

  // Use provided content or fetch it
  const content = strandContent || localContent

  // Fetch content if not provided
  useEffect(() => {
    if (strandContent) {
      setLocalContent('')
      setContentFetched(true)
      return
    }
    
    if (!currentStrand) {
      setContentFetched(true)
      return
    }
    
    const fetchContent = async () => {
      setLoading(true)
      try {
        const res = await fetch(`https://raw.githubusercontent.com/rfrramersai/codex/main/${currentStrand}`)
        if (res.ok) {
          const text = await res.text()
          setLocalContent(text)
        }
      } catch (err) {
        console.warn('[SuggestedQuestions] Failed to fetch content:', err)
      } finally {
        setContentFetched(true)
        setLoading(false)
      }
    }
    
    fetchContent()
  }, [currentStrand, strandContent])

  // Generate questions when content changes
  useEffect(() => {
    if (!contentFetched) return
    
    setLoading(true)
    
    // Use setTimeout to not block UI
    const timer = setTimeout(() => {
      const generated = generateQuestionsFromContent(content, currentStrand)
      setQuestions(generated.slice(0, maxQuestions))
      setLoading(false)
    }, 50)
    
    return () => clearTimeout(timer)
  }, [content, currentStrand, contentFetched, maxQuestions])

  // Regenerate questions
  const regenerate = useCallback(() => {
    setLoading(true)
    setTimeout(() => {
      // Shuffle and regenerate
      const generated = generateQuestionsFromContent(content, currentStrand)
      // Take different questions this time by shuffling
      const shuffled = generated.sort(() => Math.random() - 0.5)
      setQuestions(shuffled.slice(0, maxQuestions))
      setLoading(false)
    }, 100)
  }, [content, currentStrand, maxQuestions])

  if (loading && questions.length === 0) {
    return (
      <div className="mt-4">
        <p className="text-xs font-medium opacity-70 mb-2">Generating questions...</p>
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`p-3 rounded-lg animate-pulse ${isDark ? 'bg-gray-800/50' : 'bg-gray-100/50'}`}
            >
              <div className="h-4 w-3/4 rounded bg-gray-300 dark:bg-gray-700" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="mt-4">
        <p className="text-xs font-medium opacity-50">
          {currentStrand ? 'Unable to generate questions for this strand' : 'Select a strand to see suggested questions'}
        </p>
      </div>
    )
  }

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium opacity-70 flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-emerald-500" />
          Generated from content:
        </p>
        <button
          onClick={regenerate}
          disabled={loading}
          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          title="Generate different questions"
        >
          <RefreshCw className={`w-3 h-3 opacity-50 hover:opacity-100 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        {questions.map((question, idx) => {
          const config = TYPE_CONFIG[question.type]
          const Icon = config.icon
          
          return (
            <motion.button
              key={`${question.text.slice(0, 20)}-${idx}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => onSelectQuestion(question.text)}
              className={`
                relative p-3 rounded-lg text-left text-sm
                transition-all hover:scale-[1.02] active:scale-[0.98]
                ${isDark 
                  ? 'bg-gray-800/50 hover:bg-gray-700/50' 
                  : 'bg-gray-100/50 hover:bg-gray-200/50'
                }
                ring-1 ring-transparent hover:ring-emerald-500/30
              `}
            >
              <div className="flex items-start gap-2">
                <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${config.color}`} />
                <span className="line-clamp-2 flex-1">{question.text}</span>
              </div>

              {/* Confidence indicator */}
              <div className="mt-2 flex items-center gap-2">
                <div className={`h-1 flex-1 rounded-full overflow-hidden ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                  <div 
                    className="h-full bg-emerald-500/50 rounded-full"
                    style={{ width: `${question.confidence * 100}%` }}
                  />
                </div>
                <span className={`text-[9px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  {question.source}
                </span>
              </div>
            </motion.button>
          )
        })}
      </div>
      
      {/* Show more button */}
      {questions.length >= maxQuestions && (
        <button
          onClick={regenerate}
          className={`mt-2 w-full py-2 text-xs flex items-center justify-center gap-1 rounded-lg transition-colors ${
            isDark ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          <ArrowRight className="w-3 h-3" />
          More questions
        </button>
      )}
    </div>
  )
}
