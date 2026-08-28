'use client'

import React, { useEffect, useRef } from 'react'
import { ReactLenis, type LenisRef } from 'lenis/react'
import 'lenis/dist/lenis.css'

interface LenisScrollProviderProps {
  children: React.ReactNode
}

export function LenisScrollProvider({ children }: LenisScrollProviderProps) {
  const lenisRef = useRef<LenisRef>(null)

  useEffect(() => {
    if (lenisRef.current?.lenis) {
      ;(window as any).lenis = lenisRef.current.lenis
    }

    return () => {
      delete (window as any).lenis
    }
  }, [])

  return (
    <ReactLenis
      ref={lenisRef}
      root
      options={{
        lerp: 0.1,
        duration: 1.2,
        smoothWheel: true,
        wheelMultiplier: 1,
        touchMultiplier: 1.5,
        infinite: false,
      }}
    >
      {children}
    </ReactLenis>
  )
}

export default LenisScrollProvider
