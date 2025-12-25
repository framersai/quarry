/**
 * Content Source Settings
 *
 * Allows users to choose where content comes from:
 * - GitHub: Fetches from repository (requires PAT for higher rate limits)
 * - Local: Uses imported ZIP content (full offline mode)
 * - Hybrid: GitHub with local SQLite cache
 * - Filesystem: Direct access to local markdown files
 * - Bundled: Pre-packaged example content
 *
 * @module codex/ui/ContentSourceSettings
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Database,
  Cloud,
  CloudOff,
  HardDrive,
  RefreshCw,
  Check,
  AlertCircle,
  ExternalLink,
  Zap,
  Eye,
  EyeOff,
  Download,
  Upload,
  Wifi,
  WifiOff,
  FolderOpen,
  Copy,
  Bot,
  FileText,
  Sparkles,
  CheckCircle2,
} from 'lucide-react'
import { getFeatureFlags } from '@/lib/config/featureFlags'
import type { ContentSource } from '@/lib/content/types'
import {
  isFilesystemAccessSupported,
  createFilesystemSource,
  createBundledSource,
  getCurrentFilesystemSource,
  clearFilesystemSource,
} from '@/lib/content/filesystemSource'

// ============================================================================
// TYPES
// ============================================================================

export type ContentSourceMode = 'github' | 'local' | 'hybrid' | 'filesystem' | 'bundled'

interface ContentSourceSettingsProps {
  /** Current content source info */
  source: ContentSource | null
  /** Whether content store is initialized */
  isInitialized: boolean
  /** Loading state */
  isLoading: boolean
  /** Callback when source mode changes */
  onSourceChange?: (mode: ContentSourceMode) => Promise<void>
  /** Callback to trigger sync */
  onSync?: () => Promise<void>
  /** Whether sync is in progress */
  isSyncing?: boolean
  /** Last sync time */
  lastSyncTime?: Date | null
  /** Error message */
  error?: string | null
  /** Callback when filesystem source is loaded */
  onFilesystemSourceLoaded?: (source: ReturnType<typeof getCurrentFilesystemSource>) => void
}

// ============================================================================
// PAT ENCRYPTION UTILITIES
// ============================================================================

async function encrypt(text: string, passphrase: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  )

  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt']
  )

  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data)

  const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength)
  combined.set(salt, 0)
  combined.set(iv, salt.length)
  combined.set(new Uint8Array(encrypted), salt.length + iv.length)

  return btoa(String.fromCharCode(...combined))
}

async function decrypt(ciphertext: string, passphrase: string): Promise<string | null> {
  try {
    const encoder = new TextEncoder()
    const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0))

    const salt = combined.slice(0, 16)
    const iv = combined.slice(16, 28)
    const data = combined.slice(28)

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(passphrase),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    )

    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      true,
      ['decrypt']
    )

    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data)
    return new TextDecoder().decode(decrypted)
  } catch {
    return null
  }
}

function getBrowserFingerprint(): string {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  ctx?.fillText('fingerprint', 2, 2)
  const canvasHash = canvas.toDataURL().slice(0, 50)

  return btoa(
    navigator.userAgent +
    navigator.language +
    screen.colorDepth +
    screen.width +
    screen.height +
    canvasHash
  ).slice(0, 32)
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function ContentSourceSettings({
  source,
  isInitialized,
  isLoading,
  onSourceChange,
  onSync,
  isSyncing = false,
  lastSyncTime,
  error,
  onFilesystemSourceLoaded,
}: ContentSourceSettingsProps) {
  const [mode, setMode] = useState<ContentSourceMode>('github')
  const [pat, setPat] = useState('')
  const [showPat, setShowPat] = useState(false)
  const [patSaving, setPatSaving] = useState(false)
  const [patSaved, setPatSaved] = useState(false)
  const [patError, setPatError] = useState<string | null>(null)
  const [rateLimit, setRateLimit] = useState<{ limit: number; remaining: number; reset: Date } | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  
  // Filesystem mode state
  const [filesystemPath, setFilesystemPath] = useState<string | null>(null)
  const [filesystemStrandCount, setFilesystemStrandCount] = useState(0)
  const [isLoadingFilesystem, setIsLoadingFilesystem] = useState(false)
  const [pathCopied, setPathCopied] = useState(false)
  const [filesystemSupported] = useState(() => isFilesystemAccessSupported())

  const flags = getFeatureFlags()

  // Detect online status
  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine)
    updateOnlineStatus()
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)
    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  }, [])

  // Determine current mode from source and flags
  useEffect(() => {
    if (flags.deploymentMode === 'offline') {
      setMode('local')
    } else if (source?.type === 'filesystem') {
      setMode('filesystem')
    } else if (source?.type === 'bundled') {
      setMode('bundled')
    } else if (source?.type === 'sqlite') {
      // SQLite type without hybrid means local-only
      setMode('local')
    } else if (source?.type === 'hybrid') {
      setMode('hybrid')
    } else {
      setMode('github')
    }
  }, [source, flags.deploymentMode])
  
  // Check for existing filesystem source on mount
  useEffect(() => {
    const existingSource = getCurrentFilesystemSource()
    if (existingSource) {
      const config = existingSource.getConfig()
      setFilesystemPath(existingSource.getDisplayPath())
      setFilesystemStrandCount(existingSource.getSource().strandCount || 0)
      if (config.mode === 'bundled') {
        setMode('bundled')
      } else {
        setMode('filesystem')
      }
    }
  }, [])

  // Load encrypted PAT on mount
  useEffect(() => {
    const loadPAT = async () => {
      try {
        const encrypted = localStorage.getItem('gh_pat_encrypted')
        if (!encrypted) return

        const fingerprint = getBrowserFingerprint()
        const decrypted = await decrypt(encrypted, fingerprint)
        if (decrypted) {
          setPat(decrypted)
          checkRateLimit(decrypted)
        }
      } catch (err) {
        console.warn('Failed to decrypt PAT:', err)
      }
    }

    loadPAT()
  }, [])

  const checkRateLimit = async (token: string) => {
    try {
      const headers: HeadersInit = {}
      if (token) headers['Authorization'] = `token ${token}`

      const res = await fetch('https://api.github.com/rate_limit', { headers })
      const data = await res.json()

      if (data.rate) {
        setRateLimit({
          limit: data.rate.limit,
          remaining: data.rate.remaining,
          reset: new Date(data.rate.reset * 1000),
        })
      }
    } catch (err) {
      console.warn('Failed to check rate limit:', err)
    }
  }

  const handleSavePat = async () => {
    setPatError(null)
    setPatSaving(true)
    setPatSaved(false)

    try {
      if (pat && !pat.startsWith('ghp_') && !pat.startsWith('github_pat_')) {
        throw new Error('Invalid PAT format. Should start with ghp_ or github_pat_')
      }

      if (pat) {
        const fingerprint = getBrowserFingerprint()
        const encrypted = await encrypt(pat, fingerprint)
        localStorage.setItem('gh_pat_encrypted', encrypted)
        await checkRateLimit(pat)
      } else {
        localStorage.removeItem('gh_pat_encrypted')
        setRateLimit(null)
      }

      setPatSaved(true)
      setTimeout(() => setPatSaved(false), 3000)
    } catch (err) {
      setPatError(err instanceof Error ? err.message : 'Failed to save PAT')
    } finally {
      setPatSaving(false)
    }
  }

  const handleModeChange = useCallback(async (newMode: ContentSourceMode) => {
    if (newMode === mode) return
    setMode(newMode)
    await onSourceChange?.(newMode)
  }, [mode, onSourceChange])

  // Handle selecting a local folder using File System Access API
  const handleSelectFolder = useCallback(async () => {
    if (!filesystemSupported) {
      alert('Your browser does not support the File System Access API. Try Chrome, Edge, or Opera.')
      return
    }

    setIsLoadingFilesystem(true)
    try {
      clearFilesystemSource()
      const fsSource = await createFilesystemSource()
      if (fsSource) {
        await fsSource.initialize()
        setFilesystemPath(fsSource.getDisplayPath())
        setFilesystemStrandCount(fsSource.getSource().strandCount || 0)
        setMode('filesystem')
        onFilesystemSourceLoaded?.(fsSource)
        await onSourceChange?.('filesystem')
      }
    } catch (err) {
      console.error('Failed to open folder:', err)
    } finally {
      setIsLoadingFilesystem(false)
    }
  }, [filesystemSupported, onFilesystemSourceLoaded, onSourceChange])

  // Handle loading bundled example content
  const handleLoadBundled = useCallback(async () => {
    setIsLoadingFilesystem(true)
    try {
      clearFilesystemSource()
      const bundledSource = createBundledSource()
      await bundledSource.initialize()
      setFilesystemPath(bundledSource.getDisplayPath())
      setFilesystemStrandCount(bundledSource.getSource().strandCount || 0)
      setMode('bundled')
      onFilesystemSourceLoaded?.(bundledSource)
      await onSourceChange?.('bundled')
    } catch (err) {
      console.error('Failed to load bundled content:', err)
    } finally {
      setIsLoadingFilesystem(false)
    }
  }, [onFilesystemSourceLoaded, onSourceChange])

  // Copy filesystem path to clipboard
  const handleCopyPath = useCallback(async () => {
    if (!filesystemPath) return
    try {
      await navigator.clipboard.writeText(filesystemPath)
      setPathCopied(true)
      setTimeout(() => setPathCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy path:', err)
    }
  }, [filesystemPath])

  // Check if we're in offline-only deployment
  const isOfflineDeployment = flags.deploymentMode === 'offline'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Content Source
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {isOnline ? (
            <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
              <Wifi className="w-3 h-3" />
              Online
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
              <WifiOff className="w-3 h-3" />
              Offline
            </span>
          )}
        </div>
      </div>

      {/* Mode Selection - Row 1: Remote Sources */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* GitHub Mode */}
        <button
          onClick={() => handleModeChange('github')}
          disabled={isOfflineDeployment}
          className={`
            p-4 rounded-xl border-2 text-left transition-all
            ${mode === 'github'
              ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20'
              : isOfflineDeployment
                ? 'border-gray-200 dark:border-gray-800 opacity-50 cursor-not-allowed'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }
          `}
        >
          <div className="flex items-center gap-2 mb-2">
            <Cloud className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            <span className="font-semibold text-sm">GitHub</span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Fetch content directly from GitHub repository. Requires internet connection.
          </p>
        </button>

        {/* Hybrid Mode */}
        <button
          onClick={() => handleModeChange('hybrid')}
          disabled={isOfflineDeployment}
          className={`
            p-4 rounded-xl border-2 text-left transition-all
            ${mode === 'hybrid'
              ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20'
              : isOfflineDeployment
                ? 'border-gray-200 dark:border-gray-800 opacity-50 cursor-not-allowed'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }
          `}
        >
          <div className="flex items-center gap-2 mb-2">
            <RefreshCw className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <span className="font-semibold text-sm">Hybrid</span>
            <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded">
              Recommended
            </span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            GitHub sync with local SQLite cache. Works offline after initial sync.
          </p>
        </button>

        {/* Local/Offline Mode */}
        <button
          onClick={() => handleModeChange('local')}
          className={`
            p-4 rounded-xl border-2 text-left transition-all
            ${mode === 'local'
              ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }
          `}
        >
          <div className="flex items-center gap-2 mb-2">
            <HardDrive className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span className="font-semibold text-sm">Local Only</span>
            {isOfflineDeployment && (
              <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded">
                Active
              </span>
            )}
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Full offline mode. Import content via ZIP file. No GitHub required.
          </p>
        </button>
      </div>

      {/* Mode Selection - Row 2: Filesystem Sources */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Filesystem Mode */}
        <button
          onClick={handleSelectFolder}
          disabled={!filesystemSupported || isLoadingFilesystem}
          className={`
            p-4 rounded-xl border-2 text-left transition-all
            ${mode === 'filesystem'
              ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
              : !filesystemSupported
                ? 'border-gray-200 dark:border-gray-800 opacity-50 cursor-not-allowed'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }
          `}
        >
          <div className="flex items-center gap-2 mb-2">
            <FolderOpen className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <span className="font-semibold text-sm">Local Folder</span>
            <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded">
              AI-Ready
            </span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {filesystemSupported 
              ? 'Select a folder with markdown files. AI agents can read & edit directly.'
              : 'Browser not supported. Use Chrome, Edge, or Opera.'}
          </p>
        </button>

        {/* Bundled Examples Mode */}
        <button
          onClick={handleLoadBundled}
          disabled={isLoadingFilesystem}
          className={`
            p-4 rounded-xl border-2 text-left transition-all
            ${mode === 'bundled'
              ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }
          `}
        >
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-pink-600 dark:text-pink-400" />
            <span className="font-semibold text-sm">Bundled Examples</span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Load pre-packaged example content to explore FABRIC Codex features.
          </p>
        </button>
      </div>

      {/* Offline Deployment Notice */}
      {isOfflineDeployment && (
        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
          <div className="flex items-start gap-2">
            <CloudOff className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-emerald-800 dark:text-emerald-200">
                Offline Edition Active
              </p>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                This installation is configured for full offline mode. Content is stored locally in SQLite.
                Use the Import feature to add content from ZIP archives.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* GitHub PAT Section (only for GitHub/Hybrid modes) */}
      {(mode === 'github' || mode === 'hybrid') && !isOfflineDeployment && (
        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                GitHub Personal Access Token
              </h4>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Increase rate limit from 60 to 5,000 requests/hour
              </p>
            </div>
            <a
              href="https://github.com/settings/tokens/new?description=Frame%20Codex%20Viewer&scopes=public_repo"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
            >
              Generate PAT
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* PAT Input */}
          <div className="relative">
            <input
              type={showPat ? 'text' : 'password'}
              value={pat}
              onChange={(e) => setPat(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className="w-full px-4 py-3 pr-12 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-xl font-mono text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPat(!showPat)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              aria-label={showPat ? 'Hide token' : 'Show token'}
            >
              {showPat ? (
                <EyeOff className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              ) : (
                <Eye className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              )}
            </button>
          </div>

          {/* Error */}
          {patError && (
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700 dark:text-red-300">{patError}</p>
            </div>
          )}

          {/* Rate Limit Display */}
          {rateLimit && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                  Rate Limit
                </span>
                <span className="text-xs font-mono text-emerald-800 dark:text-emerald-200">
                  {rateLimit.remaining.toLocaleString()} / {rateLimit.limit.toLocaleString()}
                </span>
              </div>
              <div className="h-2 bg-emerald-200 dark:bg-emerald-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${(rateLimit.remaining / rateLimit.limit) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleSavePat}
              disabled={patSaving}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {patSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : patSaved ? (
                <>
                  <Check className="w-4 h-4" />
                  Saved!
                </>
              ) : (
                'Save PAT'
              )}
            </button>
            <button
              onClick={() => {
                setPat('')
                localStorage.removeItem('gh_pat_encrypted')
                setRateLimit(null)
              }}
              className="px-4 py-2.5 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-colors"
            >
              Clear
            </button>
          </div>

          {/* Security Note */}
          <p className="text-[10px] text-gray-500 dark:text-gray-400">
            Your PAT is encrypted (AES-256-GCM) and stored only in your browser. Never sent to Frame.dev servers.
          </p>
        </div>
      )}

      {/* Local Mode Content Info */}
      {mode === 'local' && (
        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Local Content Storage
            </h4>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Content is stored locally in SQLite. Import a Codex ZIP archive to populate content.
            </p>
          </div>

          {/* Current Status */}
          {source && (
            <div className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    Content Status
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {source.strandCount ?? 0} strands in local database
                  </p>
                </div>
                {isInitialized && (
                  <Check className="w-5 h-5 text-emerald-500" />
                )}
              </div>
            </div>
          )}

          {/* Import/Export Buttons */}
          <div className="flex items-center gap-3">
            <button
              className="flex-1 px-4 py-2.5 bg-emerald-100 dark:bg-emerald-900/30 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              onClick={() => {
                // This would trigger the import modal
                document.dispatchEvent(new CustomEvent('codex:open-import'))
              }}
            >
              <Upload className="w-4 h-4" />
              Import ZIP
            </button>
            <button
              className="flex-1 px-4 py-2.5 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              onClick={() => {
                // This would trigger the export modal
                document.dispatchEvent(new CustomEvent('codex:open-export'))
              }}
            >
              <Download className="w-4 h-4" />
              Export ZIP
            </button>
          </div>
        </div>
      )}

      {/* Filesystem / Bundled Mode Info */}
      {(mode === 'filesystem' || mode === 'bundled') && (
        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                {mode === 'filesystem' ? (
                  <FolderOpen className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                ) : (
                  <Sparkles className="w-4 h-4 text-pink-600 dark:text-pink-400" />
                )}
                {mode === 'filesystem' ? 'Local Filesystem' : 'Bundled Examples'}
              </h4>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {mode === 'filesystem'
                  ? 'Reading markdown files directly from your local folder.'
                  : 'Pre-packaged example content to explore features.'}
              </p>
            </div>
            {filesystemStrandCount > 0 && (
              <span className="px-2 py-1 text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-lg">
                {filesystemStrandCount} strands
              </span>
            )}
          </div>

          {/* Path Display with Copy Button */}
          {filesystemPath && (
            <div className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                    Content Path
                  </p>
                  <p className="text-sm font-mono text-gray-900 dark:text-white truncate" title={filesystemPath}>
                    {filesystemPath}
                  </p>
                </div>
                <button
                  onClick={handleCopyPath}
                  className={`
                    flex-shrink-0 px-3 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2
                    ${pathCopied
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }
                  `}
                >
                  {pathCopied ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy Path
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* AI Agent Info Box */}
          <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
            <div className="flex items-start gap-3">
              <Bot className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">
                  AI Agent Compatible
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  Point AI assistants like <strong>Claude Code</strong>, <strong>Cursor</strong>, or{' '}
                  <strong>Gemini CLI</strong> to this folder. They can read and edit your knowledge base directly.
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                  💡 Tip: Tell your AI &quot;Read the <code className="px-1 py-0.5 bg-amber-100 dark:bg-amber-900/50 rounded">llms.txt</code> file for structure docs&quot;
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            {mode === 'filesystem' && (
              <button
                onClick={handleSelectFolder}
                disabled={isLoadingFilesystem}
                className="flex-1 px-4 py-2.5 bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 font-medium rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <FolderOpen className="w-4 h-4" />
                Change Folder
              </button>
            )}
            <button
              onClick={async () => {
                const fsSource = getCurrentFilesystemSource()
                if (fsSource) {
                  setIsLoadingFilesystem(true)
                  await fsSource.sync()
                  setFilesystemStrandCount(fsSource.getSource().strandCount || 0)
                  setIsLoadingFilesystem(false)
                }
              }}
              disabled={isLoadingFilesystem}
              className="flex-1 px-4 py-2.5 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingFilesystem ? 'animate-spin' : ''}`} />
              Rescan
            </button>
          </div>

          {/* Files Info */}
          <div className="flex items-center gap-4 pt-2 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <FileText className="w-3.5 h-3.5" />
              <span>Reads <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">.md</code> and <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">.mdx</code> files</span>
            </div>
          </div>
        </div>
      )}

      {/* Hybrid Mode Sync Info */}
      {mode === 'hybrid' && !isOfflineDeployment && (
        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                Sync Status
              </h4>
              {lastSyncTime && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Last synced: {lastSyncTime.toLocaleString()}
                </p>
              )}
            </div>
            <button
              onClick={onSync}
              disabled={isSyncing || !isOnline}
              className="px-4 py-2 bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-medium rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </button>
          </div>

          {!isOnline && (
            <div className="p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
                <WifiOff className="w-3 h-3" />
                You're offline. Using cached content.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}
    </div>
  )
}
