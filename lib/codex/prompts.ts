/**
 * Writing Prompts System for Codex
 * @module lib/codex/prompts
 * 
 * Provides categorized writing prompts to inspire strand creation.
 * Prompts are personalized based on mood, activity, and interests.
 */

import type { MoodState } from './mood'

export interface WritingPrompt {
  id: string
  text: string
  category: PromptCategory
  mood?: MoodState[]  // Moods this prompt suits
  tags?: string[]
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  estimatedTime?: string  // e.g., "5 min", "15 min", "1 hour"
}

export type PromptCategory = 
  | 'reflection'
  | 'creative'
  | 'technical'
  | 'philosophical'
  | 'practical'
  | 'exploration'
  | 'personal'
  | 'learning'

export interface PromptCategoryConfig {
  label: string
  emoji: string
  color: string
  description: string
}

export const PROMPT_CATEGORIES: Record<PromptCategory, PromptCategoryConfig> = {
  reflection: {
    label: 'Reflection',
    emoji: '🪞',
    color: 'text-indigo-500',
    description: 'Look inward and document your thoughts',
  },
  creative: {
    label: 'Creative',
    emoji: '🎨',
    color: 'text-purple-500',
    description: 'Unleash your imagination',
  },
  technical: {
    label: 'Technical',
    emoji: '⚙️',
    color: 'text-blue-500',
    description: 'Document systems and processes',
  },
  philosophical: {
    label: 'Philosophical',
    emoji: '🤔',
    color: 'text-rose-500',
    description: 'Explore deep questions',
  },
  practical: {
    label: 'Practical',
    emoji: '🛠️',
    color: 'text-amber-500',
    description: 'How-tos and guides',
  },
  exploration: {
    label: 'Exploration',
    emoji: '🔭',
    color: 'text-cyan-500',
    description: 'Discover and document',
  },
  personal: {
    label: 'Personal',
    emoji: '📝',
    color: 'text-emerald-500',
    description: 'Your story and experiences',
  },
  learning: {
    label: 'Learning',
    emoji: '📚',
    color: 'text-orange-500',
    description: 'Document what you learn',
  },
}

/**
 * Curated writing prompts organized by category
 */
export const WRITING_PROMPTS: WritingPrompt[] = [
  // Reflection prompts
  { id: 'r1', text: 'What lesson took you the longest to learn, and why?', category: 'reflection', mood: ['reflective'], difficulty: 'beginner', estimatedTime: '10 min' },
  { id: 'r2', text: 'Describe a moment that changed how you see the world.', category: 'reflection', mood: ['reflective', 'curious'], difficulty: 'intermediate', estimatedTime: '15 min' },
  { id: 'r3', text: 'What would your 10-years-ago self think of you today?', category: 'reflection', mood: ['reflective'], difficulty: 'beginner', estimatedTime: '10 min' },
  { id: 'r4', text: 'Write about a failure that taught you something valuable.', category: 'reflection', mood: ['reflective'], difficulty: 'intermediate', estimatedTime: '15 min' },
  { id: 'r5', text: 'What beliefs have you changed your mind about? Why?', category: 'reflection', mood: ['reflective', 'curious'], difficulty: 'advanced', estimatedTime: '20 min' },
  
  // Creative prompts
  { id: 'c1', text: 'Invent a word for a feeling that doesn\'t have a name yet.', category: 'creative', mood: ['creative'], difficulty: 'beginner', estimatedTime: '5 min' },
  { id: 'c2', text: 'Describe an ordinary object as if you\'re seeing it for the first time.', category: 'creative', mood: ['creative', 'curious'], difficulty: 'beginner', estimatedTime: '10 min' },
  { id: 'c3', text: 'Write a letter to a technology that will exist in 50 years.', category: 'creative', mood: ['creative'], difficulty: 'intermediate', estimatedTime: '15 min' },
  { id: 'c4', text: 'Create a mini-mythology to explain something in your daily life.', category: 'creative', mood: ['creative'], difficulty: 'intermediate', estimatedTime: '20 min' },
  { id: 'c5', text: 'Write the opening paragraph of your autobiography.', category: 'creative', mood: ['creative', 'reflective'], difficulty: 'intermediate', estimatedTime: '15 min' },
  
  // Technical prompts
  { id: 't1', text: 'Document a process you do often but have never written down.', category: 'technical', mood: ['focused'], difficulty: 'beginner', estimatedTime: '15 min' },
  { id: 't2', text: 'Explain a complex concept you understand to a complete beginner.', category: 'technical', mood: ['focused', 'energetic'], difficulty: 'intermediate', estimatedTime: '20 min' },
  { id: 't3', text: 'Write about a bug you fixed and what you learned from it.', category: 'technical', mood: ['focused'], difficulty: 'intermediate', estimatedTime: '15 min' },
  { id: 't4', text: 'Create a decision tree for a choice you make regularly.', category: 'technical', mood: ['focused'], difficulty: 'advanced', estimatedTime: '25 min' },
  { id: 't5', text: 'Document your ideal workflow for a task you do often.', category: 'technical', mood: ['focused', 'relaxed'], difficulty: 'intermediate', estimatedTime: '20 min' },
  
  // Philosophical prompts
  { id: 'p1', text: 'What is something everyone believes that you think is wrong?', category: 'philosophical', mood: ['reflective', 'curious'], difficulty: 'advanced', estimatedTime: '20 min' },
  { id: 'p2', text: 'If you could ask humanity one question, what would it be?', category: 'philosophical', mood: ['curious'], difficulty: 'intermediate', estimatedTime: '15 min' },
  { id: 'p3', text: 'What does "home" mean to you beyond a physical place?', category: 'philosophical', mood: ['reflective'], difficulty: 'intermediate', estimatedTime: '15 min' },
  { id: 'p4', text: 'Is there such a thing as too much knowledge?', category: 'philosophical', mood: ['curious', 'reflective'], difficulty: 'advanced', estimatedTime: '25 min' },
  { id: 'p5', text: 'What would you do differently if no one was watching?', category: 'philosophical', mood: ['reflective'], difficulty: 'intermediate', estimatedTime: '15 min' },
  
  // Practical prompts
  { id: 'pr1', text: 'Write a guide to the best local spots only you know about.', category: 'practical', mood: ['relaxed', 'energetic'], difficulty: 'beginner', estimatedTime: '15 min' },
  { id: 'pr2', text: 'Document your morning routine and why each step matters.', category: 'practical', mood: ['focused', 'relaxed'], difficulty: 'beginner', estimatedTime: '10 min' },
  { id: 'pr3', text: 'Create a troubleshooting guide for a problem you\'ve solved before.', category: 'practical', mood: ['focused'], difficulty: 'intermediate', estimatedTime: '20 min' },
  { id: 'pr4', text: 'Write a packing list and rationale for your ideal trip.', category: 'practical', mood: ['relaxed', 'energetic'], difficulty: 'beginner', estimatedTime: '10 min' },
  { id: 'pr5', text: 'Document a skill you\'ve mastered in a way others could follow.', category: 'practical', mood: ['focused', 'energetic'], difficulty: 'advanced', estimatedTime: '30 min' },
  
  // Exploration prompts
  { id: 'e1', text: 'Research and write about something you know nothing about.', category: 'exploration', mood: ['curious', 'energetic'], difficulty: 'intermediate', estimatedTime: '25 min' },
  { id: 'e2', text: 'Find three connections between two seemingly unrelated topics.', category: 'exploration', mood: ['curious', 'creative'], difficulty: 'advanced', estimatedTime: '20 min' },
  { id: 'e3', text: 'Explore a Wikipedia rabbit hole and document your journey.', category: 'exploration', mood: ['curious', 'relaxed'], difficulty: 'beginner', estimatedTime: '15 min' },
  { id: 'e4', text: 'Investigate the origin story of something you use daily.', category: 'exploration', mood: ['curious'], difficulty: 'intermediate', estimatedTime: '20 min' },
  { id: 'e5', text: 'Map out an ecosystem (physical, digital, or social) you\'re part of.', category: 'exploration', mood: ['curious', 'focused'], difficulty: 'advanced', estimatedTime: '30 min' },
  
  // Personal prompts
  { id: 'pe1', text: 'Write about a tradition that matters to you and why.', category: 'personal', mood: ['reflective', 'relaxed'], difficulty: 'beginner', estimatedTime: '10 min' },
  { id: 'pe2', text: 'Describe your perfect day with no constraints.', category: 'personal', mood: ['creative', 'relaxed'], difficulty: 'beginner', estimatedTime: '10 min' },
  { id: 'pe3', text: 'What are you currently obsessed with? Explain the fascination.', category: 'personal', mood: ['energetic', 'curious'], difficulty: 'beginner', estimatedTime: '10 min' },
  { id: 'pe4', text: 'Write a letter to someone who shaped who you are today.', category: 'personal', mood: ['reflective'], difficulty: 'intermediate', estimatedTime: '20 min' },
  { id: 'pe5', text: 'Document a recipe that has special meaning to you.', category: 'personal', mood: ['relaxed'], difficulty: 'beginner', estimatedTime: '15 min' },
  
  // Learning prompts
  { id: 'l1', text: 'Summarize the most interesting thing you learned this week.', category: 'learning', mood: ['focused', 'curious'], difficulty: 'beginner', estimatedTime: '10 min' },
  { id: 'l2', text: 'Teach a concept by explaining it three different ways.', category: 'learning', mood: ['focused', 'creative'], difficulty: 'advanced', estimatedTime: '25 min' },
  { id: 'l3', text: 'Create a study guide for something you want to remember.', category: 'learning', mood: ['focused'], difficulty: 'intermediate', estimatedTime: '20 min' },
  { id: 'l4', text: 'Write about a misconception you used to have.', category: 'learning', mood: ['reflective', 'curious'], difficulty: 'beginner', estimatedTime: '10 min' },
  { id: 'l5', text: 'Document the key insights from a book, video, or article.', category: 'learning', mood: ['focused', 'relaxed'], difficulty: 'intermediate', estimatedTime: '20 min' },
]

/**
 * Get prompts filtered by mood
 */
export function getPromptsByMood(mood: MoodState): WritingPrompt[] {
  return WRITING_PROMPTS.filter(p => !p.mood || p.mood.includes(mood))
}

/**
 * Get prompts filtered by category
 */
export function getPromptsByCategory(category: PromptCategory): WritingPrompt[] {
  return WRITING_PROMPTS.filter(p => p.category === category)
}

/**
 * Get random prompt, optionally filtered
 */
export function getRandomPrompt(options?: {
  mood?: MoodState
  category?: PromptCategory
  difficulty?: WritingPrompt['difficulty']
}): WritingPrompt {
  let pool = [...WRITING_PROMPTS]
  
  if (options?.mood) {
    pool = pool.filter(p => !p.mood || p.mood.includes(options.mood!))
  }
  
  if (options?.category) {
    pool = pool.filter(p => p.category === options.category)
  }
  
  if (options?.difficulty) {
    pool = pool.filter(p => p.difficulty === options.difficulty)
  }
  
  if (pool.length === 0) {
    pool = WRITING_PROMPTS // Fallback to all
  }
  
  return pool[Math.floor(Math.random() * pool.length)]
}

// ═══════════════════════════════════════════════════════════════════════════
// DAILY PROMPT SYSTEM WITH DECAY
// ═══════════════════════════════════════════════════════════════════════════

interface DailyPromptState {
  /** ISO date string for when this state was set */
  date: string
  /** Primary prompt ID for the day */
  primaryPromptId: string
  /** Alternative prompt IDs for the day */
  alternativeIds: string[]
  /** Index of currently selected alternative (0 = primary, 1+ = alternatives) */
  selectedIndex: number
  /** IDs of prompts recently shown (for decay) */
  recentlyShownIds: string[]
}

const DAILY_PROMPT_KEY = 'fabric_daily_prompt_state'
const MAX_RECENTLY_SHOWN = 30 // Don't repeat prompts for ~30 days
const NUM_ALTERNATIVES = 3 // Number of alternative prompts available per day

/**
 * Get today's date string (YYYY-MM-DD)
 */
function getTodayString(): string {
  return new Date().toISOString().split('T')[0]
}

/**
 * Get the stored daily prompt state
 */
function getDailyPromptState(): DailyPromptState | null {
  if (typeof localStorage === 'undefined') return null
  const stored = localStorage.getItem(DAILY_PROMPT_KEY)
  if (!stored) return null
  try {
    return JSON.parse(stored)
  } catch {
    return null
  }
}

/**
 * Save daily prompt state
 */
function saveDailyPromptState(state: DailyPromptState): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(DAILY_PROMPT_KEY, JSON.stringify(state))
}

/**
 * Seeded random number generator for consistent daily selection
 */
function seededRandom(seed: number): () => number {
  return function() {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }
}

/**
 * Get day of year as seed
 */
function getDaySeed(): number {
  const today = new Date()
  const startOfYear = new Date(today.getFullYear(), 0, 0)
  const diff = today.getTime() - startOfYear.getTime()
  const oneDay = 1000 * 60 * 60 * 24
  return Math.floor(diff / oneDay) + today.getFullYear() * 1000
}

/**
 * Get daily prompt (consistent for the day based on date)
 * Features:
 * - Consistent primary prompt per day
 * - Up to 3 alternative prompts selectable
 * - Decay system to avoid repeating prompts too soon
 */
export function getDailyPrompt(mood?: MoodState | null): WritingPrompt {
  const today = getTodayString()
  let state = getDailyPromptState()
  
  // Check if we need to generate new prompts for today
  if (!state || state.date !== today) {
    state = generateDailyPrompts(mood ?? undefined, state?.recentlyShownIds || [])
    saveDailyPromptState(state)
  }
  
  // Get the currently selected prompt
  const selectedId = state.selectedIndex === 0 
    ? state.primaryPromptId 
    : state.alternativeIds[state.selectedIndex - 1]
  
  const prompt = WRITING_PROMPTS.find(p => p.id === selectedId)
  
  // Fallback if prompt not found
  if (!prompt) {
    return WRITING_PROMPTS[0]
  }
  
  return prompt
}

/**
 * Generate daily prompts with decay logic
 */
function generateDailyPrompts(mood?: MoodState, recentlyShown: string[] = []): DailyPromptState {
  const today = getTodayString()
  const seed = getDaySeed()
  const random = seededRandom(seed)
  
  // Filter pool by mood if specified
  let pool = mood 
    ? WRITING_PROMPTS.filter(p => !p.mood || p.mood.includes(mood))
    : WRITING_PROMPTS
  
  if (pool.length === 0) pool = [...WRITING_PROMPTS]
  
  // Exclude recently shown prompts
  const availablePool = pool.filter(p => !recentlyShown.includes(p.id))
  const finalPool = availablePool.length >= 4 ? availablePool : pool
  
  // Sort by seeded random to get consistent daily selection
  const shuffled = [...finalPool].sort(() => random() - 0.5)
  
  // Select primary + alternatives
  const primary = shuffled[0]
  const alternatives = shuffled.slice(1, 1 + NUM_ALTERNATIVES)
  
  return {
    date: today,
    primaryPromptId: primary.id,
    alternativeIds: alternatives.map(p => p.id),
    selectedIndex: 0,
    recentlyShownIds: [primary.id, ...recentlyShown].slice(0, MAX_RECENTLY_SHOWN),
  }
}

/**
 * Get alternative prompts for today
 */
export function getDailyAlternatives(mood?: MoodState | null): WritingPrompt[] {
  const today = getTodayString()
  let state = getDailyPromptState()
  
  if (!state || state.date !== today) {
    state = generateDailyPrompts(mood ?? undefined, state?.recentlyShownIds || [])
    saveDailyPromptState(state)
  }
  
  return state.alternativeIds
    .map(id => WRITING_PROMPTS.find(p => p.id === id))
    .filter((p): p is WritingPrompt => p !== undefined)
}

/**
 * Select an alternative prompt for today
 * Returns the selected prompt
 */
export function selectDailyAlternative(index: number): WritingPrompt | null {
  const state = getDailyPromptState()
  if (!state) return null
  
  // Update selected index (0 = primary, 1-3 = alternatives)
  const newIndex = Math.max(0, Math.min(index, NUM_ALTERNATIVES))
  
  // Add the new selection to recently shown
  const newPromptId = newIndex === 0 
    ? state.primaryPromptId 
    : state.alternativeIds[newIndex - 1]
  
  const updatedRecentlyShown = [
    newPromptId,
    ...state.recentlyShownIds.filter(id => id !== newPromptId)
  ].slice(0, MAX_RECENTLY_SHOWN)
  
  saveDailyPromptState({
    ...state,
    selectedIndex: newIndex,
    recentlyShownIds: updatedRecentlyShown,
  })
  
  return WRITING_PROMPTS.find(p => p.id === newPromptId) || null
}

/**
 * Get the currently selected daily prompt index
 */
export function getDailyPromptIndex(): number {
  const state = getDailyPromptState()
  return state?.selectedIndex || 0
}

/**
 * Get multiple random prompts
 */
export function getRandomPrompts(count: number, options?: {
  mood?: MoodState
  excludeIds?: string[]
}): WritingPrompt[] {
  let pool = [...WRITING_PROMPTS]
  
  if (options?.mood) {
    pool = pool.filter(p => !p.mood || p.mood.includes(options.mood!))
  }
  
  if (options?.excludeIds) {
    pool = pool.filter(p => !options.excludeIds!.includes(p.id))
  }
  
  // Shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  
  return pool.slice(0, count)
}












