import React, { useState } from 'react';
import { BellRing, CheckCircle2, CreditCard, ReceiptText, X, XCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useGetRestaurantPaymentsQuery, useRejectPaymentMutation, useVerifyPaymentMutation } from '../../store/api/paymentApi';
import type { Order, OrderItem, Restaurant, User } from '../../types';

const money = (value: number) => `৳${value.toFixed(2)}`;
const itemPricing = (item: OrderItem) => {
  const unitPrice = item.foodPrice ?? (item.quantity > 0 ? item.price / item.quantity : item.price);
  const subtotal = item.foodPrice !== undefined ? item.foodPrice * item.quantity : item.price;
  return { unitPrice, subtotal };
};

const PaymentVerificationPage: React.FC = () => {
  const [status, setStatus] = useState('submitted');
  const [rejection, setRejection] = useState<{ paymentId: string; reason: string } | null>(null);
  const { data, isLoading, isError } = useGetRestaurantPaymentsQuery({ status, limit: 50 });
  const [verify, { isLoading: verifying }] = useVerifyPaymentMutation();
  const [reject, { isLoading: rejecting }] = useRejectPaymentMutation();
  const payments = data?.data?.payments || [];

  const verifyPayment = async (id: string) => {
    if (!window.confirm('Verify this payment and confirm the order? Check the transaction in your merchant account first.')) return;
    try { await verify(id).unwrap(); toast.success('Payment verified and order confirmed'); }
    catch (error: unknown) { const response = error as { data?: { message?: string } }; toast.error(response.data?.message || 'Verification failed'); }
  };
  const rejectPayment = async () => {
    if (!rejection) return;
    const reason = rejection.reason.trim();
    if (!reason) return toast.error('Enter a reason for rejecting this payment');
    try {
      await reject({ id: rejection.paymentId, reason }).unwrap();
      setRejection(null);
      toast.success('Payment rejected');
    }
    catch (error: unknown) { const response = error as { data?: { message?: string } }; toast.error(response.data?.message || 'Rejection failed'); }
  };

  return <div className="space-y-6">
    <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div><p className="text-primary-400 font-medium">Manual verification</p><h1 className="text-3xl font-bold">Payment Verification</h1><p className="text-white/50 mt-2">Review the complete order and confirm the transaction in your merchant account.</p></div>
      <select value={status} onChange={event => setStatus(event.target.value)} className="input sm:w-48"><option value="submitted">Submitted</option><option value="verified">Verified</option><option value="rejected">Rejected</option><option value="all">All</option></select>
    </header>
    {isLoading && <div className="card p-12 text-center animate-pulse">Loading payment submissions…</div>}
    {isError && <div className="card p-10 text-center text-red-300">Could not load payment submissions.</div>}
    {!isLoading && !payments.length && <div className="card p-14 text-center"><CreditCard className="w-14 h-14 mx-auto text-white/20"/><h2 className="text-xl font-bold mt-4">No {status === 'all' ? '' : status} payments</h2></div>}
    <div className="grid gap-6">{payments.map(payment => {
      const order = payment.orderId as Order;
      const customer = payment.customerId as User;
      const restaurant = payment.restaurantId as Restaurant;
      return <article key={payment._id} className="card overflow-hidden border-primary-500/15">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 border-b border-white/10 bg-gradient-to-r from-primary-500/10 to-transparent">
          <div className="flex items-center gap-3"><span className="w-11 h-11 rounded-2xl bg-primary-500/20 text-primary-400 grid place-items-center"><BellRing/></span><div><h2 className="font-bold text-lg">{payment.status === 'submitted' ? 'New Payment Verification' : 'Payment Verification'}</h2><p className="text-sm text-white/50">Submitted {new Date(payment.createdAt).toLocaleString()}</p></div></div>
          <span className={`px-3 py-1.5 rounded-full text-xs font-bold capitalize ${payment.status === 'verified' ? 'bg-green-500/15 text-green-400' : payment.status === 'rejected' ? 'bg-red-500/15 text-red-400' : 'bg-yellow-500/15 text-yellow-400'}`}>{payment.status}</span>
        </div>
        <div className="grid xl:grid-cols-[1.35fr_.65fr] gap-6 p-5">
          <section>
            <dl className="grid sm:grid-cols-2 gap-3 text-sm mb-5"><div><dt className="text-white/40">Order ID</dt><dd className="font-bold">#{order.orderNumber}</dd></div><div><dt className="text-white/40">Customer</dt><dd className="font-bold">{customer.name}</dd><small className="text-white/45">{customer.phone}</small></div><div><dt className="text-white/40">Restaurant</dt><dd className="font-bold">{restaurant.name}</dd></div><div><dt className="text-white/40">Submitted At</dt><dd>{new Date(payment.createdAt).toLocaleString()}</dd></div></dl>
            <div className="rounded-2xl border border-white/10 overflow-hidden"><div className="px-4 py-3 bg-white/5 flex items-center gap-2 font-bold"><ReceiptText className="w-4 text-primary-400"/>Ordered Food</div><div className="divide-y divide-white/5">{order.items.map((item, index) => { const pricing = itemPricing(item); return <div key={`${item.foodId || item.foodItem}-${index}`} className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_70px_110px_110px] gap-2 items-center px-4 py-3 text-sm"><span className="font-medium">{item.foodName || item.name}</span><span className="text-white/55">×{item.quantity}</span><span className="hidden sm:block text-right text-white/55">{money(pricing.unitPrice)} each</span><b className="text-right">{money(pricing.subtotal)}</b></div>})}</div><div className="p-4 bg-white/[0.035] space-y-2 text-sm"><div className="flex justify-between"><span className="text-white/50">Subtotal</span><span>{money(order.subtotal)}</span></div><div className="flex justify-between"><span className="text-white/50">Delivery Charge</span><span>{money(order.deliveryFee)}</span></div><div className="flex justify-between pt-2 border-t border-white/10 text-lg font-bold"><span>Total Amount</span><span className="text-primary-400">{money(order.totalAmount)}</span></div></div></div>
          </section>
          <aside className="rounded-2xl border border-primary-500/20 bg-primary-500/5 p-5 h-fit"><p className="text-xs uppercase tracking-wider text-primary-300">Payment Evidence</p><dl className="space-y-3 mt-4 text-sm"><div><dt className="text-white/40">Payment Method</dt><dd className="font-bold uppercase text-lg">{payment.method}</dd></div><div><dt className="text-white/40">Receiver Account</dt><dd className="font-mono font-bold">{payment.receiverNumber}</dd><small className="text-white/45">{payment.receiverAccountType} Account</small></div><div><dt className="text-white/40">Sender Number</dt><dd className="font-mono font-bold">{payment.senderNumber}</dd></div><div><dt className="text-white/40">Transaction ID</dt><dd className="font-mono font-bold break-all">{payment.transactionId}</dd></div><div className="grid grid-cols-2 gap-3 rounded-xl bg-white/5 p-3"><span><dt className="text-white/40">Expected Total</dt><dd className="font-bold">{money(order.totalAmount)}</dd></span><span><dt className="text-white/40">Customer Paid</dt><dd className={`font-black ${Math.abs(order.totalAmount-payment.amount)<0.01?'text-green-400':'text-red-400'}`}>{money(payment.amount)}</dd></span></div></dl>{payment.rejectionReason && <p className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-300">Reason: {payment.rejectionReason}</p>}{payment.status === 'submitted' && <div className="grid sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2 gap-2 mt-6"><button disabled={verifying || rejecting} onClick={() => setRejection({ paymentId: payment._id, reason: '' })} className="btn bg-red-600 hover:bg-red-700 justify-center"><XCircle className="w-4 mr-1"/>Reject</button><button disabled={verifying || rejecting} onClick={() => verifyPayment(payment._id)} className="btn bg-green-600 hover:bg-green-700 justify-center"><CheckCircle2 className="w-4 mr-1"/>Verify Payment</button></div>}</aside>
        </div>
      </article>;
    })}</div>
    {rejection && <div className="fixed inset-0 z-[90] grid place-items-center bg-black/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="reject-payment-title">
      <div className="card w-full max-w-md p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 id="reject-payment-title" className="text-xl font-bold">Reject Payment</h2>
          <button type="button" onClick={() => setRejection(null)} className="rounded-lg p-2 text-white/50 hover:bg-white/10 hover:text-white" aria-label="Close rejection dialog"><X className="w-5 h-5"/></button>
        </div>
        <label className="block mt-5"><span className="text-sm text-white/60">Reason</span><textarea autoFocus required maxLength={500} value={rejection.reason} onChange={event => setRejection({ ...rejection, reason: event.target.value })} className="input mt-2 min-h-28 resize-y" placeholder="Explain why this payment could not be verified"/></label>
        <div className="mt-2 flex justify-between text-xs text-white/40"><span>A reason is required.</span><span>{rejection.reason.length}/500</span></div>
        <div className="mt-6 flex gap-3"><button type="button" onClick={() => setRejection(null)} disabled={rejecting} className="btn btn-outline flex-1 justify-center">Cancel</button><button type="button" onClick={rejectPayment} disabled={rejecting || !rejection.reason.trim()} className="btn bg-red-600 hover:bg-red-700 flex-1 justify-center disabled:opacity-40">{rejecting ? 'Rejecting…' : 'Reject Payment'}</button></div>
      </div>
    </div>}
  </div>;
};

export default PaymentVerificationPage;
