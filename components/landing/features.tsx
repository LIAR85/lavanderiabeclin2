import { Clock, HandHeart, Sparkles, Truck } from 'lucide-react'

const features = [
  {
    icon: Sparkles,
    title: 'Acabado profesional',
    description: 'Anos de experiencia lavando y planchando cada tipo de prenda.',
  },
  {
    icon: HandHeart,
    title: 'Cuidado en cada prenda',
    description: 'Tratamos tu ropa con productos y procesos que la protegen.',
  },
  {
    icon: Clock,
    title: 'Servicio rapido',
    description: 'Opciones urgentes cuando lo necesitas para hoy mismo.',
  },
  {
    icon: Truck,
    title: 'Facil y cerca de ti',
    description: 'Ubicados en Plaza Sierra Madre, en el corazon de Ciudad Victoria.',
  },
]

export function Features() {
  return (
    <section id="porque" className="scroll-mt-24 bg-primary py-20 text-primary-foreground sm:py-24">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-bold uppercase tracking-widest text-accent">
            Por que Beclin?
          </span>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Expertos lavando, en quienes puedes confiar
          </h2>
        </div>

        <div className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl bg-primary-foreground/10 p-4 backdrop-blur-sm sm:p-6"
            >
              <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground sm:size-12 sm:rounded-xl">
                <feature.icon className="size-5 sm:size-6" strokeWidth={1.8} />
              </span>
              <h3 className="mt-4 font-display text-[15px] leading-tight font-semibold sm:mt-5 sm:text-lg">
                {feature.title}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-primary-foreground/75 sm:text-sm">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
