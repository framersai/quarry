/**
 * Type-safe localStorage utilities for FABRIC Codex
 * @module lib/localStorage
 * 
 * @remarks
 * - All data stored client-side only (GDPR compliant)
 * - Automatic JSON serialization/deserialization
 * - Safe fallbacks for SSR and quota exceeded errors
 * - No telemetry or tracking
 */

import type { ThemeName } from '@/types/theme'

/**
 * Bookmark entry for a Codex file
 */
export interface Bookmark {
  /** Full path from repo root */
  path: string
  /** Display title */
  title: string
  /** When bookmarked */
  addedAt: string
  /** Optional notes */
  notes?: string
  /** User who added the bookmark (display name) */
  addedBy?: string
}

/**
 * Reading history entry
 */
export interface HistoryEntry {
  /** Full path from repo root */
  path: string
  /** Display title */
  title: string
  /** Last viewed timestamp */
  viewedAt: string
  /** View count */
  viewCount: number
}

/**
 * Text-to-Speech settings
 */
export interface TTSPreferences {
  /** Preferred voice URI */
  voiceURI?: string
  /** Speech rate (0.5 - 2.0, default 1.0) */
  rate: number
  /** Volume (0 - 1, default 1.0) */
  volume: number
  /** Pitch (0 - 2, default 1.0) */
  pitch: number
}

/**
 * User preferences for Codex viewer
 */
export interface UserPreferences {
  /** Theme: light, dark, sepia, terminal */
  theme: ThemeName
  /** Font size scale (0.8 - 1.5) */
  fontSize: number
  /** Tree density: compact, normal, comfortable */
  treeDensity: 'compact' | 'normal' | 'comfortable'
  /** Default sidebar mode */
  defaultSidebarMode: 'tree' | 'toc' | 'tags' | 'query'
  /** Whether sidebar is open by default on mobile */
  sidebarOpenMobile: boolean
  /** Whether to track reading history locally */
  historyTrackingEnabled: boolean
  /** GitHub Personal Access Token (optional, for publishing) */
  githubPAT?: string
  /** Whether to auto-merge PRs when publishing (requires PAT with merge permissions) */
  autoMergePRs: boolean
  /** Preferred metadata panel size */
  metadataPanelSize: 's' | 'm' | 'l'
  /** Whether to remember scroll position per strand (default: true) */
  rememberScrollPosition: boolean
  /** Whether to auto-expand backlinks section when backlinks are found (default: true) */
  autoExpandBacklinks: boolean
  /** Text-to-Speech settings */
  tts?: TTSPreferences
  /** Left sidebar font size: 0=xs, 1=sm, 2=base, 3=lg (default: 2=base/medium) */
  leftSidebarFontSize: number
  /** Right sidebar font size: 0=xs, 1=sm, 2=base, 3=lg (default: 1=sm/small) */
  rightSidebarFontSize: number
  /** Last expanded paths in sidebar for session restoration */
  lastExpandedPaths?: string[]
  /** Content source mode: github, local, or hybrid */
  contentSource?: 'github' | 'local' | 'hybrid'
  /** Last sync timestamp for hybrid mode */
  lastSyncAt?: string
  /** Auto-transcribe voice recordings on canvas (default: false) */
  autoTranscribeVoiceNotes: boolean
  /** User display name (default: "Traveler") */
  displayName: string
  /** Optional user avatar (base64 data URL or external URL) */
  avatarUrl?: string
  /** When the profile was first created */
  profileCreatedAt?: string
}

/**
 * localStorage keys
 */
const KEYS = {
  BOOKMARKS: 'quarry-codex-bookmarks',
  HISTORY: 'quarry-codex-history',
  PREFERENCES: 'quarry-codex-preferences',
  NOTES: 'quarry-codex-notes',
  SCROLL_POSITIONS: 'quarry-codex-scroll-positions',
  PERSONAL_TAGS: 'quarry-codex-personal-tags',
  LAST_VIEWED: 'quarry-codex-last-viewed',
  DRAFTS: 'quarry-codex-drafts',
} as const

/**
 * Draft entry for unpublished edits
 */
export interface DraftEntry {
  /** Original file path */
  path: string
  /** Draft content */
  content: string
  /** Original content hash to detect if source changed */
  originalHash: string
  /** Last modified timestamp */
  modifiedAt: string
  /** Created timestamp */
  createdAt: string
  /** Draft status */
  status: 'editing' | 'saved' | 'conflict'
}

/**
 * Last viewed location in Codex
 */
export interface LastViewedLocation {
  /** Directory path */
  path: string
  /** File path (if a file was open) */
  file?: string
  /** Timestamp */
  viewedAt: string
}

/**
 * Check if localStorage is available (SSR safe)
 * @returns true if localStorage can be used
 */
function isLocalStorageAvailable(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const test = '__frame_test__'
    localStorage.setItem(test, test)
    localStorage.removeItem(test)
    return true
  } catch {
    return false
  }
}

/**
 * Get typed data from localStorage
 * @param key - localStorage key
 * @param defaultValue - Fallback if key doesn't exist
 * @returns Parsed data or default
 */
function getItem<T>(key: string, defaultValue: T): T {
  if (!isLocalStorageAvailable()) return defaultValue
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : defaultValue
  } catch {
    return defaultValue
  }
}

/**
 * Set typed data in localStorage
 * @param key - localStorage key
 * @param value - Data to store
 */
function setItem<T>(key: string, value: T): void {
  if (!isLocalStorageAvailable()) return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.warn('localStorage quota exceeded or unavailable:', error)
  }
}

/**
 * Remove item from localStorage
 * @param key - localStorage key
 */
function removeItem(key: string): void {
  if (!isLocalStorageAvailable()) return
  try {
    localStorage.removeItem(key)
  } catch {
    // Ignore errors
  }
}

// ========== Generic Storage Functions (exported) ==========

/**
 * Get typed data from localStorage (exported version)
 * @param key - localStorage key
 * @param defaultValue - Optional fallback if key doesn't exist
 * @returns Parsed data or default/null
 */
export function getLocalStorage<T>(key: string, defaultValue?: T): T | null {
  if (!isLocalStorageAvailable()) return defaultValue ?? null
  try {
    const item = localStorage.getItem(key)
    if (item === null) return defaultValue ?? null
    return JSON.parse(item) as T
  } catch {
    return defaultValue ?? null
  }
}

/**
 * Set typed data in localStorage (exported version)
 * @param key - localStorage key
 * @param value - Data to store
 */
export function setLocalStorage<T>(key: string, value: T): void {
  if (!isLocalStorageAvailable()) return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.warn('localStorage quota exceeded or unavailable:', error)
  }
}

/**
 * Remove item from localStorage (exported version)
 * @param key - localStorage key
 */
export function removeLocalStorage(key: string): void {
  if (!isLocalStorageAvailable()) return
  try {
    localStorage.removeItem(key)
  } catch {
    // Ignore errors
  }
}

// ========== Bookmarks ==========

/**
 * Get all bookmarks
 * @returns Array of bookmarks, sorted by most recent
 */
export function getBookmarks(): Bookmark[] {
  return getItem<Bookmark[]>(KEYS.BOOKMARKS, [])
}

/**
 * Add a bookmark
 * @param path - File path
 * @param title - Display title
 * @param notes - Optional notes
 */
export function addBookmark(path: string, title: string, notes?: string): void {
  const bookmarks = getBookmarks()
  const prefs = getPreferences()
  const addedBy = prefs.displayName || 'Traveler'

  // Check if already bookmarked
  const existing = bookmarks.findIndex((b) => b.path === path)
  if (existing >= 0) {
    // Update existing
    bookmarks[existing] = {
      ...bookmarks[existing],
      title,
      notes,
      addedAt: new Date().toISOString(),
      addedBy,
    }
  } else {
    // Add new
    bookmarks.unshift({
      path,
      title,
      addedAt: new Date().toISOString(),
      notes,
      addedBy,
    })
  }
  setItem(KEYS.BOOKMARKS, bookmarks)
}

/**
 * Remove a bookmark
 * @param path - File path to unbookmark
 */
export function removeBookmark(path: string): void {
  const bookmarks = getBookmarks().filter((b) => b.path !== path)
  setItem(KEYS.BOOKMARKS, bookmarks)
}

/**
 * Check if a path is bookmarked
 * @param path - File path
 * @returns true if bookmarked
 */
export function isBookmarked(path: string): boolean {
  return getBookmarks().some((b) => b.path === path)
}

/**
 * Clear all bookmarks
 */
export function clearBookmarks(): void {
  removeItem(KEYS.BOOKMARKS)
}

// ========== Strand Notes ==========

/**
 * Individual note entry with author information
 */
export interface StrandNote {
  /** The note content */
  content: string
  /** When the note was created */
  createdAt: string
  /** User who created the note (display name) */
  author?: string
}

type StrandNotesMap = Record<string, StrandNote[]>

// Legacy support: convert old string[] format to new StrandNote[] format
function migrateNotesIfNeeded(map: Record<string, unknown>): StrandNotesMap {
  const migrated: StrandNotesMap = {}
  for (const [path, notes] of Object.entries(map)) {
    if (Array.isArray(notes)) {
      if (notes.length > 0 && typeof notes[0] === 'string') {
        // Old format: string[]
        migrated[path] = (notes as string[]).map((content) => ({
          content,
          createdAt: new Date().toISOString(),
          author: 'Traveler', // Default for migrated notes
        }))
      } else {
        // New format: StrandNote[]
        migrated[path] = notes as StrandNote[]
      }
    }
  }
  return migrated
}

function getNotesMap(): StrandNotesMap {
  const raw = getItem<Record<string, unknown>>(KEYS.NOTES, {})
  return migrateNotesIfNeeded(raw)
}

function saveNotesMap(map: StrandNotesMap): void {
  setItem(KEYS.NOTES, map)
}

/**
 * Get strand notes as StrandNote array
 */
export function getStrandNotes(path: string): StrandNote[] {
  const map = getNotesMap()
  return map[path] || []
}

/**
 * Get strand notes as simple string array (for backwards compatibility)
 */
export function getStrandNotesText(path: string): string[] {
  return getStrandNotes(path).map((n) => n.content)
}

/**
 * Add a single note to a strand
 */
export function addStrandNote(path: string, content: string): void {
  const prefs = getPreferences()
  const author = prefs.displayName || 'Traveler'
  const map = getNotesMap()
  const notes = map[path] || []

  notes.push({
    content: content.trim(),
    createdAt: new Date().toISOString(),
    author,
  })

  map[path] = notes
  saveNotesMap(map)
}

/**
 * Save strand notes (replaces all notes for this path)
 * @deprecated Use addStrandNote for new notes, this is for backwards compatibility
 */
export function saveStrandNotes(path: string, notes: string[]): void {
  const prefs = getPreferences()
  const author = prefs.displayName || 'Traveler'
  const trimmed = notes.map((note) => note.trim()).filter(Boolean)
  const map = getNotesMap()

  if (trimmed.length === 0) {
    delete map[path]
  } else {
    map[path] = trimmed.map((content) => ({
      content,
      createdAt: new Date().toISOString(),
      author,
    }))
  }
  saveNotesMap(map)
}

export function clearAllNotes(): void {
  removeItem(KEYS.NOTES)
}

// ========== Personal Tags ==========

type PersonalTagsMap = Record<string, string[]>

function getPersonalTagsMap(): PersonalTagsMap {
  return getItem<PersonalTagsMap>(KEYS.PERSONAL_TAGS, {})
}

function savePersonalTagsMap(map: PersonalTagsMap): void {
  setItem(KEYS.PERSONAL_TAGS, map)
}

/**
 * Get personal tags for a strand (user-added, separate from metadata tags)
 */
export function getPersonalTags(path: string): string[] {
  const map = getPersonalTagsMap()
  return map[path] || []
}

/**
 * Save personal tags for a strand
 */
export function savePersonalTags(path: string, tags: string[]): void {
  const cleaned = tags.map((t) => t.trim().toLowerCase()).filter(Boolean)
  const unique = [...new Set(cleaned)]
  const map = getPersonalTagsMap()
  if (unique.length === 0) {
    delete map[path]
  } else {
    map[path] = unique
  }
  savePersonalTagsMap(map)
}

/**
 * Clear all personal tags
 */
export function clearAllPersonalTags(): void {
  removeItem(KEYS.PERSONAL_TAGS)
}

// ========== Reading History ==========

/**
 * Get reading history
 * @param limit - Max entries to return (default: 50)
 * @returns Array of history entries, sorted by most recent
 */
export function getHistory(limit = 50): HistoryEntry[] {
  const history = getItem<HistoryEntry[]>(KEYS.HISTORY, [])
  return history.slice(0, limit)
}

/**
 * Add or update reading history entry
 * @param path - File path
 * @param title - Display title
 */
export function addToHistory(path: string, title: string): void {
  const history = getHistory(100) // Keep more than we display
  const existing = history.findIndex((h) => h.path === path)
  
  if (existing >= 0) {
    // Move to top and increment count
    const entry = history.splice(existing, 1)[0]
    entry.viewedAt = new Date().toISOString()
    entry.viewCount++
    history.unshift(entry)
  } else {
    // Add new entry at top
    history.unshift({
      path,
      title,
      viewedAt: new Date().toISOString(),
      viewCount: 1,
    })
  }
  
  // Keep only last 100 entries
  setItem(KEYS.HISTORY, history.slice(0, 100))
}

/**
 * Remove a history entry
 * @param path - File path to remove
 */
export function removeFromHistory(path: string): void {
  const history = getHistory(100).filter((h) => h.path !== path)
  setItem(KEYS.HISTORY, history)
}

/**
 * Clear all history
 */
export function clearHistory(): void {
  removeItem(KEYS.HISTORY)
}

// ========== Preferences ==========

/**
 * Default TTS preferences
 */
export const DEFAULT_TTS_PREFERENCES: TTSPreferences = {
  rate: 1.0,
  volume: 1.0,
  pitch: 1.0,
}

/**
 * Default user preferences
 */
const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'light',
  fontSize: 1.0,
  treeDensity: 'normal',
  defaultSidebarMode: 'tree',
  sidebarOpenMobile: false,
  historyTrackingEnabled: true,
  metadataPanelSize: 's',
  rememberScrollPosition: true,
  autoExpandBacklinks: true,
  autoMergePRs: false,
  leftSidebarFontSize: 2,  // base/medium
  rightSidebarFontSize: 1, // sm/small
  autoTranscribeVoiceNotes: false, // Off by default, user can enable per-recording or globally
  displayName: 'Traveler', // Default profile name - inspired by hitchhiker's guide
  tts: DEFAULT_TTS_PREFERENCES,
}

/**
 * Get user preferences
 * @returns Current preferences or defaults
 */
export function getPreferences(): UserPreferences {
  return getItem<UserPreferences>(KEYS.PREFERENCES, DEFAULT_PREFERENCES)
}

/**
 * Update user preferences
 * @param updates - Partial preferences to update
 */
export function updatePreferences(updates: Partial<UserPreferences>): void {
  const current = getPreferences()
  setItem(KEYS.PREFERENCES, { ...current, ...updates })
}

/**
 * Reset preferences to defaults
 */
export function resetPreferences(): void {
  setItem(KEYS.PREFERENCES, DEFAULT_PREFERENCES)
}

// ========== User Profile Helpers ==========

/**
 * User profile data (subset of preferences)
 */
export interface UserProfile {
  displayName: string
  avatarUrl?: string
  profileCreatedAt?: string
}

/**
 * Get current user's profile
 */
export function getUserProfile(): UserProfile {
  const prefs = getPreferences()
  return {
    displayName: prefs.displayName || 'Traveler',
    avatarUrl: prefs.avatarUrl,
    profileCreatedAt: prefs.profileCreatedAt,
  }
}

/**
 * Update user profile
 */
export function updateUserProfile(profile: Partial<UserProfile>): void {
  const current = getPreferences()
  const now = new Date().toISOString()

  updatePreferences({
    displayName: profile.displayName ?? current.displayName,
    avatarUrl: profile.avatarUrl ?? current.avatarUrl,
    profileCreatedAt: current.profileCreatedAt ?? now,
  })
}

/**
 * Reset profile to default (Traveler)
 */
export function resetUserProfile(): void {
  updatePreferences({
    displayName: 'Traveler',
    avatarUrl: undefined,
    profileCreatedAt: undefined,
  })
}

// ============================================================================
// Scroll Position Persistence
// ============================================================================

type ScrollPositionMap = Record<string, { scrollTop: number; scrollPercent: number; timestamp: number }>

const MAX_SCROLL_ENTRIES = 100 // Limit stored positions to prevent bloat

/**
 * Get all stored scroll positions
 */
function getScrollPositionsMap(): ScrollPositionMap {
  return getItem<ScrollPositionMap>(KEYS.SCROLL_POSITIONS, {})
}

/**
 * Save scroll positions map
 */
function saveScrollPositionsMap(map: ScrollPositionMap): void {
  // Prune old entries if over limit
  const entries = Object.entries(map)
  if (entries.length > MAX_SCROLL_ENTRIES) {
    // Sort by timestamp, keep most recent
    entries.sort((a, b) => b[1].timestamp - a[1].timestamp)
    const pruned = Object.fromEntries(entries.slice(0, MAX_SCROLL_ENTRIES))
    setItem(KEYS.SCROLL_POSITIONS, pruned)
  } else {
    setItem(KEYS.SCROLL_POSITIONS, map)
  }
}

/**
 * Get scroll position for a specific strand path
 * @param path - The strand file path
 * @returns Scroll position data or null if not found
 */
export function getScrollPosition(path: string): { scrollTop: number; scrollPercent: number } | null {
  const map = getScrollPositionsMap()
  const entry = map[path]
  if (!entry) return null
  return { scrollTop: entry.scrollTop, scrollPercent: entry.scrollPercent }
}

/**
 * Save scroll position for a strand
 * @param path - The strand file path
 * @param scrollTop - Scroll offset in pixels
 * @param scrollPercent - Scroll percentage (0-100)
 */
export function saveScrollPosition(path: string, scrollTop: number, scrollPercent: number): void {
  const map = getScrollPositionsMap()
  map[path] = {
    scrollTop,
    scrollPercent,
    timestamp: Date.now(),
  }
  saveScrollPositionsMap(map)
}

/**
 * Clear scroll position for a specific strand
 */
export function clearScrollPosition(path: string): void {
  const map = getScrollPositionsMap()
  delete map[path]
  saveScrollPositionsMap(map)
}

/**
 * Clear all scroll positions
 */
export function clearAllScrollPositions(): void {
  removeItem(KEYS.SCROLL_POSITIONS)
}

// ========== Last Viewed Location ==========

/**
 * Get the last viewed location in Codex
 * @returns Last viewed location or null if none saved
 */
export function getLastViewedLocation(): LastViewedLocation | null {
  return getItem<LastViewedLocation | null>(KEYS.LAST_VIEWED, null)
}

/**
 * Save the last viewed location in Codex
 * @param path - Directory path
 * @param file - Optional file path
 */
export function saveLastViewedLocation(path: string, file?: string): void {
  const location: LastViewedLocation = {
    path,
    file,
    viewedAt: new Date().toISOString(),
  }
  setItem(KEYS.LAST_VIEWED, location)
}

/**
 * Clear the last viewed location
 */
export function clearLastViewedLocation(): void {
  removeItem(KEYS.LAST_VIEWED)
}

// ========== Expanded Paths (Session Restoration) ==========

/**
 * Save expanded paths for sidebar session restoration
 * @param paths - Array of expanded folder/loom/weave paths
 */
export function saveExpandedPaths(paths: string[]): void {
  const prefs = getPreferences()
  updatePreferences({ ...prefs, lastExpandedPaths: paths })
}

/**
 * Get last expanded paths for sidebar restoration
 * @returns Array of paths that were expanded, or empty array
 */
export function getExpandedPaths(): string[] {
  const prefs = getPreferences()
  return prefs.lastExpandedPaths || []
}

/**
 * Clear all FABRIC Codex data from localStorage
 */
export function clearAllCodexData(): void {
  clearBookmarks()
  clearHistory()
  clearAllNotes()
  clearAllPersonalTags()
  clearAllScrollPositions()
  clearLastViewedLocation()
  clearAllDrafts()
  resetPreferences()
}

// ============================================================================
// Draft Storage for Inline Editing
// ============================================================================

type DraftsMap = Record<string, DraftEntry>

const MAX_DRAFTS = 50 // Limit stored drafts

/**
 * Simple hash function for content comparison
 */
function hashContent(content: string): string {
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return hash.toString(36)
}

/**
 * Get all drafts
 */
function getDraftsMap(): DraftsMap {
  return getItem<DraftsMap>(KEYS.DRAFTS, {})
}

/**
 * Save drafts map
 */
function saveDraftsMap(map: DraftsMap): void {
  // Prune old drafts if over limit
  const entries = Object.entries(map)
  if (entries.length > MAX_DRAFTS) {
    // Sort by modified timestamp, keep most recent
    entries.sort((a, b) => 
      new Date(b[1].modifiedAt).getTime() - new Date(a[1].modifiedAt).getTime()
    )
    const pruned = Object.fromEntries(entries.slice(0, MAX_DRAFTS))
    setItem(KEYS.DRAFTS, pruned)
  } else {
    setItem(KEYS.DRAFTS, map)
  }
}

/**
 * Get a draft for a specific file path
 * @param path - The file path
 * @returns Draft entry or null if not found
 */
export function getDraft(path: string): DraftEntry | null {
  const map = getDraftsMap()
  return map[path] || null
}

/**
 * Check if a draft exists and has unpublished changes
 * @param path - The file path
 * @param currentContent - Current content to compare against
 * @returns Object with hasDraft and hasChanges flags
 */
export function checkDraftStatus(path: string, currentContent: string): { 
  hasDraft: boolean
  hasChanges: boolean
  isConflict: boolean
  draft: DraftEntry | null 
} {
  const draft = getDraft(path)
  if (!draft) {
    return { hasDraft: false, hasChanges: false, isConflict: false, draft: null }
  }
  
  const currentHash = hashContent(currentContent)
  const hasChanges = draft.content !== currentContent
  const isConflict = draft.originalHash !== currentHash && hasChanges
  
  return { 
    hasDraft: true, 
    hasChanges,
    isConflict,
    draft 
  }
}

/**
 * Save or update a draft
 * @param path - The file path
 * @param content - Draft content
 * @param originalContent - Original content (for conflict detection)
 */
export function saveDraft(path: string, content: string, originalContent: string): void {
  const map = getDraftsMap()
  const existing = map[path]
  const now = new Date().toISOString()
  const originalHash = hashContent(originalContent)
  
  // Check for conflict
  const status: DraftEntry['status'] = 
    existing && existing.originalHash !== originalHash ? 'conflict' : 'saved'
  
  map[path] = {
    path,
    content,
    originalHash,
    modifiedAt: now,
    createdAt: existing?.createdAt || now,
    status,
  }
  
  saveDraftsMap(map)
}

/**
 * Delete a draft
 * @param path - The file path
 */
export function deleteDraft(path: string): void {
  const map = getDraftsMap()
  delete map[path]
  saveDraftsMap(map)
}

/**
 * Get all drafts as array (for listing)
 * @returns Array of draft entries sorted by most recent
 */
export function getAllDrafts(): DraftEntry[] {
  const map = getDraftsMap()
  return Object.values(map).sort((a, b) => 
    new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime()
  )
}

/**
 * Get count of drafts with unpublished changes
 */
export function getUnpublishedDraftsCount(): number {
  return getAllDrafts().length
}

/**
 * Clear all drafts
 */
export function clearAllDrafts(): void {
  removeItem(KEYS.DRAFTS)
}

/**
 * Update draft status
 * @param path - The file path
 * @param status - New status
 */
export function updateDraftStatus(path: string, status: DraftEntry['status']): void {
  const map = getDraftsMap()
  if (map[path]) {
    map[path].status = status
    map[path].modifiedAt = new Date().toISOString()
    saveDraftsMap(map)
  }
}
