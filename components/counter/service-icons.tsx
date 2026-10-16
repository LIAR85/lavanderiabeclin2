import {
  BedDouble,
  BedSingle,
  Droplets,
  Footprints,
  Package,
  Shirt,
  Sparkles,
  WashingMachine,
  Wind,
} from 'lucide-react'
import type { ComponentType, SVGProps } from 'react'
import type { ServiceType } from '@/lib/types'

type IconProps = SVGProps<SVGSVGElement> & { className?: string }

function IronIcon(props: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M3 19h18l-2.2-6.2a2 2 0 0 0-1.9-1.3H5a2 2 0 0 0-2 2z" />
      <path d="M7 11.5V9a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v2.5" />
      <path d="M7 15.5h8" />
    </svg>
  )
}

export const SERVICE_ICONS: Record<ServiceType, ComponentType<IconProps>> = {
  lavado: WashingMachine,
  lavado_secado: Droplets,
  lavado_planchado: Sparkles,
  edredones: BedDouble,
  ropa_cama: BedSingle,
  tintoreria: Shirt,
  tenis: Footprints,
  planchado: IronIcon,
  secado: Wind,
  otro: Package,
}
