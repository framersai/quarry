/**
 * Query Builder Component
 * @module codex/ui/QueryBuilder
 *
 * @description
 * Visual query builder for constructing complex search queries.
 * Provides a drag-and-drop interface for building filter conditions.
 *
 * @features
 * - Visual condition builder
 * - Boolean operators (AND/OR/NOT)
 * - Field autocomplete
 * - Tag suggestions
 * - Supertag field queries
 * - Sort and pagination controls
 * - Query preview and validation
 */

'use client'

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import {
  Search,
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Tag,
  Hash,
  Calendar,
  FileText,
  Code,
  ArrowUpDown,
  X,
  Play,
  Save,
  RotateCcw,
  Sparkles,
  Filter,
  Copy,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Layers,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  parseQuery,
  serializeQuery,
  validateQuery,
  type RootQueryNode,
  type QueryNode,
  type ComparisonOperator,
  type SortClause,
  type SortDirection,
} from '@/lib/query'
import { quickSearch } from '@/lib/query/queryEngine'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface QueryBuilderProps {
  /** Initial query string or AST */
  initialQuery?: string | RootQueryNode
  /** Callback when query changes */
  onQueryChange?: (query: RootQueryNode, queryString: string) => void
  /** Callback when executing query */
  onExecute?: (query: RootQueryNode) => void
  /** Callback to save query */
  onSave?: (query: RootQueryNode, name: string) => void
  /** Theme for styling */
  theme?: 'light' | 'dark'
  /** Whether to show the query preview */
  showPreview?: boolean
  /** Whether to show execute button */
  showExecute?: boolean
  /** Compact mode for sidebar use */
  compact?: boolean
  /** Additional class names */
  className?: string
}

interface ConditionItem {
  id: string
  type: 'text' | 'tag' | 'field' | 'type' | 'date' | 'supertag' | 'group'
  // For text
  textValue?: string
  exact?: boolean
  // For tag
  tagName?: string
  exclude?: boolean
  // For field
  field?: string
  operator?: ComparisonOperator
  value?: string | number | boolean
  // For type
  targetType?: string
  // For date
  dateField?: 'created' | 'updated'
  dateValue?: string
  // For supertag
  supertagName?: string
  supertagFields?: Array<{ name: string; operator: ComparisonOperator; value: string }>
  // For group
  children?: ConditionItem[]
  booleanOp?: 'and' | 'or'
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════════════════════ */

const FIELD_OPTIONS = [
  { value: 'title', label: 'Title', icon: FileText },
  { value: 'content', label: 'Content', icon: FileText },
  { value: 'summary', label: 'Summary', icon: FileText },
  { value: 'weave', label: 'Weave', icon: Layers },
  { value: 'loom', label: 'Loom', icon: Layers },
  { value: 'path', label: 'Path', icon: FileText },
  { value: 'difficulty', label: 'Difficulty', icon: Sparkles },
  { value: 'word_count', label: 'Word Count', icon: Hash },
  { value: 'worthiness', label: 'Worthiness', icon: Sparkles },
  { value: 'heading_level', label: 'Heading Level', icon: Hash },
]

const OPERATOR_OPTIONS: Array<{ value: ComparisonOperator; label: string }> = [
  { value: '=', label: 'equals' },
  { value: '!=', label: 'not equals' },
  { value: '>', label: 'greater than' },
  { value: '<', label: 'less than' },
  { value: '>=', label: 'at least' },
  { value: '<=', label: 'at most' },
  { value: '~', label: 'contains' },
  { value: '!~', label: 'not contains' },
  { value: '^', label: 'starts with' },
  { value: '$', label: 'ends with' },
]

const TYPE_OPTIONS = [
  { value: 'strand', label: 'Strand' },
  { value: 'block', label: 'Block' },
  { value: 'heading', label: 'Heading' },
  { value: 'paragraph', label: 'Paragraph' },
  { value: 'code', label: 'Code' },
  { value: 'list', label: 'List' },
  { value: 'blockquote', label: 'Blockquote' },
  { value: 'table', label: 'Table' },
]

const SORT_FIELDS = [
  { value: 'updated', label: 'Last Updated' },
  { value: 'created', label: 'Created' },
  { value: 'title', label: 'Title' },
  { value: 'worthiness', label: 'Worthiness' },
  { value: 'word_count', label: 'Word Count' },
]

/* ═══════════════════════════════════════════════════════════════════════════
   HELPER COMPONENTS
═══════════════════════════════════════════════════════════════════════════ */

interface ConditionEditorProps {
  condition: ConditionItem
  onChange: (condition: ConditionItem) => void
  onRemove: () => void
  theme: 'light' | 'dark'
  compact: boolean
}

function ConditionEditor({
  condition,
  onChange,
  onRemove,
  theme,
  compact,
}: ConditionEditorProps) {
  const isDark = theme === 'dark'
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Fetch tag suggestions
  const handleTagInput = useCallback(async (value: string) => {
    onChange({ ...condition, tagName: value })
    if (value.length >= 2) {
      const results = await quickSearch(value, { types: ['tag'], limit: 5 })
      setTagSuggestions(results.tags)
      setShowSuggestions(true)
    } else {
      setShowSuggestions(false)
    }
  }, [condition, onChange])

  const selectSuggestion = useCallback((tag: string) => {
    onChange({ ...condition, tagName: tag })
    setShowSuggestions(false)
  }, [condition, onChange])

  const getConditionIcon = () => {
    switch (condition.type) {
      case 'text': return Search
      case 'tag': return Tag
      case 'field': return Hash
      case 'type': return FileText
      case 'date': return Calendar
      case 'supertag': return Sparkles
      case 'group': return Filter
      default: return Search
    }
  }

  const Icon = getConditionIcon()

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        'flex items-start gap-2 p-2 rounded-lg',
        isDark ? 'bg-zinc-800/50' : 'bg-zinc-100/50',
        compact && 'p-1.5'
      )}
    >
      {/* Drag handle */}
      <div className="cursor-grab mt-1.5">
        <GripVertical className="w-4 h-4 text-zinc-500" />
      </div>

      {/* Condition type icon */}
      <div className={cn(
        'p-1.5 rounded',
        isDark ? 'bg-zinc-700' : 'bg-zinc-200'
      )}>
        <Icon className="w-4 h-4 text-zinc-500" />
      </div>

      {/* Condition editor based on type */}
      <div className="flex-1 space-y-2">
        {condition.type === 'text' && (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={condition.textValue || ''}
              onChange={e => onChange({ ...condition, textValue: e.target.value })}
              placeholder="Search text..."
              className={cn(
                'flex-1 px-2 py-1 rounded text-sm outline-none',
                isDark
                  ? 'bg-zinc-700 text-zinc-200 placeholder:text-zinc-500'
                  : 'bg-white text-zinc-800 placeholder:text-zinc-400'
              )}
            />
            <label className="flex items-center gap-1 text-xs text-zinc-500 cursor-pointer">
              <input
                type="checkbox"
                checked={condition.exact || false}
                onChange={e => onChange({ ...condition, exact: e.target.checked })}
                className="rounded"
              />
              Exact
            </label>
          </div>
        )}

        {condition.type === 'tag' && (
          <div className="relative">
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1 text-xs text-zinc-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={condition.exclude || false}
                  onChange={e => onChange({ ...condition, exclude: e.target.checked })}
                  className="rounded"
                />
                Exclude
              </label>
              <span className="text-zinc-500">#</span>
              <input
                type="text"
                value={condition.tagName || ''}
                onChange={e => handleTagInput(e.target.value)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="tag-name"
                className={cn(
                  'flex-1 px-2 py-1 rounded text-sm outline-none',
                  isDark
                    ? 'bg-zinc-700 text-zinc-200 placeholder:text-zinc-500'
                    : 'bg-white text-zinc-800 placeholder:text-zinc-400'
                )}
              />
            </div>
            {showSuggestions && tagSuggestions.length > 0 && (
              <div className={cn(
                'absolute z-10 left-0 right-0 mt-1 rounded-lg shadow-lg overflow-hidden',
                isDark ? 'bg-zinc-800 border border-zinc-700' : 'bg-white border border-zinc-200'
              )}>
                {tagSuggestions.map(tag => (
                  <button
                    key={tag}
                    onClick={() => selectSuggestion(tag)}
                    className={cn(
                      'w-full px-3 py-1.5 text-left text-sm',
                      isDark ? 'hover:bg-zinc-700 text-zinc-200' : 'hover:bg-zinc-100 text-zinc-800'
                    )}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {condition.type === 'field' && (
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={condition.field || ''}
              onChange={e => onChange({ ...condition, field: e.target.value })}
              className={cn(
                'px-2 py-1 rounded text-sm outline-none',
                isDark ? 'bg-zinc-700 text-zinc-200' : 'bg-white text-zinc-800'
              )}
            >
              <option value="">Select field...</option>
              {FIELD_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <select
              value={condition.operator || '='}
              onChange={e => onChange({ ...condition, operator: e.target.value as ComparisonOperator })}
              className={cn(
                'px-2 py-1 rounded text-sm outline-none',
                isDark ? 'bg-zinc-700 text-zinc-200' : 'bg-white text-zinc-800'
              )}
            >
              {OPERATOR_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <input
              type="text"
              value={String(condition.value || '')}
              onChange={e => onChange({ ...condition, value: e.target.value })}
              placeholder="Value..."
              className={cn(
                'flex-1 min-w-[100px] px-2 py-1 rounded text-sm outline-none',
                isDark
                  ? 'bg-zinc-700 text-zinc-200 placeholder:text-zinc-500'
                  : 'bg-white text-zinc-800 placeholder:text-zinc-400'
              )}
            />
          </div>
        )}

        {condition.type === 'type' && (
          <select
            value={condition.targetType || ''}
            onChange={e => onChange({ ...condition, targetType: e.target.value })}
            className={cn(
              'w-full px-2 py-1 rounded text-sm outline-none',
              isDark ? 'bg-zinc-700 text-zinc-200' : 'bg-white text-zinc-800'
            )}
          >
            <option value="">Select type...</option>
            {TYPE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        )}

        {condition.type === 'date' && (
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={condition.dateField || 'created'}
              onChange={e => onChange({ ...condition, dateField: e.target.value as 'created' | 'updated' })}
              className={cn(
                'px-2 py-1 rounded text-sm outline-none',
                isDark ? 'bg-zinc-700 text-zinc-200' : 'bg-white text-zinc-800'
              )}
            >
              <option value="created">Created</option>
              <option value="updated">Updated</option>
            </select>
            <select
              value={condition.operator || '>='}
              onChange={e => onChange({ ...condition, operator: e.target.value as ComparisonOperator })}
              className={cn(
                'px-2 py-1 rounded text-sm outline-none',
                isDark ? 'bg-zinc-700 text-zinc-200' : 'bg-white text-zinc-800'
              )}
            >
              <option value=">=">after</option>
              <option value="<=">before</option>
              <option value="=">on</option>
            </select>
            <input
              type="date"
              value={condition.dateValue || ''}
              onChange={e => onChange({ ...condition, dateValue: e.target.value })}
              className={cn(
                'flex-1 px-2 py-1 rounded text-sm outline-none',
                isDark ? 'bg-zinc-700 text-zinc-200' : 'bg-white text-zinc-800'
              )}
            />
          </div>
        )}

        {condition.type === 'supertag' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-zinc-500">#</span>
              <input
                type="text"
                value={condition.supertagName || ''}
                onChange={e => onChange({ ...condition, supertagName: e.target.value })}
                placeholder="supertag-name"
                className={cn(
                  'flex-1 px-2 py-1 rounded text-sm outline-none',
                  isDark
                    ? 'bg-zinc-700 text-zinc-200 placeholder:text-zinc-500'
                    : 'bg-white text-zinc-800 placeholder:text-zinc-400'
                )}
              />
            </div>
            {/* Supertag field conditions */}
            <div className="pl-4 space-y-1">
              {(condition.supertagFields || []).map((field, idx) => (
                <div key={idx} className="flex items-center gap-1">
                  <input
                    type="text"
                    value={field.name}
                    onChange={e => {
                      const fields = [...(condition.supertagFields || [])]
                      fields[idx] = { ...field, name: e.target.value }
                      onChange({ ...condition, supertagFields: fields })
                    }}
                    placeholder="field"
                    className={cn(
                      'w-24 px-1.5 py-0.5 rounded text-xs outline-none',
                      isDark ? 'bg-zinc-700 text-zinc-200' : 'bg-white text-zinc-800'
                    )}
                  />
                  <select
                    value={field.operator}
                    onChange={e => {
                      const fields = [...(condition.supertagFields || [])]
                      fields[idx] = { ...field, operator: e.target.value as ComparisonOperator }
                      onChange({ ...condition, supertagFields: fields })
                    }}
                    className={cn(
                      'px-1 py-0.5 rounded text-xs outline-none',
                      isDark ? 'bg-zinc-700 text-zinc-200' : 'bg-white text-zinc-800'
                    )}
                  >
                    {OPERATOR_OPTIONS.slice(0, 6).map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={field.value}
                    onChange={e => {
                      const fields = [...(condition.supertagFields || [])]
                      fields[idx] = { ...field, value: e.target.value }
                      onChange({ ...condition, supertagFields: fields })
                    }}
                    placeholder="value"
                    className={cn(
                      'flex-1 px-1.5 py-0.5 rounded text-xs outline-none',
                      isDark ? 'bg-zinc-700 text-zinc-200' : 'bg-white text-zinc-800'
                    )}
                  />
                  <button
                    onClick={() => {
                      const fields = (condition.supertagFields || []).filter((_, i) => i !== idx)
                      onChange({ ...condition, supertagFields: fields })
                    }}
                    className="p-0.5 rounded hover:bg-red-500/20"
                  >
                    <X className="w-3 h-3 text-zinc-500" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => {
                  const fields = [...(condition.supertagFields || []), { name: '', operator: '=' as ComparisonOperator, value: '' }]
                  onChange({ ...condition, supertagFields: fields })
                }}
                className={cn(
                  'flex items-center gap-1 text-xs px-2 py-0.5 rounded',
                  isDark ? 'text-zinc-400 hover:bg-zinc-700' : 'text-zinc-500 hover:bg-zinc-200'
                )}
              >
                <Plus className="w-3 h-3" />
                Add field condition
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Remove button */}
      <button
        onClick={onRemove}
        className={cn(
          'p-1 rounded hover:bg-red-500/20',
          isDark ? 'text-zinc-500 hover:text-red-400' : 'text-zinc-400 hover:text-red-500'
        )}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   ADD CONDITION MENU
═══════════════════════════════════════════════════════════════════════════ */

interface AddConditionMenuProps {
  onAdd: (type: ConditionItem['type']) => void
  theme: 'light' | 'dark'
}

function AddConditionMenu({ onAdd, theme }: AddConditionMenuProps) {
  const [open, setOpen] = useState(false)
  const isDark = theme === 'dark'

  const options = [
    { type: 'text' as const, label: 'Text Search', icon: Search },
    { type: 'tag' as const, label: 'Tag Filter', icon: Tag },
    { type: 'field' as const, label: 'Field Query', icon: Hash },
    { type: 'type' as const, label: 'Content Type', icon: FileText },
    { type: 'date' as const, label: 'Date Range', icon: Calendar },
    { type: 'supertag' as const, label: 'Supertag Query', icon: Sparkles },
  ]

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm',
          isDark
            ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
            : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600'
        )}
      >
        <Plus className="w-4 h-4" />
        Add Condition
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className={cn(
              'absolute z-20 left-0 mt-1 w-48 rounded-lg shadow-lg overflow-hidden',
              isDark ? 'bg-zinc-800 border border-zinc-700' : 'bg-white border border-zinc-200'
            )}
          >
            {options.map(opt => (
              <button
                key={opt.type}
                onClick={() => {
                  onAdd(opt.type)
                  setOpen(false)
                }}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 text-left text-sm',
                  isDark ? 'hover:bg-zinc-700 text-zinc-200' : 'hover:bg-zinc-100 text-zinc-800'
                )}
              >
                <opt.icon className="w-4 h-4 text-zinc-500" />
                {opt.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click outside to close */}
      {open && (
        <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export function QueryBuilder({
  initialQuery,
  onQueryChange,
  onExecute,
  onSave,
  theme = 'dark',
  showPreview = true,
  showExecute = true,
  compact = false,
  className,
}: QueryBuilderProps) {
  const isDark = theme === 'dark'

  // State
  const [conditions, setConditions] = useState<ConditionItem[]>([])
  const [booleanOp, setBooleanOp] = useState<'and' | 'or'>('and')
  const [sort, setSort] = useState<SortClause | undefined>()
  const [limit, setLimit] = useState<number>(20)
  const [previewExpanded, setPreviewExpanded] = useState(true)
  const [saveName, setSaveName] = useState('')
  const [showSaveDialog, setShowSaveDialog] = useState(false)

  // Parse initial query
  useEffect(() => {
    if (initialQuery) {
      const ast = typeof initialQuery === 'string' ? parseQuery(initialQuery) : initialQuery
      // Convert AST to conditions (simplified - would need full implementation)
      setSort(ast.sort)
      setLimit(ast.limit || 20)
    }
  }, [initialQuery])

  // Build query from conditions
  const buildQuery = useCallback((): RootQueryNode => {
    const children: QueryNode[] = []

    for (const cond of conditions) {
      let node: QueryNode | null = null

      switch (cond.type) {
        case 'text':
          if (cond.textValue) {
            node = { type: 'text', value: cond.textValue, exact: cond.exact }
          }
          break
        case 'tag':
          if (cond.tagName) {
            node = { type: 'tag', tagName: cond.tagName, exclude: cond.exclude }
          }
          break
        case 'field':
          if (cond.field && cond.value !== undefined) {
            node = {
              type: 'field',
              field: cond.field,
              operator: cond.operator || '=',
              value: cond.value,
            }
          }
          break
        case 'type':
          if (cond.targetType) {
            node = { type: 'type', targetType: cond.targetType as any }
          }
          break
        case 'date':
          if (cond.dateValue) {
            node = {
              type: 'date',
              field: cond.dateField || 'created',
              operator: cond.operator || '>=',
              value: cond.dateValue,
            }
          }
          break
        case 'supertag':
          if (cond.supertagName) {
            node = {
              type: 'supertag',
              tagName: cond.supertagName,
              fields: cond.supertagFields?.filter(f => f.name && f.value),
            }
          }
          break
      }

      if (node) {
        children.push(node)
      }
    }

    // Combine with boolean operator
    let combined: QueryNode | null = null
    if (children.length === 1) {
      combined = children[0]
    } else if (children.length > 1) {
      combined = children.reduce((acc, node) => {
        if (!acc) return node
        return booleanOp === 'and'
          ? { type: 'and', left: acc, right: node }
          : { type: 'or', left: acc, right: node }
      }, null as QueryNode | null)
    }

    return {
      type: 'root',
      children: combined ? [combined] : [],
      sort,
      limit,
    }
  }, [conditions, booleanOp, sort, limit])

  // Get query string
  const queryString = useMemo(() => {
    const query = buildQuery()
    return serializeQuery(query)
  }, [buildQuery])

  // Validate query
  const validation = useMemo(() => {
    return validateQuery(queryString)
  }, [queryString])

  // Notify on change
  useEffect(() => {
    onQueryChange?.(buildQuery(), queryString)
  }, [buildQuery, queryString, onQueryChange])

  // Add condition
  const addCondition = useCallback((type: ConditionItem['type']) => {
    const newCondition: ConditionItem = {
      id: crypto.randomUUID(),
      type,
    }
    setConditions(prev => [...prev, newCondition])
  }, [])

  // Update condition
  const updateCondition = useCallback((id: string, updates: ConditionItem) => {
    setConditions(prev => prev.map(c => c.id === id ? updates : c))
  }, [])

  // Remove condition
  const removeCondition = useCallback((id: string) => {
    setConditions(prev => prev.filter(c => c.id !== id))
  }, [])

  // Reset all
  const reset = useCallback(() => {
    setConditions([])
    setSort(undefined)
    setLimit(20)
    setBooleanOp('and')
  }, [])

  // Execute query
  const handleExecute = useCallback(() => {
    onExecute?.(buildQuery())
  }, [buildQuery, onExecute])

  // Save query
  const handleSave = useCallback(() => {
    if (saveName.trim()) {
      onSave?.(buildQuery(), saveName.trim())
      setSaveName('')
      setShowSaveDialog(false)
    }
  }, [buildQuery, saveName, onSave])

  return (
    <div className={cn(
      'flex flex-col',
      isDark ? 'bg-zinc-900' : 'bg-white',
      className
    )}>
      {/* Header */}
      <div className={cn(
        'flex items-center gap-2 px-4 py-3 border-b shrink-0',
        isDark ? 'border-zinc-800' : 'border-zinc-200'
      )}>
        <Search className="w-5 h-5 text-zinc-500" />
        <h2 className={cn(
          'text-sm font-semibold flex-1',
          isDark ? 'text-zinc-200' : 'text-zinc-800'
        )}>
          Query Builder
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={reset}
            className={cn(
              'p-1.5 rounded hover:bg-white/10',
              isDark ? 'text-zinc-400' : 'text-zinc-500'
            )}
            title="Reset"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          {validation.valid ? (
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          ) : (
            <span title={validation.error}>
              <AlertCircle className="w-4 h-4 text-amber-500" />
            </span>
          )}
        </div>
      </div>

      {/* Boolean operator toggle */}
      <div className={cn(
        'flex items-center gap-2 px-4 py-2 border-b',
        isDark ? 'border-zinc-800' : 'border-zinc-200'
      )}>
        <span className="text-xs text-zinc-500">Combine with:</span>
        <div className={cn(
          'flex rounded-lg overflow-hidden',
          isDark ? 'bg-zinc-800' : 'bg-zinc-100'
        )}>
          <button
            onClick={() => setBooleanOp('and')}
            className={cn(
              'px-3 py-1 text-xs font-medium transition-colors',
              booleanOp === 'and'
                ? (isDark ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white')
                : (isDark ? 'text-zinc-400' : 'text-zinc-600')
            )}
          >
            AND
          </button>
          <button
            onClick={() => setBooleanOp('or')}
            className={cn(
              'px-3 py-1 text-xs font-medium transition-colors',
              booleanOp === 'or'
                ? (isDark ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white')
                : (isDark ? 'text-zinc-400' : 'text-zinc-600')
            )}
          >
            OR
          </button>
        </div>
      </div>

      {/* Conditions */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <AnimatePresence mode="popLayout">
          {conditions.map(cond => (
            <ConditionEditor
              key={cond.id}
              condition={cond}
              onChange={updates => updateCondition(cond.id, updates)}
              onRemove={() => removeCondition(cond.id)}
              theme={theme}
              compact={compact}
            />
          ))}
        </AnimatePresence>

        {conditions.length === 0 && (
          <div className={cn(
            'text-center py-8',
            isDark ? 'text-zinc-500' : 'text-zinc-400'
          )}>
            <Filter className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No conditions yet</p>
            <p className="text-xs mt-1">Add conditions to build your query</p>
          </div>
        )}

        <AddConditionMenu onAdd={addCondition} theme={theme} />
      </div>

      {/* Sort & Pagination */}
      <div className={cn(
        'px-4 py-3 border-t space-y-2',
        isDark ? 'border-zinc-800' : 'border-zinc-200'
      )}>
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-zinc-500" />
          <select
            value={sort?.field || ''}
            onChange={e => setSort(e.target.value ? { field: e.target.value, direction: sort?.direction || 'desc' } : undefined)}
            className={cn(
              'flex-1 px-2 py-1 rounded text-sm outline-none',
              isDark ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-100 text-zinc-800'
            )}
          >
            <option value="">Default sort</option>
            {SORT_FIELDS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {sort && (
            <select
              value={sort.direction}
              onChange={e => setSort({ ...sort, direction: e.target.value as SortDirection })}
              className={cn(
                'px-2 py-1 rounded text-sm outline-none',
                isDark ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-100 text-zinc-800'
              )}
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">Limit:</span>
          <input
            type="number"
            value={limit}
            onChange={e => setLimit(Math.max(1, Math.min(100, parseInt(e.target.value) || 20)))}
            className={cn(
              'w-16 px-2 py-1 rounded text-sm outline-none',
              isDark ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-100 text-zinc-800'
            )}
          />
        </div>
      </div>

      {/* Query Preview */}
      {showPreview && (
        <div className={cn(
          'border-t',
          isDark ? 'border-zinc-800' : 'border-zinc-200'
        )}>
          <button
            onClick={() => setPreviewExpanded(!previewExpanded)}
            className={cn(
              'w-full flex items-center gap-2 px-4 py-2 text-left',
              isDark ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-50'
            )}
          >
            {previewExpanded ? (
              <ChevronDown className="w-4 h-4 text-zinc-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-zinc-500" />
            )}
            <Code className="w-4 h-4 text-zinc-500" />
            <span className="text-xs text-zinc-500">Query Preview</span>
          </button>

          <AnimatePresence>
            {previewExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className={cn(
                  'px-4 pb-3',
                )}>
                  <div className={cn(
                    'p-2 rounded-lg font-mono text-xs break-all',
                    isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-700'
                  )}>
                    {queryString || <span className="text-zinc-500 italic">Empty query</span>}
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(queryString)}
                    className={cn(
                      'flex items-center gap-1 mt-1 text-xs',
                      isDark ? 'text-zinc-500 hover:text-zinc-400' : 'text-zinc-400 hover:text-zinc-500'
                    )}
                  >
                    <Copy className="w-3 h-3" />
                    Copy
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Actions */}
      <div className={cn(
        'flex items-center gap-2 px-4 py-3 border-t',
        isDark ? 'border-zinc-800' : 'border-zinc-200'
      )}>
        {showExecute && (
          <button
            onClick={handleExecute}
            disabled={!validation.valid || conditions.length === 0}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              validation.valid && conditions.length > 0
                ? 'bg-blue-600 hover:bg-blue-500 text-white'
                : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
            )}
          >
            <Play className="w-4 h-4" />
            Execute Query
          </button>
        )}

        {onSave && (
          <>
            <button
              onClick={() => setShowSaveDialog(true)}
              disabled={conditions.length === 0}
              className={cn(
                'p-2 rounded-lg transition-colors',
                conditions.length > 0
                  ? (isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500')
                  : 'text-zinc-600 cursor-not-allowed'
              )}
              title="Save Query"
            >
              <Save className="w-4 h-4" />
            </button>

            {/* Save Dialog */}
            <AnimatePresence>
              {showSaveDialog && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
                  onClick={() => setShowSaveDialog(false)}
                >
                  <motion.div
                    initial={{ scale: 0.95 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0.95 }}
                    onClick={e => e.stopPropagation()}
                    className={cn(
                      'w-80 rounded-lg p-4 shadow-xl',
                      isDark ? 'bg-zinc-900 border border-zinc-800' : 'bg-white border border-zinc-200'
                    )}
                  >
                    <h3 className={cn(
                      'text-sm font-semibold mb-3',
                      isDark ? 'text-zinc-200' : 'text-zinc-800'
                    )}>
                      Save Query
                    </h3>
                    <input
                      type="text"
                      value={saveName}
                      onChange={e => setSaveName(e.target.value)}
                      placeholder="Query name..."
                      autoFocus
                      className={cn(
                        'w-full px-3 py-2 rounded-lg text-sm outline-none',
                        isDark
                          ? 'bg-zinc-800 text-zinc-200 placeholder:text-zinc-500'
                          : 'bg-zinc-100 text-zinc-800 placeholder:text-zinc-400'
                      )}
                    />
                    <div className="flex justify-end gap-2 mt-4">
                      <button
                        onClick={() => setShowSaveDialog(false)}
                        className={cn(
                          'px-3 py-1.5 rounded text-sm',
                          isDark ? 'text-zinc-400 hover:bg-zinc-800' : 'text-zinc-600 hover:bg-zinc-100'
                        )}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={!saveName.trim()}
                        className={cn(
                          'px-3 py-1.5 rounded text-sm font-medium',
                          saveName.trim()
                            ? 'bg-blue-600 hover:bg-blue-500 text-white'
                            : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                        )}
                      >
                        Save
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  )
}

export default QueryBuilder
