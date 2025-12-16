import React from 'react'

const DashboardHeader = ({
  searchTerm,
  setSearchTerm,
  searchColumn,
  setSearchColumn,
  viewMode,
  setViewMode,
  handleRefresh,
  handleNewNoteClick,
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
  styles
}) => {
  return (
    <div className="top-fixed-section">
      <div style={styles.searchBox}>
        <div
          style={{
            position: "relative",
            flex: 1,
            minWidth: "200px",
          }}
        >
          <input
            id="searchInput"
            type="text"
            placeholder={
              searchColumn
                ? `Search by ${searchColumn}...`
                : "Search notes..."
            }
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
            }}
            style={{
              ...styles.searchInput,
              paddingRight: searchTerm ? "30px" : "12px",
              width: "100%",
              boxSizing: "border-box",
            }}
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm("");
              }}
              style={{
                position: "absolute",
                right: "8px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#666",
                fontSize: "18px",
                padding: "4px",
                borderRadius: "50%",
                width: "20px",
                height: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "#f0f0f0";
                e.target.style.color = "#333";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "transparent";
                e.target.style.color = "#666";
              }}
              title="Clear search"
            >
              ×
            </button>
          )}
        </div>
        {searchColumn && (
          <span style={styles.searchHint}>
            Searching in: {searchColumn}
            <button
              onClick={() => {
                setSearchColumn("");
                setSearchTerm("");
              }}
              style={styles.clearGroupBtn}
            >
              ×
            </button>
          </span>
        )}
        <div
          className="view-toggle-container"
          style={{
            display: "flex",
            gap: "8px",
            alignItems: "center",
            height: "36px",
          }}
        >
          <button
            onClick={() => setViewMode("table")}
            className={`view-toggle-btn ${
              viewMode === "table" ? "active" : ""
            }`}
            style={{
              border: "1px solid #ddd",
              background: viewMode === "table" ? "#1976d2" : "white",
              color: viewMode === "table" ? "white" : "#333",
              borderRadius: "4px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              height: "36px",
              width: "36px",
            }}
            title="Table View"
          >
            <i className="fas fa-table" />
          </button>
          <button
            onClick={() => setViewMode("cards")}
            className={`view-toggle-btn ${
              viewMode === "cards" ? "active" : ""
            }`}
            style={{
              border: "1px solid #ddd",
              background: viewMode === "cards" ? "#1976d2" : "white",
              color: viewMode === "cards" ? "white" : "#333",
              borderRadius: "4px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              height: "36px",
              width: "36px",
            }}
            title="Card View"
          >
            <i className="fas fa-th" />
          </button>
          <button
            onClick={() => setViewMode("stacked")}
            className={`view-toggle-btn ${
              viewMode === "stacked" ? "active" : ""
            }`}
            style={{
              border: "1px solid #ddd",
              background: viewMode === "stacked" ? "#1976d2" : "white",
              color: viewMode === "stacked" ? "white" : "#333",
              borderRadius: "4px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              height: "36px",
              width: "36px",
            }}
            title="Stacked View"
          >
            <i className="fas fa-layer-group" />
          </button>
        </div>
        <button
          onClick={handleRefresh}
          style={{
            background: "#1976d2",
            border: "none",
            width: 36,
            height: 36,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
          }}
        >
          <i className="fas fa-sync-alt" />
        </button>
        <button
          onClick={handleNewNoteClick}
          style={{
            backgroundColor: "#1976d2",
            color: "#fff",
            border: "none",
            padding: "8px 16px",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          <i className="fas fa-plus-circle" /> New Note
        </button>
      
      {isMobile && (
        <button
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            backgroundColor: '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            cursor: 'pointer',
            fontSize: '16px',
            position: 'relative',
          }}
          onClick={() => setMobileFiltersOpen(true)}
        >
          <i className="fas fa-filter" />
          
          {(selectedFilters.date.length > 0 || 
            selectedFilters.workspace.length > 0 || 
            selectedFilters.project.length > 0 || 
            selectedFilters.job.length > 0 || 
            selectedFilters.userName.length > 0) && (
            <span style={{
              color: 'white',
              borderRadius: '50%',
              width: '20px',
              height: '20px',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginLeft: '5px'
            }}>
              {selectedFilters.date.length + 
               selectedFilters.workspace.length + 
               selectedFilters.project.length + 
               selectedFilters.job.length + 
               selectedFilters.userName.length}
            </span>
          )}
        </button>
      )}
      </div>
      {isMobile && mobileFiltersOpen && (
        <div style={styles.mobileFiltersContainer} onClick={() => setMobileFiltersOpen(false)}>
          <div style={styles.mobileFiltersPanel} onClick={e => e.stopPropagation()}>
            <div style={styles.mobileFiltersHeader}>
              <h3 style={{ margin: 0 }}>Filters</h3>
              <button
                style={styles.closeButton}
                onClick={() => setMobileFiltersOpen(false)}
              >
                <i className="fas fa-times" />
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {/* Date Filter for mobile */}
              <div style={{ marginBottom: '10px' }}>
                <div
                  style={{
                    ...styles.filterButton,
                    width: '100%',
                    justifyContent: 'space-between',
                    marginBottom: filterDropdownOpen === "date" ? '10px' : '0'
                  }}
                  onClick={() => toggleFilterDropdown("date")}
                >
                  {getFilterButtonLabel("date")}
                  <i
                    className={`fas fa-chevron-${
                      filterDropdownOpen === "date" ? "up" : "down"
                    }`}
                    style={{ fontSize: "12px" }}
                  />
                </div>
                {filterDropdownOpen === "date" && (
                  <div style={{ ...styles.dropdownContent, position: 'static', width: '100%' }}>
                    <div style={styles.dropdownSearch}>
                      <input
                        type="text"
                        placeholder="Search dates..."
                        value={filterSearchTerm}
                        onChange={(e) => setFilterSearchTerm(e.target.value)}
                        style={styles.dropdownSearchInput}
                      />
                    </div>
                    <div style={styles.dropdownList}>
                      {getFilterOptions("date").map((option) => (
                        <div
                          key={option.id || option.text}
                          style={styles.checkboxItem}
                          onClick={() =>
                            handleFilterCheckboxChange(
                              "date",
                              option.id || option.text
                            )
                          }
                        >
                          <input
                            type="checkbox"
                            checked={selectedFilters.date.includes(
                              option.id || option.text
                            )}
                            onChange={() => {}}
                            style={styles.checkbox}
                          />
                          <span style={{ fontSize: "14px" }}>
                            {option.displayText}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Workspace Filter for mobile */}
              <div style={{ marginBottom: '10px' }}>
                <div
                  style={{
                    ...styles.filterButton,
                    width: '100%',
                    justifyContent: 'space-between',
                    marginBottom: filterDropdownOpen === "workspace" ? '10px' : '0'
                  }}
                  onClick={() => toggleFilterDropdown("workspace")}
                >
                  {getFilterButtonLabel("workspace")}
                  <i
                    className={`fas fa-chevron-${
                      filterDropdownOpen === "workspace" ? "up" : "down"
                    }`}
                    style={{ fontSize: "12px" }}
                  />
                </div>
                {filterDropdownOpen === "workspace" && (
                  <div style={{ ...styles.dropdownContent, position: 'static', width: '100%' }}>
                    <div style={styles.dropdownSearch}>
                      <input
                        type="text"
                        placeholder="Search workspaces..."
                        value={filterSearchTerm}
                        onChange={(e) => setFilterSearchTerm(e.target.value)}
                        style={styles.dropdownSearchInput}
                      />
                    </div>
                    <div style={styles.dropdownList}>
                      {getFilterOptions("workspace").map((option) => (
                        <div
                          key={option.id}
                          style={styles.checkboxItem}
                          onClick={() =>
                            handleFilterCheckboxChange("workspace", option.id)
                          }
                        >
                          <input
                            type="checkbox"
                            checked={selectedFilters.workspace.includes(
                              option.id
                            )}
                            onChange={() => {}}
                            style={styles.checkbox}
                          />
                          <span style={{ fontSize: "14px" }}>{option.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Project Filter for mobile */}
              <div style={{ marginBottom: '10px' }}>
                <div
                  style={{
                    ...styles.filterButton,
                    width: '100%',
                    justifyContent: 'space-between',
                    marginBottom: filterDropdownOpen === "project" ? '10px' : '0'
                  }}
                  onClick={() => toggleFilterDropdown("project")}
                >
                  {getFilterButtonLabel("project")}
                  <i
                    className={`fas fa-chevron-${
                      filterDropdownOpen === "project" ? "up" : "down"
                    }`}
                    style={{ fontSize: "12px" }}
                  />
                </div>
                {filterDropdownOpen === "project" && (
                  <div style={styles.dropdownContent}>
                    <div style={styles.dropdownSearch}>
                      <input
                        type="text"
                        placeholder="Search projects..."
                        value={filterSearchTerm}
                        onChange={(e) => setFilterSearchTerm(e.target.value)}
                        style={styles.dropdownSearchInput}
                      />
                    </div>
                    <div style={styles.dropdownList}>
                      {getFilterOptions("project").length > 0 ? (
                        getFilterOptions("project").map((option) => (
                          <div
                            key={option.id}
                            style={styles.checkboxItem}
                            onClick={() =>
                              handleFilterCheckboxChange("project", option.id)
                            }
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "#f8f9fa";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor =
                                "transparent";
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={selectedFilters.project.includes(
                                option.id
                              )}
                              onChange={() => {}}
                              style={styles.checkbox}
                            />
                            <span style={{ fontSize: "14px" }}>
                              {option.text}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div style={styles.emptyFilterMessage}>
                          {selectedFilters.workspace &&
                          selectedFilters.workspace.length > 0
                            ? "No projects found for the selected workspace(s)"
                            : "No projects available"}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Job Filter for mobile */}
              <div style={{ marginBottom: '10px' }}>
                <div
                  style={{
                    ...styles.filterButton,
                    width: '100%',
                    justifyContent: 'space-between',
                    marginBottom: filterDropdownOpen === "job" ? '10px' : '0'
                  }}
                  onClick={() => toggleFilterDropdown("job")}
                >
                  {getFilterButtonLabel("job")}
                  <i
                    className={`fas fa-chevron-${
                      filterDropdownOpen === "job" ? "up" : "down"
                    }`}
                    style={{ fontSize: "12px" }}
                  />
                </div>
                {filterDropdownOpen === "job" && (
                  <div style={styles.dropdownContent}>
                    <div style={styles.dropdownSearch}>
                      <input
                        type="text"
                        placeholder="Search jobs..."
                        value={filterSearchTerm}
                        onChange={(e) => setFilterSearchTerm(e.target.value)}
                        style={styles.dropdownSearchInput}
                      />
                    </div>
                    <div style={styles.dropdownList}>
                      {getFilterOptions("job").length > 0 ? (
                        getFilterOptions("job").map((option) => (
                          <div
                            key={option.id}
                            style={styles.checkboxItem}
                            onClick={() =>
                              handleFilterCheckboxChange("job", option.id)
                            }
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "#f8f9fa";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor =
                                "transparent";
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={selectedFilters.job.includes(option.id)}
                              onChange={() => {}}
                              style={styles.checkbox}
                            />
                            <span style={{ fontSize: "14px" }}>
                              {option.text}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div style={styles.emptyFilterMessage}>
                          {selectedFilters.project &&
                          selectedFilters.project.length > 0
                            ? "No jobs found for the selected project(s)"
                            : selectedFilters.workspace &&
                              selectedFilters.workspace.length > 0
                            ? "No jobs found for the selected workspace(s)"
                            : "No jobs available"}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* User Filter for mobile */}
              <div style={{ marginBottom: '10px' }}>
                <div
                  style={{
                    ...styles.filterButton,
                    width: '100%',
                    justifyContent: 'space-between',
                    marginBottom: filterDropdownOpen === "userName" ? '10px' : '0'
                  }}
                  onClick={() => toggleFilterDropdown("userName")}
                >
                  {getFilterButtonLabel("userName")}
                  <i
                    className={`fas fa-chevron-${
                      filterDropdownOpen === "userName" ? "up" : "down"
                    }`}
                    style={{ fontSize: "12px" }}
                  />
                </div>
                {filterDropdownOpen === "userName" && (
                  <div style={styles.dropdownContent}>
                    <div style={styles.dropdownSearch}>
                      <input
                        type="text"
                        placeholder="Search users..."
                        value={filterSearchTerm}
                        onChange={(e) => setFilterSearchTerm(e.target.value)}
                        style={styles.dropdownSearchInput}
                      />
                    </div>
                    <div style={styles.dropdownList}>
                      {getFilterOptions("userName").map((option) => (
                        <div
                          key={option.id || option.text}
                          style={styles.checkboxItem}
                          onClick={() =>
                            handleFilterCheckboxChange(
                              "userName",
                              option.id || option.text
                            )
                          }
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#f8f9fa";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "transparent";
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedFilters.userName.includes(
                              option.id || option.text
                            )}
                            onChange={() => {}}
                            style={styles.checkbox}
                          />
                          <span style={{ fontSize: "14px" }}>{option.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Clear All Button for mobile */}
            <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
              <button
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#f8f9fa',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
                onClick={clearAllFilters}
                onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#5a6268";
                e.currentTarget.style.borderColor = "#545b62";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#6c757d";
                e.currentTarget.style.borderColor = "#6c757d";
              }}
              >
                Clear All Filters
              </button>
            </div>
          </div>
        </div>
      )}
      
      {!isMobile && (
        <div ref={filterRef} style={styles.filterContainer}>
          {/* Date Filter */}
          <div style={styles.filterDropdown}>
            <button
              style={styles.filterButton}
              onClick={() => toggleFilterDropdown("date")}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#3498db";
                e.currentTarget.style.boxShadow =
                  "0 0 0 2px rgba(52, 152, 219, 0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#ddd";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {getFilterButtonLabel("date")}
              <i
                className={`fas fa-chevron-${
                  filterDropdownOpen === "date" ? "up" : "down"
                }`}
                style={{ fontSize: "12px" }}
              />
            </button>
            {filterDropdownOpen === "date" && (
              <div style={styles.dropdownContent}>
                <div style={styles.dropdownSearch}>
                  <input
                    type="text"
                    placeholder="Search dates..."
                    value={filterSearchTerm}
                    onChange={(e) => setFilterSearchTerm(e.target.value)}
                    style={styles.dropdownSearchInput}
                  />
                </div>
                <div style={styles.dropdownList}>
                  {getFilterOptions("date").map((option) => (
                    <div
                      key={option.id || option.text}
                      style={styles.checkboxItem}
                      onClick={() =>
                        handleFilterCheckboxChange(
                          "date",
                          option.id || option.text
                        )
                      }
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#f8f9fa";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedFilters.date.includes(
                          option.id || option.text
                        )}
                        onChange={() => {}}
                        style={styles.checkbox}
                      />
                      <span style={{ fontSize: "14px" }}>
                        {option.displayText}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          {/* Workspace Filter */}
          <div style={styles.filterDropdown}>
            <button
              style={styles.filterButton}
              onClick={() => toggleFilterDropdown("workspace")}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#3498db";
                e.currentTarget.style.boxShadow =
                  "0 0 0 2px rgba(52, 152, 219, 0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#ddd";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {getFilterButtonLabel("workspace")}
              <i
                className={`fas fa-chevron-${
                  filterDropdownOpen === "workspace" ? "up" : "down"
                }`}
                style={{ fontSize: "12px" }}
              />
            </button>
            {filterDropdownOpen === "workspace" && (
              <div style={styles.dropdownContent}>
                <div style={styles.dropdownSearch}>
                  <input
                    type="text"
                    placeholder="Search workspaces..."
                    value={filterSearchTerm}
                    onChange={(e) => setFilterSearchTerm(e.target.value)}
                    style={styles.dropdownSearchInput}
                  />
                </div>
                <div style={styles.dropdownList}>
                  {getFilterOptions("workspace").map((option) => (
                    <div
                      key={option.id}
                      style={styles.checkboxItem}
                      onClick={() =>
                        handleFilterCheckboxChange("workspace", option.id)
                      }
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#f8f9fa";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedFilters.workspace.includes(
                          option.id
                        )}
                        onChange={() => {}}
                        style={styles.checkbox}
                      />
                      <span style={{ fontSize: "14px" }}>{option.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          {/* Project Filter */}
          <div style={styles.filterDropdown}>
            <button
              style={styles.filterButton}
              onClick={() => toggleFilterDropdown("project")}
              title="Filter by project"
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#3498db";
                e.currentTarget.style.boxShadow =
                  "0 0 0 2px rgba(52, 152, 219, 0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#ddd";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {getFilterButtonLabel("project")}
              <i
                className={`fas fa-chevron-${
                  filterDropdownOpen === "project" ? "up" : "down"
                }`}
                style={{ fontSize: "12px" }}
              />
            </button>
            {filterDropdownOpen === "project" && (
              <div style={styles.dropdownContent}>
                <div style={styles.dropdownSearch}>
                  <input
                    type="text"
                    placeholder="Search projects..."
                    value={filterSearchTerm}
                    onChange={(e) => setFilterSearchTerm(e.target.value)}
                    style={styles.dropdownSearchInput}
                  />
                </div>
                <div style={styles.dropdownList}>
                  {getFilterOptions("project").length > 0 ? (
                    getFilterOptions("project").map((option) => (
                      <div
                        key={option.id}
                        style={styles.checkboxItem}
                        onClick={() =>
                          handleFilterCheckboxChange("project", option.id)
                        }
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "#f8f9fa";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor =
                            "transparent";
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedFilters.project.includes(
                            option.id
                          )}
                          onChange={() => {}}
                          style={styles.checkbox}
                        />
                        <span style={{ fontSize: "14px" }}>
                          {option.text}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div style={styles.emptyFilterMessage}>
                      {selectedFilters.workspace &&
                      selectedFilters.workspace.length > 0
                        ? "No projects found for the selected workspace(s)"
                        : "No projects available"}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          {/* Job Filter */}
          <div style={styles.filterDropdown}>
            <button
              style={styles.filterButton}
              onClick={() => toggleFilterDropdown("job")}
              title="Filter by job"
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#3498db";
                e.currentTarget.style.boxShadow =
                  "0 0 0 2px rgba(52, 152, 219, 0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#ddd";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {getFilterButtonLabel("job")}
              <i
                className={`fas fa-chevron-${
                  filterDropdownOpen === "job" ? "up" : "down"
                }`}
                style={{ fontSize: "12px" }}
              />
            </button>
            {filterDropdownOpen === "job" && (
              <div style={styles.dropdownContent}>
                <div style={styles.dropdownSearch}>
                  <input
                    type="text"
                    placeholder="Search jobs..."
                    value={filterSearchTerm}
                    onChange={(e) => setFilterSearchTerm(e.target.value)}
                    style={styles.dropdownSearchInput}
                  />
                </div>
                <div style={styles.dropdownList}>
                  {getFilterOptions("job").length > 0 ? (
                    getFilterOptions("job").map((option) => (
                      <div
                        key={option.id}
                        style={styles.checkboxItem}
                        onClick={() =>
                          handleFilterCheckboxChange("job", option.id)
                        }
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "#f8f9fa";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor =
                            "transparent";
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedFilters.job.includes(option.id)}
                          onChange={() => {}}
                          style={styles.checkbox}
                        />
                        <span style={{ fontSize: "14px" }}>
                          {option.text}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div style={styles.emptyFilterMessage}>
                      {selectedFilters.project &&
                      selectedFilters.project.length > 0
                        ? "No jobs found for the selected project(s)"
                        : selectedFilters.workspace &&
                          selectedFilters.workspace.length > 0
                        ? "No jobs found for the selected workspace(s)"
                        : "No jobs available"}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          {/* User Filter */}
          <div style={styles.filterDropdown}>
            <button
              style={styles.filterButton}
              onClick={() => toggleFilterDropdown("userName")}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#3498db";
                e.currentTarget.style.boxShadow =
                  "0 0 0 2px rgba(52, 152, 219, 0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#ddd";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {getFilterButtonLabel("userName")}
              <i
                className={`fas fa-chevron-${
                  filterDropdownOpen === "userName" ? "up" : "down"
                }`}
                style={{ fontSize: "12px" }}
              />
            </button>
            {filterDropdownOpen === "userName" && (
              <div style={styles.dropdownContent}>
                <div style={styles.dropdownSearch}>
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={filterSearchTerm}
                    onChange={(e) => setFilterSearchTerm(e.target.value)}
                    style={styles.dropdownSearchInput}
                  />
                </div>
                <div style={styles.dropdownList}>
                  {getFilterOptions("userName").map((option) => (
                    <div
                      key={option.id || option.text}
                      style={styles.checkboxItem}
                      onClick={() =>
                        handleFilterCheckboxChange(
                          "userName",
                          option.id || option.text
                        )
                      }
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#f8f9fa";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedFilters.userName.includes(
                          option.id || option.text
                        )}
                        onChange={() => {}}
                        style={styles.checkbox}
                      />
                      <span style={{ fontSize: "14px" }}>{option.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Active Filters Display with Clear All Button */}
      {getActiveFilterCount() > 0 && (
        <div style={styles.activeFiltersContainer}>
          <div style={styles.activeFiltersContent}>
            {Object.entries(selectedFilters).map(([filterType, values]) =>
              values.map((value) => (
                <span
                  key={`${filterType}-${value}`}
                  style={styles.filterTag}
                >
                  <span style={{ textTransform: "capitalize" }}>
                    {filterType}
                  </span>
                  : {getFilterDisplayValue(filterType, value)}
                  <button
                    onClick={() => removeFilter(filterType, value)}
                    style={styles.filterTagRemove}
                    title="Remove filter"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "#e74c3c";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "#666";
                    }}
                  >
                    ×
                  </button>
                </span>
              ))
            )}
          </div>
          <button
            onClick={clearAllFilters}
            style={styles.clearAllButton}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#5a6268";
              e.currentTarget.style.borderColor = "#545b62";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#6c757d";
              e.currentTarget.style.borderColor = "#6c757d";
            }}
          >
            <i className="fas fa-times-circle" />
            Clear All Filters
          </button>
        </div>
      )}
    </div>
  )
}

export default DashboardHeader