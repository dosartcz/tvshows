import { dbAll, dbGet } from '@/lib/db'
import ArticleCard from '@/components/ArticleCard'
import Pagination from '@/components/Pagination'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Aktuality' }
export const dynamic = 'force-dynamic'

const PER_PAGE = 12

export default async function ClankyPage({ searchParams }: { searchParams: Record<string, string> }) {
  const page = Math.max(1, Number(searchParams.page ?? 1))

  const sources = await dbAll("SELECT DISTINCT source FROM articles WHERE source IS NOT NULL ORDER BY source")

  let countSql = 'SELECT COUNT(*) as count FROM articles WHERE 1=1'
  const countArgs: string[] = []
  if (searchParams.source) { countSql += ' AND source = ?'; countArgs.push(searchParams.source) }
  const countResult = await dbGet(countSql, countArgs)
  const total = Number((countResult as any)?.count ?? 0)

  let sql = `
    SELECT a.*,
      GROUP_CONCAT(s.title, '||') as show_titles,
      GROUP_CONCAT(s.slug, '||') as show_slugs
    FROM articles a
    LEFT JOIN article_shows ars ON a.id = ars.article_id
    LEFT JOIN shows s ON ars.show_id = s.id
    WHERE 1=1
  `
  const args: (string | number)[] = []
  if (searchParams.source) { sql += ' AND a.source = ?'; args.push(searchParams.source) }
  sql += ` GROUP BY a.id ORDER BY a.published_at DESC LIMIT ${PER_PAGE} OFFSET ${(page - 1) * PER_PAGE}`

  const articles = await dbAll(sql, args)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold text-white mb-8">Aktuality</h1>
      <form method="get" className="flex gap-3 mb-8">
        <select name="source" defaultValue={searchParams.source ?? ''} className="input w-auto text-sm">
          <option value="">Všechny zdroje</option>
          {sources.map((s: any) => <option key={s.source as string} value={s.source as string}>{s.source as string}</option>)}
        </select>
        <button type="submit" className="btn-primary text-sm">Filtrovat</button>
      </form>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {articles.map((a: any) => <ArticleCard key={a.id as number} article={a as any} variant="vertical" />)}
      </div>
      <Pagination page={page} total={total} perPage={PER_PAGE} searchParams={searchParams} />
    </div>
  )
}
