import Link from 'next/link'
import Image from 'next/image'

interface Person {
  id: number
  name: string
  slug: string
  photo_url?: string | null
  character_name?: string | null
  role?: string | null
  show_count?: number
}

export default function PersonCard({ person }: { person: Person }) {
  return (
    <Link href={`/herci/${person.slug}`} className="group flex flex-col items-center text-center gap-2">
      <div className="relative w-full aspect-square rounded-full overflow-hidden bg-gray-800 border-2 border-gray-700 group-hover:border-amber-500 transition-colors max-w-[120px]">
        {person.photo_url ? (
          <Image
            src={person.photo_url}
            alt={person.name}
            fill
            className="object-cover object-top"
            sizes="120px"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-2xl">
            👤
          </div>
        )}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-200 group-hover:text-amber-400 transition-colors line-clamp-1">
          {person.name}
        </p>
        {person.character_name && (
          <p className="text-xs text-gray-500 line-clamp-1">{person.character_name}</p>
        )}
        {person.show_count !== undefined && (
          <p className="text-xs text-gray-600">{person.show_count} seriálů</p>
        )}
      </div>
    </Link>
  )
}
