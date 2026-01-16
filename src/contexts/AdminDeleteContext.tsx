import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { toast } from 'sonner';

interface AdminDeleteContextType {
  verifyCode: (code: string) => boolean;
  requestCode: () => void;
  hasRequestedCode: boolean;
}

const AdminDeleteContext = createContext<AdminDeleteContextType | null>(null);

// Generate a random 6-character alphanumeric code
const generateCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export function AdminDeleteProvider({ children }: { children: ReactNode }) {
  const [deleteCode] = useState(() => generateCode());
  const [hasRequestedCode, setHasRequestedCode] = useState(false);
  const [codeDisplayed, setCodeDisplayed] = useState(false);

  const verifyCode = useCallback((code: string): boolean => {
    return code.toUpperCase() === deleteCode;
  }, [deleteCode]);

  const requestCode = useCallback(() => {
    if (codeDisplayed) {
      toast.info('Der Loesch-Code wurde bereits einmalig angezeigt und kann nicht erneut abgerufen werden.');
      return;
    }
    
    setHasRequestedCode(true);
    setCodeDisplayed(true);
    
    // Show the code only once via toast - it will never be shown again
    toast.success(
      `Dein Admin-Loesch-Code: ${deleteCode}`,
      {
        duration: 30000, // 30 seconds to memorize
        description: 'Notiere dir diesen Code! Er wird nur einmal angezeigt und ist fuer diese Session gueltig.',
        style: {
          background: 'hsl(var(--card))',
          border: '2px solid hsl(var(--primary))',
          color: 'hsl(var(--foreground))',
        },
      }
    );
  }, [deleteCode, codeDisplayed]);

  return (
    <AdminDeleteContext.Provider value={{ verifyCode, requestCode, hasRequestedCode }}>
      {children}
    </AdminDeleteContext.Provider>
  );
}

export function useAdminDelete() {
  const context = useContext(AdminDeleteContext);
  if (!context) {
    throw new Error('useAdminDelete must be used within an AdminDeleteProvider');
  }
  return context;
}
