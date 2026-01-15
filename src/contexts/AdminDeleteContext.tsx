import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AdminDeleteContextType {
  deleteCode: string;
  verifyCode: (code: string) => boolean;
  showCode: () => void;
  codeShown: boolean;
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
  const [codeShown, setCodeShown] = useState(false);

  useEffect(() => {
    // Log the code once on mount for security
    console.log('%c[ADMIN] Loesch-Code fuer diese Session:', 'color: #f59e0b; font-weight: bold; font-size: 14px;');
    console.log('%c' + deleteCode, 'color: #ef4444; font-weight: bold; font-size: 18px; background: #fef2f2; padding: 8px 16px; border-radius: 4px;');
    console.log('%cDieser Code wird benoetigt, um Schulen oder Kurse zu loeschen.', 'color: #6b7280; font-size: 12px;');
  }, [deleteCode]);

  const verifyCode = (code: string): boolean => {
    return code.toUpperCase() === deleteCode;
  };

  const showCode = () => {
    setCodeShown(true);
    alert(`Loesch-Code: ${deleteCode}\n\nDieser Code wird benoetigt, um Schulen oder Kurse unwiderruflich zu loeschen.`);
  };

  return (
    <AdminDeleteContext.Provider value={{ deleteCode, verifyCode, showCode, codeShown }}>
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
