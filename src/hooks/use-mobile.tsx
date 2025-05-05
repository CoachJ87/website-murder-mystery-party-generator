
import * as React from "react"

// Using a smaller breakpoint for better tablet support
const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(false)

  React.useEffect(() => {
    // Set initial state - immediately check if mobile
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    
    // Run immediately
    checkIfMobile()
    
    // Set up listener for window resize events
    window.addEventListener("resize", checkIfMobile)
    
    // Clean up listener
    return () => window.removeEventListener("resize", checkIfMobile)
  }, [])

  return isMobile
}
