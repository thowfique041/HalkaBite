import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { CartItem, Restaurant, CartState } from '../../types';

const initialState: CartState = {
  items: [],
  restaurant: null,
  subtotal: 0,
  itemCount: 0,
  isLoading: false,
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    setCart: (state, action: PayloadAction<{ items: CartItem[]; restaurant: Restaurant | null; subtotal: number; itemCount: number }>) => {
      state.items = action.payload.items;
      state.restaurant = action.payload.restaurant;
      state.subtotal = action.payload.subtotal;
      state.itemCount = action.payload.itemCount;
    },
    clearCartState: (state) => {
      state.items = [];
      state.restaurant = null;
      state.subtotal = 0;
      state.itemCount = 0;
    },
    setCartLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },
});

export const { setCart, clearCartState, setCartLoading } = cartSlice.actions;
export default cartSlice.reducer;
