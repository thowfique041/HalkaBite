import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  isMobileMenuOpen: boolean;
  isCartOpen: boolean;
  isChatOpen: boolean;
  isVoiceModalOpen: boolean;
  searchQuery: string;
  theme: 'dark' | 'light';
}

const initialState: UIState = {
  isMobileMenuOpen: false,
  isCartOpen: false,
  isChatOpen: false,
  isVoiceModalOpen: false,
  searchQuery: '',
  theme: 'dark',
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleMobileMenu: (state) => {
      state.isMobileMenuOpen = !state.isMobileMenuOpen;
    },
    toggleCart: (state) => {
      state.isCartOpen = !state.isCartOpen;
    },
    toggleChat: (state) => {
      state.isChatOpen = !state.isChatOpen;
    },
    toggleVoiceModal: (state) => {
      state.isVoiceModalOpen = !state.isVoiceModalOpen;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    setCartOpen: (state, action: PayloadAction<boolean>) => {
      state.isCartOpen = action.payload;
    },
    setChatOpen: (state, action: PayloadAction<boolean>) => {
      state.isChatOpen = action.payload;
    },
  },
});

export const { 
  toggleMobileMenu, 
  toggleCart, 
  toggleChat, 
  toggleVoiceModal, 
  setSearchQuery, 
  setCartOpen, 
  setChatOpen 
} = uiSlice.actions;
export default uiSlice.reducer;
