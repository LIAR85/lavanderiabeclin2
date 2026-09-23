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
    title: 'Tintorería y planchado',
    description: 'Prendas delicadas y de vestir con un planchado impecable.',
  },
  {
    icon: BedDouble,
    title: 'Edredones',
    description: 'Lavado profundo de edredones de cualquier tamaño.',
  },
  {
    icon: Layers,
    title: 'Colchas y sábanas',
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
          <h2 className="mt-3 font-heading text-3xl font-black tracking-tight text-primary text-balance sm:text-4xl">
            Somos expertos en lavado y planchado
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground text-pretty">
            Todo lo que tu ropa y tu hogar necesitan, en un solo lugar.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((service) => (
            <div
              key={service.title}
              className="group rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:border-secondary hover:shadow-lg"
            >
              <span className="flex size-14 items-center justify-center rounded-2xl bg-secondary/45 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <service.icon className="size-7" strokeWidth={1.6} />
              </span>
              <h3 className="mt-5 font-heading text-lg font-black text-primary">
                {service.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {service.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
