'use client'

import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'

interface AuthModalContextType {
  isOpen: boolean
  openAuthModal: () => void
  closeAuthModal: () => void
}

const AuthModalContext = createContext<AuthModalContextType>({
  isOpen: false,
  openAuthModal: () => {},
  closeAuthModal: () => {},
})

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <AuthModalContext.Provider value={{
      isOpen,
      openAuthModal: () => setIsOpen(true),
      closeAuthModal: () => setIsOpen(false),
    }}>
      {children}
    </AuthModalContext.Provider>
  )
}

export function useAuthModal() {
  return useContext(AuthModalContext)
}
