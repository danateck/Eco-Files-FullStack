// ===== תיקון ניווט תתי תיקיות =====
// תיקון לבעיה: לחיצה על תתי תיקיות לא מעבירה לתיקייה

console.log("🔧 Loading subfolders navigation fix...");

// משתנה גלובלי לעקוב אחרי התיקייה הנוכחית
let currentMainCategory = null;
let currentSubfolder = null;

// פונקציה שמטפלת בלחיצה על תת-תיקייה
function handleSubfolderClick(subfolder, mainCategory) {
  console.log("📂 Subfolder clicked:", { subfolder, mainCategory });
  
  currentMainCategory = mainCategory;
  currentSubfolder = subfolder;
  
  // עדכון הכותרת
  const categoryTitle = document.getElementById("categoryTitle");
  if (categoryTitle) {
    categoryTitle.textContent = subfolder === "הכל" 
      ? mainCategory 
      : `${mainCategory} → ${subfolder}`;
  }
  
  // סינון המסמכים
  filterAndDisplayDocs(mainCategory, subfolder);
  
  // עדכון מצב הכפתורים
  updateSubfolderButtons(subfolder);
}

// פונקציה לעדכון מצב הכפתורים (active)
function updateSubfolderButtons(activeSubfolder) {
  const subfoldersBar = document.getElementById("subfoldersBar");
  if (!subfoldersBar) return;
  
  const buttons = subfoldersBar.querySelectorAll(".tab-btn");
  buttons.forEach(btn => {
    const btnSubfolder = btn.getAttribute("data-subfolder");
    if (btnSubfolder === activeSubfolder) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
}

// פונקציה לסינון והצגת מסמכים
function filterAndDisplayDocs(mainCategory, subfolder) {
  console.log("🔍 Filtering docs:", { mainCategory, subfolder });
  
  const docsList = document.getElementById("docsList");
  if (!docsList) return;
  
  // טען את כל המסמכים
  let allDocs = [];
  
  if (typeof window.allDocsData !== 'undefined' && Array.isArray(window.allDocsData)) {
    allDocs = window.allDocsData;
  } else if (typeof window.allUsersData !== 'undefined' && window.userNow) {
    const userData = window.allUsersData[window.userNow];
    if (userData && Array.isArray(userData.docs)) {
      allDocs = userData.docs;
    }
  }
  
  console.log("📊 Total docs available:", allDocs.length);
  
  // סנן לפי קטגוריה ראשית
  let filteredDocs = allDocs.filter(doc => {
    // דלג על מסמכים בפח
    if (doc.trashed) return false;
    
    // אם זה "הכל" - הצג הכל
    if (mainCategory === "הכל") return true;
    
    // אם יש קטגוריה - סנן לפיה
    return doc.category === mainCategory;
  });
  
  console.log("📊 After main category filter:", filteredDocs.length);
  
  // סנן לפי תת-תיקייה
  if (subfolder && subfolder !== "הכל") {
    filteredDocs = filteredDocs.filter(doc => {
      // בדוק אם יש שדה subfolder
      if (doc.subfolder) {
        return doc.subfolder === subfolder;
      }
      
      // נסיון חלופי - בדוק ב-recipient
      if (Array.isArray(doc.recipient)) {
        return doc.recipient.includes(subfolder);
      }
      
      // אם אין תת-תיקייה מוגדרת, אל תציג
      return false;
    });
  }
  
  console.log("📊 After subfolder filter:", filteredDocs.length);
  
  // הצג את המסמכים
  displayFilteredDocs(filteredDocs, docsList);
}

// פונקציה להצגת מסמכים מסוננים
function displayFilteredDocs(docs, container) {
  container.innerHTML = "";
  
  if (docs.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; opacity: 0.7;">
        <div style="font-size: 3em; margin-bottom: 16px;">📭</div>
        <div>אין מסמכים בתיקייה זו</div>
      </div>
    `;
    return;
  }
  
  // מיון המסמכים
  const sortSelect = document.getElementById("sortSelect");
  let sortedDocs = docs;
  
  if (sortSelect && typeof window.sortDocs === 'function') {
    sortedDocs = window.sortDocs(docs);
  }
  
  // בניית כרטיסים
  if (typeof window.buildDocCard === 'function') {
    sortedDocs.forEach(doc => {
      const card = window.buildDocCard(doc);
      container.appendChild(card);
    });
  } else {
    // fallback - הצגה בסיסית
    sortedDocs.forEach(doc => {
      const card = document.createElement("div");
      card.className = "doc-card";
      card.innerHTML = `
        <div class="doc-card-title">${doc.title || doc.fileName || "ללא שם"}</div>
        <div class="doc-card-meta">
          ${doc.category || "ללא קטגוריה"} • ${doc.year || "-"}
        </div>
      `;
      container.appendChild(card);
    });
  }
  
  console.log("✅ Displayed", sortedDocs.length, "documents");
}

// פונקציה שמאתחלת את המערכת כשפותחים קטגוריה
function initializeSubfolders(mainCategory) {
  console.log("🎬 Initializing subfolders for:", mainCategory);
  
  currentMainCategory = mainCategory;
  currentSubfolder = "הכל";
  
  const subfoldersBar = document.getElementById("subfoldersBar");
  if (!subfoldersBar) {
    console.warn("⚠️ subfoldersBar not found");
    return;
  }
  
  // נקה את הכפתורים הקיימים
  subfoldersBar.innerHTML = "";
  
  // בנה כפתור "הכל"
  const allBtn = document.createElement("button");
  allBtn.className = "tab-btn active";
  allBtn.textContent = "הכל";
  allBtn.setAttribute("data-subfolder", "הכל");
  allBtn.onclick = () => handleSubfolderClick("הכל", mainCategory);
  subfoldersBar.appendChild(allBtn);
  
  // מצא את כל תתי התיקיות עבור הקטגוריה הזו
  const subfolders = getSubfoldersForCategory(mainCategory);
  
  console.log("📁 Found subfolders:", subfolders);
  
  // בנה כפתור לכל תת-תיקייה
  subfolders.forEach(subfolder => {
    const btn = document.createElement("button");
    btn.className = "tab-btn";
    btn.textContent = subfolder;
    btn.setAttribute("data-subfolder", subfolder);
    btn.onclick = () => handleSubfolderClick(subfolder, mainCategory);
    subfoldersBar.appendChild(btn);
  });
  
  // הצג את כל המסמכים בהתחלה
  filterAndDisplayDocs(mainCategory, "הכל");
}

// פונקציה למצוא את כל תתי התיקיות בקטגוריה
function getSubfoldersForCategory(mainCategory) {
  let allDocs = [];
  
  if (typeof window.allDocsData !== 'undefined' && Array.isArray(window.allDocsData)) {
    allDocs = window.allDocsData;
  } else if (typeof window.allUsersData !== 'undefined' && window.userNow) {
    const userData = window.allUsersData[window.userNow];
    if (userData && Array.isArray(userData.docs)) {
      allDocs = userData.docs;
    }
  }
  
  // סנן מסמכים לפי קטגוריה
  const categoryDocs = allDocs.filter(doc => {
    if (doc.trashed) return false;
    if (mainCategory === "הכל") return true;
    return doc.category === mainCategory;
  });
  
  // אסוף את כל תתי התיקיות הייחודיות
  const subfoldersSet = new Set();
  
  categoryDocs.forEach(doc => {
    // נסה למצוא subfolder בכמה מקומות
    if (doc.subfolder) {
      subfoldersSet.add(doc.subfolder);
    } else if (Array.isArray(doc.recipient)) {
      doc.recipient.forEach(r => subfoldersSet.add(r));
    }
  });
  
  // המר ל-array וממיין
  return Array.from(subfoldersSet).sort();
}

// התחבר לפונקציה הקיימת של פתיחת קטגוריה
function patchCategoryOpening() {
  // שמור את הפונקציה המקורית
  const originalOpenCategory = window.openCategory;
  
  // צור פונקציה חדשה שעוטפת את המקורית
  window.openCategory = function(categoryName) {
    console.log("🔀 Opening category:", categoryName);
    
    // קרא לפונקציה המקורית (אם קיימת)
    if (typeof originalOpenCategory === 'function') {
      originalOpenCategory(categoryName);
    }
    
    // אתחל את תתי התיקיות
    setTimeout(() => {
      initializeSubfolders(categoryName);
    }, 100);
  };
  
  console.log("✅ Category opening patched");
}

// התחבר לכפתור "חזרה"
function patchBackButton() {
  const backButton = document.getElementById("backButton");
  if (backButton) {
    const originalOnClick = backButton.onclick;
    
    backButton.onclick = function() {
      console.log("⬅ Back button clicked");
      
      // איפוס המצב
      currentMainCategory = null;
      currentSubfolder = null;
      
      // קרא לפונקציה המקורית
      if (typeof originalOnClick === 'function') {
        originalOnClick.call(this);
      }
    };
    
    console.log("✅ Back button patched");
  }
}

// אתחול התיקון
function initSubfoldersNavFix() {
  console.log("🚀 Initializing subfolders navigation fix...");
  
  // המתן ל-DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      patchCategoryOpening();
      patchBackButton();
    });
  } else {
    patchCategoryOpening();
    patchBackButton();
  }
  
  console.log("✅ Subfolders navigation fix initialized!");
}

// חיבור ל-window
window.handleSubfolderClick = handleSubfolderClick;
window.initializeSubfolders = initializeSubfolders;
window.getSubfoldersForCategory = getSubfoldersForCategory;
window.currentMainCategory = () => currentMainCategory;
window.currentSubfolder = () => currentSubfolder;

// הפעל את התיקון
initSubfoldersNavFix();

console.log("✅ Subfolders navigation fix loaded!");
console.log("📌 Features:");
console.log("  - Click on subfolder buttons to filter");
console.log("  - Automatic subfolder detection");
console.log("  - Active button highlighting");
