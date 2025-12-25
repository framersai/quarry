/**
 * Glossary Cache Service
 *
 * Provides persistent caching for generated glossaries with:
 * - Content-based hashing for cache keys
 * - TTL support for automatic expiration
 * - Generation method tracking (NLP/LLM/hybrid)
 * - Cache statistics for debugging
 *
 * @module lib/glossary/glossaryCache
 */

import { getDatabase } from '../codexDatabase'

// ============================================================================
// TYPES
// ============================================================================

export type GenerationMethod = 'nlp' | 'llm' | 'hybrid'

export interface GlossaryTerm {
  term: string
  definition: string
  type: 'definition' | 'acronym' | 'entity' | 'keyword'
  confidence?: number
  source?: GenerationMethod
}

export interface CachedGlossary {
  terms: GlossaryTerm[]
  generationMethod: GenerationMethod
  createdAt: string
  version: number
}

export interface GlossaryCacheEntry {
  contentHash: string
  glossaryData: CachedGlossary
  generationMethod: GenerationMethod
  createdAt: string
  expiresAt: string | null
  version: number
}

export interface CacheStats {
  totalEntries: number
  hitCount: number
  missCount: number
  hitRate: number
  oldestEntry: string | null
  newestEntry: string | null
}

// ============================================================================
// CACHE CONFIG
// ============================================================================

const DEFAULT_TTL_DAYS = 30
const CACHE_VERSION = 1

// In-memory stats (reset on page reload)
let cacheHits = 0
let cacheMisses = 0

// ============================================================================
// HASHING
// ============================================================================

/**
 * Generate a fast content hash using a simple but effective algorithm
 * Uses DJB2 hash for speed (xxhash would require a dependency)
 */
export function hashContent(content: string): string {
  let hash = 5381
  for (let i = 0; i < content.length; i++) {
    hash = ((hash << 5) + hash) ^ content.charCodeAt(i)
  }
  // Convert to unsigned 32-bit and then to hex
  return (hash >>> 0).toString(16).padStart(8, '0')
}

/**
 * Generate cache key from content and method
 */
export function generateCacheKey(
  content: string,
  method: GenerationMethod
): string {
  const contentHash = hashContent(content)
  return `${method}_${contentHash}`
}

// ============================================================================
// CORE CACHE OPERATIONS
// ============================================================================

/**
 * Get cached glossary for content
 */
export async function getFromCache(
  contentHash: string
): Promise<CachedGlossary | null> {
  const db = await getDatabase()
  if (!db) {
    cacheMisses++
    return null
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = (await db.all(
      `SELECT glossary_data, generation_method, created_at, version, expires_at
       FROM glossary_cache
       WHERE content_hash = ?`,
      [contentHash]
    )) as any[] | null

    if (!rows || rows.length === 0) {
      cacheMisses++
      return null
    }

    const row = rows[0]

    // Check expiration
    if (row.expires_at) {
      const expiresAt = new Date(row.expires_at)
      if (expiresAt < new Date()) {
        // Expired - delete and return null
        await db.run('DELETE FROM glossary_cache WHERE content_hash = ?', [
          contentHash,
        ])
        cacheMisses++
        return null
      }
    }

    cacheHits++

    const glossaryData = JSON.parse(row.glossary_data) as CachedGlossary
    return {
      ...glossaryData,
      generationMethod: row.generation_method as GenerationMethod,
      createdAt: row.created_at,
      version: row.version,
    }
  } catch (error) {
    console.error('[GlossaryCache] Error reading from cache:', error)
    cacheMisses++
    return null
  }
}

/**
 * Save glossary to cache
 */
export async function saveToCache(
  contentHash: string,
  data: CachedGlossary,
  ttlDays: number = DEFAULT_TTL_DAYS
): Promise<boolean> {
  const db = await getDatabase()
  if (!db) return false

  try {
    const now = new Date()
    const expiresAt = new Date(now.getTime() + ttlDays * 24 * 60 * 60 * 1000)

    await db.run(
      `INSERT INTO glossary_cache (content_hash, glossary_data, generation_method, created_at, expires_at, version)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(content_hash) DO UPDATE SET
         glossary_data = excluded.glossary_data,
         generation_method = excluded.generation_method,
         expires_at = excluded.expires_at,
         version = excluded.version`,
      [
        contentHash,
        JSON.stringify(data),
        data.generationMethod,
        now.toISOString(),
        expiresAt.toISOString(),
        CACHE_VERSION,
      ]
    )

    console.log(`[GlossaryCache] Saved cache entry: ${contentHash}`)
    return true
  } catch (error) {
    console.error('[GlossaryCache] Error saving to cache:', error)
    return false
  }
}

/**
 * Invalidate cache entry or all entries
 */
export async function invalidateCache(
  contentHash?: string
): Promise<{ deleted: number }> {
  const db = await getDatabase()
  if (!db) return { deleted: 0 }

  try {
    if (contentHash) {
      await db.run('DELETE FROM glossary_cache WHERE content_hash = ?', [
        contentHash,
      ])
      console.log(`[GlossaryCache] Invalidated: ${contentHash}`)
      return { deleted: 1 }
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const countRows = (await db.all(
        'SELECT COUNT(*) as count FROM glossary_cache'
      )) as any[]
      const count = countRows?.[0]?.count || 0

      await db.run('DELETE FROM glossary_cache')
      console.log(`[GlossaryCache] Cleared all entries: ${count}`)
      return { deleted: count }
    }
  } catch (error) {
    console.error('[GlossaryCache] Error invalidating cache:', error)
    return { deleted: 0 }
  }
}

/**
 * Clean up expired entries
 */
export async function cleanupExpired(): Promise<{ deleted: number }> {
  const db = await getDatabase()
  if (!db) return { deleted: 0 }

  try {
    const now = new Date().toISOString()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const countRows = (await db.all(
      'SELECT COUNT(*) as count FROM glossary_cache WHERE expires_at < ?',
      [now]
    )) as any[]
    const count = countRows?.[0]?.count || 0

    await db.run('DELETE FROM glossary_cache WHERE expires_at < ?', [now])
    console.log(`[GlossaryCache] Cleaned up ${count} expired entries`)
    return { deleted: count }
  } catch (error) {
    console.error('[GlossaryCache] Error cleaning up expired:', error)
    return { deleted: 0 }
  }
}

// ============================================================================
// CACHE STATISTICS
// ============================================================================

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<CacheStats> {
  const db = await getDatabase()
  if (!db) {
    return {
      totalEntries: 0,
      hitCount: cacheHits,
      missCount: cacheMisses,
      hitRate: 0,
      oldestEntry: null,
      newestEntry: null,
    }
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const countRows = (await db.all(
      'SELECT COUNT(*) as count FROM glossary_cache'
    )) as any[]
    const totalEntries = countRows?.[0]?.count || 0

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const oldestRows = (await db.all(
      'SELECT created_at FROM glossary_cache ORDER BY created_at ASC LIMIT 1'
    )) as any[]

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newestRows = (await db.all(
      'SELECT created_at FROM glossary_cache ORDER BY created_at DESC LIMIT 1'
    )) as any[]

    const totalRequests = cacheHits + cacheMisses
    const hitRate = totalRequests > 0 ? cacheHits / totalRequests : 0

    return {
      totalEntries,
      hitCount: cacheHits,
      missCount: cacheMisses,
      hitRate,
      oldestEntry: oldestRows?.[0]?.created_at || null,
      newestEntry: newestRows?.[0]?.created_at || null,
    }
  } catch (error) {
    console.error('[GlossaryCache] Error getting stats:', error)
    return {
      totalEntries: 0,
      hitCount: cacheHits,
      missCount: cacheMisses,
      hitRate: 0,
      oldestEntry: null,
      newestEntry: null,
    }
  }
}

/**
 * Reset in-memory statistics
 */
export function resetStats(): void {
  cacheHits = 0
  cacheMisses = 0
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if content is cached
 */
export async function isCached(contentHash: string): Promise<boolean> {
  const cached = await getFromCache(contentHash)
  return cached !== null
}

/**
 * Get cache entry age in days
 */
export function getCacheAge(createdAt: string): number {
  const created = new Date(createdAt)
  const now = new Date()
  const diffMs = now.getTime() - created.getTime()
  return Math.floor(diffMs / (24 * 60 * 60 * 1000))
}
