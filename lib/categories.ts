import { ShowCategory, CategoryInfo } from './types'

export const SHOW_CATEGORIES: Record<ShowCategory, CategoryInfo> = {
  general: {
    value: 'general',
    label: 'General',
    description: 'Miscellaneous shows and events',
    examples: ['DJ set', 'Mixed event', 'Various artists']
  },
  festival: {
    value: 'festival',
    label: 'Festival',
    description: 'Multi-day festivals and large events',
    examples: ['Music festival', 'EDM weekend', 'Multi-stage event']
  },
  club_night: {
    value: 'club_night',
    label: 'Club Night',
    description: 'Club shows and DJ sets',
    examples: ['Nightclub event', 'DJ performance', 'Dance night']
  },
  live_music: {
    value: 'live_music',
    label: 'Live Music',
    description: 'Live bands and concerts',
    examples: ['Concert', 'Band performance', 'Live set']
  },
  warehouse: {
    value: 'warehouse',
    label: 'Warehouse',
    description: 'Warehouse parties and underground events',
    examples: ['Warehouse party', 'Underground rave', 'Industrial venue']
  },
  outdoor: {
    value: 'outdoor',
    label: 'Outdoor',
    description: 'Outdoor events and gatherings',
    examples: ['Park event', 'Beach party', 'Rooftop show']
  },
  private_event: {
    value: 'private_event',
    label: 'Private Event',
    description: 'Private parties and exclusive events',
    examples: ['Private party', 'Exclusive event', 'Invite-only']
  },
  workshop: {
    value: 'workshop',
    label: 'Workshop',
    description: 'Educational or instructional events',
    examples: ['DJ workshop', 'Production class', 'Educational event']
  }
}

export const CATEGORY_COLORS: Record<ShowCategory, string> = {
  general: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  festival: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  club_night: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  live_music: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  warehouse: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  outdoor: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  private_event: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  workshop: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
}

export const CATEGORY_ICONS: Record<ShowCategory, string> = {
  general: '🎵',
  festival: '🎪',
  club_night: '🕺',
  live_music: '🎸',
  warehouse: '🏭',
  outdoor: '🌳',
  private_event: '🔒',
  workshop: '📚'
}

export function getCategoryInfo(category: ShowCategory): CategoryInfo {
  return SHOW_CATEGORIES[category] || SHOW_CATEGORIES.general
}

export function getCategoryColor(category: ShowCategory): string {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS.general
}

export function getCategoryIcon(category: ShowCategory): string {
  return CATEGORY_ICONS[category] || CATEGORY_ICONS.general
}

export function getAllCategories(): CategoryInfo[] {
  return Object.values(SHOW_CATEGORIES)
}

export function isValidCategory(category: string): category is ShowCategory {
  return category in SHOW_CATEGORIES
}
