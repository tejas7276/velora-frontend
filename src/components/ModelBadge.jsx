// ═══════════════════════════════════════════════════════════════════
//  ModelBadge.jsx
//  Place at: src/components/ModelBadge.jsx
//
//  A single reusable badge that displays the model name cleanly.
//  Use this everywhere you currently show the raw model string.
//
//  USAGE:
//    import ModelBadge from '../components/ModelBadge'
//
//    <ModelBadge model={job.aiModel} />
//    → renders: ⚡ Fast   (emerald)
//    → renders: ⊙ Balanced  (indigo)
//    → renders: ✦ Best Quality  (violet)
//
//  REPLACES:
//    "Balanced · llama-3.3-70b-v..."  ← broken truncated string
// ═══════════════════════════════════════════════════════════════════

import { modelLabel, modelColors } from '../utils/modelUtils'
import { Zap, Gauge, Brain } from 'lucide-react'

const ICONS = {
  'Fast':         Zap,
  'Balanced':     Gauge,
  'Best Quality': Brain,
}

export default function ModelBadge({ model, size = 'sm' }) {
  const label  = modelLabel(model)
  const colors = modelColors(model)
  const Icon   = ICONS[label] || Gauge

  const sizeClasses = size === 'sm'
    ? 'text-xs px-2 py-0.5 gap-1'
    : 'text-sm px-2.5 py-1 gap-1.5'

  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${sizeClasses} ${colors.text} ${colors.bg} ${colors.border}`}
    >
      <Icon className={iconSize} />
      {label}
    </span>
  )
}