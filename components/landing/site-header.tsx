import Image from 'next/image'
import { Phone } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const navLinks = [
  { label: 'Servicios', href: '#servicios' },
  { label: 'Por que Beclin?', href: '#porque' },
  { label: 'Ubicacion', href: '#ubicacion' },
  { label: 'Contacto', href: '#contacto' },
]

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-white">
      <div className="mx-auto flex h-24 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <a href="#inicio" className="flex items-center" aria-label="beclin inicio">
          <Image
            src="/beclin-logo.png"
            alt="beclin - Expertos lavando"
            width={200}
            height={145}
            priority
            className="h-16 w-auto mix-blend-multiply sm:h-20"
          />
        </a>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Principal">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-semibold text-foreground/70 transition-colors hover:text-primary"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <a
          href="tel:+528341411298"
          className={cn(buttonVariants(), 'rounded-full font-bold shadow-sm')}
        >
          <Phone className="size-4" />
          <span className="hidden sm:inline">834 141 1298</span>
          <span className="sm:hidden">Llamar</span>
        </a>
      </div>
    </header>
  )
}
