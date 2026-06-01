import React, { useEffect, useState } from "react";

function ContentGrid({ selectedYear, onIssueClick }) {
  const [issues, setIssues] = useState([]);

  const API_URL = `${import.meta.env.PUBLIC_API_URL ?? "http://localhost:8000"}/magazine_issue/`;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(API_URL);
        if (response.ok) {
          const data = await response.json();
          if (data[selectedYear]) {
            setIssues(data[selectedYear]);
          } else {
            setIssues([]);
          }
        }
      } catch (error) {
        console.error("Error fetching issues:", error);
      }
    };
    if (selectedYear) {
      fetchData();
    }
  }, [selectedYear]);

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {issues.length > 0 ? (
          issues.map((item, index) => {
            const month = item.publication_date.split("/")[0];
            const year = item.publication_date.split("/")[1];
            const issueNum = item.issue_number.join(", ");

            return (
              <div
                key={index}
                onClick={function () { if (onIssueClick) onIssueClick(item); }}
                className="group block cursor-pointer"
              >
                <div className="rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
                  <img
                    src={item.front_cover}
                    alt={"Issue " + issueNum}
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
          })
        ) : (
          <p className="text-gray-500">
            No magazine issues available for the selected year.
          </p>
        )}
      </div>
    </div>
  );
}

export default ContentGrid;