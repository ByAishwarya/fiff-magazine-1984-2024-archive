import React, { useState } from "react";

function Navbar({ showAdvancedSearch, setShowAdvancedSearch }) {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      // Update this to your actual search route/logic
      window.location.href = `/magazine_issues?search=${encodeURIComponent(searchQuery)}`;
    }
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        
        {/* Left: Logo + Name */}
        <a href="/" className="flex items-center gap-2 no-underline">
          <div className="w-8 h-8 bg-gray-900 rounded-md flex items-center justify-center">
            <span className="text-white font-bold text-sm">F</span>
          </div>
          <span className="text-gray-900 font-medium text-lg">
            FifF Kommunikation
          </span>
        </a>

        {/* Center: Nav Links */}
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

        {/* Right: Search */}
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
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
          <input
            type="text"
            placeholder="Search archive..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearch}
            className="pl-9 pr-4 py-2 w-48 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400"
          />
        </div>
      </div>
    </nav>
  );
}

export default Navbar;