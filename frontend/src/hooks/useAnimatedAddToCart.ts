import { useCallback, useEffect, useRef, useState } from 'react';
import { useAddToCartMutation } from '../store/api/cartApi';

type AddRequest = {
  foodItemId: string;
  quantity?: number;
  specialInstructions?: string;
};

type FoodVisual = {
  name: string;
  image?: string;
};

const CART_ADDED_EVENT = 'halkabite:cart-item-added';

export const celebrateCartAddition = (source: HTMLElement | null, food: FoodVisual) => {
  window.dispatchEvent(new CustomEvent(CART_ADDED_EVENT));
  if (!source || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const sourceRect = source.getBoundingClientRect();
  const target = document.querySelector<HTMLElement>('[data-cart-animation-target]');
  const targetRect = target?.getBoundingClientRect();
  const visual = document.createElement('img');
  visual.src = food.image || '/favicon.ico';
  visual.alt = '';
  visual.setAttribute('aria-hidden', 'true');
  visual.className = 'add-to-cart-fly';
  visual.style.left = `${sourceRect.left + sourceRect.width / 2 - 24}px`;
  visual.style.top = `${sourceRect.top + sourceRect.height / 2 - 24}px`;
  document.body.appendChild(visual);

  const destinationX = targetRect
    ? targetRect.left + targetRect.width / 2 - (sourceRect.left + sourceRect.width / 2)
    : window.innerWidth - sourceRect.right - 32;
  const destinationY = targetRect
    ? targetRect.top + targetRect.height / 2 - (sourceRect.top + sourceRect.height / 2)
    : -Math.max(160, sourceRect.top);

  const animation = visual.animate([
    { transform: 'translate3d(0,0,0) scale(.75)', opacity: 0 },
    { transform: 'translate3d(0,-22px,0) scale(1)', opacity: 1, offset: 0.18 },
    { transform: `translate3d(${destinationX}px,${destinationY}px,0) scale(.25) rotate(12deg)`, opacity: 0 }
  ], { duration: 760, easing: 'cubic-bezier(.2,.8,.2,1)' });
  animation.onfinish = () => visual.remove();
  animation.oncancel = () => visual.remove();
};

export const useCartAddedPulse = () => {
  const [isPulsing, setIsPulsing] = useState(false);
  useEffect(() => {
    let timer: number | undefined;
    const pulse = () => {
      setIsPulsing(false);
      window.requestAnimationFrame(() => setIsPulsing(true));
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setIsPulsing(false), 700);
    };
    window.addEventListener(CART_ADDED_EVENT, pulse);
    return () => {
      window.removeEventListener(CART_ADDED_EVENT, pulse);
      window.clearTimeout(timer);
    };
  }, []);
  return isPulsing;
};

export const useAnimatedAddToCart = (food: FoodVisual) => {
  const [mutation, { isLoading }] = useAddToCartMutation();
  const [isAdded, setIsAdded] = useState(false);
  const resetTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(resetTimer.current), []);

  const addToCart = useCallback(async (request: AddRequest, source?: HTMLElement | null) => {
    const response = await mutation(request).unwrap();
    setIsAdded(true);
    celebrateCartAddition(source || null, food);
    window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => setIsAdded(false), 1200);
    return response;
  }, [food, mutation]);

  return { addToCart, isLoading, isAdded };
};
