import React from 'react';
import { Bell, CircleDollarSign, Megaphone, PackageCheck, Star, Truck, XCircle } from 'lucide-react';
import type { NotificationType } from '../../store/api/notificationApi';

const NotificationIcon: React.FC<{ type: NotificationType; className?: string }> = ({ type, className = 'w-5 h-5' }) => {
  const icons: Partial<Record<NotificationType, React.ElementType>> = {
    new_review: Star, rating_increased: Star, order_cancelled: XCircle,
    delivery_assigned: Truck, order_picked_up: Truck, order_delivered: PackageCheck,
    payment_received: CircleDollarSign, admin_announcement: Megaphone, milestone: Star
  };
  const Icon = icons[type] || Bell;
  return <Icon className={className} />;
};
export default NotificationIcon;
