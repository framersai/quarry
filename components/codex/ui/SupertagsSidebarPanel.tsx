/**
 * Supertags Sidebar Panel
 * @module codex/ui/SupertagsSidebarPanel
 *
 * @description
 * Sidebar panel for managing and applying supertags.
 * Shows available supertag schemas and allows creating new ones.
 *
 * @features
 * - Browse all available supertag schemas
 * - Quick-apply supertags to selected content
 * - Create and edit supertag schemas
 * - Search and filter supertags
 * - Preview supertag fields
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as Icons from 'lucide-react'
import {
  Sparkles,
  Plus,
  Search,
  ChevronDown,
  ChevronRight,
  Tag,
  Edit,
  Trash2,
  Star,
  Check,
  X,
  Layers,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getAllSchemas,
  deleteSchema,
  initializeSupertags,
  type SupertagSchema,
} from '@/lib/supertags'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface SupertagsSidebarPanelProps {
  /** Theme for styling */
  theme?: 'light' | 'dark'
  /** Currently selected block ID (for applying supertags) */
  selectedBlockId?: string
  /** Currently selected strand path */
  selectedStrandPath?: string
  /** Callback when a supertag is selected to apply */
  onApplySupertag?: (schema: SupertagSchema) => void
  /** Callback to open supertag schema designer */
  onOpenDesigner?: (schema?: SupertagSchema) => void
  /** Additional class names */
  className?: string
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════════════ */

function getIconComponent(iconName?: string): React.ElementType {
  if (!iconName) return Tag
  const IconsRecord = Icons as unknown as Record<string, React.ElementType>
  const Icon = IconsRecord[iconName]
  return Icon || Tag
}

/* ═══════════════════════════════════════════════════════════════════════════
   SUPERTAG CARD
═══════════════════════════════════════════════════════════════════════════ */

interface SupertagCardProps {
  schema: SupertagSchema
  theme: 'light' | 'dark'
  onApply?: () => void
  onEdit?: () => void
  onDelete?: () => void
  canDelete?: boolean
}

function SupertagCard({
  schema,
  theme,
  onApply,
  onEdit,
  onDelete,
  canDelete = true,
}: SupertagCardProps) {
  const isDark = theme === 'dark'
  const [expanded, setExpanded] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const Icon = getIconComponent(schema.icon)
  const color = schema.color || '#71717a'

  return (
    <motion.div
      layout
      className={cn(
        'rounded-lg border overflow-hidden',
        isDark ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-200 bg-white'
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2 cursor-pointer',
          'hover:bg-black/5 dark:hover:bg-white/5 transition-colors'
        )}
        style={{ borderLeftColor: color, borderLeftWidth: '3px' }}
        onClick={() => setExpanded(!expanded)}
      >
        <div
          className="p-1.5 rounded-md"
          style={{ backgroundColor: color + '20' }}
        >
          <Icon className="w-3.5 h-3.5" style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className={cn(
            'text-xs font-medium truncate',
            isDark ? 'text-zinc-200' : 'text-zinc-800'
          )}>
            #{schema.displayName || schema.tagName}
          </div>
          <div className="text-[10px] text-zinc-500 truncate">
            {schema.fields.length} field{schema.fields.length !== 1 ? 's' : ''}
          </div>
        </div>
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
        )}
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            {/* Description */}
            {schema.description && (
              <div className={cn(
                'px-3 py-2 text-[10px] border-t',
                isDark ? 'border-zinc-800 text-zinc-400' : 'border-zinc-100 text-zinc-600'
              )}>
                {schema.description}
              </div>
            )}

            {/* Fields Preview */}
            <div className={cn(
              'px-3 py-2 border-t',
              isDark ? 'border-zinc-800' : 'border-zinc-100'
            )}>
              <div className="text-[9px] text-zinc-500 uppercase tracking-wider mb-2">
                Fields
              </div>
              <div className="space-y-1">
                {schema.fields.slice(0, 5).map(field => {
                  const FieldIcon = getIconComponent(
                    field.type === 'text' ? 'Type' :
                    field.type === 'number' ? 'Hash' :
                    field.type === 'date' ? 'Calendar' :
                    field.type === 'checkbox' ? 'CheckSquare' :
                    field.type === 'select' ? 'List' :
                    field.type === 'rating' ? 'Star' :
                    field.type === 'progress' ? 'Percent' :
                    field.type === 'url' ? 'Link' :
                    'Type'
                  )
                  return (
                    <div
                      key={field.name}
                      className="flex items-center gap-2"
                    >
                      <FieldIcon className="w-3 h-3 text-zinc-500" />
                      <span className={cn(
                        'text-[10px] flex-1',
                        isDark ? 'text-zinc-300' : 'text-zinc-700'
                      )}>
                        {field.label}
                      </span>
                      {field.required && (
                        <span className="text-[8px] text-amber-500 font-medium">
                          REQ
                        </span>
                      )}
                    </div>
                  )
                })}
                {schema.fields.length > 5 && (
                  <div className="text-[9px] text-zinc-500">
                    +{schema.fields.length - 5} more
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className={cn(
              'flex items-center gap-1 px-2 py-2 border-t',
              isDark ? 'border-zinc-800' : 'border-zinc-100'
            )}>
              {onApply && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onApply()
                  }}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[10px] font-medium',
                    'transition-colors',
                    isDark
                      ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                      : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800'
                  )}
                >
                  <Plus className="w-3 h-3" />
                  Apply
                </button>
              )}
              {onEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit()
                  }}
                  className={cn(
                    'p-1.5 rounded transition-colors',
                    isDark
                      ? 'hover:bg-zinc-800 text-zinc-400'
                      : 'hover:bg-zinc-100 text-zinc-500'
                  )}
                  title="Edit schema"
                >
                  <Edit className="w-3 h-3" />
                </button>
              )}
              {canDelete && onDelete && (
                confirmDelete ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onDelete()
                        setConfirmDelete(false)
                      }}
                      className="p-1.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30"
                      title="Confirm delete"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setConfirmDelete(false)
                      }}
                      className={cn(
                        'p-1.5 rounded',
                        isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
                      )}
                      title="Cancel"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setConfirmDelete(true)
                    }}
                    className={cn(
                      'p-1.5 rounded transition-colors',
                      isDark
                        ? 'hover:bg-red-500/20 text-zinc-400 hover:text-red-400'
                        : 'hover:bg-red-50 text-zinc-500 hover:text-red-500'
                    )}
                    title="Delete schema"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export function SupertagsSidebarPanel({
  theme = 'dark',
  selectedBlockId,
  selectedStrandPath,
  onApplySupertag,
  onOpenDesigner,
  className,
}: SupertagsSidebarPanelProps) {
  const isDark = theme === 'dark'

  // State
  const [schemas, setSchemas] = useState<SupertagSchema[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showBuiltIn, setShowBuiltIn] = useState(true)
  const [showCustom, setShowCustom] = useState(true)

  // Load schemas
  useEffect(() => {
    loadSchemas()
  }, [])

  const loadSchemas = async () => {
    try {
      setLoading(true)
      await initializeSupertags()
      const allSchemas = await getAllSchemas()
      setSchemas(allSchemas)
    } catch (error) {
      console.error('Failed to load supertag schemas:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter schemas
  const filteredSchemas = schemas.filter(schema => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      if (!schema.tagName.toLowerCase().includes(query) &&
          !schema.displayName?.toLowerCase().includes(query) &&
          !schema.description?.toLowerCase().includes(query)) {
        return false
      }
    }
    return true
  })

  // Separate built-in vs custom
  const builtInSchemas = filteredSchemas.filter(s => s.tagName.startsWith('_') || ['task', 'meeting', 'book', 'person', 'project'].includes(s.tagName))
  const customSchemas = filteredSchemas.filter(s => !builtInSchemas.includes(s))

  // Handle delete
  const handleDelete = async (id: string) => {
    try {
      await deleteSchema(id)
      await loadSchemas()
    } catch (error) {
      console.error('Failed to delete schema:', error)
    }
  }

  return (
    <div className={cn(
      'flex flex-col h-full',
      isDark ? 'bg-zinc-900' : 'bg-white',
      className
    )}>
      {/* Header */}
      <div className={cn(
        'flex items-center gap-2 px-3 py-2.5 border-b shrink-0',
        isDark ? 'border-zinc-800' : 'border-zinc-200'
      )}>
        <Sparkles className="w-4 h-4 text-amber-500" />
        <h2 className={cn(
          'text-xs font-semibold flex-1',
          isDark ? 'text-zinc-200' : 'text-zinc-800'
        )}>
          Supertags
        </h2>
        <button
          onClick={() => onOpenDesigner?.()}
          className={cn(
            'flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium',
            isDark
              ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
          )}
        >
          <Plus className="w-3 h-3" />
          New
        </button>
      </div>

      {/* Search */}
      <div className={cn(
        'px-3 py-2 border-b',
        isDark ? 'border-zinc-800' : 'border-zinc-200'
      )}>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search supertags..."
            className={cn(
              'w-full pl-8 pr-3 py-1.5 rounded-md text-xs outline-none',
              isDark
                ? 'bg-zinc-800 text-zinc-200 placeholder:text-zinc-500'
                : 'bg-zinc-100 text-zinc-800 placeholder:text-zinc-400'
            )}
          />
        </div>
      </div>

      {/* Selection Info */}
      {selectedBlockId && (
        <div className={cn(
          'flex items-center gap-2 px-3 py-2 border-b',
          isDark ? 'border-zinc-800 bg-blue-500/10' : 'border-zinc-200 bg-blue-50'
        )}>
          <Layers className="w-3.5 h-3.5 text-blue-500" />
          <span className="text-[10px] text-blue-600 dark:text-blue-400">
            Select a supertag to apply to current block
          </span>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {loading ? (
          // Loading skeleton
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className={cn(
                  'h-14 rounded-lg animate-pulse',
                  isDark ? 'bg-zinc-800' : 'bg-zinc-100'
                )}
              />
            ))}
          </div>
        ) : (
          <>
            {/* Built-in Supertags */}
            {builtInSchemas.length > 0 && (
              <div>
                <button
                  onClick={() => setShowBuiltIn(!showBuiltIn)}
                  className={cn(
                    'flex items-center gap-1.5 w-full px-2 py-1 rounded text-left',
                    isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'
                  )}
                >
                  {showBuiltIn ? (
                    <ChevronDown className="w-3 h-3 text-zinc-500" />
                  ) : (
                    <ChevronRight className="w-3 h-3 text-zinc-500" />
                  )}
                  <Star className="w-3 h-3 text-amber-500" />
                  <span className={cn(
                    'text-[10px] font-medium flex-1',
                    isDark ? 'text-zinc-400' : 'text-zinc-600'
                  )}>
                    Built-in
                  </span>
                  <span className="text-[9px] text-zinc-500">
                    {builtInSchemas.length}
                  </span>
                </button>

                <AnimatePresence>
                  {showBuiltIn && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden mt-1 space-y-1"
                    >
                      {builtInSchemas.map(schema => (
                        <SupertagCard
                          key={schema.id}
                          schema={schema}
                          theme={theme}
                          onApply={selectedBlockId ? () => onApplySupertag?.(schema) : undefined}
                          onEdit={() => onOpenDesigner?.(schema)}
                          canDelete={false}
                        />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Custom Supertags */}
            {customSchemas.length > 0 && (
              <div>
                <button
                  onClick={() => setShowCustom(!showCustom)}
                  className={cn(
                    'flex items-center gap-1.5 w-full px-2 py-1 rounded text-left',
                    isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'
                  )}
                >
                  {showCustom ? (
                    <ChevronDown className="w-3 h-3 text-zinc-500" />
                  ) : (
                    <ChevronRight className="w-3 h-3 text-zinc-500" />
                  )}
                  <Tag className="w-3 h-3 text-purple-500" />
                  <span className={cn(
                    'text-[10px] font-medium flex-1',
                    isDark ? 'text-zinc-400' : 'text-zinc-600'
                  )}>
                    Custom
                  </span>
                  <span className="text-[9px] text-zinc-500">
                    {customSchemas.length}
                  </span>
                </button>

                <AnimatePresence>
                  {showCustom && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden mt-1 space-y-1"
                    >
                      {customSchemas.map(schema => (
                        <SupertagCard
                          key={schema.id}
                          schema={schema}
                          theme={theme}
                          onApply={selectedBlockId ? () => onApplySupertag?.(schema) : undefined}
                          onEdit={() => onOpenDesigner?.(schema)}
                          onDelete={() => handleDelete(schema.id)}
                        />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Empty State */}
            {filteredSchemas.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 px-4">
                {searchQuery ? (
                  <>
                    <Search className={cn(
                      'w-8 h-8 mb-2',
                      isDark ? 'text-zinc-700' : 'text-zinc-300'
                    )} />
                    <p className="text-xs text-zinc-500 text-center">
                      No supertags match "{searchQuery}"
                    </p>
                  </>
                ) : (
                  <>
                    <Sparkles className={cn(
                      'w-10 h-10 mb-3',
                      isDark ? 'text-zinc-700' : 'text-zinc-300'
                    )} />
                    <p className={cn(
                      'text-xs text-center mb-1',
                      isDark ? 'text-zinc-400' : 'text-zinc-600'
                    )}>
                      No supertags yet
                    </p>
                    <p className="text-[10px] text-zinc-500 text-center mb-4">
                      Create structured tag schemas with custom fields
                    </p>
                    <button
                      onClick={() => onOpenDesigner?.()}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium',
                        'bg-amber-500 hover:bg-amber-600 text-white'
                      )}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Create Supertag
                    </button>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className={cn(
        'px-3 py-2 border-t mt-auto',
        isDark ? 'border-zinc-800' : 'border-zinc-200'
      )}>
        <button
          onClick={() => onOpenDesigner?.()}
          className={cn(
            'flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-lg text-xs font-medium',
            'transition-colors',
            isDark
              ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
              : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800'
          )}
        >
          <Settings className="w-3.5 h-3.5" />
          Manage Schemas
        </button>
      </div>
    </div>
  )
}

export default SupertagsSidebarPanel
