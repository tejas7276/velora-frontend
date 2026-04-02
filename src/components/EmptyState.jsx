export default function EmptyState({ icon: Icon, title, description, children }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center"
      style={{ animation: 'fadeInUp 0.4s cubic-bezier(0.16,1,0.3,1) both' }}>
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
        style={{
          background: 'linear-gradient(135deg, rgba(59,63,228,0.08), rgba(99,102,241,0.05))',
          border: '1px solid rgba(59,63,228,0.12)',
          animation: 'float 4s ease-in-out infinite',
        }}
      >
        {Icon && <Icon className="w-7 h-7 text-brand-400" />}
      </div>
      <p className="text-base font-semibold text-slate-700 mb-1">{title}</p>
      {description && <p className="text-sm text-slate-400 max-w-xs leading-relaxed mb-4">{description}</p>}
      {children}
    </div>
  )
}