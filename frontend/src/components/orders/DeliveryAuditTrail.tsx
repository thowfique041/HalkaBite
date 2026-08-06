import React from 'react';
import type { Order } from '../../types';

const DeliveryAuditTrail: React.FC<{ order: Order; compact?: boolean }> = ({ order, compact = false }) => {
  const events = order.deliveryAuditTrail || [];
  if (!events.length) return null;

  return (
    <details className={`${compact ? 'mt-2' : 'mt-3'} text-sm`}>
      <summary className="cursor-pointer text-primary-400 hover:text-primary-300">
        Delivery audit trail ({events.length})
      </summary>
      <ol className="mt-3 space-y-2 border-l border-white/10 pl-4">
        {events.map((event, index) => (
          <li key={`${event.at}-${index}`} className="relative">
            <span className="absolute -left-[1.18rem] top-1.5 w-2 h-2 rounded-full bg-primary-400" />
            <div className="capitalize font-medium">{event.status.replaceAll('_', ' ')}</div>
            <div className="text-xs text-white/50">
              {event.deliveryManName} · ID <span className="font-mono">{event.deliveryManId}</span>
            </div>
            <time className="text-xs text-white/40">{new Date(event.at).toLocaleString()}</time>
          </li>
        ))}
      </ol>
    </details>
  );
};

export default DeliveryAuditTrail;
