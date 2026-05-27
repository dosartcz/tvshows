import Link from 'next/link'
import Image from 'next/image'
import PersonPlaceholder from '@/components/PersonPlaceholder'

interface Person {
  id: number
  name: string
  slug: string
  photo_url?: string | null
  character_name?: string | null
  role?: string | null
  show_count?: number
  episode_count?: number | null
}

export default function PersonCard({ person }: { person: Person }) {
  return (
    <Link href={`/herci/${person.slug}`} className="group flex flex-col items-center text-center gap-2">
      <div className="relative w-full rounded-lg overflow-hidden bg-gray-800 border-2 border-gray-700 group-hover:border-accent transition-colors max-w-[120px]" style={{aspectRatio: '2/3'}}>
        {person.photo_url ? (
          <Image
            src={person.photo_url}
            alt={person.name}
            fill
            className="object-cover object-top"
            sizes="120px"
          />
        ) : (
          <PersonPlaceholder />
        )}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-200 group-hover:text-accent transition-colors line-clamp-1">
          {person.name}
        </p>
        {person.character_name && (
          <p className="text-xs text-gray-500 line-clamp-1">{person.character_name}</p>
        )}
        {!person.character_name && person.role && (
          <p className="text-xs text-gray-500 line-clamp-1 capitalize">{person.role}</p>
        )}
        {person.show_count !== undefined && (
          <p className="text-xs text-gray-600">{person.show_count} seriálů</p>
        )}
        {person.episode_count != null && (
          <p className="text-xs text-gray-600">{person.episode_count} epizod</p>
        )}
      </div>
    </Link>
  )
}
