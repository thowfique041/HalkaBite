import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { MapPin, CreditCard, Banknote, Check, ChevronRight, Copy, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';
import { useGetMeQuery } from '../store/api/authApi';
import { useCreateOrderMutation } from '../store/api/orderApi';
import { useGetCartQuery } from '../store/api/cartApi';
import { useGetAvailablePaymentMethodsQuery, useSubmitPaymentMutation } from '../store/api/paymentApi';
import type { PaymentMethod } from '../types';
import toast from 'react-hot-toast';

const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedAddress, setSelectedAddress] = useState('default');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [paymentForm, setPaymentForm] = useState({ senderNumber: '', transactionId: '', amount: '' });
  const [createdOrderId, setCreatedOrderId] = useState('');
  const [createdOrderNumber, setCreatedOrderNumber] = useState('');
  const [copiedMethod, setCopiedMethod] = useState<PaymentMethod | null>(null);

  const { items, subtotal, restaurant } = useAppSelector((state) => state.cart);
  const { isLoading: isCartLoading } = useGetCartQuery();
  const { data: userData } = useGetMeQuery();
  const [createOrder, { isLoading: isOrdering }] = useCreateOrderMutation();
  const submissionInFlight = useRef(false);
  const checkoutToken = useRef(window.crypto.randomUUID());
  const copyFeedbackTimer = useRef<number | undefined>(undefined);
  const restaurantIdRef = useRef('');
  if (restaurant?._id) restaurantIdRef.current = restaurant._id;
  const { data: paymentOptions, isLoading: methodsLoading } = useGetAvailablePaymentMethodsQuery(
    restaurantIdRef.current,
    {
      skip: !restaurantIdRef.current,
      refetchOnMountOrArgChange: true,
      refetchOnFocus: true,
      refetchOnReconnect: true,
    },
  );
  const [submitPayment, { isLoading: isSubmittingPayment }] = useSubmitPaymentMutation();

  const deliveryFee = restaurant?.deliveryFee || 60;
  const total = subtotal + deliveryFee;
  const checkoutItems = useRef(items);
  const checkoutSubtotal = useRef(subtotal);
  const checkoutDeliveryFee = useRef(deliveryFee);
  const checkoutTotal = useRef(total);
  if (items.length) {
    checkoutItems.current = items;
    checkoutSubtotal.current = subtotal;
    checkoutDeliveryFee.current = deliveryFee;
    checkoutTotal.current = total;
  }
  const displayedItems = items.length ? items : checkoutItems.current;
  const payableTotal = createdOrderId ? checkoutTotal.current : total;
  const configuredMethods = paymentOptions?.data?.paymentMethods;

  useEffect(() => {
    if (!configuredMethods) return;
    const enabled = (['cod', 'bkash', 'nagad', 'rocket'] as PaymentMethod[]).filter(method => configuredMethods[method].enabled);
    if (!enabled.includes(paymentMethod) && enabled[0]) setPaymentMethod(enabled[0]);
  }, [configuredMethods, paymentMethod]);

  useEffect(() => { if (!paymentForm.amount && payableTotal > 0) setPaymentForm(form => ({ ...form, amount: payableTotal.toFixed(2) })); }, [payableTotal, paymentForm.amount]);

  const copyReceiverNumber = async (number: string) => {
    try {
      await navigator.clipboard.writeText(number);
      setCopiedMethod(paymentMethod);
      toast.success('Payment number copied');
      window.clearTimeout(copyFeedbackTimer.current);
      copyFeedbackTimer.current = window.setTimeout(() => setCopiedMethod(null), 1600);
    } catch { toast.error('Could not copy the payment number'); }
  };
  useEffect(() => () => window.clearTimeout(copyFeedbackTimer.current), []);

  useEffect(() => {
    if (!isCartLoading && items.length === 0 && !submissionInFlight.current && !createdOrderId) {
      navigate('/');
      toast.error('Your cart is empty');
    }
  }, [items, isCartLoading, navigate, createdOrderId]);

  const handlePlaceOrder = async () => {
    if (submissionInFlight.current) return;
    if (!userData?.data?.address) {
      toast.error('Please add a delivery address to your profile');
      navigate('/profile');
      return;
    }

    const onlinePayment = paymentMethod !== 'cod';
    if (!configuredMethods?.[paymentMethod]?.enabled) return toast.error('This payment method is no longer available');
    if (onlinePayment) {
      if (!/^(?:\+8801|01)[3-9]\d{8}$/.test(paymentForm.senderNumber.trim())) return toast.error('Enter a valid Bangladeshi sender number');
      if (!/^[A-Za-z0-9-]{5,50}$/.test(paymentForm.transactionId.trim())) return toast.error('Enter a valid transaction ID');
      if (!Number.isFinite(Number(paymentForm.amount)) || Number(paymentForm.amount) <= 0) return toast.error('Enter a valid paid amount');
    }

    try {
      submissionInFlight.current = true;
      let orderId = createdOrderId;
      let orderNumber = createdOrderNumber;
      if (!orderId) {
        const orderData = {
        checkoutToken: checkoutToken.current,
        items: items.map(item => ({
          foodItem: item.foodItem._id,
          name: item.foodItem.name,
          quantity: item.quantity,
          price: item.foodItem.price,
          specialInstructions: item.specialInstructions
        })),
        restaurant: restaurant?._id,
        subtotal,
        deliveryFee,
        totalAmount: payableTotal,
        deliveryAddress: userData.data.address,
        paymentMethod,
        discount: 0
        };
        const orderResponse = await createOrder(orderData).unwrap();
        if (!orderResponse.data?._id) throw new Error('Order was created without an ID');
        orderId = orderResponse.data._id;
        orderNumber = orderResponse.data.orderNumber;
        setCreatedOrderId(orderId);
        setCreatedOrderNumber(orderNumber);
      }
      if (onlinePayment) {
        await submitPayment({ orderId, method: paymentMethod, senderNumber: paymentForm.senderNumber.trim(), transactionId: paymentForm.transactionId.trim(), amount: Number(paymentForm.amount) }).unwrap();
        toast.success('Payment information submitted for verification');
      } else toast.success('Order placed successfully!');
      navigate('/order-success', { state: { orderNumber: orderNumber || undefined, paymentMethod, awaitingVerification: onlinePayment } });
    } catch (error: unknown) {
      const response = error as { data?: { message?: string }; message?: string };
      toast.error(response.data?.message || response.message || 'Failed to place order');
    } finally {
      submissionInFlight.current = false;
    }
  };

  if (isCartLoading) {
    return <div className="min-h-screen pt-24 pb-12 px-4 text-center">Loading checkout...</div>;
  }

  if (items.length === 0 && !createdOrderId) return null;
  const onlineConfiguration = paymentMethod === 'cod' ? null : configuredMethods?.[paymentMethod];

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold mb-2">Checkout</h1>
          <p className="text-white/60">Complete your order</p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Forms */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Delivery Address */}
            <div className="card p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary-500" />
                Delivery Address
              </h2>
              <div className="space-y-3">
                {userData?.data?.address ? (
                  <label
                    className={`block p-4 rounded-xl border cursor-pointer transition-all ${selectedAddress === 'default'
                      ? 'bg-primary-500/10 border-primary-500'
                      : 'bg-dark-100 border-white/5 hover:border-white/20'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="address"
                        checked={selectedAddress === 'default'}
                        onChange={() => setSelectedAddress('default')}
                        className="text-primary-500 focus:ring-primary-500"
                      />
                      <div>
                        <div className="font-medium">My Address</div>
                        <div className="text-sm text-white/60">
                          {userData.data.address.street}, {userData.data.address.city}, {userData.data.address.zipCode}
                        </div>
                      </div>
                    </div>
                  </label>
                ) : (
                  <div className="text-center py-4 text-white/60">
                    No address found. Please update your profile.
                  </div>
                )}

                <button
                  onClick={() => navigate('/profile')}
                  className="btn btn-outline w-full mt-4"
                >
                  <MapPin className="w-4 h-4 mr-2" /> {userData?.data?.address ? 'Update Address' : 'Add Address'}
                </button>
              </div>
            </div>

            {/* Payment Method */}
            <div className="card p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary-500" />
                Payment Method
              </h2>
              {methodsLoading ? <div className="h-24 rounded-xl skeleton" /> : configuredMethods ? <>
                <div className="grid sm:grid-cols-2 gap-4">
                  {(['bkash','nagad','rocket','cod'] as PaymentMethod[]).filter(method => configuredMethods[method].enabled).map(method => <label key={method} className={`p-4 rounded-xl border cursor-pointer transition-all ${paymentMethod === method ? 'bg-primary-500/10 border-primary-500' : 'bg-dark-100 border-white/5 hover:border-white/20'}`}><div className="flex items-center gap-3"><input type="radio" name="payment" value={method} checked={paymentMethod === method} onChange={() => setPaymentMethod(method)} className="text-primary-500 focus:ring-primary-500"/>{method === 'cod' ? <Banknote className="w-5 h-5 text-green-400"/> : <CreditCard className="w-5 h-5 text-pink-500"/>}<span className="font-medium">{method === 'cod' ? 'Cash on Delivery' : method.toUpperCase()}</span></div></label>)}
                </div>
                {configuredMethods.cod.enabled && !(['bkash','nagad','rocket'] as const).some(method => configuredMethods[method].enabled) && <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.035] p-4 text-sm text-white/60">This restaurant currently accepts Cash on Delivery only. Online methods will appear here after the restaurant enables them and saves a valid receiving number.</div>}
                {!Object.values(configuredMethods).some(method => method.enabled) && <div className="mt-4 rounded-xl bg-red-500/10 p-4 text-red-300">This restaurant has no payment method enabled.</div>}
                {onlineConfiguration && <div className="mt-5 rounded-2xl border border-primary-500/20 bg-primary-500/5 p-5 space-y-5"><div><p className="text-xs uppercase tracking-wider text-primary-300">Pay to {paymentMethod.toUpperCase()}</p><div className="mt-2 flex flex-wrap items-center gap-3"><strong className="font-mono text-2xl sm:text-3xl tracking-wide">{onlineConfiguration.phoneNumber}</strong><button type="button" onClick={() => copyReceiverNumber(onlineConfiguration.phoneNumber)} className="btn btn-outline px-3 py-2 text-sm" aria-label={`Copy ${paymentMethod} receiver number`}>{copiedMethod === paymentMethod ? <><Check className="w-4 mr-1"/>Copied</> : <><Copy className="w-4 mr-1"/>Copy</>}</button></div><p className="mt-2 text-sm text-white/55">{onlineConfiguration.accountType} Account</p><p className="mt-3 text-3xl font-black text-primary-400">৳{payableTotal.toFixed(2)}</p></div><div className="border-t border-white/10 pt-4"><h3 className="font-bold mb-3">Order Summary</h3><div className="space-y-2 text-sm">{displayedItems.map(item=><div key={item.foodItem._id} className="flex justify-between gap-3"><span>{item.foodItem.name} × {item.quantity}</span><span>৳{(item.foodItem.price*item.quantity).toFixed(2)}</span></div>)}</div><div className="mt-4 pt-3 border-t border-white/10 space-y-2 text-sm"><div className="flex justify-between"><span className="text-white/50">Subtotal</span><span>৳{checkoutSubtotal.current.toFixed(2)}</span></div><div className="flex justify-between"><span className="text-white/50">Delivery Charge</span><span>৳{checkoutDeliveryFee.current.toFixed(2)}</span></div><div className="flex justify-between font-bold text-lg"><span>Total</span><span className="text-primary-400">৳{payableTotal.toFixed(2)}</span></div></div></div><dl className="grid sm:grid-cols-[150px_1fr] gap-2 text-sm"><dt className="text-white/45">Customer</dt><dd>{userData?.data?.name}</dd><dt className="text-white/45">Order ID</dt><dd className="font-mono">{createdOrderNumber ? `#${createdOrderNumber}` : 'Generated securely on submission'}</dd><dt className="text-white/45">Restaurant</dt><dd>{paymentOptions?.data?.restaurantName}</dd></dl><div className="grid sm:grid-cols-3 gap-3"><label><span className="text-sm text-white/60">Sender Number</span><input className="input mt-2" inputMode="tel" value={paymentForm.senderNumber} onChange={event=>setPaymentForm({...paymentForm,senderNumber:event.target.value})} placeholder="01XXXXXXXXX"/></label><label><span className="text-sm text-white/60">Transaction ID</span><input className="input mt-2 uppercase" value={paymentForm.transactionId} onChange={event=>setPaymentForm({...paymentForm,transactionId:event.target.value})} placeholder="Transaction ID"/></label><label><span className="text-sm text-white/60">Paid Amount</span><input className="input mt-2" type="number" min="0.01" step="0.01" value={paymentForm.amount} onChange={event=>setPaymentForm({...paymentForm,amount:event.target.value})}/></label></div><p className="text-xs text-yellow-300">Submitting this information does not automatically verify payment. The restaurant will check the transaction manually.</p></div>}
              </> : <div className="rounded-xl bg-red-500/10 p-4 text-red-300">Unable to load restaurant payment methods.</div>}
            </div>
          </motion.div>

          {/* Right Column - Order Summary */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-1"
          >
            <div className="card p-6 sticky top-24">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-primary-500" />
                Order Summary
              </h2>

              <div className="space-y-4 mb-6">
                {displayedItems.map((item) => (
                  <div key={item.foodItem._id} className="flex gap-3">
                    <img
                      src={item.foodItem.image}
                      alt={item.foodItem.name}
                      className="w-16 h-16 rounded-lg object-cover bg-dark-200"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium line-clamp-1">{item.foodItem.name}</div>
                      <div className="text-xs text-white/60 mt-1">Qty: {item.quantity}</div>
                      <div className="text-sm font-bold text-primary-400 mt-1">৳{item.foodItem.price * item.quantity}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2 pt-4 border-t border-white/10 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Subtotal</span>
                  <span>৳{subtotal}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Delivery Fee</span>
                  <span>৳{deliveryFee}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-white/10 mt-2">
                  <span>Total</span>
                  <span className="text-primary-400">৳{payableTotal}</span>
                </div>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={isOrdering || isSubmittingPayment || methodsLoading || !configuredMethods?.[paymentMethod]?.enabled}
                className="btn btn-primary w-full justify-center py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isOrdering ? 'Placing Order...' : isSubmittingPayment ? 'Submitting Payment...' : createdOrderId ? 'Retry Payment Submission' : paymentMethod === 'cod' ? 'Place Order' : 'Place Order & Submit Payment'} <ChevronRight className="w-5 h-5 ml-2" />
              </button>

              <p className="text-xs text-center text-white/40 mt-4">
                By placing an order, you agree to our Terms & Conditions
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
