import Image from 'next/image'
import { MapPin, MessageCircle, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { HeroCarousel } from '@/components/hero-carousel'

export function Hero() {
  return (
    <section id="inicio" className="relative overflow-hidden">
      {/* soft brand backdrop */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-secondary/40 via-background to-background" />
      <div className="pointer-events-none absolute -right-24 -top-24 -z-10 size-72 rounded-full bg-secondary/50 blur-3xl" />
      <div className="pointer-events-none absolute -left-20 top-40 -z-10 size-64 rounded-full bg-accent/25 blur-3xl" />

      <HeroCarousel />

      <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:py-24">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/15 px-4 py-1.5 text-sm font-bold text-accent-foreground shadow-sm">
            <Sparkles className="size-4 text-accent" />
            Expertos lavando en Ciudad Victoria
          </span>

          <h1 className="mt-6 font-heading text-4xl font-black leading-[1.05] tracking-tight text-primary text-balance sm:text-5xl lg:text-6xl">
            Tu ropa, impecable y lista para brillar.
          </h1>

          <p className="mt-5 max-w-md text-lg leading-relaxed text-muted-foreground text-pretty">
            En beclin cuidamos cada prenda como si fuera nuestra. Lavado, secado,
            planchado y tintorería con el acabado profesional que tu ropa merece.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="rounded-full font-bold shadow-md">
              <a
                href="https://wa.me/528341411298"
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="size-5" />
                Escríbenos por WhatsApp
              </a>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="rounded-full border-primary/30 font-bold text-primary hover:bg-secondary/40"
            >
              <a href="#ubicacion">
                <MapPin className="size-5" />
                Cómo llegar
              </a>
            </Button>
          </div>

          <p className="mt-6 text-sm font-semibold text-foreground/60">
            Plaza Sierra Madre · Ciudad Victoria, Tamaulipas
          </p>
        </div>

        <div className="relative">
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-border bg-card shadow-xl">
            <Image
              src="/hero-laundry.png"
              alt="Ropa recién lavada y doblada por beclin"
              fill
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
          <div className="absolute -bottom-5 -left-3 flex items-center gap-3 rounded-2xl border border-accent/20 bg-card px-5 py-3 shadow-lg ring-1 ring-secondary/40 sm:-left-6">
            <span className="flex size-10 items-center justify-center rounded-full bg-accent/20 text-accent-foreground">
              <Sparkles className="size-5 text-accent" />
            </span>
            <div className="leading-tight">
              <p className="font-heading text-sm font-black text-primary">Acabado profesional</p>
              <p className="text-xs text-muted-foreground">Prendas frescas y bien cuidadas</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
