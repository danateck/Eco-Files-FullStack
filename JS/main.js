function normalizeEmail(e) { return (e || "").trim().toLowerCase(); }
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
const auth = getAuth();
// API Base URL for backend
const API_BASE = (location.hostname === 'localhost')
  ? 'http://localhost:8787'
  : 'https://eco-files.onrender.com';
console.log("📍 API URL:", API_BASE);
// Wait for Firebase globals
function waitForFirebase() {
  return new Promise((resolve) => {
    if (window.db && window.fs && window.app) {
      console.log("✅ Firebase already available");
      resolve();
    } else {
      console.log("⏳ Waiting for firebase-ready event...");
      window.addEventListener("firebase-ready", () => {
        console.log("✅ Firebase ready event received");
        resolve();
      }, { once: true });
    }
  });
}
// ---- Global safety net ----
window.allDocsData = Array.isArray(window.allDocsData) ? window.allDocsData : [];
window.allUsersData = window.allUsersData || {};
window.userNow = window.userNow || "";
// ---- Minimal pending-invites renderer ----
window.paintPending = window.paintPending || function(invites = []) {
  const box = document.getElementById("sf_pending");
  if (!box) return;
  if (!Array.isArray(invites) || invites.length === 0) {
    box.innerHTML = `<em>אין בקשות ממתינות</em>`;
    return;
  }
  box.innerHTML = invites.map(i => `
    <div class="invite" data-id="${i.id}">
      <div><strong>${i.folderName || "תיקייה"}</strong></div>
      <div>${i.fromEmail || ""} → ${i.toEmail || ""}</div>
      <div style="margin-top:.25rem;">
        <button class="accept" data-id="${i.id}">אישור</button>
        <button class="reject" data-id="${i.id}">דחייה</button>
      </div>
    </div>
  `).join("");
  box.onclick = async (e) => {
    const t = e.target;
    const id = t?.dataset?.id;
    if (!id) return;
    try {
      if (t.classList.contains("accept")) await updateInviteStatus(id, "accepted");
      if (t.classList.contains("reject")) await updateInviteStatus(id, "rejected");
    } catch (err) {
      console.error("Failed to update invite:", err);
    }
  };
};
/******** NO-LOCAL-STORAGE SHIM (Firebase-only) ********/
function getCurrentUserFirebaseOnly() {
  if (typeof getCurrentUserEmail === "function") {
    return (getCurrentUserEmail() || "").trim().toLowerCase();
  }
  return "";
}
const memoryUsers = Object.create(null);
function loadAllUsersDataFromStorage() {
  return memoryUsers;
}
function saveAllUsersDataToStorage(allUsersData) {
  Object.assign(memoryUsers, allUsersData || {});
}
function getCurrentUser() {
  return getCurrentUserFirebaseOnly();
}
function getUserDocs(username, _allUsersData) {
  return (memoryUsers[username]?.docs) || [];
}
function setUserDocs(username, docsArray, _allUsersData) {
  if (!memoryUsers[username]) memoryUsers[username] = { password: "", docs: [] };
  memoryUsers[username].docs = Array.isArray(docsArray) ? docsArray : [];
}
let stopWatching = null;
// Add this helper function at the top of your main.js
function getCurrentUserEmail() {
  const raw = auth.currentUser?.email?.toLowerCase() ?? "";
  return raw.trim().toLowerCase();
}
// ═══ פונקציות עיצוב תאריכים ═══
function formatDate(dateValue) {
  if (!dateValue) return "-";
  try {
    let date;
    // המרה לאובייקט Date
    if (typeof dateValue === 'number') {
      date = new Date(dateValue);
    } else if (typeof dateValue === 'string') {
      date = new Date(dateValue);
    } else if (dateValue instanceof Date) {
      date = dateValue;
    } else {
      return "-";
    }
    // בדיקת תקינות
    if (isNaN(date.getTime())) {
      return "-";
    }
    // פורמט: DD/MM/YYYY HH:MM
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch (e) {
    console.error("Error formatting date:", e);
    return "-";
  }
}
function formatDateShort(dateValue) {
  if (!dateValue) return "-";
  try {
    let date;
    if (typeof dateValue === 'number') {
      date = new Date(dateValue);
    } else if (typeof dateValue === 'string') {
      date = new Date(dateValue);
    } else if (dateValue instanceof Date) {
      date = dateValue;
    } else {
      return "-";
    }
    if (isNaN(date.getTime())) {
      return "-";
    }
    // פורמט: DD/MM/YYYY (בלי שעה)
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (e) {
    console.error("Error formatting date:", e);
    return "-";
  }
}
function isFirebaseAvailable() {
  return !!(window.db && window.fs && typeof window.fs.collection === "function");
}
// ============================================
// FIX 1: Load documents with user filtering
// ============================================
// v9 modular version
// v9 modular version
// async function loadDocuments() {
//   const me = getCurrentUserEmail();
//   console.log("📥 loadDocuments called for:", me);
//   if (!me) {
//     console.warn("❌ No user email, cannot load documents");
//     return [];
//   }
//   if (!isFirebaseAvailable()) {
//     console.warn("❌ Firebase unavailable, cannot load documents");
//     return [];
//   }
//   const col = window.fs.collection(window.db, "documents");
//   const qOwned  = window.fs.query(col, window.fs.where("owner", "==", me));
//   const qShared = window.fs.query(col, window.fs.where("sharedWith", "array-contains", me));
//   const [ownedSnap, sharedSnap] = await Promise.all([
//     window.fs.getDocs(qOwned),
//     window.fs.getDocs(qShared),
//   ]);
//   const map = new Map();
//   ownedSnap.forEach(d => {
//     const data = { id: d.id, ...d.data() };
//     console.log("📄 Owned document:", data.title || data.fileName, "ID:", d.id);
//     map.set(d.id, data);
//   });
//   sharedSnap.forEach(d => { 
//     if (!map.has(d.id)) {
//       const data = { id: d.id, ...d.data() };
//       console.log("📄 Shared document:", data.title || data.fileName, "ID:", d.id);
//       map.set(d.id, data);
//     }
//   });
//   const result = Array.from(map.values());
//   console.log("✅ Total documents loaded:", result.length);
//   return result;
// }
window.bootFromCloud = async function() {
  console.log("🚀 bootFromCloud called");
  // ❌ REMOVE THIS – it can block forever
  // await waitForFirebase();
  const me = getCurrentUserEmail();
  console.log("👤 Boot user:", me);
  if (!me || !isFirebaseAvailable()) {
    console.warn("❌ Cannot boot: no user or Firebase unavailable");
    return;
  }
  try {
    if (typeof showLoading === "function") {
      showLoading("טוען מסמכים מהענן...");
    }
    const docs = await loadDocuments();
    console.log("📦 Loaded", docs.length, "documents from Firestore");
    window.allDocsData = docs || [];
    const userNow = me;
    if (typeof setUserDocs === "function") {
      // make sure allUsersData exists
      if (!window.allUsersData) window.allUsersData = {};
      setUserDocs(userNow, window.allDocsData, window.allUsersData);
    }
    // Render home view
    console.log("🎨 Calling renderHome");
    if (typeof window.renderHome === "function") {
      window.renderHome();
    } else if (typeof renderHome === "function") {
      renderHome();
    } else {
      console.error("❌ renderHome function not found!");
    }
    console.log("✅ Boot complete:", window.allDocsData.length, "documents");
  } catch (error) {
    console.error("❌ Boot failed:", error);
  } finally {
    if (typeof hideLoading === "function") hideLoading();
  }
  // if (typeof watchMyDocs === "function") {
  //   watchMyDocs();
  // }
};
console.log("✅ bootFromCloud defined globally");
// ============================================
// FIX 2: Upload document with owner info
// ============================================
// async function uploadDocument(file, metadata = {}) {
//   // ✅ who is the owner
//   const raw = getCurrentUserEmail();
//   const currentUser = raw ? normalizeEmail(raw) : null;
//   console.log("📤 Uploading document for user:", currentUser);
//   if (!currentUser) {
//     console.error("❌ No current user for upload");
//     throw new Error("User not logged in");
//   }
//   // ✅ stable doc id used by both UI & Firestore
//   const newId = crypto.randomUUID();
//   // ✅ sanitize filename for Storage path safety (no weird chars/slashes)
//   const safeName = (file?.name || "file")
//     .replace(/[\\/]+/g, "_")
//     .replace(/[^\w.\-() \u0590-\u05FF]/g, "_"); // allow Hebrew too
//   // ✅ normalize & de-dupe sharedWith, and never include owner
//   const sharedWith = Array.isArray(metadata.sharedWith)
//     ? [...new Set(metadata.sharedWith.map(normalizeEmail).filter(e => e && e !== currentUser))]
//     : [];
//   let downloadURL = null;
//   // Around line 237-252 in uploadDocument
// // Around line 237-252 in uploadDocument
// try {
//   if (window.storage) {
//     const encodedName = encodeURIComponent(safeName);
//     const storagePath = `documents/${currentUser}/${newId}/${encodedName}`;
//     console.log("📤 Attempting Storage upload to:", storagePath);
//     const storageRef = window.fs.ref(window.storage, storagePath);
//     // Increase timeout to 30 seconds for larger files
//     const uploadPromise = window.fs.uploadBytes(storageRef, file);
//     const timeoutPromise = new Promise((_, reject) => 
//       setTimeout(() => reject(new Error('Upload timeout')), 30000)
//     );
//     const snap = await Promise.race([uploadPromise, timeoutPromise]);
//     downloadURL = await window.fs.getDownloadURL(snap.ref);
//     console.log("✅ File uploaded to Storage:", downloadURL);
//   }
// } catch (e) {
//   console.warn("⚠️ Storage upload failed (will save metadata only):", e.message);
//   downloadURL = null;
// }
// // Continue even if storage fails - save to Firestore with metadata
//   const docRef = window.fs.doc(window.db, "documents", newId);
//   // ✅ write canonical fields (avoid letting incoming metadata override owner/ids)
//   const docData = {
//   title: metadata.title ?? safeName,
//   category: metadata.category ?? "אחר",
//   year: metadata.year ?? String(new Date().getFullYear()),
//   org: metadata.org ?? "",
//   recipient: Array.isArray(metadata.recipient) ? metadata.recipient : [],
//   warrantyStart: metadata.warrantyStart ?? null,
//   warrantyExpiresAt: metadata.warrantyExpiresAt ?? null,
//   autoDeleteAfter: metadata.autoDeleteAfter ?? null,
//   owner: currentUser,
//   sharedWith,
//   downloadURL: downloadURL || null,
//   fileName: safeName,
//   fileSize: file?.size ?? null,
//   fileType: file?.type ?? "application/octet-stream",
//   uploadedAt: (window.fs.serverTimestamp?.() ?? Date.now()),
//   lastModified: (window.fs.serverTimestamp?.() ?? Date.now()),
//   lastModifiedBy: currentUser,
//   deletedAt: null,
//   deletedBy: null
//   // Make sure NO undefined fields are here
// };
// // Remove any undefined fields before saving
// Object.keys(docData).forEach(key => {
//   if (docData[key] === undefined) {
//     delete docData[key];
//   }
// });
//   await window.fs.setDoc(docRef, docData, { merge: true });
//   console.log("✅ Document metadata saved to Firestore:", newId);
//   return { id: newId, ...docData };
// }
function watchMyDocs() {
  if (!isFirebaseAvailable()) return () => {};
  if (stopWatching) { try { stopWatching(); } catch (_) {} }
  const me = getCurrentUserEmail();
  if (!me) return () => {};
  const col = window.fs.collection(window.db, "documents");
  const qOwned  = window.fs.query(col, window.fs.where("owner", "==", me));
  const qShared = window.fs.query(col, window.fs.where("sharedWith", "array-contains", me));
  const applySnap = (snap) => {
    // Merge into global allDocsData (owned + shared)
    const byId = new Map((allDocsData || []).map(d => [d.id, d]));
    snap.forEach(doc => {
      const data = { id: doc.id, ...doc.data() };
      byId.set(doc.id, data);
    });
    allDocsData = Array.from(byId.values());
    // Make sure your app-level cache also updated:
    if (typeof setUserDocs === "function" && typeof allUsersData !== "undefined" && typeof userNow !== "undefined") {
      setUserDocs(userNow, allDocsData, allUsersData);
    }
    // ✅ Re-render ONLY if we're NOT on home view
    const homeView = document.getElementById("homeView");
    const isOnHomeView = homeView && !homeView.classList.contains("hidden");
    if (isOnHomeView) {
      // אנחנו במסך הבית - רק נרענן את התיקיות אם צריך, אבל לא נעבור למסך אחר
      console.log("🏠 On home view, staying here");
      if (typeof renderHome === "function") {
        renderHome();
      }
      return;
    }
    // Re-render the current view (רק אם לא במסך הבית)
    if (typeof categoryTitle !== "undefined" && categoryTitle?.textContent) {
      const current = categoryTitle.textContent;
      if (current === "אחסון משותף" && typeof openSharedView === "function") {
        openSharedView();
      } else if (current === "סל מחזור" && typeof openRecycleView === "function") {
        openRecycleView();
      } else if (typeof openCategoryView === "function") {
        openCategoryView(current);
      }
    }
  };
  const unsubOwned  = window.fs.onSnapshot(qOwned,  (snap) => applySnap(snap));
  const unsubShared = window.fs.onSnapshot(qShared, (snap) => applySnap(snap));
  stopWatching = () => { unsubOwned(); unsubShared(); };
  return stopWatching;
}
async function bootFromCloud() {
  const me = getCurrentUserEmail();
  console.log("🚀 bootFromCloud called for:", me);
  if (!me || !isFirebaseAvailable()) {
    console.warn("❌ Cannot boot from cloud: no user or Firebase unavailable");
    return;
  }
  try {
    if (typeof showLoading === "function") showLoading("טוען מסמכים מהענן...");
    // Load documents from Firestore
    const docs = await loadDocuments();
    console.log("📦 Loaded", docs.length, "documents from Firestore for", me);
    // IMPORTANT: Replace allDocsData completely with cloud data
    // This ensures each user sees only their documents
    allDocsData = docs || [];
    // Update the user's local cache
    if (typeof setUserDocs === "function" && typeof allUsersData !== "undefined" && typeof userNow !== "undefined") {
      setUserDocs(userNow, allDocsData, allUsersData);
    }
    // Render the home view
    if (typeof renderHome === "function") renderHome();
    console.log("✅ Boot from cloud complete:", allDocsData.length, "documents loaded");
  } catch (error) {
    console.error("❌ Boot from cloud failed:", error);
  } finally {
    if (typeof hideLoading === "function") hideLoading();
  }
  // Start live updates
  watchMyDocs();
}
// ============================================
// FIX 3: Load shared folders with user filtering
// ============================================
async function loadSharedFolders() {
  const currentUser = getCurrentUserEmail();
  if (!currentUser || !isFirebaseAvailable()) return [];
  const col = window.fs.collection(window.db, "sharedFolders");
  const qOwned  = window.fs.query(col, window.fs.where("owner", "==", currentUser));
  const qMember = window.fs.query(col, window.fs.where("members", "array-contains", currentUser));
  const [ownedSnap, memberSnap] = await Promise.all([
    window.fs.getDocs(qOwned),
    window.fs.getDocs(qMember),
  ]);
  const out = [];
  ownedSnap.forEach(d => out.push({ id: d.id, ...d.data() }));
  memberSnap.forEach(d => { if (!out.find(f => f.id === d.id)) out.push({ id: d.id, ...d.data() }); });
  return out;
}
// ============================================
// FIX 4: Create shared folder with owner info
// ============================================
async function createSharedFolder(folderName, invitedEmails = []) {
  console.log("📁 createSharedFolder called:", folderName);
  const currentUser = getCurrentUserEmail();
  if (!currentUser || !isFirebaseAvailable()) throw new Error("User not logged in");
  const folderData = {
    name: folderName,
    owner: currentUser,
    members: [currentUser, ...invitedEmails.map(normalizeEmail)],
    pendingInvites: invitedEmails.map(e => ({
      email: normalizeEmail(e),
      invitedBy: currentUser,
      invitedAt: Date.now(),
      status: "pending",
    })),
    createdAt: Date.now(),
    createdBy: currentUser,
  };
  const col = window.fs.collection(window.db, "sharedFolders");
  const ref = await window.fs.addDoc(col, folderData);
  const newFolder = { id: ref.id, ...folderData };
  console.log("✅ Folder saved to Firestore:", newFolder.id);
  // ✅ שמור גם ב-cache המקומי
  if (!window.mySharedFolders) {
    window.mySharedFolders = [];
    console.log("🆕 Initialized window.mySharedFolders");
  }
  window.mySharedFolders.push(newFolder);
  console.log("✅ Added to window.mySharedFolders, total:", window.mySharedFolders.length);
  // שמור ב-localStorage
  try {
    const me = getCurrentUserEmail();
    if (me) {
      const key = `sharedFolders_${me}`;
      localStorage.setItem(key, JSON.stringify(window.mySharedFolders));
      console.log("✅ Saved to localStorage with key:", key);
      console.log("💾 localStorage value:", localStorage.getItem(key));
    }
  } catch (err) {
    console.warn("⚠️ Could not save to cache:", err);
  }
  return newFolder;
}
// ============================================
// FIX 5: Share document with proper ownership check
// ============================================
async function shareDocument(docId, recipientEmails) {
  const me = getCurrentUserEmail();
  if (!me || !isFirebaseAvailable()) throw new Error("User not logged in");
  const ref  = window.fs.doc(window.db, "documents", docId);
  const snap = await window.fs.getDoc(ref);
  if (!snap.exists()) throw new Error("Document not found");
  const data = snap.data();
  if (data.owner !== me) throw new Error("Only the owner can share this document");
  const newShared = [...new Set([...(data.sharedWith || []), ...recipientEmails.map(normalizeEmail)])];
  await window.fs.updateDoc(ref, { sharedWith: newShared, lastModified: Date.now(), lastModifiedBy: me });
  return { success: true };
}
// Add document to shared folder
async function addDocumentToSharedFolder(docId, folderId) {
  const me = getCurrentUserEmail();
  console.log("📂 addDocumentToSharedFolder called:", { docId, folderId, me });
  if (!me || !isFirebaseAvailable()) {
    console.error("❌ User not logged in or Firebase not available");
    throw new Error("User not logged in");
  }
  // Get the folder
  const folderRef = window.fs.doc(window.db, "sharedFolders", folderId);
  const folderSnap = await window.fs.getDoc(folderRef);
  if (!folderSnap.exists()) {
    console.error("❌ Folder not found:", folderId);
    throw new Error("Folder not found");
  }
  const folderData = folderSnap.data();
  console.log("📁 Folder data:", folderData);
  // Check if user is a member
  if (!folderData.members?.includes(me)) {
    console.error("❌ User not a member:", { me, members: folderData.members });
    throw new Error("You are not a member of this folder");
  }
  // 🔥 חשוב! נסה למצוא את המסמך - קודם ב-documents, אחר כך ב-localStorage
  let docData = null;
  // נסה ב-Firestore documents collection
  try {
    const docRef = window.fs.doc(window.db, "documents", docId);
    const docSnap = await window.fs.getDoc(docRef);
    if (docSnap.exists()) {
      docData = docSnap.data();
      console.log("✅ Found document in Firestore:", docData);
    } else {
      console.warn("⚠️ Document not found in Firestore, trying localStorage...");
    }
  } catch (err) {
    console.warn("⚠️ Error fetching from Firestore:", err);
  }
  // אם לא מצאנו ב-Firestore, נסה ב-localStorage
  if (!docData) {
    console.log("🔍 Searching in localStorage...");
    const allUsers = loadAllUsersDataFromStorage();
    const currentUser = getCurrentUser();
    const userData = allUsers[currentUser];
    if (userData && userData.docs) {
      const localDoc = userData.docs.find(d => d.id === docId);
      if (localDoc) {
        docData = localDoc;
        console.log("✅ Found document in localStorage:", docData);
      }
    }
  }
  if (!docData) {
    console.error("❌ Document not found anywhere:", docId);
    throw new Error("Document not found");
  }
  // Only owner can add to folder
  const docOwner = normalizeEmail(docData.owner || me);
  if (docOwner !== me) {
    console.error("❌ Not document owner:", { docOwner, me });
    throw new Error("Only the document owner can add it to folders");
  }
  // 🔥 חשוב! צור רשומה ב-sharedDocs collection ישירות
  console.log("📤 Creating sharedDocs record...");
  try {
    await upsertSharedDocRecord({
      id: docData.id || docId,
      title: docData.title || docData.fileName || docData.file_name || "מסמך",
      fileName: docData.fileName || docData.file_name || docData.title || "מסמך",
      category: docData.category || [],
      uploadedAt: docData.uploadedAt || docData.uploaded_at || Date.now(),
      warrantyStart: docData.warrantyStart || docData.warranty_start || null,
      warrantyExpiresAt: docData.warrantyExpiresAt || docData.warranty_expires_at || null,
      org: docData.org || "",
      year: docData.year || "",
      recipient: docData.recipient || []
    }, folderId);
    console.log("✅ sharedDocs record created successfully");
  } catch (err) {
    console.error("❌ Failed to create sharedDocs record:", err);
    throw err;
  }
  // Update document in Firestore if it exists there
  try {
    const docRef = window.fs.doc(window.db, "documents", docId);
    const docSnap = await window.fs.getDoc(docRef);
    if (docSnap.exists()) {
      const folders = docSnap.data().sharedFolders || [];
      if (!folders.includes(folderId)) {
        folders.push(folderId);
        await window.fs.updateDoc(docRef, { 
          sharedFolders: folders,
          lastModified: Date.now(),
          lastModifiedBy: me
        });
        console.log("✅ Updated document in Firestore");
      }
    }
  } catch (err) {
    console.warn("⚠️ Could not update document in Firestore:", err);
  }
  // Update folder with document reference
  try {
    const docs = folderData.documents || [];
    if (!docs.includes(docId)) {
      docs.push(docId);
      await window.fs.updateDoc(folderRef, { 
        documents: docs,
        lastModified: Date.now(),
        lastModifiedBy: me
      });
      console.log("✅ Updated folder with document reference");
    }
  } catch (err) {
    console.warn("⚠️ Could not update folder:", err);
  }
  console.log("✅ Document added to shared folder successfully");
  return { success: true };
}
// ============================================
// FIX 6: Get documents for specific category with user filter
// ============================================
async function getDocumentsByCategory(category) {
  const me = getCurrentUserEmail();
  if (!me || !isFirebaseAvailable()) return [];
  const col = window.fs.collection(window.db, "documents");
  const qOwned  = window.fs.query(col,
    window.fs.where("owner", "==", me),
    window.fs.where("category", "==", category),
    window.fs.where("deletedAt", "==", null)
  );
  const qShared = window.fs.query(col,
    window.fs.where("sharedWith", "array-contains", me),
    window.fs.where("category", "==", category),
    window.fs.where("deletedAt", "==", null)
  );
  const [a, b] = await Promise.all([window.fs.getDocs(qOwned), window.fs.getDocs(qShared)]);
  const out = [];
  a.forEach(d => out.push({ id: d.id, ...d.data() }));
  b.forEach(d => { if (!out.find(x => x.id === d.id)) out.push({ id: d.id, ...d.data() }); });
  return out;
}
// ============================================
// EXPORT ALL FUNCTIONS
// ============================================
// Make these available globally or export them
window.AppFunctions = {
  loadDocuments,
  uploadDocument,
  loadSharedFolders,
  createSharedFolder,
  shareDocument,
  getDocumentsByCategory,
  getCurrentUserEmail
};
// ✅ הגדרה ישירה גם על window
window.createSharedFolder = createSharedFolder;
window.loadSharedFolders = loadSharedFolders;
console.log("✅ User-scoped Firebase functions loaded");
document.getElementById("closeMenuBtn")?.addEventListener("click", () => {
  // change '.sidebar' to your actual drawer element selector if different
  document.querySelector(".sidebar")?.classList.remove("open");
});
const sidebar = document.querySelector(".sidebar");
const openBtn = document.getElementById("openMenuBtn");  // your button that opens the menu
const closeBtn = document.getElementById("closeMenuBtn"); // the ✕ button inside the menu
openBtn?.addEventListener("click", () => {
  sidebar.classList.add("open");
});
closeBtn?.addEventListener("click", () => {
  sidebar.classList.remove("open");
});
document.getElementById("premiumBtn")?.addEventListener("click", () => {
  document.getElementById("premiumPanel")?.classList.remove("hidden");
});
/*************************
 * 0. IndexedDB helpers  *
 *************************/
// נפתח/ניצור DB בשם "docArchiveDB" עם טבלה "files"
// בקי לכל קובץ: id (המזהה של הדוקומנט)
// value שמור זה ה-base64 (dataURL)
// בדיקה אם Firebase זמין
window.isFirebaseAvailable = function() {
  try {
    // check Firestore connection objects exist
    return !!(window.db && window.fs && typeof window.fs.getDoc === "function" && navigator.onLine);
  } catch (e) {
    console.error("Error checking Firebase:", e);
    return false;
  }
};
async function uploadDocumentWithStorage(file, metadata = {}, forcedId=null) {
  const currentUser = normalizeEmail(getCurrentUserEmail());
  if (!currentUser) throw new Error("User not logged in");
  const id = forcedId || crypto.randomUUID();
  let downloadURL = null;
  // (optional) upload bytes to Storage
  if (window.storage && isFirebaseAvailable()) {
    const storageRef = window.fs.ref(window.storage, `documents/${currentUser}/${id}_${file.name}`);
    const snap = await window.fs.uploadBytes(storageRef, file);
    downloadURL = await window.fs.getDownloadURL(snap.ref);
  }
  // write metadata to Firestore
  const docRef = window.fs.doc(window.db, "documents", id);
  const docData = {
    ...metadata,
    owner: currentUser,
    sharedWith: Array.isArray(metadata.sharedWith) ? metadata.sharedWith : [],
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
uploadedAt: new Date().toISOString(),
    downloadURL: downloadURL || null,
    deletedAt: null,
    deletedBy: null,
  };
  await window.fs.setDoc(docRef, docData, { merge: true });
  return { id, ...docData };
}
function handleLogout() {
    console.log("🚪 Logging out...");
    const auth = getAuth();
    // Stop any active listeners
    try { if (stopWatching) stopWatching(); } catch (_) {}
    try { if (window._stopMembersWatch) window._stopMembersWatch(); } catch (_) {}
    try { if (window._stopSharedDocsWatch) window._stopSharedDocsWatch(); } catch (_) {}
    // Clear in-memory caches (optional)
    try { 
        allDocsData = [];
        Object.keys(memoryUsers).forEach(key => delete memoryUsers[key]);
    } catch (_) {}
    // Sign out the user via Firebase
    signOut(auth)
        .then(() => {
            console.log("✅ Logout complete, redirecting to login...");
            window.location.replace("forms/eco-wellness/index.html");
        })
        .catch((error) => {
            console.error("❌ Error signing out:", error);
        });
}
async function syncAllLocalDocsToCloud() {
  if (!isFirebaseAvailable()) {
    showNotification("Firebase לא זמין", true);
    return;
  }
  showLoading("מסנכרן מסמכים לענן...");
  let synced = 0;
  let failed = 0;
  for (const doc of allDocsData) {
    if (doc._trashed) continue;
    // Check if already has downloadURL
    if (doc.downloadURL) {
      synced++;
      continue;
    }
    // Try to get file from IndexedDB
    const dataUrl = await loadFileFromDB(doc.id).catch(() => null);
    if (!dataUrl) {
      console.warn(`No file data for doc ${doc.id}`);
      failed++;
      continue;
    }
    // Convert dataURL to Blob
    try {
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      // Create File object
      const file = new File(
        [blob], 
        doc.originalFileName || doc.fileName || "file", 
        { type: doc.mimeType || "application/octet-stream" }
      );
      // Upload to Storage
      const currentUser = normalizeEmail(getCurrentUserEmail() || userNow);
      const storageRef = window.fs.ref(
        window.storage, 
        `documents/${currentUser}/${doc.id}_${file.name}`
      );
      const snapshot = await window.fs.uploadBytes(storageRef, file);
      const downloadURL = await window.fs.getDownloadURL(snapshot.ref);
      // Update Firestore
      const docRef = window.fs.doc(window.db, "documents", doc.id);
      await window.fs.updateDoc(docRef, { downloadURL });
      // Update local
      doc.downloadURL = downloadURL;
      synced++;
      console.log(`✅ Synced doc ${doc.id}`);
    } catch (e) {
      console.error(`❌ Failed to sync doc ${doc.id}:`, e);
      failed++;
    }
  }
  setUserDocs(userNow, allDocsData, allUsersData);
  hideLoading();
  showNotification(`✅ ס×•× ×›×¨× ×• ${synced} ×ž×¡×ž×›×™×${failed > 0 ? `, ${failed} × ×›×©×œ×•` : ''}`);
}
// Make functions globally accessible
window.syncAllLocalDocsToCloud = syncAllLocalDocsToCloud;
window.handleLogout = handleLogout;
console.log("✅ Enhanced Firebase persistence loaded");
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("docArchiveDB", 1);
    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains("files")) {
        db.createObjectStore("files", { keyPath: "id" });
      }
    };
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = (e) => {
      reject(e.target.error);
    };
  });
}
// שמירת קובץ (base64) ב-IndexedDB
async function saveFileToDB(docId, dataUrl) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["files"], "readwrite");
    const store = tx.objectStore("files");
    store.put({ id: docId, dataUrl });
    tx.oncomplete = () => resolve(true);
    tx.onerror = (e) => reject(e.target.error);
  });
}
// שליפה של קובץ מה-DB לפי docId
async function loadFileFromDB(docId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["files"], "readonly");
    const store = tx.objectStore("files");
    const req = store.get(docId);
    req.onsuccess = () => {
      if (req.result) resolve(req.result.dataUrl);
      else resolve(null);
    };
    req.onerror = (e) => {
      reject(e.target.error);
    };
  });
}
// מחיקה של קובץ מה-DB (אם מוחקים לצמיתות)
async function deleteFileFromDB(docId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["files"], "readwrite");
    const store = tx.objectStore("files");
    store.delete(docId);
    tx.oncomplete = () => resolve(true);
    tx.onerror = (e) => reject(e.target.error);
  });
}
// סנכרון משתמש חדש ל-Firestore
// סנכרון משתמש חדש ל-Firestore
async function syncUserToFirestore(email, password = "") {
  console.log("🔄 מנסה לסנכרן משתמש:", email);
  // בדיקה פשוטה יותר
  if (!window.db || !window.fs) {
    console.warn("❌ Firebase לא זמין - חסר DB או FS");
    return false;
  }
  if (!navigator.onLine) {
    console.warn("❌ אין חיבור לאינטרנט");
    return false;
  }
  try {
    const key = email.trim().toLowerCase();
    console.log("🔑 Creating user document for:", key);
    const userRef = window.fs.doc(window.db, "users", key);
    await window.fs.setDoc(userRef, {
      email: key,
      password: password,
      sharedFolders: {},
      createdAt: Date.now()
    }, { merge: true });
    console.log("✅ משתמש סונכרן ל-Firestore:", key);
    return true;
  } catch (e) {
    console.error("❌ שגיאה בסנכרון משתמש ל-Firestore:", e);
    console.error("Error details:", e.message, e.code);
    return false;
  }
}
async function checkUserExistsInFirestore(email) {
  const key = email.trim().toLowerCase();
  // בדיקה שיש email תקין
  if (!key || key === "") {
    console.warn("checkUserExistsInFirestore: empty email");
    return false;
  }
  console.log("בודק משתמש ב-Firestore:", key);
  // אם Firebase לא זמין, בדוק ב-localStorage
  if (!isFirebaseAvailable()) {
    console.warn("Firebase לא זמין, בודק ב-localStorage");
    const allUsers = loadAllUsersDataFromStorage();
    for (const [username, userData] of Object.entries(allUsers)) {
      const userEmail = (userData.email || username).toLowerCase();
      if (userEmail === key) {
        console.log("✅ משתמש נמצא ב-localStorage:", username);
        return true;
      }
    }
    console.log("❌ משתמש לא נמצא ב-localStorage");
    return false;
  }
  // בדיקה ב-Firestore
  try {
    const userRef = window.fs.doc(window.db, "users", key);
    const docSnap = await window.fs.getDoc(userRef);
    if (docSnap.exists()) {
      console.log("✅ משתמש נמצא ב-Firestore:", key);
      return true;
    }
    console.log("❌ משתמש לא נמצא ב-Firestore");
    return false;
  } catch (e) {
    console.error("שגיאה בבדיקת משתמש ב-Firestore:", e);
    // Fallback ל-localStorage במקרה של שגיאה
    console.warn("עובר ל-localStorage בגלל שגיאה");
    const allUsers = loadAllUsersDataFromStorage();
    for (const [username, userData] of Object.entries(allUsers)) {
      const userEmail = (userData.email || username).toLowerCase();
      if (userEmail === key) {
        console.log("✅ משתמש נמצא ב-localStorage (fallback):", username);
        return true;
      }
    }
    return false;
  }
}
window.syncAllUsers = async function() {
  if (!isFirebaseAvailable()) {
    console.warn("❌ Firebase unavailable");
    return;
  }
  const allUsers = loadAllUsersDataFromStorage();
  let successCount = 0;
  for (const [username, userData] of Object.entries(allUsers)) {
    const email = userData.email || username;
    const password = userData.password || "";
    const result = await syncUserToFirestore(email, password);
    if (result) successCount++;
  }
  console.log(`✅ Synced ${successCount} users to Firestore`);
};
// הוסף פונקציה זו איפשהו בקוד
async function syncAllLocalUsersToFirestore() {
  if (!isFirebaseAvailable()) {
    //showNotification("Firebase לא זמין", true);
    return;
  }
  const allUsers = loadAllUsersDataFromStorage();
  let count = 0;
  for (const [username, userData] of Object.entries(allUsers)) {
    const email = userData.email || username;
    const success = await syncUserToFirestore(email, userData.password || "");
    if (success) count++;
  }
  //showNotification(`✅ ${count} משתמשים סונכרנו ל-Firestore`);
}
 syncAllLocalUsersToFirestore();
async function sendShareInviteToFirestore(fromEmail, toEmail, folderId, folderName) {
  // נורמליזציה של אימיילים אחידה
  fromEmail = normalizeEmail(fromEmail);
  toEmail   = normalizeEmail(toEmail);
  console.log("📤 Sending invite from", fromEmail, "to", toEmail);
  // אם Firebase לא זמין, שמור ב-localStorage
  if (!isFirebaseAvailable()) {
    console.warn("Firebase לא זמין, שומר הזמנה ב-localStorage");
    try {
      const allUsers = loadAllUsersDataFromStorage();
      const targetUser = findUsernameByEmail(allUsers, toEmail);
      if (!targetUser) {
        console.error("משתמש היעד לא נמצא:", toEmail);
        return false;
      }
      ensureUserSharedFields(allUsers, targetUser);
      allUsers[targetUser].incomingShareRequests.push({
        folderId,
        folderName,
        fromEmail: fromEmail,
        toEmail: toEmail,
        status: "pending",
        createdAt: Date.now()
      });
      saveAllUsersDataToStorage(allUsers);
      console.log("✅ הזמנה נשמרה ב-localStorage");
      return true;
    } catch (e) {
      console.error("שגיאה בשמירה ב-localStorage:", e);
      return false;
    }
  }
  // אם Firebase זמין, נסה לשלוח
  try {
    const inviteRef = window.fs.collection(window.db, "shareInvites");
    await window.fs.addDoc(inviteRef, {
      folderId,
      folderName,
      fromEmail: fromEmail,
      toEmail: toEmail,
      status: "pending",
      createdAt: Date.now()
    });
    console.log("✅ הזמנה נשלחה ל-Firestore");
    return true;
  } catch (e) {
    console.error("שגיאה בשליחת הזמנה ל-Firestore, עובר ל-localStorage:", e);
    // Fallback ל-localStorage (בלי רקורסיה!)
    try {
      const allUsers = loadAllUsersDataFromStorage();
      const targetUser = findUsernameByEmail(allUsers, toEmail);
      if (!targetUser) return false;
      ensureUserSharedFields(allUsers, targetUser);
      allUsers[targetUser].incomingShareRequests.push({
        folderId,
        folderName,
        fromEmail: fromEmail,
        toEmail: toEmail,
        status: "pending",
        createdAt: Date.now()
      });
      saveAllUsersDataToStorage(allUsers);
      return true;
    } catch (localErr) {
      console.error("גם localStorage נכשל:", localErr);
      return false;
    }
  }
}
// קבלת הזמנות ממתינות למשתמש (Firestore)
// קבלת הזמנות ממתינות למשתמש (Firestore)
// קבלת הזמנות ממתינות למשתמש (Firestore)
async function getPendingInvitesFromFirestore(userEmail) {
  const allUsers = loadAllUsersDataFromStorage();
 const myEmail = normalizeEmail(userEmail || getCurrentUserEmail() || "");
  if (!isFirebaseAvailable()) {
    console.warn("Firebase לא זמין, בודק ב-localStorage");
    const me = allUsers[currentUserKey];
    return (me?.incomingShareRequests || []).filter(r => r.status === "pending");
  }
  try {
    const invitesRef = window.fs.collection(window.db, "shareInvites");
    const q = window.fs.query(
      invitesRef,
      window.fs.where("toEmail", "==", myEmail),
      window.fs.where("status", "==", "pending")
    );
    const snap = await window.fs.getDocs(q);
    const invites = [];
    snap.forEach(d => invites.push({ id: d.id, ...d.data() }));
    console.log("📩 Pending invites for", myEmail, "=>", invites.length, invites);
    return invites;
  } catch (e) {
    console.error("שגיאה בטעינת הזמנות מ-Firestore, עובר ל-localStorage:", e);
    const me = allUsers[currentUserKey];
    return (me?.incomingShareRequests || []).filter(r => r.status === "pending");
  }
}
// At the very top of main.
// Later, just reassign it — never redeclare
if (stopWatching) stopWatching();
stopWatching = watchPendingInvites(async (invites) => {
  console.log("🔔 Real-time update:", invites.length, "invites");
  paintPending(invites);
});
function watchPendingInvites(onChange) {
  const allUsers = loadAllUsersDataFromStorage();
  const currentUserKey = getCurrentUser();
  const email = normalizeEmail((allUsers[currentUserKey]?.email) || currentUserKey || "");
  if (!isFirebaseAvailable() || !email) return () => {};
  const invitesRef = window.fs.collection(window.db, "shareInvites");
  const q = window.fs.query(
    invitesRef,
    window.fs.where("toEmail", "==", email),
    window.fs.where("status", "==", "pending")
  );
  const unsub = window.fs.onSnapshot(q, (snap) => {
    const invites = [];
    snap.forEach(d => invites.push({ id: d.id, ...d.data() }));
    onChange(invites);
  }, (err) => {
    console.error("onSnapshot error", err);
  });
  return unsub;
}
// עדכון סטטוס הזמנה (Firestore)
async function updateInviteStatus(inviteId, newStatus) {
  try {
    const inviteRef = window.fs.doc(window.db, "shareInvites", inviteId);
    await window.fs.updateDoc(inviteRef, { status: newStatus, updatedAt: Date.now() });
    return true;
  } catch (e) {
    console.error("שגיאה בעדכון הזמנה:", e);
    return false;
  }
}
// הוספת חבר לתיקייה משותפת (Firestore)
// הוספת חבר לתיקייה משותפת (Firestore) - גרסה עמידה
async function addMemberToSharedFolder(folderId, memberEmail, folderName, ownerEmail) {
  try {
    const key = memberEmail.trim().toLowerCase();
    const ownerKey = ownerEmail.trim().toLowerCase();
    // 🔥 עדכון ה-sharedFolders collection (זה הדבר החשוב!)
    const folderRef = window.fs.doc(window.db, "sharedFolders", folderId);
    // בדוק אם התיקייה קיימת
    const folderSnap = await window.fs.getDoc(folderRef);
    if (folderSnap.exists()) {
      // אם התיקייה קיימת, הוסף את החבר למערך
      await window.fs.updateDoc(folderRef, {
        members: window.fs.arrayUnion(key)
      });
      console.log("✅ Added member to sharedFolders collection:", key);
    } else {
      // אם התיקייה לא קיימת, צור אותה
      await window.fs.setDoc(folderRef, {
        id: folderId,
        name: folderName,
        owner: ownerKey,
        members: [ownerKey, key],
        createdAt: Date.now(),
        createdBy: ownerKey
      });
      console.log("✅ Created folder in sharedFolders collection:", folderId);
    }
    // גם שמור ב-users collection (לתאימות לאחור)
    const userRef  = window.fs.doc(window.db, "users", key);
    const ownerRef = window.fs.doc(window.db, "users", ownerKey);
    // 1) ודא שקיימים מסמכי המשתמשים (יוצר אם חסר)
    await window.fs.setDoc(userRef,  { email: key },   { merge: true });
    await window.fs.setDoc(ownerRef, { email: ownerKey }, { merge: true });
    // 2) ודא שקיים אובייקט התיקייה אצל שני הצדדים
    const baseFolderObj = {
      name: folderName,
      owner: ownerKey,
      // נתחיל במערך ריק; נמלא עם arrayUnion בהמשך
      members: []
    };
    await window.fs.setDoc(
      userRef,
      { [`sharedFolders.${folderId}`]: baseFolderObj },
      { merge: true }
    );
    await window.fs.setDoc(
      ownerRef,
      { [`sharedFolders.${folderId}`]: baseFolderObj },
      { merge: true }
    );
    // 3) הוסף את החבר החדש למערך החברים אצל שני הצדדים (יוצר את השדה אם אינו קיים)
    await window.fs.updateDoc(userRef, {
      [`sharedFolders.${folderId}.members`]: window.fs.arrayUnion(key, ownerKey)
    });
    await window.fs.updateDoc(ownerRef, {
      [`sharedFolders.${folderId}.members`]: window.fs.arrayUnion(key, ownerKey)
    });
    return true;
  } catch (e) {
    console.error("שגיאה בהוספת חבר:", e);
    return false;
  }
}
// --- Fetch and watch members for a shared folder from Firestore (owner's doc) ---
async function fetchFolderMembersFromOwner(ownerEmail, folderId) {
  if (!isFirebaseAvailable()) return [];
  const ownerKey = normalizeEmail(ownerEmail || "");
  // בדיקה שיש owner email תקין
  if (!ownerKey || ownerKey.trim() === "") {
    console.warn("fetchFolderMembersFromOwner: no valid owner email");
    return [];
  }
  const ownerRef = window.fs.doc(window.db, "users", ownerKey);
  const snap = await window.fs.getDoc(ownerRef);
  if (!snap.exists()) return [];
  const data = snap.data() || {};
  const members = (data.sharedFolders && data.sharedFolders[folderId] && data.sharedFolders[folderId].members) || [];
  return Array.isArray(members) ? members : [];
}
// --- Members: live watch on owner's doc
function watchFolderMembersFromOwner(ownerEmail, folderId, onChange) {
  if (!isFirebaseAvailable()) return () => {};
  const ownerKey = normalizeEmail(ownerEmail || "");
  // בדיקה שיש owner email תקין
  if (!ownerKey || ownerKey.trim() === "") {
    console.warn("watchFolderMembersFromOwner: no valid owner email");
    return () => {};
  }
  const ownerRef = window.fs.doc(window.db, "users", ownerKey);
  const unsub = window.fs.onSnapshot(ownerRef, (snap) => {
    const data = snap.data() || {};
    const members = (data.sharedFolders && data.sharedFolders[folderId] && data.sharedFolders[folderId].members) || [];
    onChange(Array.isArray(members) ? members : []);
  }, (err) => console.error("watchFolderMembersFromOwner error", err));
  return unsub;
}
// --- Shared docs: write one record per doc in a folder
async function upsertSharedDocRecord(docObj, folderId) {
  if (!isFirebaseAvailable()) {
    console.warn("Firebase not available, cannot sync shared doc");
    return false;
  }
  try {
    const currentUser = getCurrentUser() || "defaultUser";
    const allUsers = loadAllUsersDataFromStorage();
    const ownerEmail = (allUsers[currentUser]?.email || currentUser).toLowerCase();
    const recId = `${docObj.id}_${ownerEmail}`;
    console.log("📤 Syncing shared doc to Firestore:", {
      recId,
      folderId,
      ownerEmail,
      fileName: docObj.title || docObj.fileName,
      fileUrl: docObj.fileUrl || docObj.file_url  // 🔥 חשוב לוג!
    });
    const ref = window.fs.doc(window.db, "sharedDocs", recId);
    await window.fs.setDoc(ref, {
      folderId,
      ownerEmail,
      id: docObj.id,
      title: docObj.title || docObj.fileName || docObj.name || "מסמך",
      fileName: docObj.fileName || docObj.title || docObj.name || "מסמך",
      fileUrl: docObj.fileUrl || docObj.file_url || "",  // 🔥🔥🔥 זה הקריטי!!!
      category: docObj.category || [],
      uploadedAt: docObj.uploadedAt || Date.now(),
      warrantyStart: docObj.warrantyStart || null,
      warrantyExpiresAt: docObj.warrantyExpiresAt || null,
      org: docObj.org || "",
      year: docObj.year || "",
      recipient: docObj.recipient || [],
      lastUpdated: Date.now()
    }, { merge: true });
    console.log("✅ Successfully synced shared doc with fileUrl!");
    return true;
  } catch (e) {
    console.error("❌ Error syncing shared doc:", e);
    return false;
  }
}
// --- Shared docs: fetch once by folder
async function fetchSharedFolderDocsFromFirestore(folderId) {
  if (!isFirebaseAvailable()) return [];
  const col = window.fs.collection(window.db, "sharedDocs");
  const q   = window.fs.query(col, window.fs.where("folderId", "==", folderId));
  const snap = await window.fs.getDocs(q);
  const out = [];
  snap.forEach(d => out.push({ id: d.id, ...d.data(), _ownerEmail: d.data().ownerEmail }));
  return out;
}
// --- Shared docs: live watch by folder
function watchSharedFolderDocs(folderId, onChange) {
  if (!isFirebaseAvailable()) return () => {};
  const col = window.fs.collection(window.db, "sharedDocs");
  const q   = window.fs.query(col, window.fs.where("folderId", "==", folderId));
  const unsub = window.fs.onSnapshot(q, (snap) => {
    const out = [];
    snap.forEach(d => out.push({ id: d.id, ...d.data(), _ownerEmail: d.data().ownerEmail }));
    onChange(out);
  }, (err) => console.error("watchSharedFolderDocs error", err));
  return unsub;
}
// --- (Optional) sync my local docs that are in a shared folder -> Firestore
// --- Shared docs: mirror my locally-tagged docs into Firestore (self-contained)
async function syncMySharedDocsToFirestore() {
  if (!isFirebaseAvailable()) return;
  // pull fresh data from storage + current user safely (no outer-scope vars)
  const meKey = (getCurrentUser && getCurrentUser()) || "defaultUser";
  const allUsers = (typeof loadAllUsersDataFromStorage === "function")
    ? loadAllUsersDataFromStorage()
    : {};
  const me = allUsers[meKey] || {};
  const myDocs = Array.isArray(me.docs) ? me.docs : [];
  for (const d of myDocs) {
    if (!d._trashed && d.sharedFolderId) {
      await upsertSharedDocRecord(d, d.sharedFolderId);
    }
  }
}
async function migrateLocalDocsToDocuments() {
  if (!isFirebaseAvailable()) { console.warn("Firebase unavailable"); return; }
  const me = normalizeEmail(getCurrentUserEmail());
  let pushed = 0;
  for (const d of allDocsData) {
    if (!d || d._trashed) continue;
    const ref = window.fs.doc(window.db, "documents", d.id || crypto.randomUUID());
    await window.fs.setDoc(ref, { ...d, owner: me }, { merge: true });
    pushed++;
  }
  console.log("Migrated", pushed, "docs");
}
window.isFirebaseAvailable = function () {
  try { return !!(window.db && window.fs && typeof window.fs.getDoc === "function"); }
  catch { return false; }
};
/*************************
 * 1. קטגוריות / מילות מפתח
 *************************/
const CATEGORY_KEYWORDS = {
  "כלכלה": [
    "חשבון","חשבונית","חשבונית מס","חשבוניתמס","חשבוניתמס קבלה","קבלה","קבלות",
    "ארנונה","ארנונה מגורים","ארנונה לבית","סכום לתשלום","סכום לתשלום מיידי",
    "בנק","בנק הפועלים","בנק לאומי","בנק דיסקונט","יתרה","מאזן","עובר ושב","עו\"ש",
    "אשראי","כרטיס אשראי","פירוט אשראי","פירוט כרטיס","חיוב אשראי",
    "תשלום","תשלומים","הוראת קבע","הוראתקבע","חיוב חודשי","חיוב חודשי לכרטיס",
    "משכנתא","הלוואה","הלוואות","יתרת הלוואה","פירעון","ריבית","ריביות",
    "משכורת","משכורת חודשית","משכורת נטו","שכר","שכר עבודה","שכר חודשי","שכר נטו",
    "תלוש","תלוש שכר","תלושי שכר","תלושמשכורת","תלושמשכורת חודשי",
    "ביטוח לאומי","ביטוחלאומי","ביטוח לאמי","ביטוח לאומי ישראל",
    "דמי אבטלה","אבטלה","מענק","גמלה","קצבה","קיצבה","קיצבה חודשית","פנסיה","קרן פנסיה","קרןפנסיה",
    "קופת גמל","קופתגמל","גמל","פנסיוני","פנסיונית",
    "מס הכנסה","מסהכנסה","מס הכנסה שנתי","דו\"ח שנתי","דו\"ח מס","דוח מס","מס שנתי",
    "החזר מס","החזרי מס","החזרמס","מע\"מ","מעמ","דיווח מע\"מ","דוח מע\"מ","דו\"ח מע\"מ",
    "ביטוח רכב","ביטוח רכב חובה","ביטוח חובה","ביטוח מקיף","ביטוחהדירה","ביטוח הדירה","פרמיה","פרמיית ביטוח",
    "פוליסה","פוליסת ביטוח","פרמיה לתשלום","חוב לתשלום","הודעת חיוב"
  ],
  "רפואה": [
    "רפואה","רפואי","רפואית","מסמך רפואי","מכתב רפואי","דוח רפואי",
    "מרפאה","מרפאה מומחה","מרפאת מומחים","מרפאת נשים","מרפאת ילדים",
    "קופת חולים","קופתחולים","קופה","קופת חולים כללית","כללית","מכבי","מאוחדת","לאומית",
    "רופא","רופאה","רופא משפחה","רופאת משפחה","רופא ילדים","רופאת ילדים",
    "סיכום ביקור","סיכוםביקור","סיכום מחלה","סיכום אשפוז","סיכום אשפוז ושחרור",
    "מכתב שחרור","שחרור מבית חולים","שחרור מבית\"ח","שחרור מבית חולים כללי",
    "בדיקת דם","בדיקות דם","בדיקות המים","בדיקה דם","בדיקות מעבדה","מעבדה","בדיקות מעבדה",
    "אבחנה","אבחון","אבחנה רפואית","דיאגנוזה","דיאגניזה","דיאגנוזה רפואית",
    "הפניה","הפניית","הפניה לבדיקות","הפניית לרופא מומחה","הפניה לרופא מומחה",
    "תור לרופא","תור לרופאה","זימון תור","זימון בדיקה","זימון בדיקות",
    "מרשם","מרשם תרופות","רשימת תרופות","תרופות","תרופה","טיפול תרופתי",
    "טיפול","טיפול רגשי","טיפול פסיכולוגי","פסיכולוג","פסיכולוגית","טיפול נפשי",
    "חיסון","חיסוני","תעודת התחסנות","פנקס חיסוני","כרטיס חיסוני","תעודת חיסוני",
    "אשפוז","אשפוז יום","מחלקה","בית חולים","ביתחולים","בי\"ח","ביה\"ח",
    "אישור מחלה","אישור מחלה לעבודה","אישור מחלה לבית ספר",
    "אישור רפואי","אישור כשירות","אישור כשירות רפואית",
    "טופס התחייבות","טופס 17","טופס17","התחייבות","התחיבות","התחיבות קופה","התחייבות קופה",
    "בדיקת קורונה","קורונה חיובי","קורונה שלילי","PCR","covid","בדיקת הריון","US","אולטרסאונד",
    "נכות רפואית","ועדה רפואית","קביעת נכות"
  ],
  "עבודה": [
    "חוזה העסקה","חוזה העסקה אישי","חוזה עבודה","חוזה העסקה לעובד","חוזה העסקה לעובדת",
    "מכתב קבלה לעבודה","קבלה לעבודה","מכתב התחלת עבודה","ברוכים הבאים לחברה",
    "אישור העסקה","אישור העסקה רשמי","אישור העסקה לעובד","אישור ותק","אישור שנות ותק","אישור ניסיון תעסוקתי",
    "תלוש שכר","תלוששכר","תלוש משכורת","תלושי שכר","תלושי משכורת","שעות נוספות","שעותנוספות","רשימת משמרות","משמרות",
    "שכר עבודה","שכר לשעה","שכר חודשי","טופס שעות","אישור תשלום",
    "הצהרת מעסיק","טופס למעסיק","אישור מעסיק","אישור העסקה לצורך ביטוח לאומי",
    "מכתב פיטורין","מכתב סיום העסקה","הודעה מוקדמת","שימוע לפני פיטורין","פיטורין","פיטורין",
    "סיום העסקה","סיום יחסי עובד מעביד","יחסי עובד מעביד","עובד","מעסיק","מעסיקה",
    "הערכת עובד","הערכת ביצועים","דו\"ח ביצועים","חוות דעת מנהל","משוב עובד"
  ],
  "בית": [
    "חוזה שכירות","חוזהשכירות","הסכם שכירות","הסכםשכירות","שוכר","שוכרת","שוכרים","משכיר","משכירה","דירה",
    "נכס","נכס מגורים","כתובת מגורים","מגורים קבועים","עדכון כתובת","הצהרת מגורים",
    "ועד בית","ועדבית","ועד בית חודשי","תשלום ועד בית","גביית ועד בית","ועד בנין",
    "חברת חשמל","חברת החשמל","חשמל","חשבון חשמל","קריאת מונה","מונה חשמל",
    "גז","חברת גז","קריאת מונה גז","מים","תאגיד מים","חשבון מים","מים חודשי",
    "אינטרנט","ספק אינטרנט","ראוטר","נתב","חשבונית אינטרנט","הוט","יס","HOT","yes","סיגיב","סיגיב אופטייס",
    "ארנונה","ארנונה מגורים","חוב ארנונה","הרשת תשלום ארנונה","ארנונה עירייה","עירייה",
    "גירושין","הסכם גירושין","צו גירושין","משמורת","צו משמורת","משמורת ילדים",
    "הסדרי ראייה","הסדרי ראיה","מזונות","דמי מזונות","תשלום מזונות","משפחה","משפחתי","הורה משמורן","הורה משמורנית"
  ],
  "אחריות": [
    "אחריות","אחריות למוצר","אחריות מוצר","אחריות יצרן","אחריות יבואן","אחריות יבואן רשמי",
    "אחריות יבואן מורשה","אחריות לשנה","אחריות לשנתיים","אחריות ל12 חודשים","אחריות ל-12 חודשים",
    "אחריות ל24 חודשים","אחריות ל-24 חודשים","שנת אחריות","שנתיים אחריות","תוך אחריות",
    "תאריך אחריות","תוך תקופת האחריות","סיומה של האחריות","פג תוקף אחריות","פג תוקף האחריות",
    "תעודת אחריות","ת.אחריות","ת. אחריות","תעודת-אחריות","כרטיס אחריות",
    "הוכחת קנייה","הוכחת קניה","אישור רכישה","חשבונית קנייה","תעודת משלוח","תעודת מסירה",
    "מספר סידורי","serial number","imei","rma","repair ticket","repair order"
  ],
  "תעודות": [
    "תעודת זהות","ת.ז","תז","תעודת לידה","ספח","ספח תעודת זהות","ספח ת.ז",
    "רישיון נהיגה","רישיון רכב","הרכון","passport","הרכון ביומטרי",
    "תעודת התחסנות","כרטיס חיסוני","אישור לימודים","אישור סטודנט","אישור תלמיד",
    "אישור מגורים","אישור כתובת","אישור תושבות"
  ],
  "עסק": [
    "עוסק מורשה","עוסק פטור","תיק עוסק","חשבונית מס","דיווח מע\"ם","עוסק מורשה פעיל",
    "חברה בע\"מ","ח.פ","מספר עוסק","הצעת מחיר","חשבונית ללקוח","ספק"
  ],
  "אחר": []
};
const CATEGORIES = [
  "כלכלה",
  "רפואה",
  "עבודה",
  "בית",
  "אחריות",
  "תעודות",
  "עסק",
  "אחר"
];
// ===== buildDocCard and helper functions =====
// ===== buildDocCard and helper functions =====
function buildDocCard(doc, mode) {
  const card = document.createElement("div");
  card.className = "doc-card";
  const warrantyBlock =
    (doc.category && doc.category.includes("אחריות")) ?
    `
      <span>הועלה ב: ${formatDate(doc.uploadedAt)}</span>
<span>תאריך קנייה: ${formatDateShort(doc.warrantyStart)}</span>
<span>תוקף אחריות עד: ${formatDateShort(doc.warrantyExpiresAt)}</span>
<span>מחיקה אוטומטית אחרי: ${formatDateShort(doc.autoDeleteAfter)}</span>
    `
    : `
      <span>הועלה ב: ${doc.uploadedAt || "-"}</span>
    `;
  const openFileButtonHtml = `
    <button class="doc-open-link" data-open-id="${doc.id}">
      👁️ פתיחת קובץ
    </button>
  `;
  const displayTitle = doc.title || doc.fileName || doc.originalFileName || "מסמך";
  card.innerHTML = `
    <p class="doc-card-title">${displayTitle}</p>
    <div class="doc-card-meta">
      <span>ארגון: ${doc.org || "לא ידוע"}</span>
      <span>שנה: ${doc.year || "-"}</span>
      <span>שייך ל: ${doc.recipient?.join(", ") || "-"}</span>
      ${warrantyBlock}
    </div>
    ${openFileButtonHtml}
    <div class="doc-actions"></div>
  `;
  const actions = card.querySelector(".doc-actions");
if (mode !== "recycle") {
  // כפתור עריכה
  const editBtn = document.createElement("button");
  editBtn.className = "doc-action-btn";
  editBtn.textContent = "עריכה ✏️";
  editBtn.addEventListener("click", () => {
    if (typeof window.openEditModal === "function") {
      window.openEditModal(doc);
    } else {
      console.warn("openEditModal not available");
    }
  });
  actions.appendChild(editBtn);
  // כפתור מחיקה/סל מחזור
  const trashBtn = document.createElement("button");
  trashBtn.className = "doc-action-btn danger";
  trashBtn.textContent = mode === "shared" ? "הסר מהתיקייה 🗑️" : "העבר לסל מחזור 🗑️";
   trashBtn.addEventListener("click", async () => {
    // 🔥 אם זה בתיקייה משותפת - הסר רק מהתיקייה!
    if (mode === "shared") {
      const confirmDel = confirm("האם להסיר מסמך זה מהתיקייה המשותפת?\n(המסמך המקורי לא יימחק)");
      if (!confirmDel) return;
      try {
        showLoading("מסיר מסמך מהתיקייה...");
        const urlParams = new URLSearchParams(window.location.search);
let folderId = urlParams.get('sharedFolder');

// 🆕 נפילה ל-ID ששמרנו גלובלית אם אין בפרמטרים
if (!folderId && window.currentSharedFolderId) {
  folderId = window.currentSharedFolderId;
}

if (!folderId) {
  hideLoading();
  showNotification("שגיאה: לא נמצא מזהה תיקייה", true);
  return;
}

        if (isFirebaseAvailable()) {
          // מצא את כל הרשומות של המסמך הזה בתיקייה
          const col = window.fs.collection(window.db, "sharedDocs");
          const q = window.fs.query(
            col,
            window.fs.where("folderId", "==", folderId),
            window.fs.where("id", "==", doc.id)
          );
          const snap = await window.fs.getDocs(q);
          // מחק את כל הרשומות
          const deletePromises = [];
          snap.forEach(docSnap => {
            deletePromises.push(window.fs.deleteDoc(docSnap.ref));
          });
          await Promise.all(deletePromises);
          console.log("✅ Removed from sharedDocs, kept in personal docs");
          hideLoading();
          showNotification("המסמך הוסר מהתיקייה המשותפת ✅");
          // רענן את התצוגה
          if (typeof window.openSharedFolder === "function") {
            await window.openSharedFolder(folderId);
          } else {
            window.location.reload();
          }
        } else {
          hideLoading();
          showNotification("Firebase לא זמין", true);
        }
        return;
      } catch (err) {
        console.error("❌ Remove failed:", err);
        hideLoading();
        showNotification("שגיאה בהסרת המסמך", true);
        return;
      }
    }
    // 🔥 מסמכים רגילים (לא משותפים) - העבר לסל מחזור
    try {
      if (window.markDocTrashed && window.markDocTrashed !== markDocTrashed) {
        await window.markDocTrashed(doc.id, true);
      } else {
        await markDocTrashed(doc.id, true);
      }
    } catch (err) {
      console.error("❌ Trash failed:", err);
      showNotification("שגיאה בהעברה לסל מחזור", true);
      return;
    }
    const categoryTitle = document.getElementById("categoryTitle");
    const currentCat = categoryTitle?.textContent || "";
    if (!currentCat || currentCat === "ראשי" || currentCat === "הכל") {
      if (typeof renderHome === "function") renderHome();
    } else if (currentCat === "סל מחזור") {
      if (typeof openRecycleView === "function") openRecycleView();
    } else {
      if (typeof openCategoryView === "function") openCategoryView(currentCat);
    }
  });
  actions.appendChild(trashBtn);
  // כפתור העברה לתיקייה משותפת - רק אם לא כבר בתיקייה משותפת
  if (mode !== "shared") {
    const shareBtn = document.createElement("button");
    shareBtn.className = "doc-action-btn";
    shareBtn.textContent = "הכנס לתיקייה משותפת 📤";
    shareBtn.addEventListener("click", async () => {
      try {
        const folders = await loadSharedFolders();
        if (folders.length === 0) {
          showNotification("אין לך תיקיות משותפות");
          return;
        }
        const modalHTML = `
          <div class="modal-backdrop" id="shareFolderModal" style="display: flex; align-items: center; justify-content: center;">
            <div class="modal" style="max-width: 500px; width: 90%;">
              <div class="modal-head">
                <h2>בחר תיקייה משותפת</h2>
                <button class="modal-close" onclick="document.getElementById('shareFolderModal').remove()">✖</button>
              </div>
              <div class="scroll-area" style="max-height: 400px;">
                <p style="margin-bottom: 1rem;">בחר לאיזו תיקייה להוסיף את המסמך "${doc.title || doc.fileName}"</p>
                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                  ${folders.map(folder => `
                    <button 
                      class="folder-select-btn" 
                      data-folder-id="${folder.id}"
                      style="padding: 1rem; border: 1px solid #ddd; border-radius: 8px; background: #fff; cursor: pointer; text-align: right;"
                      onmouseover="this.style.borderColor='#4CAF50'"
                      onmouseout="this.style.borderColor='#ddd'"
                    >
                      <div style="font-weight: 600;">📁 ${folder.name}</div>
                      <div style="font-size: 0.85rem; color: #666;">${folder.members?.length || 0} חברים</div>
                    </button>
                  `).join('')}
                </div>
              </div>
              <div class="modal-foot">
                <button class="btn" onclick="document.getElementById('shareFolderModal').remove()">ביטול</button>
              </div>
            </div>
          </div>
        `;
        document.body.insertAdjacentHTML("beforeend", modalHTML);
        document.querySelectorAll(".folder-select-btn").forEach(btn => {
          btn.addEventListener("click", async () => {
            const folderId = btn.dataset.folderId;
            const folder = folders.find(f => f.id === folderId);
            try {
              await addDocumentToSharedFolder(doc.id, folderId);
              showNotification(`המסמך נוסף לתיקייה "${folder.name}"!`);
              document.getElementById("shareFolderModal").remove();
            } catch (error) {
              console.error("Error:", error);
              showNotification("שגיאה בהוספת המסמך", true);
            }
          });
        });
      } catch (error) {
        console.error("Error:", error);
        showNotification("שגיאה בטעינת התיקיות", true);
      }
    });
    actions.appendChild(shareBtn);
  }
} else {
    // מצב סל מחזור
    const restoreBtn = document.createElement("button");
    restoreBtn.className = "doc-action-btn restore";
    restoreBtn.textContent = "שחזור ♻️";
    restoreBtn.addEventListener("click", async () => {
      console.log("♻️ Restore clicked for:", doc.id);
      try {
        if (window.markDocTrashed && typeof window.markDocTrashed === "function") {
          await window.markDocTrashed(doc.id, false);
        } else if (typeof markDocTrashed === "function") {
          await markDocTrashed(doc.id, false);
        } else {
          console.error("❌ אין markDocTrashed מוגדר");
          return;
        }
        if (typeof openRecycleView === "function") {
          openRecycleView();
        } else {
          window.location.reload();
        }
      } catch (err) {
        console.error("❌ Restore failed:", err);
        if (typeof showNotification === "function") {
          showNotification("שגיאה בשחזור המסמך", true);
        }
      }
    });
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "doc-action-btn danger";
    deleteBtn.textContent = "מחיקה לצמיתות 🗑️";
    deleteBtn.addEventListener("click", async () => {
      const confirmDelete = localStorage.getItem("confirmDelete") !== "false";
      if (confirmDelete && !confirm("למחוק לצמיתות? אי אפשר לשחזר.")) return;
      try {
        if (window.deleteDocForever && window.deleteDocForever !== deleteDocForever) {
          await window.deleteDocForever(doc.id);
        } else if (typeof deleteDocForever === "function") {
          await deleteDocForever(doc.id);
        } else {
          console.error("❌ deleteDocForever function not found");
          return;
        }
        if (typeof openRecycleView === "function") {
          openRecycleView();
        } else {
          window.location.reload();
        }
      } catch (err) {
        console.error("❌ Delete forever failed:", err);
        if (typeof showNotification === "function") {
          showNotification("שגיאה במחיקת המסמך", true);
        }
      }
    });
    actions.appendChild(restoreBtn);
    actions.appendChild(deleteBtn);
  }
  return card;
}
async function markDocTrashed(id, trashed) {
  console.log("♻️ markDocTrashed called from main.js:", id, trashed);
  // אם יש גרסה "אמיתית" מ-api-bridge.js – נשתמש בה
  if (window.markDocTrashed && window.markDocTrashed !== markDocTrashed) {
    console.log("➡️ Delegating to api-bridge markDocTrashed");
    return await window.markDocTrashed(id, trashed);
  }
  // --- גיבוי לוקלי (הקוד הישן) ---
  const allDocsData = window.allDocsData || [];
  const userNow = getCurrentUserEmail();
  const allUsersData = window.allUsersData || {};
  const i = allDocsData.findIndex(d => d.id === id);
  if (i === -1) {
    if (typeof showNotification === "function") {
      showNotification("המסמך לא נמצא", true);
    }
    return;
  }
  try {
    // עדכון מקומי
    allDocsData[i]._trashed = !!trashed;
    window.allDocsData = allDocsData;
    if (typeof setUserDocs === "function") {
      setUserDocs(userNow, allDocsData, allUsersData);
    }
    // עדכון Firestore (אם זמין)
    if (typeof isFirebaseAvailable === "function" && isFirebaseAvailable()) {
      const docRef = window.fs.doc(window.db, "documents", id);
      await window.fs.updateDoc(docRef, {
        _trashed: !!trashed,
        lastModified: Date.now(),
        lastModifiedBy: userNow
      });
      console.log("✅ Document trash status updated in Firestore");
    }
    if (typeof showNotification === "function") {
      showNotification(trashed ? "הועבר לסל המחזור" : "שוחזר מהסל");
    }
  } catch (error) {
    console.error("❌ Error updating trash status:", error);
    if (typeof showNotification === "function") {
      showNotification("שגיאה בעדכון המסמך", true);
    }
  }
}
// async function deleteDocForever(id) {
//   const allDocsData = window.allDocsData || [];
//   const userNow = getCurrentUserEmail();
//   const allUsersData = window.allUsersData || {};
//   const i = allDocsData.findIndex(d => d.id === id);
//   if (i === -1) {
//     showNotification("המסמך לא נמצא", true);
//     return;
//   }
//   const doc = allDocsData[i];
//   try {
//     // Delete from IndexedDB (local)
//     await deleteFileFromDB(id).catch(() => {});
//     // Delete from Firestore
//     if (isFirebaseAvailable()) {
//       const docRef = window.fs.doc(window.db, "documents", id);
//       await window.fs.deleteDoc(docRef);
//       console.log("✅ Document deleted from Firestore:", id);
//     }
//     // Delete from Storage (if has downloadURL)
//     if (doc.downloadURL && window.storage) {
//       try {
//         const storageRef = window.fs.ref(window.storage, doc.downloadURL);
//         await window.fs.deleteObject(storageRef);
//         console.log("✅ File deleted from Storage");
//       } catch (storageError) {
//         console.warn("⚠️ Could not delete from Storage (might not exist):", storageError.message);
//       }
//     }
//     // Remove from local array
//     allDocsData.splice(i, 1);
//     window.allDocsData = allDocsData;
//     if (typeof setUserDocs === "function") {
//       setUserDocs(userNow, allDocsData, allUsersData);
//     }
//     showNotification("הקובץ נמחק לצמיתות");
//   } catch (error) {
//     console.error("❌ Error deleting document:", error);
//     showNotification("שגיאה במחיקת המסמך", true);
//   }
// }
console.log("✅ buildDocCard and helpers defined");
// ===== END buildDocCard and helpers =====
window.renderHome = function() {
  console.log("🎨 renderHome called");
  const homeView = document.getElementById("homeView");
  const categoryView = document.getElementById("categoryView");
  const folderGrid = document.getElementById("folderGrid");
  if (!homeView || !folderGrid) {
    console.error("❌ Home view elements not found");
    return;
  }
  folderGrid.innerHTML = "";
  const CATEGORIES = [
    "כלכלה", "רפואה", "עבודה", "בית",
    "אחריות", "תעודות", "עסק", "אחר"
  ];
  CATEGORIES.forEach(cat => {
    const folder = document.createElement("button");
    folder.className = "folder-card";
    folder.innerHTML = `
      <div class="folder-icon"></div>
      <div class="folder-label">${cat}</div>
    `;
    folder.addEventListener("click", () => {
      if (typeof window.openCategoryView === "function") {
        window.openCategoryView(cat);
      }
    });
    folderGrid.appendChild(folder);
  });
  homeView.classList.remove("hidden");
  if (categoryView) categoryView.classList.add("hidden");
  console.log("✅ renderHome complete");
};
// 2. CATEGORY VIEW
window.openCategoryView = function(categoryName) {
  console.log("📂 Opening category:", categoryName);
  const categoryTitle = document.getElementById("categoryTitle");
  const docsList = document.getElementById("docsList");
  const homeView = document.getElementById("homeView");
  const categoryView = document.getElementById("categoryView");
  if (!categoryTitle || !docsList) {
    console.error("❌ Category view elements not found");
    return;
  }
  categoryTitle.textContent = categoryName;
  // Filter docs for this category
  let docsForThisCategory = (window.allDocsData || []).filter(doc =>
    doc.category &&
    doc.category.includes(categoryName) &&
    !doc._trashed
  );
  docsList.innerHTML = "";
  if (docsForThisCategory.length === 0) {
    docsList.innerHTML = `<div style="padding:2rem;text-align:center;opacity:0.6;">אין מסמכים בתיקייה זו</div>`;
  } else {
    docsForThisCategory.forEach(doc => {
      // ✅ USE buildDocCard instead of inline HTML
      const card = buildDocCard(doc, "normal");
      docsList.appendChild(card);
    });
  }
  if (homeView) homeView.classList.add("hidden");
  if (categoryView) categoryView.classList.remove("hidden");
  console.log("✅ Category view opened with", docsForThisCategory.length, "documents");
};
// 3. RECYCLE VIEW – משתמש ב-buildDocCard
// 3. RECYCLE VIEW – בלי renderDocsList
window.openRecycleView = function () {
  console.log("🗑️ Opening recycle view");
  const categoryTitle = document.getElementById("categoryTitle");
  const docsList = document.getElementById("docsList");
  const homeView = document.getElementById("homeView");
  const categoryView = document.getElementById("categoryView");
  if (!categoryTitle || !docsList) {
    console.error("❌ Recycle view elements not found");
    return;
  }
  categoryTitle.textContent = "סל מחזור";
  // לוקחים רק מסמכים שמסומנים כ־_trashed = true
  const trashedDocs = (window.allDocsData || []).filter(d => d._trashed === true);
  docsList.innerHTML = "";
  if (trashedDocs.length === 0) {
    docsList.innerHTML = `<div style="padding:2rem;text-align:center;opacity:0.6;">סל המחזור ריק</div>`;
  } else {
    trashedDocs.forEach(doc => {
      const card = buildDocCard(doc, "recycle");
      docsList.appendChild(card);
    });
  }
  if (homeView) homeView.classList.add("hidden");
  if (categoryView) categoryView.classList.remove("hidden");
  console.log("✅ Recycle view opened with", trashedDocs.length, "documents");
};
// 4. SHARED VIEW
window.openSharedView = function() {
  console.log("🤝 Opening shared view");
  const categoryTitle = document.getElementById("categoryTitle");
  const docsList = document.getElementById("docsList");
  const homeView = document.getElementById("homeView");
  const categoryView = document.getElementById("categoryView");
  if (!categoryTitle || !docsList) {
    console.error("❌ Shared view elements not found");
    return;
  }
  docsList.classList.remove("shared-mode");
  categoryTitle.textContent = "אחסון משותף";
  docsList.innerHTML = "";
  docsList.classList.add("shared-mode");
  const wrap = document.createElement("div");
  wrap.className = "shared-container";
  wrap.innerHTML = `
    <div class="pending-wrap">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <strong>בקשות ממתינות</strong>
        <small style="opacity:.8">הזמנות שממתינות לאישור</small>
      </div>
      <div id="sf_pending">
        <div style="opacity:.7">אין בקשות ממתינות</div>
      </div>
    </div>
    <div class="cozy-head">
      <h3 style="margin:0;">תיקיות משותפות</h3>
      <button id="sf_create_open" class="btn-cozy">+ צור תיקייה</button>
    </div>
    <div class="sf-list" id="sf_list">
      <div style="opacity:.7">אין עדיין תיקיות משותפות</div>
    </div>
  `;
  docsList.appendChild(wrap);
  if (homeView) homeView.classList.add("hidden");
  if (categoryView) categoryView.classList.remove("hidden");
  // ✅ הוסף event listener לכפתור יצירת תיקייה
  setTimeout(() => {
    const createBtn = document.getElementById("sf_create_open");
    if (createBtn) {
      console.log("✅ Adding event listener to create button");
      createBtn.addEventListener("click", async () => {
        console.log("🔵 Create folder button clicked");
        const name = prompt("שם התיקייה החדשה:");
        if (!name || !name.trim()) {
          console.log("⚠️ No name provided");
          return;
        }
        console.log("🔵 Creating folder:", name);
        try {
          if (typeof window.createSharedFolder === "function") {
            const newFolder = await window.createSharedFolder(name.trim(), []);
            console.log("✅ Folder created:", newFolder);
            console.log("✅ window.mySharedFolders:", window.mySharedFolders);
            alert(`התיקייה "${name}" נוצרה בהצלחה! ✅`);
            // רענן את התצוגה
            window.openSharedView();
          } else {
            console.error("❌ window.createSharedFolder not found");
            alert("שגיאה: הפונקציה לא נמצאה");
          }
        } catch (err) {
          console.error("❌ Error creating folder:", err);
          alert("שגיאה: " + err.message);
        }
      });
    } else {
      console.error("❌ Create button not found");
    }
  }, 100);
  // הצג תיקיות קיימות
  setTimeout(() => {
    const listDiv = document.getElementById("sf_list");
    if (listDiv && window.mySharedFolders && window.mySharedFolders.length > 0) {
      console.log("📂 Rendering", window.mySharedFolders.length, "folders");
      listDiv.innerHTML = "";
      window.mySharedFolders.forEach(folder => {
        const folderCard = document.createElement("div");
        folderCard.style.cssText = "padding:15px; border:1px solid #2b3c3c; border-radius:8px; margin-bottom:10px; background:#101a1a; cursor:pointer;";
        folderCard.innerHTML = `
          <div style="font-weight:600; margin-bottom:5px;">📁 ${folder.name}</div>
          <div style="opacity:0.7; font-size:12px;">Owner: ${folder.owner}</div>
          <div style="opacity:0.5; font-size:11px;">Created: ${new Date(folder.createdAt).toLocaleDateString('he-IL')}</div>
        `;
        listDiv.appendChild(folderCard);
      });
    } else {
      console.log("📭 No folders to display");
    }
  }, 150);
  console.log("✅ Shared view rendered");
};
// Export to window.App for backward compatibility
window.App = {
  renderHome: window.renderHome,
  openCategoryView: window.openCategoryView,
  openRecycleView: window.openRecycleView,
  openSharedView: window.openSharedView
};
console.log("✅ All navigation functions defined globally");
function renderFolderItem(categoryName) {
  const folderGrid = document.getElementById("folderGrid");
  if (!folderGrid) return;
  const folder = document.createElement("button");
  folder.className = "folder-card";
  folder.setAttribute("data-category", categoryName);
  folder.innerHTML = `
    <div class="folder-icon"></div>
    <div class="folder-label">${categoryName}</div>
  `;
  folder.addEventListener("click", () => {
    if (typeof window.openCategoryView === "function") {
      window.openCategoryView(categoryName);
    }
  });
  folderGrid.appendChild(folder);
}
let currentSortField = "uploadedAt";
let currentSortDir = "desc";
// buildDocCard already defined above, duplicate removed
console.log("✅ Document card builder defined globally");
/*********************
 * 2. LocalStorage   *
/*********************
 * 3. Utilities      *
 *********************/
function normalizeWord(word) {
  if (!word) return "";
  let w = word.trim().toLowerCase();
  if (w.startsWith("ו") && w.length > 1) {
    w = w.slice(1);
  }
  w = w.replace(/[",.():\[\]{}]/g, "");
  return w;
}
function guessCategoryForFileNameOnly(fileName) {
  const base = fileName.replace(/\.[^/.]+$/, "");
  const parts = base.split(/[\s_\-]+/g);
  const scores = {};
  for (const rawWord of parts) {
    const cleanWord = normalizeWord(rawWord);
    for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      for (const kw of keywords) {
        const cleanKw = normalizeWord(kw);
        if (cleanWord.includes(cleanKw) || cleanKw.includes(cleanWord)) {
          if (!scores[cat]) scores[cat] = 0;
          scores[cat] += 1;
        }
      }
    }
  }
  let best = "אחר";
  let bestScore = 0;
  for (const [cat, sc] of Object.entries(scores)) {
    if (sc > bestScore) {
      best = cat;
      bestScore = sc;
    }
  }
  return best;
}
// OCR PDF
// OCR PDF (עם מסך טעינה)
async function extractTextFromPdfWithOcr(file) {
  showLoading("מזהה טקסט מה-PDF (OCR)...");
  try {
    if (!window.pdfjsLib) return "";
    const arrayBuf = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuf }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: ctx, viewport }).promise;
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!window.Tesseract) return "";
    const { data } = await window.Tesseract.recognize(blob, "heb+eng", {
      tessedit_pageseg_mode: 6,
    });
    return data && data.text ? data.text : "";
  } finally {
    hideLoading();
  }
}
// חילוץ אחריות אוטומטי
function extractWarrantyFromText(rawTextInput) {
  let rawText = "";
  if (typeof rawTextInput === "string") rawText = rawTextInput;
  else if (rawTextInput instanceof ArrayBuffer)
    rawText = new TextDecoder("utf-8").decode(rawTextInput);
  else rawText = String(rawTextInput || "");
  const rawLower = rawText.toLowerCase();
  const cleaned  = rawText.replace(/\s+/g, " ").trim();
  const lower    = cleaned.toLowerCase();
  function isValidYMD(ymd) {
    if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return false;
    const [Y, M, D] = ymd.split("-").map(n => parseInt(n, 10));
    if (M < 1 || M > 12) return false;
    if (D < 1 || D > 31) return false;
    const dt = new Date(`${Y}-${String(M).padStart(2,"0")}-${String(D).padStart(2,"0")}T00:00:00`);
    return !Number.isNaN(dt.getTime());
  }
  const monthMap = {
    jan:"01", january:"01", feb:"02", february:"02", mar:"03", march:"03",
    apr:"04", april:"04", may:"05", jun:"06", june:"06", jul:"07", july:"07",
    aug:"08", august:"08", sep:"09", sept:"09", september:"09",
    oct:"10", october:"10", nov:"11", november:"11", dec:"12", december:"12",
    ינואר:"01", פברואר:"02", מרץ:"03", מרס:"03", אפריל:"04", מאי:"05",
    יוני:"06", יולי:"07", אוגוסט:"08", ספטמבר:"09", אוקטובר:"10",
    נובמבר:"11", דצמבר:"12",
  };
  function normalizeDateGuess(str) {
    if (!str) return null;
    let s = str
      .trim()
      .replace(/[,]/g, " ")
      .replace(/[^0-9a-zA-Zא-ת]+/g, "-")
      .replace(/-+/g, "-")
      .toLowerCase();
    const tokens = s.split("-");
    if (tokens.some(t => monthMap[t])) {
      let day = null, mon = null, year = null;
      for (const t of tokens) {
        if (monthMap[t]) mon = monthMap[t];
        else if (/^\d{1,2}$/.test(t) && parseInt(t,10) <= 31 && day === null)
          day = t.padStart(2,"0");
        else if (/^\d{2,4}$/.test(t) && year === null) {
          if (t.length === 4) year = t;
          else {
            const yy = parseInt(t,10);
            year = (yy < 50 ? 2000+yy : 1900+yy).toString();
          }
        }
      }
      if (day && mon && year) {
        const ymd = `${year}-${mon}-${day}`;
        return isValidYMD(ymd) ? ymd : null;
      }
    }
    {
      const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (m) {
        const y  = m[1];
        const mo = m[2].padStart(2,"0");
        const d  = m[3].padStart(2,"0");
        const ymd = `${y}-${mo}-${d}`;
        if (isValidYMD(ymd)) return ymd;
      }
    }
    {
      const m = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
      if (m) {
        const d  = m[1].padStart(2,"0");
        const mo = m[2].padStart(2,"0");
        const y  = m[3];
        const ymd = `${y}-${mo}-${d}`;
        if (isValidYMD(ymd)) return ymd;
      }
    }
    {
      const m = s.match(/^(\d{1,2})-(\d{1,2})-(\d{2})$/);
      if (m) {
        const d  = m[1].padStart(2,"0");
        const mo = m[2].padStart(2,"0");
        const yy = parseInt(m[3],10);
        const fullY = (yy < 50 ? 2000+yy : 1900+yy).toString();
        const ymd = `${fullY}-${mo}-${d}`;
        if (isValidYMD(ymd)) return ymd;
      }
    }
    return null;
  }
  function findDateAfterKeywords(keywords, textToSearch) {
    for (const kw of keywords) {
      const pattern =
        kw +
        "[ \\t:]*" +
        "(" +
          "\\d{1,2}[^0-9a-zA-Zא-ת]\\d{1,2}[^0-9a-zA-Zא-ת]\\d{2,4}" +
          "|" +
          "\\d{4}[^0-9a-zA-Zא-ת]\\d{1,2}[^0-9a-zA-Zא-ת]\\d{1,2}" +
          "|" +
          "\\d{1,2}\\s+[a-zא-ת]+\\s+\\d{2,4}" +
        ")";
      const re = new RegExp(pattern, "i");
      const m = textToSearch.match(re);
      if (m && m[1]) {
        const guess = normalizeDateGuess(m[1]);
        if (guess && isValidYMD(guess)) {
          return guess;
        }
      }
    }
    return null;
  }
  let warrantyStart = findDateAfterKeywords([
    "תאריך\\s*ק.?נ.?י.?ה",
    "תאריך\\s*רכישה",
    "תאריך\\s*קניה",
    "תאריך\\s*קנייה",
    "תאריך\\s*הקניה",
    "תאריך\\s*הקנייה",
    "תאריך\\s*חשבונית",
    "ת\\.?\\s*חשבונית",
    "תאריך\\s*תעודת\\s*משלוח",
    "תאריך\\s*משלוח",
    "תאריך\\s*אספקה",
    "תאריך\\s*מסירה",
    "נמסר\\s*בתאריך",
    "נרכש\\s*בתאריך",
    "purchase\\s*date",
    "date\\s*of\\s*purchase",
    "invoice\\s*date",
    "buy\\s*date"
  ], lower);
  let warrantyExpiresAt = findDateAfterKeywords([
    "תוקף\\s*אחריות",
    "תוקף\\s*האחריות",
    "האחריות\\s*בתוקף\\s*עד",
    "בתוקף\\s*עד",
    "אחריות\\s*עד",
    "warranty\\s*until",
    "warranty\\s*expiry",
    "warranty\\s*expires",
    "valid\\s*until",
    "expiry\\s*date",
    "expiration\\s*date"
  ], lower);
  if (!warrantyStart) {
    const headChunkRaw = rawLower.slice(0, 500);
    const headLines = headChunkRaw.split(/\r?\n/);
    for (const line of headLines) {
      const candidateMatch = line.match(/(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4})/);
      if (candidateMatch && candidateMatch[1]) {
        const guess = normalizeDateGuess(candidateMatch[1]);
        if (guess && isValidYMD(guess)) {
          warrantyStart = guess;
          break;
        }
      }
    }
  }
  if (!warrantyStart) {
    const anyDateRegex = /(\d{1,2}[^0-9a-zA-Zא-ת]\d{1,2}[^0-9a-zA-Zא-ת]\d{2,4}|\d{4}[^0-9a-zA-Zא-ת]\d{1,2}[^0-9a-zA-Zא-ת]\d{1,2}|\d{1,2}\s+[a-zא-ת]+\s+\d{2,4})/ig;
    const matches = [...rawLower.matchAll(anyDateRegex)].map(m => m[1]);
    const normalized = [];
    for (const candidate of matches) {
      const ymd = normalizeDateGuess(candidate);
      if (ymd && isValidYMD(ymd)) normalized.push(ymd);
    }
    const unique = [...new Set(normalized)];
    if (unique.length === 1) {
      warrantyStart = unique[0];
    }
  }
  if (!warrantyExpiresAt && warrantyStart && isValidYMD(warrantyStart)) {
    const [Y,M,D] = warrantyStart.split("-");
    const startDate = new Date(`${Y}-${M}-${D}T00:00:00`);
    if (!Number.isNaN(startDate.getTime())) {
      const endDate = new Date(startDate.getTime());
      endDate.setMonth(endDate.getMonth() + 12);
      const yyyy = endDate.getFullYear();
      const mm   = String(endDate.getMonth() + 1).padStart(2, "0");
      const dd   = String(endDate.getDate()).padStart(2, "0");
      warrantyExpiresAt = `${yyyy}-${mm}-${dd}`;
    }
  }
    // מחיקה אחרי 7 שנים מתום האחריות
  // (ואם אין תאריך תוקף, אז 7 שנים מתאריך הקנייה)
  let autoDeleteAfter = null;
  const baseForDeletion =
    (warrantyExpiresAt && isValidYMD(warrantyExpiresAt))
      ? warrantyExpiresAt
      : (warrantyStart && isValidYMD(warrantyStart))
        ? warrantyStart
        : null;
  if (baseForDeletion) {
    const [yS, mS, dS] = baseForDeletion.split("-");
    const sDate = new Date(`${yS}-${mS}-${dS}T00:00:00`);
    if (!Number.isNaN(sDate.getTime())) {
      const del = new Date(sDate.getTime());
      del.setFullYear(del.getFullYear() + 7);
      const yy = del.getFullYear();
      const mm = String(del.getMonth() + 1).padStart(2, "0");
      const dd = String(del.getDate()).padStart(2, "0");
      autoDeleteAfter = `${yy}-${mm}-${dd}`;
    }
  }
  return {
    warrantyStart:     (warrantyStart     && isValidYMD(warrantyStart))     ? warrantyStart     : null,
    warrantyExpiresAt: (warrantyExpiresAt && isValidYMD(warrantyExpiresAt)) ? warrantyExpiresAt : null,
    autoDeleteAfter
  };
}
// fallback ידני לתאריכים
function fallbackAskWarrantyDetails() {
  const normalizeManualDate = (str) => {
    if (!str) return null;
    let s = str.trim().replace(/[.\/]/g, "-");
    const parts = s.split("-");
    if (parts.length === 3) {
      let [a,b,c] = parts;
      if (a.length === 4) {
        const yyyy = a;
        const mm = b.padStart(2, "0");
        const dd = c.padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
      } else if (c.length === 4) {
        const yyyy = c;
        const mm = b.padStart(2, "0");
        const dd = a.padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
      }
    }
    return s;
  };
  const startAns = prompt(
    "לא הצלחתי לזהות אוטומטית.\nמה תאריך הקנייה? (למשל 28/10/2025)"
  );
  const expAns = prompt(
    "עד מתי האחריות בתוקף? (למשל 28/10/2026)\nאם אין אחריות/לא רלוונטי אפשר לבטל."
  );
   const warrantyStart = startAns ? normalizeManualDate(startAns) : null;
  const warrantyExpiresAt = expAns ? normalizeManualDate(expAns) : null;
  let autoDeleteAfter = null;
  const baseForDeletion =
    (warrantyExpiresAt && /^\d{4}-\d{2}-\d{2}$/.test(warrantyExpiresAt))
      ? warrantyExpiresAt
      : (warrantyStart && /^\d{4}-\d{2}-\d{2}$/.test(warrantyStart))
        ? warrantyStart
        : null;
  if (baseForDeletion) {
    const delDate = new Date(baseForDeletion + "T00:00:00");
    delDate.setFullYear(delDate.getFullYear() + 7);
    autoDeleteAfter = delDate.toISOString().split("T")[0];
  }
  return {
    warrantyStart,
    warrantyExpiresAt,
    autoDeleteAfter
  };
}
// טוסט
function showNotification(message, isError = false) {
  const box = document.getElementById("notification");
  if (!box) return;
  box.textContent = message;
  box.className = "notification show" + (isError ? " error" : "");
  setTimeout(() => {
    box.className = "notification hidden";
  }, 4000);
}
// --- Loading overlay helpers ---
function showLoading(msg = "מזהה טקסט... אנא המתיני") {
  const el = document.getElementById("loading-overlay");
  if (!el) return;
  const t = el.querySelector(".loading-text");
  if (t) t.textContent = msg;
  el.classList.remove("hidden");
}
function hideLoading() {
  const el = document.getElementById("loading-overlay");
  if (!el) return;
  el.classList.add("hidden");
}
// ניקוי אוטומטי לאחר שפג תאריך המחיקה
function purgeExpiredWarranties(docsArray) {
  const today = new Date();
  let changed = false;
  for (let i = docsArray.length - 1; i >= 0; i--) {
    const d = docsArray[i];
    if (d.category && d.category.includes("אחריות") && d.autoDeleteAfter) {
      const deleteOn = new Date(d.autoDeleteAfter + "T00:00:00");
      if (today > deleteOn) {
        // גם מוחקים את הקובץ בפועל מה-DB
        deleteFileFromDB(d.id).catch(() => {});
        docsArray.splice(i, 1);
        changed = true;
      }
    }
  }
  return changed;
}
function sortDocs(docsArray) {
  const arr = [...docsArray];
  arr.sort((a, b) => {
    let av = a[currentSortField];
    let bv = b[currentSortField];
    if (
      currentSortField === "uploadedAt" ||
      currentSortField === "warrantyExpiresAt" ||
      currentSortField === "autoDeleteAfter" ||
      currentSortField === "warrantyStart"
    ) {
      const ad = av ? new Date(av) : new Date(0);
      const bd = bv ? new Date(bv) : new Date(0);
      if (ad < bd) return currentSortDir === "asc" ? -1 : 1;
      if (ad > bd) return currentSortDir === "asc" ? 1 : -1;
      return 0;
    }
    if (currentSortField === "year") {
      const an = parseInt(av ?? 0, 10);
      const bn = parseInt(bv ?? 0, 10);
      if (an < bn) return currentSortDir === "asc" ? -1 : 1;
      if (an > bn) return currentSortDir === "asc" ? 1 : -1;
      return 0;
    }
    av = (av ?? "").toString().toLowerCase();
    bv = (bv ?? "").toString().toLowerCase();
    if (av < bv) return currentSortDir === "asc" ? -1 : 1;
    if (av > bv) return currentSortDir === "asc" ? 1 : -1;
    return 0;
  });
  return arr;
}
function findUsernameByEmail(allUsersData, email) {
  const target = normalizeEmail(email);
  for (const [uname, u] of Object.entries(allUsersData)) {
    const userEmail = normalizeEmail(u.email || uname);
    if (userEmail === target) return uname;
  }
  return null;
}
function ensureUserSharedFields(allUsersData, username) {
  if (!allUsersData[username]) {
    allUsersData[username] = { password: "", docs: [], email: username };
  }
  const u = allUsersData[username];
  if (!u.email) {
    const looksLikeEmail = /.+@.+\..+/.test(username);
    u.email = looksLikeEmail ? username : username;
  }
  if (!u.sharedFolders) u.sharedFolders = {};
  if (!u.incomingShareRequests) u.incomingShareRequests = [];
  if (!u.outgoingShareRequests) u.outgoingShareRequests = [];
}
/*********************
 * 4. אפליקציה / UI  *
 *********************/
document.addEventListener("DOMContentLoaded", async () => {
 console.log("📄 DOM Content Loaded");
  // Premium panel setup
  const panel = document.getElementById("premiumPanel");
  const modal = panel?.querySelector(".modal");
  const btnOpen = document.getElementById("premiumBtn");
  const btnClose = document.getElementById("premiumCloseBtn");
  const btnLater = document.getElementById("premiumLaterBtn");
  function openPremiumPanel() {
    panel?.classList.remove("hidden");
    panel?.setAttribute("aria-hidden", "false");
    document.documentElement.style.overflow = "hidden";
    modal?.focus();
  }
  function closePremiumPanel() {
    panel?.classList.add("hidden");
    panel?.setAttribute("aria-hidden", "true");
    document.documentElement.style.overflow = "";
    btnOpen?.focus();
  }
  btnOpen?.addEventListener("click", openPremiumPanel);
  btnClose?.addEventListener("click", closePremiumPanel);
  btnLater?.addEventListener("click", closePremiumPanel);
  panel?.addEventListener("click", (e) => {
    if (e.target === panel) closePremiumPanel();
  });
  panel?.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closePremiumPanel();
  });
  panel?.querySelectorAll("[data-select-plan]").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const plan = e.currentTarget.getAttribute("data-select-plan");
      alert("נבחרה תוכנית: " + (plan === "pro" ? "פרו" : "פרימיום"));
      closePremiumPanel();
    });
  });
  await new Promise(resolve => {
    if (window.userNow) {
      resolve();
    } else {
      window.addEventListener('firebase-ready', resolve, { once: true });
      // Timeout after 5 seconds
      setTimeout(resolve, 5000);
    }
  });
  // Check if user is logged in
  const currentUser = getCurrentUser();
  if (!currentUser) {
    console.warn("⚠️ No user logged in on DOM load, waiting for auth...");
    // Don’t return here – let the rest of the UI set itself up.
    // authCheck.js + bootFromCloud will set window.userNow later.
  } else {
    console.log("👤 Current user on DOM load:", currentUser);
    window.userNow = currentUser;
  }
  // Get UI elements
  const homeView = document.getElementById("homeView");
  const folderGrid = document.getElementById("folderGrid");
  const categoryView = document.getElementById("categoryView");
  const categoryTitle = document.getElementById("categoryTitle");
  const docsList = document.getElementById("docsList");
  const backButton = document.getElementById("backButton");
  const uploadBtn = document.getElementById("uploadBtn");
  const fileInput = document.getElementById("fileInput");
  const sortSelect = document.getElementById("sortSelect");
  const editModal = document.getElementById("editModal");
  const editForm = document.getElementById("editForm");
  const editCancelBtn = document.getElementById("editCancelBtn");
  const edit_title = document.getElementById("edit_title");
  const edit_org = document.getElementById("edit_org");
  const edit_year = document.getElementById("edit_year");
  const edit_recipient = document.getElementById("edit_recipient");
  const edit_warrantyStart = document.getElementById("edit_warrantyStart");
  const edit_warrantyExp = document.getElementById("edit_warrantyExpiresAt");
  const edit_autoDelete = document.getElementById("edit_autoDeleteAfter");
  const edit_category = document.getElementById("edit_category");
  const edit_sharedWith = document.getElementById("edit_sharedWith");
  let currentlyEditingDocId = null;
window.allUsersData = loadAllUsersDataFromStorage();
window.allDocsData = getUserDocs(userNow, allUsersData);
  ensureUserSharedFields(allUsersData, userNow);
  saveAllUsersDataToStorage(allUsersData);
  if (!allDocsData || allDocsData.length === 0) {
    allDocsData = [];
    setUserDocs(userNow, allDocsData, allUsersData);
  }
  const removed = purgeExpiredWarranties(allDocsData);
  if (removed) {
    setUserDocs(userNow, allDocsData, allUsersData);
    showNotification("מסמכי אחריות ישנים הוסרו אוטומטית");
  }
  // ===== RENDER FUNCTIONS =====
  function renderFolderItem(categoryName) {
    const folder = document.createElement("button");
    folder.className = "folder-card";
    folder.setAttribute("data-category", categoryName);
    folder.innerHTML = `
      <div class="folder-icon"></div>
      <div class="folder-label">${categoryName}</div>
    `;
    folder.addEventListener("click", () => {
      openCategoryView(categoryName);
    });
    folderGrid.appendChild(folder);
  }
if (fileInput) {
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];
    if (!file) {
      showNotification("❌ לא נבחר קובץ", true);
      return;
    }
    try {
      const fileName = file.name.trim();
      // בדיקת כפילויות לפי שם קובץ (ולא בסל מחזור)
      const alreadyExists = (window.allDocsData || []).some(doc => {
        return (
          doc.originalFileName === fileName &&
          doc._trashed !== true
        );
      });
      if (alreadyExists) {
        showNotification("הקובץ הזה כבר קיים בארכיון שלך", true);
        fileInput.value = "";
        return;
      }
      // ניחוש קטגוריה
      let guessedCategory = guessCategoryForFileNameOnly(file.name);
      if (!guessedCategory || guessedCategory === "אחר") {
        const manual = prompt(
          'לא זיהיתי אוטומטית את סוג המסמך.\nלאיזו תיקייה לשמור?\nאפשרויות: ' +
          CATEGORIES.join(", "),
          "רפואה"
        );
        if (manual && manual.trim() !== "") {
          guessedCategory = manual.trim();
        } else {
          guessedCategory = "אחר";
        }
      }
      // פרטי אחריות אם צריך
      let warrantyStart = null;
      let warrantyExpiresAt = null;
      let autoDeleteAfter = null;
      if (guessedCategory === "אחריות") {
        let extracted = {
          warrantyStart: null,
          warrantyExpiresAt: null,
          autoDeleteAfter: null,
        };
        if (file.type === "application/pdf") {
          const ocrText = await extractTextFromPdfWithOcr(file);
          const dataFromText = extractWarrantyFromText(ocrText);
          extracted = { ...extracted, ...dataFromText };
        }
        if (file.type.startsWith("image/") && window.Tesseract) {
          const { data } = await window.Tesseract.recognize(file, "heb+eng", {
            tessedit_pageseg_mode: 6,
          });
          const imgText = data?.text || "";
          const dataFromText = extractWarrantyFromText(imgText);
          extracted = { ...extracted, ...dataFromText };
        }
        if (!extracted.warrantyStart && !extracted.warrantyExpiresAt) {
          const buf = await file.arrayBuffer().catch(() => null);
          if (buf) {
            const txt = new TextDecoder("utf-8").decode(buf);
            const dataFromText = extractWarrantyFromText(txt);
            extracted = { ...extracted, ...dataFromText };
          }
        }
        if (!extracted.warrantyStart && !extracted.warrantyExpiresAt) {
          const manualData = fallbackAskWarrantyDetails();
          if (manualData.warrantyStart) {
            extracted.warrantyStart = manualData.warrantyStart;
          }
          if (manualData.warrantyExpiresAt) {
            extracted.warrantyExpiresAt = manualData.warrantyExpiresAt;
          }
          if (manualData.autoDeleteAfter) {
            extracted.autoDeleteAfter = manualData.autoDeleteAfter;
          }
        }
        warrantyStart     = extracted.warrantyStart     || null;
        warrantyExpiresAt = extracted.warrantyExpiresAt || null;
        autoDeleteAfter   = extracted.autoDeleteAfter   || null;
      }
      // קריאה של הקובץ כ-base64 ל-IndexedDB
      const fileDataBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const newId = crypto.randomUUID();
      // שמירת הקובץ עצמו ל-IndexedDB (לוגי)
      await saveFileToDB(newId, fileDataBase64);
      // בניית אובייקט המסמך
      const now = new Date();
      const uploadedAt = now.toISOString().split("T")[0];
      const year = now.getFullYear().toString();
      const ownerEmail = normalizeEmail(getCurrentUserEmail() || "");
      const newDoc = {
        id: newId,
        title: fileName,
        originalFileName: fileName,
        category: guessedCategory,
        uploadedAt,
        year,
        org: "",
        recipient: [],
        sharedWith: [],
        warrantyStart,
        warrantyExpiresAt,
        autoDeleteAfter,
        mimeType: file.type,
        hasFile: true,
        downloadURL: null,
        owner: ownerEmail,
        _trashed: false,
        lastModified: Date.now(),
        lastModifiedBy: ownerEmail
      };
      // שמירה ב-allDocsData + בזיכרון היוזר
      // if (!window.allDocsData) window.allDocsData = [];
      // window.allDocsData.push(newDoc);
      // if (typeof setUserDocs === "function") {
      //   if (!window.allUsersData) window.allUsersData = {};
      //   setUserDocs(ownerEmail || userNow, window.allDocsData, window.allUsersData);
      // }
      // // 🌩️ מראה לענן – Firestore
      // if (isFirebaseAvailable()) {
      //   try {
      //     const docRef = window.fs.doc(window.db, "documents", newId);
      //     const cleanDoc = {
      //       id: newDoc.id,
      //       title: newDoc.title,
      //       originalFileName: newDoc.originalFileName,
      //       category: newDoc.category,
      //       uploadedAt: newDoc.uploadedAt,
      //       year: newDoc.year,
      //       org: newDoc.org || "",
      //       recipient: newDoc.recipient || [],
      //       sharedWith: newDoc.sharedWith || [],
      //       warrantyStart: newDoc.warrantyStart || null,
      //       warrantyExpiresAt: newDoc.warrantyExpiresAt || null,
      //       autoDeleteAfter: newDoc.autoDeleteAfter || null,
      //       mimeType: newDoc.mimeType,
      //       hasFile: true,
      //       owner: ownerEmail,
      //       downloadURL: null,
      //       deletedAt: null,
      //       deletedBy: null,
      //       lastModified: newDoc.lastModified,
      //       lastModifiedBy: ownerEmail,
      //       _trashed: false
      //     };
      //     await window.fs.setDoc(docRef, cleanDoc, { merge: true });
      //     console.log("✅ Mirrored owner doc to Firestore:", newId);
      //   } catch (e) {
      //     console.error("❌ Firestore mirror failed:", e);
      //   }
      // }
      // 📡 שמירה גם בשרת Render (PostgreSQL)
      try {
        if (window.uploadDocument) {
          await window.uploadDocument(file, {
            title: fileName,
            category: guessedCategory,
            year,
            org: "",
            recipient: newDoc.recipient || [],
            warrantyStart,
            warrantyExpiresAt,
            autoDeleteAfter,
          });
        } else {
          console.warn("⚠️ window.uploadDocument לא קיים");
        }
      } catch (e) {
        console.error("❌ שגיאה בשמירה ל-Render:", e);
        // לא מפילים את כל התהליך – כבר נשמר בפיירבייס
      }
      // הודעה יפה
      let niceCat = guessedCategory && guessedCategory.trim()
        ? guessedCategory.trim()
        : "התיקייה";
      showNotification(`הקובץ נוסף לתיקייה "${niceCat}" ✅`);
      // רענון UI
      const currentCat = categoryTitle.textContent;
      if (currentCat === "אחסון משותף") {
        openSharedView();
      } else if (currentCat === "סל מחזור") {
        openRecycleView();
      } else if (!homeView.classList.contains("hidden")) {
        renderHome();
      } else {
        openCategoryView(currentCat);
      }
      fileInput.value = "";
    } catch (err) {
      console.error("שגיאה בהעלאה:", err);
      showNotification("הייתה בעיה בהעלאה. נסי שוב או קובץ אחר.", true);
      hideLoading?.();
    }
  });
}
  // === INIT shared fields (run once after loading allUsersData/allDocsData) ===
function ensureUserSharedFields(allUsersData, username) {
  if (!allUsersData[username]) {
    allUsersData[username] = { password: "", docs: [], email: username };
  }
  const u = allUsersData[username];
  if (!u.email) {
    const looksLikeEmail = /.+@.+\..+/.test(username);
    u.email = looksLikeEmail ? username : username;
  }
  if (!u.sharedFolders) u.sharedFolders = {};
  if (!u.incomingShareRequests) u.incomingShareRequests = [];
  if (!u.outgoingShareRequests) u.outgoingShareRequests = [];
}
  console.log("📊 Initial local data:", allDocsData.length, "documents");
  // ✅ Boot from cloud immediately after page load
  (async () => {
    try {
      await bootFromCloud();
    } catch (e) {
      console.error("❌ Failed to boot from cloud:", e);
    }
  })();
function findUsernameByEmail(allUsersData, email) {
  const target = (email || "").trim().toLowerCase();
  for (const [uname, u] of Object.entries(allUsersData)) {
    const userEmail = (u.email || uname).trim().toLowerCase();
    if (userEmail === target) return uname;
  }
  return null;
}
ensureUserSharedFields(allUsersData, userNow);
saveAllUsersDataToStorage(allUsersData);
  if (!allDocsData || allDocsData.length === 0) {
    allDocsData = [];
    setUserDocs(userNow, allDocsData, allUsersData);
  }
  // כפתורי התיקיות בעמוד הבית
  function renderFolderItem(categoryName) {
    const folder = document.createElement("button");
    folder.className = "folder-card";
    folder.setAttribute("data-category", categoryName);
    folder.innerHTML = `
      <div class="folder-icon"></div>
      <div class="folder-label">${categoryName}</div>
    `;
    folder.addEventListener("click", () => {
      openCategoryView(categoryName);
    });
    folderGrid.appendChild(folder);
  }
  function openCategoryView(categoryName) {
    categoryTitle.textContent = categoryName;
    let docsForThisCategory = allDocsData.filter(doc =>
      doc.category &&
      doc.category.includes(categoryName) &&
      !doc._trashed
    );
    docsForThisCategory = sortDocs(docsForThisCategory);
    docsList.innerHTML = "";
    docsForThisCategory.forEach(doc => {
      const card = buildDocCard(doc, "normal");
      docsList.appendChild(card);
    });
    homeView.classList.add("hidden");
    categoryView.classList.remove("hidden");
  }
  function renderDocsList(docs, mode = "normal") {
    const sortedDocs = sortDocs(docs);
    docsList.innerHTML = "";
    sortedDocs.forEach(doc => {
      const card = buildDocCard(doc, mode);
      docsList.appendChild(card);
    });
    homeView.classList.add("hidden");
    categoryView.classList.remove("hidden");
  }
  // === HELPER: אסוף מסמכים מכל המשתמשים לתיקייה משותפת מסוימת ===
function collectSharedFolderDocs(allUsersData, folderId) {
  const list = [];
  for (const [uname, u] of Object.entries(allUsersData)) {
    const docs = (u.docs || []);
    for (const d of docs) {
      if (!d._trashed && d.sharedFolderId === folderId) {
        // מצרפים גם שם מעלה המסמך:
        list.push({ ...d, _ownerEmail: u.email || uname });
      }
    }
  }
  return list;
}
// ===== Smart Shared-Folder Picker (modal) =====
function createEl(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === "class") el.className = v;
    else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
    else el.setAttribute(k, v);
  });
  (Array.isArray(children) ? children : [children]).forEach(c => {
    if (c == null) return;
    if (typeof c === "string") el.appendChild(document.createTextNode(c));
    else el.appendChild(c);
  });
  return el;
}
function openSharedFolderPicker(me, onSelect) {
  const folders = Object.entries(me.sharedFolders || {}); // [ [fid, {name,...}], ... ]
  if (!folders.length) {
    showNotification("אין לך עדיין תיקיות משותפות. צרי אחת במסך 'אחסון משותף'.", true);
    return;
  }
  // Overlay
  const overlay = createEl("div", { style: {
    position: "fixed", inset: "0", background: "rgba(0,0,0,.45)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: "10000", fontFamily: "Rubik,system-ui,sans-serif"
  }});
  const panel = createEl("div", { style: {
    background: "#fff", color:"#000", width:"min(520px, 92vw)", maxHeight:"80vh",
    borderRadius:"12px", padding:"12px", boxShadow:"0 18px 44px rgba(0,0,0,.45)",
    display: "grid", gridTemplateRows:"auto auto 1fr auto", gap:"10px"
  }});
  const title = createEl("div", { style:{fontWeight:"700"} }, "בחרי תיקייה משותפת");
  const search = createEl("input", { type:"text", placeholder:"חיפוש לפי שם תיקייה...", style:{
    padding:".5rem", border:"1px solid #bbb", borderRadius:"8px", width:"100%"
  }});
  const listWrap = createEl("div", { style:{
    overflow:"auto", border:"1px solid #eee", borderRadius:"8px", padding:"6px"
  }});
  const btnRow = createEl("div", { style:{ display:"flex", gap:"8px", justifyContent:"flex-end" }});
  const cancelBtn = createEl("button", { class:"doc-action-btn", style:{background:"#b63a3a", color:"#fff"}}, "בטל");
  const chooseBtn = createEl("button", { class:"doc-action-btn", style:{background:"#0e3535", color:"#fff"}}, "בחרי");
  btnRow.append(cancelBtn, chooseBtn);
  panel.append(title, search, listWrap, btnRow);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);
  let selectedId = null;
  function renderList(filter = "") {
    listWrap.innerHTML = "";
    const norm = (s) => (s||"").toString().toLowerCase().trim();
    const f = norm(filter);
    const filtered = folders.filter(([fid, fobj]) => norm(fobj.name).includes(f));
    filtered.forEach(([fid, fobj]) => {
      const row = createEl("label", { style:{
        display:"grid", gridTemplateColumns:"24px 1fr", alignItems:"center",
        gap:"8px", padding:"6px", borderRadius:"6px", cursor:"pointer"
      }});
      row.addEventListener("mouseover", () => row.style.background = "#f7f7f7");
      row.addEventListener("mouseout",  () => row.style.background = "transparent");
      const radio = createEl("input", { type:"radio", name:"sf_pick", value: fid });
      const name  = createEl("div", {}, `${fobj.name}  `);
      row.append(radio, name);
      listWrap.appendChild(row);
      radio.addEventListener("change", () => { selectedId = fid; });
    });
    if (!filtered.length) {
      listWrap.appendChild(createEl("div", { style:{opacity:.7, padding:"8px"}}, "לא נמצאו תיקיות מתאימות"));
    }
  }
  renderList();
  search.addEventListener("input", () => renderList(search.value));
  cancelBtn.onclick = () => { overlay.remove(); };
  chooseBtn.onclick = () => {
    if (!selectedId) { showNotification("בחרי תיקייה מהרשימה", true); return; }
    overlay.remove();
    if (typeof onSelect === "function") onSelect(selectedId);
  };
}
openSharedView = function() {
  docsList.classList.remove("shared-mode");
  categoryTitle.textContent = "אחסון משותף";
  docsList.innerHTML = "";
  docsList.classList.add("shared-mode");
  const me = allUsersData[userNow];
  const myEmail = (me.email || userNow);
  // ===== עטיפת ניהול =====
  const wrap = document.createElement("div");
wrap.className = "shared-container";
  // --- בלוק בקשות ממתינות (למעלה) ---
  const pendingBox = document.createElement("div");
  pendingBox.className = "pending-wrap";
  pendingBox.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;">
      <strong>בקשות ממתינות</strong>
      <small style="opacity:.8">הזמנות שממתינות לאישור</small>
    </div>
    <div id="sf_pending"></div>
  `;
  wrap.appendChild(pendingBox);
  // --- שורת כותרת + כפתור יצירה (באותה שורה) ---
  const headRow = document.createElement("div");
  headRow.className = "cozy-head";
  headRow.innerHTML = `
    <h3 style="margin:0;">תיקיות משותפות</h3>
    <button id="sf_create_open" class="btn-cozy">+ צור תיקייה</button>
  `;
  wrap.appendChild(headRow);
  // --- רשימת תיקיות ---
  const listWrap = document.createElement("div");
  listWrap.className = "sf-list";
  listWrap.id = "sf_list";
  wrap.appendChild(listWrap);
  docsList.appendChild(wrap);
  // ===== מודאל יצירת תיקייה =====
  function openCreateFolderModal() {
    const overlay = document.createElement("div");
    overlay.style.cssText = `
      position:fixed; inset:0; background:rgba(0,0,0,.45);
      display:flex; align-items:center; justify-content:center; z-index:9999;
      font-family: Rubik,system-ui,sans-serif;
    `;
    const panel = document.createElement("div");
    panel.style.cssText = `
      background:#0b1010; color:#e7f0ee; width:min(520px,92vw);
      border:1px solid #243030; border-radius:14px; padding:14px;
      box-shadow:0 18px 44px rgba(0,0,0,.5); display:grid; gap:10px;
      grid-template-rows:auto auto auto;
    `;
    panel.innerHTML = `
      <div style="font-weight:700;display:flex;justify-content:space-between;align-items:center;">
        <span>יצירת תיקייה משותפת</span>
        <button id="mk_close" class="btn-min">סגור</button>
      </div>
      <input id="mk_name" placeholder="שם תיקייה חדשה"
             style="padding:.6rem;border:1px solid #2b3c3c;border-radius:10px;background:#101a1a;color:#e0f0ee;">
      <div style="display:flex;gap:8px;justify-content:flex-end;">
        <button id="mk_create" class="btn-cozy">צור</button>
      </div>
    `;
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    panel.querySelector("#mk_close").onclick = () => overlay.remove();
    panel.querySelector("#mk_create").onclick = async () => {
      const name = (panel.querySelector("#mk_name").value || "").trim();
      if (!name) { showNotification("צריך שם תיקייה", true); return; }
      console.log("🔵 Creating folder via modal:", name);
      // ✅ השתמש בפונקציה החדשה שלנו!
      try {
        if (typeof window.createSharedFolder === "function") {
          console.log("✅ Using window.createSharedFolder");
          const newFolder = await window.createSharedFolder(name, []);
          console.log("✅ Folder created:", newFolder);
          overlay.remove();
          // רענן את הרשימה
          if (typeof renderSharedFoldersList === "function") {
            renderSharedFoldersList();
          }
          showNotification(`נוצרה תיקייה "${name}"`);
        } else {
          console.error("❌ window.createSharedFolder not found!");
          // Fallback לשיטה הישנה
          const fid = crypto.randomUUID();
          me.sharedFolders[fid] = { name, owner: myEmail, members: [myEmail] };
          saveAllUsersDataToStorage(allUsersData);
          overlay.remove();
          renderSharedFoldersList();
          showNotification(`נוצרה תיקייה "${name}" (שיטה ישנה)`);
        }
      } catch (err) {
        console.error("❌ Error creating folder:", err);
        showNotification("שגיאה ביצירת תיקייה", true);
      }
    };
  }
  headRow.querySelector("#sf_create_open").addEventListener("click", openCreateFolderModal);
  // ===== רינדור תיקיות =====
  function renderSharedFoldersList() {
    console.log("🎨 renderSharedFoldersList called");
    listWrap.innerHTML = "";
    // ✅ טען מ-window.mySharedFolders (לא מ-me.sharedFolders הישן!)
    const folders = window.mySharedFolders || [];
    console.log("📂 Folders to render:", folders.length);
    if (folders.length === 0) {
      listWrap.innerHTML = `<div style="opacity:.7">אין עדיין תיקיות משותפות</div>`;
      return;
    }
    for (const folder of folders) {
      const roleLabel = (folder.owner?.toLowerCase() === (myEmail||"").toLowerCase()) ? "owner" : "member";
      const row = document.createElement("div");
      row.className = "sf-card";
      row.innerHTML = `
        <div class="sf-ico">📁</div>
        <div class="sf-main">
          <div class="sf-title">${folder.name}</div>
          <div class="sf-meta">Role: ${roleLabel} • Created: ${new Date(folder.createdAt).toLocaleDateString('he-IL')}</div>
        </div>
        <div class="sf-actions">
          <button data-open="${folder.id}" class="btn-min">פתח</button>
          <button data-rename="${folder.id}" class="btn-min">שנה שם</button>
          <button data-delete="${folder.id}" class="btn-min btn-danger">מחק</button>
        </div>
      `;
      listWrap.appendChild(row);
    }
    console.log("✅ Rendered", folders.length, "folders");
  }
  // מצייר רק את ה-UI לפי מערך הזמנות שניתן
function paintPending(invites) {
  const wrap = pendingBox.querySelector("#sf_pending");
  wrap.innerHTML = "";
  if (!invites || !invites.length) {
    wrap.innerHTML = `<div style="opacity:.7">אין בקשות ממתינות</div>`;
    return;
  }
  for (const inv of invites) {
    const line = document.createElement("div");
    line.className = "pending-row";
    line.innerHTML = `
      הזמנה לתיקייה "<b>${inv.folderName}</b>" מאת ${inv.fromEmail}
      <div>
        <button class="btn-min" data-accept="${inv.id}" data-folder="${inv.folderId}" data-fname="${inv.folderName}" data-owner="${inv.fromEmail}">אשר</button>
        <button class="btn-min btn-danger" data-reject="${inv.id}">סרב</button>
      </div>
    `;
    wrap.appendChild(line);
  }
}
  // ===== רינדור בקשות =====
async function renderPending() {
  const wrap = pendingBox.querySelector("#sf_pending");
  wrap.innerHTML = "<div style='opacity:.7'>טוען הזמנות...</div>";
  const myEmail = normalizeEmail((allUsersData[userNow].email || userNow));
  console.log("📩 Fetching pending invites for:", myEmail);
  const invites = await getPendingInvitesFromFirestore(myEmail);
  console.log("📩 Found", invites.length, "pending invites");
  paintPending(invites);
}
  renderSharedFoldersList();
  renderPending();
  // ===== הפעלציה של מקשיב זמן אמת להזמנות =====
  if (stopWatching) stopWatching(); // ניקוי מקשיב קודם
  stopWatching = watchPendingInvites(async (invites) => {
    console.log("🔔 Real-time update: received", invites.length, "invites");
    paintPending(invites);
  });
  // ===== אירועים על רשימת התיקיות =====
  listWrap.addEventListener("click", async (ev) => {
    const t = ev.target;
    const openId   = t.getAttribute?.("data-open");
    const renameId = t.getAttribute?.("data-rename");
    const delId    = t.getAttribute?.("data-delete");
   // --- פתיחת עמוד תיקייה ---
    if (openId) {
      categoryTitle.textContent = me.sharedFolders[openId]?.name || "תיקייה משותפת";
      // 🔥 נקה והוסף קלאס
      docsList.innerHTML = "";
      docsList.classList.add("shared-mode");
      // 🔥 Container עבור 3 הבלוקים
      const topBlocksContainer = document.createElement("div");
      topBlocksContainer.className = "shared-top-blocks";
      docsList.appendChild(topBlocksContainer);
      // בלוק 1: משתתפים
      const membersBar = document.createElement("div");
      membersBar.className = "cozy-head";
      membersBar.innerHTML = `
        <h3 style="margin:0;">משתתפים</h3>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;width:100%;">
          <input id="detail_inv_email" placeholder="הוסף מייל לשיתוף"
                 style="padding:.5rem;border:1px solid #2b3c3c;border-radius:10px;background:#101a1a;color:#e0f0ee;flex:1;min-width:200px;max-width:100%;box-sizing:border-box;">
          <button id="detail_inv_btn" class="btn-cozy" style="white-space:nowrap;">הוסף משתתף</button>
        </div>
      `;
      topBlocksContainer.appendChild(membersBar);
      // בלוק 2: רשימת משתתפים
      const membersList = document.createElement("div");
      membersList.className = "pending-wrap";
      membersList.innerHTML = `<div id="members_chips" style="display:flex;flex-wrap:wrap;gap:8px;width:100%;"></div>`;
      topBlocksContainer.appendChild(membersList);
      const chips = membersList.querySelector("#members_chips");
      const paintMembers = (arr = []) => {
        chips.innerHTML = arr.map(email => `<span class="btn-min" style="cursor:default">${email}</span>`).join("");
      };
      // טען חברים
      if (isFirebaseAvailable()) {
        (async () => {
          try {
            const folderRef = window.fs.doc(window.db, "sharedFolders", openId);
            const folderSnap = await window.fs.getDoc(folderRef);
            if (folderSnap.exists()) {
              const folderData = folderSnap.data();
              const members = folderData.members || [];
              paintMembers(members);
              console.log("✅ Loaded members:", members);
            } else {
              console.warn("⚠️ Folder not found");
              paintMembers([]);
            }
          } catch (err) {
            console.error("❌ Failed to load members:", err);
            paintMembers([]);
          }
        })();
        if (window._stopMembersWatch) try { window._stopMembersWatch(); } catch(e) {}
        window._stopMembersWatch = (() => {
          const folderRef = window.fs.doc(window.db, "sharedFolders", openId);
          return window.fs.onSnapshot(folderRef, (snap) => {
            if (snap.exists()) {
              const folderData = snap.data();
              const members = folderData.members || [];
              paintMembers(members);
            }
          }, (err) => console.error("watchMembers error", err));
        })();
      } else {
        paintMembers(me.sharedFolders[openId]?.members || []);
      }
      // בלוק 3: כותרת מסמכים משותפים
      const docsHead = document.createElement("div");
      docsHead.className = "cozy-head";
      docsHead.innerHTML = `
        <h3 style="margin:0;">מסמכים משותפים</h3>
        <div style="display:flex;gap:8px;flex-wrap:wrap;width:100%;">
          <button id="upload_to_shared_btn" class="btn-cozy">📤 העלה מסמך</button>
          <button id="refresh_docs_btn" class="btn-cozy">🔄 רענן רשימה</button>
        </div>
      `;
      topBlocksContainer.appendChild(docsHead);
      // העלאת מסמך
      const uploadToSharedBtn = docsHead.querySelector("#upload_to_shared_btn");
      uploadToSharedBtn.addEventListener("click", async () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "*/*";
        input.onchange = async (e) => {
          const file = e.target.files[0];
          if (!file) return;
          showLoading(`מעלה ${file.name}...`);
          try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("title", file.name);
            formData.append("sharedFolderId", openId);
            const response = await fetch(`${API_BASE}/api/docs`, {
              method: "POST",
              headers: { "X-Dev-Email": myEmail },
              body: formData
            });
            if (!response.ok) throw new Error("Upload failed");
            const uploadedDoc = await response.json();
            console.log("✅ Document uploaded:", uploadedDoc);
            await upsertSharedDocRecord({
              id: uploadedDoc.id,
              title: file.name,
              fileName: file.name,
              uploadedAt: Date.now(),
              category: [],
              recipient: []
            }, openId);
            hideLoading();
            showNotification("המסמך הועלה בהצלחה! ✅");
            await loadAndDisplayDocs();
          } catch (err) {
            console.error("Upload error:", err);
            hideLoading();
            showNotification("שגיאה בהעלאת המסמך", true);
          }
        };
        input.click();
      });
      // ✅ Grid המסמכים - מחוץ ל-topBlocksContainer
      const docsBox = document.createElement("div");
      docsBox.className = "docs-grid";
      docsList.appendChild(docsBox);
      // טעינת מסמכים
      async function loadAndDisplayDocs() {
        docsBox.innerHTML = "<div style='opacity:.7;padding:20px;text-align:center'>טוען מסמכים...</div>";
        if (isFirebaseAvailable()) {
          await syncMySharedDocsToFirestore();
          const first = await fetchSharedFolderDocsFromFirestore(openId);
          docsBox.innerHTML = "";
          if (first.length === 0) {
            docsBox.innerHTML = "<div style='opacity:.7;padding:20px;text-align:center'>אין עדיין מסמכים בתיקייה זו</div>";
          } else {
            sortDocs(first).forEach(d => {
              const card = buildDocCard(d, "shared");
              const meta = card.querySelector(".doc-card-meta");
              if (meta) {
                const span = document.createElement("span");
                span.textContent = `הועלה ע"י: ${d._ownerEmail || "-"}`;
                meta.appendChild(span);
              }
              docsBox.appendChild(card);
            });
          }
          if (window._stopSharedDocsWatch) try { window._stopSharedDocsWatch(); } catch(e) {}
          window._stopSharedDocsWatch = watchSharedFolderDocs(openId, (rows) => {
            console.log("🔄 Real-time update:", rows.length, "documents");
            docsBox.innerHTML = "";
            if (rows.length === 0) {
              docsBox.innerHTML = "<div style='opacity:.7;padding:20px;text-align:center'>אין עדיין מסמכים בתיקייה זו</div>";
            } else {
              sortDocs(rows).forEach(d => {
                const card = buildDocCard(d, "shared");
                const meta = card.querySelector(".doc-card-meta");
                if (meta) {
                  const span = document.createElement("span");
                  span.textContent = `הועלה ע"י: ${d._ownerEmail || "-"}`;
                  meta.appendChild(span);
                }
                docsBox.appendChild(card);
              });
            }
          });
        } else {
          const docs = collectSharedFolderDocs(allUsersData, openId);
          const sorted = sortDocs(docs);
          docsBox.innerHTML = "";
          if (sorted.length === 0) {
            docsBox.innerHTML = "<div style='opacity:.7;padding:20px;text-align:center'>אין עדיין מסמכים בתיקייה זו (מצב לא מקוון)</div>";
          } else {
            for (const d of sorted) {
              const card = buildDocCard(d, "shared");
              const meta = card.querySelector(".doc-card-meta");
              if (meta) {
                const span = document.createElement("span");
                span.textContent = `הועלה ע"י: ${d._ownerEmail || "-"}`;
                meta.appendChild(span);
              }
              docsBox.appendChild(card);
            }
          }
        }
      }
      await loadAndDisplayDocs();
      // כפתור רענון
      docsHead.querySelector("#refresh_docs_btn").addEventListener("click", async () => {
        showNotification("מרענן רשימת מסמכים...");
        await loadAndDisplayDocs();
        showNotification("הרשימה עודכנה ✅");
      });
      // כפתור הזמנה
      membersBar.querySelector("#detail_inv_btn").addEventListener("click", async () => {
        const emailEl = membersBar.querySelector("#detail_inv_email");
        const targetEmail = (emailEl.value || "").trim().toLowerCase();
        if (!targetEmail) { 
          showNotification("הקלידי מייל של הנמען", true); 
          return; 
        }
        const myEmail = (allUsersData[userNow].email || userNow).toLowerCase();
        if (targetEmail === myEmail) { 
          showNotification("את כבר חברה בתיקייה הזו", true); 
          return; 
        }
        showLoading("בודק אם המשתמש קיים...");
        const exists = await checkUserExistsInFirestore(targetEmail);
        hideLoading();
        if (!exists) { 
          showNotification("אין משתמש עם המייל הזה במערכת", true); 
          return; 
        }
        showLoading("שולח הזמנה...");
        const meUser = allUsersData[userNow];
        const folderName = meUser.sharedFolders[openId]?.name || "";
        const success = await sendShareInviteToFirestore(
          myEmail,
          targetEmail,
          openId,
          folderName
        );
        hideLoading();
        if (success) {
          showNotification("ההזמנה נשלחה בהצלחה! ✉️");
          emailEl.value = "";
        } else {
          showNotification("שגיאה בשליחת ההזמנה, נסי שוב", true);
        }
      });
      return;
    }
    // --- שינוי שם (לכל החברים) ---
    if (renameId) {
      const folder = window.mySharedFolders?.find(f => f.id === renameId);
      const currentName = folder?.name || me.sharedFolders?.[renameId]?.name || "";
      const newName = prompt("שם חדש לתיקייה:", currentName);
      if (!newName || newName.trim() === "") return;
      console.log("✏️ Renaming folder:", { renameId, currentName, newName });
      showLoading("משנה שם...");
      try {
        // 🔥 עדכון ב-Firestore
        if (isFirebaseAvailable()) {
          console.log("📡 Updating in Firestore...");
          const folderRef = window.fs.doc(window.db, "sharedFolders", renameId);
          await window.fs.updateDoc(folderRef, {
            name: newName.trim(),
            lastModified: Date.now(),
            lastModifiedBy: myEmail
          });
          console.log("✅ Folder renamed in Firestore");
        } else {
          console.warn("⚠️ Firebase not available, updating only locally");
        }
        // עדכון מקומי
        for (const [, u] of Object.entries(allUsersData)) {
          if (u.sharedFolders && u.sharedFolders[renameId]) {
            u.sharedFolders[renameId].name = newName.trim();
          }
          (u.incomingShareRequests || []).forEach(r => { if (r.folderId === renameId) r.folderName = newName; });
          (u.outgoingShareRequests || []).forEach(r => { if (r.folderId === renameId) r.folderName = newName; });
        }
        saveAllUsersDataToStorage(allUsersData);
        // רענן את window.mySharedFolders
        if (typeof loadSharedFolders === "function") {
          const folders = await loadSharedFolders();
          window.mySharedFolders = folders;
          saveSharedFoldersToCache(folders);
          console.log("✅ Reloaded shared folders from Firestore");
        }
        hideLoading();
        renderSharedFoldersList();
        showNotification("שם התיקייה עודכן ✅");
      } catch (err) {
        console.error("❌ Rename failed:", err);
        hideLoading();
        showNotification("שגיאה בשינוי שם התיקייה: " + err.message, true);
      }
      return;
    }
    // --- מחיקה ---
    if (delId) {
      const folder = window.mySharedFolders?.find(f => f.id === delId);
      const fname = folder?.name || me.sharedFolders?.[delId]?.name || "תיקייה";
      if (!confirm(`למחוק לצמיתות את התיקייה "${fname}"? (המסמכים לא יימחקו, רק ינותק השיוך)`)) return;
      console.log("🗑️ Deleting folder:", { delId, fname });
      showLoading("מוחק תיקייה...");
      try {
        // 🔥 מחיקה מ-Firestore
        if (isFirebaseAvailable()) {
          console.log("📡 Deleting from Firestore...");
          // מחק את התיקייה עצמה
          const folderRef = window.fs.doc(window.db, "sharedFolders", delId);
          await window.fs.deleteDoc(folderRef);
          console.log("✅ Folder deleted from Firestore");
          // מחק את כל המסמכים המשותפים בתיקייה
          const sharedDocsCol = window.fs.collection(window.db, "sharedDocs");
          const q = window.fs.query(sharedDocsCol, window.fs.where("folderId", "==", delId));
          const snap = await window.fs.getDocs(q);
          const deletePromises = [];
          snap.forEach(doc => {
            deletePromises.push(window.fs.deleteDoc(doc.ref));
          });
          await Promise.all(deletePromises);
          console.log(`✅ Deleted ${deletePromises.length} shared docs`);
        } else {
          console.warn("⚠️ Firebase not available, deleting only locally");
        }
        // מחיקה מקומית
        if (typeof deleteSharedFolderEverywhere === "function") {
          deleteSharedFolderEverywhere(delId);
        } else {
          // Fallback: מחיקה רק אצלי
          delete me.sharedFolders[delId];
          for (const d of (allUsersData[userNow].docs || [])) {
            if (d.sharedFolderId === delId) d.sharedFolderId = null;
          }
          saveAllUsersDataToStorage(allUsersData);
        }
        // רענן את window.mySharedFolders
        if (typeof loadSharedFolders === "function") {
          const folders = await loadSharedFolders();
          window.mySharedFolders = folders;
          saveSharedFoldersToCache(folders);
          console.log("✅ Reloaded shared folders after deletion");
        }
        hideLoading();
        showNotification("התיקייה נמחקה. המסמכים נשארו בארכיונים של בעליהם. ✅");
        renderSharedFoldersList();
      } catch (err) {
        console.error("❌ Delete failed:", err);
        hideLoading();
        showNotification("שגיאה במחיקת התיקייה: " + err.message, true);
      }
      return;
    }
  });
pendingBox.addEventListener("click", async (ev) => {
  const t = ev.target;
  const accId = t.getAttribute?.("data-accept");
  const rejId = t.getAttribute?.("data-reject");
  if (!accId && !rejId) return;
  const myEmail = (allUsersData[userNow].email || userNow).toLowerCase();
  if (accId) {
    const folderId = t.getAttribute("data-folder");
    const folderName = t.getAttribute("data-fname");
    const ownerEmail = t.getAttribute("data-owner");
    showLoading("מצטרף לתיקייה...");
    // הוספה לתיקייה המשותפת
    const added = await addMemberToSharedFolder(folderId, myEmail, folderName, ownerEmail);
    if (added) {
      // עדכון סטטוס ההזמנה
      await updateInviteStatus(accId, "accepted");
      // עדכון מקומי
      if (!allUsersData[userNow].sharedFolders) {
        allUsersData[userNow].sharedFolders = {};
      }
      allUsersData[userNow].sharedFolders[folderId] = {
        name: folderName,
        owner: ownerEmail,
        members: [ownerEmail, myEmail]
      };
      saveAllUsersDataToStorage(allUsersData);
      {
  const acceptedEmail = myEmail;
  const folderId   = t.getAttribute("data-folder");
  const ownerEmail = (t.getAttribute("data-owner") || "").toLowerCase();
  const ownerName = findUsernameByEmail(allUsersData, ownerEmail) || ownerEmail;
  ensureUserSharedFields(allUsersData, ownerName);
  const ownerSF = allUsersData[ownerName].sharedFolders || {};
  if (!ownerSF[folderId]) ownerSF[folderId] = { name: t.getAttribute("data-fname") || "תיקייה משותפת", owner: ownerEmail, members: [] };
  const arr = ownerSF[folderId].members || (ownerSF[folderId].members = []);
  if (!arr.includes(acceptedEmail)) arr.push(acceptedEmail);
  allUsersData[ownerName].sharedFolders = ownerSF;
  saveAllUsersDataToStorage(allUsersData);
  if (categoryTitle.textContent === (ownerSF[folderId].name || "תיקייה משותפת")) {
    openSharedView();
  }
}
      // 🔥 רענן את רשימת התיקיות המשותפות מ-Firestore
      console.log("🔄 Reloading shared folders after accepting invite...");
      if (typeof loadSharedFolders === "function") {
        try {
          const folders = await loadSharedFolders();
          if (folders && folders.length > 0) {
            window.mySharedFolders = folders;
            saveSharedFoldersToCache(folders);
            console.log("✅ Shared folders reloaded:", folders.length);
            // רענן את ה-UI אם אנחנו בתצוגת תיקיות משותפות
            if (categoryTitle.textContent === "אחסון משותף") {
              openSharedView();
            }
          }
        } catch (err) {
          console.warn("⚠️ Could not reload folders:", err);
        }
      }
      showNotification("הצטרפת לתיקייה המשותפת ✔️");
    } else {
      showNotification("שגיאה בהצטרפות, נסי שוב", true);
    }
    hideLoading();
    await renderPending();
  }
  if (rejId) {
    showLoading("דוחה הזמנה...");
    await updateInviteStatus(rejId, "rejected");
    hideLoading();
    showNotification("ההזמנה נדחתה");
    await renderPending();
  }
});
// קריאה ראשונית
renderPending();
  homeView.classList.add("hidden");
  categoryView.classList.remove("hidden");
};
  // function openRecycleView() {
  //   categoryTitle.textContent = "סל מחזור";
  //   const docs = allDocsData.filter(d => d._trashed === true);
  //   renderDocsList(docs, "recycle");
  // }
  function markDocTrashed(id, trashed) {
    const i = allDocsData.findIndex(d => d.id === id);
    if (i > -1) {
      allDocsData[i]._trashed = !!trashed;
      setUserDocs(userNow, allDocsData, allUsersData);
      showNotification(trashed ? "הועבר לסל המחזור" : "שוחזר מהסל");
    }
  }
  function deleteDocForever(id) {
    const i = allDocsData.findIndex(d => d.id === id);
    if (i > -1) {
      // מוחקים גם את הקובץ עצמו מ-IndexedDB
      deleteFileFromDB(id).catch(() => {});
      allDocsData.splice(i, 1);
      setUserDocs(userNow, allDocsData, allUsersData);
      showNotification("הקובץ נמחק לצמיתות");
    }
  }
  function openEditModal(doc) {
    console.log("🔥 edit");
    currentlyEditingDocId = doc.id;
    edit_title.value         = doc.title            || "";
    edit_org.value           = doc.org              || "";
    edit_year.value          = doc.year             || "";
    edit_recipient.value     = (doc.recipient || []).join(", ") || "";
    edit_warrantyStart.value = doc.warrantyStart    || "";
    edit_warrantyExp.value   = doc.warrantyExpiresAt|| "";
    edit_autoDelete.value    = doc.autoDeleteAfter  || "";
    edit_category.value      = doc.category         || "";
    edit_sharedWith.value    = (doc.sharedWith || []).join(", ") || "";
    editModal.classList.remove("hidden");
  }
  function closeEditModal() {
    currentlyEditingDocId = null;
    editModal.classList.add("hidden");
  }
 window.openEditModal = openEditModal;
  window.closeEditModal = closeEditModal;
  if (editCancelBtn) {
    editCancelBtn.addEventListener("click", () => {
      closeEditModal();
    });
  }
if (editForm) {
  console.log("✅ editForm found, adding event listener");
  editForm.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    if (!currentlyEditingDocId) {
      closeEditModal();
      return;
    }
    const idx = window.allDocsData.findIndex(d => d.id === currentlyEditingDocId);
    if (idx === -1) {
      closeEditModal();
      return;
    }
    const updatedRecipients = edit_recipient.value
      .split(",")
      .map(s => s.trim())
      .filter(s => s !== "");
    const updatedShared = edit_sharedWith.value
      .split(",")
      .map(s => s.trim())
      .filter(s => s !== "");
    // מה נשלח לשרת (שמות כמו בעמודות של PostgreSQL)
    const updatesForBackend = {
      title:              edit_title.value.trim() || window.allDocsData[idx].title,
      org:                edit_org.value.trim(),
      year:               edit_year.value.trim(),
      recipient:          updatedRecipients,
      category:           edit_category.value.trim() || "",
      shared_with:        updatedShared,
      warranty_start:     edit_warrantyStart.value || "",
      warranty_expires_at: edit_warrantyExp.value   || "",
      auto_delete_after:  edit_autoDelete.value    || ""
    };
    try {
      console.log("🔍 Starting update...");
      console.log("🔍 currentlyEditingDocId:", currentlyEditingDocId);
      console.log("🔍 window.allDocsData exists?", !!window.allDocsData);
      console.log("🔍 window.updateDocument exists?", !!window.updateDocument);
      console.log("🔍 updatesForBackend:", updatesForBackend);
      if (window.updateDocument) {
        await window.updateDocument(currentlyEditingDocId, updatesForBackend);
        console.log("✅ Backend update completed");
      }
      // לעדכן גם את האובייקט בזיכרון בפורמט שה-UI משתמש בו
      window.allDocsData[idx].title = updatesForBackend.title;
      window.allDocsData[idx].org = updatesForBackend.org;
      window.allDocsData[idx].year              = updatesForBackend.year;
      window.allDocsData[idx].recipient         = updatedRecipients;
      window.allDocsData[idx].category          = updatesForBackend.category;
      window.allDocsData[idx].sharedWith        = updatedShared;
      window.allDocsData[idx].warrantyStart     = updatesForBackend.warranty_start;
      window.allDocsData[idx].warrantyExpiresAt = updatesForBackend.warranty_expires_at;
      window.allDocsData[idx].autoDeleteAfter   = updatesForBackend.auto_delete_after;
       setUserDocs(userNow, window.allDocsData, allUsersData);
      console.log("✅ Local data updated");
      // 🔥 בדוק אם זה תיקייה משותפת ועדכן ב-Firestore
      const urlParams = new URLSearchParams(window.location.search);
      const currentSharedFolder = urlParams.get('sharedFolder');
      if (currentSharedFolder && isFirebaseAvailable()) {
        try {
          // מצא את המסמך המעודכן
          const updatedDoc = window.allDocsData[idx];
          // מצא את כל הרשומות של המסמך הזה ב-sharedDocs
          const col = window.fs.collection(window.db, "sharedDocs");
          const q = window.fs.query(
            col,
            window.fs.where("folderId", "==", currentSharedFolder),
            window.fs.where("id", "==", currentlyEditingDocId)
          );
          const snap = await window.fs.getDocs(q);
          // עדכן את כל הרשומות (יכול להיות יותר מאחת אם כמה משתמשים הוסיפו)
          const updatePromises = [];
          snap.forEach(doc => {
            updatePromises.push(
              window.fs.updateDoc(doc.ref, {
                title: updatesForBackend.title,
                org: updatesForBackend.org,
                year: updatesForBackend.year,
                recipient: updatedRecipients,
                category: updatesForBackend.category,
                lastUpdated: Date.now()
              })
            );
          });
          await Promise.all(updatePromises);
          console.log("✅ Updated in Firestore sharedDocs");
        } catch (err) {
          console.error("⚠️ Failed to update Firestore:", err);
        }
      }
      const currentCat = categoryTitle.textContent;
      // 🔥 אם זה תיקייה משותפת - חזור אליה!
      if (currentSharedFolder) {
        console.log("🔄 Returning to shared folder:", currentSharedFolder);
        closeEditModal();
        if (typeof window.openSharedFolder === "function") {
          await window.openSharedFolder(currentSharedFolder);
        } else {
          window.location.reload();
        }
        return; // ← חשוב! עצור כאן
      }
      // תיקיות רגילות
      if (currentCat === "אחסון משותף") {
        openSharedView();
      } else if (currentCat === "סל מחזור") {
        openRecycleView();
      } else {
        openCategoryView(currentCat);
      }
      showNotification("המסמך עודכן בהצלחה");
    } catch (err) {
      console.error("❌ שגיאה בעדכון מסמך:", err);
      showNotification("שגיאה בעדכון המסמך", true);
    } finally {
      closeEditModal();
    }
  });
} else {
  console.error("❌ editForm NOT FOUND!");
}
  // ניווט
  window.App = {
    renderHome,
    openSharedView,
    openRecycleView
  };
  if (backButton) {
    backButton.addEventListener("click", () => {
      renderHome();
    });
  }
  if (uploadBtn && fileInput) {
    uploadBtn.addEventListener("click", () => {
      fileInput.click();
    });
  }
  if (sortSelect) {
    sortSelect.addEventListener("change", () => {
      const [field, dir] = sortSelect.value.split("-");
      currentSortField = field;
      currentSortDir   = dir;
      if (!categoryView.classList.contains("hidden")) {
        openCategoryView(categoryTitle.textContent);
      }
    });
  }
  // העלאת קובץ ושמירה (Metadata -> localStorage, קובץ -> IndexedDB)
  // פתיחת קובץ מה-IndexedDB
  document.addEventListener("click", async (ev) => {
    const btn = ev.target.closest("[data-open-id]");
    if (!btn) return;
    const docId = btn.getAttribute("data-open-id");
    const docObj = allDocsData.find(d => d.id === docId);
    if (!docObj) {
      showNotification("לא נמצא המסמך", true);
      return;
    }
    // נטען את ה-dataURL מתוך IndexedDB
    let dataUrl = null;
    try {
      dataUrl = await loadFileFromDB(docObj.id);
    } catch (e) {
      console.error("שגיאה בשליפת קובץ מה-DB:", e);
    }
    if (!dataUrl) {
      //showNotification("הקובץ הזה לא שמור / גדול מדי או נמחק מהמכשיר. אבל הפרטים נשמרו.", true);
      return;
    }
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = docObj.originalFileName || "file";
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    a.remove();
  });
});
window.addEventListener("firebase-ready", () => {
   console.log("🔥 Firebase ready → booting app");
   bootFromCloud();
});
// ═══════════════════════════════════════════════════════════════════
//    SHARED-FOLDERS-FIX.js - תיקון לתיקיות משותפות שנעלמות
// ═══════════════════════════════════════════════════════════════════
//
// הוסיפי את הקוד הזה בסוף main.js
//
// ═══════════════════════════════════════════════════════════════════
console.log("🔧 Loading Shared Folders Fix...");
// ═══ פונקציות עזר ═══
// שמירה ב-localStorage
function saveSharedFoldersToCache(folders) {
  try {
    const me = getCurrentUserEmail();
    console.log("💾 Attempting to save folders to cache for:", me);
    console.log("💾 Number of folders to save:", folders?.length || 0);
    if (!me) {
      console.warn("⚠️ No user email, cannot save to cache");
      return;
    }
    const key = `sharedFolders_${me}`;
    localStorage.setItem(key, JSON.stringify(folders));
    console.log("✅ Saved", folders.length, "shared folders to cache with key:", key);
    // בדיקה שזה באמת נשמר
    const verify = localStorage.getItem(key);
    console.log("🔍 Verification - data in localStorage:", verify ? "EXISTS" : "MISSING");
  } catch (err) {
    console.error("❌ Failed to save to cache:", err);
  }
}
// טעינה מ-localStorage
function loadSharedFoldersFromCache() {
  try {
    const me = getCurrentUserEmail();
    console.log("📂 Loading shared folders from cache for:", me);
    if (!me) {
      console.warn("⚠️ No user email, cannot load from cache");
      return [];
    }
    const key = `sharedFolders_${me}`;
    const data = localStorage.getItem(key);
    console.log("💾 localStorage key:", key);
    console.log("💾 localStorage data:", data);
    if (data) {
      const folders = JSON.parse(data);
      console.log("✅ Loaded", folders.length, "shared folders from cache");
      return folders;
    } else {
      console.log("📭 No cached folders found");
    }
  } catch (err) {
    console.warn("⚠️ Could not load from cache:", err);
  }
  return [];
}
// ═══ Override openSharedFolder ═══
if (typeof window.openSharedFolder === "function") {
  const originalOpenSharedFolder = window.openSharedFolder;
  window.openSharedFolder = async function(folderId) {
    console.log("📂 openSharedFolder overridden with URL param:", folderId);

    // 🆕 נשמור את מזהה התיקייה בגלובלי
    window.currentSharedFolderId = folderId;

    // 🔥 עדכן URL עם sharedFolder parameter
    const url = new URL(window.location);
    url.searchParams.set('sharedFolder', folderId);
    window.history.pushState({}, '', url);

    // קרא לפונקציה המקורית
    const result = await originalOpenSharedFolder(folderId);

    // שמור את רשימת התיקיות
    if (window.mySharedFolders && Array.isArray(window.mySharedFolders)) {
      saveSharedFoldersToCache(window.mySharedFolders);
    }
    return result;
  };
  console.log("✅ openSharedFolder overridden");
}

// ═══ Override acceptShareInvite ═══
if (typeof window.updateInviteStatus === "function") {
  const originalUpdateInvite = window.updateInviteStatus;
  window.updateInviteStatus = async function(inviteId, status) {
    console.log("📬 Updating invite:", inviteId, status);
    // קרא לפונקציה המקורית
    const result = await originalUpdateInvite(inviteId, status);
    // אם אישרנו הזמנה, רענן את התיקיות ושמור
    if (status === "accepted") {
      setTimeout(async () => {
        if (typeof loadSharedFolders === "function") {
          try {
            const folders = await loadSharedFolders();
            if (folders && folders.length > 0) {
              window.mySharedFolders = folders;
              saveSharedFoldersToCache(folders);
              console.log("✅ Shared folders updated after accepting invite");
            }
          } catch (err) {
            console.warn("⚠️ Could not update folders:", err);
          }
        }
      }, 1000);
    }
    return result;
  };
  console.log("✅ updateInviteStatus overridden");
}
// ═══ טעינה אוטומטית בהתחלה ═══
if (typeof window.bootFromCloud !== "undefined") {
  const originalBoot = window.bootFromCloud;
  window.bootFromCloud = async function() {
    console.log("🚀 Boot with shared folders - ALWAYS LOAD FROM FIRESTORE");
    // טען מסמכים רגילים
    await originalBoot();
    // 🔥 טען תיקיות משותפות ישירות מ-Firestore (לא מ-cache!)
    console.log("📂 Loading shared folders from Firestore...");
    try {
      if (typeof loadSharedFolders === "function") {
        const folders = await loadSharedFolders();
        console.log("📥 Loaded from Firestore:", folders?.length || 0, "folders");
        if (folders && folders.length > 0) {
          window.mySharedFolders = folders;
          console.log("✅ Set window.mySharedFolders:", folders.length);
          // שמור גם ב-cache (לעתיד)
          saveSharedFoldersToCache(folders);
          // עדכן UI
          if (typeof renderSharedFoldersUI === "function") {
            console.log("🎨 Rendering UI...");
            renderSharedFoldersUI(folders);
          } else {
            console.warn("⚠️ renderSharedFoldersUI not found");
          }
        } else {
          console.log("📭 No shared folders found in Firestore");
          window.mySharedFolders = [];
        }
      } else {
        console.error("❌ loadSharedFolders function not found!");
      }
    } catch (err) {
      console.error("❌ Failed to load shared folders:", err);
      window.mySharedFolders = [];
    }
  };
  console.log("✅ bootFromCloud overridden for shared folders");
}
// ═══ טעינה ידנית (אם bootFromCloud לא קיים) ═══
if (!window.bootFromCloud) {
  // אם אין bootFromCloud, נסה לטעון כשהדף נטען
  window.addEventListener('load', function() {
    console.log("📂 Loading shared folders on page load...");
    const cachedFolders = loadSharedFoldersFromCache();
    if (cachedFolders && cachedFolders.length > 0) {
      window.mySharedFolders = cachedFolders;
      console.log("✅ Loaded", cachedFolders.length, "shared folders");
    }
  });
}
// ═══ פונקציה ידנית לשמירה ═══
window.saveCurrentSharedFolders = function() {
  if (window.mySharedFolders && Array.isArray(window.mySharedFolders)) {
    saveSharedFoldersToCache(window.mySharedFolders);
    console.log("✅ Manually saved shared folders");
  } else {
    console.warn("⚠️ No shared folders to save");
  }
};
// ═══ פונקציה ידנית לטעינה ═══
window.loadSavedSharedFolders = function() {
  const folders = loadSharedFoldersFromCache();
  if (folders && folders.length > 0) {
    window.mySharedFolders = folders;
    console.log("✅ Manually loaded", folders.length, "shared folders");
    return folders;
  }
  console.warn("⚠️ No saved shared folders found");
  return [];
};
console.log("✅ Shared Folders Fix loaded!");
console.log("💡 Manual commands available:");
console.log("   - saveCurrentSharedFolders()");
console.log("   - loadSavedSharedFolders()");
// ════════════════════════════════════════════════════════════════
// 🔧 תיקונים ל-main.js - העתיקי לסוף הקובץ
// ════════════════════════════════════════════════════════════════
// ═══ תיקון 1: בטל הערה מ-deleteDocForever ═══
// מצא שורות 1884-1933 (שמתחילות ב-"// async function deleteDocForever")
// ומחק את ה-"//" מכל שורה
// או פשוט החלף בקוד הזה:
async function deleteDocForever(id) {
  console.log("🗑️ Deleting forever:", id);
  const allDocsData = window.allDocsData || [];
  const userNow = getCurrentUserEmail();
  const allUsersData = window.allUsersData || {};
  const i = allDocsData.findIndex(d => d.id === id);
  if (i === -1) {
    showNotification("המסמך לא נמצא", true);
    return;
  }
  const doc = allDocsData[i];
  try {
    // Delete from backend if available
        // Delete from backend (Render API) דרך ה-api-bridge
    if (window.deleteDocForever && typeof window.deleteDocForever === 'function') {
      try {
        await window.deleteDocForever(id); // ← קורא לפונקציה מ-api-bridge.js
        console.log("✅ Deleted from backend (Render + DB)");
      } catch (backendError) {
        console.warn("⚠️ Backend delete failed:", backendError);
      }
    }
    // Delete from IndexedDB (local)
    if (typeof deleteFileFromDB === 'function') {
      await deleteFileFromDB(id).catch(() => {});
    }
    // Delete from Firestore
    if (isFirebaseAvailable()) {
      const docRef = window.fs.doc(window.db, "documents", id);
      await window.fs.deleteDoc(docRef);
      console.log("✅ Document deleted from Firestore:", id);
    }
    // Delete from Storage (if has downloadURL)
    if (doc.downloadURL && window.storage) {
      try {
        const storageRef = window.fs.ref(window.storage, doc.downloadURL);
        await window.fs.deleteObject(storageRef);
        console.log("✅ File deleted from Storage");
      } catch (storageError) {
        console.warn("⚠️ Could not delete from Storage:", storageError.message);
      }
    }
    // Remove from local array
    allDocsData.splice(i, 1);
    window.allDocsData = allDocsData;
    if (typeof setUserDocs === "function") {
      setUserDocs(userNow, allDocsData, allUsersData);
    }
    showNotification("הקובץ נמחק לצמיתות");
    // Refresh view
    if (typeof openRecycleView === 'function') {
      openRecycleView();
    }
  } catch (error) {
    console.error("❌ Error deleting document:", error);
    showNotification("שגיאה במחיקת המסמך", true);
  }
}
// ═══ תיקון 2: שחזור מסל מחזור ═══
async function restoreDocument(id) {
  console.log("♻️ Restoring:", id);
  await markDocTrashed(id, false);
  if (typeof openRecycleView === 'function') {
    openRecycleView();
  }
}
// ═══ תיקון 3: צפייה/פתיחת קובץ ═══
async function viewDocument(doc) {
  console.log("👁️ Downloading:", doc.title);
  try {
    // הצגת הודעה שמתחיל להוריד
    if (typeof showNotification === "function") {
      showNotification("מוריד את הקובץ... 📥");
    }
    // תמיד קודם מנסים דרך Render (עם headers)
    if (window.downloadDocument && typeof window.downloadDocument === "function") {
      await window.downloadDocument(
        doc.id,
        doc.fileName || doc.title || "document"
      );
      // הודעת הצלחה
      if (typeof showNotification === "function") {
        showNotification("הקובץ הורד בהצלחה! ✅");
      }
      return;
    }
    // אם משום מה אין downloadDocument – ננסה ישירות מה-URL (פיירבייס ישן)
    if (doc.downloadURL) {
      const a = document.createElement("a");
      a.href = doc.downloadURL;
      a.target = "_blank";
      a.download = doc.fileName || doc.title || "document";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      if (typeof showNotification === "function") {
        showNotification("הקובץ הורד בהצלחה! ✅");
      }
      return;
    }
    showNotification("הקובץ לא זמין להורדה", true);
  } catch (error) {
    console.error("❌ Download error:", error);
    showNotification("שגיאה בהורדת הקובץ", true);
  }
}
// ═══ תיקון 4: הורדת קובץ ═══
async function downloadDocument(doc) {
  console.log("📥 Downloading:", doc.title);
  try {
    // Try backend first
    if (window.downloadDocument && typeof window.downloadDocument === 'function') {
      await window.downloadDocument(doc.id);
      return;
    }
    // Try Firebase Storage
    if (doc.downloadURL) {
      const link = document.createElement('a');
      link.href = doc.downloadURL;
      link.download = doc.fileName || doc.title || 'download';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showNotification("הקובץ הורד בהצלחה");
      return;
    }
    // No file available
    showNotification("הקובץ לא זמין להורדה (metadata בלבד)", true);
  } catch (error) {
    console.error("❌ Download error:", error);
    showNotification("שגיאה בהורדת הקובץ", true);
  }
}
// ═══ תיקון 5: חבר כפתור "פתיחת קובץ" ═══
// הוסף event listener לכפתורי פתיחת קובץ
document.addEventListener('click', function(e) {
  if (e.target.classList.contains('doc-open-link')) {
    const docId = e.target.dataset.openId;
    if (docId) {
      const doc = (window.allDocsData || []).find(d => d.id === docId);
      if (doc) {
        viewDocument(doc);
      }
    }
  }
});
// 🎯 האזנה גלובלית לכפתור "שחזור" בסל המחזור
console.log("✅ All functions fixed and loaded!");
// 🔥 תמיכה בפתיחת קבצים לכל החברים בתיקייה משותפת
(function() {
  document.addEventListener('click', async (e) => {
    const target = e.target;
    // בדוק אם זה כפתור פתיחת קובץ
    if (target.classList.contains('doc-open-link')) {
      e.preventDefault();
      e.stopPropagation();
      const docId = target.dataset.openId;
      if (!docId) {
        console.error("❌ No document ID");
        return;
      }
      // בדוק אם זה בתיקייה משותפת
      const urlParams = new URLSearchParams(window.location.search);
      const sharedFolderId = urlParams.get('sharedFolder');
      if (sharedFolderId) {
        console.log("🔍 Opening shared doc:", docId);
        try {
          showLoading("טוען מסמך...");
          // נסה לטעון מ-Firestore
          if (isFirebaseAvailable()) {
            const docRef = window.fs.doc(window.db, "sharedDocs", `${sharedFolderId}_${docId}`);
            const docSnap = await window.fs.getDoc(docRef);
            if (docSnap.exists()) {
              const docData = docSnap.data();
              console.log("📄 Found document:", docData);
              if (docData.fileUrl) {
                window.open(docData.fileUrl, '_blank');
                hideLoading();
                showNotification("פותח קובץ...");
                return;
              }
            }
          }
          // אם לא מצאנו ב-Firestore, נסה API
          const currentEmail = getCurrentUserEmail();
          const response = await fetch(`${API_BASE}/api/docs/${docId}`, {
            headers: {
              "X-Dev-Email": currentEmail
            }
          });
          if (response.ok) {
            const doc = await response.json();
            if (doc.fileUrl) {
              window.open(doc.fileUrl, '_blank');
              hideLoading();
              return;
            }
          }
          hideLoading();
          showNotification("לא נמצא קישור לקובץ", true);
        } catch (err) {
          console.error("❌ Error opening doc:", err);
          hideLoading();
          showNotification("שגיאה בפתיחת המסמך", true);
        }
      }
    }
  });
  console.log("✅ Shared document opener installed");
})();




// 🧩 FIX: פונקציה בסיסית ל-renderSharedFoldersUI כדי שלא תהיה שגיאה
window.renderSharedFoldersUI = window.renderSharedFoldersUI || function(folders = []) {
  // נשמור את התיקיות בזיכרון הגלובלי
  window.mySharedFolders = Array.isArray(folders) ? folders : [];
  console.log("📂 renderSharedFoldersUI stub - got", window.mySharedFolders.length, "folders");

  // אם יש פונקציה שמציגה את מסך האחסון המשותף – נפעיל אותה
  if (typeof window.openSharedView === "function") {
    try {
      window.openSharedView();
    } catch (e) {
      console.warn("⚠️ openSharedView failed inside renderSharedFoldersUI:", e);
    }
  }
};
