/**
 * Settings modal for GitHub PAT configuration and viewer preferences
 * @module codex/ui/SettingsModal
 */

'use client'

import React, { useState, useEffect } from 'react'
import { X, Key, Eye, EyeOff, Check, AlertCircle, ExternalLink, Zap } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from 'next-themes'
import { THEME_METADATA, type ThemeName } from '@/types/theme'
import { Z_INDEX } from '../constants'

interface SettingsModalProps {
  /** Whether modal is open */
  isOpen: boolean
  /** Close callback */
  onClose: () => void
}

/**
 * Encrypt a string using Web Crypto API (AES-GCM)
 * @param text - Plain text to encrypt
 * @param passphrase - Encryption key derived from browser fingerprint
 */
async function encrypt(text: string, passphrase: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  
  // Derive key from passphrase
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  )
  
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt']
  )
  
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  )
  
  // Combine salt + iv + ciphertext
  const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength)
  combined.set(salt, 0)
  combined.set(iv, salt.length)
  combined.set(new Uint8Array(encrypted), salt.length + iv.length)
  
  return btoa(String.fromCharCode(...combined))
}

/**
 * Decrypt a string using Web Crypto API (AES-GCM)
 */
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
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      true,
      ['decrypt']
    )
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    )
    
    return new TextDecoder().decode(decrypted)
  } catch {
    return null
  }
}

/**
 * Generate a browser fingerprint for encryption passphrase
 */
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

/**
 * Settings modal for GitHub PAT and preferences
 * 
 * @remarks
 * - PAT stored encrypted in localStorage (AES-GCM with browser fingerprint)
 * - Shows current rate limit status
 * - Validates PAT format (ghp_...)
 * - Links to GitHub token generator
 */
export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [pat, setPat] = useState('')
  const [showPat, setShowPat] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rateLimit, setRateLimit] = useState<{ limit: number; remaining: number; reset: Date } | null>(null)
  const { theme, setTheme } = useTheme()
  const themeOrder: ThemeName[] = ['light','dark','sepia-light','sepia-dark','terminal-light','terminal-dark']

  // Load encrypted PAT on mount
  useEffect(() => {
    if (!isOpen) return
    
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
  }, [isOpen])

  /**
   * Check GitHub rate limit for the PAT
   */
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

  /**
   * Save PAT to encrypted localStorage
   */
  const handleSave = async () => {
    setError(null)
    setSaving(true)
    setSaved(false)

    try {
      // Validate format
      if (pat && !pat.startsWith('ghp_') && !pat.startsWith('github_pat_')) {
        throw new Error('Invalid PAT format. Should start with ghp_ or github_pat_')
      }

      // Encrypt and store
      if (pat) {
        const fingerprint = getBrowserFingerprint()
        const encrypted = await encrypt(pat, fingerprint)
        localStorage.setItem('gh_pat_encrypted', encrypted)
        await checkRateLimit(pat)
      } else {
        // Clear if empty
        localStorage.removeItem('gh_pat_encrypted')
        setRateLimit(null)
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save PAT')
    } finally {
      setSaving(false)
    }
  }

  /**
   * Clear stored PAT
   */
  const handleClear = () => {
    setPat('')
    localStorage.removeItem('gh_pat_encrypted')
    setRateLimit(null)
    setSaved(false)
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 flex items-center justify-center p-4"
        style={{ zIndex: Z_INDEX.PRIORITY_MODAL }}
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 rounded-2xl shadow-2xl border-2 border-gray-300 dark:border-gray-700"
        >
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b-2 border-gray-300 dark:border-gray-700 bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Key className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              Codex Settings
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* GitHub PAT Section */}
            <section className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    GitHub Personal Access Token
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Increase rate limit from 60 to 5,000 requests/hour
                  </p>
                </div>
                <a
                  href="https://github.com/settings/tokens/new?description=Frame%20Codex%20Viewer&scopes=public_repo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 flex items-center gap-1"
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
                  className="w-full px-4 py-3 pr-12 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 rounded-xl font-mono text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPat(!showPat)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
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
              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
              )}

              {/* Rate Limit Display */}
              {rateLimit && (
                <div className="p-4 bg-gradient-to-r from-emerald-50 to-cyan-50 dark:from-emerald-950 dark:to-cyan-950 border border-emerald-300 dark:border-emerald-800 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                        Rate Limit
                      </p>
                      <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100 mt-1">
                        {rateLimit.remaining.toLocaleString()} / {rateLimit.limit.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-emerald-700 dark:text-emerald-300">Resets</p>
                      <p className="text-sm font-mono text-emerald-900 dark:text-emerald-100">
                        {rateLimit.reset.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 h-2 bg-emerald-200 dark:bg-emerald-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-500"
                      style={{ width: `${(rateLimit.remaining / rateLimit.limit) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Security Notice */}
              <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1 bg-gray-100 dark:bg-gray-900 p-3 rounded-lg border border-gray-300 dark:border-gray-700">
                <p className="flex items-start gap-2">
                  <span className="text-amber-600 dark:text-amber-400 flex-shrink-0">🔒</span>
                  <span>
                    Your PAT is encrypted using AES-256-GCM with a browser fingerprint and stored only in your browser's localStorage.
                  </span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-cyan-600 dark:text-cyan-400 flex-shrink-0">ℹ️</span>
                  <span>
                    <strong>Required scope:</strong> <code className="px-1 py-0.5 bg-gray-200 dark:bg-gray-800 rounded">public_repo</code> (read-only access to public repositories)
                  </span>
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : saved ? (
                    <>
                      <Check className="w-4 h-4" />
                      Saved!
                    </>
                  ) : (
                    'Save PAT'
                  )}
                </button>
                <button
                  onClick={handleClear}
                  className="px-4 py-2.5 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-xl transition-colors"
                >
                  Clear
                </button>
              </div>
              
              {/* Auto-Merge Option */}
              {pat && (
                <div className="mt-4 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Auto-Merge PRs
                      </span>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        Automatically merge PRs when publishing weave/loom configs
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={false}
                      onChange={() => {
                        // This would need to be connected to preferences
                        // For now, we'll show this as a UI element
                      }}
                      className="w-5 h-5 rounded border-zinc-300 dark:border-zinc-600 text-cyan-500 focus:ring-cyan-500/30"
                    />
                  </label>
                </div>
              )}
            </section>

            {/* Theme Section */}
            <section className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Theme</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {themeOrder.map((name) => {
                  const meta = THEME_METADATA[name]
                  const isActive = theme === name
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setTheme(name)}
                      className={`
                        flex items-start gap-3 p-3 border-2 rounded-lg text-left transition-all
                        ${isActive ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/10' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'}
                      `}
                      aria-pressed={isActive}
                    >
                      <span
                        className="inline-block w-8 h-8 rounded-sm border"
                        style={{ backgroundColor: meta.backgroundColor, borderColor: meta.accentColor }}
                      />
                      <span className="flex-1">
                        <span className="block text-sm font-semibold">{meta.label}</span>
                        <span className="block text-xs text-gray-500 dark:text-gray-400">{meta.description}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}