import { useState, useEffect } from "react";
import ContentGrid from "./ContentGrid";
import FilterPageContent from "./FilterPageContent";

const API_BASE = import.meta.env.PUBLIC_API_URL ?? "http://localhost:8000";
const API_URL = `${API_BASE}/magazine_issue/search/`;
const FILTER_API_URL = `${API_BASE}/magazine_issue/filter_values/`;

const FilterPage = () => {
  const [filterType, setFilterType] = useState("month");
  const [startMonth, setStartMonth] = useState("");
  const [startYear, setStartYear] = useState("");
  const [endMonth, setEndMonth] = useState("");
  const [endYear, setEndYear] = useState("");
  const [startIssue, setStartIssue] = useState("");
  const [startIssueYear, setStartIssueYear] = useState("");
  const [endIssue, setEndIssue] = useState("");
  const [endIssueYear, setEndIssueYear] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filterValues, setFilterValues] = useState({ issues: [], years: [], months: [] });

  useEffect(() => {
    const fetchFilterValues = async () => {
      try {
        const response = await fetch(FILTER_API_URL);
        if (!response.ok) {
          throw new Error("Failed to fetch filter values");
        }
        const data = await response.json();
        setFilterValues(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchFilterValues();
  }, []);

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    setResults([]);

    try {
      let params = "";
      if (filterType === "month") {
        if (startMonth && startYear && endMonth && endYear) {
          params = `?date_begin=${startMonth}-${startYear}&date_end=${endMonth}-${endYear}`;
        } else {
          alert("Please select both start and end months and years.");
          setLoading(false);
          return;
        }
      } else if (filterType === "issue") {
        if (startIssue && startIssueYear && endIssue && endIssueYear) {
          params = `?issue_begin=${startIssue}-${startIssueYear}&issue_end=${endIssue}-${endIssueYear}`;
        } else {
          alert("Please select issue numbers and years for both start and end.");
          setLoading(false);
          return;
        }
      }

      const response = await fetch(`${API_URL}${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch search results");
      }

      const result = await response.json();
      setResults(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  if (loading) return <p className="text-white">Loading...</p>;
  if (error) return <p className="text-white">Error: {error}</p>;
  return (
    <div className="w-full p-6 bg-white rounded-lg shadow-lg">
      <div className="flex space-x-4 mb-6">
        <label className="inline-flex items-center space-x-2">
          <input
            type="radio"
            value="month"
            checked={filterType === "month"}
            onChange={() => setFilterType("month")}
            className="form-radio h-5 w-5 text-blue-600"
          />
          <span>Month Range</span>
        </label>
        <label className="inline-flex items-center space-x-2">
          <input
            type="radio"
            value="issue"
            checked={filterType === "issue"}
            onChange={() => setFilterType("issue")}
            className="form-radio h-5 w-5 text-blue-600"
          />
          <span>Issue Range</span>
        </label>
      </div>

      {filterType === "month" && (
        <div className="space-y-4 mb-6">
          <div className="flex space-x-4">
            <select value={startMonth} onChange={(e) => setStartMonth(e.target.value)}>
              <option value="">Start Month</option>
              {filterValues.months.map((month) => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
            <select value={startYear} onChange={(e) => setStartYear(e.target.value)}>
              <option value="">Start Year</option>
              {filterValues.years.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <select value={endMonth} onChange={(e) => setEndMonth(e.target.value)}>
              <option value="">End Month</option>
              {filterValues.months.map((month) => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
            <select value={endYear} onChange={(e) => setEndYear(e.target.value)}>
              <option value="">End Year</option>
              {filterValues.years.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <button onClick={handleSearch}>Search</button>
          </div>
        </div>
      )}

      {filterType === "issue" && (
        <div className="space-y-4 mb-6">
          <div className="flex space-x-4">
            <select value={startIssue} onChange={(e) => setStartIssue(e.target.value)}>
              <option value="">Start Issue</option>
              {filterValues.issues.map((issue) => (
                <option key={issue} value={issue}>{issue}</option>
              ))}
            </select>
            <select value={startIssueYear} onChange={(e) => setStartIssueYear(e.target.value)}>
              <option value="">Start Year</option>
              {filterValues.years.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <select value={endIssue} onChange={(e) => setEndIssue(e.target.value)}>
              <option value="">End Issue</option>
              {filterValues.issues.map((issue) => (
                <option key={issue} value={issue}>{issue}</option>
              ))}
            </select>
            <select value={endIssueYear} onChange={(e) => setEndIssueYear(e.target.value)}>
              <option value="">End Year</option>
              {filterValues.years.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <button onClick={handleSearch}>Search</button>
          </div>
        </div>
      )}

      <div className="mt-6">
        {results.length > 0 ? <FilterPageContent items={results} loading={loading} /> : <p>No results found.</p>}
      </div>
    </div>
  );
};

export default FilterPage;