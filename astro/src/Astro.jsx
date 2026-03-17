import React, { useState } from "react";
import Navbar from "./components/Navbar";
import ContentGrid from "./components/ContentGrid";
import FilterPage from "./components/FilterPage";
import SearchBar from "./components/Searchbar";
import MagazineApp from "./components/MagazineApp";
import HeroSection from "./components/HeroSection";

function App() {
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  return (
    <div className="font-sans bg-white text-gray-800 min-h-screen">
      <Navbar
        showAdvancedSearch={showAdvancedSearch}
        setShowAdvancedSearch={setShowAdvancedSearch}
      />
      <div className="max-w-7xl mx-auto px-6">
        {showAdvancedSearch ? (
          <FilterPage />
        ) : (
          <>
            <HeroSection />
            <MagazineApp />
          </>
        )}
      </div>
    </div>
  );
}

export default App;