import { dbAll } from '@/lib/db'
import ArticleCard from '@/components/ArticleCard'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Články' }
export const dynamic = 'force-dynamic'

export default async function ClankyPage({ searchParams }: { searchParams: Record<string, string> }) {
  const sources = await dbAll("SELECT DISTINCT source FROM articles WHERE source IS NOT NULL ORDER BY source")

  let sql = 'SELECT * FROM articles WHERE 1=1'
  const args: string[] = []
  if (searchParams.source) { sql += ' AND source = ?'; args.push(searchParams.source) }
  sql += ' ORDER BY published_at DESC LIMIT 100'

  const articles = await dbAll(sql, args)

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold text-white mb-8">Články</h1>
      <form method="get" className="flex gap-3 mb-8">
        <select name="source" defaultValue={searchParams.source ?? ''} className="input w-auto text-sm">
          <option value="">Všechny zdroje</option>
          {sources.map((s: any) => <option key={s.source as string} value={s.source as string}>{s.source as string}</option>)}
        </select>
        <button type="submit" className="btn-primary text-sm">Filtrovat</button>
      </form>
      <p className="text-gray-500 text-sm mb-4">{articles.length} článků</p>
      <div className="space-y-3">
        {articles.map((a: any) => <ArticleCard key={a.id as number} article={a as any} />)}
      </div>
    </div>
  )
}
