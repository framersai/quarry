/**
 * Semantic Search Engine - Natural language search with hybrid backend
 * @module search/semanticSearch
 */

import { HybridEmbeddingEngine, type BackendStatus, type DebugLevel } from './embeddingEngine'

/**
 * Embedding entry in the search index
 */
export interface EmbeddingEntry {
  id: string
  path: string
  title: string
  content: string
  contentType: 'strand' | 'section' | 'paragraph' | 'code'
  embedding: number[]
  metadata: {
    tags?: string[]
    weave?: string
    loom?: string
    lastModified?: string
    language?: string
  }
}

/**
 * Search result with similarity score
 */
export interface SearchResult {
  entry: EmbeddingEntry
  score: number
  snippet: string
  highlights: Array<{ start: number; end: number }>
}

/**
 * Question analysis result
 */
export interface QuestionAnalysis {
  type: 'what' | 'how' | 'why' | 'where' | 'when' | 'who' | 'other'
  intent: 'definition' | 'explanation' | 'guide' | 'location' | 'comparison' | 'other'
  entities: string[]
  constraints: string[]
}

/**
 * Semantic search engine with hybrid ORT/Transformers.js backend
 */
export class SemanticSearchEngine {
  private engine: HybridEmbeddingEngine
  private embeddings: Map<string, EmbeddingEntry> = new Map()
  private initialized = false
  
  constructor(debugLevel?: DebugLevel) {
    this.engine = new HybridEmbeddingEngine({
      debugLevel,
      modelDim: 384,
      maxSeqLength: 512,
    })
  }

  /**
   * Initialize the search engine
   */
  async initialize(
    onStatusChange?: (status: BackendStatus) => void,
    onProgress?: (message: string, percent?: number) => void
  ): Promise<void> {
    if (this.initialized) {
      console.info('[SemanticSearch] ✓ Already initialized, skipping')
      return
    }

    console.info('[SemanticSearch] 🚀 Starting semantic search initialization...')
    console.info('[SemanticSearch] Environment:', {
      ORT_ENABLED: process.env.NEXT_PUBLIC_ENABLE_ORT,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A',
    })

    // Configure callbacks
    this.engine = new HybridEmbeddingEngine({
      debugLevel: 'verbose', // More verbose for debugging
      modelDim: 384,
      maxSeqLength: 512,
      onStatusChange: (status) => {
        console.info('[SemanticSearch] Backend status changed:', status)
        onStatusChange?.(status)
      },
      onProgress: (message, percent) => {
        console.info(`[SemanticSearch] Progress: ${message} (${percent ?? '?'}%)`)
        onProgress?.(message, percent)
      },
    })

    // Initialize backend
    console.info('[SemanticSearch] Calling engine.initialize()...')
    const status = await this.engine.initialize()
    console.info('[SemanticSearch] Engine initialized with status:', status)
    
    // Load pre-computed embeddings
    console.info('[SemanticSearch] Loading pre-computed embeddings...')
    await this.loadEmbeddings()
    
    this.initialized = true
    console.info('[SemanticSearch] ✅ Initialization complete')

    // Throw if no backend available (caller can catch and show UI message)
    if (status.type === 'none') {
      console.error('[SemanticSearch] ❌ No backend available:', status.reason)
      throw new Error('SEMANTIC_MODEL_UNAVAILABLE')
    }
  }

  /**
   * Load pre-computed embeddings from index
   */
  private async loadEmbeddings(): Promise<void> {
    const embeddingsUrl = '/codex-embeddings.json'
    console.info(`[SemanticSearch] Fetching embeddings from: ${embeddingsUrl}`)
    
    try {
      const response = await fetch(embeddingsUrl)
      console.info(`[SemanticSearch] Embeddings fetch response: ${response.status} ${response.statusText}`)
      
      if (!response.ok) {
        console.warn('[SemanticSearch] ⚠️ No pre-computed embeddings found (HTTP', response.status, ')')
        console.info('[SemanticSearch] This is expected if embeddings have not been generated yet.')
        console.info('[SemanticSearch] To generate embeddings, run: pnpm run generate-embeddings')
        return
      }
      
      const data = await response.json()
      console.info('[SemanticSearch] Embeddings data structure:', {
        hasEmbeddings: !!data.embeddings,
        isArray: Array.isArray(data.embeddings),
        count: data.embeddings?.length ?? 0,
        sampleKeys: data.embeddings?.[0] ? Object.keys(data.embeddings[0]) : [],
      })
      
      if (!data.embeddings || !Array.isArray(data.embeddings)) {
        console.warn('[SemanticSearch] Invalid embeddings format, expected { embeddings: [...] }')
        return
      }
      
      for (const entry of data.embeddings) {
        if (entry.id && entry.embedding) {
          this.embeddings.set(entry.id, entry)
        }
      }
      
      console.info(`[SemanticSearch] ✅ Loaded ${this.embeddings.size} pre-computed embeddings`)
    } catch (error) {
      console.warn('[SemanticSearch] ❌ Failed to load embeddings:', error)
      console.info('[SemanticSearch] Semantic search will work but may be slower without pre-computed embeddings')
    }
  }

  /**
   * Analyze a natural language question
   */
  analyzeQuestion(question: string): QuestionAnalysis {
    const lower = question.toLowerCase()
    
    // Determine question type
    let type: QuestionAnalysis['type'] = 'other'
    if (lower.startsWith('what')) type = 'what'
    else if (lower.startsWith('how')) type = 'how'
    else if (lower.startsWith('why')) type = 'why'
    else if (lower.startsWith('where')) type = 'where'
    else if (lower.startsWith('when')) type = 'when'
    else if (lower.startsWith('who')) type = 'who'
    
    // Determine intent
    let intent: QuestionAnalysis['intent'] = 'other'
    if (lower.includes('is') || lower.includes('are') || lower.includes('definition')) {
      intent = 'definition'
    } else if (lower.includes('work') || lower.includes('explain') || lower.includes('understand')) {
      intent = 'explanation'
    } else if (lower.includes('implement') || lower.includes('create') || lower.includes('build')) {
      intent = 'guide'
    } else if (lower.includes('location') || lower.includes('find') || lower.includes('where')) {
      intent = 'location'
    } else if (lower.includes('difference') || lower.includes('compare') || lower.includes('vs')) {
      intent = 'comparison'
    }
    
    // Extract entities (simplified - in production use NER)
    const entities: string[] = []
    const words = question.split(/\s+/)
    for (let i = 0; i < words.length; i++) {
      const word = words[i]
      // Look for capitalized words, technical terms
      if (word[0] === word[0].toUpperCase() && word.length > 2) {
        entities.push(word)
      }
      // Common technical terms
      if (['api', 'authentication', 'component', 'hook', 'state', 'props'].includes(word.toLowerCase())) {
        entities.push(word)
      }
    }
    
    // Extract constraints
    const constraints: string[] = []
    if (lower.includes('typescript')) constraints.push('typescript')
    if (lower.includes('example')) constraints.push('with-examples')
    if (lower.includes('production')) constraints.push('production-ready')
    
    return { type, intent, entities, constraints }
  }

  /**
   * Embed a text query into vector space
   */
  async embedText(text: string): Promise<number[] | null> {
    const result = await this.engine.embedText(text)
    return result ? Array.from(result) : null
  }

  /**
   * Search for similar content
   */
  async search(
    query: string,
    options: {
      maxResults?: number
      minScore?: number
      contentTypes?: Array<EmbeddingEntry['contentType']>
    } = {}
  ): Promise<SearchResult[]> {
    // Lower default threshold to 0.2 (cosine similarity can be quite low for valid matches)
    const { maxResults = 10, minScore = 0.2, contentTypes } = options
    
    console.info(`[SemanticSearch] Searching for: "${query}"`)
    console.info(`[SemanticSearch] Embeddings available: ${this.embeddings.size}`)
    
    // Embed the query
    const queryEmbedding = await this.embedText(query)
    if (!queryEmbedding) {
      console.warn('[SemanticSearch] Embedding failed, returning empty results')
      return []
    }
    
    console.info(`[SemanticSearch] Query embedding generated, length: ${queryEmbedding.length}`)
    
    // Calculate similarities
    const results: SearchResult[] = []
    const allScores: { id: string; score: number }[] = []
    
    for (const entry of this.embeddings.values()) {
      // Filter by content type if specified
      if (contentTypes && !contentTypes.includes(entry.contentType)) {
        continue
      }
      
      // Calculate cosine similarity
      const score = this.engine.cosineSimilarity(queryEmbedding, entry.embedding)
      allScores.push({ id: entry.id, score })
      
      if (score >= minScore) {
        results.push({
          entry,
          score,
          snippet: this.extractSnippet(entry.content, query),
          highlights: this.findHighlights(entry.content, query),
        })
      }
    }
    
    // Debug: show top scores even if below threshold
    allScores.sort((a, b) => b.score - a.score)
    console.info(`[SemanticSearch] Top 5 scores:`, allScores.slice(0, 5))
    console.info(`[SemanticSearch] Results above minScore (${minScore}): ${results.length}`)
    
    // Sort by score and return top results
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)
  }

  /**
   * Answer a question using semantic search
   */
  async answerQuestion(question: string): Promise<{
    answer: string
    confidence: number
    sources: SearchResult[]
    relatedQuestions: string[]
  }> {
    const analysis = this.analyzeQuestion(question)
    
    // Check if we have embeddings to search
    if (this.embeddings.size === 0) {
      console.warn('[SemanticSearch] No embeddings available for semantic search')
      return {
        answer: "Semantic search is initializing. The knowledge embeddings haven't been indexed yet. Please try again in a moment or browse the knowledge tree.",
        confidence: 0,
        sources: [],
        relatedQuestions: this.suggestRelatedQuestions(question),
      }
    }
    
    // Search for relevant content (use low threshold - 0.2 is typical for MiniLM)
    const results = await this.search(question, {
      maxResults: 5,
      minScore: 0.2,
    })
    
    if (results.length === 0) {
      return {
        answer: "I couldn't find specific information about that in the Codex. Try rephrasing your question or browsing the knowledge tree.",
        confidence: 0,
        sources: [],
        relatedQuestions: this.suggestRelatedQuestions(question),
      }
    }
    
    // Build answer based on intent
    const answer = this.buildAnswer(analysis, results)
    
    // Clamp confidence to 0-1 range (cosine similarity should already be in this range)
    const confidence = Math.min(1, Math.max(0, results[0].score))
    
    return {
      answer,
      confidence,
      sources: results,
      relatedQuestions: this.suggestRelatedQuestions(question, results),
    }
  }

  /**
   * Get current backend status
   */
  getStatus(): BackendStatus {
    return this.engine.getStatus()
  }

  /**
   * Get human-readable status description
   */
  getStatusDescription(): string {
    return this.engine.getStatusDescription()
  }

  /**
   * Check if engine is ready
   */
  isReady(): boolean {
    return this.initialized && this.engine.isReady()
  }

  /**
   * Helper: Extract snippet around matches
   */
  private extractSnippet(content: string, query: string): string {
    const words = query.toLowerCase().split(/\s+/)
    const contentLower = content.toLowerCase()
    
    // Find best matching position
    let bestPos = 0
    let bestScore = 0
    
    for (let i = 0; i < content.length - 200; i++) {
      const window = contentLower.substring(i, i + 200)
      const score = words.filter(w => window.includes(w)).length
      if (score > bestScore) {
        bestScore = score
        bestPos = i
      }
    }
    
    return content.substring(bestPos, bestPos + 200) + '...'
  }

  /**
   * Helper: Find highlight positions
   */
  private findHighlights(content: string, query: string): Array<{ start: number; end: number }> {
    const highlights: Array<{ start: number; end: number }> = []
    const words = query.toLowerCase().split(/\s+/)
    const contentLower = content.toLowerCase()
    
    for (const word of words) {
      let pos = 0
      while ((pos = contentLower.indexOf(word, pos)) !== -1) {
        highlights.push({ start: pos, end: pos + word.length })
        pos += word.length
      }
    }
    
    return highlights
  }

  /**
   * Helper: Build answer from search results
   */
  private buildAnswer(analysis: QuestionAnalysis, results: SearchResult[]): string {
    const topResult = results[0]
    
    switch (analysis.intent) {
      case 'definition':
        return `Based on the FABRIC Codex, ${topResult.snippet}\n\nFor more details, see: ${topResult.entry.title}`
        
      case 'explanation':
        return `Here's how it works:\n\n${topResult.snippet}\n\nThis information comes from: ${topResult.entry.title}`
        
      case 'guide':
        return `To ${analysis.entities.join(' ')}, follow these steps:\n\n${topResult.snippet}\n\nFull guide available in: ${topResult.entry.title}`
        
      default:
        return `${topResult.snippet}\n\nSource: ${topResult.entry.title}`
    }
  }

  /**
   * Helper: Suggest related questions
   */
  private suggestRelatedQuestions(
    question: string, 
    results?: SearchResult[]
  ): string[] {
    const suggestions: string[] = []
    
    // Based on question type
    if (question.toLowerCase().includes('what')) {
      suggestions.push(question.replace(/what/i, 'How'))
      suggestions.push(question.replace(/what/i, 'Why'))
    }
    
    // Based on search results
    if (results) {
      for (const result of results.slice(0, 3)) {
        if (result.entry.metadata.tags) {
          for (const tag of result.entry.metadata.tags.slice(0, 2)) {
            suggestions.push(`What is ${tag}?`)
          }
        }
      }
    }
    
    return suggestions.slice(0, 3)
  }
}