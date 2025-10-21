import Image from 'next/image'

interface LogoProps {
  className?: string
  size?: number
  variant?: 'default' | 'transparent' // 'default' = mit Hintergrund, 'transparent' = ohne Hintergrund
}

export default function Logo({ className = '', size = 32, variant = 'transparent' }: LogoProps) {
  const logoSrc = variant === 'transparent' ? '/logo-transparent.png' : '/logo.png'

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <Image
        src={logoSrc}
        alt="Nexus Logo"
        width={size}
        height={size}
        className="object-contain"
        priority
      />
    </div>
  )
}
