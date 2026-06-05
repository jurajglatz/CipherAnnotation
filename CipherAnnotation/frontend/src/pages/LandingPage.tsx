import React from 'react';
import { useAuth } from '@/hooks';
import LandingNavbar from '@/components/landing/LandingNavbar';
import Hero from '@/components/landing/Hero';
import HowItWorks from '@/components/landing/HowItWorks';
import FeaturesGrid from '@/components/landing/FeaturesGrid';
import ForResearchers from '@/components/landing/ForResearchers';
import CtaBanner from '@/components/landing/CtaBanner';
import LandingFooter from '@/components/landing/LandingFooter';

const LandingPage: React.FC = () => {
  const { isLoading } = useAuth();

  if (isLoading) return null;

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
