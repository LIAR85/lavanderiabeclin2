import { MapPin, Phone, MessageCircle, MessageSquare } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const mapSrc =
  'https://www.google.com/maps?q=Plaza+Sierra+Madre+Ciudad+Victoria+Tamaulipas&output=embed'

export function Contact() {
  return (
    <section id="ubicacion" className="scroll-mt-24 py-20 sm:py-24">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
          <div id="contacto" className="scroll-mt-24">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/15 px-3 py-1 text-xs font-bold uppercase tracking-widest text-accent-foreground">
              Visitanos
            </span>
            <h2 className="mt-3 font-display text-3xl font-black tracking-tight text-primary text-balance sm:text-4xl">
              Estamos en Plaza Sierra Madre
            </h2>
            <p className="mt-4 max-w-md text-lg leading-relaxed text-muted-foreground text-pretty">
              Pasa a dejar tu ropa o escribenos para resolver cualquier duda.
              Con gusto te atendemos.
            </p>

            <ul className="mt-8 space-y-4">
              <li className="flex items-start gap-4">
                <span className="mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-xl bg-secondary/45 text-primary">
                  <MapPin className="size-5" />
                </span>
                <div>
                  <p className="font-display text-base font-black text-primary">Direccion</p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    16 Sierra Hermosa, Plaza Sierra Madre,
                    <br />
                    Ciudad Victoria, Tamaulipas, Mexico
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <span className="mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-xl bg-secondary/45 text-primary">
                  <Phone className="size-5" />
                </span>
                <div>
                  <p className="font-display text-base font-black text-primary">Telefono</p>
                  <a
                    href="tel:+528341411298"
                    className="text-sm font-semibold text-muted-foreground transition-colors hover:text-primary"
                  >
                    834 141 1298
                  </a>
                </div>
              </li>
            </ul>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="https://wa.me/528341411298"
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  buttonVariants({ size: 'lg' }),
                  'rounded-full bg-[#25D366] font-bold text-white shadow-md shadow-[#25D366]/25 hover:bg-[#20bd5a]',
                )}
              >
                <MessageCircle className="size-5" />
                WhatsApp
              </a>
              <a
                href="https://www.facebook.com/people/Clin-Lavander%C3%ADa/"
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  buttonVariants({ size: 'lg', variant: 'outline' }),
                  'rounded-full border-primary/30 font-bold text-primary hover:bg-secondary/40',
                )}
              >
                <MessageSquare className="size-5" />
                Facebook
              </a>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-lg">
            <iframe
              title="Ubicacion de beclin en Plaza Sierra Madre, Ciudad Victoria"
              src={mapSrc}
              className="h-80 w-full lg:h-[26rem]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
