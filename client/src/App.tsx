/** Design: 배움의 등대 — 단일 아카이브 경험에 집중하는 가벼운 루트 구성. */
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Catalog from "./pages/Catalog";
import { useEffect, useState } from "react";

function App() {
  const [location, setLocation] = useState(window.location.hash);
  useEffect(() => {
    const update = () => setLocation(window.location.hash);
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          {location.startsWith("#catalog/") ? (
            <Catalog location={location} />
          ) : (
            <Home />
          )}
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
