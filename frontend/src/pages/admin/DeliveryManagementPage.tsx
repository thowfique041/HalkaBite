import React, { useState } from 'react';
import { Bike, CheckCircle2, Clock, DollarSign, Eye, Search, Star, Truck, UserCheck, Users, X } from 'lucide-react';
import {
  useGetDeliveryManagementQuery,
  useGetDeliveryManDetailsQuery,
  type DeliveryManAdminRecord,
} from '../../store/api/adminApi';

const statusStyle: Record<string, string> = {
  online: 'bg-green-500/10 text-green-400 border-green-500/20',
  offline: 'bg-white/5 text-white/40 border-white/10',
  busy: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
};

const DeliveryManModal: React.FC<{ id: string; onClose: () => void }> = ({ id, onClose }) => {
  const { data, isLoading } = useGetDeliveryManDetailsQuery(id, { pollingInterval: 5000 });
  const man = data?.data;
  return <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm p-4 flex items-center justify-center">
    <div className="bg-dark-200 border border-white/10 rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto">
      <div className="sticky top-0 bg-dark-200 border-b border-white/10 p-5 flex justify-between z-10"><h2 className="text-xl font-bold">Delivery Man Profile</h2><button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg"><X /></button></div>
      {isLoading || !man ? <div className="p-12 text-center">Loading profile...</div> : <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row gap-5"><div className="w-24 h-24 rounded-2xl bg-white/5 overflow-hidden flex items-center justify-center shrink-0">{man.avatar ? <img src={man.avatar} alt={man.name} className="w-full h-full object-cover" /> : <Users className="text-white/20" />}</div><div><h3 className="text-2xl font-bold">{man.name}</h3><p className="font-mono text-sm text-white/50">ID: {man._id}</p><p className="text-white/60">{man.phone || 'No phone'} · {man.email}</p><span className={`inline-block mt-2 px-3 py-1 rounded-full border text-xs capitalize ${statusStyle[man.status]}`}>{man.status}</span></div></div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">{[['Completed', man.completedDeliveries], ['Cancelled', man.cancelledDeliveries], ['Total Earnings', `৳${man.totalEarnings.toLocaleString()}`], ['Rating', man.rating.toFixed(1)]].map(([label, value]) => <div key={String(label)} className="bg-white/5 rounded-xl p-4"><div className="text-xl font-bold">{value}</div><div className="text-xs text-white/50">{label}</div></div>)}</div>
        <div className="grid sm:grid-cols-2 gap-3 text-sm"><div className="card p-4"><h4 className="font-bold mb-2">Vehicle & Documents</h4><p>Vehicle: {man.vehicleType || '—'} {man.vehicleNumber && `· ${man.vehicleNumber}`}</p><p>License: {man.profile?.licenseNumber || '—'}</p><p>NID: {man.profile?.nidNumber || '—'}</p></div><div className="card p-4"><h4 className="font-bold mb-2">Payment Information</h4><p className="capitalize">Method: {man.profile?.payoutMethod || '—'}</p><p>Account: {man.profile?.payoutAccount || '—'}</p><p>Last active: {man.lastActiveAt ? new Date(man.lastActiveAt).toLocaleString() : 'Never'}</p></div></div>
        <div><h4 className="font-bold text-lg mb-3">All Assigned Orders</h4><div className="overflow-x-auto border border-white/10 rounded-xl"><table className="w-full min-w-[650px] text-left"><thead className="bg-white/5 text-sm text-white/50"><tr><th className="p-3">Order</th><th>Restaurant</th><th>Status</th><th>Updated</th><th>Earned</th></tr></thead><tbody className="divide-y divide-white/5">{man.orders.map(order => <tr key={order._id}><td className="p-3 font-mono">{order.orderNumber}</td><td>{typeof order.restaurant === 'string' ? '—' : order.restaurant.name}</td><td className="capitalize">{(order.deliveryStatus || order.orderStatus).replaceAll('_', ' ')}</td><td>{new Date(order.updatedAt).toLocaleString()}</td><td className="text-green-400">৳{order.deliveryEarning || order.deliveryFee}</td></tr>)}</tbody></table>{!man.orders.length && <p className="p-6 text-center text-white/40">No assigned orders.</p>}</div></div>
      </div>}
    </div>
  </div>;
};

const DeliveryManagementPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('recent');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data, isLoading, isError, refetch } = useGetDeliveryManagementQuery({ search, status, sort }, {
    pollingInterval: 5000,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });
  const summary = data?.data?.summary;
  const deliveryMen = data?.data?.deliveryMen || [];
  const summaryCards = [
    ['Total Delivery Men', summary?.totalDeliveryMen || 0, Users, 'text-blue-400'],
    ['Active (Online)', summary?.activeDeliveryMen || 0, UserCheck, 'text-green-400'],
    ['Offline', summary?.offlineDeliveryMen || 0, Clock, 'text-white/40'],
    ['Busy', summary?.busyDeliveryMen || 0, Truck, 'text-orange-400'],
    ['Available', summary?.availableDeliveryMen || 0, CheckCircle2, 'text-emerald-400'],
  ] as const;

  if (isLoading) return <div className="py-12 text-center">Loading delivery management...</div>;
  if (isError) return <div className="card p-8 text-center"><p className="text-red-400 mb-4">Could not load delivery data.</p><button onClick={() => refetch()} className="btn btn-primary">Try Again</button></div>;

  return <div className="space-y-7">
    <div><h1 className="text-3xl font-bold">Delivery Management</h1><p className="text-white/50 mt-1">Monitor delivery partners, assignments, performance, and earnings.</p></div>
    <div className="grid sm:grid-cols-2 xl:grid-cols-5 gap-4">{summaryCards.map(([label, value, Icon, color]) => <div key={label} className="card p-5"><Icon className={`mb-3 ${color}`} /><div className="text-2xl font-bold">{value}</div><div className="text-sm text-white/50">{label}</div></div>)}</div>
    <div className="grid sm:grid-cols-3 gap-4"><div className="card p-5"><Bike className="text-primary-400 mb-2" /><div className="text-2xl font-bold">{summary?.totalDeliveries.toLocaleString()}</div><div className="text-sm text-white/50">Total Deliveries</div></div><div className="card p-5"><DollarSign className="text-green-400 mb-2" /><div className="text-2xl font-bold">৳{summary?.totalDeliveryEarnings.toLocaleString()}</div><div className="text-sm text-white/50">Total Delivery Earnings</div></div><div className="card p-5"><Star className="text-yellow-400 mb-2" /><div className="text-2xl font-bold">{summary?.averageDeliveriesPerDeliveryMan.toFixed(1)}</div><div className="text-sm text-white/50">Average Deliveries / Man</div></div></div>
    <div className="grid lg:grid-cols-2 gap-4"><div className="card p-5"><h2 className="font-bold mb-3">Top Performing Delivery Men</h2>{summary?.topPerformers.length ? summary.topPerformers.map((man, index) => <div key={man._id} className="flex justify-between py-2 border-b border-white/5 last:border-0"><span>#{index + 1} {man.name}</span><span className="text-primary-400">{man.completedDeliveries} deliveries</span></div>) : <p className="text-white/40">No performance data yet.</p>}</div><div className="card p-5"><h2 className="font-bold mb-3">Recently Active</h2>{summary?.recentlyActive.length ? summary.recentlyActive.map(man => <div key={man._id} className="flex justify-between py-2 border-b border-white/5 last:border-0"><span>{man.name}</span><span className="text-xs text-white/40">{man.lastActiveAt ? new Date(man.lastActiveAt).toLocaleString() : 'Never'}</span></div>) : <p className="text-white/40">No activity yet.</p>}</div></div>
    <div className="card p-4 flex flex-col lg:flex-row gap-3"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search name, email, or unique ID..." className="input pl-10 w-full" /></div><select value={status} onChange={event => setStatus(event.target.value)} className="input lg:w-44"><option value="all">All Statuses</option><option value="online">Online</option><option value="offline">Offline</option><option value="busy">Busy</option></select><select value={sort} onChange={event => setSort(event.target.value)} className="input lg:w-56"><option value="recent">Recently Active</option><option value="completed">Completed Deliveries</option><option value="earnings">Total Earnings</option><option value="rating">Average Rating</option></select></div>
    <div className="card overflow-x-auto"><table className="w-full min-w-[1600px] text-left text-sm"><thead className="bg-white/5 text-white/50"><tr>{['Delivery Man', 'Unique ID', 'Phone', 'Vehicle', 'Status', 'Assigned', 'Completed', 'Cancelled', 'Total Earnings', 'Today', 'Weekly', 'Monthly', 'Rating', 'Last Active', 'Action'].map(title => <th key={title} className="p-4">{title}</th>)}</tr></thead><tbody className="divide-y divide-white/5">{deliveryMen.map((man: DeliveryManAdminRecord) => <tr key={man._id} className="hover:bg-white/[.03]"><td className="p-4"><div className="flex items-center gap-3">{man.avatar ? <img src={man.avatar} alt="" className="w-10 h-10 rounded-full object-cover" /> : <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center">{man.name[0]}</div>}<div><div className="font-medium">{man.name}</div><div className="text-xs text-white/40">{man.email}</div></div></div></td><td className="p-4 font-mono text-xs">{man._id}</td><td className="p-4">{man.phone || '—'}</td><td className="p-4">{man.vehicleType || '—'}<div className="text-xs text-white/40">{man.vehicleNumber}</div></td><td className="p-4"><span className={`px-3 py-1 rounded-full border capitalize ${statusStyle[man.status]}`}>{man.status}</span></td><td className="p-4">{man.assignedOrders}</td><td className="p-4">{man.completedDeliveries}</td><td className="p-4">{man.cancelledDeliveries}</td><td className="p-4 font-semibold text-green-400">৳{man.totalEarnings.toLocaleString()}</td><td className="p-4">৳{man.todayEarnings.toLocaleString()}</td><td className="p-4">৳{man.weeklyEarnings.toLocaleString()}</td><td className="p-4">৳{man.monthlyEarnings.toLocaleString()}</td><td className="p-4">⭐ {man.rating.toFixed(1)}</td><td className="p-4 text-xs text-white/50">{man.lastActiveAt ? new Date(man.lastActiveAt).toLocaleString() : 'Never'}</td><td className="p-4"><button onClick={() => setSelectedId(man._id)} className="p-2 hover:bg-white/10 rounded-lg" title="View profile"><Eye className="w-5 h-5" /></button></td></tr>)}</tbody></table>{!deliveryMen.length && <p className="p-8 text-center text-white/40">No delivery men match these filters.</p>}</div>
    {selectedId && <DeliveryManModal id={selectedId} onClose={() => setSelectedId(null)} />}
  </div>;
};

export default DeliveryManagementPage;
