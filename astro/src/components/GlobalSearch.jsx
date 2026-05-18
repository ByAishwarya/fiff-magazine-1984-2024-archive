import React, { useState, useRef, useCallback } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import CircularProgress from "@mui/material/CircularProgress";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";

// PUBLIC_API_URL can be set in the Astro .env file for production.
// Falls back to the local Django dev server.
const API_BASE = import.meta.env.PUBLIC_API_URL ?? "http://localhost:8000";
const DEBOUNCE_MS = 150;

// MUI Autocomplete works with a single flat options array.
// We tag each item with _category so groupBy can split them into sections,
// and renderGroup / renderOption can style each section differently.
function flattenResults({ articles = [], authors = [], tags = [] }) {
  return [
    ...articles.map((a) => ({ ...a, _category: "Articles" })),
    ...authors.map((a) => ({ ...a, _category: "Authors" })),
    ...tags.map((t) => ({ ...t, _category: "Tags" })),
  ];
}

const CATEGORY_ICON = {
  Articles: ArticleOutlinedIcon,
  Authors: PersonOutlineIcon,
  Tags: LocalOfferOutlinedIcon,
};

export default function GlobalSearch({ onSelect }) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");

  // useRef instead of useState because changes to these values must not
  // trigger a re-render — they are side-effect control handles only.
  const debounceTimer = useRef(null);
  const abortController = useRef(null);

  const fetchResults = useCallback(async (query) => {
    // Abort the previous in-flight request so a slow earlier response
    // cannot overwrite a faster later one (race condition prevention).
    if (abortController.current) {
      abortController.current.abort();
    }
    abortController.current = new AbortController();

    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/search/?q=${encodeURIComponent(query)}`,
        { signal: abortController.current.signal }
      );
      if (!res.ok) throw new Error(`Search failed: ${res.status}`);
      const data = await res.json();
      setOptions(flattenResults(data));
    } catch (err) {
      // AbortError means we cancelled the request ourselves — not a real error.
      if (err.name !== "AbortError") {
        console.error("Search error:", err);
        setOptions([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = useCallback(
    (_event, value) => {
      setInputValue(value);

      // Reset the debounce window on every keystroke.
      if (debounceTimer.current) clearTimeout(debounceTimer.current);

      if (value.length < 2) {
        setOptions([]);
        return;
      }

      // Fire the API call only after the user pauses for 150 ms.
      debounceTimer.current = setTimeout(() => fetchResults(value), DEBOUNCE_MS);
    },
    [fetchResults]
  );

  const handleSelect = useCallback((_event, option) => {
    if (!option || typeof option === "string") return;
    // Clear the input and close the dropdown, then notify the parent.
    setInputValue("");
    setOptions([]);
    onSelect?.(option);
  }, [onSelect]);

  return (
    <Autocomplete
      freeSolo       // input is not forced to match an option — it is a search field
      clearOnEscape  // Escape key clears the input
      blurOnSelect   // closes dropdown immediately after the user picks a result
      options={options}
      loading={loading}
      inputValue={inputValue}
      onInputChange={handleInputChange}
      onChange={handleSelect}
      // Return the visible string for a given option object.
      getOptionLabel={(opt) =>
        typeof opt === "string" ? opt : opt.title ?? opt.name ?? ""
      }
      groupBy={(opt) => opt._category}
      // Our server already filtered and ranked results — skip MUI's client-side
      // filter which would re-filter the already-correct server response.
      filterOptions={(x) => x}
      // Stable key per option so React does not remount rows on each keystroke.
      getOptionKey={(opt) =>
        typeof opt === "string" ? opt : `${opt._category}-${opt.id}`
      }
      // Tailwind classes injected into MUI's internal DOM nodes via slotProps —
      // no ThemeProvider, no sx props, no MUI color tokens anywhere.
      slotProps={{
        paper: {
          className:
            "!rounded-xl !shadow-2xl !border !border-gray-100 !mt-1 !overflow-hidden",
        },
        listbox: {
          className: "!py-1 !max-h-80 !overflow-y-auto",
        },
      }}
      // ── Category section header ──────────────────────────────────────────
      renderGroup={(params) => (
        <li key={params.key}>
          <div className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400 select-none">
            {params.group}
          </div>
          <ul className="p-0 m-0 list-none">{params.children}</ul>
        </li>
      )}
      // ── Individual result row ────────────────────────────────────────────
      renderOption={(props, option) => {
        const Icon = CATEGORY_ICON[option._category] ?? ArticleOutlinedIcon;
        return (
          <li
            {...props}
            key={`${option._category}-${option.id}`}
            className="!flex !items-start !gap-3 !px-4 !py-2 !cursor-pointer hover:!bg-gray-50 !transition-colors"
          >
            <Icon
              className="!text-gray-400 !mt-0.5 !shrink-0"
              fontSize="small"
            />
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate leading-snug m-0">
                {option.title ?? option.name}
              </p>
              {/* Article subtitle: "2/23 · The Age of LLMs" */}
              {option._category === "Articles" &&
                (option.issue_ref || option.topic) && (
                  <p className="text-xs text-gray-400 truncate mt-0.5 m-0">
                    {option.issue_ref}
                    {option.issue_ref && option.topic && " · "}
                    {option.topic && (
                      <span className="text-[#6c6c8a] font-medium">
                        {option.topic}
                      </span>
                    )}
                  </p>
                )}
            </div>
          </li>
        );
      }}
      // ── Visible input field ──────────────────────────────────────────────
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder="Search archive..."
          size="small"
          variant="outlined"
          InputProps={{
            ...params.InputProps,
            // MUI's default outlined border is replaced entirely by Tailwind.
            className:
              "!rounded-lg !bg-gray-100 !text-sm !text-gray-900 !border-gray-400 !shadow " +
              "hover:!border-gray-500 focus-within:!border-gray-700 " +
              "focus-within:!ring-2 focus-within:!ring-gray-200",
            startAdornment: (
              <svg
                className="w-4 h-4 text-gray-600 mr-1 shrink-0"
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
            ),
            endAdornment: (
              <>
                {loading && (
                  <CircularProgress
                    size={14}
                    className="!text-gray-400 !mr-1"
                  />
                )}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
          // Remove MUI's floating label and the notched outline it creates.
          InputLabelProps={{ shrink: false }}
          sx={{ "& fieldset": { border: "none" } }}
        />
      )}
    />
  );
}
