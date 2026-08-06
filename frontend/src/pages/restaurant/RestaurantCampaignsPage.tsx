import React, { useState } from 'react';
import { Check, Plus, Search, Sparkles, Trash2, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useGetMyMenuItemsQuery } from '../../store/api/foodApi';
import { useCancelCampaignMutation, useCreateCampaignMutation, useGetCampaignCustomersQuery, useGetCampaignsQuery } from '../../store/api/campaignApi';
import CampaignDateTimePicker, { localDateTimeDefaults } from '../../components/campaigns/CampaignDateTimePicker';

const newForm = () => ({
  name: '', promotionLabel: 'FLASH SALE', description: '', discountType: 'percentage', discountValue: 20,
  ...localDateTimeDefaults(), foodItems: [] as string[], targetType: 'everyone', selectedCustomers: [] as string[],
  eligibility: { newCustomers: false, returningCustomers: false, vipCustomers: false, fivePlusOrders: false, inactiveThirtyDays: false, minimumSpending: 0 }
});

const RestaurantCampaignsPage: React.FC = () => {
  const [show, setShow] = useState(false); const [form, setForm] = useState(newForm); const [search, setSearch] = useState('');
  const { data, isLoading } = useGetCampaignsQuery(undefined, { pollingInterval: 30000 });
  const { data: foods } = useGetMyMenuItemsQuery();
  const { data: customers } = useGetCampaignCustomersQuery(search, { skip: form.targetType !== 'selected' });
  const [create, { isLoading: saving }] = useCreateCampaignMutation(); const [cancel] = useCancelCampaignMutation();
  const campaigns = data?.data || [];
  const scheduleValid = Boolean(form.startAt && form.endAt && new Date(form.endAt) > new Date(form.startAt));
  const openCreator = () => { setForm(newForm()); setSearch(''); setShow(true); };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!scheduleValid) return toast.error('End date and time must be later than start date and time');
    try {
      await create({ ...form, startAt: new Date(form.startAt).toISOString(), endAt: new Date(form.endAt).toISOString() }).unwrap();
      toast.success('Campaign created and scheduled'); setShow(false); setForm(newForm());
    } catch (error: any) { toast.error(error?.data?.message || 'Could not create campaign'); }
  };
  const stats = {
    active: campaigns.filter(c => c.status === 'active').length, scheduled: campaigns.filter(c => c.status === 'scheduled').length,
    expired: campaigns.filter(c => c.status === 'expired').length, cancelled: campaigns.filter(c => c.status === 'cancelled').length
  };

  return <div className="space-y-6">
    <header className="flex flex-col sm:flex-row justify-between gap-4"><div><p className="text-primary-400 font-medium">Growth engine</p><h1 className="text-3xl font-bold">Campaign Management</h1><p className="text-white/50 mt-2">Create targeted, scheduled offers backed by real purchase data.</p></div><button onClick={openCreator} className="btn btn-primary"><Plus className="w-5 h-5 mr-2" />New Campaign</button></header>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{Object.entries(stats).map(([key, value]) => <div key={key} className="card p-5"><b className="text-3xl">{value}</b><p className="capitalize text-sm text-white/45">{key} campaigns</p></div>)}</div>
    {isLoading ? <div className="h-72 card animate-pulse" /> : <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
      {campaigns.map(campaign => <article key={campaign._id} className="card p-5 card-hover"><div className="flex justify-between"><span className={`badge ${campaign.status === 'active' ? 'badge-success' : campaign.status === 'scheduled' ? 'badge-warning' : campaign.status === 'cancelled' ? 'badge-error' : 'bg-white/10 text-white/50'}`}>{campaign.status}</span><b className="text-primary-400">{campaign.discountValue}{campaign.discountType === 'percentage' ? '%' : '৳'} OFF</b></div><h2 className="text-xl font-bold mt-4">{campaign.name}</h2><p className="text-sm text-white/45 mt-1">{campaign.promotionLabel}</p><div className="grid grid-cols-2 gap-2 mt-4 text-xs"><span className="bg-white/5 p-2 rounded">Starts<br/><b>{new Date(campaign.startAt).toLocaleString()}</b></span><span className="bg-white/5 p-2 rounded">Ends<br/><b>{new Date(campaign.endAt).toLocaleString()}</b></span><span className="bg-white/5 p-2 rounded">Audience<br/><b>{campaign.eligibleCount}</b></span><span className="bg-white/5 p-2 rounded">Remaining<br/><b>{campaign.status === 'active' ? `${Math.ceil(campaign.remainingMs / 3600000)} hours` : '—'}</b></span></div><div className="grid grid-cols-4 gap-1 mt-4 text-center text-xs">{[['Views', campaign.metrics.views], ['Clicks', campaign.metrics.clicks], ['Used', campaign.metrics.redemptions], ['Revenue', `৳${Math.round(campaign.metrics.revenueGenerated)}`]].map(([label, value]) => <span className="bg-primary-500/5 rounded p-2" key={String(label)}><b className="block">{value}</b>{label}</span>)}</div><p className="text-xs text-white/40 mt-3">Conversion: {campaign.conversionRate.toFixed(1)}%</p>{!['expired', 'cancelled'].includes(campaign.status) && <button onClick={() => window.confirm('Cancel this campaign?') && cancel(campaign._id)} className="mt-4 text-xs text-red-400 flex gap-1"><Trash2 className="w-4 h-4" />Cancel campaign</button>}</article>)}
      {!campaigns.length && <div className="card p-14 text-center md:col-span-2 xl:col-span-3"><Sparkles className="w-14 h-14 mx-auto text-white/15" /><h2 className="text-xl font-bold mt-4">No campaigns yet</h2></div>}
    </div>}

    {show && <div className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-sm overflow-y-auto p-4"><form onSubmit={submit} className="card max-w-4xl mx-auto p-6 my-6 space-y-6"><div className="flex justify-between"><div><h2 className="text-2xl font-bold">Create Campaign</h2><p className="text-sm text-white/45">Schedule and target a premium promotion</p></div><button type="button" onClick={() => setShow(false)}><X /></button></div>
      <div className="grid md:grid-cols-2 gap-4"><label>Campaign Name<input className="input mt-2" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} required /></label><label>Promotion Label<input className="input mt-2" value={form.promotionLabel} onChange={event => setForm({ ...form, promotionLabel: event.target.value })} required /></label><label className="md:col-span-2">Description<textarea className="input min-h-24 mt-2" value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} required /></label><label>Discount Type<select className="input mt-2" value={form.discountType} onChange={event => setForm({ ...form, discountType: event.target.value })}><option value="percentage">Percentage</option><option value="fixed">Fixed Amount</option></select></label><label>Discount Value<input type="number" min="1" max={form.discountType === 'percentage' ? 100 : undefined} className="input mt-2" value={form.discountValue} onChange={event => setForm({ ...form, discountValue: Number(event.target.value) })} /></label>
        <CampaignDateTimePicker startAt={form.startAt} endAt={form.endAt} onChange={values => setForm({ ...form, ...values })} />
      </div>
      <div><h3 className="font-bold mb-3">Discounted Foods</h3><div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-52 overflow-y-auto">{foods?.data?.foodItems.map(food => <label key={food._id} className={`p-3 rounded-xl border flex gap-3 ${form.foodItems.includes(food._id) ? 'border-primary-500 bg-primary-500/10' : 'border-white/10'}`}><input type="checkbox" checked={form.foodItems.includes(food._id)} onChange={() => setForm({ ...form, foodItems: form.foodItems.includes(food._id) ? form.foodItems.filter(id => id !== food._id) : [...form.foodItems, food._id] })} /><img src={food.image} className="w-10 h-10 rounded object-cover" alt=""/><span>{food.name}</span></label>)}</div></div>
      <div><h3 className="font-bold mb-3">Target Audience</h3><div className="flex flex-wrap gap-2">{[['everyone', 'Everyone'], ['selected', 'Selected Customers'], ['eligibility', 'Eligibility Rules']].map(([value, label]) => <button type="button" key={value} onClick={() => setForm({ ...form, targetType: value })} className={`px-4 py-2 rounded-xl ${form.targetType === value ? 'bg-primary-500' : 'bg-white/5'}`}>{label}</button>)}</div></div>
      {form.targetType === 'selected' && <div><div className="relative"><Search className="absolute left-3 top-3.5 w-4 h-4" /><input className="input pl-9" placeholder="Search name, email or phone" value={search} onChange={event => setSearch(event.target.value)} /></div><div className="flex gap-3 my-3 text-xs"><button type="button" onClick={() => setForm({ ...form, selectedCustomers: (customers?.data || []).map(c => c._id) })}>Select All</button><button type="button" onClick={() => setForm({ ...form, selectedCustomers: [] })}>Remove Selection</button></div><div className="max-h-64 overflow-y-auto space-y-2">{customers?.data?.map(customer => <label key={customer._id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl"><input type="checkbox" checked={form.selectedCustomers.includes(customer._id)} onChange={() => setForm({ ...form, selectedCustomers: form.selectedCustomers.includes(customer._id) ? form.selectedCustomers.filter(id => id !== customer._id) : [...form.selectedCustomers, customer._id] })} />{customer.avatar ? <img src={customer.avatar} className="w-10 h-10 rounded-full" alt=""/> : <span className="w-10 h-10 rounded-full bg-primary-500/20 grid place-items-center">{customer.name[0]}</span>}<span className="flex-1"><b>{customer.name}</b><small className="block text-white/40">{customer.email} · {customer.phone || 'No phone'}</small></span><small>{customer.totalOrders} orders<br/>{new Date(customer.lastOrderDate).toLocaleDateString()}</small></label>)}</div></div>}
      {form.targetType === 'eligibility' && <div className="grid sm:grid-cols-2 gap-2">{[['newCustomers', 'New Customers'], ['returningCustomers', 'Returning Customers'], ['vipCustomers', 'VIP Customers'], ['fivePlusOrders', 'Customers with 5+ Orders'], ['inactiveThirtyDays', 'Inactive for 30 Days']].map(([key, label]) => <label key={key} className="p-3 bg-white/5 rounded-xl"><input type="checkbox" className="mr-2" checked={(form.eligibility as any)[key]} onChange={event => setForm({ ...form, eligibility: { ...form.eligibility, [key]: event.target.checked } })} />{label}</label>)}<label>Minimum Total Spending<input type="number" className="input mt-2" value={form.eligibility.minimumSpending} onChange={event => setForm({ ...form, eligibility: { ...form.eligibility, minimumSpending: Number(event.target.value) } })} /></label></div>}
      <button disabled={saving || !scheduleValid} className="btn btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed"><Check className="w-5 h-5 mr-2" />{saving ? 'Creating…' : 'Create Campaign'}</button>
    </form></div>}
  </div>;
};
export default RestaurantCampaignsPage;
