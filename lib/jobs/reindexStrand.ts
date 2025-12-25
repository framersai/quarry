/**
 * Strand Re-indexing
 *
 * Handles lazy async re-indexing of strand metadata after edits.
 * Supports both immediate lightweight updates and deferred heavy processing.
 *
 * @module lib/jobs/reindexStrand
 */

import type { StrandMetadata } from '@/components/codex/types'
import type { ReindexStrandPayload, ReindexStrandResult } from './types'
import { jobQueue, registerJobProcessor } from './jobQueue'

// ============================================================================
// TYPES
// ============================================================================

export interface ReindexOptions {
  /** Whether to queue block-level re-indexing (async, slower) */
  reindexBlocks?: boolean
  /** Whether to update embeddings for semantic search (async) */
  updateEmbeddings?: boolean
  /** Whether to run tag bubbling after block re-indexing */
  runTagBubbling?: boolean
  /** Priority: 'immediate' runs sync, 'deferred' queues a job */
  priority?: 'immediate' | 'deferred'
}

// ============================================================================
// IMMEDIATE UPDATES (SYNC)
// ============================================================================

/**
 * Perform immediate metadata index updates (fast, sync)
 *
 * This updates the basic search indexes without heavy processing.
 * Called synchronously after metadata save.
 */
async function performImmediateUpdate(
  strandPath: string,
  metadata: StrandMetadata
): Promise<void> {
  // Import dynamically to avoid circular deps
  const { getDatabase } = await import('../codexDatabase')
  const db = await getDatabase()
  if (!db) {
    console.warn('[reindexStrand] Database not available for immediate update')
    return
  }

  const now = new Date().toISOString()

  // Update search-related columns
  const difficulty = typeof metadata.difficulty === 'object'
    ? (metadata.difficulty as { overall?: string }).overall
    : metadata.difficulty

  // Handle different taxonomy shapes
  const subjects = metadata.taxonomy?.subjects || []
  const topics = metadata.taxonomy?.topics || []

  // Handle tags as either string or string[]
  const tags = Array.isArray(metadata.tags)
    ? metadata.tags
    : (metadata.tags ? [metadata.tags] : [])

  try {
    await db.run(`
      UPDATE strands SET
        title = ?,
        difficulty = ?,
        status = ?,
        subjects = ?,
        topics = ?,
        tags = ?,
        last_indexed_at = ?
      WHERE path = ?
    `, [
      metadata.title || 'Untitled',
      difficulty !== undefined ? String(difficulty) : null,
      metadata.publishing?.status || 'published',
      JSON.stringify(subjects),
      JSON.stringify(topics),
      JSON.stringify(tags),
      now,
      strandPath,
    ])

    console.log('[reindexStrand] Immediate update complete:', strandPath)
  } catch (error) {
    console.error('[reindexStrand] Immediate update failed:', error)
  }
}

// ============================================================================
// DEFERRED UPDATES (ASYNC)
// ============================================================================

/**
 * Queue a deferred re-indexing job for heavy processing
 *
 * This is for operations that take longer:
 * - Block-level re-indexing
 * - Embedding updates
 * - Tag bubbling
 */
async function queueDeferredReindex(
  strandPath: string,
  options: ReindexOptions
): Promise<string | null> {
  const payload: ReindexStrandPayload = {
    strandPath,
    reindexBlocks: options.reindexBlocks ?? false,
    updateEmbeddings: options.updateEmbeddings ?? false,
    runTagBubbling: options.runTagBubbling ?? false,
  }

  const jobId = await jobQueue.enqueue('reindex-strand', payload)

  if (jobId) {
    console.log('[reindexStrand] Queued deferred job:', jobId)
  }

  return jobId
}

// ============================================================================
// JOB PROCESSOR
// ============================================================================

/**
 * Process a re-index job (called by job queue)
 */
export async function processReindexJob(
  payload: ReindexStrandPayload,
  onProgress: (progress: number, message: string) => void
): Promise<ReindexStrandResult> {
  const startTime = Date.now()
  const { strandPath, reindexBlocks, updateEmbeddings, runTagBubbling } = payload

  onProgress(10, 'Starting re-index...')

  let blocksReindexed = 0
  let embeddingsUpdated = false

  try {
    // Step 1: Basic metadata refresh from database
    onProgress(20, 'Refreshing metadata indexes...')
    const { getDatabase } = await import('../codexDatabase')
    const db = await getDatabase()

    if (db) {
      // Get strand data from database
      const row = await db.get(`
        SELECT frontmatter, content FROM strands WHERE path = ?
      `, [strandPath]) as { frontmatter: string; content: string } | undefined

      if (row?.frontmatter) {
        try {
          const metadata = JSON.parse(row.frontmatter) as StrandMetadata
          await performImmediateUpdate(strandPath, metadata)
        } catch {
          console.warn('[reindexStrand] Failed to parse frontmatter')
        }
      }

      // Step 2: Block-level re-indexing (if enabled)
      // Note: This is a placeholder - actual block processing would go here
      if (reindexBlocks && row?.content) {
        onProgress(40, 'Re-indexing blocks...')
        try {
          // Simplified block counting - actual implementation would use blockProcessor
          const blocks = row.content.split(/\n\n+/).filter(Boolean)
          blocksReindexed = blocks.length
          onProgress(60, `Processed ${blocksReindexed} blocks`)
        } catch (error) {
          console.warn('[reindexStrand] Block processing skipped:', error)
        }
      }

      // Step 3: Update embeddings (if enabled)
      // Note: Placeholder - actual embedding update would integrate with semantic search
      if (updateEmbeddings) {
        onProgress(70, 'Updating embeddings...')
        // Embeddings update is skipped if module not available
        console.log('[reindexStrand] Embedding update placeholder')
        embeddingsUpdated = false
        onProgress(85, 'Embeddings skipped (not configured)')
      }

      // Step 4: Tag bubbling (if enabled)
      // Note: Placeholder - actual tag bubbling would aggregate block tags
      if (runTagBubbling) {
        onProgress(90, 'Running tag bubbling...')
        console.log('[reindexStrand] Tag bubbling placeholder')
        onProgress(95, 'Tags bubbling skipped (not configured)')
      }
    }

    onProgress(100, 'Re-index complete')

    return {
      strandPath,
      metadataUpdated: true,
      blocksReindexed: reindexBlocks ? blocksReindexed : undefined,
      embeddingsUpdated: updateEmbeddings ? embeddingsUpdated : undefined,
      durationMs: Date.now() - startTime,
    }
  } catch (error) {
    console.error('[reindexStrand] Job failed:', error)
    throw error
  }
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Re-index a strand after metadata changes
 *
 * Performs immediate lightweight updates synchronously, then
 * optionally queues heavier processing as a background job.
 *
 * @param strandPath - Path to the strand file
 * @param metadata - Updated metadata
 * @param options - Re-indexing options
 * @returns Job ID if a deferred job was queued, null otherwise
 *
 * @example
 * ```ts
 * // After saving metadata
 * await reindexStrandMetadata(path, updatedMetadata, {
 *   reindexBlocks: true,  // Queue heavy processing
 *   priority: 'deferred'  // Run in background
 * })
 * ```
 */
export async function reindexStrandMetadata(
  strandPath: string,
  metadata: StrandMetadata,
  options: ReindexOptions = {}
): Promise<string | null> {
  // Always do immediate lightweight update
  await performImmediateUpdate(strandPath, metadata)

  // Check if we need to queue heavier processing
  const needsDeferred = (
    options.reindexBlocks ||
    options.updateEmbeddings ||
    options.runTagBubbling
  )

  if (needsDeferred && options.priority !== 'immediate') {
    // Queue a background job for heavy processing
    return queueDeferredReindex(strandPath, options)
  }

  // If priority is 'immediate', do everything sync (not recommended for large strands)
  if (needsDeferred && options.priority === 'immediate') {
    const payload: ReindexStrandPayload = {
      strandPath,
      reindexBlocks: options.reindexBlocks,
      updateEmbeddings: options.updateEmbeddings,
      runTagBubbling: options.runTagBubbling,
    }
    await processReindexJob(payload, () => {})
  }

  return null
}

/**
 * Register the re-index processor with the job queue
 *
 * Call this at app startup to enable re-index job processing.
 */
export function registerReindexProcessor(): void {
  registerJobProcessor('reindex-strand', async (job, onProgress) => {
    const payload = job.payload as ReindexStrandPayload
    return processReindexJob(payload, onProgress)
  })

  // Also register block-level re-indexing
  registerJobProcessor('reindex-blocks', async (job, onProgress) => {
    const payload = job.payload as ReindexStrandPayload
    return processReindexJob({
      ...payload,
      reindexBlocks: true,
    }, onProgress)
  })

  console.log('[reindexStrand] Processors registered')
}
