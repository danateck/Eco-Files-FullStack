// ═══════════════════════════════════════════════════════════════════
//        api-bridge-ULTIMATE-FIX.js - תיקון Authentication!
// ═══════════════════════════════════════════════════════════════════

const API_BASE = (location.hostname === 'localhost')
  ? 'http://localhost:8787'
  : 'https://eco-files.onrender.com'; // 👈 שני את זה ל-URL שלך!

console.log("🔗 API Bridge (ULTIMATE) starting...");
console.log("📍 API URL:", API_BASE);

// ═══ Helper: Get user email ═══
function getCurrentUser() {
  // Try multiple ways to get the email
  if (typeof getCurrentUserEmail === "function") {
    const email = getCurrentUserEmail();
    if (email) return email.toLowerCase().trim();
  }
  
  if (window.auth?.currentUser?.email) {
    return window.auth.currentUser.email.toLowerCase().trim();
  }
  
  if (typeof auth !== "undefined" && auth?.currentUser?.email) {
    return auth.currentUser.email.toLowerCase().trim();
  }
  
  console.error("❌ Cannot get user email!");
  return null;
}

// ═══ Helper: Get auth headers ═══
async function getAuthHeaders() {
  const headers = {};
  
  // Get user email
  const userEmail = getCurrentUser();
  if (!userEmail) {
    console.error("❌ No user email for headers!");
    return headers;
  }
  
  console.log("👤 User for request:", userEmail);
  
  // ✅ ALWAYS add X-Dev-Email (this is what the backend expects!)
  headers['X-Dev-Email'] = userEmail;
  
  // Try to add Firebase token too (if available)
  if (window.auth?.currentUser) {
    try {
      const token = await window.auth.currentUser.getIdToken();
      headers['Authorization'] = `Bearer ${token}`;
      console.log("✅ Added Firebase token");
    } catch (err) {
      console.warn('⚠️ Could not get Firebase token (using email only):', err.message);
    }
  }
  
  console.log("📤 Headers:", Object.keys(headers));
  return headers;
}

// ═══ 1. Load Documents ═══

async function loadDocuments() {
  const me = getCurrentUser();
  if (!me) {
    console.error('❌ Cannot load documents - not logged in');
    return [];
  }

  console.log("📡 Loading documents from:", API_BASE);

  try {
    const headers = await getAuthHeaders();
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const res = await fetch(`${API_BASE}/api/docs`, { 
      headers,
      signal: controller.signal 
    });
    
    clearTimeout(timeoutId);
    
    if (!res.ok) {
      const text = await res.text();
      console.error(`❌ API error ${res.status}:`, text);
      throw new Error(`API returned ${res.status}: ${text}`);
    }
    
    const list = await res.json();
    console.log(`✅ Loaded ${list.length} documents from Render`);
    
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
    console.log("🔄 Falling back to Firestore...");
    return await loadFromFirestore(me);
  }
}

// Helper: Load from Firestore
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

// ═══ 2. Upload Document ═══

async function uploadDocument(file, metadata = {}) {
  const me = getCurrentUser();
  if (!me) {
    const err = new Error("Not logged in");
    console.error("❌", err);
    throw err;
  }

  console.log("📤 Uploading file:", file.name);
  console.log("📤 User:", me);

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
    console.log("📤 Uploading to:", `${API_BASE}/api/docs`);
    
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
      const text = await res.text();
      console.error(`❌ Upload failed ${res.status}:`, text);
      throw new Error(`Upload failed: ${text}`);
    }
    
    const result = await res.json();
    console.log('✅ Uploaded:', result.id);
    
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
    
    // Sync to Firestore
    if (window.db && window.fs) {
      syncToFirestore(result.id, doc).catch(err => 
        console.warn("⚠️ Firestore sync failed:", err)
      );
    }
    
    // Update local cache
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
  const me = getCurrentUser();
  if (!me) throw new Error("Not logged in");
  
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
      const text = await res.text();
      throw new Error(`Update failed: ${text}`);
    }
    
    console.log('✅ Updated:', docId);
    
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
  const me = getCurrentUser();
  if (!me) throw new Error("Not logged in");

  let backendOk = false;

  // קודם מנסים לדבר עם השרת – אבל לא מפילים את כל הפעולה אם יש בעיה
  try {
    const headers = await getAuthHeaders();
    headers["Content-Type"] = "application/json";

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(`${API_BASE}/api/docs/${docId}/trash`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ trashed }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const text = await res.text();
      console.warn("⚠️ Trash failed on backend, continuing locally:", text);
    } else {
      backendOk = true;
    }
  } catch (error) {
    console.warn(
      "⚠️ Trash request failed (network/CORS), continuing locally:",
      error
    );
  }

  // 🧠 מכאן והלאה – תמיד נעדכן לוקאלית, גם אם השרת נחנק

  console.log(
    `✅ ${trashed ? "Trashed" : "Restored"} locally:`,
    docId,
    backendOk ? "(backend OK)" : "(backend FAILED)"
  );

  // Update Firestore
  if (window.db && window.fs) {
    try {
      const docRef = window.fs.doc(window.db, "documents", docId);
      await window.fs.updateDoc(docRef, {
        _trashed: !!trashed,
        lastModified: Date.now(),
      });
    } catch (err) {
      console.warn("⚠️ Firestore update failed:", err);
    }
  }

  // Update local cache
  if (Array.isArray(window.allDocsData)) {
    const idx = window.allDocsData.findIndex((d) => d.id === docId);
    if (idx >= 0) {
      window.allDocsData[idx]._trashed = !!trashed;
      window.allDocsData[idx].lastModified = Date.now();
    }
  }

  return { backendOk };
}



// ═══ 5. Delete Forever ═══

async function deleteDocForever(docId) {
  const me = getCurrentUser();
  if (!me) throw new Error("Not logged in");

  let backendOk = false;

  // מנסים למחוק בשרת – אבל לא נותנים לזה להפיל אותנו
  try {
    const headers = await getAuthHeaders();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(`${API_BASE}/api/docs/${docId}`, {
      method: "DELETE",
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.status === 404) {
      const text = await res.text();
      console.warn(
        "⚠️ Backend says doc not found or access denied on delete. Removing locally:",
        text
      );
    } else if (!res.ok) {
      const text = await res.text();
      console.warn("⚠️ Delete failed on backend, deleting locally:", text);
    } else {
      backendOk = true;
    }
  } catch (error) {
    console.warn(
      "⚠️ Delete request failed (network/CORS), deleting locally:",
      error
    );
  }

  console.log(
    "✅ Deleted locally:",
    docId,
    backendOk ? "(backend OK)" : "(backend FAILED)"
  );

  // Firestore
  if (window.db && window.fs) {
    try {
      const docRef = window.fs.doc(window.db, "documents", docId);
      await window.fs.deleteDoc(docRef);
    } catch (err) {
      console.warn("⚠️ Firestore delete failed:", err);
    }
  }

  // cache לוקאלי
  if (Array.isArray(window.allDocsData)) {
    const idx = window.allDocsData.findIndex((d) => d.id === docId);
    if (idx >= 0) {
      window.allDocsData.splice(idx, 1);
    }
  }

  return { backendOk };
}


// ═══ 6. Download ═══

async function downloadDocument(docId, fileName) {
  const me = getCurrentUser();
  if (!me) throw new Error("Not logged in");
  
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

// Debug helper
window.testAuth = async function() {
  console.log("🔍 Testing authentication...");
  const user = getCurrentUser();
  console.log("User:", user);
  const headers = await getAuthHeaders();
  console.log("Headers:", headers);
  return { user, headers };
};

console.log('✅ API Bridge (ULTIMATE FIX) loaded!');
console.log('💡 Debug: Run testAuth() to check authentication');
