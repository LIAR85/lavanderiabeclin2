import { SiteHeader } from '@/components/site-header'
import { Hero } from '@/components/hero'
import { Services } from '@/components/services'
import { Features } from '@/components/features'
import { Contact } from '@/components/contact'
import { SiteFooter } from '@/components/site-footer'
import { WhatsAppFab } from '@/components/whatsapp-fab'

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
