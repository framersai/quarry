/**
 * Shared types for Codex search index data.
 */

export interface CodexSearchDoc {
  path: string
  title: string
  summary: string
  weave?: string
  loom?: string
  docLength: number
}

export interface CodexSearchIndex {
  generatedAt: string
  stats: {
    totalDocs: number
    avgDocLength: number
    vocabularySize: number
  }
  docs: CodexSearchDoc[]
  vocabulary: Record<string, Array<[number, number]>>
  embeddings: {
    size: number
    data: string
  }
}

export interface CodexSearchResult {
  docId: number
  path: string
  title: string
  summary: string
  weave?: string
  loom?: string
  bm25Score: number
  semanticScore?: number
  combinedScore: number
}

export interface BM25SearchOptions {
  limit?: number
}

export interface HybridSearchOptions extends BM25SearchOptions {
  semantic?: boolean
}


