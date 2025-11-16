// ===== api-bridge-FULL.js - גרסה משופרת עם כל הפונקציות =====
// העתיקי את הקובץ הזה במקום api-bridge.js הישן

const API_BASE = (location.hostname === 'localhost')
  ? 'http://localhost:8787'
  : 'https://eco-files.onrender.com';

// ===== Helper: Get auth headers =====
async function getAuthHeaders() {
  const headers = {};
  
  if (window.auth?.currentUser && typeof window.auth.currentUser.getIdToken === 'function') {
    try {
      const token = await window.auth.currentUser.getIdToken();
      headers['Authorization'] = `Bearer ${token}`;
    } catch (err) {
      console.warn('⚠️ Could not get Firebase token:', err);
    }
  }
  
  // DEV mode fallback
  const userEmail = (typeof getCurrentUserEmail === "function")
    ? getCurrentUserEmail()
    : (auth.currentUser?.email ?? "").toLowerCase();
    
  if (userEmail) {
    headers['X-Dev-Email'] = userEmail;
  }
  
  return headers;
}

// ===== Helper: Get current user email =====
function getCurrentUser() {
  if (typeof getCurrentUserEmail === "function") {
    return getCurrentUserEmail();
  }
  return (auth.currentUser?.email ?? "").toLowerCase();
}

// ===== 1️⃣ Load Documents =====
async function loadDocuments() {
  const me = getCurrentUser();
  if (!me) {
    console.warn('⚠️ No user logged in');
    return [];
  }

  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/docs`, { headers });
    
    if (!res.ok) {
      const text = await res.text();
      console.error('❌ Failed to load docs:', text);
      return [];
    }
    
    const list = await res.json();
    console.log(`✅ Loaded ${list.length} documents from Render`);
    
    // Transform to match frontend format
    return list.map(d => ({
      id: d.id,
      title: d.title || d.file_name,
      fileName: d.file_name,
      fileType: d.mime_type,
      fileSize: d.file_size,
      category: d.category || 'אחר',
      year: d.year || '',
      org: d.org || '',
      recipient: Array.isArray(d.recipient) ? d.recipient : [],
      sharedWith: d.shared_with || [],
      uploadedAt: d.uploaded_at,
      lastModified: d.last_modified,
      lastModifiedBy: d.last_modified_by,
      owner: d.owner,
      _trashed: d.trashed || false,
      deletedAt: d.deleted_at,
      deletedBy: d.deleted_by,
      hasFile: true,
      downloadURL: `${API_BASE}/api/docs/${d.id}/download` // Virtual download URL
    }));
  } catch (error) {
    console.error('❌ Error loading documents:', error);
    return [];
  }
}

// ===== 2️⃣ Upload Document =====
async function uploadDocument(file, metadata = {}) {
  const me = getCurrentUser();
  if (!me) throw new Error("User not logged in");

  try {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('title', metadata.title ?? file.name);
    fd.append('category', metadata.category ?? 'אחר');
    fd.append('year', metadata.year ?? String(new Date().getFullYear()));
    fd.append('org', metadata.org ?? '');
    fd.append('recipient', JSON.stringify(Array.isArray(metadata.recipient) ? metadata.recipient : []));
    
    if (metadata.warrantyStart) fd.append('warrantyStart', metadata.warrantyStart);
    if (metadata.warrantyExpiresAt) fd.append('warrantyExpiresAt', metadata.warrantyExpiresAt);
    if (metadata.autoDeleteAfter) fd.append('autoDeleteAfter', metadata.autoDeleteAfter);

    const headers = await getAuthHeaders();
    
    const res = await fetch(`${API_BASE}/api/docs`, { 
      method: 'POST', 
      headers, 
      body: fd 
    });
    
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Upload failed: ${text}`);
    }
    
    const result = await res.json();
    console.log('✅ Document uploaded:', result.id);
    
    // Transform to match frontend format
    return {
      id: result.id,
      title: result.title,
      fileName: result.file_name,
      fileSize: result.file_size,
      fileType: result.mime_type,
      category: metadata.category ?? 'אחר',
      year: metadata.year ?? String(new Date().getFullYear()),
      owner: me,
      uploadedAt: result.uploaded_at,
      lastModified: result.uploaded_at,
      hasFile: true,
      downloadURL: `${API_BASE}/api/docs/${result.id}/download`
    };
  } catch (error) {
    console.error('❌ Upload error:', error);
    throw error;
  }
}

// ===== 3️⃣ Update Document Metadata =====
async function updateDocument(docId, updates) {
  try {
    const headers = await getAuthHeaders();
    headers['Content-Type'] = 'application/json';
    
    const res = await fetch(`${API_BASE}/api/docs/${docId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updates)
    });
    
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Update failed: ${text}`);
    }
    
    const result = await res.json();
    console.log('✅ Document updated:', docId);
    return result;
  } catch (error) {
    console.error('❌ Update error:', error);
    throw error;
  }
}

// ===== 4️⃣ Move to/from Trash =====
async function markDocTrashed(docId, trashed) {
  try {
    const headers = await getAuthHeaders();
    headers['Content-Type'] = 'application/json';
    
    const res = await fetch(`${API_BASE}/api/docs/${docId}/trash`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ trashed })
    });
    
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Trash operation failed: ${text}`);
    }
    
    const result = await res.json();
    console.log(`✅ Document ${trashed ? 'trashed' : 'restored'}:`, docId);
    return result;
  } catch (error) {
    console.error('❌ Trash operation error:', error);
    throw error;
  }
}

// ===== 5️⃣ Delete Permanently =====
async function deleteDocForever(docId) {
  try {
    const headers = await getAuthHeaders();
    
    const res = await fetch(`${API_BASE}/api/docs/${docId}`, {
      method: 'DELETE',
      headers
    });
    
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Delete failed: ${text}`);
    }
    
    const result = await res.json();
    console.log('✅ Document permanently deleted:', docId);
    return result;
  } catch (error) {
    console.error('❌ Delete error:', error);
    throw error;
  }
}

// ===== 6️⃣ Download Document =====
async function downloadDocument(docId, fileName) {
  try {
    const headers = await getAuthHeaders();
    
    const res = await fetch(`${API_BASE}/api/docs/${docId}/download`, { headers });
    
    if (!res.ok) {
      throw new Error('Download failed');
    }
    
    const blob = await res.blob();
    
    // Trigger download
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'document';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    console.log('✅ Document downloaded:', docId);
  } catch (error) {
    console.error('❌ Download error:', error);
    throw error;
  }
}

// ===== Expose globally =====
window.loadDocuments = loadDocuments;
window.uploadDocument = uploadDocument;
window.updateDocument = updateDocument;
window.markDocTrashed = markDocTrashed;
window.deleteDocForever = deleteDocForever;
window.downloadDocument = downloadDocument;

console.log('✅ API Bridge (FULL) loaded - all functions ready!');
