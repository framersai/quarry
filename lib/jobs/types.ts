/**
 * Job Queue Type Definitions
 * @module lib/jobs/types
 *
 * Types for the background job queue system that handles
 * heavy generation tasks (flashcards, glossaries, quizzes, ratings)
 */

import type { CategorizationJobPayload, CategorizationJobResult } from '@/lib/categorization/types'
import type { TaxonomyHierarchyConfig, TaxonomyChange } from '@/lib/taxonomy'
import type { GlossaryGenerationResult } from '@/lib/glossary/workerTypes'

/* ═══════════════════════════════════════════════════════════════════════════
   JOB TYPES
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Types of jobs the queue can process
 */
export type JobType =
  | 'flashcard_generation'
  | 'glossary_generation'
  | 'quiz_generation'
  | 'rating_generation'
  // Categorization jobs
  | 'categorization'
  | 'reclassify-taxonomy'
  // Block tagging jobs (Phase 9)
  | 'block-tagging'
  | 'bulk-block-tagging'
  // Re-indexing jobs (for metadata updates)
  | 'reindex-strand'
  | 'reindex-blocks'
  // Publishing jobs (vault write + NLP pipeline)
  | 'publish-strand'
  // Import/Export jobs
  | 'import-obsidian'
  | 'import-notion'
  | 'import-google-docs'
  | 'import-markdown'
  | 'import-json'
  | 'import-github'
  | 'export-pdf'
  | 'export-docx'
  | 'export-markdown'
  | 'export-json'

/**
 * Job status lifecycle
 */
export type JobStatus = 
  | 'pending'    // Waiting in queue
  | 'running'    // Currently processing
  | 'completed'  // Successfully finished
  | 'failed'     // Failed with error
  | 'cancelled'  // Manually cancelled

/**
 * Human-readable labels for job types
 */
export const JOB_TYPE_LABELS: Record<JobType, string> = {
  flashcard_generation: 'Flashcard Generation',
  glossary_generation: 'Glossary Generation',
  quiz_generation: 'Quiz Generation',
  rating_generation: 'Rating Generation',
  categorization: 'Categorization',
  'reclassify-taxonomy': 'Taxonomy Reclassification',
  // Block tagging (Phase 9)
  'block-tagging': 'Block Tagging',
  'bulk-block-tagging': 'Bulk Block Tagging',
  // Re-indexing
  'reindex-strand': 'Strand Re-indexing',
  'reindex-blocks': 'Block Re-indexing',
  // Publishing
  'publish-strand': 'Publishing Strand',
  'import-obsidian': 'Obsidian Import',
  'import-notion': 'Notion Import',
  'import-google-docs': 'Google Docs Import',
  'import-markdown': 'Markdown Import',
  'import-json': 'JSON Import',
  'import-github': 'GitHub Import',
  'export-pdf': 'PDF Export',
  'export-docx': 'DOCX Export',
  'export-markdown': 'Markdown Export',
  'export-json': 'JSON Export',
}

/**
 * Icons for job types (lucide-react icon names)
 */
export const JOB_TYPE_ICONS: Record<JobType, string> = {
  flashcard_generation: 'Layers',
  glossary_generation: 'BookOpen',
  quiz_generation: 'HelpCircle',
  rating_generation: 'Star',
  categorization: 'FolderTree',
  'reclassify-taxonomy': 'GitBranch',
  // Block tagging (Phase 9)
  'block-tagging': 'Tags',
  'bulk-block-tagging': 'Tags',
  // Re-indexing
  'reindex-strand': 'RefreshCw',
  'reindex-blocks': 'RefreshCw',
  // Publishing
  'publish-strand': 'Send',
  'import-obsidian': 'Upload',
  'import-notion': 'Upload',
  'import-google-docs': 'Upload',
  'import-markdown': 'Upload',
  'import-json': 'Upload',
  'import-github': 'Github',
  'export-pdf': 'Download',
  'export-docx': 'Download',
  'export-markdown': 'Download',
  'export-json': 'Download',
}

/* ═══════════════════════════════════════════════════════════════════════════
   PAYLOAD TYPES
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Base payload for all jobs
 */
interface BaseJobPayload {
  /** Strand paths to process */
  strandPaths: string[]
  /** Optional generation options */
  options?: Record<string, unknown>
}

/**
 * Payload for flashcard generation
 */
export interface FlashcardJobPayload extends BaseJobPayload {
  /** Whether to use LLM for generation */
  useLLM?: boolean
  /** Force regeneration even if cached */
  forceRegenerate?: boolean
}

/**
 * Payload for glossary generation
 */
export interface GlossaryJobPayload extends BaseJobPayload {
  /** Whether to use LLM for definitions */
  useLLM?: boolean
  /** Include terms from related strands */
  includeRelated?: boolean
}

/**
 * Payload for quiz generation
 */
export interface QuizJobPayload extends BaseJobPayload {
  /** Number of questions to generate */
  questionCount?: number
  /** Question types to include */
  questionTypes?: ('multiple_choice' | 'true_false' | 'fill_blank')[]
}

/**
 * Payload for rating generation
 */
export interface RatingJobPayload extends BaseJobPayload {
  /** Force re-rating even if already rated */
  forceRegenerate?: boolean
}

/**
 * Payload for import jobs
 */
export interface ImportJobPayload {
  /** Import source format */
  source: 'obsidian' | 'notion' | 'google-docs' | 'markdown' | 'json' | 'github'
  /** Files to import (for local uploads) */
  files?: File[]
  /** Google Drive folder ID (for Google Docs import) */
  googleFolderId?: string
  /** Target weave slug */
  targetWeave?: string
  /** Conflict resolution strategy */
  conflictResolution: 'replace' | 'merge' | 'skip'
  /** Preserve folder structure as looms */
  preserveStructure: boolean
  /** Import user data (bookmarks, highlights) */
  importUserData?: boolean
  /** Format-specific options */
  options?: Record<string, unknown>
}

/**
 * Payload for export jobs
 */
export interface ExportJobPayload {
  /** Export format */
  format: 'pdf' | 'docx' | 'markdown' | 'json'
  /** Strand paths to export (empty = all) */
  strandPaths?: string[]
  /** Export entire weave(s) */
  weaves?: string[]
  /** Include metadata */
  includeMetadata: boolean
  /** Include user data */
  includeUserData?: boolean
  /** Page size (for PDF/DOCX) */
  pageSize?: 'letter' | 'a4'
  /** Include table of contents */
  includeTOC?: boolean
  /** Format-specific options */
  options?: Record<string, unknown>
}

/**
 * Payload for taxonomy reclassification jobs
 */
export interface ReclassifyTaxonomyPayload {
  /** Scope of reclassification */
  scope: 'all' | 'weave' | 'loom' | 'strand'
  /** Path if scope is not 'all' */
  scopePath?: string
  /** Taxonomy hierarchy configuration */
  config: TaxonomyHierarchyConfig
  /** Preview changes without applying */
  dryRun: boolean
  /** Apply changes automatically without review */
  autoApply: boolean
}

/**
 * Payload for block tagging jobs (Phase 9)
 */
export interface BlockTaggingJobPayload {
  /** Strand paths to process */
  strandPaths: string[]
  /** Whether to use LLM for enhanced tagging (slower but more accurate) */
  useLLM?: boolean
  /** Recalculate worthiness scores even if already computed */
  recalculateWorthiness?: boolean
  /** Minimum confidence threshold for suggested tags (0-1) */
  confidenceThreshold?: number
  /** Whether to run tag bubbling to aggregate block tags to document level */
  enableBubbling?: boolean
  /** Block types to process (default: all) */
  blockTypes?: ('heading' | 'paragraph' | 'code' | 'list' | 'blockquote' | 'table')[]
  /** Minimum worthiness score to tag a block (0-1) */
  minWorthinessScore?: number
}

/**
 * Payload for strand re-indexing jobs
 */
export interface ReindexStrandPayload {
  /** Path to the strand file */
  strandPath: string
  /** Whether to update block-level indexes (slower) */
  reindexBlocks?: boolean
  /** Whether to update embeddings for semantic search */
  updateEmbeddings?: boolean
  /** Whether to run tag bubbling after re-indexing */
  runTagBubbling?: boolean
}

/**
 * Payload for publish-strand jobs
 * Writes content to vault folder and runs NLP pipeline
 */
export interface PublishStrandPayload {
  /** Path to the strand (e.g., weaves/wiki/looms/intro/strands/welcome.md) */
  strandPath: string
  /** Markdown content to publish */
  content: string
  /** Strand metadata (frontmatter) */
  metadata: Record<string, unknown>
  /** Whether to run full NLP pipeline (tagging, worthiness, bubbling) */
  runNLP?: boolean
  /** Whether to update embeddings for semantic search */
  updateEmbeddings?: boolean
  /** Whether to skip vault write (for dry run) */
  dryRun?: boolean
}

/**
 * Union of all job payloads
 */
export type JobPayload =
  | FlashcardJobPayload
  | GlossaryJobPayload
  | QuizJobPayload
  | RatingJobPayload
  | CategorizationJobPayload
  | ImportJobPayload
  | ExportJobPayload
  | ReclassifyTaxonomyPayload
  | BlockTaggingJobPayload
  | ReindexStrandPayload
  | PublishStrandPayload

/* ═══════════════════════════════════════════════════════════════════════════
   RESULT TYPES
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Result from flashcard generation
 */
export interface FlashcardJobResult {
  /** Number of flashcards created */
  count: number
  /** IDs of created flashcards */
  flashcardIds: string[]
  /** Strands processed */
  strandsProcessed: number
}

/**
 * Result from glossary generation
 */
export interface GlossaryJobResult {
  /** Number of terms created */
  count: number
  /** Term IDs */
  termIds: string[]
  /** Categories found */
  categories: string[]
}

/**
 * Result from quiz generation
 */
export interface QuizJobResult {
  /** Number of questions created */
  count: number
  /** Question IDs */
  questionIds: string[]
}

/**
 * Result from rating generation
 */
export interface RatingJobResult {
  /** Number of strands rated */
  count: number
  /** Average rating */
  averageRating: number
}

/**
 * Result from import jobs
 */
export interface ImportJobResult {
  /** Number of strands successfully imported */
  strandsImported: number
  /** Number of strands skipped */
  strandsSkipped: number
  /** Number of conflicts encountered */
  conflictsResolved: number
  /** Number of assets imported */
  assetsImported: number
  /** IDs of imported strands */
  strandIds: string[]
  /** Errors encountered */
  errors?: string[]
  /** Warnings */
  warnings?: string[]
}

/**
 * Result from export jobs
 */
export interface ExportJobResult {
  /** Number of strands exported */
  strandsExported: number
  /** Number of assets exported */
  assetsExported: number
  /** Total size in bytes */
  totalSizeBytes: number
  /** Download URL or blob */
  downloadUrl?: string
  /** Filename */
  filename: string
  /** Errors encountered */
  errors?: string[]
}

/**
 * Result from taxonomy reclassification jobs
 */
export interface ReclassifyTaxonomyResult {
  /** Number of strands processed */
  strandsProcessed: number
  /** Number of subjects removed (duplicates) */
  subjectsRemoved: number
  /** Number of subjects demoted to topics */
  subjectsDemoted: number
  /** Number of topics removed (duplicates) */
  topicsRemoved: number
  /** Number of topics demoted to tags */
  topicsDemoted: number
  /** Number of tags removed (duplicates) */
  tagsRemoved: number
  /** Detailed changes (for review) */
  changes: TaxonomyChange[]
  /** Was this a dry run? */
  dryRun: boolean
}

/**
 * Result from block tagging jobs (Phase 9)
 */
export interface BlockTaggingJobResult {
  /** Number of strands processed */
  strandsProcessed: number
  /** Number of blocks processed */
  blocksProcessed: number
  /** Number of blocks that received accepted tags */
  blocksTagged: number
  /** Number of suggested tags generated */
  suggestedTags: number
  /** Number of tags bubbled up to document level */
  bubbledTags: number
  /** Number of blocks deemed worthy of tagging */
  worthyBlocks: number
  /** Average worthiness score across all blocks */
  avgWorthinessScore: number
  /** Breakdown by block type */
  blockTypeBreakdown: Record<string, number>
  /** Breakdown by tag source (nlp vs llm) */
  tagSourceBreakdown: {
    nlp: number
    llm: number
    existing: number
  }
  /** Errors encountered during processing */
  errors?: string[]
  /** Warnings (non-fatal issues) */
  warnings?: string[]
}

/**
 * Result from strand re-indexing jobs
 */
export interface ReindexStrandResult {
  /** Path of the strand that was re-indexed */
  strandPath: string
  /** Whether metadata was updated */
  metadataUpdated: boolean
  /** Number of blocks re-indexed (if reindexBlocks was true) */
  blocksReindexed?: number
  /** Whether embeddings were updated */
  embeddingsUpdated?: boolean
  /** Duration in milliseconds */
  durationMs: number
}

/**
 * Result from publish-strand jobs
 */
export interface PublishStrandResult {
  /** Path of the strand that was published */
  strandPath: string
  /** Whether content was written to vault */
  vaultWritten: boolean
  /** Number of blocks processed by NLP pipeline */
  blocksProcessed: number
  /** Number of tags generated */
  tagsGenerated: number
  /** Tags bubbled to document level */
  bubbledTags: string[]
  /** Whether embeddings were updated */
  embeddingsUpdated: boolean
  /** Duration in milliseconds */
  durationMs: number
  /** Warnings (non-fatal issues) */
  warnings?: string[]
}

/**
 * Union of all job results
 */
export type JobResult =
  | FlashcardJobResult
  | GlossaryJobResult
  | GlossaryGenerationResult
  | QuizJobResult
  | RatingJobResult
  | CategorizationJobResult
  | ImportJobResult
  | ExportJobResult
  | ReclassifyTaxonomyResult
  | BlockTaggingJobResult
  | ReindexStrandResult
  | PublishStrandResult

/* ═══════════════════════════════════════════════════════════════════════════
   JOB INTERFACE
═══════════════════════════════════════════════════════════════════════════ */

/**
 * A background job
 */
export interface Job<P = JobPayload, R = JobResult> {
  /** Unique identifier */
  id: string
  /** Job type */
  type: JobType
  /** Current status */
  status: JobStatus
  /** Progress percentage (0-100) */
  progress: number
  /** Current status message */
  message: string
  /** Job-specific payload data */
  payload: P
  /** Result when completed */
  result?: R
  /** Error message if failed */
  error?: string
  /** When job was created */
  createdAt: string
  /** When job started processing */
  startedAt?: string
  /** When job completed/failed */
  completedAt?: string
}

/**
 * Job for storage (serializable version)
 */
export interface StoredJob {
  id: string
  type: string
  status: string
  progress: number
  message: string
  payload: string // JSON stringified
  result?: string // JSON stringified
  error?: string
  created_at: string
  started_at?: string
  completed_at?: string
}

/* ═══════════════════════════════════════════════════════════════════════════
   EVENTS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Job event types
 */
export type JobEventType = 
  | 'job:created'
  | 'job:started'
  | 'job:progress'
  | 'job:completed'
  | 'job:failed'
  | 'job:cancelled'
  | 'job:duplicate'

/**
 * Job event
 */
export interface JobEvent {
  type: JobEventType
  job: Job
  timestamp: string
}

/**
 * Job event callback
 */
export type JobEventCallback = (event: JobEvent) => void

/* ═══════════════════════════════════════════════════════════════════════════
   WORKER MESSAGES
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Message to worker to start a job
 */
export interface WorkerStartMessage {
  type: 'start'
  job: Job
}

/**
 * Message from worker for progress update
 */
export interface WorkerProgressMessage {
  type: 'progress'
  jobId: string
  progress: number
  message: string
}

/**
 * Message from worker when job completes
 */
export interface WorkerCompleteMessage {
  type: 'complete'
  jobId: string
  result: JobResult
}

/**
 * Message from worker when job fails
 */
export interface WorkerErrorMessage {
  type: 'error'
  jobId: string
  error: string
}

/**
 * Message to worker to cancel
 */
export interface WorkerCancelMessage {
  type: 'cancel'
  jobId: string
}

/**
 * All worker messages
 */
export type WorkerMessage = 
  | WorkerStartMessage 
  | WorkerProgressMessage 
  | WorkerCompleteMessage 
  | WorkerErrorMessage
  | WorkerCancelMessage

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Generate a unique job ID
 */
export function generateJobId(): string {
  return `job-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Check if a job is in a terminal state
 */
export function isJobTerminal(status: JobStatus): boolean {
  return status === 'completed' || status === 'failed' || status === 'cancelled'
}

/**
 * Check if a job can be cancelled
 */
export function isJobCancellable(status: JobStatus): boolean {
  return status === 'pending' || status === 'running'
}

/**
 * Get status color for UI
 */
export function getJobStatusColor(status: JobStatus): string {
  switch (status) {
    case 'pending': return 'text-zinc-400'
    case 'running': return 'text-blue-500'
    case 'completed': return 'text-emerald-500'
    case 'failed': return 'text-red-500'
    case 'cancelled': return 'text-amber-500'
  }
}

/**
 * Get status background color for UI
 */
export function getJobStatusBgColor(status: JobStatus): string {
  switch (status) {
    case 'pending': return 'bg-zinc-500/20'
    case 'running': return 'bg-blue-500/20'
    case 'completed': return 'bg-emerald-500/20'
    case 'failed': return 'bg-red-500/20'
    case 'cancelled': return 'bg-amber-500/20'
  }
}









