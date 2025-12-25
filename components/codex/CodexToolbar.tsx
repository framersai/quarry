/**
 * Toolbar component for FABRIC Codex viewer
 * Contains navigation tools, contribute dropdown, and visualization toggle
 * @module codex/CodexToolbar
 */

'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Search, Info, Plus, GitPullRequest, HelpCircle, FileText, Code, Bookmark, BookmarkCheck, Star, Settings, LifeBuoy, Network, Clock, Edit3, Brain, Route, Sparkles, Target, Play, GraduationCap, Lightbulb, Map, Book, Undo2, Redo2, Activity, User, FolderTree, Puzzle } from 'lucide-react'
import { REPO_CONFIG } from './constants'
import ResponsiveToolbar from './ui/ResponsiveToolbar'
import TTSControls from './ui/TTSControls'
import type { TTSState, TTSSettings, TTSVoice } from './hooks/useTextToSpeech'
import { getUserProfile } from '@/lib/localStorage'
import { pluginUIRegistry } from '@/lib/plugins/QuarryPluginAPI'
import { quarryPluginManager } from '@/lib/plugins/QuarryPluginManager'
import { useToast } from './ui/Toast'

interface CodexToolbarProps {
  /** Current directory path */
  currentPath: string
  /** Whether metadata panel is open */
  metaOpen: boolean
  /** Toggle metadata panel */
  onToggleMeta: () => void
  /** Current file (if any) */
  currentFile?: { path: string; name: string } | null
  /** Whether current file is bookmarked */
  isBookmarked?: boolean
  /** Toggle bookmark for current file */
  onToggleBookmark?: () => void
  /** Open bookmarks panel */
  onOpenBookmarks?: () => void
  /** Open preferences */
  onOpenPreferences?: () => void
  /** Open help panel */
  onOpenHelp?: () => void
  /** Open graph view */
  onOpenGraph?: () => void
  /** Open timeline view */
  onOpenTimeline?: () => void
  /** Open contribution modal */
  onOpenContribute?: () => void
  /** Open editor modal */
  onOpenEditor?: () => void
  /** Open Q&A interface */
  onOpenQA?: () => void
  /** Open flashcard quiz */
  onOpenFlashcards?: () => void
  /** Open glossary popover */
  onOpenGlossary?: () => void
  /** Open mind map */
  onOpenMindMap?: () => void
  /** Open categorization review */
  onOpenCategorization?: () => void
  /** Create new blank strand (Cmd+N) */
  onNewBlank?: () => void
  /** Export canvas as strand (Cmd+E) */
  onExportCanvas?: () => void
  /** Whether canvas has content to export */
  canvasHasContent?: boolean
  /** Undo callback */
  onUndo?: () => void
  /** Redo callback */
  onRedo?: () => void
  /** Whether undo is available */
  canUndo?: boolean
  /** Whether redo is available */
  canRedo?: boolean
  /** Whether toolbar is collapsed */
  collapsed?: boolean
  /** Callback when collapse state changes */
  onCollapseChange?: (collapsed: boolean) => void
  /** Show collapse toggle button */
  showCollapseToggle?: boolean
  /** Text-to-speech controls */
  ttsState?: TTSState
  ttsSettings?: TTSSettings
  ttsVoices?: TTSVoice[]
  ttsSupported?: boolean
  /** Whether there is content available for TTS to read */
  ttsHasContent?: boolean
  onTTSPlay?: () => void
  onTTSPause?: () => void
  onTTSResume?: () => void
  onTTSStop?: () => void
  onTTSVolumeChange?: (volume: number) => void
  onTTSRateChange?: (rate: number) => void
  onTTSPitchChange?: (pitch: number) => void
  onTTSVoiceChange?: (voice: TTSVoice) => void
  theme?: string
}

/**
 * Toolbar with high-level navigation and actions
 * 
 * @remarks
 * - Search, Architecture, Info buttons
 * - Contribute dropdown with context-aware options
 * - Mobile-optimized with 44px+ touch targets
 * - Tooltips for accessibility
 * 
 * @example
 * ```tsx
 * <CodexToolbar
 *   currentPath="weaves/tech"
 *   metaOpen={metaOpen}
 *   onToggleMeta={() => setMetaOpen(v => !v)}
 * />
 * ```
 */
export default function CodexToolbar({
  currentPath,
  metaOpen,
  onToggleMeta,
  currentFile,
  isBookmarked,
  onToggleBookmark,
  onOpenBookmarks,
  onOpenPreferences,
  onOpenHelp,
  onOpenGraph,
  onOpenTimeline,
  onOpenContribute,
  onOpenEditor,
  onOpenQA,
  onOpenFlashcards,
  onOpenGlossary,
  onOpenMindMap,
  onOpenCategorization,
  onNewBlank,
  onExportCanvas,
  canvasHasContent = false,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  collapsed = false,
  onCollapseChange,
  showCollapseToggle = true,
  ttsState,
  ttsSettings,
  ttsVoices = [],
  ttsSupported = false,
  ttsHasContent = false,
  onTTSPlay,
  onTTSPause,
  onTTSResume,
  onTTSStop,
  onTTSVolumeChange,
  onTTSRateChange,
  onTTSPitchChange,
  onTTSVoiceChange,
  theme = 'light',
}: CodexToolbarProps) {
  const [showContribute, setShowContribute] = useState(false)
  const [showBookmarkMenu, setShowBookmarkMenu] = useState(false)
  const toast = useToast()

  // Quarry Plugin System: Subscribe to plugin toolbar buttons
  const [pluginButtons, setPluginButtons] = useState<typeof pluginUIRegistry.allToolbarButtons>([])
  useEffect(() => {
    setPluginButtons(pluginUIRegistry.allToolbarButtons)
    const unsubscribe = pluginUIRegistry.onChange(() => {
      setPluginButtons([...pluginUIRegistry.allToolbarButtons])
    })
    return unsubscribe
  }, [])

  // Filter for enabled plugins only
  const activePluginButtons = pluginButtons.filter(({ pluginId }) =>
    quarryPluginManager.isEnabled(pluginId)
  )

  // Build contribution URLs
  const currentDir = currentPath || ''
  const baseNewUrl = `https://github.com/${REPO_CONFIG.OWNER}/${REPO_CONFIG.NAME}/new/${REPO_CONFIG.BRANCH}/${
    currentDir ? `${currentDir}/` : ''
  }`
  const addStrandUrl = `${baseNewUrl}?filename=new-strand.md`
  const pathSegments = currentDir.split('/').filter(Boolean)
  let yamlSuggestion = ''
  if (pathSegments[0] === 'weaves') {
    if (pathSegments.length === 2) {
      yamlSuggestion = 'weave.yaml'
    } else if (pathSegments.length > 2) {
      yamlSuggestion = 'loom.yaml'
    }
  }
  const addYamlUrl = yamlSuggestion ? `${baseNewUrl}?filename=${yamlSuggestion}` : ''

  const groups = [
    {
      id: 'discover',
      label: 'Discover',
      items: [
        {
          id: 'search',
          label: 'Search',
          icon: <Search className="w-4 h-4" />,
          description: 'Advanced search',
          hotkey: '/',
          onClick: () => { window.location.href = '/codex/search' },
        },
        ...(onOpenGraph ? [{
          id: 'graph',
          label: 'Graph',
          icon: <Network className="w-4 h-4" />,
          description: 'Full fabric graph (g)',
          hotkey: 'g',
          onClick: onOpenGraph,
        }] : [{
          id: 'graph',
          label: 'Graph',
          icon: <Network className="w-4 h-4" />,
          description: 'Full fabric graph',
          href: '/codex/graph',
        }]),
        ...(onOpenTimeline ? [{
          id: 'timeline',
          label: 'Timeline',
          icon: <Clock className="w-4 h-4" />,
          description: 'Reading timeline',
          onClick: onOpenTimeline,
        }] : []),
        // Learning Path - show different options based on whether a file is selected
        ...(currentFile ? [
          {
            id: 'spiral-path-goal',
            label: 'Learn This',
            icon: <Target className="w-4 h-4" />,
            description: 'Set this strand as learning goal',
            onClick: () => {
              const url = new URL('/codex/spiral-path/', window.location.origin)
              url.searchParams.set('strand', currentFile.path)
              url.searchParams.set('as', 'goal')
              window.location.href = url.toString()
            },
          },
          {
            id: 'spiral-path-start',
            label: 'Start From Here',
            icon: <Play className="w-4 h-4" />,
            description: 'Set this strand as starting point',
            onClick: () => {
              const url = new URL('/codex/spiral-path/', window.location.origin)
              url.searchParams.set('strand', currentFile.path)
              url.searchParams.set('as', 'start')
              window.location.href = url.toString()
            },
          },
        ] : []),
        {
          id: 'spiral-path',
          label: 'Learning Path',
          icon: <Route className="w-4 h-4" />,
          description: 'Open spiral learning path planner',
          href: '/codex/spiral-path/',
        },
      ],
    },
    {
      id: 'create',
      label: 'Create',
      items: [
        ...(onNewBlank ? [{
          id: 'new-blank',
          label: 'New Blank',
          icon: <FileText className="w-4 h-4" />,
          description: 'Start with empty editor (Cmd+N)',
          hotkey: 'Cmd+N',
          onClick: onNewBlank,
        }] : []),
        {
          id: 'new-strand',
          label: 'New Strand',
          icon: <Sparkles className="w-4 h-4" />,
          description: 'Create with wizard (Cmd+Shift+N)',
          hotkey: 'Cmd+Shift+N',
          href: '/codex/new/',
        },
        ...(onExportCanvas ? [{
          id: 'from-canvas',
          label: 'From Canvas',
          icon: <Edit3 className="w-4 h-4" />,
          description: canvasHasContent ? 'Export whiteboard as strand (Cmd+E)' : 'Canvas is empty',
          hotkey: 'Cmd+E',
          onClick: onExportCanvas,
          disabled: !canvasHasContent,
        }] : []),
      ],
    },
    {
      id: 'edit',
      label: 'Edit',
      items: [
        ...(currentFile && onOpenEditor ? [{
          id: 'edit-strand',
          label: 'Edit Strand',
          icon: <Edit3 className="w-4 h-4" />,
          description: 'Edit in WYSIWYG editor (e)',
          hotkey: 'e',
          onClick: onOpenEditor,
        }] : []),
        ...(onToggleBookmark ? [{
          id: 'bookmark',
          label: isBookmarked ? 'Saved' : 'Save',
          icon: isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />,
          description: isBookmarked ? 'Remove bookmark (b)' : 'Bookmark this strand (b)',
          hotkey: 'b',
          disabled: !currentFile,
          onClick: () => onToggleBookmark && onToggleBookmark(),
        }] : []),
        // Delete strand moved from System
        ...(currentFile ? [{
          id: 'delete-strand',
          label: 'Delete',
          icon: <GitPullRequest className="w-4 h-4 text-red-500" />,
          description: 'Delete strand (GitHub PR)',
          onClick: () => {
            window.open(
              `https://github.com/${REPO_CONFIG.OWNER}/${REPO_CONFIG.NAME}/delete/${REPO_CONFIG.BRANCH}/${currentFile.path}`,
              '_blank',
              'noopener,noreferrer'
            )
          },
        }] : []),
        // Categorization
        ...(onOpenCategorization ? [{
          id: 'categorize',
          label: 'Categorize',
          icon: <FolderTree className="w-4 h-4" />,
          description: 'Review inbox categorizations',
          onClick: onOpenCategorization,
        }] : []),
        // Undo/Redo
        ...(onUndo ? [{
          id: 'undo',
          label: 'Undo',
          icon: <Undo2 className={`w-4 h-4 ${!canUndo ? 'opacity-40' : ''}`} />,
          description: 'Undo last action (Ctrl+Z)',
          hotkey: 'Ctrl+Z',
          disabled: !canUndo,
          onClick: onUndo,
        }] : []),
        ...(onRedo ? [{
          id: 'redo',
          label: 'Redo',
          icon: <Redo2 className={`w-4 h-4 ${!canRedo ? 'opacity-40' : ''}`} />,
          description: 'Redo last action (Ctrl+Shift+Z)',
          hotkey: 'Ctrl+Shift+Z',
          disabled: !canRedo,
          onClick: onRedo,
        }] : []),
      ],
    },
    {
      id: 'learn',
      label: 'Learn',
      items: [
        {
          id: 'learning-studio',
          label: 'Learning Studio',
          icon: <GraduationCap className="w-4 h-4" />,
          description: currentFile ? 'Full learning experience (l)' : 'Select a strand first',
          hotkey: 'l',
          // Only show href when a file is selected, otherwise use disabled onClick
          ...(currentFile
            ? { href: `/codex/learn?strand=${encodeURIComponent(currentFile.path)}` }
            : { onClick: () => {}, disabled: true }
          ),
        },
        ...(onOpenFlashcards ? [{
          id: 'flashcards',
          label: 'Flashcards',
          icon: <Lightbulb className="w-4 h-4" />,
          description: currentFile ? 'Study with flashcards (f)' : 'Select a strand first',
          hotkey: 'f',
          onClick: onOpenFlashcards,
          disabled: !currentFile,
        }] : []),
        ...(onOpenGlossary ? [{
          id: 'glossary',
          label: 'Glossary',
          icon: <Book className="w-4 h-4" />,
          description: currentFile ? 'View key terms (g)' : 'Select a strand first',
          hotkey: 'g',
          onClick: onOpenGlossary,
          disabled: !currentFile,
        }] : []),
        ...(onOpenMindMap ? [{
          id: 'mindmap',
          label: 'Mind Map',
          icon: <Map className="w-4 h-4" />,
          description: currentFile ? 'Knowledge mind map (M)' : 'Select a strand first',
          hotkey: 'M',
          onClick: onOpenMindMap,
          disabled: !currentFile,
        }] : []),
        {
          id: 'suggestions',
          label: 'Suggest',
          icon: <Sparkles className="w-4 h-4" />,
          description: currentFile ? 'Get study suggestions' : 'Select a strand first',
          // Only show href when a file is selected, otherwise use disabled onClick
          ...(currentFile
            ? { href: `/codex/suggestions?strand=${encodeURIComponent(currentFile.path)}` }
            : { onClick: () => {}, disabled: true }
          ),
        },
      ],
    },
    {
      id: 'view',
      label: 'View',
      items: [
        {
          id: 'info',
          label: 'Info',
          icon: <Info className="w-4 h-4" />,
          description: 'Toggle metadata panel (m)',
          hotkey: 'm',
          onClick: onToggleMeta,
        },
        // Help moved from System
        ...(onOpenHelp ? [{
          id: 'help',
          label: 'Help',
          icon: <LifeBuoy className="w-4 h-4" />,
          description: 'Help & Keyboard Shortcuts (?)',
          hotkey: '?',
          onClick: onOpenHelp,
        }] : []),
        // Settings moved from System
        ...(onOpenPreferences ? [{
          id: 'settings',
          label: 'Settings',
          icon: <Settings className="w-4 h-4" />,
          description: 'Preferences (,)',
          hotkey: ',',
          onClick: onOpenPreferences,
        }] : []),
        // Activity log
        {
          id: 'activity',
          label: 'Activity',
          icon: <Activity className="w-4 h-4" />,
          description: 'View activity log & undo history',
          href: '/codex/activity',
        },
      ],
    },
    // Quarry Plugin System: Plugin toolbar buttons
    ...(activePluginButtons.length > 0 ? [{
      id: 'plugins',
      label: 'Plugins',
      items: activePluginButtons.map(({ pluginId, options }) => ({
        id: `plugin-${pluginId}-${options.id}`,
        label: options.label,
        icon: React.isValidElement(options.icon) ? options.icon : <Puzzle className="w-4 h-4" />,
        description: options.shortcut
          ? `${options.label} (${options.shortcut})`
          : options.label,
        hotkey: options.shortcut,
        onClick: () => {
          try {
            options.onClick()
          } catch (error) {
            console.error(`[Plugin:${pluginId}] Button error:`, error)
            toast.error(`Plugin error: ${error instanceof Error ? error.message : 'Unknown error'}`)
          }
        },
        isActive: options.isActive,
      })),
    }] : []),
    // ASK - Direct button after View (no dropdown, direct action)
    ...(onOpenQA ? [{
      id: 'ask',
      label: 'Ask',
      directAction: true, // Renders as a direct button, not a dropdown
      items: [
        {
          id: 'ask-brain',
          label: 'Ask',
          icon: <Brain className="w-4 h-4" />,
          description: 'Ask your knowledge base (Ctrl+K)',
          hotkey: 'Ctrl+K',
          onClick: onOpenQA,
        },
      ],
    }] : []),
  ]

  // Get user profile for display
  const profile = getUserProfile()

  return (
    <div className="flex items-center gap-4 justify-between w-full">
      <ResponsiveToolbar
        groups={groups as any}
        collapsed={collapsed}
        onCollapseChange={onCollapseChange}
        showCollapseToggle={showCollapseToggle}
      />

      <div className="flex items-center gap-2 flex-shrink-0">
        {/* TTS Controls */}
        {ttsSupported && ttsState && ttsSettings && onTTSPlay && (
          <TTSControls
            state={ttsState}
            settings={ttsSettings}
            availableVoices={ttsVoices}
            isSupported={ttsSupported}
            hasContent={ttsHasContent}
            onPlay={onTTSPlay}
            onPause={onTTSPause || (() => {})}
            onResume={onTTSResume || (() => {})}
            onStop={onTTSStop || (() => {})}
            onVolumeChange={onTTSVolumeChange || (() => {})}
            onRateChange={onTTSRateChange || (() => {})}
            onPitchChange={onTTSPitchChange || (() => {})}
            onVoiceChange={onTTSVoiceChange || (() => {})}
            theme={theme}
          />
        )}

        {/* Profile Indicator */}
        {onOpenPreferences && (
          <button
            onClick={onOpenPreferences}
            className="flex items-center gap-2 px-2 py-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors group"
            title={`${profile.displayName} • Click to open settings`}
          >
            <div className="w-7 h-7 rounded-full overflow-hidden bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-sm ring-2 ring-white dark:ring-zinc-900 group-hover:ring-cyan-200 dark:group-hover:ring-cyan-800 transition-all">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                profile.displayName.charAt(0).toUpperCase()
              )}
            </div>
            <span className="hidden sm:block text-xs font-medium text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-200 transition-colors max-w-[80px] truncate">
              {profile.displayName}
            </span>
          </button>
        )}
      </div>
    </div>
  )
}







