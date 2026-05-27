import Link from 'next/link'

interface Props {
  page: number
  total: number
  perPage: number
  searchParams: Record<string, string>
}

export default function Pagination({ page, total, perPage, searchParams }: Props) {
  const totalPages = Math.ceil(total / perPage)
  if (totalPages <= 1) return null

  function pageUrl(p: number) {
    const params = new URLSearchParams({ ...searchParams, page: String(p) })
    return `?${params.toString()}`
  }

  const pages: (number | '...')[] = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (page > 3) pages.push('...')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i)
    if (page < totalPages - 2) pages.push('...')
    pages.push(totalPages)
  }

  return (
    <div className="flex items-center justify-center gap-1 mt-10">
      {page > 1 && (
        <Link href={pageUrl(page - 1)} className="px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
          ←
        </Link>
      )}
      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`dots-${i}`} className="px-2 py-2 text-gray-600 text-sm">…</span>
        ) : (
          <Link
            key={p}
            href={pageUrl(p)}
            className={`px-3 py-2 rounded-lg text-sm transition-colors ${
              p === page
                ? 'bg-accent text-gray-950 font-semibold'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            {p}
          </Link>
        )
      )}
      {page < totalPages && (
        <Link href={pageUrl(page + 1)} className="px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
          →
        </Link>
      )}
    </div>
  )
}
