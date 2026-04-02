// ═══════════════════════════════════════════════════════════════════
//  modelUtils.js
//  Place at: src/utils/modelUtils.js
//
//  ELI5: The backend stores the real model ID ("llama-3.3-70b-versatile").
//  The UI should show the friendly name ("Balanced").
//  These helper functions translate between the two everywhere in the app.
//
//  USAGE:
//    import { modelLabel, modelColor, modelBadge } from '../utils/modelUtils'
//
//    modelLabel("llama-3.3-70b-versatile")  →  "Balanced"
//    modelLabel("Balanced")                 →  "Balanced"  (already clean)
//    modelBadge("llama-3.1-8b-instant")     →  { label: "Fast", color: "emerald" }
// ═══════════════════════════════════════════════════════════════════

// Map: real model ID → friendly display name
const MODEL_LABELS = {
  'llama-3.1-8b-instant':    'Fast',
  'llama-3.3-70b-versatile': 'Balanced',
  'llama-3.1-70b-versatile': 'Best Quality',
}

// Map: friendly name → real model ID (reverse lookup)
const MODEL_IDS = {
  'fast':         'llama-3.1-8b-instant',
  'balanced':     'llama-3.3-70b-versatile',
  'best quality': 'llama-3.1-70b-versatile',
  'best':         'llama-3.1-70b-versatile',
}

// Map: model ID → badge color for UI
const MODEL_COLORS = {
  'llama-3.1-8b-instant':    { text: 'text-emerald-600', bg: 'bg-emerald-50',  border: 'border-emerald-200', dot: 'bg-emerald-500' },
  'llama-3.3-70b-versatile': { text: 'text-indigo-600',  bg: 'bg-indigo-50',   border: 'border-indigo-200',  dot: 'bg-indigo-500'  },
  'llama-3.1-70b-versatile': { text: 'text-violet-600',  bg: 'bg-violet-50',   border: 'border-violet-200',  dot: 'bg-violet-500'  },
}

/**
 * Returns the friendly display name for any model input.
 * Handles both real model IDs and already-clean label strings.
 *
 * modelLabel("llama-3.3-70b-versatile") → "Balanced"
 * modelLabel("Balanced")               → "Balanced"
 * modelLabel(null)                     → "Balanced"
 */
export function modelLabel(modelInput) {
  if (!modelInput) return 'Balanced'

  // Direct match on real model ID
  if (MODEL_LABELS[modelInput]) return MODEL_LABELS[modelInput]

  // Already a clean label (Fast / Balanced / Best Quality)
  const clean = modelInput.trim()
  if (['Fast', 'Balanced', 'Best Quality'].includes(clean)) return clean

  // Partial match (handles truncated strings like "llama-3.3-70b-v...")
  const lower = modelInput.toLowerCase()
  if (lower.includes('8b'))  return 'Fast'
  if (lower.includes('70b') && lower.includes('versatile')) return 'Balanced'
  if (lower.includes('70b')) return 'Best Quality'
  if (lower.includes('fast')) return 'Fast'
  if (lower.includes('balanced')) return 'Balanced'
  if (lower.includes('best')) return 'Best Quality'

  return modelInput // fallback: show as-is
}

/**
 * Returns the real model ID string to send to the backend.
 *
 * modelId("Fast")    → "llama-3.1-8b-instant"
 * modelId("Balanced") → "llama-3.3-70b-versatile"
 */
export function modelId(labelInput) {
  if (!labelInput) return 'llama-3.3-70b-versatile'
  const lower = labelInput.toLowerCase().trim()
  return MODEL_IDS[lower] || labelInput
}

/**
 * Returns color classes for a model badge.
 *
 * modelColors("llama-3.3-70b-versatile")
 * → { text: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200', dot: 'bg-indigo-500' }
 */
export function modelColors(modelInput) {
  const id = modelId(modelLabel(modelInput))
  return MODEL_COLORS[id] || MODEL_COLORS['llama-3.3-70b-versatile']
}

/**
 * Returns everything needed to render a model badge.
 *
 * modelBadge("llama-3.3-70b-versatile")
 * → { label: "Balanced", id: "llama-3.3-70b-versatile", colors: {...} }
 */
export function modelBadge(modelInput) {
  const label  = modelLabel(modelInput)
  const id     = modelId(label)
  const colors = modelColors(modelInput)
  return { label, id, colors }
}

// All 3 model options for the Create Job selector
export const AI_MODELS = [
  {
    id:       'llama-3.1-8b-instant',
    label:    'Fast',
    subtitle: 'llama-3.1-8b',
    desc:     'Best for simple tasks. Fastest response.',
    color:    'emerald',
  },
  {
    id:       'llama-3.3-70b-versatile',
    label:    'Balanced',
    subtitle: 'llama-3.3-70b',
    desc:     'Best for most tasks. Recommended.',
    color:    'indigo',
  },
  {
    id:       'llama-3.1-70b-versatile',
    label:    'Best Quality',
    subtitle: 'llama-3.1-70b',
    desc:     'Deepest analysis. Best for complex tasks.',
    color:    'violet',
  },
]