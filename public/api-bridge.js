// === API bridge: drop this file next to your existing scripts and include it after main.js ===
// It overrides loadDocuments() and uploadDocument() to use your backend API (Express + Postgres).

const API_BASE = (location.hostname === 'localhost')
  ? 'http://localhost:8787'
  : 'https://eco-files.onrender.com'; // e.g. https://eco-docs-api.onrender.com

async function loadDocuments() {
  const me = (typeof getCurrentUserEmail === 'function') ? getCurrentUserEmail() : (sessionStorage.getItem('docArchiveCurrentUser') || '').toLowerCase();
  if (!me) return [];

  const headers = {};
  if (window.auth?.currentUser && typeof window.auth.currentUser.getIdToken === 'function') {
    const token = await window.auth.currentUser.getIdToken();
    headers['Authorization'] = `Bearer ${token}`;
  } else {
    headers['X-Dev-Email'] = me; // DEV only; remove after enabling Firebase token verification on the server
  }

  const res = await fetch(`${API_BASE}/api/docs`, { headers });
  if (!res.ok) {
    console.error('Failed to load docs', await res.text());
    return [];
  }
  const list = await res.json();
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
    owner: me,
    hasFile: true
  }));
}

async function uploadDocument(file, metadata = {}) {
  const me = (typeof getCurrentUserEmail === 'function') ? getCurrentUserEmail() : (sessionStorage.getItem('docArchiveCurrentUser') || '').toLowerCase();
  if (!me) throw new Error("User not logged in");

  const fd = new FormData();
  fd.append('file', file);
  fd.append('title', metadata.title ?? file.name);
  fd.append('category', metadata.category ?? 'אחר');
  fd.append('year', metadata.year ?? String(new Date().getFullYear()));
  fd.append('org', metadata.org ?? '');
  fd.append('recipient', JSON.stringify(Array.isArray(metadata.recipient) ? metadata.recipient : []));
  if (metadata.warrantyStart)     fd.append('warrantyStart', metadata.warrantyStart);
  if (metadata.warrantyExpiresAt) fd.append('warrantyExpiresAt', metadata.warrantyExpiresAt);
  if (metadata.autoDeleteAfter)   fd.append('autoDeleteAfter', metadata.autoDeleteAfter);

  const headers = {};
  if (window.auth?.currentUser && typeof window.auth.currentUser.getIdToken === 'function') {
    const token = await window.auth.currentUser.getIdToken();
    headers['Authorization'] = `Bearer ${token}`;
  } else {
    headers['X-Dev-Email'] = me; // DEV only
  }

  const res = await fetch(`${API_BASE}/api/docs`, { method: 'POST', headers, body: fd });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

// Expose globally in case your app expects these on window
window.loadDocuments = loadDocuments;
window.uploadDocument = uploadDocument;
