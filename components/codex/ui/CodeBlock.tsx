/**
 * Code block component with syntax highlighting, copy button, and language selector
 * Uses lowlight for highlighting (same as TipTap code-block-lowlight)
 *
 * PERFORMANCE: Lowlight is lazy-loaded on first code block render
 * - Reduces initial bundle size by ~200KB
 * - Shows plain code immediately, adds highlighting when loaded
 *
 * @module codex/ui/CodeBlock
 */

'use client'

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { Check, Copy, ChevronDown } from 'lucide-react'

// Lazy-loaded lowlight instance (initialized on first use)
let lowlightInstance: any = null
let lowlightPromise: Promise<any> | null = null

/**
 * Initialize lowlight lazily - only loads when first code block renders
 * Returns cached instance if already loaded
 */
async function getLowlight() {
  if (lowlightInstance) return lowlightInstance

  if (!lowlightPromise) {
    lowlightPromise = (async () => {
      const [{ createLowlight, common }, { toHtml }] = await Promise.all([
        import('lowlight'),
        import('hast-util-to-html')
      ])
      lowlightInstance = { lowlight: createLowlight(common), toHtml }
      return lowlightInstance
    })()
  }

  return lowlightPromise
}

// Popular languages for the dropdown (subset of common)
const POPULAR_LANGUAGES = [
  { value: '', label: 'Auto-detect' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'c', label: 'C' },
  { value: 'cpp', label: 'C++' },
  { value: 'csharp', label: 'C#' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'php', label: 'PHP' },
  { value: 'swift', label: 'Swift' },
  { value: 'kotlin', label: 'Kotlin' },
  { value: 'bash', label: 'Bash/Shell' },
  { value: 'sql', label: 'SQL' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'json', label: 'JSON' },
  { value: 'yaml', label: 'YAML' },
  { value: 'xml', label: 'XML' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'diff', label: 'Diff' },
  { value: 'plaintext', label: 'Plain Text' },
]

interface CodeBlockProps {
  code: string
  language?: string
  blockId?: string
  /** Execution ID for persistence (from remark plugin) */
  execId?: string
  /** Whether this code block is executable */
  executable?: boolean
  /** Callback when code is edited (for executable blocks) */
  onCodeChange?: (code: string) => void
  /** Callback to save output to markdown (for executable blocks) */
  onSaveOutput?: (output: string[]) => void
  className?: string
}

// Lazy load ExecutableCodeBlock only when needed
let ExecutableCodeBlockComponent: React.ComponentType<any> | null = null
let executableCodeBlockPromise: Promise<any> | null = null

async function getExecutableCodeBlock() {
  if (ExecutableCodeBlockComponent) return ExecutableCodeBlockComponent

  if (!executableCodeBlockPromise) {
    executableCodeBlockPromise = import('./ExecutableCodeBlock').then((mod) => {
      ExecutableCodeBlockComponent = mod.default
      return ExecutableCodeBlockComponent
    })
  }

  return executableCodeBlockPromise
}

/**
 * Syntax-highlighted code block with copy button and language selector
 * PERFORMANCE: Uses lazy-loaded lowlight - shows plain code first, then highlights
 *
 * When `executable` is true, renders ExecutableCodeBlock with run capability
 */
export default function CodeBlock({
  code,
  language: initialLanguage,
  blockId,
  execId,
  executable = false,
  onCodeChange,
  onSaveOutput,
  className,
}: CodeBlockProps) {
  // ALL HOOKS MUST BE DECLARED AT THE TOP - React rules of hooks
  const [ExecutableBlock, setExecutableBlock] = useState<React.ComponentType<any> | null>(null)
  const [copied, setCopied] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState(initialLanguage || '')
  const [highlighter, setHighlighter] = useState<any>(null)
  const [isHighlightReady, setIsHighlightReady] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Lazy load ExecutableCodeBlock when executable prop is true
  useEffect(() => {
    if (executable && !ExecutableBlock) {
      getExecutableCodeBlock().then(setExecutableBlock)
    }
  }, [executable, ExecutableBlock])

  // Load lowlight lazily on mount
  useEffect(() => {
    let mounted = true
    getLowlight().then((hl) => {
      if (mounted) {
        setHighlighter(hl)
        setIsHighlightReady(true)
      }
    })
    return () => { mounted = false }
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Normalize code (remove trailing newline)
  const normalizedCode = useMemo(() => code.replace(/\n$/, ''), [code])

  // Auto-detect language if not specified (only when highlighter is ready)
  const detectedLanguage = useMemo(() => {
    if (selectedLanguage && selectedLanguage !== 'plaintext') {
      return selectedLanguage
    }

    if (!isHighlightReady || !highlighter) {
      return ''
    }

    // Try to auto-detect
    try {
      const result = highlighter.lowlight.highlightAuto(normalizedCode)
      // Only use detected language if confidence is reasonable
      if (result.data && (result.data as any).language) {
        return (result.data as any).language
      }
    } catch {
      // Ignore detection errors
    }

    return ''
  }, [normalizedCode, selectedLanguage, isHighlightReady, highlighter])

  // Get highlighted HTML (with fallback to plain text while loading)
  const highlightedHtml = useMemo(() => {
    if (!normalizedCode) return ''

    // If highlighter not ready yet, show plain escaped text
    if (!isHighlightReady || !highlighter) {
      return escapeHtml(normalizedCode)
    }

    try {
      let result
      if (detectedLanguage && detectedLanguage !== 'plaintext') {
        // Try to highlight with specified/detected language
        try {
          result = highlighter.lowlight.highlight(detectedLanguage, normalizedCode)
        } catch {
          // Language not registered, fall back to auto
          result = highlighter.lowlight.highlightAuto(normalizedCode)
        }
      } else {
        // Auto-detect
        result = highlighter.lowlight.highlightAuto(normalizedCode)
      }
      return highlighter.toHtml(result)
    } catch {
      // Fallback to plain text
      return escapeHtml(normalizedCode)
    }
  }, [normalizedCode, detectedLanguage, isHighlightReady, highlighter])

  // Display language name
  const displayLanguage = useMemo(() => {
    const lang = selectedLanguage || detectedLanguage
    if (!lang) return 'auto'
    const found = POPULAR_LANGUAGES.find(l => l.value === lang)
    return found ? found.label : lang
  }, [selectedLanguage, detectedLanguage])

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(normalizedCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }, [normalizedCode])

  // Handle language selection
  const handleLanguageSelect = useCallback((lang: string) => {
    setSelectedLanguage(lang)
    setShowDropdown(false)
  }, [])

  // If executable and component is loaded, render ExecutableCodeBlock
  // This must be after all hooks are called
  if (executable && ExecutableBlock) {
    return (
      <ExecutableBlock
        code={code}
        language={initialLanguage}
        blockId={blockId}
        execId={execId}
        executable={true}
        onCodeChange={onCodeChange}
        onSaveOutput={onSaveOutput}
        className={className}
      />
    )
  }

  return (
    <div
      data-block-id={blockId}
      data-block-type="code"
      className={`relative group my-2 rounded-md overflow-hidden border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 ${className || ''}`}
    >
      {/* Header bar with language selector and copy button */}
      <div className="flex items-center justify-between px-2 py-0.5 bg-gray-50 dark:bg-zinc-800 border-b border-gray-200 dark:border-zinc-700">
        {/* Language selector */}
        <div className="relative">
          <button
            ref={buttonRef}
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-1 px-1 py-0.5 text-[10px] font-mono font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded transition-colors"
            title="Select language"
          >
            {displayLanguage}
            <ChevronDown className="w-2.5 h-2.5" />
          </button>

          {/* Dropdown menu */}
          {showDropdown && (
            <div
              ref={dropdownRef}
              className="absolute top-full left-0 mt-1 w-40 max-h-56 overflow-y-auto bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md shadow-lg z-50"
            >
              {POPULAR_LANGUAGES.map((lang) => (
                <button
                  key={lang.value || 'auto'}
                  onClick={() => handleLanguageSelect(lang.value)}
                  className={`w-full text-left px-2 py-1 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors ${
                    (selectedLanguage === lang.value) || (!selectedLanguage && !lang.value)
                      ? 'bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 font-medium'
                      : 'text-zinc-600 dark:text-zinc-300'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Copy button */}
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1 px-1 py-0.5 text-[10px] font-medium rounded transition-all ${
            copied
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
          }`}
          title={copied ? 'Copied!' : 'Copy code'}
        >
          {copied ? (
            <>
              <Check className="w-2.5 h-2.5" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-2.5 h-2.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code content */}
      <pre className="!m-0 !bg-white dark:!bg-zinc-900 !p-0 !border-0 !rounded-none overflow-x-auto">
        <code
          className="block px-4 py-3 text-[13px] font-mono leading-relaxed hljs !bg-transparent"
          dangerouslySetInnerHTML={{ __html: highlightedHtml }}
        />
      </pre>
    </div>
  )
}

/**
 * Escape HTML entities for plain text fallback
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
