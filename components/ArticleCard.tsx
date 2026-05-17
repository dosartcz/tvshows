interface Article {
  id: number
  title: string
  title_cs?: string | null
  description?: string | null
  url: string
  source?: string | null
  image_url?: string | null
  published_at?: string | null
}

export default function ArticleCard({ article }: { article: Article }) {
  const date = article.published_at
    ? new Date(article.published_at).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short', year: 'numeric' })
    : null

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="card group flex gap-4 p-4 hover:bg-gray-800/50"
    >
      {article.image_url && (
        <div className="relative w-24 h-16 flex-shrink-0 rounded overflow-hidden bg-gray-800">
          <img src={article.image_url} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="flex flex-col gap-1 min-w-0">
        <h3 className="font-semibold text-sm leading-snug line-clamp-2 text-gray-100 group-hover:text-amber-400 transition-colors">
          {article.title_cs || article.title}
        </h3>
        {article.description && (
          <p className="text-xs text-gray-500 line-clamp-2">{article.description}</p>
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
