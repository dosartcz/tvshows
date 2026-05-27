'use client'

import ArticleCard from '@/components/ArticleCard'

interface Article {
  id: number
  title: string
  title_cs?: string | null
  description?: string | null
  description_cs?: string | null
  url: string
  source?: string | null
  image_url?: string | null
  published_at?: string | null
}

export default function ShowArticles({ articles }: { articles: Article[] }) {
  if (articles.length === 0) return null

  if (articles.length <= 3) {
    return (
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Aktuality</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {articles.map(a => <ArticleCard key={a.id} article={a} variant="vertical" />)}
        </div>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-4">Aktuality</h2>
      <div className="relative">
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
          {articles.map(a => (
            <div key={a.id} className="w-72 flex-shrink-0">
              <ArticleCard article={a} variant="vertical" />
            </div>
          ))}
        </div>
        {/* Stín vpravo */}
        <div className="pointer-events-none absolute top-0 right-0 h-full w-16 bg-gradient-to-l from-gray-950 to-transparent" />
      </div>
    </div>
  )
}
