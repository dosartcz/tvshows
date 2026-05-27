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
  show_titles?: string | null
  show_slugs?: string | null
}

export default function ArticleCard({ article, variant = 'horizontal' }: { article: Article; variant?: 'horizontal' | 'vertical' }) {
  const date = article.published_at
    ? new Date(article.published_at).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short', year: 'numeric' })
    : null

  const displayDescription = article.description_cs || article.description

  const shows = article.show_titles && article.show_slugs
    ? article.show_titles.split('||').map((title, i) => ({
        title,
        slug: article.show_slugs!.split('||')[i],
      }))
    : []

  if (variant === 'vertical') {
    return (
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="card group flex flex-col overflow-hidden hover:bg-gray-800/50"
      >
        <div className="relative w-full aspect-video bg-gray-800 overflow-hidden">
          {article.image_url
            ? <img src={article.image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            : <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900" />
          }
          {shows.length > 0 && (
            <div className="absolute top-2 left-2 flex flex-wrap gap-1">
              {shows.map(s => (
                <span key={s.slug} className="text-xs font-medium px-2 py-0.5 rounded-lg bg-black/60 text-accent backdrop-blur-sm">
                  {s.title}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1.5 p-4">
          <div className="flex items-center gap-2">
            {article.source && (
              <span className="badge bg-gray-800 text-gray-400">{article.source}</span>
            )}
            {date && <span className="text-xs text-gray-600">{date}</span>}
          </div>
          <h3 className="font-semibold text-sm leading-snug line-clamp-2 text-gray-100 group-hover:text-accent transition-colors min-h-[2.5rem]">
            {article.title_cs || article.title}
          </h3>
          <p className="text-xs text-gray-500 line-clamp-2 min-h-[2rem]">
            {displayDescription ?? ''}
          </p>
        </div>
      </a>
    )
  }

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="card group flex gap-4 p-4 hover:bg-gray-800/50"
    >
      {article.image_url && (
        <div className="relative w-24 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-800">
          <img src={article.image_url} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="flex flex-col gap-1 min-w-0">
        <h3 className="font-semibold text-sm leading-snug line-clamp-2 text-gray-100 group-hover:text-accent transition-colors">
          {article.title_cs || article.title}
        </h3>
        {displayDescription && (
          <p className="text-xs text-gray-500 line-clamp-2">{displayDescription}</p>
        )}
        <div className="flex items-center gap-2 mt-auto">
          {article.source && (
            <span className="badge bg-gray-800 text-gray-400">{article.source}</span>
          )}
          {date && <span className="text-xs text-gray-600">{date}</span>}
        </div>
      </div>
    </a>
  )
}
