import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import CartSidebar from '../cart/CartSidebar';
import ChatWidget from '../ai/ChatWidget';
import VoiceModal from '../ai/VoiceModal';

const Layout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-16">
        <Outlet />
      </main>
      <Footer />
      <CartSidebar />
      <ChatWidget />
      <VoiceModal />
    </div>
  );
};

export default Layout;
