import React from 'react'
import './DashboardHeader.css'

const DashboardHeader = ({
  isMobile,
  mobileFiltersOpen,
  setMobileFiltersOpen,
  selectedFilters,
  filterDropdownOpen,
  toggleFilterDropdown,
  filterSearchTerm,
  setFilterSearchTerm,
  handleFilterCheckboxChange,
  getFilterOptions,
  getFilterButtonLabel,
  clearAllFilters,
  getActiveFilterCount,
  removeFilter,
  getFilterDisplayValue,
  filterRef
}) => {
  const hasActiveFilters = getActiveFilterCount() > 0;

  // Helper function to render dropdown content without outer scroll
  const renderDropdownContent = (filterType, options, emptyMessage = null) => {
    const shouldShowEmptyMessage = emptyMessage && options.length === 0;
    
    return (
      <div className="dropdown-content">
        <div className="dropdown-search">
          <input
            type="text"
            placeholder={`Search ${filterType}s...`}
            value={filterSearchTerm}
            onChange={(e) => setFilterSearchTerm(e.target.value)}
            className="dropdown-search-input"
          />
        </div>
        <div className="dropdown-list">
          {shouldShowEmptyMessage ? (
            <div className="empty-filter-message">{emptyMessage}</div>
          ) : (
            options.map((option) => (
              <div
                key={option.id || option.text}
                className="checkbox-item"
                onClick={() =>
                  handleFilterCheckboxChange(
                    filterType,
                    option.id || option.text
                  )
                }
              >
                <input
                  type="checkbox"
                  checked={selectedFilters[filterType]?.includes(
                    option.id || option.text
                  )}
                  onChange={() => {}}
                  className="checkbox"
                />
                <span>{option.displayText || option.text}</span>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  // Helper function to render mobile dropdown content
  const renderMobileDropdownContent = (filterType, options, emptyMessage = null) => {
    const shouldShowEmptyMessage = emptyMessage && options.length === 0;
    
    return (
      <div className="mobile-dropdown-content">
        <div className="dropdown-search">
          <input
            type="text"
            placeholder={`Search ${filterType}s...`}
            value={filterSearchTerm}
            onChange={(e) => setFilterSearchTerm(e.target.value)}
            className="dropdown-search-input"
          />
        </div>
        <div className="dropdown-list">
          {shouldShowEmptyMessage ? (
            <div className="empty-filter-message">{emptyMessage}</div>
          ) : (
            options.map((option) => (
              <div
                key={option.id || option.text}
                className="checkbox-item"
                onClick={() =>
                  handleFilterCheckboxChange(
                    filterType,
                    option.id || option.text
                  )
                }
              >
                <input
                  type="checkbox"
                  checked={selectedFilters[filterType]?.includes(
                    option.id || option.text
                  )}
                  onChange={() => {}}
                  className="checkbox"
                />
                <span>{option.displayText || option.text}</span>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="dashboard-header">
      {/* Filters section (desktop) */}
      {!isMobile && (
        <div className="filter-two-column-layout">
          {/* Left side: Filters */}
          <div ref={filterRef} className="filters-column">
            <div className="filters-row">
              {/* Date Filter */}
              <div className="filter-dropdown">
                <button
                  className="filter-button"
                  onClick={() => toggleFilterDropdown("date")}
                >
                  {getFilterButtonLabel("date")}
                  <i
                    className={`fas fa-chevron-${
                      filterDropdownOpen === "date" ? "up" : "down"
                    }`}
                  />
                </button>
                {filterDropdownOpen === "date" && renderDropdownContent(
                  "date", 
                  getFilterOptions("date")
                )}
              </div>

              {/* Workspace Filter */}
              <div className="filter-dropdown">
                <button
                  className="filter-button"
                  onClick={() => toggleFilterDropdown("workspace")}
                >
                  {getFilterButtonLabel("workspace")}
                  <i
                    className={`fas fa-chevron-${
                      filterDropdownOpen === "workspace" ? "up" : "down"
                    }`}
                  />
                </button>
                {filterDropdownOpen === "workspace" && renderDropdownContent(
                  "workspace", 
                  getFilterOptions("workspace")
                )}
              </div>

              {/* Project Filter */}
              <div className="filter-dropdown">
                <button
                  className="filter-button"
                  onClick={() => toggleFilterDropdown("project")}
                  title="Filter by project"
                >
                  {getFilterButtonLabel("project")}
                  <i
                    className={`fas fa-chevron-${
                      filterDropdownOpen === "project" ? "up" : "down"
                    }`}
                  />
                </button>
                {filterDropdownOpen === "project" && renderDropdownContent(
                  "project", 
                  getFilterOptions("project"),
                  selectedFilters.workspace && selectedFilters.workspace.length > 0
                    ? "No projects found for the selected workspace(s)"
                    : "No projects available"
                )}
              </div>

              {/* Job Filter */}
              <div className="filter-dropdown">
                <button
                  className="filter-button"
                  onClick={() => toggleFilterDropdown("job")}
                  title="Filter by job"
                >
                  {getFilterButtonLabel("job")}
                  <i
                    className={`fas fa-chevron-${
                      filterDropdownOpen === "job" ? "up" : "down"
                    }`}
                  />
                </button>
                {filterDropdownOpen === "job" && renderDropdownContent(
                  "job", 
                  getFilterOptions("job"),
                  selectedFilters.project && selectedFilters.project.length > 0
                    ? "No jobs found for the selected project(s)"
                    : selectedFilters.workspace && selectedFilters.workspace.length > 0
                    ? "No jobs found for the selected workspace(s)"
                    : "No jobs available"
                )}
              </div>

              {/* User Filter */}
              <div className="filter-dropdown">
                <button
                  className="filter-button"
                  onClick={() => toggleFilterDropdown("userName")}
                >
                  {getFilterButtonLabel("userName")}
                  <i
                    className={`fas fa-chevron-${
                      filterDropdownOpen === "userName" ? "up" : "down"
                    }`}
                  />
                </button>
                {filterDropdownOpen === "userName" && renderDropdownContent(
                  "userName", 
                  getFilterOptions("userName")
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Filters Display with Clear Button Below */}
      {hasActiveFilters && (
        <div className="active-filters-container">
          <div className="active-filters-content">
            {Object.entries(selectedFilters).map(([filterType, values]) =>
              values.map((value) => (
                <span
                  key={`${filterType}-${value}`}
                  className="filter-tag"
                >
                  <span className="filter-type">
                    {filterType}
                  </span>
                  : {getFilterDisplayValue(filterType, value)}
                  <button
                    onClick={() => removeFilter(filterType, value)}
                    className="filter-tag-remove"
                    title="Remove filter"
                  >
                    ×
                  </button>
                </span>
              ))
            )}
          </div>
          <button
            onClick={clearAllFilters}
            className="clear-all-button"
          >
            <i className="fas fa-times-circle" />
            Clear All Filters
            <span className="clear-filter-count">
              ({getActiveFilterCount()})
            </span>
          </button>
        </div>
      )}

      {/* Mobile filters button and modal */}
      {isMobile && (
        <div className="mobile-header-row">
          <button
            className="mobile-filters-btn"
            onClick={() => setMobileFiltersOpen(true)}
          >
            <i className="fas fa-filter" />
            {hasActiveFilters && (
              <span className="filter-badge">
                {getActiveFilterCount()}
              </span>
            )}
          </button>
          
        </div>
      )}

      {isMobile && mobileFiltersOpen && (
        <div className="mobile-filters-overlay" onClick={() => setMobileFiltersOpen(false)}>
          <div className="mobile-filters-panel" onClick={e => e.stopPropagation()}>
            <div className="mobile-filters-header">
              <h3>Filters</h3>
              <button
                className="close-button"
                onClick={() => setMobileFiltersOpen(false)}
              >
                <i className="fas fa-times" />
              </button>
            </div>
            
            <div className="mobile-filters-content">
              {/* Date Filter for mobile */}
              <div className="mobile-filter-group">
                <div
                  className="mobile-filter-button"
                  onClick={() => toggleFilterDropdown("date")}
                >
                  {getFilterButtonLabel("date")}
                  <i
                    className={`fas fa-chevron-${
                      filterDropdownOpen === "date" ? "up" : "down"
                    }`}
                  />
                </div>
                {filterDropdownOpen === "date" && renderMobileDropdownContent(
                  "date",
                  getFilterOptions("date")
                )}
              </div>
              
              {/* Workspace Filter for mobile */}
              <div className="mobile-filter-group">
                <div
                  className="mobile-filter-button"
                  onClick={() => toggleFilterDropdown("workspace")}
                >
                  {getFilterButtonLabel("workspace")}
                  <i
                    className={`fas fa-chevron-${
                      filterDropdownOpen === "workspace" ? "up" : "down"
                    }`}
                  />
                </div>
                {filterDropdownOpen === "workspace" && renderMobileDropdownContent(
                  "workspace",
                  getFilterOptions("workspace")
                )}
              </div>
              
              {/* Project Filter for mobile */}
              <div className="mobile-filter-group">
                <div
                  className="mobile-filter-button"
                  onClick={() => toggleFilterDropdown("project")}
                >
                  {getFilterButtonLabel("project")}
                  <i
                    className={`fas fa-chevron-${
                      filterDropdownOpen === "project" ? "up" : "down"
                    }`}
                  />
                </div>
                {filterDropdownOpen === "project" && renderMobileDropdownContent(
                  "project",
                  getFilterOptions("project"),
                  selectedFilters.workspace && selectedFilters.workspace.length > 0
                    ? "No projects found for the selected workspace(s)"
                    : "No projects available"
                )}
              </div>
              
              {/* Job Filter for mobile */}
              <div className="mobile-filter-group">
                <div
                  className="mobile-filter-button"
                  onClick={() => toggleFilterDropdown("job")}
                >
                  {getFilterButtonLabel("job")}
                  <i
                    className={`fas fa-chevron-${
                      filterDropdownOpen === "job" ? "up" : "down"
                    }`}
                  />
                </div>
                {filterDropdownOpen === "job" && renderMobileDropdownContent(
                  "job",
                  getFilterOptions("job"),
                  selectedFilters.project && selectedFilters.project.length > 0
                    ? "No jobs found for the selected project(s)"
                    : selectedFilters.workspace && selectedFilters.workspace.length > 0
                    ? "No jobs found for the selected workspace(s)"
                    : "No jobs available"
                )}
              </div>
              
              {/* User Filter for mobile */}
              <div className="mobile-filter-group">
                <div
                  className="mobile-filter-button"
                  onClick={() => toggleFilterDropdown("userName")}
                >
                  {getFilterButtonLabel("userName")}
                  <i
                    className={`fas fa-chevron-${
                      filterDropdownOpen === "userName" ? "up" : "down"
                    }`}
                  />
                </div>
                {filterDropdownOpen === "userName" && renderMobileDropdownContent(
                  "userName",
                  getFilterOptions("userName")
                )}
              </div>
            </div>
            
          </div>
        </div>
      )}
    </div>
  )
}

export default DashboardHeader