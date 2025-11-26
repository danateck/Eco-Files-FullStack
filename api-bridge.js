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
  // 👇 שדה התת־תיקייה שמגיע מהשרת
  subCategory: d.sub_category || d.subCategory || null,
  year: d.year || '',
  org: d.org || '',
  recipient: Array.isArray(d.recipient) ? d.recipient : [],
  sharedWith: d.shared_with || [],
  uploadedAt: (() => { /* נשאר כמו שיש לך */ })(),
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
    

    if (metadata.subCategory) {
  fd.append('subCategory', metadata.subCategory);
}


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
   subCategory: metadata.subCategory || null,
  year: metadata.year ?? String(new Date().getFullYear()),
  org: metadata.org ?? '',
  recipient: metadata.Srecipient || [],
  sharedWith: metadata.sharedWith || [],
  owner: me,
  uploadedAt: result.uploaded_at || new Date().toISOString(),
  lastModified: result.uploaded_at || new Date().toISOString(),
  _trashed: false,
  hasFile: true,
  downloadURL: `${API_BASE}/api/docs/${result.id}/download`,

  // ⭐ גם במסמך המקומי אחרי העלאה:
  warrantyStart: metadata.warrantyStart || null,
  warrantyExpiresAt: metadata.warrantyExpiresAt || null,
  autoDeleteAfter: metadata.autoDeleteAfter || null
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

if (typeof window.updateStorageUsageWidget === "function") {
  window.updateStorageUsageWidget();
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

// ═══ 3. Update Document ═══

async function updateDocument(docId, updates) {
  const me = getCurrentUser();
  if (!me) throw new Error("Not logged in");

  console.log("✏️ Updating doc", docId, updates);

  try {
    // ---- בקאנד (Render) ----
    const headers = await getAuthHeaders();
    headers["Content-Type"] = "application/json";

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(`${API_BASE}/api/docs/${docId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(updates),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const text = await res.text();
      console.warn("⚠️ Backend update failed:", text);
    }

    // ---- Firestore (אם זמין) ----
    if (window.db && window.fs) {
      const fsFields = {};

      if ("title" in updates)               fsFields.title             = updates.title;
      if ("org" in updates)                 fsFields.org               = updates.org;
      if ("year" in updates)                fsFields.year              = updates.year;
      if ("recipient" in updates)          fsFields.recipient         = updates.recipient;
      if ("category" in updates)           fsFields.category          = updates.category;
      if ("shared_with" in updates)        fsFields.sharedWith        = updates.shared_with;
      if ("warranty_start" in updates)     fsFields.warrantyStart     = updates.warranty_start;
      if ("warranty_expires_at" in updates)fsFields.warrantyExpiresAt = updates.warranty_expires_at;
      if ("auto_delete_after" in updates)  fsFields.autoDeleteAfter   = updates.auto_delete_after;

      fsFields.lastModified   = Date.now();
      fsFields.lastModifiedBy = me;

      const docRef = window.fs.doc(window.db, "documents", docId);
      await window.fs.updateDoc(docRef, fsFields)
        .catch(err => console.warn("⚠️ Firestore update failed:", err));
    }

    // ---- עדכון במערך המקומי ל-UI ----
    if (Array.isArray(window.allDocsData)) {
      const idx = window.allDocsData.findIndex(d => d.id === docId);
      if (idx >= 0) {
        const cur = window.allDocsData[idx];

        Object.assign(cur, {
          title:             updates.title             ?? cur.title,
          org:               updates.org               ?? cur.org,
          year:              updates.year              ?? cur.year,
          recipient:         updates.recipient         ?? cur.recipient,
          category:          updates.category          ?? cur.category,
          sharedWith:        updates.shared_with       ?? cur.sharedWith,
          warrantyStart:     updates.warranty_start    ?? cur.warrantyStart,
          warrantyExpiresAt: updates.warranty_expires_at ?? cur.warrantyExpiresAt,
          autoDeleteAfter:   updates.auto_delete_after ?? cur.autoDeleteAfter,
          lastModified:      Date.now(),
          lastModifiedBy:    me
        });
      }
    }

    return res.ok ? await res.json() : null;
  } catch (error) {
    console.error("❌ Update error:", error);
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

  if (Array.isArray(window.allDocsData)) {
  const idx = window.allDocsData.findIndex((d) => d.id === docId);
  if (idx >= 0) {
    window.allDocsData[idx]._trashed = !!trashed;
    window.allDocsData[idx].lastModified = Date.now();
  }
}

if (typeof window.updateStorageUsageWidget === "function") {
  window.updateStorageUsageWidget();
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

  if (Array.isArray(window.allDocsData)) {
  const idx = window.allDocsData.findIndex((d) => d.id === docId);
  if (idx >= 0) {
    window.allDocsData.splice(idx, 1);
  }
}

if (typeof window.updateStorageUsageWidget === "function") {
  window.updateStorageUsageWidget();
}

return { backendOk };

}


// ═══ 6. Download ═══

async function downloadDocument(docId, fileName) {
  const me = getCurrentUser();
  if (!me) throw new Error("Not logged in");

  try {
    const headers = await getAuthHeaders();
    
    // 🔧 Timeout ארוך יותר לקבצים גדולים (60 שניות במקום 10)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    
    const res = await fetch(`${API_BASE}/api/docs/${docId}/download`, { 
      headers,
      signal: controller.signal 
    });
    
    clearTimeout(timeoutId);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`❌ Download failed ${res.status}:`, text);
      throw new Error("Download failed");
    }

    const contentType = res.headers.get("Content-Type") || "";
    const contentLength = res.headers.get("Content-Length");
    
    // 🔍 הצגת גודל הקובץ
    if (contentLength) {
      const sizeMB = (parseInt(contentLength) / (1024 * 1024)).toFixed(2);
      console.log(`📦 File size: ${sizeMB}MB`);
      
      // אם זה קובץ גדול מ-50MB, הזהר את המשתמש
      if (parseInt(contentLength) > 50 * 1024 * 1024) {
        console.warn("⚠️ Large file detected (>50MB), this might take a while...");
      }
    }
    
    // 🔧 טיפול בקבצים גדולים - הצגת progress
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);

    // זיהוי מכשיר: האם זה מובייל?
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // קביעת שם קובץ עם סיומת נכונה
    let safeName = fileName || "document";
    if (!safeName.includes(".")) {
      if (contentType.includes("pdf")) {
        safeName += ".pdf";
      } else if (contentType.includes("image")) {
        const ext = contentType.split("/")[1]?.split(";")[0] || "jpg";
        safeName += `.${ext}`;
      } else if (contentType.includes("word") || contentType.includes("document")) {
        safeName += ".docx";
      } else {
        safeName += ".file";
      }
    }

    if (isMobile) {
      // 📱 במובייל: ננסה לפתוח, ואם לא עובד - נוריד
      console.log("📱 Mobile device detected");
      
      // ניסיון ראשון: פתיחה בטאב חדש
      const newWindow = window.open(url, "_blank");
      
      // אם החסימה חסמה popup, ננסה הורדה
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        console.log("📥 Popup blocked, downloading instead");
        const a = document.createElement("a");
        a.href = url;
        a.download = safeName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        console.log("✅ Opened in new tab");
      }
    } else {
      // 💻 במחשב: פתיחה בטאב חדש (לא הורדה!)
      console.log("💻 Desktop device detected, opening in new tab");
      window.open(url, "_blank");
    }

    // ניקוי ה-URL אחרי 5 שניות (תן זמן לטאב להיפתח)
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 5000);
    
    console.log("✅ File opened/downloaded:", docId);
  } catch (error) {
    console.error("❌ Download error:", error);
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





// ===============================
// 📦 STORAGE WIDGET – חישוב אחסון
// ===============================

// כמה אחסון יש למשתמשת (ב־GB)
const STORAGE_LIMIT_GB = 0.5;
const STORAGE_LIMIT_BYTES = STORAGE_LIMIT_GB * 1024 * 1024 * 1024;

function computeStorageUsage() {
  const docs = Array.isArray(window.allDocsData) ? window.allDocsData : [];
  const me = getCurrentUser();
  if (!me) {
    return { usedBytes: 0, percent: 0, totalBytes: STORAGE_LIMIT_BYTES };
  }

  const myEmail = (me.email || me).trim().toLowerCase();
  let usedBytes = 0;

  for (const d of docs) {
    if (!d) continue;
    if (d._trashed) continue;

    const owner = (d.owner || "").trim().toLowerCase();
    if (owner !== myEmail) continue;

    // מנסה לקחת גודל אמיתי, ואם אין – נותן ברירת מחדל
    let size = Number(d.fileSize ?? d.file_size ?? d.size);
    if (!Number.isFinite(size) || size <= 0) {
      size = 200 * 1024; // 200KB דיפולט למסמך
    }

    usedBytes += size;
  }

  const percent = Math.min(
    100,
    Math.round((usedBytes / STORAGE_LIMIT_BYTES) * 100)
  );

  return { usedBytes, percent, totalBytes: STORAGE_LIMIT_BYTES };
}

// ===============================
// 📦 WIDGET אחסון – חישוב ועדכון
// ===============================
function updateStorageUsageWidget() {
  console.log("🔄 updateStorageUsageWidget called");
  
  const barFill   = document.getElementById("storageUsageBarFill");
  const textEl    = document.getElementById("storageUsageText");
  const percentEl = document.getElementById("storageUsagePercent");

  if (!barFill || !textEl || !percentEl) {
    console.warn("⚠️ Storage widget elements not found");
    console.log("  barFill:", barFill);
    console.log("  textEl:", textEl);
    console.log("  percentEl:", percentEl);
    return;
  }

  const GB       = 1024 * 1024 * 1024;
  const TOTAL_GB = 0.5; // כאן משנים אם בעתיד Free/Pro/Premium

  const docs = Array.isArray(window.allDocsData) ? window.allDocsData : [];

  const me = (typeof getCurrentUserEmail === "function")
    ? getCurrentUserEmail()
    : null;

  // אין משתמש – מציגים הכל פנוי
  if (!me) {
    barFill.style.setProperty('width', '0%', 'important');
    percentEl.textContent = "0%";
    textEl.textContent    = `אחסון פנוי: ${TOTAL_GB.toFixed(1)}GB מתוך ${TOTAL_GB.toFixed(1)}GB`;
    console.log("💾 Storage widget: no user");
    return;
  }

  const meNorm = me.toLowerCase();

  // מסמכים ששייכים למשתמשת, לא בסל מחזור
  const myDocs = docs.filter(d =>
    d &&
    d.owner &&
    d.owner.toLowerCase() === meNorm &&
    !d._trashed
  );

  let usedBytes = 0;
  for (const d of myDocs) {
    // מנסה גודל אמיתי מהשרת
    let size = Number(d.fileSize ?? d.file_size ?? d.size);

    // אם אין גודל – נניח 300KB כדי שהפס יזוז
    if (!Number.isFinite(size) || size <= 0) {
      size = 300 * 1024;
    }

    usedBytes += size;
  }

  const usedGB = usedBytes / GB;
  const freeGB = Math.max(0, TOTAL_GB - usedGB);

  let usedPct = TOTAL_GB > 0 ? (usedGB / TOTAL_GB) * 100 : 0;
  if (!Number.isFinite(usedPct) || usedPct < 0) usedPct = 0;
  if (usedPct > 100) usedPct = 100;

  // 🔧 הגדרה מאולצת - מוודא שזה יעבוד!
  const widthValue = usedPct.toFixed(1) + "%";
  const percentValue = Math.round(usedPct) + "%";
  const textValue = `אחסון פנוי: ${freeGB.toFixed(1)}GB מתוך ${TOTAL_GB.toFixed(1)}GB`;
  
  // נסיון 1: setProperty עם important
  barFill.style.setProperty('width', widthValue, 'important');
  
  // נסיון 2: ישירות על ה-attribute
  barFill.setAttribute('style', `width: ${widthValue} !important`);
  
  // נסיון 3: שמירה ב-dataset כגיבוי
  barFill.dataset.width = widthValue;
  
  // עדכון הטקסטים
  percentEl.textContent = percentValue;
  percentEl.dataset.value = percentValue;
  
  textEl.textContent = textValue;
  textEl.dataset.text = textValue;
  
  // 🔧 כיפוף - נאלץ את הדפדפן לרענן
  void barFill.offsetHeight; // Trigger reflow
  barFill.style.display = 'block';

  console.log("💾 Storage widget updated:", {
    totalDocs: docs.length,
    myDocs: myDocs.length,
    usedBytes,
    usedGB: usedGB.toFixed(3),
    usedPct: usedPct.toFixed(2),
    // ערכים שנקבעו
    setWidth: widthValue,
    setPercent: percentValue,
    setText: textValue,
    // בדיקה שזה באמת עבד
    actualStyleWidth: barFill.style.width,
    actualAttrStyle: barFill.getAttribute('style'),
    actualPercent: percentEl.textContent,
    actualText: textEl.textContent
  });
}

// שיהיה גלובלי כדי ש-api-bridge.js יוכל לקרוא לזה
window.updateStorageUsageWidget = updateStorageUsageWidget;
