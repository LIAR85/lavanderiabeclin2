import { Contact } from '@/components/landing/contact'
import { Features } from '@/components/landing/features'
import { Hero } from '@/components/landing/hero'
import { Services } from '@/components/landing/services'
import { SiteFooter } from '@/components/landing/site-footer'
import { SiteHeader } from '@/components/landing/site-header'
import { WhatsAppFab } from '@/components/landing/whatsapp-fab'

export default function Page() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <Services />
        <Features />
        <Contact />
      </main>
      <SiteFooter />
      <WhatsAppFab />
    </div>
  )
}
