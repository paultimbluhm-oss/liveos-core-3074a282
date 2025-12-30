import { useMemo, useState } from 'react';
import { Contact, ContactConnection, RELATIONSHIP_TYPES, STATUS_CONFIG, ContactStatus } from './types';
import { User, Link2 } from 'lucide-react';
import { EditConnectionDialog } from './EditConnectionDialog';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface ContactTreeViewProps {
  contacts: Contact[];
  connections: ContactConnection[];
  onContactClick?: (contact: Contact) => void;
  onUpdateConnection?: (id: string, type: string, description: string) => void;
  onDeleteConnection?: (id: string) => void;
}

interface TreeNode {
  contact: Contact;
  children: { node: TreeNode; connection: ContactConnection }[];
  depth: number;
}

interface CrossConnection {
  fromId: string;
  toId: string;
  connection: ContactConnection;
}

const getStatusConfig = (status: ContactStatus) => {
  return STATUS_CONFIG[status] || { 
    label: status, 
    color: 'text-muted-foreground', 
    bgColor: 'bg-muted/50', 
    borderColor: 'border-muted',
    dotColor: 'bg-muted-foreground',
    order: 99 
  };
};

function buildTree(contacts: Contact[], connections: ContactConnection[]): { 
  trees: TreeNode[]; 
  crossConnections: CrossConnection[];
  usedConnectionIds: Set<string>;
} {
  // Find root nodes (contacts that aren't "to" in any connection)
  const toContactIds = new Set(connections.map(c => c.to_contact_id));
  
  let rootContacts = contacts.filter(c => !toContactIds.has(c.id));
  
  // If no root contacts found, use all contacts without connections as roots
  if (rootContacts.length === 0) {
    const hasConnection = new Set([
      ...connections.map(c => c.from_contact_id),
      ...connections.map(c => c.to_contact_id)
    ]);
    rootContacts = contacts.filter(c => !hasConnection.has(c.id));
  }
  
  // If still none, use the first contact
  if (rootContacts.length === 0 && contacts.length > 0) {
    rootContacts = [contacts[0]];
  }

  // Build adjacency list
  const adjacency: Record<string, { contactId: string; connection: ContactConnection }[]> = {};
  connections.forEach(conn => {
    if (!adjacency[conn.from_contact_id]) {
      adjacency[conn.from_contact_id] = [];
    }
    adjacency[conn.from_contact_id].push({ 
      contactId: conn.to_contact_id, 
      connection: conn 
    });
  });

  const contactMap = new Map(contacts.map(c => [c.id, c]));
  const visited = new Set<string>();
  const usedConnectionIds = new Set<string>();

  function buildNode(contactId: string, depth: number): TreeNode | null {
    if (visited.has(contactId)) return null;
    const contact = contactMap.get(contactId);
    if (!contact) return null;
    
    visited.add(contactId);
    
    const children: { node: TreeNode; connection: ContactConnection }[] = [];
    const childLinks = adjacency[contactId] || [];
    
    childLinks.forEach(({ contactId: childId, connection }) => {
      const childNode = buildNode(childId, depth + 1);
      if (childNode) {
        children.push({ node: childNode, connection });
        usedConnectionIds.add(connection.id);
      }
    });

    return {
      contact,
      children,
      depth,
    };
  }

  const trees: TreeNode[] = [];
  
  // Build trees from root contacts
  rootContacts.forEach(contact => {
    const node = buildNode(contact.id, 0);
    if (node) trees.push(node);
  });

  // Add any remaining unvisited contacts as separate trees
  contacts.forEach(contact => {
    if (!visited.has(contact.id)) {
      const node = buildNode(contact.id, 0);
      if (node) trees.push(node);
    }
  });

  // Find cross-connections (connections not used in tree hierarchy)
  const crossConnections: CrossConnection[] = connections
    .filter(conn => !usedConnectionIds.has(conn.id))
    .map(conn => ({
      fromId: conn.from_contact_id,
      toId: conn.to_contact_id,
      connection: conn,
    }));

  return { trees, crossConnections, usedConnectionIds };
}

function ContactBlock({ 
  contact, 
  onClick,
  crossConnectionCount,
  onCrossConnectionClick,
}: { 
  contact: Contact;
  onClick: () => void;
  crossConnectionCount?: number;
  onCrossConnectionClick?: () => void;
}) {
  const statusConfig = getStatusConfig(contact.status);

  return (
    <div className="relative">
      <motion.button
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className={cn(
          "px-4 py-2.5 rounded-lg font-medium text-sm border-2 transition-all",
          "hover:shadow-lg active:shadow-md shadow-sm",
          "min-w-[100px] max-w-[180px] truncate text-center",
          statusConfig.bgColor,
          statusConfig.borderColor,
          statusConfig.color,
        )}
      >
        {contact.name}
      </motion.button>
      
      {/* Cross-connection indicator */}
      {crossConnectionCount && crossConnectionCount > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCrossConnectionClick?.();
          }}
          className="absolute -top-2 -right-2 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-[10px] font-bold shadow-md hover:scale-110 transition-transform"
          title="Querverbindungen anzeigen"
        >
          <Link2 className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

function ConnectionLabel({ 
  connection,
  onClick,
}: {
  connection: ContactConnection;
  onClick: () => void;
}) {
  const label = RELATIONSHIP_TYPES.find(r => r.value === connection.relationship_type)?.label 
    || connection.relationship_type;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="text-[10px] text-muted-foreground bg-background px-2 py-1 rounded-full border-2 border-border hover:border-primary hover:text-primary transition-colors font-medium shadow-sm"
    >
      {label}
    </button>
  );
}

function TreeBranch({ 
  node, 
  parentConnection,
  onContactClick,
  onConnectionClick,
  isRoot = false,
  crossConnectionCounts,
  onShowCrossConnections,
}: { 
  node: TreeNode;
  parentConnection?: ContactConnection;
  onContactClick: (contact: Contact) => void;
  onConnectionClick: (connection: ContactConnection) => void;
  isRoot?: boolean;
  crossConnectionCounts: Record<string, number>;
  onShowCrossConnections: (contactId: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = node.children.length > 0;

  return (
    <div className="flex flex-col items-center">
      {/* Connection line from parent */}
      {!isRoot && (
        <div className="flex flex-col items-center">
          <div className="w-0.5 h-4 bg-primary/40 rounded-full" />
          {parentConnection && (
            <ConnectionLabel 
              connection={parentConnection}
              onClick={() => onConnectionClick(parentConnection)}
            />
          )}
          <div className="w-0.5 h-4 bg-primary/40 rounded-full" />
        </div>
      )}

      {/* Contact block */}
      <div className="relative">
        <ContactBlock 
          contact={node.contact}
          onClick={() => onContactClick(node.contact)}
          crossConnectionCount={crossConnectionCounts[node.contact.id]}
          onCrossConnectionClick={() => onShowCrossConnections(node.contact.id)}
        />
        
        {/* Expand/collapse indicator */}
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground hover:text-primary transition-colors"
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        )}
      </div>

      {/* Children */}
      <AnimatePresence>
        {isExpanded && hasChildren && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-col items-center mt-3"
          >
            {/* Vertical line to children */}
            <div className="w-0.5 h-5 bg-primary/40 rounded-full" />
            
            {/* Horizontal connector if multiple children */}
            {node.children.length > 1 && (
              <div 
                className="h-0.5 bg-primary/40 rounded-full" 
                style={{ 
                  width: `${Math.min(node.children.length * 140, 400)}px` 
                }} 
              />
            )}
            
            {/* Children row */}
            <div className="flex flex-wrap justify-center gap-6">
              {node.children.map(({ node: childNode, connection }) => (
                <TreeBranch
                  key={childNode.contact.id}
                  node={childNode}
                  parentConnection={connection}
                  onContactClick={onContactClick}
                  onConnectionClick={onConnectionClick}
                  crossConnectionCounts={crossConnectionCounts}
                  onShowCrossConnections={onShowCrossConnections}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CrossConnectionsPanel({
  contactId,
  contactName,
  crossConnections,
  contacts,
  onConnectionClick,
  onClose,
}: {
  contactId: string;
  contactName: string;
  crossConnections: CrossConnection[];
  contacts: Contact[];
  onConnectionClick: (connection: ContactConnection) => void;
  onClose: () => void;
}) {
  const relevantConnections = crossConnections.filter(
    cc => cc.fromId === contactId || cc.toId === contactId
  );

  const contactMap = new Map(contacts.map(c => [c.id, c]));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="bg-secondary/80 backdrop-blur-sm rounded-lg p-4 border-2 border-primary/30"
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-sm">Querverbindungen von {contactName}</h4>
        <button 
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          ✕
        </button>
      </div>
      <div className="space-y-2">
        {relevantConnections.map(cc => {
          const otherContactId = cc.fromId === contactId ? cc.toId : cc.fromId;
          const otherContact = contactMap.get(otherContactId);
          const relationshipLabel = RELATIONSHIP_TYPES.find(r => r.value === cc.connection.relationship_type)?.label 
            || cc.connection.relationship_type;
          const statusConfig = otherContact ? getStatusConfig(otherContact.status) : null;

          return (
            <button
              key={cc.connection.id}
              onClick={() => onConnectionClick(cc.connection)}
              className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-background/50 transition-colors text-left"
            >
              <div className="flex items-center gap-2 flex-1">
                <Link2 className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">{relationshipLabel}</span>
                <span className="text-xs">→</span>
                {otherContact && statusConfig && (
                  <span className={cn(
                    "px-2 py-0.5 rounded text-xs font-medium",
                    statusConfig.bgColor,
                    statusConfig.color,
                    statusConfig.borderColor,
                    "border"
                  )}>
                    {otherContact.name}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}

export function ContactTreeView({ 
  contacts, 
  connections, 
  onContactClick,
  onUpdateConnection,
  onDeleteConnection 
}: ContactTreeViewProps) {
  const [selectedConnection, setSelectedConnection] = useState<ContactConnection | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [showCrossConnectionsFor, setShowCrossConnectionsFor] = useState<string | null>(null);

  const { trees, crossConnections } = useMemo(
    () => buildTree(contacts, connections), 
    [contacts, connections]
  );

  // Count cross-connections per contact
  const crossConnectionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    crossConnections.forEach(cc => {
      counts[cc.fromId] = (counts[cc.fromId] || 0) + 1;
      counts[cc.toId] = (counts[cc.toId] || 0) + 1;
    });
    return counts;
  }, [crossConnections]);

  const selectedContactForCross = showCrossConnectionsFor 
    ? contacts.find(c => c.id === showCrossConnectionsFor) 
    : null;

  if (contacts.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Keine Kontakte zum Anzeigen</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border border-border bg-card p-4 sm:p-6 overflow-x-auto">
        {/* Header */}
        <div className="mb-4 pb-3 border-b border-border">
          <h3 className="font-semibold text-base sm:text-lg">Kontakt-Struktur</h3>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {contacts.length} Kontakte, {connections.length} Verbindungen
            {crossConnections.length > 0 && (
              <span className="ml-2 text-primary">
                ({crossConnections.length} Querverbindungen)
              </span>
            )}
          </p>
        </div>

        {/* Status legend - compact for mobile */}
        <div className="flex flex-wrap gap-2 sm:gap-3 mb-4 p-2 sm:p-3 bg-secondary/30 rounded-lg">
          {Object.entries(STATUS_CONFIG).map(([key, config]) => (
            <div key={key} className="flex items-center gap-1 text-[10px] sm:text-xs">
              <span className={cn("w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full", config.dotColor)} />
              <span className={config.color}>{config.label}</span>
            </div>
          ))}
        </div>

        {/* Cross-connections panel */}
        <AnimatePresence>
          {showCrossConnectionsFor && selectedContactForCross && (
            <div className="mb-4">
              <CrossConnectionsPanel
                contactId={showCrossConnectionsFor}
                contactName={selectedContactForCross.name}
                crossConnections={crossConnections}
                contacts={contacts}
                onConnectionClick={(connection) => {
                  setSelectedConnection(connection);
                  setEditDialogOpen(true);
                }}
                onClose={() => setShowCrossConnectionsFor(null)}
              />
            </div>
          )}
        </AnimatePresence>

        {/* Tree structure */}
        <div className="flex flex-col items-center gap-8 py-4 min-w-fit">
          {trees.map((tree, idx) => (
            <div key={tree.contact.id} className="w-full">
              {idx > 0 && (
                <div className="border-t-2 border-dashed border-border my-6" />
              )}
              <div className="flex justify-center">
                <TreeBranch
                  node={tree}
                  isRoot
                  onContactClick={(contact) => onContactClick?.(contact)}
                  onConnectionClick={(connection) => {
                    setSelectedConnection(connection);
                    setEditDialogOpen(true);
                  }}
                  crossConnectionCounts={crossConnectionCounts}
                  onShowCrossConnections={(id) => setShowCrossConnectionsFor(id)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <EditConnectionDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        connection={selectedConnection}
        contacts={contacts}
        onUpdate={(id, type, description) => {
          onUpdateConnection?.(id, type, description);
          setSelectedConnection(null);
        }}
        onDelete={(id) => {
          onDeleteConnection?.(id);
          setSelectedConnection(null);
        }}
      />
    </>
  );
}
