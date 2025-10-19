// src/services/api.js
export const createNote = async (noteData) => {
    const response = await fetch('/api/notes', {
      method: 'POST',
      body: noteData instanceof FormData ? noteData : JSON.stringify(noteData),
      headers: noteData instanceof FormData ? {} : {
        'Content-Type': 'application/json',
      },
    });
    return await response.json();
  };
  
  export const updateNote = async (id, noteData) => {
    const response = await fetch(`/api/notes/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(noteData),
    });
    return await response.json();
  };

  
  
  // Add other API calls as needed