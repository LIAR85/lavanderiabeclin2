import Image from 'next/image'
import { MapPin, Phone } from 'lucide-react'

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-muted/40">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-4 py-12 text-center sm:px-6 md:flex-row md:justify-between md:text-left">
        <div className="flex flex-col items-center gap-4 md:flex-row md:gap-5">
          <Image
            src="/beclin-logo.png"
            alt="beclin — Expertos lavando"
            width={170}
            height={124}
            className="h-16 w-auto"
          />
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
            Expertos lavando en Ciudad Victoria. Cuidamos tu ropa como si fuera nuestra.
          </p>
        </div>

        <div className="space-y-2 text-sm text-muted-foreground">
          <p className="flex items-center justify-center gap-2 md:justify-start">
            <MapPin className="size-4 text-primary" />
            Plaza Sierra Madre, Ciudad Victoria
          </p>
          <a
            href="tel:+528341411298"
            className="flex items-center justify-center gap-2 font-semibold transition-colors hover:text-primary md:justify-start"
          >
            <Phone className="size-4 text-primary" />
            834 141 1298
          </a>
        </div>
      </div>

      <div className="border-t border-border py-5">
        <p className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} beclin · beclinlavanderia.com · Todos los derechos reservados.
        </p>
      </div>
    </footer>
  )
}
