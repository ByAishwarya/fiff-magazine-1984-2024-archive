import React, { useEffect, useState } from "react";

function MagazineArchive({ onYearSelect, selectedYear, children }) {
  const [decades, setDecades] = useState({});
  const [selectedDecade, setSelectedDecade] = useState("");

  const API_URL = `${import.meta.env.PUBLIC_API_URL ?? "http://localhost:8000"}/magazine_issue/decades/`;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(API_URL);
        if (response.ok) {
          const data = await response.json();
          const formattedDecades = {};
          const sortedDecades = Object.keys(data).sort((a, b) => a - b);
          sortedDecades.forEach((decade) => {
            formattedDecades[`${decade}s`] = data[decade].sort((a, b) => a - b);
          });
          setDecades(formattedDecades);
          const firstDecade = Object.keys(formattedDecades)[0];
          const firstYear = formattedDecades[firstDecade][0];
          setSelectedDecade(firstDecade);
          onYearSelect(firstYear);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
  }, []);

  const handleYearClick = (year) => {
    onYearSelect(year);
  };

  const handleDecadeClick = (decade) => {
    setSelectedDecade(decade);
    onYearSelect(decades[decade][0]);
  };

  const placeholderTopics = [
    "Surveillance",
    "Privacy",
    "NSA",
    "Artificial Intelligence",
    "Data Protection",
    "Military",
    "Ethics",
    "Internet",
  ];

  return (
    <div className="pt-4">
      {/* Decade Tabs */}
      <div className="flex gap-6 border-b border-gray-200">
        {Object.keys(decades).map((decade) => (
          <button
            key={decade}
            onClick={() => handleDecadeClick(decade)}
            className={`pb-3 text-sm font-medium transition-colors ${selectedDecade === decade
              ? "text-gray-900 border-b-2 border-blue-500"
              : "text-gray-400 hover:text-gray-600"
              }`}
          >
            {decade}
          </button>
        ))}
      </div>

      {/* Two-column layout: Sidebar + Content */}
      <div className="flex gap-10 mt-8">
        {/* Left Sidebar */}
        <aside className="w-48 flex-shrink-0 hidden md:block">
          {/* Filter by Year */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Filter by Year
            </h3>
            <ul className="space-y-1">
              {Array.isArray(decades[selectedDecade]) &&
                decades[selectedDecade].map((year) => (
                  <li key={year}>
                    <button
                      onClick={() => handleYearClick(year)}
                      className={`text-sm transition-colors ${selectedYear === year
                        ? "text-gray-900 font-semibold"
                        : "text-gray-500 hover:text-gray-700"
                        }`}
                    >
                      {year}
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {selectedDecade} Archive
            </h2>
            <span className="text-sm text-blue-500">
              {decades[selectedDecade]?.length || 0} years
            </span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

export default MagazineArchive;