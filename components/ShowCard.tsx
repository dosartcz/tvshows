import Link from 'next/link'
import Image from 'next/image'

interface Show {
  id: number
  title: string
  slug: string
  poster_url?: string | null
  first_air_date?: string | null
  last_air_date?: string | null
  rating_imdb?: number | null
  status?: string | null
  network?: string | null
  country?: string | null
  character_name?: string | null
}

export default function ShowCard({ show }: { show: Show }) {
  const year = show.first_air_date ? new Date(show.first_air_date).getFullYear() : null
  const endYear = show.last_air_date ? new Date(show.last_air_date).getFullYear() : null
  const years = year
    ? show.status === 'Ended' && endYear && endYear !== year
      ? `${year}–${endYear}`
      : show.status === 'Ended'
        ? `${year}`
        : `${year}–`
    : null

  return (
    <Link href={`/serialy/${show.slug}`} className="card group flex flex-col">
      <div className="relative aspect-[2/3] bg-gray-800">
        {show.poster_url ? (
          <Image
            src={show.poster_url}
            alt={show.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 200px"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-4xl">
            TV
          </div>
        )}
      </div>
      <div className="p-3 flex flex-col gap-1 flex-1">
        <h3 className="font-semibold text-sm leading-tight line-clamp-2 text-gray-100 group-hover:text-accent transition-colors">
          {show.title}
        </h3>
        <div className="flex items-center justify-between mt-auto pt-1">
          <span className="text-xs text-gray-500">{years}</span>
          {show.rating_imdb && (
            <span className="text-xs font-bold text-accent">
              ★ {show.rating_imdb.toFixed(1)}
            </span>
          )}
        </div>
        {show.character_name && (
          <p className="text-xs text-gray-400 italic line-clamp-1">{show.character_name}</p>
        )}
      </div>
    </Link>
  )
}
