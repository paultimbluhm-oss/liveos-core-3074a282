import { MoreVertical, MapPin, Calendar, Euro, Clock, User, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Order, STATUS_CONFIG, PRIORITY_CONFIG, OrderStatus, OrderPriority } from './types';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface OrderCardProps {
  order: Order;
  onEdit: (order: Order) => void;
  onDelete: (id: string) => void;
  onViewDetails: (order: Order) => void;
}

export function OrderCard({ order, onEdit, onDelete, onViewDetails }: OrderCardProps) {
  const status = (order.status as OrderStatus) || 'pending';
  const priority = (order.priority as OrderPriority) || 'medium';
  const statusConfig = STATUS_CONFIG[status];
  const priorityConfig = PRIORITY_CONFIG[priority];

  const profit = (order.revenue || 0) - (order.expenses || 0);
  const profitColor = profit >= 0 ? 'text-emerald-400' : 'text-red-400';

  return (
    <div 
      className="glass-card p-5 hover:bg-white/5 transition-all cursor-pointer group"
      onClick={() => onViewDetails(order)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
              {statusConfig.label}
            </span>
            <span className={`text-xs ${priorityConfig.color}`}>
              {priorityConfig.label}
            </span>
          </div>
          <h3 className="font-semibold text-foreground truncate">{order.title}</h3>
          {order.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{order.description}</p>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(order); }}>
              Bearbeiten
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={(e) => { e.stopPropagation(); onDelete(order.id); }}
              className="text-destructive"
            >
              Löschen
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-4 space-y-2">
        {order.contact && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {order.contact.company ? (
              <Building2 className="w-4 h-4 shrink-0" />
            ) : (
              <User className="w-4 h-4 shrink-0" />
            )}
            <span className="truncate">
              {order.contact.name}
              {order.contact.company && ` • ${order.contact.company}`}
            </span>
          </div>
        )}

        {order.location && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 shrink-0" />
            <span className="truncate">{order.location}</span>
          </div>
        )}

        {order.due_date && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4 shrink-0" />
            <span>Fällig: {format(new Date(order.due_date), 'dd. MMM yyyy', { locale: de })}</span>
          </div>
        )}

        {(order.time_spent_hours ?? 0) > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4 shrink-0" />
            <span>{order.time_spent_hours} Stunden</span>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-border/50 grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-xs text-muted-foreground">Einnahmen</p>
          <p className="text-sm font-medium text-emerald-400">
            {(order.revenue || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Ausgaben</p>
          <p className="text-sm font-medium text-red-400">
            {(order.expenses || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Gewinn</p>
          <p className={`text-sm font-medium ${profitColor}`}>
            {profit.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
          </p>
        </div>
      </div>
    </div>
  );
}
