// Constants
const API_URL = 'http://localhost:3000/api';

// State
const state = {
  recordings: [],
  filteredRecordings: [],
  selectedLanguages: new Set(),
  selectedTags: new Set(),
  allLanguages: new Set(),
  allTags: new Set()
};

// DOM Elements
const languageFiltersEl = document.getElementById('languageFilters');
const tagFiltersEl = document.getElementById('tagFilters');
const filteredRecordingsEl = document.getElementById('filteredRecordings');
const filterInfoEl = document.getElementById('filterInfo');
const selectAllBtn = document.getElementById('selectAllBtn');
const clearAllBtn = document.getElementById('clearAllBtn');

// Initialize the application
async function initApp() {
  await fetchRecordings();
  extractLanguagesAndTags();
  renderLanguageFilters();
  renderTagFilters();
  renderFilteredRecordings();
  updateFilterInfo();
  
  // Event listeners
  selectAllBtn.addEventListener('click', selectAllFilters);
  clearAllBtn.addEventListener('click', clearAllFilters);
}

// Fetch all recordings
async function fetchRecordings() {
  try {
    const response = await fetch(`${API_URL}/recordings`);
    
    if (!response.ok) {
      throw new Error('Server error');
    }
    
    state.recordings = await response.json();
    state.filteredRecordings = [...state.recordings];
  } catch (error) {
    console.error('Error fetching recordings:', error);
  }
}

// Extract unique languages and tags from recordings
function extractLanguagesAndTags() {
  state.allLanguages.clear();
  state.allTags.clear();
  
  state.recordings.forEach(recording => {
    if (recording.language) {
      state.allLanguages.add(recording.language);
      state.selectedLanguages.add(recording.language); // Select all languages by default
    }
    
    if (recording.tags && Array.isArray(recording.tags)) {
      recording.tags.forEach(tag => {
        state.allTags.add(tag);
        state.selectedTags.add(tag); // Select all tags by default
      });
    }
  });
}

// Render language filter chips
function renderLanguageFilters() {
  languageFiltersEl.innerHTML = '';
  
  if (state.allLanguages.size === 0) {
    languageFiltersEl.innerHTML = '<p>No languages found</p>';
    return;
  }
  
  state.allLanguages.forEach(language => {
    const isSelected = state.selectedLanguages.has(language);
    const chip = createFilterChip(language, isSelected, 'language');
    languageFiltersEl.appendChild(chip);
  });
}

// Render tag filter chips
function renderTagFilters() {
  tagFiltersEl.innerHTML = '';
  
  if (state.allTags.size === 0) {
    tagFiltersEl.innerHTML = '<p>No tags found</p>';
    return;
  }
  
  state.allTags.forEach(tag => {
    const isSelected = state.selectedTags.has(tag);
    const chip = createFilterChip(tag, isSelected, 'tag');
    tagFiltersEl.appendChild(chip);
  });
}

// Create a filter chip element
function createFilterChip(label, isSelected, type) {
  const chip = document.createElement('div');
  chip.className = `filter-chip ${isSelected ? 'selected' : ''}`;
  chip.textContent = label;
  
  if (type === 'language') {
    chip.classList.add(`language-${label.toLowerCase()}`);
    chip.dataset.language = label;
  } else {
    chip.dataset.tag = label;
  }
  
  // Add ripple effect
  chip.addEventListener('click', function(e) {
    // Create ripple element
    const ripple = document.createElement('span');
    ripple.className = 'filter-chip-ripple';
    
    // Calculate position
    const rect = this.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    
    // Add ripple to chip
    this.appendChild(ripple);
    
    // Remove after animation completes
    setTimeout(() => {
      ripple.remove();
    }, 600);
    
    // Toggle selection
    if (type === 'language') {
      toggleLanguageSelection(label);
    } else {
      toggleTagSelection(label);
    }
  });
  
  return chip;
}

// Toggle language selection
function toggleLanguageSelection(language) {
  if (state.selectedLanguages.has(language)) {
    state.selectedLanguages.delete(language);
  } else {
    state.selectedLanguages.add(language);
  }
  
  applyFilters();
  renderLanguageFilters();
  updateFilterInfo();
}

// Toggle tag selection
function toggleTagSelection(tag) {
  if (state.selectedTags.has(tag)) {
    state.selectedTags.delete(tag);
  } else {
    state.selectedTags.add(tag);
  }
  
  applyFilters();
  renderTagFilters();
  updateFilterInfo();
}

// Apply filters to recordings
function applyFilters() {
  if (state.selectedLanguages.size === 0 && state.selectedTags.size === 0) {
    state.filteredRecordings = [];
  } else if (state.selectedLanguages.size === 0) {
    // Only filter by tags
    state.filteredRecordings = state.recordings.filter(recording => 
      recording.tags && recording.tags.some(tag => state.selectedTags.has(tag))
    );
  } else if (state.selectedTags.size === 0) {
    // Only filter by languages
    state.filteredRecordings = state.recordings.filter(recording => 
      state.selectedLanguages.has(recording.language)
    );
  } else {
    // Filter by both languages and tags
    state.filteredRecordings = state.recordings.filter(recording => {
      const languageMatch = state.selectedLanguages.has(recording.language);
      const tagMatch = recording.tags && recording.tags.some(tag => state.selectedTags.has(tag));
      return languageMatch || tagMatch;
    });
  }
  
  renderFilteredRecordings();
}

// Render filtered recordings
function renderFilteredRecordings() {
  filteredRecordingsEl.innerHTML = '';
  
  if (state.filteredRecordings.length === 0) {
    const noRecordings = document.createElement('div');
    noRecordings.className = 'no-recordings';
    noRecordings.textContent = 'No recordings match the selected filters';
    filteredRecordingsEl.appendChild(noRecordings);
    return;
  }
  
  state.filteredRecordings.forEach(recording => {
    const card = createRecordingCard(recording);
    filteredRecordingsEl.appendChild(card);
  });
}

// Create a recording card element
function createRecordingCard(recording) {
  const card = document.createElement('div');
  card.className = 'recording-card';
  card.dataset.id = recording.id;
  
  const title = document.createElement('h3');
  title.textContent = recording.title || 'Untitled Recording';
  
  const meta = document.createElement('div');
  meta.className = 'recording-meta';
  
  const date = document.createElement('span');
  date.textContent = new Date(recording.timestamp).toLocaleString();
  
  const duration = document.createElement('span');
  duration.textContent = formatDuration(recording.duration);
  
  meta.appendChild(date);
  meta.appendChild(duration);
  
  const language = document.createElement('div');
  language.className = `recording-language ${recording.language.toLowerCase()}`;
  language.textContent = recording.language;
  
  card.appendChild(title);
  card.appendChild(meta);
  
  // Add tags if available
  if (recording.tags && recording.tags.length > 0) {
    const tagsContainer = document.createElement('div');
    tagsContainer.className = 'recording-tags';
    
    recording.tags.forEach(tag => {
      const tagEl = document.createElement('span');
      tagEl.className = 'recording-tag';
      tagEl.textContent = tag;
      tagsContainer.appendChild(tagEl);
    });
    
    card.appendChild(tagsContainer);
  }
  
  card.appendChild(language);
  
  // Add click event to navigate to recording
  card.addEventListener('click', () => {
    window.location.href = `index.html?id=${recording.id}`;
  });
  
  return card;
}

// Format duration in seconds to MM:SS format
function formatDuration(seconds) {
  if (!seconds) return '00:00';
  
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Update filter info text
function updateFilterInfo() {
  const languageCount = state.selectedLanguages.size;
  const tagCount = state.selectedTags.size;
  const recordingCount = state.filteredRecordings.length;
  
  let infoText = `Showing ${recordingCount} recording${recordingCount !== 1 ? 's' : ''}`;
  
  if (languageCount > 0 || tagCount > 0) {
    infoText += ' with ';
    
    if (languageCount > 0) {
      infoText += `${languageCount} language${languageCount !== 1 ? 's' : ''}`;
      
      if (tagCount > 0) {
        infoText += ' and ';
      }
    }
    
    if (tagCount > 0) {
      infoText += `${tagCount} tag${tagCount !== 1 ? 's' : ''}`;
    }
    
    infoText += ' selected';
  }
  
  filterInfoEl.textContent = infoText;
}

// Select all filters
function selectAllFilters() {
  state.allLanguages.forEach(language => {
    state.selectedLanguages.add(language);
  });
  
  state.allTags.forEach(tag => {
    state.selectedTags.add(tag);
  });
  
  applyFilters();
  renderLanguageFilters();
  renderTagFilters();
  updateFilterInfo();
}

// Clear all filters
function clearAllFilters() {
  state.selectedLanguages.clear();
  state.selectedTags.clear();
  
  applyFilters();
  renderLanguageFilters();
  renderTagFilters();
  updateFilterInfo();
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);
