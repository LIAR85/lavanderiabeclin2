import Image from 'next/image'

const reelImages = [
  '/slide-1.png',
  '/slide-2.png',
  '/slide-3.png',
  '/slide-4.png',
  '/hero-laundry.png',
]

const rows = [
  { className: 'row-a', key: 'a' },
  { className: 'row-b reverse', key: 'b' },
  { className: 'row-c', key: 'c' },
]

export function FilmStripBackground() {
  const loopedImages = [...reelImages, ...reelImages]

  return (
    <div className="film-bg pointer-events-none -z-10">
      {rows.map((row) => (
        <div key={row.key} className={`film-strip-row ${row.className}`}>
          {loopedImages.map((src, index) => (
            <div key={`${row.key}-${src}-${index}`} className="film-frame">
              <div className="film-frame-visual">
                <Image
                  src={src}
                  alt="Fotografia de servicio beclin"
                  fill
                  sizes="(max-width: 768px) 45vw, 24vw"
                  className="film-photo object-cover"
                />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
