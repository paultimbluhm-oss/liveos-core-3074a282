import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { GamificationProvider } from "@/contexts/GamificationContext";
import { AdminDeleteProvider } from "@/contexts/AdminDeleteContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Schule from "./pages/Schule";
import Privat from "./pages/Privat";
import Business from "./pages/Business";
import Profile from "./pages/Profile";
import Kalender from "./pages/Kalender";
import Freunde from "./pages/Freunde";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <GamificationProvider>
        <AdminDeleteProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/kalender" element={<Kalender />} />
                <Route path="/schule" element={<Schule />} />
                <Route path="/privat" element={<Privat />} />
                <Route path="/business" element={<Business />} />
                <Route path="/freunde" element={<Freunde />} />
                <Route path="/profil" element={<Profile />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AdminDeleteProvider>
      </GamificationProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
