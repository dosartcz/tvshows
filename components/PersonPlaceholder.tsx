export default function PersonPlaceholder({ className }: { className?: string }) {
  return (
    <div className={`absolute inset-0 flex items-center justify-center ${className ?? ''}`}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-2/5 h-2/5 text-gray-600"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      >
        {/* Kruh */}
        <circle cx="12" cy="12" r="10" />
        {/* Přeškrtnutí */}
        <line x1="4.5" y1="4.5" x2="19.5" y2="19.5" />
      </svg>
    </div>
  )
}
