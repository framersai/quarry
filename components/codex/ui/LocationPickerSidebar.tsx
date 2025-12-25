/**
 * Location Picker Sidebar for Strand Creation
 * @module codex/ui/LocationPickerSidebar
 *
 * Shows a file explorer-like tree for selecting where to save new strands.
 * Always visible sidebar with quick presets and expandable weave/loom hierarchy.
 */

'use client'

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Inbox,
  BookOpen,
  FileText,
  Lightbulb,
  Bookmark,
  FlaskConical,
  FolderPlus,
  Check,
  MapPin,
} from 'lucide-react'

interface LocationPickerSidebarProps {
  /** Current selected target path */
  targetPath: string
  /** Callback when path is selected */
  onSelectPath: (path: string) => void
  /** Whether dark mode is enabled */
  isDark?: boolean
  /** Available weaves/looms structure (optional - uses defaults if not provided) */
  structure?: LocationNode[]
}

interface LocationNode {
  id: string
  name: string
  path: string
  icon?: React.ElementType
  children?: LocationNode[]
  description?: string
}

// Default weave/loom structure
const DEFAULT_STRUCTURE: LocationNode[] = [
  {
    id: 'inbox',
    name: 'Inbox',
    path: 'weaves/inbox/',
    icon: Inbox,
    description: 'Unsorted new strands',
  },
  {
    id: 'wiki',
    name: 'Wiki',
    path: 'weaves/wiki/',
    icon: BookOpen,
    children: [
      { id: 'tutorials', name: 'Tutorials', path: 'weaves/wiki/tutorials/' },
      { id: 'reference', name: 'Reference', path: 'weaves/wiki/reference/' },
      { id: 'concepts', name: 'Concepts', path: 'weaves/wiki/concepts/' },
      { id: 'how-to', name: 'How-To Guides', path: 'weaves/wiki/how-to/' },
      { id: 'best-practices', name: 'Best Practices', path: 'weaves/wiki/best-practices/' },
      { id: 'troubleshooting', name: 'Troubleshooting', path: 'weaves/wiki/troubleshooting/' },
      { id: 'architecture', name: 'Architecture', path: 'weaves/wiki/architecture/' },
      { id: 'comparisons', name: 'Comparisons', path: 'weaves/wiki/comparisons/' },
      { id: 'case-studies', name: 'Case Studies', path: 'weaves/wiki/case-studies/' },
    ],
  },
  {
    id: 'notes',
    name: 'Notes',
    path: 'weaves/notes/',
    icon: FileText,
    description: 'Personal notes',
  },
  {
    id: 'research',
    name: 'Research',
    path: 'weaves/research/',
    icon: FlaskConical,
    description: 'Research & exploration',
  },
  {
    id: 'projects',
    name: 'Projects',
    path: 'weaves/projects/',
    icon: Bookmark,
    description: 'Project documentation',
  },
  {
    id: 'ideas',
    name: 'Ideas',
    path: 'weaves/ideas/',
    icon: Lightbulb,
    description: 'Ideas & brainstorms',
  },
]

// Quick preset paths
const QUICK_PRESETS = [
  { path: 'weaves/inbox/', label: 'Inbox', icon: Inbox },
  { path: 'weaves/wiki/tutorials/', label: 'Tutorials', icon: BookOpen },
  { path: 'weaves/notes/', label: 'Notes', icon: FileText },
]

interface TreeNodeProps {
  node: LocationNode
  selectedPath: string
  onSelect: (path: string) => void
  isDark: boolean
  level?: number
  expandedNodes: Set<string>
  onToggleExpand: (id: string) => void
}

function TreeNode({
  node,
  selectedPath,
  onSelect,
  isDark,
  level = 0,
  expandedNodes,
  onToggleExpand,
}: TreeNodeProps) {
  const hasChildren = node.children && node.children.length > 0
  const isExpanded = expandedNodes.has(node.id)
  const isSelected = selectedPath === node.path
  const Icon = node.icon || (hasChildren ? (isExpanded ? FolderOpen : Folder) : Folder)

  return (
    <div>
      <button
        onClick={() => {
          if (hasChildren) {
            onToggleExpand(node.id)
          }
          onSelect(node.path)
        }}
        className={`
          w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
          transition-all group
          ${isSelected
            ? isDark
              ? 'bg-cyan-900/50 text-cyan-300 border border-cyan-700'
              : 'bg-cyan-100 text-cyan-700 border border-cyan-300'
            : isDark
              ? 'hover:bg-zinc-800 text-zinc-300'
              : 'hover:bg-zinc-100 text-zinc-700'
          }
        `}
        style={{ paddingLeft: `${12 + level * 16}px` }}
      >
        {hasChildren && (
          <span className="flex-shrink-0">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </span>
        )}
        {!hasChildren && level > 0 && <span className="w-4" />}
        <Icon className={`w-4 h-4 flex-shrink-0 ${isSelected ? '' : 'opacity-60'}`} />
        <span className="truncate flex-1 text-left">{node.name}</span>
        {isSelected && (
          <Check className="w-4 h-4 flex-shrink-0 text-cyan-500" />
        )}
      </button>

      <AnimatePresence>
        {hasChildren && isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            {node.children!.map((child) => (
              <TreeNode
                key={child.id}
                node={child}
                selectedPath={selectedPath}
                onSelect={onSelect}
                isDark={isDark}
                level={level + 1}
                expandedNodes={expandedNodes}
                onToggleExpand={onToggleExpand}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function LocationPickerSidebar({
  targetPath,
  onSelectPath,
  isDark = false,
  structure = DEFAULT_STRUCTURE,
}: LocationPickerSidebarProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['wiki']))

  const toggleExpand = (id: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Find current selection name for display
  const currentSelectionName = useMemo(() => {
    function findName(nodes: LocationNode[]): string | null {
      for (const node of nodes) {
        if (node.path === targetPath) return node.name
        if (node.children) {
          const found = findName(node.children)
          if (found) return found
        }
      }
      return null
    }
    return findName(structure) || targetPath
  }, [targetPath, structure])

  return (
    <div
      className={`
        w-56 flex-shrink-0 border-r flex flex-col h-full
        ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}
      `}
    >
      {/* Header */}
      <div className={`px-4 py-3 border-b ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
        <div className="flex items-center gap-2 mb-2">
          <MapPin className={`w-4 h-4 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
          <span className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            Save Location
          </span>
        </div>
        <div className={`text-sm font-medium truncate ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
          {currentSelectionName}
        </div>
      </div>

      {/* Quick Presets */}
      <div className={`px-3 py-2 border-b ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
        <div className="flex flex-wrap gap-1">
          {QUICK_PRESETS.map((preset) => {
            const PresetIcon = preset.icon
            const isActive = targetPath === preset.path
            return (
              <button
                key={preset.path}
                onClick={() => onSelectPath(preset.path)}
                className={`
                  px-2 py-1 rounded text-xs font-medium transition-colors
                  flex items-center gap-1
                  ${isActive
                    ? isDark
                      ? 'bg-cyan-900/50 text-cyan-300'
                      : 'bg-cyan-100 text-cyan-700'
                    : isDark
                      ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-800'
                  }
                `}
              >
                <PresetIcon className="w-3 h-3" />
                {preset.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tree View */}
      <div className="flex-1 overflow-y-auto py-2 px-2">
        {structure.map((node) => (
          <TreeNode
            key={node.id}
            node={node}
            selectedPath={targetPath}
            onSelect={onSelectPath}
            isDark={isDark}
            expandedNodes={expandedNodes}
            onToggleExpand={toggleExpand}
          />
        ))}
      </div>

      {/* Footer - Create New Loom */}
      <div className={`px-3 py-3 border-t ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
        <button
          onClick={() => {
            // TODO: Open create loom modal
            const loomName = prompt('Enter new loom name:')
            if (loomName) {
              const slug = loomName.toLowerCase().replace(/\s+/g, '-')
              onSelectPath(`weaves/${slug}/`)
            }
          }}
          className={`
            w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
            transition-colors
            ${isDark
              ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
              : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
            }
          `}
        >
          <FolderPlus className="w-4 h-4" />
          New Loom
        </button>
      </div>
    </div>
  )
}
