'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const slides = [
  {
    src: '/slide-1.png',
    alt: 'Ropa y toallas recien lavadas y dobladas por beclin',
    title: 'Lavado profesional,\nropa impecable siempre.',
    caption:
      'En beclin brindamos servicio de limpieza profesional y tintoreria con calidad humana, cuidando cada prenda con procesos confiables para que cada cliente avance con tranquilidad en su dia a dia.',
  },
  {
    src: '/slide-2.png',
    alt: 'Planchado profesional de una camisa blanca',
    title: 'Planchado preciso,\npresentacion impecable.',
    caption:
      'En beclin dejamos cada prenda con un terminado limpio y profesional, cuidando telas, cortes y detalles para que siempre luzcas ordenado y seguro en cada ocasion.',
  },
  {
    src: '/slide-3.png',
    alt: 'Lavadoras modernas en la lavanderia beclin',
    title: 'Tecnologia confiable,\nresultado superior.',
    caption:
      'Trabajamos con equipos modernos y procesos eficientes que permiten cuidar cada carga con consistencia, higiene y calidad en todo momento.',
  },
  {
    src: '/slide-4.png',
    alt: 'Prendas de tintoreria cubiertas y colgadas',
    title: 'Tintoreria experta,\nprendas como nuevas.',
    caption:
      'Atendemos trajes, vestidos y prendas delicadas con tratamientos especializados para conservar textura, color y forma, entregando resultados de alta calidad.',
  },
]

const AUTOPLAY_MS_MOBILE = 5000
const AUTOPLAY_MS_DESKTOP = 7000

export function HeroCarousel() {
  const [index, setIndex] = useState(0)

  const goTo = useCallback((next: number) => {
    setIndex((next + slides.length) % slides.length)
  }, [])

  const prev = useCallback(() => goTo(index - 1), [goTo, index])
  const next = useCallback(() => goTo(index + 1), [goTo, index])

  useEffect(() => {
    const autoplayMs = window.innerWidth >= 1024 ? AUTOPLAY_MS_DESKTOP : AUTOPLAY_MS_MOBILE
    const id = setInterval(() => {
      setIndex((current) => (current + 1) % slides.length)
    }, autoplayMs)
    return () => clearInterval(id)
  }, [])

  return (
    <section
      aria-roledescription="carrusel"
      aria-label="Galeria de servicios beclin"
      className="relative h-[100svh] min-h-[620px] w-full overflow-hidden bg-primary sm:aspect-[21/9] sm:h-auto sm:min-h-0"
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
          <div className="absolute inset-0 bg-gradient-to-r from-primary/60 via-primary/25 to-transparent" />
          <div className="absolute inset-y-0 left-0 z-10 flex w-full items-center px-6 md:px-[8%]">
            <div className="max-w-[620px] text-left">
              <p className="max-w-[620px] whitespace-pre-line font-display text-[34px] leading-[1.08] font-bold text-white sm:text-[42px] lg:text-[56px] [text-shadow:0_2px_16px_rgba(22,34,74,0.45)]">
                {slide.title}
              </p>
              <p className="mt-6 max-w-[520px] text-[18px] leading-[1.6] font-normal text-[rgba(255,255,255,0.9)] [text-shadow:0_2px_16px_rgba(22,34,74,0.45)]">
                {slide.caption}
              </p>
            </div>
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
