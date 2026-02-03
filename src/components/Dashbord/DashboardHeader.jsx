import React, { useState, useEffect, useRef } from 'react'
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
  filterRef,
  loadingFilterOptions
}) => {
  const hasActiveFilters = getActiveFilterCount() > 0;
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Range selection state (UI only - functionality disabled)
  const [rangeMode, setRangeMode] = useState(false);
  const [rangeStart, setRangeStart] = useState(null);
  const [rangeEnd, setRangeEnd] = useState(null);
  const [hoveredDate, setHoveredDate] = useState(null);
  
  // Get available dates from props
  const getAvailableDates = () => {
    const dateOptions = getFilterOptions("date") || [];
    // Extract just the date part (YYYY-MM-DD) from the options
    return dateOptions.map(option => {
      // Handle both ISO string and date object
      const dateStr = option.id || option.text || '';
      // Extract YYYY-MM-DD part
      return dateStr.split('T')[0];
    }).filter(date => date); // Remove empty strings
  };

  // Get available dates
  const availableDates = getAvailableDates();

  // Navigate to previous month
  const prevMonth = () => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() - 1);
      return newDate;
    });
  };

  // Navigate to next month
  const nextMonth = () => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + 1);
      return newDate;
    });
  };

  // Format date for comparison
  const formatDateForComparison = (date) => {
    return date.toISOString().split('T')[0];
  };

  // Check if a date has data (is in the available dates)
  const dateHasData = (date) => {
    const dateStr = formatDateForComparison(date);
    return availableDates.includes(dateStr);
  };

  // Check if a date is selected
  const isDateSelected = (date) => {
    const dateStr = formatDateForComparison(date);
    return selectedFilters.date?.includes(dateStr) || false;
  };

  // UI-only function to check if date is in range (for visual display)
  const isDateInRange = (date) => {
    if (!rangeStart || !rangeEnd) return false;
    
    const dateStr = formatDateForComparison(date);
    const startStr = formatDateForComparison(rangeStart);
    const endStr = formatDateForComparison(rangeEnd);
    
    const dateTime = new Date(dateStr).getTime();
    const startTime = new Date(startStr).getTime();
    const endTime = new Date(endStr).getTime();
    
    const sortedStart = Math.min(startTime, endTime);
    const sortedEnd = Math.max(startTime, endTime);
    
    return dateTime >= sortedStart && dateTime <= sortedEnd;
  };

  // UI-only function to check if date is range start
  const isRangeStart = (date) => {
    if (!rangeStart) return false;
    const dateStr = formatDateForComparison(date);
    const startStr = formatDateForComparison(rangeStart);
    return dateStr === startStr;
  };

  // UI-only function to check if date is range end
  const isRangeEnd = (date) => {
    if (!rangeEnd) return false;
    const dateStr = formatDateForComparison(date);
    const endStr = formatDateForComparison(rangeEnd);
    return dateStr === endStr;
  };

  // UI-only function to check if date is in hover range
  const isDateInHoverRange = (date) => {
    if (!rangeStart || !hoveredDate) return false;
    if (rangeEnd) return false;
    
    const dateStr = formatDateForComparison(date);
    const startStr = formatDateForComparison(rangeStart);
    const hoverStr = formatDateForComparison(hoveredDate);
    
    const dateTime = new Date(dateStr).getTime();
    const startTime = new Date(startStr).getTime();
    const hoverTime = new Date(hoverStr).getTime();
    
    const sortedStart = Math.min(startTime, hoverTime);
    const sortedEnd = Math.max(startTime, hoverTime);
    
    return dateTime >= sortedStart && dateTime <= sortedEnd;
  };

  // Handle date selection - range functionality disabled
  const handleDateSelect = (date) => {
    if (!dateHasData(date)) return;
    
    if (rangeMode) {
      // UI-only range selection (no actual filtering)
      if (!rangeStart) {
        // First click - set start date
        setRangeStart(date);
      } else if (!rangeEnd) {
        // Second click - set end date
        setRangeEnd(date);
      } else {
        // Third click - reset and start new range
        setRangeStart(date);
        setRangeEnd(null);
        setHoveredDate(null);
      }
    } else {
      // Original single date selection (functional)
      const dateStr = formatDateForComparison(date);
      
      // Find the option object for this date
      const dateOptions = getFilterOptions("date") || [];
      const option = dateOptions.find(opt => {
        const optDateStr = (opt.id || opt.text || '').split('T')[0];
        return optDateStr === dateStr;
      });
      
      // Toggle date selection
      if (selectedFilters.date?.includes(dateStr)) {
        removeFilter('date', dateStr);
      } else {
        handleFilterCheckboxChange('date', dateStr, {
          id: dateStr,
          text: dateStr,
          displayText: option?.displayText || new Date(dateStr).toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })
        });
      }
    }
  };

  // Toggle range mode
  const toggleRangeMode = () => {
    setRangeMode(!rangeMode);
    setRangeStart(null);
    setRangeEnd(null);
    setHoveredDate(null);
  };

  // Clear range selection (UI only)
  const clearRangeSelection = () => {
    setRangeStart(null);
    setRangeEnd(null);
    setHoveredDate(null);
  };

  // Render calendar
  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // Get first day of month
    const firstDay = new Date(year, month, 1);
    // Get last day of month
    const lastDay = new Date(year, month + 1, 0);
    // Get day of week for first day (0 = Sunday, 1 = Monday, etc.)
    const firstDayOfWeek = firstDay.getDay();
    // Total days in month
    const daysInMonth = lastDay.getDate();
    
    const days = [];
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    // Add empty cells for days before first day of month
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const hasData = dateHasData(date);
      const isSelected = isDateSelected(date);
      const isToday = formatDateForComparison(date) === formatDateForComparison(new Date());
      const isInPast = date < new Date(new Date().setHours(0, 0, 0, 0));
      
      // Range selection states (UI only)
      const inRange = rangeMode && (isDateInRange(date) || isDateInHoverRange(date));
      const isStart = rangeMode && isRangeStart(date);
      const isEnd = rangeMode && isRangeEnd(date);
      
      days.push(
        <div
          key={`day-${day}`}
          className={`calendar-day 
            ${hasData ? 'has-data' : 'no-data'} 
            ${isSelected ? 'selected' : ''} 
            ${isToday ? 'today' : ''}
            ${isInPast && !hasData ? 'past-date' : ''}
            ${inRange ? 'in-range' : ''}
            ${isStart ? 'range-start' : ''}
            ${isEnd ? 'range-end' : ''}`}
          onClick={() => hasData && handleDateSelect(date)}
          onMouseEnter={() => hasData && rangeMode && !rangeEnd && setHoveredDate(date)}
          onMouseLeave={() => hasData && rangeMode && !rangeEnd && setHoveredDate(null)}
          title={
            hasData 
              ? `Select ${date.toLocaleDateString()}`
              : isInPast 
                ? 'No data available for this past date'
                : 'No data available'
          }
        >
          {day}
          {hasData && <span className="data-indicator" title="Has site note data"></span>}
          {isSelected && <span className="selection-indicator" title="Selected"></span>}
          {isStart && <span className="range-indicator start" title="Range start"></span>}
          {isEnd && <span className="range-indicator end" title="Range end"></span>}
        </div>
      );
    }
    
    return (
      <div className="calendar-container">
        {/* Calendar Header with Month Navigation */}
        <div className="calendar-header">
          <button 
            className="calendar-nav-btn" 
            onClick={prevMonth}
            title="Previous month"
          >
            <i className="fas fa-chevron-left" />
          </button>
          <div className="calendar-month-year">
            {currentMonth.toLocaleDateString('en-US', { 
              month: 'long', 
              year: 'numeric' 
            })}
          </div>
          <button 
            className="calendar-nav-btn" 
            onClick={nextMonth}
            title="Next month"
          >
            <i className="fas fa-chevron-right" />
          </button>
        </div>
        
        {/* Range Toggle Button - Placed under month section */}
        <div className="range-toggle-section">
          <button
            className={`range-toggle-btn ${rangeMode ? 'active' : ''}`}
            onClick={toggleRangeMode}
            title={rangeMode ? "Switch to single date selection" : "Switch to date range selection"}
          >
            <i className={`fas ${rangeMode ? 'fa-calendar-week' : 'fa-calendar-day'}`} />
            {rangeMode ? 'Range Selection' : 'Single Selection'}
          </button>
        </div>
        
        {/* Range Selection Info (when in range mode) */}
        {rangeMode && (rangeStart || rangeEnd) && (
          <div className="range-selection-info">
            <div className="range-info">
              <span className="range-label">Range:</span>
              <span className="range-dates">
                {rangeStart && (
                  <span className="range-date start">
                    {rangeStart.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                )}
                {rangeStart && rangeEnd && (
                  <span className="range-separator">
                    <i className="fas fa-arrow-right" />
                  </span>
                )}
                {rangeEnd && (
                  <span className="range-date end">
                    {rangeEnd.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                )}
              </span>
            </div>
           
            {(rangeStart || rangeEnd) && (
              <button 
                className="range-action-btn clear"
                onClick={clearRangeSelection}
                title="Clear range selection"
              >
                <i className="fas fa-times" /> 
              </button>
            )}
          </div>
        )}
        
        {/* Weekday Headers */}
        <div className="calendar-weekdays">
          {weekdays.map(day => (
            <div key={day} className="weekday-header">{day}</div>
          ))}
        </div>
        
        {/* Calendar Days */}
        <div className="calendar-days">
          {days}
        </div>
        
        {/* Range Mode Instructions */}
        
      </div>
    );
  };

  // Helper function to render dropdown content with loading state
  const renderDropdownContent = (filterType, options, isLoading = false, emptyMessage = null) => {
    // Special case for date filter - show calendar instead
    if (filterType === 'date') {
      return (
        <div className="dropdown-content calendar-dropdown">
          {isLoading ? (
            <div className="loading-message">
              <i className="fas fa-spinner fa-spin" />
              Loading available dates...
            </div>
          ) : (
            <>
              {availableDates.length === 0 ? (
                <div className="empty-filter-message">
                  <i className="fas fa-calendar-times" />
                  No site note dates available
                </div>
              ) : (
                <>
                  {renderCalendar()}
                </>
              )}
            </>
          )}
        </div>
      );
    }
    
    const shouldShowEmptyMessage = emptyMessage && options.length === 0 && !isLoading;
    
    return (
      <div className="dropdown-content">
        <div className="dropdown-search">
          <input
            type="text"
            placeholder={`Search ${filterType}s...`}
            value={filterSearchTerm}
            onChange={(e) => setFilterSearchTerm(e.target.value)}
            className="dropdown-search-input"
            disabled={isLoading}
          />
        </div>
        <div className="dropdown-list">
          {isLoading ? (
            <div className="loading-message">
              <i className="fas fa-spinner fa-spin" />
              Loading options...
            </div>
          ) : shouldShowEmptyMessage ? (
            <div className="empty-filter-message">{emptyMessage}</div>
          ) : (
            options.map((option) => (
              <div
                key={option.id || option.text}
                className="checkbox-item"
                onClick={() =>
                  handleFilterCheckboxChange(
                    filterType,
                    option.id || option.text,
                    option
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
  const renderMobileDropdownContent = (filterType, options, isLoading = false, emptyMessage = null) => {
    // Special case for date filter - show calendar instead
    if (filterType === 'date') {
      return (
        <div className="mobile-dropdown-content calendar-dropdown mobile">
          {isLoading ? (
            <div className="loading-message">
              <i className="fas fa-spinner fa-spin" />
              Loading available dates...
            </div>
          ) : (
            <>
              {availableDates.length === 0 ? (
                <div className="empty-filter-message">
                  <i className="fas fa-calendar-times" />
                  No site note dates available
                </div>
              ) : (
                <>
                  {renderCalendar()}
                </>
              )}
            </>
          )}
        </div>
      );
    }
    
    const shouldShowEmptyMessage = emptyMessage && options.length === 0 && !isLoading;
    
    return (
      <div className="mobile-dropdown-content">
        <div className="dropdown-search">
          <input
            type="text"
            placeholder={`Search ${filterType}s...`}
            value={filterSearchTerm}
            onChange={(e) => setFilterSearchTerm(e.target.value)}
            className="dropdown-search-input"
            disabled={isLoading}
          />
        </div>
        <div className="dropdown-list">
          {isLoading ? (
            <div className="loading-message">
              <i className="fas fa-spinner fa-spin" />
              Loading options...
            </div>
          ) : shouldShowEmptyMessage ? (
            <div className="empty-filter-message">{emptyMessage}</div>
          ) : (
            options.map((option) => (
              <div
                key={option.id || option.text}
                className="checkbox-item"
                onClick={() =>
                  handleFilterCheckboxChange(
                    filterType,
                    option.id || option.text,
                    option
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

  // Function to get appropriate empty message based on filter type
  const getEmptyMessage = (filterType) => {
    switch (filterType) {
      case 'project':
        return "No projects available for the current filter combination";
      case 'job':
        return "No jobs available for the current filter combination";
      case 'date':
        return "No dates available for the current filter combination";
      case 'workspace':
        return "No workspaces available";
      case 'userName':
        return "No users available for the current filter combination";
      default:
        return "No options available";
    }
  };

  return (
    <div className="dashboard-header">
      {/* Filters section (desktop) */}
      {!isMobile && (
        <div className="filter-two-column-layout">
          {/* Left side: Filters */}
          <div ref={filterRef} className="filters-column">
            <div className="filters-row">
              {/* Date Filter - Now with calendar */}
              <div className="filter-dropdown calendar-dropdown-wrapper">
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
                  getFilterOptions("date"),
                  loadingFilterOptions["date"],
                  getEmptyMessage("date")
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
                  getFilterOptions("workspace"),
                  loadingFilterOptions["workspace"],
                  getEmptyMessage("workspace")
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
                  loadingFilterOptions["project"],
                  getEmptyMessage("project")
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
                  loadingFilterOptions["job"],
                  getEmptyMessage("job")
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
                  getFilterOptions("userName"),
                  loadingFilterOptions["userName"],
                  getEmptyMessage("userName")
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
              {/* Date Filter for mobile - Now with calendar */}
              <div className="mobile-filter-group calendar-filter-group">
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
                  getFilterOptions("date"),
                  loadingFilterOptions["date"],
                  getEmptyMessage("date")
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
                  getFilterOptions("workspace"),
                  loadingFilterOptions["workspace"],
                  getEmptyMessage("workspace")
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
                  loadingFilterOptions["project"],
                  getEmptyMessage("project")
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
                  loadingFilterOptions["job"],
                  getEmptyMessage("job")
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
                  getFilterOptions("userName"),
                  loadingFilterOptions["userName"],
                  getEmptyMessage("userName")
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