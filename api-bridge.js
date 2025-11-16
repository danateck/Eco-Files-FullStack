// ═══════════════════════════════════════════════════════════════════
//        api-bridge-FIXED.js - גרסה מתוקנת שלא תיתקע!
// ═══════════════════════════════════════════════════════════════════

const API_BASE = (location.hostname === 'localhost')
  ? 'http://localhost:8787'
  : 'https://eco-files.onrender.com'; // 👈 שני את זה ל-URL שלך!

console.log("🔗 API Bridge starting... URL:", API_BASE);

// ═══ Helper Functions ═══

async function getAuthHeaders() {
  const headers = {};
  
  if (window.auth?.currentUser) {
    try {
      const token = await window.auth.currentUser.getIdToken();
      headers['Authorization'] = `Bearer ${token}`;
    } catch (err) {
      console.warn('⚠️ Token error:', err);
    }
  }
  
  const userEmail = (typeof getCurrentUserEmail === "function")
    ? getCurrentUserEmail()
    : (window.auth?.currentUser?.email ?? "").toLowerCase();
    
  if (userEmail) {
    headers['X-Dev-Email'] = userEmail;
  }
  
  return headers;
}

function getCurrentUser() {
  if (typeof getCurrentUserEmail === "function") {
    return getCurrentUserEmail();
  }
  return (window.auth?.currentUser?.email ?? "").toLowerCase();
}

// ═══ 1. Load Documents (עם Timeout!) ═══

async function loadDocuments() {
  const me = getCurrentUser();
  if (!me) {
    console.warn('⚠️ No user logged in');
    return [];
  }

  console.log("📡 Loading documents from Render...");

  try {
    const headers = await getAuthHeaders();
    
    // ✅ קריאה עם TIMEOUT של 10 שניות
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const res = await fetch(`${API_BASE}/api/docs`, { 
      headers,
      signal: controller.signal 
    });
    
    clearTimeout(timeoutId);
    
    if (!res.ok) {
      throw new Error(`API returned ${res.status}`);
    }
    
    const list = await res.json();
    console.log(`✅ Loaded ${list.length} documents from Render`);
    
    // Transform to frontend format
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
      downloadURL: `${API_BASE}/api/docs/${d.id}/download`
    }));
    
  } catch (error) {
    console.error('❌ Render API failed:', error.message);
    
    // ✅ Fallback to Firestore
    console.log("🔄 Falling back to Firestore...");
    return await loadFromFirestore(me);
  }
}

// Helper: Load from Firestore (fallback)
async function loadFromFirestore(userEmail) {
  if (!window.db || !window.fs) {
    console.error("❌ Firebase not available");
    return [];
  }
  
  try {
    const col = window.fs.collection(window.db, "documents");
    const qOwned = window.fs.query(col, window.fs.where("owner", "==", userEmail));
    const qShared = window.fs.query(col, window.fs.where("sharedWith", "array-contains", userEmail));
    
    const [ownedSnap, sharedSnap] = await Promise.all([
      window.fs.getDocs(qOwned),
      window.fs.getDocs(qShared)
    ]);
    
    const byId = new Map();
    ownedSnap.forEach(doc => byId.set(doc.id, { id: doc.id, ...doc.data() }));
    sharedSnap.forEach(doc => byId.set(doc.id, { id: doc.id, ...doc.data() }));
    
    const docs = Array.from(byId.values());
    console.log(`✅ Loaded ${docs.length} documents from Firestore`);
    return docs;
  } catch (err) {
    console.error("❌ Firestore load failed:", err);
    return [];
  }
}

// ═══ 2. Upload Document (עם Timeout!) ═══

async function uploadDocument(file, metadata = {}) {
  const me = getCurrentUser();
  if (!me) throw new Error("User not logged in");

  console.log("📤 Uploading to Render...");

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
    
    // ✅ Timeout של 30 שניות להעלאה
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    const res = await fetch(`${API_BASE}/api/docs`, { 
      method: 'POST', 
      headers, 
      body: fd,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!res.ok) {
      throw new Error(`Upload failed: ${await res.text()}`);
    }
    
    const result = await res.json();
    console.log('✅ Uploaded to Render:', result.id);
    
    const doc = {
      id: result.id,
      title: result.title || result.file_name,
      fileName: result.file_name,
      fileSize: result.file_size,
      fileType: result.mime_type,
      category: metadata.category ?? 'אחר',
      year: metadata.year ?? String(new Date().getFullYear()),
      org: metadata.org ?? '',
      recipient: metadata.recipient || [],
      sharedWith: metadata.sharedWith || [],
      owner: me,
      uploadedAt: result.uploaded_at || Date.now(),
      lastModified: result.uploaded_at || Date.now(),
      _trashed: false,
      hasFile: true,
      downloadURL: `${API_BASE}/api/docs/${result.id}/download`
    };
    
    // ✅ Sync to Firestore (don't wait)
    if (window.db && window.fs) {
      syncToFirestore(result.id, doc).catch(err => 
        console.warn("⚠️ Firestore sync failed:", err)
      );
    }
    
    // ✅ Update local cache
    if (Array.isArray(window.allDocsData)) {
      window.allDocsData.push(doc);
    }
    
    return doc;
    
  } catch (error) {
    console.error('❌ Upload error:', error);
    throw error;
  }
}

// Helper: Sync to Firestore
async function syncToFirestore(docId, docData) {
  if (!window.db || !window.fs) return;
  
  try {
    const docRef = window.fs.doc(window.db, "documents", docId);
    await window.fs.setDoc(docRef, docData, { merge: true });
    console.log("✅ Synced to Firestore:", docId);
  } catch (err) {
    console.warn("⚠️ Firestore sync failed:", err);
  }
}

// ═══ 3. Update Document ═══

async function updateDocument(docId, updates) {
  try {
    const headers = await getAuthHeaders();
    headers['Content-Type'] = 'application/json';
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const res = await fetch(`${API_BASE}/api/docs/${docId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updates),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!res.ok) {
      throw new Error(`Update failed: ${await res.text()}`);
    }
    
    console.log('✅ Updated in Render:', docId);
    
    // Update Firestore
    if (window.db && window.fs) {
      const docRef = window.fs.doc(window.db, "documents", docId);
      await window.fs.updateDoc(docRef, {
        ...updates,
        lastModified: Date.now()
      }).catch(err => console.warn("⚠️ Firestore update failed:", err));
    }
    
    // Update local cache
    if (Array.isArray(window.allDocsData)) {
      const idx = window.allDocsData.findIndex(d => d.id === docId);
      if (idx >= 0) {
        Object.assign(window.allDocsData[idx], updates, { lastModified: Date.now() });
      }
    }
    
    return await res.json();
  } catch (error) {
    console.error('❌ Update error:', error);
    throw error;
  }
}

// ═══ 4. Trash/Restore ═══

async function markDocTrashed(docId, trashed) {
  try {
    const headers = await getAuthHeaders();
    headers['Content-Type'] = 'application/json';
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const res = await fetch(`${API_BASE}/api/docs/${docId}/trash`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ trashed }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!res.ok) {
      throw new Error(`Trash failed: ${await res.text()}`);
    }
    
    console.log(`✅ ${trashed ? 'Trashed' : 'Restored'} in Render:`, docId);
    
    // Update Firestore
    if (window.db && window.fs) {
      const docRef = window.fs.doc(window.db, "documents", docId);
      await window.fs.updateDoc(docRef, {
        _trashed: !!trashed,
        lastModified: Date.now()
      }).catch(err => console.warn("⚠️ Firestore update failed:", err));
    }
    
    // Update local cache
    if (Array.isArray(window.allDocsData)) {
      const idx = window.allDocsData.findIndex(d => d.id === docId);
      if (idx >= 0) {
        window.allDocsData[idx]._trashed = !!trashed;
        window.allDocsData[idx].lastModified = Date.now();
      }
    }
    
    return await res.json();
  } catch (error) {
    console.error('❌ Trash error:', error);
    throw error;
  }
}

// ═══ 5. Delete Forever ═══

async function deleteDocForever(docId) {
  try {
    const headers = await getAuthHeaders();
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const res = await fetch(`${API_BASE}/api/docs/${docId}`, {
      method: 'DELETE',
      headers,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!res.ok) {
      throw new Error(`Delete failed: ${await res.text()}`);
    }
    
    console.log('✅ Deleted from Render:', docId);
    
    // Delete from Firestore
    if (window.db && window.fs) {
      const docRef = window.fs.doc(window.db, "documents", docId);
      await window.fs.deleteDoc(docRef).catch(err => 
        console.warn("⚠️ Firestore delete failed:", err)
      );
    }
    
    // Remove from local cache
    if (Array.isArray(window.allDocsData)) {
      const idx = window.allDocsData.findIndex(d => d.id === docId);
      if (idx >= 0) {
        window.allDocsData.splice(idx, 1);
      }
    }
    
    return await res.json();
  } catch (error) {
    console.error('❌ Delete error:', error);
    throw error;
  }
}

// ═══ 6. Download ═══

async function downloadDocument(docId, fileName) {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/docs/${docId}/download`, { headers });
    
    if (!res.ok) {
      throw new Error('Download failed');
    }
    
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'document';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    console.log('✅ Downloaded:', docId);
  } catch (error) {
    console.error('❌ Download error:', error);
    throw error;
  }
}

// ═══ Expose Globally ═══

window.loadDocuments = loadDocuments;
window.uploadDocument = uploadDocument;
window.updateDocument = updateDocument;
window.markDocTrashed = markDocTrashed;
window.deleteDocForever = deleteDocForever;
window.downloadDocument = downloadDocument;

console.log('✅ API Bridge FIXED loaded - with timeouts and fallback!');
