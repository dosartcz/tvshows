export default function StarRating({ rating, max = 10, label }: { rating: number; max?: number; label?: string }) {
  const stars = Math.round((rating / max) * 5)
  return (
    <div className="flex items-center gap-1.5">
      <span className="flex">
        {Array.from({ length: 5 }).map((_, i) => (
          <span key={i} className={i < stars ? 'text-accent' : 'text-gray-700'}>★</span>
        ))}
      </span>
      <span className="text-sm font-bold text-accent">{rating.toFixed(1)}</span>
      {label && <span className="text-xs text-gray-500">{label}</span>}
    </div>
  )
}
