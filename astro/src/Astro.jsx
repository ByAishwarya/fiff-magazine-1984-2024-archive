import React, { useState } from "react";
import Navbar from "./components/Navbar";
import FilterPage from "./components/FilterPage";
import MagazineApp from "./components/MagazineApp";
import HeroSection from "./components/HeroSection";
import SearchResultsView from "./components/SearchResultsView";

function App() {
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);

  // activeFilter shape:
  //   { type: 'article'|'author'|'tag', id: number, label: string }
  // null means no search filter — show the normal landing page.
  const [activeFilter, setActiveFilter] = useState(null);
  // Incrementing this remounts GlobalSearch, clearing its internal input state.
  const [searchResetKey, setSearchResetKey] = useState(0);

  function handleSearchSelect(option) {
    if (option._category === "Articles") {
      setActiveFilter({ type: "article", id: option.id, label: option.title });
    } else if (option._category === "Authors") {
      setActiveFilter({ type: "author", id: option.id, label: option.name });
    } else if (option._category === "Tags") {
      setActiveFilter({ type: "tag", id: option.id, label: option.name });
    }
    setShowAdvancedSearch(false);
  }

  function handleClearFilter() {
    setActiveFilter(null);
    setSearchResetKey((k) => k + 1);
  }

  return (
    <div className="font-sans bg-white text-gray-800 min-h-screen">
      <Navbar
        showAdvancedSearch={showAdvancedSearch}
        setShowAdvancedSearch={setShowAdvancedSearch}
        onSearchSelect={handleSearchSelect}
        searchResetKey={searchResetKey}
      />
      <div className="max-w-7xl mx-auto px-6">
        {showAdvancedSearch ? (
          <FilterPage />
        ) : activeFilter ? (
          <SearchResultsView
            filter={activeFilter}
            onClear={handleClearFilter}
          />
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
