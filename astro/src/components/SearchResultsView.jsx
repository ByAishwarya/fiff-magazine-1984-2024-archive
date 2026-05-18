import React, { useState, useEffect } from "react";
import IssueModal from "./IssueModal";

const API_BASE = import.meta.env.PUBLIC_API_URL ?? "http://localhost:8000";

// Build { "1980s": [1988, 1989], "2000s": [2001] } from { "1988": [...], "2001": [...] }
function groupByDecade(issuesByYear) {
  const decades = {};
  Object.keys(issuesByYear).forEach((year) => {
    const y = parseInt(year, 10);
    const key = `${Math.floor(y / 10) * 10}s`;
    if (!decades[key]) decades[key] = [];
    decades[key].push(y);
  });
  // Sort years within each decade
  Object.values(decades).forEach((years) => years.sort((a, b) => a - b));
  return decades;
}

function IssueCard({ item, onClick }) {
  const [month, year] = item.publication_date.split("/");
  const issueNum = item.issue_number.join(", ");
  return (
    <div onClick={() => onClick(item)} className="group block cursor-pointer">
      <div className="rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
        <img
          src={item.front_cover}
          alt={`Issue ${issueNum}`}
          className="w-full h-72 object-cover"
        />
      </div>
      <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
        <span>{issueNum}/{year.slice(-2)}</span>
        <span>{year}</span>
      </div>
      <h3 className="mt-1 text-base font-semibold text-gray-900 group-hover:text-gray-600 transition-colors">
        {month} {year}
      </h3>
    </div>
  );
}

function SearchResultsView({ filter, onClear }) {
  const [issuesByYear, setIssuesByYear] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedDecade, setSelectedDecade] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedIssue, setSelectedIssue] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setIssuesByYear({});
    setSelectedDecade(null);
    setSelectedYear(null);

    fetch(`${API_BASE}/magazine_issue/by_entity/?type=${filter.type}&id=${filter.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setIssuesByYear(data);

        // Auto-select the earliest decade and its first year
        const years = Object.keys(data).sort();
        if (years.length > 0) {
          const firstYear = parseInt(years[0], 10);
          const decadeKey = `${Math.floor(firstYear / 10) * 10}s`;
          setSelectedDecade(decadeKey);
          setSelectedYear(firstYear);
        }
      })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [filter]);

  const decadeGroups = groupByDecade(issuesByYear);
  const sortedDecades = Object.keys(decadeGroups).sort();
  const yearsInDecade = selectedDecade ? (decadeGroups[selectedDecade] ?? []) : [];
  const issuesToShow = selectedYear ? (issuesByYear[String(selectedYear)] ?? []) : [];

  const totalIssues = Object.values(issuesByYear).reduce((n, arr) => n + arr.length, 0);

  const filterLabel =
    filter.type === "author" ? "Author" :
    filter.type === "tag"    ? "Tag" :
                               "Article";

  return (
    <div className="pt-4">
      {/* ── Filter banner ── */}
      <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-100">
        <button
          onClick={onClear}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Archive
        </button>
        <span className="text-gray-200">|</span>
        <span className="text-sm text-gray-600">
          {filterLabel}:{" "}
          <strong className="text-gray-900">{filter.label}</strong>
        </span>
        {!loading && (
          <span className="ml-auto text-xs text-gray-400">
            {totalIssues} issue{totalIssues !== 1 ? "s" : ""} found
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
        </div>
      ) : totalIssues === 0 ? (
        <div className="py-24 text-center text-gray-400 text-sm">
          No magazine issues found for this {filter.type}.
        </div>
      ) : (
        <>
          {/* ── Decade tabs ── */}
          <div className="flex gap-6 border-b border-gray-200">
            {sortedDecades.map((decade) => (
              <button
                key={decade}
                onClick={() => {
                  setSelectedDecade(decade);
                  setSelectedYear(decadeGroups[decade][0]);
                }}
                className={`pb-3 text-sm font-medium transition-colors ${
                  selectedDecade === decade
                    ? "text-gray-900 border-b-2 border-blue-500"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                {decade}
              </button>
            ))}
          </div>

          {/* ── Two-column layout ── */}
          <div className="flex gap-10 mt-8">
            {/* Sidebar */}
            <aside className="w-48 flex-shrink-0 hidden md:block">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Filter by Year
              </h3>
              <ul className="space-y-1">
                {yearsInDecade.map((year) => (
                  <li key={year}>
                    <button
                      onClick={() => setSelectedYear(year)}
                      className={`text-sm transition-colors ${
                        selectedYear === year
                          ? "text-gray-900 font-semibold"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {year}
                    </button>
                  </li>
                ))}
              </ul>
            </aside>

            {/* Main grid */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedDecade} Archive
                </h2>
                <span className="text-sm text-blue-500">
                  {yearsInDecade.length} year{yearsInDecade.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {issuesToShow.map((item, i) => (
                  <IssueCard
                    key={i}
                    item={item}
                    onClick={setSelectedIssue}
                  />
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {selectedIssue && (
        <IssueModal issue={selectedIssue} onClose={() => setSelectedIssue(null)} />
      )}
    </div>
  );
}

export default SearchResultsView;
