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

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl bg-primary-foreground/10 p-6 backdrop-blur-sm"
            >
              <span className="flex size-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <feature.icon className="size-6" strokeWidth={1.8} />
              </span>
              <h3 className="mt-5 font-display text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-primary-foreground/75">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
