'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'

interface Props {
  stills: string[]
}

export default function EpisodeStillsGallery({ stills }: Props) {
  const [lightbox, setLightbox] = useState<number | null>(null)

  const close = useCallback(() => setLightbox(null), [])
  const prev = useCallback(() => setLightbox(i => i !== null ? (i - 1 + stills.length) % stills.length : null), [stills.length])
  const next = useCallback(() => setLightbox(i => i !== null ? (i + 1) % stills.length : null), [stills.length])

  useEffect(() => {
    if (lightbox === null) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [lightbox, close, prev, next])

  // Zablokovat scroll při otevřeném lightboxu
  useEffect(() => {
    document.body.style.overflow = lightbox !== null ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [lightbox])

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {stills.map((url, i) => (
          <button
            key={i}
            onClick={() => setLightbox(i)}
            className="relative aspect-video rounded-lg overflow-hidden bg-gray-800 border border-gray-700 hover:opacity-80 transition-opacity focus:outline-none"
          >
            <Image src={url} alt={`Záběr ${i + 1}`} fill className="object-cover" />
          </button>
        ))}
      </div>

      {lightbox !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={close}
        >
          {/* Obrázek */}
          <div
            className="relative max-w-5xl w-full mx-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="relative w-full aspect-video rounded-lg overflow-hidden">
              <Image
                src={stills[lightbox].replace('/w780', '/original')}
                alt={`Záběr ${lightbox + 1}`}
                fill
                className="object-contain"
                priority
              />
            </div>
            <p className="text-center text-xs text-gray-500 mt-2">{lightbox + 1} / {stills.length}</p>
          </div>

          {/* Zavřít */}
          <button
            onClick={close}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            aria-label="Zavřít"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>

          {/* Šipky */}
          {stills.length > 1 && (
            <>
              <button
                onClick={e => { e.stopPropagation(); prev() }}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                aria-label="Předchozí"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <path d="m15 18-6-6 6-6"/>
                </svg>
              </button>
              <button
                onClick={e => { e.stopPropagation(); next() }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                aria-label="Další"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <path d="m9 18 6-6-6-6"/>
                </svg>
              </button>
            </>
          )}
        </div>
      )}
    </>
  )
}
