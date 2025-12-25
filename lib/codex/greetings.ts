/**
 * Smart Time-Based Greetings System
 * @module lib/codex/greetings
 * 
 * Provides contextual, non-cringey greetings based on time of day,
 * user activity, and mood state.
 */

export interface GreetingContext {
  hour?: number
  mood?: MoodState
  streak?: number // consecutive days active
  isFirstVisitToday?: boolean
  lastActivity?: Date
  totalStrands?: number
}

export type MoodState = 
  | 'focused'
  | 'creative' 
  | 'curious'
  | 'relaxed'
  | 'energetic'
  | 'reflective'
  | 'neutral'

/**
 * Time-segmented greeting pools
 * Each pool contains varied greetings to prevent monotony
 */
const GREETING_POOLS = {
  // 5am - 8am: Early morning
  earlyMorning: [
    'Rise and create',
    'Early bird gets the strand',
    'Fresh start ahead',
    'Morning clarity awaits',
    'Dawn of ideas',
  ],
  
  // 8am - 12pm: Morning
  morning: [
    'Good morning',
    'Ready to explore',
    'Morning, creator',
    'Let\'s build something',
    'Ideas are brewing',
  ],
  
  // 12pm - 2pm: Midday
  midday: [
    'Afternoon, traveler',
    'Midday momentum',
    'Perfect time to create',
    'The codex awaits',
    'Knowledge beckons',
  ],
  
  // 2pm - 5pm: Afternoon
  afternoon: [
    'Good afternoon',
    'Afternoon inspiration',
    'Keep the momentum',
    'Great minds explore',
    'Discovery time',
  ],
  
  // 5pm - 9pm: Evening
  evening: [
    'Good evening',
    'Evening, traveler',
    'Wind down with words',
    'Evening reflection',
    'Twilight thoughts',
  ],
  
  // 9pm - 12am: Night
  night: [
    'Welcome, night owl',
    'Late night traveler',
    'Nocturnal creator',
    'Night thoughts await',
    'Midnight inspiration',
  ],
  
  // 12am - 5am: Late night/early hours
  lateNight: [
    'Welcome, late night traveler',
    'Burning the midnight oil',
    'Night owl mode activated',
    'The quiet hours are yours',
    'Deep night, deep thoughts',
    'When others sleep, we create',
  ],
} as const

/**
 * Mood-enhanced greeting modifiers
 */
const MOOD_MODIFIERS: Record<MoodState, string[]> = {
  focused: ['Stay sharp', 'Deep work mode', 'Locked in'],
  creative: ['Let imagination flow', 'Create freely', 'Art awaits'],
  curious: ['Question everything', 'Explore freely', 'Wonder awaits'],
  relaxed: ['Take your time', 'No rush', 'Peaceful exploration'],
  energetic: ['Let\'s go', 'Full speed ahead', 'Energy flows'],
  reflective: ['Contemplate', 'Look within', 'Wisdom awaits'],
  neutral: ['', '', ''], // No modifier
}

/**
 * Streak-based encouragements
 */
const STREAK_MESSAGES: Record<number, string[]> = {
  3: ['3-day streak! 🔥', 'On a roll!'],
  7: ['Week-long streak! 📚', 'Dedicated traveler!'],
  14: ['Two weeks strong! 🌟', 'True scholar!'],
  30: ['Monthly master! 🏆', 'Legendary dedication!'],
}

/**
 * Get the time segment for the current hour
 */
function getTimeSegment(hour: number): keyof typeof GREETING_POOLS {
  if (hour >= 0 && hour < 5) return 'lateNight'
  if (hour >= 5 && hour < 8) return 'earlyMorning'
  if (hour >= 8 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 14) return 'midday'
  if (hour >= 14 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 21) return 'evening'
  return 'night'
}

/**
 * Get a random item from an array
 */
function randomFrom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

/**
 * Generate a smart, contextual greeting
 */
export function getSmartGreeting(context: GreetingContext = {}): string {
  const hour = context.hour ?? new Date().getHours()
  const segment = getTimeSegment(hour)
  const baseGreeting = randomFrom(GREETING_POOLS[segment])
  
  return baseGreeting
}

/**
 * Get greeting with optional subtitle/mood context
 */
export function getGreetingWithContext(context: GreetingContext = {}): {
  greeting: string
  subtitle?: string
  emoji?: string
} {
  const greeting = getSmartGreeting(context)
  const hour = context.hour ?? new Date().getHours()
  
  // Time-based emoji
  let emoji = '✨'
  if (hour >= 0 && hour < 5) emoji = '🌙'
  else if (hour >= 5 && hour < 8) emoji = '🌅'
  else if (hour >= 8 && hour < 12) emoji = '☀️'
  else if (hour >= 12 && hour < 17) emoji = '🌤️'
  else if (hour >= 17 && hour < 21) emoji = '🌆'
  else emoji = '🌃'
  
  // Build subtitle
  let subtitle: string | undefined
  
  if (context.mood && context.mood !== 'neutral') {
    const moodOptions = MOOD_MODIFIERS[context.mood].filter(m => m)
    if (moodOptions.length) {
      subtitle = randomFrom(moodOptions)
    }
  }
  
  // Check for streaks
  if (context.streak) {
    const streakThresholds = Object.keys(STREAK_MESSAGES)
      .map(Number)
      .sort((a, b) => b - a)
    
    for (const threshold of streakThresholds) {
      if (context.streak >= threshold) {
        subtitle = randomFrom(STREAK_MESSAGES[threshold])
        break
      }
    }
  }
  
  return { greeting, subtitle, emoji }
}

/**
 * Get a simple greeting (backward compatible)
 */
export function getGreeting(): string {
  return getSmartGreeting()
}

export default getSmartGreeting

