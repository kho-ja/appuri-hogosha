import React, { createContext, useContext, useState, ReactNode } from 'react'

interface FontSizeContextType {
  multiplier: number;
  setMultiplier: (value: number) => void;
}

const FontSizeContext = createContext<FontSizeContextType>({
  multiplier: 1,
  setMultiplier: () => {},
})

export const FontSizeProvider:React.FC<{ children:ReactNode }>= ({ children }) => {
  const [multiplier, setMultiplier] = useState(1.0)

  return (
    <FontSizeContext.Provider value={{ multiplier, setMultiplier }}>
      {children}
    </FontSizeContext.Provider>
  )
}

export const useFontSize = () => useContext(FontSizeContext)
