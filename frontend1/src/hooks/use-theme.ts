// File path: code_tutor/frontend/src/hooks/use-theme.ts

import { useContext } from "react";
import { ThemeProviderContext } from "@/contexts/ThemeProviderContext";

export const useTheme = () => {
    const context = useContext(ThemeProviderContext)
  
    if (context === undefined)
      throw new Error("useTheme must be used within a ThemeProvider")
  
    return context
  }