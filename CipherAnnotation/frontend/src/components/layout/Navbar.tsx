/**
 * Navbar Component
 * Fixed top navigation with app logo, nav links, and user menu
 */

import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, User, Key } from 'lucide-react';
import { useAuth } from '@/hooks';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = () => {
    logout();
    setIsProfileMenuOpen(false);
    navigate('/login');
  };

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenus = () => {
    setIsMenuOpen(false);
    setIsProfileMenuOpen(false);
  };

  const navLinks = isAuthenticated
    ? [
        { to: '/documents', label: 'My Documents' },
        { to: '/documents/public', label: 'Public Library' },
        { to: '/symbols', label: 'Symbols' },
      ]
    : [];

  const isActive = (to: string) =>
    location.pathname === to || location.pathname.startsWith(to + '/');

  return (
    <nav
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-parchment-50/90 backdrop-blur-md border-b border-sepia-600/20 shadow-sm'
          : 'bg-parchment-50/70 backdrop-blur-sm border-b border-sepia-600/10'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link
            to="/"
            className="flex items-center gap-2 group"
            onClick={closeMenus}
          >
            <div className="w-9 h-9 rounded-full bg-ink-900 text-parchment-50 flex items-center justify-center group-hover:rotate-12 transition-transform">
              <Key className="w-5 h-5" />
            </div>
            <span className="font-serif text-xl font-semibold text-ink-900 tracking-tight hidden sm:inline">
              CipherAnnotation
            </span>
            <span className="font-serif text-xl font-semibold text-ink-900 tracking-tight sm:hidden">
              Cipher
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={closeMenus}
                className={`text-sm font-medium transition-colors ${
                  isActive(l.to)
                    ? 'text-ink-900 ink-underline'
                    : 'text-ink-900/70 hover:text-ink-900'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated && user ? (
              <div className="relative">
                <button
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-ink-900/5 transition-colors border border-transparent hover:border-sepia-600/20"
                >
                  {user.avatarUri ? (
                    <img
                      src={user.avatarUri}
                      alt={user.name}
                      className="w-8 h-8 rounded-full object-cover border border-sepia-600/30"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-ink-900 text-parchment-50 flex items-center justify-center">
                      <span className="text-xs font-semibold">
                        {user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <span className="text-sm font-medium text-ink-900">
                    {user.name}
                  </span>
                </button>

                {isProfileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-parchment-50 border border-sepia-600/20 text-ink-900 rounded-md shadow-xl py-1.5 z-50">
                    <Link
                      to="/profile"
                      className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-parchment-100 transition-colors"
                      onClick={() => setIsProfileMenuOpen(false)}
                    >
                      <User className="w-4 h-4 text-sepia-700" />
                      <span>Profile</span>
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-parchment-100 transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4 text-sepia-700" />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-ink-900 hover:text-primary-700 transition-colors"
                  onClick={closeMenus}
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-semibold bg-ink-900 text-parchment-50 hover:bg-primary-700 rounded-md transition-colors shadow-sm"
                  onClick={closeMenus}
                >
                  Register
                </Link>
              </>
            )}
          </div>

          <button
            onClick={toggleMenu}
            className="md:hidden p-2 text-ink-900"
            aria-label="Menu"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {isMenuOpen && (
          <div className="md:hidden pb-4 border-t border-sepia-600/20 bg-parchment-50/95 -mx-4 px-4">
            {navLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="block py-3 text-ink-900/80 font-medium hover:text-ink-900"
                onClick={closeMenus}
              >
                {l.label}
              </Link>
            ))}
            {isAuthenticated ? (
              <>
                <div className="border-t border-sepia-600/20 my-2" />
                <Link
                  to="/profile"
                  className="flex items-center gap-3 py-3 text-ink-900/80 font-medium"
                  onClick={closeMenus}
                >
                  <User className="w-4 h-4 text-sepia-700" />
                  <span>Profile</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 py-3 text-ink-900/80 font-medium text-left"
                >
                  <LogOut className="w-4 h-4 text-sepia-700" />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <div className="flex gap-2 pt-3 border-t border-sepia-600/20 mt-2">
                <Link
                  to="/login"
                  className="flex-1 px-3 py-2 text-sm text-center border border-ink-900/30 rounded-md text-ink-900"
                  onClick={closeMenus}
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="flex-1 px-3 py-2 text-sm text-center bg-ink-900 text-parchment-50 rounded-md"
                  onClick={closeMenus}
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
