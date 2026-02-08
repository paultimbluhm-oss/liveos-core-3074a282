import { Building2, Globe, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Company, STATUS_CONFIG } from '../types';
import { useBusinessV2 } from '../context/BusinessV2Context';

interface CompanyCardProps {
  company: Company;
  onClick: () => void;
}

export function CompanyCard({ company, onClick }: CompanyCardProps) {
  const { getCompanyContacts } = useBusinessV2();
  const contactCount = getCompanyContacts(company.id).length;
  const statusConfig = STATUS_CONFIG[company.status];

  return (
    <div
      onClick={onClick}
      className="flex items-center justify-between p-3 bg-card border border-border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Building2 className="w-4 h-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium truncate">{company.name}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {company.website && (
              <span className="flex items-center gap-1">
                <Globe className="w-3 h-3" />
                <span className="truncate max-w-[100px]">{company.website.replace(/^https?:\/\//, '')}</span>
              </span>
            )}
            {contactCount > 0 && (
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {contactCount}
              </span>
            )}
          </div>
        </div>
      </div>
      <span className={cn('px-2 py-1 rounded-full text-xs font-medium shrink-0', statusConfig.color)}>
        {statusConfig.label}
      </span>
    </div>
  );
}
