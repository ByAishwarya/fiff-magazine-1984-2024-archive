import React, { useEffect, useState, useRef } from "react";

function IssueModal({ issue, onClose }) {
  const [copied, setCopied] = useState(false);
  const [articles, setArticles] = useState(null);
  const [loadingArticles, setLoadingArticles] = useState(false);
  const overlayRef = useRef(null);

  // Lock body scroll when modal is open
  useEffect(function () {
    document.body.style.overflow = "hidden";
    return function () {
      document.body.style.overflow = "";
    };
  }, []);

  // Close on ESC key
  useEffect(function () {
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return function () {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  // Load articles: use issue.articles if available, otherwise fetch from detail URL
  useEffect(function () {
    if (issue.articles && issue.articles.length > 0) {
      setArticles(issue.articles);
    } else if (issue.url) {
      setLoadingArticles(true);
      fetch(issue.url)
        .then(function (res) { return res.json(); })
        .then(function (data) {
          setArticles(data.articles || []);
          // Cache on the issue object so re-opening doesn't re-fetch
          issue._cachedArticles = data.articles || [];
        })
        .catch(function () {
          setArticles([]);
        })
        .finally(function () {
          setLoadingArticles(false);
        });
    } else {
      setArticles([]);
    }
  }, [issue]);

  function handleOverlayClick(e) {
    if (e.target === overlayRef.current) {
      onClose();
    }
  }

  function handleReadOnline() {
    if (issue.pdf_file) {
      window.open(issue.pdf_file, "_blank");
    }
  }

  function handleShare() {
    navigator.clipboard.writeText(issue.pdf_file || window.location.href).then(function () {
      setCopied(true);
      setTimeout(function () {
        setCopied(false);
      }, 2000);
    });
  }

  var month = issue.publication_date ? issue.publication_date.split("/")[0] : "";
  var year = issue.publication_date ? issue.publication_date.split("/")[1] : "";
  var issueNum = issue.issue_number ? issue.issue_number.join(", ") : "";
  var shortYear = year ? year.slice(-2) : "";
  var displayArticles = articles || issue._cachedArticles || null;

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 transition-opacity duration-300"
      style={{ animation: "fadeIn 0.2s ease-out" }}
    >
      <style>{"\
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }\
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }\
      "}</style>
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col md:flex-row overflow-hidden"
        style={{ animation: "slideUp 0.25s ease-out" }}
      >
        {/* LEFT COLUMN: Cover + Buttons */}
        <div className="md:w-2/5 flex flex-col bg-gray-50">
          <div className="flex-1 min-h-0">
            <img
              src={issue.front_cover}
              alt={"Issue " + issueNum}
              className="w-full h-64 md:h-full object-cover md:rounded-tl-2xl"
            />
          </div>
          <div className="p-4 space-y-2">
            {/* Read Online - Primary CTA */}
            <button
              onClick={handleReadOnline}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-900 text-white rounded-lg font-medium text-sm hover:bg-gray-800 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Read PDF in Browser
            </button>
            {/* PDF + Share row */}
            <div className="flex gap-2">
              <a
                href={issue.pdf_file || "#"}
                download
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 bg-white rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors no-underline"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download
              </a>
              <button
                onClick={handleShare}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 bg-white rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                {copied ? "Copied!" : "Share"}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Details + Articles */}
        <div className="md:w-3/5 p-6 md:p-8 flex flex-col relative overflow-hidden">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Title */}
          <h2 className="text-xl font-semibold text-gray-900 pr-8">FifF Kommunikation</h2>
          <p className="text-sm text-gray-500 mt-1">
            {"Issue " + issueNum + "/" + shortYear + " \u2013 " + month + " " + year}
          </p>

          {/* Divider */}
          <div className="border-t border-gray-200 my-4"></div>

          {/* Contents label */}
          <h3 className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-3">Contents</h3>

          {/* Articles list */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {loadingArticles ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
              </div>
            ) : displayArticles && displayArticles.length > 0 ? (
              <div>
                {displayArticles.map(function (article, idx) {
                  return (
                    <div
                      key={idx}
                      className={"flex gap-3 py-3" + (idx < displayArticles.length - 1 ? " border-b border-gray-100" : "")}
                    >
                      <span className="w-8 flex-shrink-0 text-sm font-medium text-blue-500">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 leading-snug">{article.title}</p>
                        {article.author && (
                          <p className="text-xs text-gray-500 mt-0.5">{article.author}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-400 italic text-sm py-4">
                Contents not available for this issue
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default IssueModal;
