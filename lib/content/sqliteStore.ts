/**
 * SQLite Content Store
 *
 * Full offline content storage using SQLite via @framers/sql-storage-adapter.
 * Stores all Quarry Codex content locally for offline access.
 *
 * Supports hybrid mode: markdown files in external vault folder with
 * metadata/indexes in SQLite. This ensures content survives app uninstall.
 *
 * @module lib/content/sqliteStore
 */

import { getDatabase } from '../codexDatabase'
import {
  checkVaultStatus,
  readVaultFile,
  writeVaultFile,
  getStoredVaultHandle,
  requestVaultPermission,
  type VaultConfig,
} from '../vault'
import type {
  ContentStore,
  ContentSource,
  KnowledgeTreeNode,
  StrandContent,
  StrandMetadata,
  SearchResult,
  SearchOptions,
  SemanticSearchOptions,
  SyncOptions,
  SyncResult,
  SyncProgress,
} from './types'

// ============================================================================
// SQLITE CONTENT STORE IMPLEMENTATION
// ============================================================================

export class SQLiteContentStore implements ContentStore {
  private initialized = false
  private lastSync: Date | null = null
  private vaultHandle: FileSystemDirectoryHandle | null = null
  private vaultConfig: VaultConfig | null = null
  private vaultReady = false

  // ==========================================================================
  // Lifecycle
  // ==========================================================================

  async initialize(): Promise<void> {
    if (this.initialized) return

    const db = await getDatabase()
    if (!db) {
      throw new Error('Database not available')
    }

    // Load sync status
    const status = await this.getSyncStatus()
    this.lastSync = status.lastSync

    // Check vault status for hybrid mode
    try {
      const vaultStatus = await checkVaultStatus()
      if (vaultStatus.status === 'ready' && vaultStatus.handle && vaultStatus.config) {
        this.vaultHandle = vaultStatus.handle
        this.vaultConfig = vaultStatus.config
        this.vaultReady = true
        console.log('[SQLiteStore] Vault connected:', vaultStatus.config.name)
      } else {
        console.log('[SQLiteStore] Vault not available, using IndexedDB only')
      }
    } catch (error) {
      console.warn('[SQLiteStore] Failed to check vault status:', error)
    }

    this.initialized = true
    console.log('[SQLiteStore] Initialized (hybrid mode:', this.vaultReady, ')')
  }

  /**
   * Check if vault is available for hybrid storage
   */
  isVaultReady(): boolean {
    return this.vaultReady && this.vaultHandle !== null
  }

  /**
   * Attempt to reconnect to vault (e.g., after permission grant)
   */
  async reconnectVault(): Promise<boolean> {
    try {
      const handle = await getStoredVaultHandle()
      if (!handle) return false

      const granted = await requestVaultPermission(handle)
      if (granted) {
        const vaultStatus = await checkVaultStatus()
        if (vaultStatus.status === 'ready' && vaultStatus.config) {
          this.vaultHandle = handle
          this.vaultConfig = vaultStatus.config
          this.vaultReady = true
          console.log('[SQLiteStore] Vault reconnected')
          return true
        }
      }
      return false
    } catch (error) {
      console.error('[SQLiteStore] Failed to reconnect vault:', error)
      return false
    }
  }

  async close(): Promise<void> {
    this.initialized = false
  }

  // ==========================================================================
  // Source Information
  // ==========================================================================

  getSource(): ContentSource {
    return {
      type: 'sqlite',
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      lastSync: this.lastSync,
      pendingChanges: 0,
    }
  }

  isOffline(): boolean {
    return true // SQLite store is always offline-capable
  }

  canSync(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : false
  }

  // ==========================================================================
  // Content Retrieval
  // ==========================================================================

  async getKnowledgeTree(): Promise<KnowledgeTreeNode[]> {
    const db = await getDatabase()
    if (!db) return []

    try {
      // Get all weaves
      const weaves = await db.all(`
        SELECT w.*, COUNT(s.id) as strand_count
        FROM weaves w
        LEFT JOIN strands s ON s.weave_id = w.id AND s.status = 'published'
        GROUP BY w.id
        ORDER BY w.sort_order, w.name
      `) as Array<{
        id: string
        slug: string
        name: string
        description: string | null
        path: string
        strand_count: number
      }>

      // Get all looms
      const looms = await db.all(`
        SELECT l.*, COUNT(s.id) as strand_count
        FROM looms l
        LEFT JOIN strands s ON s.loom_id = l.id AND s.status = 'published'
        GROUP BY l.id
        ORDER BY l.sort_order, l.name
      `) as Array<{
        id: string
        weave_id: string
        parent_loom_id: string | null
        slug: string
        name: string
        description: string | null
        path: string
        depth: number
        strand_count: number
      }>

      // Get all strands (basic info only)
      const strands = await db.all(`
        SELECT id, slug, title, path, weave_id, loom_id, difficulty, status, tags
        FROM strands
        WHERE status = 'published'
        ORDER BY title
      `) as Array<{
        id: string
        slug: string
        title: string
        path: string
        weave_id: string
        loom_id: string | null
        difficulty: string | null
        status: string
        tags: string | null
      }>

      // Build tree structure
      return this.buildTree(weaves || [], looms || [], strands || [])
    } catch (error) {
      console.error('[SQLiteStore] Failed to get knowledge tree:', error)
      return []
    }
  }

  private buildTree(
    weaves: Array<{ id: string; slug: string; name: string; description: string | null; path: string; strand_count: number }>,
    looms: Array<{ id: string; weave_id: string; parent_loom_id: string | null; slug: string; name: string; description: string | null; path: string; depth: number; strand_count: number }>,
    strands: Array<{ id: string; slug: string; title: string; path: string; weave_id: string; loom_id: string | null; difficulty: string | null; status: string; tags: string | null }>
  ): KnowledgeTreeNode[] {
    // Build strand nodes
    const strandNodes = new Map<string, KnowledgeTreeNode>()
    for (const strand of strands) {
      strandNodes.set(strand.id, {
        id: strand.id,
        type: 'strand',
        slug: strand.slug,
        name: strand.title,
        path: strand.path,
        metadata: {
          difficulty: strand.difficulty || undefined,
          status: strand.status,
          tags: strand.tags ? JSON.parse(strand.tags) : undefined,
        },
      })
    }

    // Build loom nodes with children
    const loomNodes = new Map<string, KnowledgeTreeNode>()
    const loomsByParent = new Map<string | null, typeof looms>()

    for (const loom of looms) {
      const parentKey = loom.parent_loom_id || null
      if (!loomsByParent.has(parentKey)) {
        loomsByParent.set(parentKey, [])
      }
      loomsByParent.get(parentKey)!.push(loom)
    }

    // Build loom hierarchy (depth-first)
    const buildLoomChildren = (parentId: string | null, weaveId: string): KnowledgeTreeNode[] => {
      const children: KnowledgeTreeNode[] = []
      const childLooms = loomsByParent.get(parentId)?.filter(l => l.weave_id === weaveId) || []

      for (const loom of childLooms) {
        const loomStrands = strands
          .filter(s => s.loom_id === loom.id)
          .map(s => strandNodes.get(s.id)!)
          .filter(Boolean)

        const loomChildren = buildLoomChildren(loom.id, weaveId)

        loomNodes.set(loom.id, {
          id: loom.id,
          type: 'loom',
          slug: loom.slug,
          name: loom.name,
          path: loom.path,
          description: loom.description || undefined,
          strandCount: loom.strand_count,
          children: [...loomChildren, ...loomStrands],
        })

        children.push(loomNodes.get(loom.id)!)
      }

      return children
    }

    // Build weave nodes
    const weaveNodes: KnowledgeTreeNode[] = weaves.map(weave => {
      const weaveLooms = buildLoomChildren(null, weave.id)
      const directStrands = strands
        .filter(s => s.weave_id === weave.id && !s.loom_id)
        .map(s => strandNodes.get(s.id)!)
        .filter(Boolean)

      return {
        id: weave.id,
        type: 'weave' as const,
        slug: weave.slug,
        name: weave.name,
        path: weave.path,
        description: weave.description || undefined,
        strandCount: weave.strand_count,
        children: [...weaveLooms, ...directStrands],
      }
    })

    return weaveNodes
  }

  async getStrand(path: string): Promise<StrandContent | null> {
    const db = await getDatabase()
    if (!db) return null

    try {
      // Get metadata from IndexedDB
      const rows = await db.all(`
        SELECT s.*, w.slug as weave_slug, l.slug as loom_slug
        FROM strands s
        JOIN weaves w ON w.id = s.weave_id
        LEFT JOIN looms l ON l.id = s.loom_id
        WHERE s.path = ?
      `, [path]) as Array<{
        id: string
        slug: string
        title: string
        path: string
        content: string
        frontmatter: string | null
        word_count: number
        summary: string | null
        updated_at: string
        github_url: string | null
        weave_slug: string
        loom_slug: string | null
      }>

      if (!rows || rows.length === 0) return null

      const row = rows[0]
      let content = row.content

      // Try reading content from vault if available (hybrid mode)
      if (this.vaultReady && this.vaultHandle) {
        try {
          // Convert path to vault file path (e.g., wiki/getting-started/welcome -> weaves/wiki/looms/getting-started/strands/welcome.md)
          const vaultPath = this.pathToVaultPath(path)
          const vaultContent = await readVaultFile(this.vaultHandle, vaultPath)
          if (vaultContent) {
            // Extract content without frontmatter
            const parsed = this.parseMarkdownContent(vaultContent)
            content = parsed.content
            console.log('[SQLiteStore] Read content from vault:', path)
          }
        } catch {
          // Fall back to IndexedDB content
          console.log('[SQLiteStore] Vault read failed, using IndexedDB:', path)
        }
      }

      return {
        id: row.id,
        path: row.path,
        slug: row.slug,
        title: row.title,
        content,
        frontmatter: row.frontmatter ? JSON.parse(row.frontmatter) : {},
        weave: row.weave_slug,
        loom: row.loom_slug || undefined,
        wordCount: row.word_count,
        summary: row.summary || undefined,
        lastModified: row.updated_at,
        githubUrl: row.github_url || undefined,
      }
    } catch (error) {
      console.error('[SQLiteStore] Failed to get strand:', error)
      return null
    }
  }

  /**
   * Convert a strand path to vault file path
   * e.g., wiki/getting-started/welcome -> weaves/wiki/looms/getting-started/strands/welcome.md
   */
  private pathToVaultPath(path: string): string {
    const parts = path.split('/')
    if (parts.length === 1) {
      // Just weave/strand
      return `weaves/${parts[0]}.md`
    } else if (parts.length === 2) {
      // weave/strand
      return `weaves/${parts[0]}/strands/${parts[1]}.md`
    } else {
      // weave/loom/strand or deeper
      const weave = parts[0]
      const strand = parts[parts.length - 1]
      const looms = parts.slice(1, -1).join('/looms/')
      return `weaves/${weave}/looms/${looms}/strands/${strand}.md`
    }
  }

  /**
   * Convert vault file path back to strand path
   */
  private vaultPathToPath(vaultPath: string): string {
    // Remove weaves/ prefix and .md suffix
    let path = vaultPath.replace(/^weaves\//, '').replace(/\.md$/, '')
    // Remove /strands/ segments
    path = path.replace(/\/strands\//g, '/')
    // Remove /looms/ segments
    path = path.replace(/\/looms\//g, '/')
    return path
  }

  /**
   * Parse markdown content to extract frontmatter and body
   */
  private parseMarkdownContent(content: string): { frontmatter: Record<string, unknown>; content: string } {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
    if (frontmatterMatch) {
      try {
        // Simple YAML-like parsing (for basic key: value pairs)
        const frontmatterStr = frontmatterMatch[1]
        const frontmatter: Record<string, unknown> = {}
        for (const line of frontmatterStr.split('\n')) {
          const colonIndex = line.indexOf(':')
          if (colonIndex > 0) {
            const key = line.slice(0, colonIndex).trim()
            const value = line.slice(colonIndex + 1).trim()
            frontmatter[key] = value
          }
        }
        return { frontmatter, content: frontmatterMatch[2] }
      } catch {
        return { frontmatter: {}, content }
      }
    }
    return { frontmatter: {}, content }
  }

  async getStrands(paths: string[]): Promise<StrandContent[]> {
    if (paths.length === 0) return []

    const results = await Promise.all(paths.map(p => this.getStrand(p)))
    return results.filter((s): s is StrandContent => s !== null)
  }

  async getWeaveStrands(weaveSlug: string): Promise<StrandContent[]> {
    const db = await getDatabase()
    if (!db) return []

    try {
      const rows = await db.all(`
        SELECT s.path FROM strands s
        JOIN weaves w ON w.id = s.weave_id
        WHERE w.slug = ? AND s.status = 'published'
        ORDER BY s.title
      `, [weaveSlug]) as Array<{ path: string }>

      return this.getStrands((rows || []).map(r => r.path))
    } catch {
      return []
    }
  }

  async getLoomStrands(loomPath: string): Promise<StrandContent[]> {
    const db = await getDatabase()
    if (!db) return []

    try {
      const rows = await db.all(`
        SELECT s.path FROM strands s
        JOIN looms l ON l.id = s.loom_id
        WHERE l.path = ? AND s.status = 'published'
        ORDER BY s.title
      `, [loomPath]) as Array<{ path: string }>

      return this.getStrands((rows || []).map(r => r.path))
    } catch {
      return []
    }
  }

  async getWeave(slug: string): Promise<KnowledgeTreeNode | null> {
    const db = await getDatabase()
    if (!db) return null

    try {
      const rows = await db.all(`
        SELECT * FROM weaves WHERE slug = ?
      `, [slug]) as Array<{
        id: string
        slug: string
        name: string
        description: string | null
        path: string
        strand_count: number
      }>

      if (!rows || rows.length === 0) return null

      const row = rows[0]
      return {
        id: row.id,
        type: 'weave',
        slug: row.slug,
        name: row.name,
        path: row.path,
        description: row.description || undefined,
        strandCount: row.strand_count,
      }
    } catch {
      return null
    }
  }

  async getLoom(path: string): Promise<KnowledgeTreeNode | null> {
    const db = await getDatabase()
    if (!db) return null

    try {
      const rows = await db.all(`
        SELECT * FROM looms WHERE path = ?
      `, [path]) as Array<{
        id: string
        slug: string
        name: string
        description: string | null
        path: string
        strand_count: number
      }>

      if (!rows || rows.length === 0) return null

      const row = rows[0]
      return {
        id: row.id,
        type: 'loom',
        slug: row.slug,
        name: row.name,
        path: row.path,
        description: row.description || undefined,
        strandCount: row.strand_count,
      }
    } catch {
      return null
    }
  }

  // ==========================================================================
  // Search
  // ==========================================================================

  async searchStrands(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    const db = await getDatabase()
    if (!db) return []

    const limit = options?.limit || 20
    const offset = options?.offset || 0

    try {
      // Simple LIKE search (FTS5 would be better but requires virtual table)
      const searchTerm = `%${query}%`
      let sql = `
        SELECT id, path, title, summary, tags
        FROM strands
        WHERE (title LIKE ? OR content LIKE ? OR summary LIKE ?)
          AND status = 'published'
      `
      const params: (string | number)[] = [searchTerm, searchTerm, searchTerm]

      if (options?.weave) {
        sql += ` AND weave_id = (SELECT id FROM weaves WHERE slug = ?)`
        params.push(options.weave)
      }

      if (options?.tags && options.tags.length > 0) {
        // Check if any tag matches
        sql += ` AND (${options.tags.map(() => 'tags LIKE ?').join(' OR ')})`
        params.push(...options.tags.map(t => `%"${t}"%`))
      }

      sql += ` ORDER BY title LIMIT ? OFFSET ?`
      params.push(limit, offset)

      const rows = await db.all(sql, params) as Array<{
        id: string
        path: string
        title: string
        summary: string | null
        tags: string | null
      }>

      return (rows || []).map((row, i) => ({
        docId: row.id,
        path: row.path,
        title: row.title,
        summary: row.summary || undefined,
        tags: row.tags ? JSON.parse(row.tags) : undefined,
        combinedScore: 1 - (i * 0.01), // Simple ranking by position
      }))
    } catch (error) {
      console.error('[SQLiteStore] Search failed:', error)
      return []
    }
  }

  async semanticSearch(query: string, options?: SemanticSearchOptions): Promise<SearchResult[]> {
    // Semantic search requires embeddings and cosine similarity
    // This would be implemented with the embedding store
    // For now, fall back to text search
    return this.searchStrands(query, options)
  }

  async hybridSearch(query: string, options?: SemanticSearchOptions): Promise<SearchResult[]> {
    // Hybrid search combines text and semantic
    // For now, just use text search
    return this.searchStrands(query, options)
  }

  // ==========================================================================
  // Sync Operations
  // ==========================================================================

  async sync(_options?: SyncOptions): Promise<SyncResult> {
    // Sync would be implemented by HybridContentManager
    // SQLiteStore is offline-only
    return {
      success: false,
      strandsAdded: 0,
      strandsUpdated: 0,
      strandsRemoved: 0,
      duration: 0,
      errors: ['SQLiteStore does not support sync. Use HybridContentManager.'],
    }
  }

  async checkForUpdates(): Promise<{ available: boolean; changes: number }> {
    return { available: false, changes: 0 }
  }

  async getSyncStatus(): Promise<{
    lastSync: Date | null
    pendingChanges: number
    remoteVersion: string | null
  }> {
    const db = await getDatabase()
    if (!db) {
      return { lastSync: null, pendingChanges: 0, remoteVersion: null }
    }

    try {
      const rows = await db.all(`SELECT * FROM sync_status WHERE id = 'main'`) as Array<{
        last_full_sync: string | null
        pending_changes: number
        remote_tree_sha: string | null
      }>

      if (!rows || rows.length === 0) {
        return { lastSync: null, pendingChanges: 0, remoteVersion: null }
      }

      const row = rows[0]
      return {
        lastSync: row.last_full_sync ? new Date(row.last_full_sync) : null,
        pendingChanges: row.pending_changes || 0,
        remoteVersion: row.remote_tree_sha || null,
      }
    } catch {
      return { lastSync: null, pendingChanges: 0, remoteVersion: null }
    }
  }

  // ==========================================================================
  // Write Operations
  // ==========================================================================

  async upsertFabric(fabric: {
    id: string
    name: string
    description?: string
    githubOwner?: string
    githubRepo?: string
    githubBranch?: string
  }): Promise<void> {
    const db = await getDatabase()
    if (!db) throw new Error('Database not available')

    const now = new Date().toISOString()
    await db.run(`
      INSERT INTO fabrics (id, name, description, github_owner, github_repo, github_branch, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        description = excluded.description,
        github_owner = excluded.github_owner,
        github_repo = excluded.github_repo,
        github_branch = excluded.github_branch,
        updated_at = excluded.updated_at
    `, [
      fabric.id,
      fabric.name,
      fabric.description || null,
      fabric.githubOwner || null,
      fabric.githubRepo || null,
      fabric.githubBranch || 'main',
      now,
      now,
    ])
  }

  async upsertWeave(weave: {
    id: string
    fabricId: string
    slug: string
    name: string
    description?: string
    path: string
    sortOrder?: number
  }): Promise<void> {
    const db = await getDatabase()
    if (!db) throw new Error('Database not available')

    const now = new Date().toISOString()
    await db.run(`
      INSERT INTO weaves (id, fabric_id, slug, name, description, path, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        slug = excluded.slug,
        name = excluded.name,
        description = excluded.description,
        path = excluded.path,
        sort_order = excluded.sort_order,
        updated_at = excluded.updated_at
    `, [
      weave.id,
      weave.fabricId,
      weave.slug,
      weave.name,
      weave.description || null,
      weave.path,
      weave.sortOrder || 0,
      now,
      now,
    ])
  }

  async upsertLoom(loom: {
    id: string
    weaveId: string
    parentLoomId?: string
    slug: string
    name: string
    description?: string
    path: string
    depth: number
    sortOrder?: number
  }): Promise<void> {
    const db = await getDatabase()
    if (!db) throw new Error('Database not available')

    const now = new Date().toISOString()
    await db.run(`
      INSERT INTO looms (id, weave_id, parent_loom_id, slug, name, description, path, depth, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        slug = excluded.slug,
        name = excluded.name,
        description = excluded.description,
        path = excluded.path,
        depth = excluded.depth,
        sort_order = excluded.sort_order,
        updated_at = excluded.updated_at
    `, [
      loom.id,
      loom.weaveId,
      loom.parentLoomId || null,
      loom.slug,
      loom.name,
      loom.description || null,
      loom.path,
      loom.depth,
      loom.sortOrder || 0,
      now,
      now,
    ])
  }

  async upsertStrand(strand: {
    id: string
    weaveId: string
    loomId?: string
    slug: string
    title: string
    path: string
    content: string
    frontmatter?: StrandMetadata
    summary?: string
    githubSha?: string
    githubUrl?: string
  }): Promise<void> {
    const db = await getDatabase()
    if (!db) throw new Error('Database not available')

    const now = new Date().toISOString()
    const wordCount = strand.content.split(/\s+/).filter(Boolean).length
    const contentHash = await this.hashContent(strand.content)

    // Extract metadata from frontmatter
    const fm = strand.frontmatter || {}
    const difficulty = typeof fm.difficulty === 'object'
      ? (fm.difficulty as { overall?: string }).overall
      : fm.difficulty
    const status = fm.publishing?.status || 'published'
    const subjects = fm.taxonomy?.subject ? [fm.taxonomy.subject] : []
    const topics = fm.taxonomy?.topic ? [fm.taxonomy.topic] : []
    const tags = Array.isArray(fm.tags) ? fm.tags : []

    // Write to vault filesystem if available (hybrid mode)
    if (this.vaultReady && this.vaultHandle) {
      try {
        const vaultPath = this.pathToVaultPath(strand.path)
        const markdownContent = this.buildMarkdownFile(strand.content, fm, strand.title)
        await writeVaultFile(this.vaultHandle, vaultPath, markdownContent)
        console.log('[SQLiteStore] Wrote content to vault:', strand.path)
      } catch (error) {
        console.warn('[SQLiteStore] Failed to write to vault, saving to IndexedDB only:', error)
      }
    }

    // Always save metadata (and content as backup) to IndexedDB
    await db.run(`
      INSERT INTO strands (
        id, weave_id, loom_id, slug, title, path, content, content_hash,
        word_count, frontmatter, version, difficulty, status,
        subjects, topics, tags, summary, github_sha, github_url,
        created_at, updated_at, last_indexed_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        slug = excluded.slug,
        title = excluded.title,
        path = excluded.path,
        content = excluded.content,
        content_hash = excluded.content_hash,
        word_count = excluded.word_count,
        frontmatter = excluded.frontmatter,
        version = excluded.version,
        difficulty = excluded.difficulty,
        status = excluded.status,
        subjects = excluded.subjects,
        topics = excluded.topics,
        tags = excluded.tags,
        summary = excluded.summary,
        github_sha = excluded.github_sha,
        github_url = excluded.github_url,
        updated_at = excluded.updated_at,
        last_indexed_at = excluded.last_indexed_at
    `, [
      strand.id,
      strand.weaveId,
      strand.loomId || null,
      strand.slug,
      strand.title,
      strand.path,
      strand.content,
      contentHash,
      wordCount,
      JSON.stringify(fm),
      fm.version || null,
      difficulty || null,
      status,
      JSON.stringify(subjects),
      JSON.stringify(topics),
      JSON.stringify(tags),
      strand.summary || null,
      strand.githubSha || null,
      strand.githubUrl || null,
      now,
      now,
      now,
    ])
  }

  /**
   * Build a markdown file with frontmatter
   */
  private buildMarkdownFile(content: string, frontmatter: Record<string, unknown>, title: string): string {
    const lines: string[] = ['---']

    // Add title
    lines.push(`title: "${title.replace(/"/g, '\\"')}"`)

    // Add other frontmatter fields
    for (const [key, value] of Object.entries(frontmatter)) {
      if (key === 'title') continue // Already added

      if (typeof value === 'string') {
        lines.push(`${key}: "${value.replace(/"/g, '\\"')}"`)
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        lines.push(`${key}: ${value}`)
      } else if (Array.isArray(value)) {
        lines.push(`${key}: [${value.map(v => `"${String(v).replace(/"/g, '\\"')}"`).join(', ')}]`)
      } else if (value && typeof value === 'object') {
        // Simple object serialization
        lines.push(`${key}:`)
        for (const [subKey, subValue] of Object.entries(value)) {
          if (typeof subValue === 'string') {
            lines.push(`  ${subKey}: "${subValue.replace(/"/g, '\\"')}"`)
          } else {
            lines.push(`  ${subKey}: ${JSON.stringify(subValue)}`)
          }
        }
      }
    }

    lines.push('---')
    lines.push('')
    lines.push(content)

    return lines.join('\n')
  }

  async deleteStrand(path: string): Promise<void> {
    const db = await getDatabase()
    if (!db) throw new Error('Database not available')

    await db.run(`DELETE FROM strands WHERE path = ?`, [path])
  }

  /**
   * Update strand metadata (metadata only, preserves content)
   *
   * @param path - Path to the strand file
   * @param metadata - Updated metadata
   * @param contentBody - Original content body (without frontmatter)
   */
  async updateStrandMetadata(
    path: string,
    metadata: StrandMetadata,
    contentBody: string
  ): Promise<void> {
    const db = await getDatabase()
    if (!db) throw new Error('Database not available')

    const now = new Date().toISOString()

    // Extract indexed fields from metadata
    const difficulty = typeof metadata.difficulty === 'object'
      ? (metadata.difficulty as { overall?: number }).overall
      : metadata.difficulty
    const status = metadata.publishing?.status || 'published'
    const subjects = metadata.taxonomy?.subjects || (metadata.taxonomy?.subject ? [metadata.taxonomy.subject] : [])
    const topics = metadata.taxonomy?.topics || (metadata.taxonomy?.topic ? [metadata.taxonomy.topic] : [])
    const tags = Array.isArray(metadata.tags) ? metadata.tags : []

    // Update in database
    await db.run(`
      UPDATE strands SET
        slug = ?,
        title = ?,
        frontmatter = ?,
        version = ?,
        difficulty = ?,
        status = ?,
        subjects = ?,
        topics = ?,
        tags = ?,
        summary = ?,
        updated_at = ?
      WHERE path = ?
    `, [
      metadata.slug || path.split('/').pop()?.replace('.md', '') || 'untitled',
      metadata.title || 'Untitled',
      JSON.stringify(metadata),
      metadata.version || null,
      difficulty !== undefined ? String(difficulty) : null,
      status,
      JSON.stringify(subjects),
      JSON.stringify(topics),
      JSON.stringify(tags),
      metadata.summary || null,
      now,
      path,
    ])

    // Write to vault if available (hybrid mode)
    if (this.vaultReady && this.vaultHandle) {
      try {
        const { buildMarkdownWithFrontmatter } = await import('./saveStrandMetadata')
        const vaultPath = this.pathToVaultPath(path)
        const markdownContent = buildMarkdownWithFrontmatter(metadata, contentBody)
        await writeVaultFile(this.vaultHandle, vaultPath, markdownContent)
        console.log('[SQLiteStore] Updated metadata in vault:', path)
      } catch (error) {
        console.warn('[SQLiteStore] Failed to update vault file:', error)
      }
    }

    console.log('[SQLiteStore] Updated strand metadata:', path)
  }

  async updateSyncStatus(status: {
    lastFullSync?: string
    lastIncrementalSync?: string
    remoteTreeSha?: string
    pendingChanges?: number
  }): Promise<void> {
    const db = await getDatabase()
    if (!db) throw new Error('Database not available')

    const now = new Date().toISOString()

    // Upsert sync status
    await db.run(`
      INSERT INTO sync_status (id, last_full_sync, last_incremental_sync, remote_tree_sha, pending_changes, created_at, updated_at)
      VALUES ('main', ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        last_full_sync = COALESCE(excluded.last_full_sync, sync_status.last_full_sync),
        last_incremental_sync = COALESCE(excluded.last_incremental_sync, sync_status.last_incremental_sync),
        remote_tree_sha = COALESCE(excluded.remote_tree_sha, sync_status.remote_tree_sha),
        pending_changes = COALESCE(excluded.pending_changes, sync_status.pending_changes),
        updated_at = excluded.updated_at
    `, [
      status.lastFullSync || null,
      status.lastIncrementalSync || null,
      status.remoteTreeSha || null,
      status.pendingChanges ?? 0,
      now,
      now,
    ])

    this.lastSync = status.lastFullSync ? new Date(status.lastFullSync) : this.lastSync
  }

  // ==========================================================================
  // Embedding Operations
  // ==========================================================================

  async storeEmbedding(
    id: string,
    strandId: string,
    embedding: Float32Array,
    chunkType: 'strand' | 'section' | 'paragraph' = 'strand'
  ): Promise<void> {
    const db = await getDatabase()
    if (!db) throw new Error('Database not available')

    // Store as base64-encoded binary for efficiency
    const base64 = this.float32ArrayToBase64(embedding)

    await db.run(`
      INSERT INTO embeddings (id, path, title, content, content_type, embedding, created_at)
      VALUES (?, ?, '', '', ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        embedding = excluded.embedding
    `, [id, strandId, chunkType, base64, new Date().toISOString()])
  }

  async getAllEmbeddings(): Promise<Array<{
    id: string
    strandId: string
    embedding: Float32Array
  }>> {
    const db = await getDatabase()
    if (!db) return []

    try {
      const rows = await db.all(`
        SELECT id, path as strand_id, embedding FROM embeddings
      `) as Array<{ id: string; strand_id: string; embedding: string }>

      return (rows || []).map(row => ({
        id: row.id,
        strandId: row.strand_id,
        embedding: this.base64ToFloat32Array(row.embedding),
      }))
    } catch {
      return []
    }
  }

  async clearEmbeddings(): Promise<void> {
    const db = await getDatabase()
    if (!db) throw new Error('Database not available')

    await db.run(`DELETE FROM embeddings`)
  }

  // ==========================================================================
  // Bulk Operations
  // ==========================================================================

  async bulkImportStrands(strands: Array<Parameters<ContentStore['upsertStrand']>[0]>): Promise<void> {
    // Import in batches
    const batchSize = 50
    for (let i = 0; i < strands.length; i += batchSize) {
      const batch = strands.slice(i, i + batchSize)
      await Promise.all(batch.map(s => this.upsertStrand(s)))
    }
  }

  async clearAllContent(): Promise<void> {
    const db = await getDatabase()
    if (!db) throw new Error('Database not available')

    await db.run(`DELETE FROM strands`)
    await db.run(`DELETE FROM looms`)
    await db.run(`DELETE FROM weaves`)
    await db.run(`DELETE FROM fabrics`)
    await db.run(`DELETE FROM sync_status`)

    this.lastSync = null
  }

  async rebuildSearchIndex(): Promise<void> {
    // FTS5 would auto-maintain the index
    // For now, this is a no-op
    console.log('[SQLiteStore] Search index rebuilt')
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  private async hashContent(content: string): Promise<string> {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoder = new TextEncoder()
      const data = encoder.encode(content)
      const hash = await crypto.subtle.digest('SHA-256', data)
      return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
    }
    // Fallback: simple hash
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(16)
  }

  private float32ArrayToBase64(arr: Float32Array): string {
    const bytes = new Uint8Array(arr.buffer)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  private base64ToFloat32Array(base64: string): Float32Array {
    try {
      const binary = atob(base64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
      }
      return new Float32Array(bytes.buffer)
    } catch {
      // Fallback: try parsing as JSON (old format)
      try {
        const arr = JSON.parse(base64)
        return new Float32Array(arr)
      } catch {
        return new Float32Array(384) // Empty 384-dim vector
      }
    }
  }

  // ==========================================================================
  // Block-Level Operations (Phase 9)
  // ==========================================================================

  /**
   * Get strands by their IDs
   */
  async getStrandsByIds(ids: string[]): Promise<StrandContent[]> {
    if (ids.length === 0) return []

    const db = await getDatabase()
    if (!db) return []

    try {
      const placeholders = ids.map(() => '?').join(', ')
      const rows = await db.all(`
        SELECT s.*, w.slug as weave_slug, l.slug as loom_slug
        FROM strands s
        JOIN weaves w ON w.id = s.weave_id
        LEFT JOIN looms l ON l.id = s.loom_id
        WHERE s.id IN (${placeholders})
      `, ids) as Array<{
        id: string
        slug: string
        title: string
        path: string
        content: string
        frontmatter: string | null
        word_count: number
        summary: string | null
        updated_at: string
        github_url: string | null
        weave_slug: string
        loom_slug: string | null
        metadata: string | null
      }>

      if (!rows) return []

      return rows.map(row => ({
        id: row.id,
        path: row.path,
        slug: row.slug,
        title: row.title,
        content: row.content,
        frontmatter: row.frontmatter ? JSON.parse(row.frontmatter) : {},
        weave: row.weave_slug,
        loom: row.loom_slug || undefined,
        wordCount: row.word_count,
        summary: row.summary || undefined,
        lastModified: row.updated_at,
        githubUrl: row.github_url || undefined,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      }))
    } catch (error) {
      console.error('[SQLiteStore] Failed to get strands by IDs:', error)
      return []
    }
  }

  /**
   * Get all existing tags from the codex (for taxonomy context)
   */
  async getAllTags(): Promise<string[]> {
    const db = await getDatabase()
    if (!db) return []

    try {
      const rows = await db.all(`
        SELECT DISTINCT tags FROM strands WHERE tags IS NOT NULL AND tags != '[]'
      `) as Array<{ tags: string }>

      const tagSet = new Set<string>()
      for (const row of rows) {
        try {
          const tags = JSON.parse(row.tags) as string[]
          tags.forEach(tag => tagSet.add(tag))
        } catch {
          // Skip invalid JSON
        }
      }

      return Array.from(tagSet).sort()
    } catch (error) {
      console.error('[SQLiteStore] Failed to get all tags:', error)
      return []
    }
  }

  /**
   * Get all subjects from taxonomy across the codex
   */
  async getAllSubjects(): Promise<string[]> {
    const db = await getDatabase()
    if (!db) return []

    try {
      const rows = await db.all(`
        SELECT DISTINCT metadata FROM strands WHERE metadata IS NOT NULL
      `) as Array<{ metadata: string }>

      const subjectSet = new Set<string>()
      for (const row of rows) {
        try {
          const metadata = JSON.parse(row.metadata)
          const subjects = metadata?.taxonomy?.subjects || []
          subjects.forEach((s: string) => subjectSet.add(s))
        } catch {
          // Skip invalid JSON
        }
      }

      return Array.from(subjectSet).sort()
    } catch (error) {
      console.error('[SQLiteStore] Failed to get all subjects:', error)
      return []
    }
  }

  /**
   * Get all topics from taxonomy across the codex
   */
  async getAllTopics(): Promise<string[]> {
    const db = await getDatabase()
    if (!db) return []

    try {
      const rows = await db.all(`
        SELECT DISTINCT metadata FROM strands WHERE metadata IS NOT NULL
      `) as Array<{ metadata: string }>

      const topicSet = new Set<string>()
      for (const row of rows) {
        try {
          const metadata = JSON.parse(row.metadata)
          const topics = metadata?.taxonomy?.topics || []
          topics.forEach((t: string) => topicSet.add(t))
        } catch {
          // Skip invalid JSON
        }
      }

      return Array.from(topicSet).sort()
    } catch (error) {
      console.error('[SQLiteStore] Failed to get all topics:', error)
      return []
    }
  }

  // ==========================================================================
  // Block-Level Search Operations (Phase 9e)
  // ==========================================================================

  /**
   * Search strands by block-level tags
   * Returns strands that contain blocks with matching tags
   */
  async searchByBlockTag(
    tag: string,
    options?: {
      limit?: number
      offset?: number
      weave?: string
      loom?: string
    }
  ): Promise<Array<{
    strand: StrandContent
    matchingBlocks: Array<{
      blockId: string
      blockType: string
      startLine: number
      endLine: number
      tags: string[]
      extractiveSummary?: string
    }>
  }>> {
    const db = await getDatabase()
    if (!db) return []

    const limit = options?.limit || 20
    const offset = options?.offset || 0

    try {
      // Search blocks that have the tag (either in accepted tags or suggested with high confidence)
      let sql = `
        SELECT DISTINCT
          sb.strand_id,
          sb.strand_path,
          sb.block_id,
          sb.block_type,
          sb.start_line,
          sb.end_line,
          sb.tags,
          sb.suggested_tags,
          sb.extractive_summary
        FROM strand_blocks sb
        JOIN strands s ON s.id = sb.strand_id
        WHERE (
          sb.tags LIKE ?
          OR EXISTS (
            SELECT 1 FROM json_each(sb.suggested_tags) st
            WHERE json_extract(st.value, '$.tag') = ?
            AND json_extract(st.value, '$.confidence') >= 0.7
          )
        )
      `
      const params: (string | number)[] = [`%"${tag}"%`, tag]

      if (options?.weave) {
        sql += ` AND s.weave_id = (SELECT id FROM weaves WHERE slug = ?)`
        params.push(options.weave)
      }

      if (options?.loom) {
        sql += ` AND s.loom_id = (SELECT id FROM looms WHERE path = ?)`
        params.push(options.loom)
      }

      sql += ` ORDER BY sb.strand_path, sb.start_line LIMIT ? OFFSET ?`
      params.push(limit * 10, offset) // Get more blocks to group by strand

      const rows = await db.all(sql, params) as Array<{
        strand_id: string
        strand_path: string
        block_id: string
        block_type: string
        start_line: number
        end_line: number
        tags: string | null
        suggested_tags: string | null
        extractive_summary: string | null
      }>

      if (!rows || rows.length === 0) return []

      // Group by strand and fetch strand details
      const strandBlocksMap = new Map<string, typeof rows>()
      for (const row of rows) {
        if (!strandBlocksMap.has(row.strand_path)) {
          strandBlocksMap.set(row.strand_path, [])
        }
        strandBlocksMap.get(row.strand_path)!.push(row)
      }

      // Fetch strand details
      const results: Array<{ strand: StrandContent; matchingBlocks: Array<{ blockId: string; blockType: string; startLine: number; endLine: number; tags: string[]; extractiveSummary?: string }> }> = []
      let count = 0

      for (const [strandPath, blocks] of strandBlocksMap) {
        if (count >= limit) break

        const strand = await this.getStrand(strandPath)
        if (strand) {
          results.push({
            strand,
            matchingBlocks: blocks.map(b => ({
              blockId: b.block_id,
              blockType: b.block_type,
              startLine: b.start_line,
              endLine: b.end_line,
              tags: b.tags ? JSON.parse(b.tags) : [],
              extractiveSummary: b.extractive_summary || undefined,
            })),
          })
          count++
        }
      }

      return results
    } catch (error) {
      console.error('[SQLiteStore] Failed to search by block tag:', error)
      return []
    }
  }

  /**
   * Full text search across block content and summaries
   */
  async searchBlocksFullText(
    query: string,
    options?: {
      limit?: number
      offset?: number
      blockTypes?: string[]
      minWorthiness?: number
      tags?: string[]
    }
  ): Promise<Array<{
    strandPath: string
    strandTitle: string
    blockId: string
    blockType: string
    startLine: number
    endLine: number
    matchSnippet: string
    worthinessScore: number
    tags: string[]
  }>> {
    const db = await getDatabase()
    if (!db) return []

    const limit = options?.limit || 50
    const offset = options?.offset || 0
    const searchTerm = `%${query}%`

    try {
      let sql = `
        SELECT
          sb.strand_path,
          s.title as strand_title,
          sb.block_id,
          sb.block_type,
          sb.start_line,
          sb.end_line,
          sb.raw_content,
          sb.extractive_summary,
          sb.worthiness_score,
          sb.tags
        FROM strand_blocks sb
        JOIN strands s ON s.path = sb.strand_path
        WHERE (sb.raw_content LIKE ? OR sb.extractive_summary LIKE ?)
      `
      const params: (string | number)[] = [searchTerm, searchTerm]

      if (options?.blockTypes && options.blockTypes.length > 0) {
        const placeholders = options.blockTypes.map(() => '?').join(', ')
        sql += ` AND sb.block_type IN (${placeholders})`
        params.push(...options.blockTypes)
      }

      if (options?.minWorthiness !== undefined) {
        sql += ` AND sb.worthiness_score >= ?`
        params.push(options.minWorthiness)
      }

      if (options?.tags && options.tags.length > 0) {
        sql += ` AND (${options.tags.map(() => 'sb.tags LIKE ?').join(' OR ')})`
        params.push(...options.tags.map(t => `%"${t}"%`))
      }

      sql += ` ORDER BY sb.worthiness_score DESC, sb.strand_path, sb.start_line LIMIT ? OFFSET ?`
      params.push(limit, offset)

      const rows = await db.all(sql, params) as Array<{
        strand_path: string
        strand_title: string
        block_id: string
        block_type: string
        start_line: number
        end_line: number
        raw_content: string | null
        extractive_summary: string | null
        worthiness_score: number
        tags: string | null
      }>

      return (rows || []).map(row => {
        // Extract a snippet around the match
        const content = row.raw_content || row.extractive_summary || ''
        const lowerContent = content.toLowerCase()
        const lowerQuery = query.toLowerCase()
        const matchIndex = lowerContent.indexOf(lowerQuery)

        let snippet = content
        if (matchIndex >= 0) {
          const start = Math.max(0, matchIndex - 50)
          const end = Math.min(content.length, matchIndex + query.length + 50)
          snippet = (start > 0 ? '...' : '') +
            content.slice(start, end) +
            (end < content.length ? '...' : '')
        } else if (content.length > 150) {
          snippet = content.slice(0, 150) + '...'
        }

        return {
          strandPath: row.strand_path,
          strandTitle: row.strand_title,
          blockId: row.block_id,
          blockType: row.block_type,
          startLine: row.start_line,
          endLine: row.end_line,
          matchSnippet: snippet,
          worthinessScore: row.worthiness_score,
          tags: row.tags ? JSON.parse(row.tags) : [],
        }
      })
    } catch (error) {
      console.error('[SQLiteStore] Failed to search blocks full text:', error)
      return []
    }
  }

  /**
   * Get all unique block-level tags across the codex
   */
  async getAllBlockTags(): Promise<string[]> {
    const db = await getDatabase()
    if (!db) return []

    try {
      const rows = await db.all(`
        SELECT DISTINCT tags FROM strand_blocks WHERE tags IS NOT NULL AND tags != '[]'
      `) as Array<{ tags: string }>

      const tagSet = new Set<string>()
      for (const row of rows) {
        try {
          const tags = JSON.parse(row.tags) as string[]
          tags.forEach(tag => tagSet.add(tag))
        } catch {
          // Skip invalid JSON
        }
      }

      return Array.from(tagSet).sort()
    } catch (error) {
      console.error('[SQLiteStore] Failed to get all block tags:', error)
      return []
    }
  }

  /**
   * Get block tag counts (for filtering UI)
   */
  async getBlockTagCounts(): Promise<Map<string, number>> {
    const db = await getDatabase()
    if (!db) return new Map()

    try {
      const rows = await db.all(`
        SELECT tags FROM strand_blocks WHERE tags IS NOT NULL AND tags != '[]'
      `) as Array<{ tags: string }>

      const tagCounts = new Map<string, number>()
      for (const row of rows) {
        try {
          const tags = JSON.parse(row.tags) as string[]
          for (const tag of tags) {
            tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
          }
        } catch {
          // Skip invalid JSON
        }
      }

      return tagCounts
    } catch (error) {
      console.error('[SQLiteStore] Failed to get block tag counts:', error)
      return new Map()
    }
  }

  /**
   * Get blocks with pending suggested tags for review
   */
  async getBlocksWithPendingSuggestions(options?: {
    limit?: number
    minConfidence?: number
    strandPath?: string
  }): Promise<Array<{
    strandPath: string
    strandTitle: string
    blockId: string
    blockType: string
    suggestedTags: Array<{
      tag: string
      confidence: number
      source: string
      reasoning?: string
    }>
  }>> {
    const db = await getDatabase()
    if (!db) return []

    const limit = options?.limit || 100
    const minConfidence = options?.minConfidence ?? 0.5

    try {
      let sql = `
        SELECT
          sb.strand_path,
          s.title as strand_title,
          sb.block_id,
          sb.block_type,
          sb.suggested_tags
        FROM strand_blocks sb
        JOIN strands s ON s.path = sb.strand_path
        WHERE sb.suggested_tags IS NOT NULL AND sb.suggested_tags != '[]'
      `
      const params: (string | number)[] = []

      if (options?.strandPath) {
        sql += ` AND sb.strand_path = ?`
        params.push(options.strandPath)
      }

      sql += ` ORDER BY sb.strand_path, sb.start_line LIMIT ?`
      params.push(limit)

      const rows = await db.all(sql, params) as Array<{
        strand_path: string
        strand_title: string
        block_id: string
        block_type: string
        suggested_tags: string
      }>

      return (rows || [])
        .map(row => {
          const suggestedTags = JSON.parse(row.suggested_tags) as Array<{
            tag: string
            confidence: number
            source: string
            reasoning?: string
          }>

          // Filter by confidence
          const filtered = suggestedTags.filter(t => t.confidence >= minConfidence)
          if (filtered.length === 0) return null

          return {
            strandPath: row.strand_path,
            strandTitle: row.strand_title,
            blockId: row.block_id,
            blockType: row.block_type,
            suggestedTags: filtered,
          }
        })
        .filter((r): r is NonNullable<typeof r> => r !== null)
    } catch (error) {
      console.error('[SQLiteStore] Failed to get blocks with pending suggestions:', error)
      return []
    }
  }

  /**
   * Get worthy blocks for illustration consideration
   */
  async getWorthyBlocksForIllustration(options?: {
    limit?: number
    minWorthiness?: number
    strandPath?: string
  }): Promise<Array<{
    strandPath: string
    blockId: string
    blockType: string
    worthinessScore: number
    extractiveSummary?: string
    warrantsIllustration: boolean
  }>> {
    const db = await getDatabase()
    if (!db) return []

    const limit = options?.limit || 50
    const minWorthiness = options?.minWorthiness ?? 0.6

    try {
      let sql = `
        SELECT
          strand_path,
          block_id,
          block_type,
          worthiness_score,
          extractive_summary,
          warrants_illustration
        FROM strand_blocks
        WHERE worthiness_score >= ?
      `
      const params: (string | number)[] = [minWorthiness]

      if (options?.strandPath) {
        sql += ` AND strand_path = ?`
        params.push(options.strandPath)
      }

      sql += ` ORDER BY worthiness_score DESC LIMIT ?`
      params.push(limit)

      const rows = await db.all(sql, params) as Array<{
        strand_path: string
        block_id: string
        block_type: string
        worthiness_score: number
        extractive_summary: string | null
        warrants_illustration: number
      }>

      return (rows || []).map(row => ({
        strandPath: row.strand_path,
        blockId: row.block_id,
        blockType: row.block_type,
        worthinessScore: row.worthiness_score,
        extractiveSummary: row.extractive_summary || undefined,
        warrantsIllustration: row.warrants_illustration === 1,
      }))
    } catch (error) {
      console.error('[SQLiteStore] Failed to get worthy blocks:', error)
      return []
    }
  }

  // ==========================================================================
  // Vault Sync Operations (Hybrid Mode)
  // ==========================================================================

  /**
   * Sync content from vault folder to IndexedDB
   * This rebuilds the IndexedDB index from vault files
   */
  async syncFromVault(options?: {
    onProgress?: (processed: number, total: number) => void
    clearExisting?: boolean
  }): Promise<{ added: number; updated: number; errors: string[] }> {
    if (!this.vaultReady || !this.vaultHandle) {
      return { added: 0, updated: 0, errors: ['Vault not available'] }
    }

    const result = { added: 0, updated: 0, errors: [] as string[] }

    try {
      // Optionally clear existing content
      if (options?.clearExisting) {
        await this.clearAllContent()
      }

      // Scan vault for markdown files
      const files = await this.scanVaultForMarkdown(this.vaultHandle)
      const total = files.length

      console.log(`[SQLiteStore] Syncing ${total} files from vault`)

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        try {
          // Read file content
          const content = await readVaultFile(this.vaultHandle!, file.path)
          if (!content) continue

          // Parse markdown
          const parsed = this.parseMarkdownContent(content)

          // Extract path from vault path
          const strandPath = this.vaultPathToPath(file.path)
          const parts = strandPath.split('/')
          const slug = parts[parts.length - 1]
          const title = (parsed.frontmatter.title as string) || slug

          // Check if strand exists
          const existing = await this.getStrand(strandPath)

          // Generate ID
          const id = existing?.id || `strand-${Date.now()}-${Math.random().toString(36).slice(2)}`

          // We need weave info - extract from path
          const weaveName = parts[0]

          // For now, create minimal weave/loom structure
          // In production, you'd want to properly parse the structure
          const weaveId = `weave-${weaveName}`
          await this.upsertWeave({
            id: weaveId,
            fabricId: 'default',
            slug: weaveName,
            name: weaveName,
            path: weaveName,
          })

          // Upsert strand (this will also write back to vault, but content is the same)
          // Temporarily disable vault write to avoid circular write
          const wasVaultReady: boolean = this.vaultReady
          this.vaultReady = false

          await this.upsertStrand({
            id,
            weaveId,
            slug,
            title,
            path: strandPath,
            content: parsed.content,
            frontmatter: parsed.frontmatter as StrandMetadata,
          })

          this.vaultReady = wasVaultReady

          if (existing) {
            result.updated++
          } else {
            result.added++
          }

          // Report progress
          options?.onProgress?.(i + 1, total)
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error'
          result.errors.push(`${file.path}: ${errorMsg}`)
        }
      }

      console.log(`[SQLiteStore] Vault sync complete: ${result.added} added, ${result.updated} updated, ${result.errors.length} errors`)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      result.errors.push(`Sync failed: ${errorMsg}`)
    }

    return result
  }

  /**
   * Scan vault directory for markdown files
   */
  private async scanVaultForMarkdown(
    handle: FileSystemDirectoryHandle,
    basePath = ''
  ): Promise<Array<{ path: string; name: string }>> {
    const files: Array<{ path: string; name: string }> = []

    try {
      // @ts-expect-error - FileSystemDirectoryHandle.values() exists but TS DOM types are incomplete
      for await (const entry of handle.values() as AsyncIterable<FileSystemHandle>) {
        const entryPath = basePath ? `${basePath}/${entry.name}` : entry.name

        if (entry.kind === 'directory') {
          // Skip hidden directories
          if (entry.name.startsWith('.')) continue

          const subHandle = await handle.getDirectoryHandle(entry.name)
          const subFiles = await this.scanVaultForMarkdown(subHandle, entryPath)
          files.push(...subFiles)
        } else if (entry.kind === 'file' && entry.name.endsWith('.md')) {
          files.push({ path: entryPath, name: entry.name })
        }
      }
    } catch (error) {
      console.error('[SQLiteStore] Failed to scan directory:', basePath, error)
    }

    return files
  }

  /**
   * Export all strands to vault folder
   * Useful for initial migration from IndexedDB-only mode
   */
  async exportToVault(options?: {
    onProgress?: (processed: number, total: number) => void
  }): Promise<{ exported: number; errors: string[] }> {
    if (!this.vaultReady || !this.vaultHandle) {
      return { exported: 0, errors: ['Vault not available'] }
    }

    const result = { exported: 0, errors: [] as string[] }
    const db = await getDatabase()
    if (!db) {
      return { exported: 0, errors: ['Database not available'] }
    }

    try {
      // Get all strands
      const rows = await db.all(`
        SELECT id, path, slug, title, content, frontmatter
        FROM strands
        WHERE status = 'published'
      `) as Array<{
        id: string
        path: string
        slug: string
        title: string
        content: string
        frontmatter: string | null
      }>

      const total = rows?.length || 0
      console.log(`[SQLiteStore] Exporting ${total} strands to vault`)

      for (let i = 0; i < (rows?.length || 0); i++) {
        const row = rows[i]
        try {
          const vaultPath = this.pathToVaultPath(row.path)
          const frontmatter = row.frontmatter ? JSON.parse(row.frontmatter) : {}
          const markdownContent = this.buildMarkdownFile(row.content, frontmatter, row.title)

          await writeVaultFile(this.vaultHandle!, vaultPath, markdownContent)
          result.exported++

          options?.onProgress?.(i + 1, total)
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error'
          result.errors.push(`${row.path}: ${errorMsg}`)
        }
      }

      console.log(`[SQLiteStore] Export complete: ${result.exported} exported, ${result.errors.length} errors`)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      result.errors.push(`Export failed: ${errorMsg}`)
    }

    return result
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let storeInstance: SQLiteContentStore | null = null

/**
 * Get the SQLite content store singleton
 */
export function getContentStore(): SQLiteContentStore {
  if (!storeInstance) {
    storeInstance = new SQLiteContentStore()
  }
  return storeInstance
}

/**
 * Initialize the content store
 */
export async function initContentStore(): Promise<SQLiteContentStore> {
  const store = getContentStore()
  await store.initialize()
  return store
}

/**
 * Standalone function to update strand metadata
 * Uses the singleton content store instance
 *
 * @param path - Path to the strand file
 * @param metadata - Updated metadata
 * @param contentBody - Original content body (without frontmatter)
 */
export async function updateStrandMetadata(
  path: string,
  metadata: StrandMetadata,
  contentBody: string
): Promise<void> {
  const store = getContentStore()
  await store.initialize()
  return store.updateStrandMetadata(path, metadata, contentBody)
}
