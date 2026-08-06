import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell, Bike, CheckCircle2, DollarSign, MapPin, Navigation, Package,
  Phone, Star, User, Wallet, XCircle, Camera, Loader
} from 'lucide-react';
import toast from 'react-hot-toast';
import DeliveryLayout from '../../components/layout/DeliveryLayout';
import {
  useAcceptDeliveryOrderMutation,
  useGetAvailableDeliveryOrdersQuery,
  useGetDeliveryDashboardQuery,
  useRejectDeliveryOrderMutation,
  useToggleDeliveryOnlineMutation,
  useUpdateDeliveryProfileMutation,
  useUpdateDeliveryStatusMutation,
} from '../../store/api/deliveryApi';
import { useUploadImageMutation } from '../../store/api/uploadApi';
import { useUpdateProfileMutation } from '../../store/api/authApi';
import { useAppSelector } from '../../store/hooks';
import type { Address, Restaurant, User as UserType } from '../../types';
import type { DeliveryProfile } from '../../store/api/deliveryApi';
import DeliveryAuditTrail from '../../components/orders/DeliveryAuditTrail';

type DeliveryProfileForm = {
  vehicleType: string;
  vehicleNumber: string;
  licenseNumber: string;
  nidNumber: string;
  payoutMethod: string;
  payoutAccount: string;
};

const emptyProfileForm: DeliveryProfileForm = {
  vehicleType: '',
  vehicleNumber: '',
  licenseNumber: '',
  nidNumber: '',
  payoutMethod: '',
  payoutAccount: '',
};

const profileToForm = (profile?: DeliveryProfile): DeliveryProfileForm => profile ? ({
  vehicleType: profile.vehicleType || '',
  vehicleNumber: profile.vehicleNumber || '',
  licenseNumber: profile.licenseNumber || '',
  nidNumber: profile.nidNumber || '',
  payoutMethod: profile.payoutMethod || '',
  payoutAccount: profile.payoutAccount || '',
}) : emptyProfileForm;

const addressText = (address?: Address) => address
  ? [address.street, address.city, address.state].filter(Boolean).join(', ')
  : 'Location unavailable';

const party = <T,>(value: T | string): T | undefined => typeof value === 'string' ? undefined : value;

const apiErrorMessage = (error: unknown, fallback: string) =>
  (error as { data?: { message?: string } })?.data?.message || fallback;

const DeliveryDashboardPage: React.FC = () => {
  const user = useAppSelector(state => state.auth.user);
  const { data, isLoading, isError, refetch } = useGetDeliveryDashboardQuery(undefined, {
    pollingInterval: 5000,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });
  const dashboard = data?.data;
  const isOnline = dashboard?.profile.isOnline || false;
  const { data: availableData } = useGetAvailableDeliveryOrdersQuery(undefined, {
    pollingInterval: 5000,
    skip: !isOnline,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });
  // Defensive rendering guard. The backend performs the authoritative check
  // and blocks acceptance; this prevents stale cached orphan records flashing.
  const availableOrders = (availableData?.data || []).filter(order => {
    const customer = party<UserType>(order.user);
    const restaurant = party<Restaurant>(order.restaurant);
    return Boolean(customer && restaurant && restaurant.isActive !== false && restaurant.isOpen !== false && !order.deliveryInvalidatedAt);
  });
  const previousAvailableCount = useRef(0);
  const [toggleOnline, { isLoading: toggling }] = useToggleDeliveryOnlineMutation();
  const [acceptOrder, { isLoading: accepting }] = useAcceptDeliveryOrderMutation();
  const [rejectOrder] = useRejectDeliveryOrderMutation();
  const [updateStatus, { isLoading: updatingStatus }] = useUpdateDeliveryStatusMutation();
  const [updateProfile, { isLoading: savingProfile }] = useUpdateDeliveryProfileMutation();
  const [uploadImage, { isLoading: uploadingAvatar }] = useUploadImageMutation();
  const [updateUserProfile] = useUpdateProfileMutation();
  // A null draft means "display the latest saved server values". Once editing
  // starts, the draft is isolated from the dashboard's polling refreshes.
  const [profileDraft, setProfileDraft] = useState<DeliveryProfileForm | null>(null);
  const profileForm = profileDraft ?? profileToForm(dashboard?.profile);
  const isProfileDirty = profileDraft !== null;

  useEffect(() => {
    if (isOnline && availableOrders.length > previousAvailableCount.current) {
      const newCount = availableOrders.length - previousAvailableCount.current;
      toast.success(`${newCount} new delivery request${newCount === 1 ? '' : 's'} available`, {
        icon: '🔔',
        duration: 5000,
      });
    }
    previousAvailableCount.current = availableOrders.length;
  }, [availableOrders.length, isOnline]);

  const activeOrder = dashboard?.activeOrder;
  const activeRestaurant = activeOrder ? party<Restaurant>(activeOrder.restaurant) : undefined;
  const activeCustomer = activeOrder ? party<UserType>(activeOrder.user) : undefined;
  const nextStatus = useMemo(() => {
    const map: Record<string, { value: string; label: string }> = {
      accepted: { value: 'going_to_restaurant', label: 'Going to Restaurant' },
      going_to_restaurant: { value: 'picked_up', label: 'Confirm Pickup' },
      picked_up: { value: 'on_the_way', label: 'Start Delivery' },
      on_the_way: { value: 'delivered', label: 'Mark Delivered' },
    };
    return map[activeOrder?.deliveryStatus || 'accepted'];
  }, [activeOrder?.deliveryStatus]);

  const handleToggle = async () => {
    try { await toggleOnline(!isOnline).unwrap(); toast.success(`You are now ${!isOnline ? 'online' : 'offline'}`); }
    catch (error: unknown) { toast.error(apiErrorMessage(error, 'Could not change status')); }
  };

  const handleAccept = async (id: string) => {
    try { await acceptOrder(id).unwrap(); toast.success('Delivery accepted'); }
    catch (error: unknown) { toast.error(apiErrorMessage(error, 'Could not accept order')); }
  };

  const handleReject = async (id: string) => {
    try { await rejectOrder(id).unwrap(); toast.success('Order removed from your list'); }
    catch (error: unknown) { toast.error(apiErrorMessage(error, 'Could not reject order')); }
  };

  const handleStatus = async () => {
    if (!activeOrder || !nextStatus) return;
    try { await updateStatus({ id: activeOrder._id, status: nextStatus.value }).unwrap(); toast.success(`Status: ${nextStatus.label}`); }
    catch (error: unknown) { toast.error(apiErrorMessage(error, 'Could not update status')); }
  };

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await updateProfile({
        ...profileForm,
        payoutMethod: profileForm.payoutMethod
          ? profileForm.payoutMethod as DeliveryProfile['payoutMethod']
          : undefined,
      }).unwrap();
      await refetch();
      setProfileDraft(null);
      toast.success('Delivery profile saved');
    }
    catch (error: unknown) { toast.error(apiErrorMessage(error, 'Could not save profile')); }
  };

  const handleProfileFieldChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setProfileDraft(previous => ({
      ...(previous ?? profileToForm(dashboard?.profile)),
      [name]: value,
    }));
  };

  const resetProfileForm = () => {
    setProfileDraft(null);
  };

  const updateLocation = () => {
    if (!navigator.geolocation) return toast.error('Location is not supported by this browser');
    navigator.geolocation.getCurrentPosition(async position => {
      try {
        await updateProfile({ currentLocation: { lat: position.coords.latitude, lng: position.coords.longitude, updatedAt: new Date().toISOString() } }).unwrap();
        toast.success('Current location updated');
      } catch { toast.error('Could not save location'); }
    }, () => toast.error('Location permission was denied'));
  };

  const updateAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData(); formData.append('image', file);
    try {
      const uploaded = await uploadImage(formData).unwrap();
      await updateUserProfile({ avatar: uploaded.filePath }).unwrap();
      toast.success('Profile picture updated');
    } catch (error: unknown) { toast.error(apiErrorMessage(error, 'Could not update picture')); }
  };

  if (isLoading) return <DeliveryLayout><div className="py-20 text-center">Loading delivery dashboard...</div></DeliveryLayout>;
  if (isError) return <DeliveryLayout><div className="card p-10 text-center"><p className="mb-4 text-red-400">Could not load dashboard.</p><button onClick={() => refetch()} className="btn btn-primary">Try Again</button></div></DeliveryLayout>;

  const cards = [
    ['Today’s Orders', dashboard?.todayOrders || 0, Package, 'text-blue-400 bg-blue-500/10'],
    ['Today’s Earnings', `৳${(dashboard?.earnings.today || 0).toLocaleString()}`, DollarSign, 'text-green-400 bg-green-500/10'],
    ['Rating', (dashboard?.profile.rating || 0).toFixed(1), Star, 'text-yellow-400 bg-yellow-500/10'],
    ['Active Delivery', activeOrder ? '1' : '0', Bike, 'text-purple-400 bg-purple-500/10'],
  ] as const;

  return (
    <DeliveryLayout>
      <div className="space-y-8">
        <section id="overview" className="scroll-mt-6 space-y-6">
          <div className="card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div><h2 className="font-bold text-lg">Availability</h2><p className="text-sm text-white/50">Go online to receive delivery requests.</p></div>
            <button onClick={handleToggle} disabled={toggling} className={`flex items-center gap-3 px-5 py-3 rounded-xl font-semibold ${isOnline ? 'bg-green-500/15 text-green-400' : 'bg-white/10 text-white/60'}`}>
              <span className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-400 animate-pulse' : 'bg-white/30'}`} /> {isOnline ? 'Online' : 'Offline'}
            </button>
          </div>
          {isOnline && availableOrders.length > 0 && <div className="p-4 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center gap-3"><Bell className="text-primary-400" /><span><b>{availableOrders.length} new order{availableOrders.length === 1 ? '' : 's'}</b> available for delivery.</span></div>}
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">{cards.map(([label, value, Icon, color]) => <div key={label} className="card p-5"><div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${color}`}><Icon /></div><div className="text-2xl font-bold">{value}</div><div className="text-sm text-white/50">{label}</div></div>)}</div>
        </section>

        <section id="orders" className="scroll-mt-6 space-y-5">
          <h2 className="text-2xl font-bold">Orders</h2>
          {activeOrder && <div className="card p-6 border-primary-500/30">
            <div className="flex flex-wrap justify-between gap-4 mb-5"><div><p className="text-xs text-primary-400 font-semibold">ACTIVE DELIVERY</p><h3 className="text-xl font-bold">#{activeOrder.orderNumber}</h3>{activeOrder.deliveryManSnapshot && <p className="text-xs text-white/50 mt-1">Assigned to {activeOrder.deliveryManSnapshot.name} · ID <span className="font-mono">{activeOrder.deliveryManSnapshot.id}</span></p>}</div><span className="px-3 py-1 h-fit rounded-full bg-blue-500/10 text-blue-400 capitalize">{(activeOrder.deliveryStatus || 'accepted').replaceAll('_', ' ')}</span></div>
            <div className="grid md:grid-cols-2 gap-5 mb-5">
              <div className="bg-white/5 rounded-xl p-4"><h4 className="font-semibold mb-2">Restaurant Details</h4><p>{activeRestaurant?.name}</p><p className="text-sm text-white/50">{addressText(activeRestaurant?.address)}</p><a href={`tel:${activeRestaurant?.phone || ''}`} className="text-primary-400 text-sm inline-flex gap-1 mt-2"><Phone className="w-4 h-4" /> Call Restaurant</a></div>
              <div className="bg-white/5 rounded-xl p-4"><h4 className="font-semibold mb-2">Customer Details</h4><p>{activeCustomer?.name}</p><p className="text-sm text-white/50">{addressText(activeOrder.deliveryAddress)}</p><div className="flex gap-4 mt-2"><a href={`tel:${activeCustomer?.phone || ''}`} className="text-primary-400 text-sm inline-flex gap-1"><Phone className="w-4 h-4" /> Call</a><a href={`sms:${activeCustomer?.phone || ''}`} className="text-primary-400 text-sm">Chat</a></div></div>
            </div>
            <div className="flex flex-wrap gap-3"><a target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addressText(activeOrder.deliveryAddress))}`} className="btn btn-outline"><Navigation className="w-4 h-4 mr-2" /> Open Google Map</a>{nextStatus && <button onClick={handleStatus} disabled={updatingStatus} className="btn btn-primary"><CheckCircle2 className="w-4 h-4 mr-2" /> {nextStatus.label}</button>}</div>
            <DeliveryAuditTrail order={activeOrder} />
          </div>}

          <div><h3 className="font-bold text-lg mb-3">Available Orders</h3>{!isOnline ? <div className="card p-8 text-center text-white/50">Go online to view available orders.</div> : availableOrders.length === 0 ? <div className="card p-8 text-center text-white/50">No available orders right now.</div> : <div className="grid xl:grid-cols-2 gap-4">{availableOrders.map(order => { const restaurant = party<Restaurant>(order.restaurant); const customer = party<UserType>(order.user); return <div key={order._id} className="card p-5"><div className="flex justify-between mb-4"><b>#{order.orderNumber}</b><span className="text-green-400 font-bold">৳50 est.</span></div><div className="space-y-2 text-sm"><p><b>Restaurant:</b> {restaurant?.name}</p><p><b>Customer:</b> {customer?.name}</p><p className="text-white/50"><MapPin className="inline w-4 h-4 mr-1" />Pickup: {addressText(restaurant?.address)}</p><p className="text-white/50"><Navigation className="inline w-4 h-4 mr-1" />Delivery: {addressText(order.deliveryAddress)}</p></div><div className="flex gap-3 mt-5"><button onClick={() => handleAccept(order._id)} disabled={accepting || !!activeOrder} className="btn btn-primary flex-1 justify-center">Accept</button><button onClick={() => handleReject(order._id)} className="btn btn-outline flex-1 justify-center"><XCircle className="w-4 h-4 mr-1" /> Reject</button></div></div>; })}</div>}</div>
        </section>

        <section id="navigation" className="scroll-mt-6"><h2 className="text-2xl font-bold mb-4">Navigation</h2><div className="card p-6 bg-gradient-to-br from-blue-500/10 to-transparent"><MapPin className="w-10 h-10 text-blue-400 mb-3" /><h3 className="font-bold text-lg">Live Navigation</h3><p className="text-white/50 mb-4">Update your current location and open the best available route with live ETA and traffic in Google Maps.</p><div className="flex gap-3"><button onClick={updateLocation} className="btn btn-outline">Update Current Location</button>{activeOrder && <a target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addressText(activeOrder.deliveryAddress))}&travelmode=driving`} className="btn btn-primary">Best Route & ETA</a>}</div></div></section>

        <section id="earnings" className="scroll-mt-6"><h2 className="text-2xl font-bold mb-4">Earnings</h2><div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">{[['Today', dashboard?.earnings.today], ['This Week', dashboard?.earnings.weekly], ['This Month', dashboard?.earnings.monthly], ['Bonus', dashboard?.earnings.bonus], ['Incentives', dashboard?.earnings.incentives]].map(([label, amount]) => <div key={String(label)} className="card p-5"><Wallet className="text-green-400 mb-3" /><p className="text-xl font-bold">৳{Number(amount || 0).toLocaleString()}</p><p className="text-sm text-white/50">{label}</p></div>)}</div><div className="card p-5 mt-4"><h3 className="font-bold">Withdrawal History</h3><p className="text-sm text-white/50 mt-2">No withdrawals recorded yet.</p></div></section>

        <section id="history" className="scroll-mt-6"><h2 className="text-2xl font-bold mb-4">Delivery History</h2><div className="card overflow-x-auto"><table className="w-full text-left min-w-[700px]"><thead className="bg-white/5 text-white/50 text-sm"><tr><th className="p-4">Order</th><th>Restaurant</th><th>Status</th><th>Delivery Time</th><th>Earned</th></tr></thead><tbody className="divide-y divide-white/5">{dashboard?.history.map(order => <tr key={order._id}><td className="p-4 font-medium">#{order.orderNumber}</td><td>{party<Restaurant>(order.restaurant)?.name || '—'}</td><td className="capitalize">{order.orderStatus}</td><td>{order.updatedAt ? new Date(order.updatedAt).toLocaleString() : '—'}</td><td className="text-green-400">৳{order.deliveryEarning || order.deliveryFee}</td></tr>)}</tbody></table>{!dashboard?.history.length && <p className="p-8 text-center text-white/50">No delivery history yet.</p>}</div></section>

        <section id="ratings" className="scroll-mt-6"><h2 className="text-2xl font-bold mb-4">Ratings & Reviews</h2><div className="grid md:grid-cols-3 gap-4"><div className="card p-6 text-center"><Star className="w-10 h-10 fill-yellow-400 text-yellow-400 mx-auto mb-2" /><p className="text-3xl font-bold">{dashboard?.profile.rating.toFixed(1)}</p><p className="text-white/50">Overall Rating · {dashboard?.profile.reviewCount} reviews</p></div><div className="card p-6"><h3 className="font-bold">Compliments</h3><p className="text-white/50 mt-2">No compliments yet.</p></div><div className="card p-6"><h3 className="font-bold">Complaints</h3><p className="text-white/50 mt-2">No complaints reported.</p></div></div></section>

        <section id="profile" className="scroll-mt-6"><h2 className="text-2xl font-bold mb-4">Profile</h2><div className="card p-6"><div className="flex items-center gap-4 mb-6"><div className="relative"><div className="w-20 h-20 rounded-full bg-primary-500/20 overflow-hidden flex items-center justify-center">{user?.avatar ? <img src={user.avatar} className="w-full h-full object-cover" alt="Profile" /> : <User className="w-8 h-8" />}</div><label className="absolute -bottom-1 -right-1 p-2 rounded-full bg-primary-500 cursor-pointer">{uploadingAvatar ? <Loader className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}<input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={updateAvatar} /></label></div><div><h3 className="font-bold text-lg">{user?.name}</h3><p className="text-white/50">{user?.phone || 'No phone added'}</p></div></div><form onSubmit={saveProfile} className="grid md:grid-cols-2 gap-4">{[['vehicleType', 'Vehicle Type'], ['vehicleNumber', 'Vehicle Number'], ['licenseNumber', 'License Number'], ['nidNumber', 'NID Number'], ['payoutAccount', 'Bank / Mobile Banking Account']].map(([name, label]) => <label key={name} className="text-sm text-white/60">{label}<input name={name} value={profileForm[name as keyof DeliveryProfileForm]} onChange={handleProfileFieldChange} className="input w-full mt-1" /></label>)}<label className="text-sm text-white/60">Payout Method<select name="payoutMethod" value={profileForm.payoutMethod} onChange={handleProfileFieldChange} className="input w-full mt-1"><option value="">Select</option><option value="bkash">bKash</option><option value="nagad">Nagad</option><option value="bank">Bank</option></select></label><div className="md:col-span-2 flex flex-wrap gap-3"><button disabled={savingProfile || !isProfileDirty} className="btn btn-primary">{savingProfile ? 'Saving...' : 'Save Profile'}</button><button type="button" onClick={resetProfileForm} disabled={!isProfileDirty || savingProfile} className="btn btn-ghost">Reset</button><a href="/profile" className="btn btn-outline">Change Name, Phone or Password</a></div></form></div></section>
      </div>
    </DeliveryLayout>
  );
};

export default DeliveryDashboardPage;
