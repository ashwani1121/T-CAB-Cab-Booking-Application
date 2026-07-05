import React from 'react';

// Import all the individual sections
import Hero from "../../components/Websites/Hero"; // This imports the code you pasted
import FeatureShowcase from "../../components/Websites/FeatureShowcase";
import FeaturesHome from "../../components/Websites/FeaturesHome";
import TechSection from "../../components/Websites/TechSection";
import BusinessSection from "../../components/Websites/BusinessSection";
import FinalSection from "../../components/Websites/FinalSection";

const Home = () => {
  return (
    <>
      {/* This renders the Banner code you provided */}
      <Hero /> 
      
      {/* This renders the rest of the page */}
      <FeatureShowcase />
      <FeaturesHome />
      <TechSection />
      <BusinessSection />
      <FinalSection />
    </>
  );
};

export default Home;