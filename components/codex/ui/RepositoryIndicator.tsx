/**
 * Repository Indicator Component
 * @module codex/ui/RepositoryIndicator
 * 
 * @remarks
 * Displays the current Codex repository source with a sleek Fabric icon.
 * Shows repository owner/name and optional edit button.
 */

'use client'

import React from 'react'
import { Settings, Database, ExternalLink } from 'lucide-react'
import { REPO_CONFIG } from '../constants'

interface RepositoryIndicatorProps {
  /** Whether repo editing is enabled */
  allowEdit?: boolean
  /** Open repository settings */
  onEdit?: () => void
  /** Theme */
  theme?: string
  /** Compact mode (smaller) */
  compact?: boolean
}

/**
 * Repository indicator with Fabric icon and edit button
 */
export default function RepositoryIndicator({
  allowEdit = false,
  onEdit,
  theme = 'light',
  compact = false,
}: RepositoryIndicatorProps) {
  const isTerminal = theme?.includes('terminal')
  const isSepia = theme?.includes('sepia')
  
  const repoUrl = `https://github.com/${REPO_CONFIG.OWNER}/${REPO_CONFIG.NAME}`
  
  return (
    <div className={`
      flex items-center gap-2 
      ${compact ? 'p-1.5' : 'p-2'} 
      ${isTerminal 
        ? 'bg-black border border-green-500' 
        : isSepia 
        ? 'bg-amber-50 border border-amber-700'
        : 'bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700'
      }
      rounded-lg
    `}>
      {/* Fabric Icon - Minimalist geometric design */}
      <svg 
        className={`
          ${compact ? 'w-4 h-4' : 'w-5 h-5'} 
          flex-shrink-0
          ${isTerminal ? 'text-green-400' : isSepia ? 'text-amber-800' : 'text-gray-700 dark:text-gray-300'}
        `}
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Geometric fabric weave pattern */}
        <rect x="4" y="4" width="6" height="6" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <rect x="14" y="4" width="6" height="6" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <rect x="4" y="14" width="6" height="6" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <rect x="14" y="14" width="6" height="6" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <circle cx="12" cy="12" r="2" fill="currentColor" opacity="0.5" />
        <path d="M7 7 L12 12 L17 7" stroke="currentColor" strokeWidth="1" opacity="0.3" fill="none" />
        <path d="M7 17 L12 12 L17 17" stroke="currentColor" strokeWidth="1" opacity="0.3" fill="none" />
      </svg>
      
      {/* Repository Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <Database className={`
            ${compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} 
            flex-shrink-0
            ${isTerminal ? 'text-green-500' : isSepia ? 'text-amber-700' : 'text-gray-500 dark:text-gray-400'}
          `} />
          <a
            href={repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`
              ${compact ? 'text-[9px]' : 'text-[10px]'} 
              font-mono font-semibold 
              hover:underline truncate
              ${isTerminal 
                ? 'text-green-400 hover:text-green-300' 
                : isSepia 
                ? 'text-amber-900 hover:text-amber-800'
                : 'text-gray-700 dark:text-gray-300 hover:text-cyan-600 dark:hover:text-cyan-400'
              }
            `}
            title={`${REPO_CONFIG.OWNER}/${REPO_CONFIG.NAME}`}
          >
            {REPO_CONFIG.OWNER}/{REPO_CONFIG.NAME}
          </a>
          <ExternalLink className={`
            ${compact ? 'w-2 h-2' : 'w-2.5 h-2.5'} 
            flex-shrink-0 opacity-50
          `} />
        </div>
        <p className={`
          ${compact ? 'text-[8px]' : 'text-[9px]'} 
          ${isTerminal ? 'text-green-600' : isSepia ? 'text-amber-700' : 'text-gray-500 dark:text-gray-400'}
          uppercase tracking-wider
        `}>
          {REPO_CONFIG.BRANCH}
        </p>
      </div>
      
      {/* Edit Button (only if enabled) */}
      {allowEdit && onEdit && (
        <button
          onClick={onEdit}
          className={`
            ${compact ? 'p-1' : 'p-1.5'} 
            flex-shrink-0
            transition-all duration-200
            ${isTerminal
              ? 'bg-black border border-green-500 text-green-400 hover:bg-green-950'
              : isSepia
              ? 'bg-amber-100 border border-amber-700 text-amber-900 hover:bg-amber-200'
              : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }
            rounded
          `}
          title="Change repository source"
          aria-label="Edit repository settings"
        >
          <Settings className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        </button>
      )}
    </div>
  )
}

