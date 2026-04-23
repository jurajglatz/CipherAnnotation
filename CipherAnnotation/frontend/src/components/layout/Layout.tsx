/**
 * Layout Component
 * Main layout wrapper with navbar and toast container
 */

import React from 'react';
import { Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from './Navbar';

export const Layout: React.FC = () => {
  return (
    <div className="min-h-screen bg-parchment text-ink-900 relative">
      <div className="absolute inset-0 cipher-symbols-bg opacity-[0.07] pointer-events-none" />
      <Navbar />
      <main className="pt-16 relative">
        <Outlet />
      </main>
      <Toaster
        position="bottom-center"
        reverseOrder={false}
        gutter={8}
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1a1410',
            color: '#fbf7ee',
            fontFamily: '"Crimson Pro", Georgia, serif',
            border: '1px solid rgba(139, 111, 71, 0.3)',
          },
          success: {
            duration: 3000,
            iconTheme: { primary: '#fbf7ee', secondary: '#1a1410' },
          },
          error: {
            duration: 4000,
            style: {
              background: '#b91c1c',
              color: '#fbf7ee',
            },
          },
        }}
      />
    </div>
  );
};

export default Layout;
