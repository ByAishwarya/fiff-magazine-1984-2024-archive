import React, { useState, useEffect } from "react";
import MagazineArchive from "./Searchbar";
import ContentGrid from "./ContentGrid";

function MagazineApp() {
  const [selectedYear, setSelectedYear] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => setLoading(false), 1500);
  }, []);

  return (
    <div className="min-h-screen">
      {loading ? (
        <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
          <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
      ) : (
        <MagazineArchive onYearSelect={setSelectedYear} selectedYear={selectedYear}>
          {selectedYear && <ContentGrid selectedYear={selectedYear} />}
        </MagazineArchive>
      )}
    </div>
  );
}

export default MagazineApp;