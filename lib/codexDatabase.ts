/**
 * FABRIC Codex Database
 *
 * Centralized SQL database for all Codex client-side data:
 * - Embeddings (semantic search - offline capable!)
 * - Search history
 * - Reading progress
 * - Drafts
 * - User preferences
 * - Cached content
 * - Audit logging & undo/redo
 *
 * Uses @framers/sql-storage-adapter with IndexedDB for persistence.
 * Falls back gracefully to memory for SSR/unsupported browsers.
 *
 * @module lib/codexDatabase
 */

import type { StorageAdapter } from '@framers/sql-storage-adapter'
import { initAuditSchema } from './audit/auditDatabase'

// ============================================================================
// TYPES
// ============================================================================

export interface EmbeddingRecord {
  id: string
  path: string
  title: string
  content: string
  contentType: 'strand' | 'section' | 'paragraph' | 'code'
  embedding: number[] // 384-dim vector
  weave?: string
  loom?: string
  tags?: string[]
  lastModified?: string
  createdAt: string
}

export interface SearchHistoryRecord {
  id: string
  query: string
  resultCount: number
  clickedPath?: string
  timestamp: string
}

export interface ReadingProgressRecord {
  path: string
  scrollPosition: number
  readPercentage: number
  lastReadAt: string
  totalReadTime: number // seconds
  completed: boolean
}

export interface DraftRecord {
  id: string
  type: 'strand' | 'weave' | 'loom'
  path: string
  title: string
  content: string
  metadata: string // JSON
  createdAt: string
  updatedAt: string
  autoSaved: boolean
}

export interface BookmarkRecord {
  id: string
  path: string
  title: string
  excerpt?: string
  tags?: string[]
  createdAt: string
}

// ============================================================================
// CONTENT STORAGE TYPES (Full SQLite Backend)
// ============================================================================

export interface FabricRecord {
  id: string
  name: string
  description?: string
  githubOwner?: string
  githubRepo?: string
  githubBranch?: string
  lastSyncAt?: string
  syncHash?: string
  createdAt: string
  updatedAt: string
}

export interface WeaveRecord {
  id: string
  fabricId: string
  slug: string
  name: string
  description?: string
  path: string
  strandCount: number
  loomCount: number
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface LoomRecord {
  id: string
  weaveId: string
  parentLoomId?: string
  slug: string
  name: string
  description?: string
  path: string
  depth: number
  strandCount: number
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface StrandRecord {
  id: string
  weaveId: string
  loomId?: string
  slug: string
  title: string
  path: string
  content: string
  contentHash?: string
  wordCount: number
  frontmatter?: Record<string, unknown>
  version?: string
  difficulty?: string
  status: 'draft' | 'published' | 'archived'
  subjects?: string[]
  topics?: string[]
  tags?: string[]
  prerequisites?: string[]
  references?: string[]
  summary?: string
  githubSha?: string
  githubUrl?: string
  createdAt: string
  updatedAt: string
  lastIndexedAt?: string
}

export interface SyncStatusRecord {
  id: string
  lastFullSync?: string
  lastIncrementalSync?: string
  remoteTreeSha?: string
  localVersion: number
  pendingChanges: number
  syncErrors?: string[]
  createdAt: string
  updatedAt: string
}

export interface DatabaseStats {
  embeddings: number
  searchHistory: number
  readingProgress: number
  drafts: number
  bookmarks: number
  totalSizeKB: number
}

// ============================================================================
// DATABASE SINGLETON
// ============================================================================

const isBrowser = typeof window !== 'undefined'

let db: StorageAdapter | null = null
let dbPromise: Promise<StorageAdapter | null> | null = null
let schemaInitialized = false

/**
 * Get or create the database instance
 *
 * Exported for use by content management layer.
 */
export async function getDatabase(): Promise<StorageAdapter | null> {
  if (!isBrowser) return null
  if (db) return db
  
  if (!dbPromise) {
    dbPromise = initDatabase()
  }
  
  return dbPromise
}

/**
 * Initialize database with all tables
 */
async function initDatabase(): Promise<StorageAdapter | null> {
  try {
    const { createDatabase } = await import('@framers/sql-storage-adapter')
    
    db = await createDatabase({
      priority: ['indexeddb', 'sqljs'],
      indexedDb: {
        dbName: 'fabric_codex_db',
        autoSave: true,
        saveIntervalMs: 3000,
        sqlJsConfig: {
          locateFile: (file: string) => {
            // Use absolute URL to avoid path resolution issues on nested routes like /codex/some-page
            const origin = typeof window !== 'undefined' ? window.location.origin : ''
            return `${origin}/wasm/${file}`
          },
        },
      },
    })
    
    if (!schemaInitialized) {
      await initSchema()
      schemaInitialized = true
    }
    
    console.log('[CodexDB] ✅ Database initialized with IndexedDB persistence')
    return db
  } catch (error) {
    console.warn('[CodexDB] Failed to initialize, using memory fallback:', error)
    return null
  }
}

/**
 * Initialize all database tables
 */
async function initSchema(): Promise<void> {
  if (!db) return
  
  // Embeddings table for semantic search
  await db.exec(`
    CREATE TABLE IF NOT EXISTS embeddings (
      id TEXT PRIMARY KEY,
      path TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      content_type TEXT NOT NULL,
      embedding TEXT NOT NULL,
      weave TEXT,
      loom TEXT,
      tags TEXT,
      last_modified TEXT,
      created_at TEXT NOT NULL
    )
  `)
  
  // Create index for path lookups
  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_embeddings_path ON embeddings(path)
  `)
  
  // Search history table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS search_history (
      id TEXT PRIMARY KEY,
      query TEXT NOT NULL,
      result_count INTEGER NOT NULL,
      clicked_path TEXT,
      timestamp TEXT NOT NULL
    )
  `)
  
  // Reading progress table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS reading_progress (
      path TEXT PRIMARY KEY,
      scroll_position REAL NOT NULL,
      read_percentage REAL NOT NULL,
      last_read_at TEXT NOT NULL,
      total_read_time INTEGER NOT NULL,
      completed INTEGER NOT NULL
    )
  `)
  
  // Drafts table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS drafts (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      path TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      metadata TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      auto_saved INTEGER NOT NULL
    )
  `)
  
  // Bookmarks table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS bookmarks (
      id TEXT PRIMARY KEY,
      path TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      excerpt TEXT,
      tags TEXT,
      created_at TEXT NOT NULL
    )
  `)

  // ========================================================================
  // CONTENT STORAGE TABLES (Full SQLite Backend)
  // ========================================================================

  // Fabrics table (entire knowledge repository)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS fabrics (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      github_owner TEXT,
      github_repo TEXT,
      github_branch TEXT DEFAULT 'main',
      last_sync_at TEXT,
      sync_hash TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)

  // Weaves table (top-level knowledge universes)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS weaves (
      id TEXT PRIMARY KEY,
      fabric_id TEXT NOT NULL,
      slug TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      path TEXT NOT NULL UNIQUE,
      strand_count INTEGER DEFAULT 0,
      loom_count INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (fabric_id) REFERENCES fabrics(id) ON DELETE CASCADE
    )
  `)
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_weaves_fabric ON weaves(fabric_id)`)
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_weaves_path ON weaves(path)`)

  // Looms table (subdirectories within weaves)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS looms (
      id TEXT PRIMARY KEY,
      weave_id TEXT NOT NULL,
      parent_loom_id TEXT,
      slug TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      path TEXT NOT NULL UNIQUE,
      depth INTEGER NOT NULL DEFAULT 1,
      strand_count INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (weave_id) REFERENCES weaves(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_loom_id) REFERENCES looms(id) ON DELETE CASCADE
    )
  `)
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_looms_weave ON looms(weave_id)`)
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_looms_parent ON looms(parent_loom_id)`)
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_looms_path ON looms(path)`)

  // Strands table (individual markdown documents)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS strands (
      id TEXT PRIMARY KEY,
      weave_id TEXT NOT NULL,
      loom_id TEXT,
      slug TEXT NOT NULL,
      title TEXT NOT NULL,
      path TEXT NOT NULL UNIQUE,
      content TEXT NOT NULL,
      content_hash TEXT,
      word_count INTEGER DEFAULT 0,
      frontmatter TEXT,
      version TEXT,
      difficulty TEXT,
      status TEXT DEFAULT 'published',
      subjects TEXT,
      topics TEXT,
      tags TEXT,
      prerequisites TEXT,
      strand_references TEXT,
      summary TEXT,
      github_sha TEXT,
      github_url TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_indexed_at TEXT,
      FOREIGN KEY (weave_id) REFERENCES weaves(id) ON DELETE CASCADE,
      FOREIGN KEY (loom_id) REFERENCES looms(id) ON DELETE SET NULL
    )
  `)
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_strands_weave ON strands(weave_id)`)
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_strands_loom ON strands(loom_id)`)
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_strands_path ON strands(path)`)
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_strands_status ON strands(status)`)

  // Sync status table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS sync_status (
      id TEXT PRIMARY KEY DEFAULT 'main',
      last_full_sync TEXT,
      last_incremental_sync TEXT,
      remote_tree_sha TEXT,
      local_version INTEGER DEFAULT 1,
      pending_changes INTEGER DEFAULT 0,
      sync_errors TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)

  // Settings table (key-value store for app settings like license)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)

  // Glossary cache table (cached NLP/LLM-generated glossaries)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS glossary_cache (
      content_hash TEXT PRIMARY KEY,
      glossary_data TEXT NOT NULL,
      generation_method TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT,
      version INTEGER DEFAULT 1
    )
  `)
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_glossary_cache_expires ON glossary_cache(expires_at)`)

  // Flashcard generation cache (cached NLP/LLM-generated flashcards)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS flashcard_cache (
      content_hash TEXT PRIMARY KEY,
      strand_slug TEXT NOT NULL,
      flashcard_data TEXT NOT NULL,
      generation_method TEXT NOT NULL,
      card_count INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT,
      version INTEGER DEFAULT 1
    )
  `)
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_flashcard_cache_expires ON flashcard_cache(expires_at)`)
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_flashcard_cache_strand ON flashcard_cache(strand_slug)`)

  // Quiz generation cache (cached NLP/LLM-generated quiz questions)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS quiz_cache (
      content_hash TEXT PRIMARY KEY,
      quiz_data TEXT NOT NULL,
      generation_method TEXT NOT NULL,
      question_count INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT,
      version INTEGER DEFAULT 1
    )
  `)
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_quiz_cache_expires ON quiz_cache(expires_at)`)

  // ========================================================================
  // USER EDITS TABLES (for inline editing of generated content)
  // ========================================================================

  // Glossary user edits (stores user modifications to auto-generated glossary terms)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS codex_glossary_edits (
      id TEXT PRIMARY KEY,
      content_hash TEXT NOT NULL,
      strand_slug TEXT,
      original_term TEXT NOT NULL,
      edited_term TEXT,
      edited_definition TEXT,
      is_deleted INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(content_hash, strand_slug)
    )
  `)
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_glossary_edits_strand ON codex_glossary_edits(strand_slug)`)
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_glossary_edits_hash ON codex_glossary_edits(content_hash)`)
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_glossary_edits_deleted ON codex_glossary_edits(is_deleted)`)

  // Quiz user edits (stores user modifications to auto-generated quiz questions)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS codex_quiz_edits (
      id TEXT PRIMARY KEY,
      original_question_id TEXT NOT NULL UNIQUE,
      cache_key TEXT,
      edited_question TEXT,
      edited_answer TEXT,
      edited_options TEXT,
      edited_explanation TEXT,
      is_deleted INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_quiz_edits_question ON codex_quiz_edits(original_question_id)`)
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_quiz_edits_cache ON codex_quiz_edits(cache_key)`)
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_quiz_edits_deleted ON codex_quiz_edits(is_deleted)`)

  // ========================================================================
  // BLOCK-LEVEL TAGGING TABLES (Phase 9)
  // ========================================================================

  // Strand blocks table (individual blocks within strands with tags and metadata)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS strand_blocks (
      id TEXT PRIMARY KEY,
      strand_id TEXT NOT NULL,
      strand_path TEXT NOT NULL,
      block_id TEXT NOT NULL,
      block_type TEXT NOT NULL,
      heading_level INTEGER,
      heading_slug TEXT,
      start_line INTEGER NOT NULL,
      end_line INTEGER NOT NULL,
      raw_content TEXT,
      extractive_summary TEXT,
      tags TEXT,
      suggested_tags TEXT,
      worthiness_score REAL,
      worthiness_signals TEXT,
      warrants_illustration INTEGER DEFAULT 0,
      source_file TEXT,
      source_url TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (strand_id) REFERENCES strands(id) ON DELETE CASCADE,
      UNIQUE(strand_path, block_id)
    )
  `)
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_strand_blocks_strand ON strand_blocks(strand_id)`)
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_strand_blocks_path ON strand_blocks(strand_path)`)
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_strand_blocks_type ON strand_blocks(block_type)`)
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_strand_blocks_tags ON strand_blocks(tags)`)

  // Block references for transclusion (Phase 9 Extension)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS block_references (
      id TEXT PRIMARY KEY,
      source_block_id TEXT NOT NULL,
      source_strand_path TEXT NOT NULL,
      target_strand_path TEXT NOT NULL,
      target_position INTEGER NOT NULL,
      reference_type TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (source_block_id) REFERENCES strand_blocks(id) ON DELETE CASCADE
    )
  `)
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_block_refs_source ON block_references(source_block_id)`)
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_block_refs_target ON block_references(target_strand_path)`)

  // Block backlinks (auto-computed for transclusion)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS block_backlinks (
      id TEXT PRIMARY KEY,
      block_id TEXT NOT NULL,
      referencing_strand_path TEXT NOT NULL,
      referencing_block_id TEXT,
      context_snippet TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (block_id) REFERENCES strand_blocks(id) ON DELETE CASCADE
    )
  `)
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_backlinks_block ON block_backlinks(block_id)`)

  // Supertag schemas (Phase 9 Extension)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS supertag_schemas (
      id TEXT PRIMARY KEY,
      tag_name TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      icon TEXT,
      color TEXT,
      description TEXT,
      fields TEXT NOT NULL,
      extends TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)

  // Supertag field values (Phase 9 Extension)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS supertag_field_values (
      id TEXT PRIMARY KEY,
      block_id TEXT NOT NULL,
      supertag_id TEXT NOT NULL,
      field_name TEXT NOT NULL,
      field_value TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (block_id) REFERENCES strand_blocks(id) ON DELETE CASCADE,
      FOREIGN KEY (supertag_id) REFERENCES supertag_schemas(id) ON DELETE CASCADE,
      UNIQUE(block_id, supertag_id, field_name)
    )
  `)
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_field_values_block ON supertag_field_values(block_id)`)
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_field_values_supertag ON supertag_field_values(supertag_id)`)
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_field_values_field ON supertag_field_values(field_name)`)

  // Saved queries (Phase 9 Extension)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS saved_queries (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      query_json TEXT NOT NULL,
      is_pinned INTEGER DEFAULT 0,
      folder TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)

  // ========================================================================
  // TEACH MODE TABLES (Feynman Technique)
  // ========================================================================

  // Teach sessions - complete teaching conversations
  await db.exec(`
    CREATE TABLE IF NOT EXISTS teach_sessions (
      id TEXT PRIMARY KEY,
      strand_slug TEXT NOT NULL,
      persona TEXT NOT NULL,
      transcript TEXT,
      gap_report TEXT,
      coverage_score REAL DEFAULT 0,
      duration_seconds INTEGER DEFAULT 0,
      xp_earned INTEGER DEFAULT 0,
      flashcards_generated TEXT,
      created_at TEXT NOT NULL,
      completed_at TEXT
    )
  `)
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_teach_sessions_strand ON teach_sessions(strand_slug)`)
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_teach_sessions_persona ON teach_sessions(persona)`)
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_teach_sessions_created ON teach_sessions(created_at)`)

  // Teach messages - individual messages in a teaching conversation
  await db.exec(`
    CREATE TABLE IF NOT EXISTS teach_messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      is_voice INTEGER DEFAULT 0,
      gaps TEXT,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES teach_sessions(id) ON DELETE CASCADE
    )
  `)
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_teach_messages_session ON teach_messages(session_id)`)
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_teach_messages_role ON teach_messages(role)`)

  // ========================================================================
  // PLANNER TABLES (Calendar, Tasks, Google Calendar Sync)
  // ========================================================================

  // Planner tasks - standalone, linked, and embedded tasks
  await db.exec(`
    CREATE TABLE IF NOT EXISTS planner_tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      task_type TEXT NOT NULL DEFAULT 'standalone',
      strand_path TEXT,
      source_line_number INTEGER,
      checkbox_text TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      priority TEXT DEFAULT 'medium',
      due_date TEXT,
      due_time TEXT,
      reminder_at TEXT,
      completed_at TEXT,
      recurrence_rule TEXT,
      recurrence_end_date TEXT,
      parent_task_id TEXT,
      tags TEXT,
      project TEXT,
      google_event_id TEXT UNIQUE,
      google_calendar_id TEXT,
      sync_status TEXT DEFAULT 'local',
      local_version INTEGER DEFAULT 1,
      remote_version INTEGER DEFAULT 0,
      last_synced_at TEXT,
      etag TEXT,
      is_deleted INTEGER DEFAULT 0,
      deleted_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (strand_path) REFERENCES strands(path) ON DELETE SET NULL,
      FOREIGN KEY (parent_task_id) REFERENCES planner_tasks(id) ON DELETE CASCADE
    )
  `)
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_planner_tasks_status ON planner_tasks(status)`)
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_planner_tasks_due_date ON planner_tasks(due_date)`)
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_planner_tasks_strand ON planner_tasks(strand_path)`)
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_planner_tasks_google ON planner_tasks(google_event_id)`)
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_planner_tasks_sync ON planner_tasks(sync_status)`)
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_planner_tasks_type ON planner_tasks(task_type)`)
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_planner_tasks_deleted ON planner_tasks(is_deleted)`)

  // Planner events - calendar events with time blocks
  await db.exec(`
    CREATE TABLE IF NOT EXISTS planner_events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      location TEXT,
      start_datetime TEXT NOT NULL,
      end_datetime TEXT NOT NULL,
      all_day INTEGER DEFAULT 0,
      timezone TEXT DEFAULT 'local',
      recurrence_rule TEXT,
      recurrence_end_date TEXT,
      parent_event_id TEXT,
      attendees TEXT,
      color TEXT,
      linked_task_id TEXT,
      strand_path TEXT,
      google_event_id TEXT UNIQUE,
      google_calendar_id TEXT,
      sync_status TEXT DEFAULT 'local',
      local_version INTEGER DEFAULT 1,
      remote_version INTEGER DEFAULT 0,
      last_synced_at TEXT,
      etag TEXT,
      is_deleted INTEGER DEFAULT 0,
      deleted_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (linked_task_id) REFERENCES planner_tasks(id) ON DELETE SET NULL,
      FOREIGN KEY (strand_path) REFERENCES strands(path) ON DELETE SET NULL,
      FOREIGN KEY (parent_event_id) REFERENCES planner_events(id) ON DELETE CASCADE
    )
  `)
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_planner_events_start ON planner_events(start_datetime)`)
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_planner_events_end ON planner_events(end_datetime)`)
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_planner_events_google ON planner_events(google_event_id)`)
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_planner_events_sync ON planner_events(sync_status)`)
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_planner_events_deleted ON planner_events(is_deleted)`)

  // Planner sync state - tracks Google Calendar sync progress
  await db.exec(`
    CREATE TABLE IF NOT EXISTS planner_sync_state (
      id TEXT PRIMARY KEY DEFAULT 'main',
      google_sync_token TEXT,
      last_full_sync_at TEXT,
      last_incremental_sync_at TEXT,
      sync_cursor TEXT,
      pending_conflicts INTEGER DEFAULT 0,
      last_conflict_at TEXT,
      total_syncs INTEGER DEFAULT 0,
      successful_syncs INTEGER DEFAULT 0,
      failed_syncs INTEGER DEFAULT 0,
      last_error TEXT,
      last_error_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)

  // Planner change log - tracks offline changes for sync
  await db.exec(`
    CREATE TABLE IF NOT EXISTS planner_change_log (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      operation TEXT NOT NULL,
      field_changes TEXT,
      sync_status TEXT DEFAULT 'pending',
      sync_attempts INTEGER DEFAULT 0,
      last_sync_attempt_at TEXT,
      sync_error TEXT,
      sequence_number INTEGER,
      created_at TEXT NOT NULL
    )
  `)
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_change_log_entity ON planner_change_log(entity_type, entity_id)`)
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_change_log_status ON planner_change_log(sync_status)`)
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_change_log_sequence ON planner_change_log(sequence_number)`)

  // Planner OAuth tokens - encrypted Google Calendar tokens
  await db.exec(`
    CREATE TABLE IF NOT EXISTS planner_oauth_tokens (
      id TEXT PRIMARY KEY DEFAULT 'google_calendar',
      provider TEXT NOT NULL,
      encrypted_access_token TEXT,
      encrypted_refresh_token TEXT,
      expires_at INTEGER,
      scope TEXT,
      token_type TEXT DEFAULT 'Bearer',
      user_email TEXT,
      user_id TEXT,
      selected_calendars TEXT,
      primary_calendar_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_used_at TEXT
    )
  `)

  // Planner calendars - cached Google Calendar list
  await db.exec(`
    CREATE TABLE IF NOT EXISTS planner_calendars (
      id TEXT PRIMARY KEY,
      google_calendar_id TEXT UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      color TEXT,
      is_primary INTEGER DEFAULT 0,
      is_selected INTEGER DEFAULT 0,
      access_role TEXT,
      last_synced_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_calendars_google ON planner_calendars(google_calendar_id)`)
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_calendars_selected ON planner_calendars(is_selected)`)

  // ========================================================================
  // AUDIT LOGGING & UNDO/REDO TABLES
  // ========================================================================
  await initAuditSchema(db)

  console.log('[CodexDB] Schema initialized (including content tables, teach mode, and audit)')
}

// ============================================================================
// EMBEDDINGS API (for offline semantic search)
// ============================================================================

/**
 * Store an embedding for semantic search
 */
export async function storeEmbedding(record: EmbeddingRecord): Promise<boolean> {
  const database = await getDatabase()
  if (!database) return false
  
  try {
    await database.run(
      `INSERT INTO embeddings (id, path, title, content, content_type, embedding, weave, loom, tags, last_modified, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         path = excluded.path,
         title = excluded.title,
         content = excluded.content,
         content_type = excluded.content_type,
         embedding = excluded.embedding,
         weave = excluded.weave,
         loom = excluded.loom,
         tags = excluded.tags,
         last_modified = excluded.last_modified`,
      [
        record.id,
        record.path,
        record.title,
        record.content,
        record.contentType,
        JSON.stringify(record.embedding),
        record.weave || null,
        record.loom || null,
        record.tags ? JSON.stringify(record.tags) : null,
        record.lastModified || null,
        record.createdAt
      ]
    )
    return true
  } catch (error) {
    console.error('[CodexDB] Failed to store embedding:', error)
    return false
  }
}

/**
 * Get all embeddings for semantic search
 */
export async function getAllEmbeddings(): Promise<EmbeddingRecord[]> {
  const database = await getDatabase()
  if (!database) return []
  
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await database.all('SELECT * FROM embeddings') as any[] | null
    
    return (rows || []).map((row: {
      id: string
      path: string
      title: string
      content: string
      content_type: string
      embedding: string
      weave: string | null
      loom: string | null
      tags: string | null
      last_modified: string | null
      created_at: string
    }) => ({
      id: row.id,
      path: row.path,
      title: row.title,
      content: row.content,
      contentType: row.content_type as EmbeddingRecord['contentType'],
      embedding: JSON.parse(row.embedding),
      weave: row.weave || undefined,
      loom: row.loom || undefined,
      tags: row.tags ? JSON.parse(row.tags) : undefined,
      lastModified: row.last_modified || undefined,
      createdAt: row.created_at
    }))
  } catch (error) {
    console.error('[CodexDB] Failed to get embeddings:', error)
    return []
  }
}

/**
 * Get embedding count
 */
export async function getEmbeddingCount(): Promise<number> {
  const database = await getDatabase()
  if (!database) return 0
  
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await database.all('SELECT COUNT(*) as count FROM embeddings') as any[]
    return rows?.[0]?.count || 0
  } catch {
    return 0
  }
}

/**
 * Clear all embeddings (for re-indexing)
 */
export async function clearEmbeddings(): Promise<boolean> {
  const database = await getDatabase()
  if (!database) return false
  
  try {
    await database.run('DELETE FROM embeddings')
    return true
  } catch (error) {
    console.error('[CodexDB] Failed to clear embeddings:', error)
    return false
  }
}

// ============================================================================
// SEARCH HISTORY API
// ============================================================================

/**
 * Record a search query
 */
export async function recordSearch(query: string, resultCount: number): Promise<string | null> {
  const database = await getDatabase()
  if (!database) return null
  
  const id = `search_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  
  try {
    await database.run(
      `INSERT INTO search_history (id, query, result_count, timestamp)
       VALUES (?, ?, ?, ?)`,
      [id, query, resultCount, new Date().toISOString()]
    )
    
    // Keep only last 100 searches
    await database.run(
      `DELETE FROM search_history WHERE id NOT IN (
        SELECT id FROM search_history ORDER BY timestamp DESC LIMIT 100
      )`
    )
    
    return id
  } catch (error) {
    console.error('[CodexDB] Failed to record search:', error)
    return null
  }
}

/**
 * Record which result was clicked
 */
export async function recordSearchClick(searchId: string, clickedPath: string): Promise<boolean> {
  const database = await getDatabase()
  if (!database) return false
  
  try {
    await database.run(
      'UPDATE search_history SET clicked_path = ? WHERE id = ?',
      [clickedPath, searchId]
    )
    return true
  } catch {
    return false
  }
}

/**
 * Get recent searches
 */
export async function getRecentSearches(limit: number = 10): Promise<SearchHistoryRecord[]> {
  const database = await getDatabase()
  if (!database) return []
  
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await database.all(
      'SELECT * FROM search_history ORDER BY timestamp DESC LIMIT ?',
      [limit]
    ) as any[]
    
    return (rows || []).map(row => ({
      id: row.id,
      query: row.query,
      resultCount: row.result_count,
      clickedPath: row.clicked_path || undefined,
      timestamp: row.timestamp
    }))
  } catch {
    return []
  }
}

/**
 * Get popular searches (by frequency)
 */
export async function getPopularSearches(limit: number = 5): Promise<Array<{ query: string; count: number }>> {
  const database = await getDatabase()
  if (!database) return []
  
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await database.all(
      `SELECT query, COUNT(*) as count 
       FROM search_history 
       GROUP BY query 
       ORDER BY count DESC 
       LIMIT ?`,
      [limit]
    ) as any[]
    return rows || []
  } catch {
    return []
  }
}

// ============================================================================
// READING PROGRESS API
// ============================================================================

/**
 * Save reading progress for a strand
 */
export async function saveReadingProgress(progress: ReadingProgressRecord): Promise<boolean> {
  const database = await getDatabase()
  if (!database) return false
  
  try {
    await database.run(
      `INSERT INTO reading_progress (path, scroll_position, read_percentage, last_read_at, total_read_time, completed)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(path) DO UPDATE SET
         scroll_position = excluded.scroll_position,
         read_percentage = excluded.read_percentage,
         last_read_at = excluded.last_read_at,
         total_read_time = reading_progress.total_read_time + excluded.total_read_time,
         completed = excluded.completed`,
      [
        progress.path,
        progress.scrollPosition,
        progress.readPercentage,
        progress.lastReadAt,
        progress.totalReadTime,
        progress.completed ? 1 : 0
      ]
    )
    return true
  } catch (error) {
    console.error('[CodexDB] Failed to save reading progress:', error)
    return false
  }
}

/**
 * Get reading progress for a strand
 */
export async function getReadingProgress(path: string): Promise<ReadingProgressRecord | null> {
  const database = await getDatabase()
  if (!database) return null
  
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await database.all(
      'SELECT * FROM reading_progress WHERE path = ?',
      [path]
    ) as any[]
    
    if (!rows || rows.length === 0) return null
    
    const row = rows[0]
    return {
      path: row.path,
      scrollPosition: row.scroll_position,
      readPercentage: row.read_percentage,
      lastReadAt: row.last_read_at,
      totalReadTime: row.total_read_time,
      completed: row.completed === 1
    }
  } catch {
    return null
  }
}

/**
 * Get recently read strands
 */
export async function getRecentlyRead(limit: number = 10): Promise<ReadingProgressRecord[]> {
  const database = await getDatabase()
  if (!database) return []
  
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await database.all(
      'SELECT * FROM reading_progress ORDER BY last_read_at DESC LIMIT ?',
      [limit]
    ) as any[]
    
    return (rows || []).map(row => ({
      path: row.path,
      scrollPosition: row.scroll_position,
      readPercentage: row.read_percentage,
      lastReadAt: row.last_read_at,
      totalReadTime: row.total_read_time,
      completed: row.completed === 1
    }))
  } catch {
    return []
  }
}

// ============================================================================
// DRAFTS API
// ============================================================================

/**
 * Save a draft
 */
export async function saveDraft(draft: Omit<DraftRecord, 'createdAt' | 'updatedAt'>): Promise<boolean> {
  const database = await getDatabase()
  if (!database) return false
  
  const now = new Date().toISOString()
  
  try {
    await database.run(
      `INSERT INTO drafts (id, type, path, title, content, metadata, created_at, updated_at, auto_saved)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         type = excluded.type,
         path = excluded.path,
         title = excluded.title,
         content = excluded.content,
         metadata = excluded.metadata,
         updated_at = excluded.updated_at,
         auto_saved = excluded.auto_saved`,
      [
        draft.id,
        draft.type,
        draft.path,
        draft.title,
        draft.content,
        draft.metadata,
        now,
        now,
        draft.autoSaved ? 1 : 0
      ]
    )
    return true
  } catch (error) {
    console.error('[CodexDB] Failed to save draft:', error)
    return false
  }
}

/**
 * Get a draft by ID
 */
export async function getDraft(id: string): Promise<DraftRecord | null> {
  const database = await getDatabase()
  if (!database) return null
  
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await database.all(
      'SELECT * FROM drafts WHERE id = ?',
      [id]
    ) as any[]
    
    if (!rows || rows.length === 0) return null
    
    const row = rows[0]
    return {
      id: row.id,
      type: row.type as DraftRecord['type'],
      path: row.path,
      title: row.title,
      content: row.content,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      autoSaved: row.auto_saved === 1
    }
  } catch {
    return null
  }
}

/**
 * Get all drafts
 */
export async function getAllDrafts(): Promise<DraftRecord[]> {
  const database = await getDatabase()
  if (!database) return []
  
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await database.all(
      'SELECT * FROM drafts ORDER BY updated_at DESC'
    ) as any[]
    
    return (rows || []).map(row => ({
      id: row.id,
      type: row.type as DraftRecord['type'],
      path: row.path,
      title: row.title,
      content: row.content,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      autoSaved: row.auto_saved === 1
    }))
  } catch {
    return []
  }
}

/**
 * Delete a draft
 */
export async function deleteDraft(id: string): Promise<boolean> {
  const database = await getDatabase()
  if (!database) return false
  
  try {
    await database.run('DELETE FROM drafts WHERE id = ?', [id])
    return true
  } catch {
    return false
  }
}

// ============================================================================
// BOOKMARKS API
// ============================================================================

/**
 * Add a bookmark
 */
export async function addBookmark(bookmark: Omit<BookmarkRecord, 'id' | 'createdAt'>): Promise<string | null> {
  const database = await getDatabase()
  if (!database) return null
  
  const id = `bm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  
  try {
    await database.run(
      `INSERT INTO bookmarks (id, path, title, excerpt, tags, created_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(path) DO UPDATE SET
         title = excluded.title,
         excerpt = excluded.excerpt,
         tags = excluded.tags`,
      [
        id,
        bookmark.path,
        bookmark.title,
        bookmark.excerpt || null,
        bookmark.tags ? JSON.stringify(bookmark.tags) : null,
        new Date().toISOString()
      ]
    )
    return id
  } catch (error) {
    console.error('[CodexDB] Failed to add bookmark:', error)
    return null
  }
}

/**
 * Remove a bookmark
 */
export async function removeBookmark(path: string): Promise<boolean> {
  const database = await getDatabase()
  if (!database) return false
  
  try {
    await database.run('DELETE FROM bookmarks WHERE path = ?', [path])
    return true
  } catch {
    return false
  }
}

/**
 * Check if path is bookmarked
 */
export async function isBookmarked(path: string): Promise<boolean> {
  const database = await getDatabase()
  if (!database) return false
  
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await database.all(
      'SELECT COUNT(*) as count FROM bookmarks WHERE path = ?',
      [path]
    ) as any[]
    return (rows?.[0]?.count || 0) > 0
  } catch {
    return false
  }
}

/**
 * Get all bookmarks
 */
export async function getAllBookmarks(): Promise<BookmarkRecord[]> {
  const database = await getDatabase()
  if (!database) return []
  
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await database.all(
      'SELECT * FROM bookmarks ORDER BY created_at DESC'
    ) as any[]
    
    return (rows || []).map(row => ({
      id: row.id,
      path: row.path,
      title: row.title,
      excerpt: row.excerpt || undefined,
      tags: row.tags ? JSON.parse(row.tags) : undefined,
      createdAt: row.created_at
    }))
  } catch {
    return []
  }
}

// ============================================================================
// DATABASE UTILITIES
// ============================================================================

/**
 * Get database statistics
 */
export async function getDatabaseStats(): Promise<DatabaseStats> {
  const database = await getDatabase()
  if (!database) {
    return {
      embeddings: 0,
      searchHistory: 0,
      readingProgress: 0,
      drafts: 0,
      bookmarks: 0,
      totalSizeKB: 0
    }
  }
  
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [embeddings, searches, progress, drafts, bookmarks] = await Promise.all([
      database.all('SELECT COUNT(*) as count FROM embeddings') as Promise<any[]>,
      database.all('SELECT COUNT(*) as count FROM search_history') as Promise<any[]>,
      database.all('SELECT COUNT(*) as count FROM reading_progress') as Promise<any[]>,
      database.all('SELECT COUNT(*) as count FROM drafts') as Promise<any[]>,
      database.all('SELECT COUNT(*) as count FROM bookmarks') as Promise<any[]>,
    ])
    
    // Estimate size (rough)
    const allEmbeddings = await getAllEmbeddings()
    const embeddingSize = JSON.stringify(allEmbeddings).length / 1024
    
    return {
      embeddings: embeddings?.[0]?.count || 0,
      searchHistory: searches?.[0]?.count || 0,
      readingProgress: progress?.[0]?.count || 0,
      drafts: drafts?.[0]?.count || 0,
      bookmarks: bookmarks?.[0]?.count || 0,
      totalSizeKB: Math.round(embeddingSize)
    }
  } catch {
    return {
      embeddings: 0,
      searchHistory: 0,
      readingProgress: 0,
      drafts: 0,
      bookmarks: 0,
      totalSizeKB: 0
    }
  }
}

/**
 * Clear all database data
 */
export async function clearAllData(): Promise<boolean> {
  const database = await getDatabase()
  if (!database) return false
  
  try {
    await database.run('DELETE FROM embeddings')
    await database.run('DELETE FROM search_history')
    await database.run('DELETE FROM reading_progress')
    await database.run('DELETE FROM drafts')
    await database.run('DELETE FROM bookmarks')
    console.log('[CodexDB] All data cleared')
    return true
  } catch (error) {
    console.error('[CodexDB] Failed to clear data:', error)
    return false
  }
}

// ============================================================================
// APP SETTINGS API (for vault configuration, first-launch, etc.)
// ============================================================================

/**
 * Get a setting value by key
 */
export async function getSetting(key: string): Promise<string | null> {
  const database = await getDatabase()
  if (!database) return null

  try {
    const rows = await database.all(
      'SELECT value FROM settings WHERE key = ?',
      [key]
    ) as Array<{ value: string }> | null

    return rows?.[0]?.value ?? null
  } catch {
    return null
  }
}

/**
 * Set a setting value
 */
export async function setSetting(key: string, value: string): Promise<boolean> {
  const database = await getDatabase()
  if (!database) return false

  try {
    await database.run(
      `INSERT INTO settings (key, value, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET
         value = excluded.value,
         updated_at = excluded.updated_at`,
      [key, value, new Date().toISOString()]
    )
    return true
  } catch (error) {
    console.error('[CodexDB] Failed to set setting:', error)
    return false
  }
}

/**
 * Delete a setting
 */
export async function deleteSetting(key: string): Promise<boolean> {
  const database = await getDatabase()
  if (!database) return false

  try {
    await database.run('DELETE FROM settings WHERE key = ?', [key])
    return true
  } catch {
    return false
  }
}

/**
 * Check if first-launch setup has been completed
 */
export async function isFirstLaunchCompleted(): Promise<boolean> {
  const value = await getSetting('firstLaunchCompleted')
  return value === 'true'
}

/**
 * Mark first-launch setup as completed
 */
export async function setFirstLaunchCompleted(completed: boolean): Promise<boolean> {
  return setSetting('firstLaunchCompleted', completed ? 'true' : 'false')
}

/**
 * Get the stored vault path (display only, not for file access)
 */
export async function getVaultPath(): Promise<string | null> {
  return getSetting('vaultPath')
}

/**
 * Set the vault path (display only)
 */
export async function setVaultPath(path: string): Promise<boolean> {
  return setSetting('vaultPath', path)
}

/**
 * Get the vault name
 */
export async function getVaultName(): Promise<string | null> {
  return getSetting('vaultName')
}

/**
 * Set the vault name
 */
export async function setVaultName(name: string): Promise<boolean> {
  return setSetting('vaultName', name)
}

// ============================================================================
// DATABASE EXPORT/IMPORT
// ============================================================================

/**
 * Export all database data
 */
export async function exportDatabase(): Promise<{
  version: number
  exportedAt: string
  embeddings: EmbeddingRecord[]
  searchHistory: SearchHistoryRecord[]
  readingProgress: ReadingProgressRecord[]
  drafts: DraftRecord[]
  bookmarks: BookmarkRecord[]
}> {
  const [embeddings, searchHistory, readingProgress, drafts, bookmarks] = await Promise.all([
    getAllEmbeddings(),
    getRecentSearches(1000),
    getRecentlyRead(1000),
    getAllDrafts(),
    getAllBookmarks()
  ])
  
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    embeddings,
    searchHistory,
    readingProgress,
    drafts,
    bookmarks
  }
}

