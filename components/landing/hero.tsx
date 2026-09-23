import { FilmStripBackground } from '@/components/landing/film-strip-background'
import { HeroCarousel } from '@/components/landing/hero-carousel'

export function Hero() {
  return (
    <section id="inicio" className="relative overflow-hidden">
      <FilmStripBackground />

      <div className="relative z-10">
        <HeroCarousel />
      </div>
    </section>
  )
}
