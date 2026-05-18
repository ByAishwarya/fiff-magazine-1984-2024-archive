import React, { lazy, Suspense, useState, useEffect } from "react";

const GlobalSearch = lazy(() => import("./GlobalSearch"));

function SearchPlaceholder() {
  return (
    <div className="relative w-80">
      <svg
        className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <div className="pl-10 pr-4 py-2 w-full text-sm border border-gray-400 rounded-lg bg-gray-100 text-gray-500 select-none shadow">
        Search archive...
      </div>
    </div>
  );
}

function Navbar({ showAdvancedSearch, setShowAdvancedSearch, onSearchSelect, searchResetKey }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">

        {/* Logo */}
        <a href="/" className="flex items-center gap-2 no-underline">
          <div className="w-8 h-8 bg-gray-900 rounded-md flex items-center justify-center">
            <span className="text-white font-bold text-sm">F</span>
          </div>
          <span className="text-gray-900 font-medium text-lg">
            FifF Kommunikation
          </span>
        </a>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-8">
          <a href="/magazine_issues" className="text-gray-600 hover:text-gray-900 text-sm font-medium no-underline">
            Archive
          </a>
          <a href="/magazine_issues" className="text-gray-600 hover:text-gray-900 text-sm font-medium no-underline">
            Issues
          </a>
          <a href="#" className="text-gray-600 hover:text-gray-900 text-sm font-medium no-underline">
            Topics
          </a>
          <a href="#" className="text-gray-600 hover:text-gray-900 text-sm font-medium no-underline">
            About
          </a>
        </div>

        {/* Search — client-only (MUI Popper uses browser APIs, crashes SSR).
            searchResetKey changes when the user clears a filter, which remounts
            GlobalSearch and wipes its internal inputValue state. */}
        <div className="w-80">
          {mounted ? (
            <Suspense fallback={<SearchPlaceholder />}>
              <GlobalSearch key={searchResetKey} onSelect={onSearchSelect} />
            </Suspense>
          ) : (
            <SearchPlaceholder />
          )}
        </div>

      </div>
    </nav>
  );
}

export default Navbar;
