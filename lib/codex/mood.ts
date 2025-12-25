/**
 * Mood Tracking System for Codex
 * @module lib/codex/mood
 * 
 * Tracks user mood to personalize prompts, greetings, and suggestions.
 * Stores mood history for analytics and pattern detection.
 */

export type MoodState = 
  | 'focused'
  | 'creative' 
  | 'curious'
  | 'relaxed'
  | 'energetic'
  | 'reflective'

export interface MoodEntry {
  mood: MoodState
  timestamp: string
  note?: string
}

export interface MoodConfig {
  label: string
  emoji: string
  color: string
  darkColor: string
  description: string
  suggestedActivities: string[]
}

/**
 * Mood configuration with styling and metadata
 */
export const MOOD_CONFIG: Record<MoodState, MoodConfig> = {
  focused: {
    label: 'Focused',
    emoji: '🎯',
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    darkColor: 'dark:text-blue-400 dark:bg-blue-900/30 dark:border-blue-800',
    description: 'Ready to dive deep into complex topics',
    suggestedActivities: ['Research', 'Deep reading', 'Technical writing', 'Problem solving'],
  },
  creative: {
    label: 'Creative',
    emoji: '🎨',
    color: 'text-purple-600 bg-purple-50 border-purple-200',
    darkColor: 'dark:text-purple-400 dark:bg-purple-900/30 dark:border-purple-800',
    description: 'Feeling inspired and imaginative',
    suggestedActivities: ['Brainstorming', 'Writing stories', 'Exploring new ideas', 'Making connections'],
  },
  curious: {
    label: 'Curious',
    emoji: '🔍',
    color: 'text-amber-600 bg-amber-50 border-amber-200',
    darkColor: 'dark:text-amber-400 dark:bg-amber-900/30 dark:border-amber-800',
    description: 'Want to explore and discover new things',
    suggestedActivities: ['Random exploration', 'Q&A sessions', 'Learning paths', 'Discovery mode'],
  },
  relaxed: {
    label: 'Relaxed',
    emoji: '🌿',
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    darkColor: 'dark:text-emerald-400 dark:bg-emerald-900/30 dark:border-emerald-800',
    description: 'Taking it easy, light reading',
    suggestedActivities: ['Casual browsing', 'Light reading', 'Reviewing notes', 'Organizing'],
  },
  energetic: {
    label: 'Energetic',
    emoji: '⚡',
    color: 'text-orange-600 bg-orange-50 border-orange-200',
    darkColor: 'dark:text-orange-400 dark:bg-orange-900/30 dark:border-orange-800',
    description: 'Full of energy, ready to take on challenges',
    suggestedActivities: ['Speed reading', 'Creating content', 'Flashcard drills', 'Active learning'],
  },
  reflective: {
    label: 'Reflective',
    emoji: '🌙',
    color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
    darkColor: 'dark:text-indigo-400 dark:bg-indigo-900/30 dark:border-indigo-800',
    description: 'Thoughtful mood, pondering deeper meanings',
    suggestedActivities: ['Journaling', 'Philosophy', 'Personal notes', 'Meditation'],
  },
}

const MOOD_STORAGE_KEY = 'codex-mood-history'
const CURRENT_MOOD_KEY = 'codex-current-mood'

/**
 * Get current mood from storage
 */
export function getCurrentMood(): MoodState | null {
  if (typeof window === 'undefined') return null
  const stored = localStorage.getItem(CURRENT_MOOD_KEY)
  if (!stored) return null
  
  try {
    const entry: MoodEntry = JSON.parse(stored)
    // Check if mood was set within last 4 hours
    const setTime = new Date(entry.timestamp).getTime()
    const now = Date.now()
    const fourHours = 4 * 60 * 60 * 1000
    
    if (now - setTime > fourHours) {
      return null // Mood expired
    }
    return entry.mood
  } catch {
    return null
  }
}

/**
 * Set current mood
 */
export function setCurrentMood(mood: MoodState, note?: string): void {
  if (typeof window === 'undefined') return
  
  const entry: MoodEntry = {
    mood,
    timestamp: new Date().toISOString(),
    note,
  }
  
  localStorage.setItem(CURRENT_MOOD_KEY, JSON.stringify(entry))
  
  // Also add to history
  addMoodToHistory(entry)
}

/**
 * Clear current mood
 */
export function clearCurrentMood(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(CURRENT_MOOD_KEY)
}

/**
 * Get mood history
 */
export function getMoodHistory(): MoodEntry[] {
  if (typeof window === 'undefined') return []
  
  try {
    const stored = localStorage.getItem(MOOD_STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

/**
 * Add mood entry to history
 */
function addMoodToHistory(entry: MoodEntry): void {
  const history = getMoodHistory()
  history.push(entry)
  
  // Keep only last 100 entries
  const trimmed = history.slice(-100)
  localStorage.setItem(MOOD_STORAGE_KEY, JSON.stringify(trimmed))
}

/**
 * Get mood analytics
 */
export function getMoodAnalytics(): {
  mostCommon: MoodState | null
  recentTrend: 'stable' | 'improving' | 'varying'
  totalEntries: number
  distribution: Record<MoodState, number>
} {
  const history = getMoodHistory()
  
  if (history.length === 0) {
    return {
      mostCommon: null,
      recentTrend: 'stable',
      totalEntries: 0,
      distribution: {
        focused: 0,
        creative: 0,
        curious: 0,
        relaxed: 0,
        energetic: 0,
        reflective: 0,
      },
    }
  }
  
  // Calculate distribution
  const distribution: Record<MoodState, number> = {
    focused: 0,
    creative: 0,
    curious: 0,
    relaxed: 0,
    energetic: 0,
    reflective: 0,
  }
  
  for (const entry of history) {
    distribution[entry.mood]++
  }
  
  // Find most common
  let mostCommon: MoodState | null = null
  let maxCount = 0
  for (const [mood, count] of Object.entries(distribution)) {
    if (count > maxCount) {
      maxCount = count
      mostCommon = mood as MoodState
    }
  }
  
  // Analyze trend (last 5 entries)
  const recent = history.slice(-5)
  const uniqueRecentMoods = new Set(recent.map(e => e.mood))
  const recentTrend = uniqueRecentMoods.size <= 2 ? 'stable' : 'varying'
  
  return {
    mostCommon,
    recentTrend,
    totalEntries: history.length,
    distribution,
  }
}

