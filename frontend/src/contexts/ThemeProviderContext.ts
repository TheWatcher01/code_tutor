// File path: code_tutor/frontend/src/contexts/ThemeProviderContext.ts

import { createContext } from "react"
import { ThemeProviderState } from "@/components/ThemeProvider"

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
}

export const ThemeProviderContext = createContext<ThemeProviderState>(initialState) 