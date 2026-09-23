import {
  WashingMachine,
  Shirt,
  Wind,
  BedDouble,
  Footprints,
  Sofa,
  Car,
  Layers,
} from 'lucide-react'

const services = [
  {
    icon: WashingMachine,
    title: 'Lavado en agua',
    description: 'Lavado y secado profesional que deja tu ropa limpia y fresca.',
  },
  {
    icon: Shirt,
    title: 'Tintoreria y planchado',
    description: 'Prendas delicadas y de vestir con un planchado impecable.',
  },
  {
    icon: BedDouble,
    title: 'Edredones',
    description: 'Lavado profundo de edredones de cualquier tamano.',
  },
  {
    icon: Layers,
    title: 'Colchas y sabanas',
    description: 'Ropa de cama suave, limpia y perfectamente doblada.',
  },
  {
    icon: Wind,
    title: 'Planchado',
    description: 'Servicio de planchado por prenda, docena o urgente.',
  },
  {
    icon: Footprints,
    title: 'Tenis',
    description: 'Limpieza especializada para devolver la vida a tus tenis.',
  },
  {
    icon: Sofa,
    title: 'Tapetes y peluches',
    description: 'Cuidado a fondo para tapetes y los peluches favoritos.',
  },
  {
    icon: Car,
    title: 'Asientos de coche',
    description: 'Limpieza de asientos para un interior como nuevo.',
  },
]

export function Services() {
  return (
    <section id="servicios" className="scroll-mt-24 py-20 sm:py-24">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-bold uppercase tracking-widest text-primary/70">
            Nuestros servicios
          </span>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-primary text-balance sm:text-4xl">
            Somos expertos en lavado y planchado
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground text-pretty">
            Todo lo que tu ropa y tu hogar necesitan, en un solo lugar.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
          {services.map((service) => (
            <div
              key={service.title}
              className="group rounded-2xl border border-border bg-card p-4 transition-all hover:-translate-y-1 hover:border-secondary hover:shadow-lg sm:p-6"
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-secondary/45 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground sm:size-14 sm:rounded-2xl">
                <service.icon className="size-5 sm:size-7" strokeWidth={1.6} />
              </span>
              <h3 className="mt-4 font-display text-[15px] leading-tight font-semibold text-primary sm:mt-5 sm:text-lg">
                {service.title}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                {service.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
