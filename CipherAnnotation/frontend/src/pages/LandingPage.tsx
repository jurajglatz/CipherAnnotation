import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks';
import LandingNavbar from '@/components/landing/LandingNavbar';
import Hero from '@/components/landing/Hero';
import HowItWorks from '@/components/landing/HowItWorks';
import FeaturesGrid from '@/components/landing/FeaturesGrid';
import ForResearchers from '@/components/landing/ForResearchers';
import CtaBanner from '@/components/landing/CtaBanner';
import LandingFooter from '@/components/landing/LandingFooter';

const LandingPage: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/documents', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading) return null;
  if (isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-parchment-50 text-ink-900">
      <LandingNavbar />
      <main>
        <Hero />
        <HowItWorks />
        <FeaturesGrid />
        <ForResearchers />
        <CtaBanner />
      </main>
      <LandingFooter />
    </div>
  );
};

export default LandingPage;
