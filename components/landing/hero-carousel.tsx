'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const slides = [
  {
    src: '/slide-1.png',
    alt: 'Ropa y toallas recien lavadas y dobladas por beclin',
    title: 'Lavado y secado\nprofesional',
    caption: 'Tu ropa fresca, suave y lista para usar.',
  },
  {
    src: '/slide-2.png',
    alt: 'Planchado profesional de una camisa blanca',
    title: 'Planchado\nimpecable',
    caption: 'Acabado nitido en cada prenda.',
  },
  {
    src: '/slide-3.png',
    alt: 'Lavadoras modernas en la lavanderia beclin',
    title: 'Equipo siempre listo\npara servirte',
    caption: 'Cuidamos cada carga con la mejor tecnologia.',
  },
  {
    src: '/slide-4.png',
    alt: 'Prendas de tintoreria cubiertas y colgadas',
    title: 'Tintoreria\nespecializada',
    caption: 'Trajes, vestidos y prendas delicadas como nuevas.',
  },
]

const AUTOPLAY_MS = 5000

export function HeroCarousel() {
  const [index, setIndex] = useState(0)

  const goTo = useCallback((next: number) => {
    setIndex((next + slides.length) % slides.length)
  }, [])

  const prev = useCallback(() => goTo(index - 1), [goTo, index])
  const next = useCallback(() => goTo(index + 1), [goTo, index])

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((current) => (current + 1) % slides.length)
    }, AUTOPLAY_MS)
    return () => clearInterval(id)
  }, [])

  return (
    <section
      aria-roledescription="carrusel"
      aria-label="Galeria de servicios beclin"
      className="relative aspect-[16/9] w-full overflow-hidden bg-primary sm:aspect-[21/9]"
    >
      {slides.map((slide, i) => (
        <div
          key={slide.src}
          className="absolute inset-0 transition-opacity duration-700 ease-in-out"
          style={{ opacity: i === index ? 1 : 0 }}
          aria-hidden={i !== index}
        >
          <Image
            src={slide.src}
            alt={slide.alt}
            fill
            priority={i === 0}
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-primary/25 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-6xl px-6 pb-10 text-center sm:pb-12">
            <p className="mx-auto max-w-3xl whitespace-pre-line font-display text-4xl font-black leading-tight text-primary-foreground drop-shadow-sm sm:text-6xl">
              {slide.title}
            </p>
            <p className="mx-auto mt-4 max-w-3xl text-lg leading-relaxed text-primary-foreground/95 text-pretty sm:text-2xl">
              {slide.caption}
            </p>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={prev}
        aria-label="Imagen anterior"
        className="absolute left-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 text-primary shadow-md backdrop-blur transition hover:bg-background sm:left-5"
      >
        <ChevronLeft className="size-5" />
      </button>
      <button
        type="button"
        onClick={next}
        aria-label="Imagen siguiente"
        className="absolute right-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 text-primary shadow-md backdrop-blur transition hover:bg-background sm:right-5"
      >
        <ChevronRight className="size-5" />
      </button>

      <div className="absolute inset-x-0 bottom-4 flex items-center justify-center gap-2">
        {slides.map((slide, i) => (
          <button
            key={slide.src}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`Ir a la imagen ${i + 1}`}
            aria-current={i === index}
            className={
              i === index
                ? 'h-2 w-7 rounded-full bg-primary-foreground transition-all'
                : 'h-2 w-2 rounded-full bg-primary-foreground/50 transition-all hover:bg-primary-foreground/75'
            }
          />
        ))}
      </div>
    </section>
  )
}
