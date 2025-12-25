/**
 * Template Service
 * @module codex/templates/templateService
 * 
 * @remarks
 * Handles loading, caching, filtering, and managing templates.
 * Supports both static imports and dynamic loading from JSON files.
 */

import type {
  StrandTemplate,
  LoadedTemplate,
  TemplateIndex,
  TemplateCategoryMeta,
  TemplateFilterOptions,
  TemplatePreferences,
  TemplateStats,
  TemplateFormData,
  GeneratedFrontmatter,
  TemplateValidationResult,
  TemplateCategory,
} from './types'

/** Storage keys */
const STORAGE_KEYS = {
  PREFERENCES: 'codex-template-preferences',
  CACHE: 'codex-template-cache',
  CACHE_TIMESTAMP: 'codex-template-cache-timestamp',
}

/** Cache duration in milliseconds (1 hour) */
const CACHE_DURATION = 60 * 60 * 1000

/** Base URL for template files */
const TEMPLATES_BASE_URL = '/templates'

/**
 * Template cache for in-memory storage
 */
class TemplateCache {
  private templates: Map<string, LoadedTemplate> = new Map()
  private index: TemplateIndex | null = null
  private categories: Map<string, TemplateCategoryMeta> = new Map()
  private lastFetch: number = 0

  isStale(): boolean {
    return Date.now() - this.lastFetch > CACHE_DURATION
  }

  setIndex(index: TemplateIndex) {
    this.index = index
    index.categories.forEach(cat => this.categories.set(cat.id, cat))
    this.lastFetch = Date.now()
  }

  getIndex(): TemplateIndex | null {
    return this.index
  }

  setTemplate(id: string, template: LoadedTemplate) {
    this.templates.set(id, template)
  }

  getTemplate(id: string): LoadedTemplate | undefined {
    return this.templates.get(id)
  }

  getAllTemplates(): LoadedTemplate[] {
    return Array.from(this.templates.values())
  }

  getCategory(id: string): TemplateCategoryMeta | undefined {
    return this.categories.get(id)
  }

  getAllCategories(): TemplateCategoryMeta[] {
    return Array.from(this.categories.values())
  }

  clear() {
    this.templates.clear()
    this.index = null
    this.categories.clear()
    this.lastFetch = 0
  }
}

/** Global template cache instance */
const cache = new TemplateCache()

/**
 * Load template index
 */
export async function loadTemplateIndex(): Promise<TemplateIndex> {
  // Check cache first
  if (!cache.isStale() && cache.getIndex()) {
    return cache.getIndex()!
  }

  try {
    const response = await fetch(`${TEMPLATES_BASE_URL}/index.json`)
    if (!response.ok) {
      throw new Error(`Failed to load template index: ${response.status}`)
    }
    
    const index: TemplateIndex = await response.json()
    cache.setIndex(index)
    
    return index
  } catch (error) {
    console.error('Error loading template index:', error)
    throw error
  }
}

/**
 * Load a single template by path
 */
export async function loadTemplate(path: string): Promise<LoadedTemplate> {
  // Extract ID from path (e.g., "general/blank.json" -> "blank")
  const id = path.split('/').pop()?.replace('.json', '') || path

  // Check cache first
  const cached = cache.getTemplate(id)
  if (cached) {
    return cached
  }

  try {
    const response = await fetch(`${TEMPLATES_BASE_URL}/${path}`)
    if (!response.ok) {
      throw new Error(`Failed to load template: ${response.status}`)
    }
    
    const template: StrandTemplate = await response.json()
    const categoryMeta = cache.getCategory(template.category) || {
      id: template.category,
      name: template.category,
      description: '',
      icon: 'FileText',
      color: '#6B7280',
    }
    
    // Get user preferences for this template
    const prefs = getTemplatePreferences()
    const stats = prefs.stats[template.id]
    
    const loadedTemplate: LoadedTemplate = {
      ...template,
      path,
      categoryMeta,
      isFavorite: prefs.favorites.includes(template.id),
      lastUsed: stats?.lastUsed,
      useCount: stats?.useCount || 0,
    }
    
    cache.setTemplate(id, loadedTemplate)
    return loadedTemplate
  } catch (error) {
    console.error(`Error loading template ${path}:`, error)
    throw error
  }
}

/**
 * Load all templates
 */
export async function loadAllTemplates(): Promise<LoadedTemplate[]> {
  const index = await loadTemplateIndex()
  
  const templates = await Promise.all(
    index.templates.map(path => loadTemplate(path).catch(err => {
      console.warn(`Failed to load template ${path}:`, err)
      return null
    }))
  )
  
  return templates.filter((t): t is LoadedTemplate => t !== null)
}

/**
 * Get all template categories
 */
export async function getCategories(): Promise<TemplateCategoryMeta[]> {
  const index = await loadTemplateIndex()
  return index.categories
}

/**
 * Filter and sort templates
 */
export function filterTemplates(
  templates: LoadedTemplate[],
  options: TemplateFilterOptions
): LoadedTemplate[] {
  let filtered = [...templates]

  // Filter by search query
  if (options.query?.trim()) {
    const query = options.query.toLowerCase()
    filtered = filtered.filter(t =>
      t.name.toLowerCase().includes(query) ||
      t.description.toLowerCase().includes(query) ||
      t.shortDescription.toLowerCase().includes(query) ||
      t.tags.some(tag => tag.toLowerCase().includes(query)) ||
      t.category.includes(query)
    )
  }

  // Filter by category
  if (options.category && options.category !== 'all') {
    filtered = filtered.filter(t => t.category === options.category)
  }

  // Filter by difficulty
  if (options.difficulty && options.difficulty !== 'all') {
    filtered = filtered.filter(t => t.difficulty === options.difficulty)
  }

  // Filter by tags
  if (options.tags && options.tags.length > 0) {
    filtered = filtered.filter(t =>
      options.tags!.some(tag => t.tags.includes(tag))
    )
  }

  // Filter featured only
  if (options.featuredOnly) {
    filtered = filtered.filter(t => t.featured)
  }

  // Filter favorites only
  if (options.favoritesOnly) {
    filtered = filtered.filter(t => t.isFavorite)
  }

  // Sort
  const sortOrder = options.sortOrder === 'desc' ? -1 : 1
  switch (options.sortBy) {
    case 'name':
      filtered.sort((a, b) => sortOrder * a.name.localeCompare(b.name))
      break
    case 'recent':
      filtered.sort((a, b) => sortOrder * ((b.lastUsed || 0) - (a.lastUsed || 0)))
      break
    case 'difficulty':
      const difficultyOrder = { beginner: 1, intermediate: 2, advanced: 3 }
      filtered.sort((a, b) => 
        sortOrder * (difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty])
      )
      break
    case 'popularity':
    default:
      filtered.sort((a, b) => sortOrder * (b.popularity - a.popularity))
      break
  }

  return filtered
}

/**
 * Get user template preferences from localStorage
 */
export function getTemplatePreferences(): TemplatePreferences {
  if (typeof window === 'undefined') {
    return { favorites: [], recent: [], stats: {} }
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEYS.PREFERENCES)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.warn('Error reading template preferences:', error)
  }

  return { favorites: [], recent: [], stats: {} }
}

/**
 * Save user template preferences to localStorage
 */
export function saveTemplatePreferences(prefs: TemplatePreferences): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(prefs))
  } catch (error) {
    console.warn('Error saving template preferences:', error)
  }
}

/**
 * Toggle template favorite status
 */
export function toggleFavorite(templateId: string): boolean {
  const prefs = getTemplatePreferences()
  const index = prefs.favorites.indexOf(templateId)
  
  if (index === -1) {
    prefs.favorites.push(templateId)
  } else {
    prefs.favorites.splice(index, 1)
  }
  
  // Update stats
  if (!prefs.stats[templateId]) {
    prefs.stats[templateId] = { templateId, useCount: 0, lastUsed: 0, isFavorite: false }
  }
  prefs.stats[templateId].isFavorite = index === -1
  
  saveTemplatePreferences(prefs)
  
  // Update cache
  const cached = cache.getTemplate(templateId)
  if (cached) {
    cached.isFavorite = index === -1
  }
  
  return index === -1
}

/**
 * Record template usage
 */
export function recordTemplateUsage(templateId: string): void {
  const prefs = getTemplatePreferences()
  
  // Update recent (keep last 10)
  prefs.recent = prefs.recent.filter(id => id !== templateId)
  prefs.recent.unshift(templateId)
  if (prefs.recent.length > 10) {
    prefs.recent.pop()
  }
  
  // Update stats
  if (!prefs.stats[templateId]) {
    prefs.stats[templateId] = { templateId, useCount: 0, lastUsed: 0, isFavorite: false }
  }
  prefs.stats[templateId].useCount++
  prefs.stats[templateId].lastUsed = Date.now()
  
  saveTemplatePreferences(prefs)
  
  // Update cache
  const cached = cache.getTemplate(templateId)
  if (cached) {
    cached.lastUsed = Date.now()
    cached.useCount = prefs.stats[templateId].useCount
  }
}

/**
 * Get recent templates
 */
export async function getRecentTemplates(limit = 5): Promise<LoadedTemplate[]> {
  const prefs = getTemplatePreferences()
  const templates = await loadAllTemplates()
  
  return prefs.recent
    .slice(0, limit)
    .map(id => templates.find(t => t.id === id))
    .filter((t): t is LoadedTemplate => t !== undefined)
}

/**
 * Get favorite templates
 */
export async function getFavoriteTemplates(): Promise<LoadedTemplate[]> {
  const prefs = getTemplatePreferences()
  const templates = await loadAllTemplates()
  
  return templates.filter(t => prefs.favorites.includes(t.id))
}

/**
 * Validate form data against template fields
 */
export function validateFormData(
  template: StrandTemplate,
  formData: TemplateFormData
): TemplateValidationResult {
  const errors: TemplateValidationResult['errors'] = []
  const warnings: TemplateValidationResult['warnings'] = []

  if (!template.fields) {
    return { valid: true, errors, warnings }
  }

  for (const field of template.fields) {
    const value = formData[field.name]
    
    // Check required
    if (field.required && (!value || (typeof value === 'string' && !value.trim()))) {
      errors.push({
        field: field.name,
        message: `${field.label} is required`,
        type: 'required',
      })
      continue
    }

    // Skip validation if empty and not required
    if (!value) continue

    // String validations
    if (typeof value === 'string' && field.validation) {
      if (field.validation.minLength && value.length < field.validation.minLength) {
        errors.push({
          field: field.name,
          message: field.validation.message || 
            `${field.label} must be at least ${field.validation.minLength} characters`,
          type: 'length',
        })
      }

      if (field.validation.maxLength && value.length > field.validation.maxLength) {
        errors.push({
          field: field.name,
          message: field.validation.message || 
            `${field.label} must be at most ${field.validation.maxLength} characters`,
          type: 'length',
        })
      }

      if (field.validation.pattern) {
        const regex = new RegExp(field.validation.pattern)
        if (!regex.test(value)) {
          errors.push({
            field: field.name,
            message: field.validation.patternDescription || 
              field.validation.message ||
              `${field.label} format is invalid`,
            type: 'pattern',
          })
        }
      }
    }

    // Number validations
    if (typeof value === 'number' && field.validation) {
      if (field.validation.min !== undefined && value < field.validation.min) {
        errors.push({
          field: field.name,
          message: `${field.label} must be at least ${field.validation.min}`,
          type: 'format',
        })
      }

      if (field.validation.max !== undefined && value > field.validation.max) {
        errors.push({
          field: field.name,
          message: `${field.label} must be at most ${field.validation.max}`,
          type: 'format',
        })
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings }
}

/**
 * Generate frontmatter from template and form data
 */
export function generateFrontmatter(
  template: StrandTemplate,
  formData: TemplateFormData
): GeneratedFrontmatter {
  const now = new Date()
  
  // Build frontmatter data
  const data: Record<string, unknown> = {
    ...template.defaultData,
  }

  // Add form data
  for (const [key, value] of Object.entries(formData)) {
    if (value !== undefined && value !== '') {
      if (Array.isArray(value)) {
        data[key] = value.filter(v => v.trim()).join(', ')
      } else {
        data[key] = value
      }
    }
  }

  // Generate YAML frontmatter
  const yamlLines = ['---']
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === '') continue
    
    if (typeof value === 'string') {
      // Handle strings with special characters
      if (value.includes(':') || value.includes('#') || value.includes('\n')) {
        yamlLines.push(`${key}: "${value.replace(/"/g, '\\"')}"`)
      } else {
        yamlLines.push(`${key}: "${value}"`)
      }
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      yamlLines.push(`${key}: ${value}`)
    } else if (Array.isArray(value)) {
      yamlLines.push(`${key}: [${value.join(', ')}]`)
    }
  }
  yamlLines.push('---')
  
  const yaml = yamlLines.join('\n')

  // Generate content from template
  let content = template.template
  
  // Replace placeholders
  for (const [key, value] of Object.entries(formData)) {
    const placeholder = new RegExp(`\\{${key}\\}`, 'g')
    const replacement = Array.isArray(value) ? value.join(', ') : String(value || '')
    content = content.replace(placeholder, replacement)
  }
  
  // Replace date placeholders
  content = content.replace(/\{date\}/g, now.toISOString().split('T')[0])
  content = content.replace(/\{datetime\}/g, now.toISOString())
  content = content.replace(/\{time\}/g, now.toLocaleTimeString())
  
  // Clean up any remaining placeholders
  content = content.replace(/\{[a-zA-Z_]+\}/g, '')

  return { yaml, data, content }
}

/**
 * Get template by ID
 */
export async function getTemplateById(id: string): Promise<LoadedTemplate | null> {
  const templates = await loadAllTemplates()
  return templates.find(t => t.id === id) || null
}

/**
 * Search templates by query
 */
export async function searchTemplates(query: string): Promise<LoadedTemplate[]> {
  const templates = await loadAllTemplates()
  return filterTemplates(templates, { query })
}

/**
 * Get templates by category
 */
export async function getTemplatesByCategory(category: TemplateCategory): Promise<LoadedTemplate[]> {
  const templates = await loadAllTemplates()
  return filterTemplates(templates, { category })
}

/**
 * Get featured templates
 */
export async function getFeaturedTemplates(): Promise<LoadedTemplate[]> {
  const templates = await loadAllTemplates()
  return filterTemplates(templates, { featuredOnly: true, sortBy: 'popularity' })
}

/**
 * Clear template cache
 */
export function clearTemplateCache(): void {
  cache.clear()
}

/** Export cache for testing */
export { cache as templateCache }





















