import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { layers } from "../data/layers.js";
import { useAuth } from "../context/AuthContext.jsx";
import "./styles/SearchBar.css";

/* =========================================================
   SEARCH ICON
========================================================= */

function SearchIcon() {
  return (
    <svg
      className="search-icon"
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle
        cx="11"
        cy="11"
        r="7"
        stroke="currentColor"
        strokeWidth="1.8"
      />

      <path
        d="M20 20L16.65 16.65"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* =========================================================
   CLOSE ICON
========================================================= */

function CloseIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M6 6L18 18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      <path
        d="M18 6L6 18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* =========================================================
   USER ICON
========================================================= */

function UserIcon() {
  return (
    <svg
      className="user-icon"
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="8"
        r="3.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />

      <path
        d="M5 20C5.8 16.5 8.2 14.5 12 14.5C15.8 14.5 18.2 16.5 19 20"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* =========================================================
   SEARCH BAR
========================================================= */

function SearchBar() {
  /* =======================================================
     STATES
  ======================================================= */

  // Layer 01 active by default
  const [activeIndex, setActiveIndex] = useState(0);

  let auth = null;
  try {
    auth = useAuth();
  } catch {
    // Graceful fallback
  }
  const currentUser = auth?.currentUser;
  const hasAccess = auth?.hasAccess || (() => true);

  const [isOpen, setIsOpen] = useState(false);

  const [searchValue, setSearchValue] = useState("");

  const searchRef = useRef(null);

  const modalInputRef = useRef(null);

  /* =======================================================
     REMOVE DUPLICATE LAYERS & EXCLUDE RESTRICTED ONES
  ======================================================= */

  const uniqueLayers = Array.from(
    new Map(
      layers.map((layer) => [String(layer.n), layer])
    ).values()
  ).sort(
    (a, b) => Number(a.n) - Number(b.n)
  );

  // Restricted layers are completely excluded from search
  const accessibleLayers = uniqueLayers.filter((layer) => hasAccess(layer.n));

  /* =======================================================
     FILTER SEARCH RESULTS (ONLY FROM ACCESSIBLE LAYERS)
  ======================================================= */

  const filteredLayers = accessibleLayers.filter((layer) => {
    const searchText = searchValue
      .toLowerCase()
      .trim();

    if (!searchText) {
      return true;
    }

    return (
      layer.n
        ?.toString()
        .toLowerCase()
        .includes(searchText) ||

      layer.name
        ?.toLowerCase()
        .includes(searchText) ||

      layer.group
        ?.toLowerCase()
        .includes(searchText) ||

      layer.blurb
        ?.toLowerCase()
        .includes(searchText) ||

      layer.path
        ?.toLowerCase()
        .includes(searchText)
    );
  });

  /* =======================================================
     RESET ACTIVE RESULT WHEN SEARCH CHANGES
  ======================================================= */

  useEffect(() => {
    if (filteredLayers.length === 0) {
      setActiveIndex(-1);
      return;
    }

    setActiveIndex(0);
  }, [searchValue]);

  /* =======================================================
     OPEN SEARCH
  ======================================================= */

  const openSearch = () => {
    setIsOpen(true);

    setTimeout(() => {
      modalInputRef.current?.focus();
    }, 0);
  };

  /* =======================================================
     CLOSE SEARCH
  ======================================================= */

  const closeSearch = () => {
    setIsOpen(false);
    setSearchValue("");
    setActiveIndex(0);
  };

  /* =======================================================
     CLICK OUTSIDE
  ======================================================= */

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target)
      ) {
        closeSearch();
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  /* =======================================================
     KEYBOARD CONTROLS
  ======================================================= */

  useEffect(() => {
    const handleKeyboard = (event) => {
      /* ESCAPE */

      if (event.key === "Escape") {
        if (isOpen) {
          closeSearch();
        }

        return;
      }

      /* CMD / CTRL + K */

      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();

        openSearch();

        return;
      }

      if (!isOpen) {
        return;
      }

      /* ARROW DOWN */

      if (event.key === "ArrowDown") {
        event.preventDefault();

        if (filteredLayers.length === 0) {
          return;
        }

        setActiveIndex((currentIndex) => {
          if (
            currentIndex >=
            filteredLayers.length - 1
          ) {
            return 0;
          }

          return currentIndex + 1;
        });
      }

      /* ARROW UP */

      if (event.key === "ArrowUp") {
        event.preventDefault();

        if (filteredLayers.length === 0) {
          return;
        }

        setActiveIndex((currentIndex) => {
          if (currentIndex <= 0) {
            return filteredLayers.length - 1;
          }

          return currentIndex - 1;
        });
      }

      /* ENTER */

      if (event.key === "Enter") {
        if (
          filteredLayers.length > 0 &&
          activeIndex >= 0
        ) {
          const activeLayer =
            filteredLayers[activeIndex];

          if (activeLayer?.path) {
            window.location.href =
              activeLayer.path;
          }
        }
      }
    };

    document.addEventListener(
      "keydown",
      handleKeyboard
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyboard
      );
    };
  }, [
    isOpen,
    activeIndex,
    filteredLayers,
  ]);

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="search-user-wrapper">

      {/* =================================================
          SEARCH BAR
      ================================================= */}

      <div
        ref={searchRef}
        className="search-bar-wrapper"
      >
        <div
          className="home-search"
          onClick={openSearch}
        >
          <SearchIcon />

          <input
            type="text"
            value={searchValue}
            placeholder="Search everything"
            aria-label="Search everything"
            readOnly
            onFocus={openSearch}
          />

          <kbd>
            ⌘K
          </kbd>
        </div>

        {/* =================================================
            SEARCH MODAL
        ================================================= */}

        {isOpen && (
          <>
            <div
              className="search-overlay"
              onClick={closeSearch}
            />

            <div
              className="search-modal"
              role="dialog"
              aria-modal="true"
              aria-label="Search"
            >
              {/* SEARCH HEADER */}

              <div className="search-modal-header">
                <SearchIcon />

                <input
                  ref={modalInputRef}
                  autoFocus
                  type="text"
                  value={searchValue}
                  placeholder="Search layers, designers, SKUs, orders, returns, settlements..."
                  aria-label="Search layers"
                  onChange={(event) => {
                    setSearchValue(
                      event.target.value
                    );
                  }}
                />

                <button
                  type="button"
                  className="search-close"
                  onClick={closeSearch}
                  aria-label="Close search"
                >
                  <CloseIcon />
                </button>
              </div>

              {/* SEARCH RESULTS */}

              <div className="search-results">

                <div className="search-results-title">
                  {currentUser ? `Authorized Layers (${filteredLayers.length})` : `Layers (${filteredLayers.length})`}
                </div>

                {filteredLayers.length > 0 ? (

                  filteredLayers.map(
                    (layer, index) => {

                      const isActive =
                        index === activeIndex;

                      return (
                        <Link
                          key={layer.n}
                          to={layer.path}
                          className={`search-result-item ${
                            isActive
                              ? "active"
                              : ""
                          }`}
                          onMouseEnter={() => {
                            setActiveIndex(index);
                          }}
                          onClick={() => {
                            closeSearch();
                          }}
                        >
                          <div className="search-result-left">

                            <span className="search-layer-number">
                              {layer.n}
                            </span>

                            <span className="search-layer-separator">
                              -
                            </span>

                            <span className="search-layer-name">
                              {layer.name}
                            </span>

                          </div>

                          <span className="search-layer-group">
                            {layer.group}
                          </span>

                        </Link>
                      );
                    }
                  )

                ) : (

                  <div className="search-no-results">
                    No results found
                  </div>

                )}

              </div>
            </div>
          </>
        )}
      </div>

      {/* =================================================
          USER INFORMATION (SWITCH ROLE / LOGIN)
      ================================================= */}

      <Link
        to="/login"
        className="home-user"
        title="Click to switch role or sign in"
      >
        <UserIcon />

        <span className="home-user-name">
          {currentUser ? currentUser.user : "Sign In"}
        </span>

        <span className="home-admin">
          {currentUser ? currentUser.shortRole : "Role"}
        </span>
      </Link>

    </div>
  );
}

export default SearchBar;