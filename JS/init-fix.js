// init-fix.js
// Add this script AFTER main.js in your index.html
// This manually triggers all the initialization that's stuck in DOMContentLoaded

console.log("🔧 Init-fix: Starting manual initialization...");

// Wait a bit for all scripts to load
setTimeout(async () => {
  try {
    console.log("🔧 Init-fix: Checking if initialization is needed...");
    
    // Check if renderHome exists
    if (typeof window.renderHome !== 'function') {
      console.error("❌ renderHome not found! Main.js didn't execute properly");
      
      // Force execute the initialization code from main.js
      const homeView = document.getElementById("homeView");
      const categoryView = document.getElementById("categoryView");
      const folderGrid = document.getElementById("folderGrid");
      const backButton = document.getElementById("backButton");
      const uploadBtn = document.getElementById("uploadBtn");
      const fileInput = document.getElementById("fileInput");
      
      if (!folderGrid) {
        console.error("❌ folderGrid element not found!");
        return;
      }
      
      console.log("🔧 Manually setting up navigation...");
      
      // Categories
      const CATEGORIES = [
        "כלכלה", "רפואה", "עבודה", "בית",
        "אחריות", "תעודות", "עסק", "אחר"
      ];
      
      // Initialize global data if missing
      if (!window.allDocsData) {
        window.allDocsData = [];
      }
      
      // Create renderHome function
      window.renderHome = function() {
        console.log("🎨 renderHome called");
        
        if (!folderGrid) return;
        
        folderGrid.innerHTML = "";
        
        CATEGORIES.forEach(cat => {
          const folder = document.createElement("button");
          folder.className = "folder-card";
          folder.innerHTML = `
            <div class="folder-icon"></div>
            <div class="folder-label">${cat}</div>
          `;
          
          folder.addEventListener("click", () => {
            console.log("📂 Opening category:", cat);
            if (typeof window.openCategoryView === "function") {
              window.openCategoryView(cat);
            }
          });
          
          folderGrid.appendChild(folder);
        });
        
        homeView?.classList.remove("hidden");
        categoryView?.classList.add("hidden");
        
        console.log("✅ Home view rendered");
      };
      
      // Set up back button
      if (backButton) {
        backButton.addEventListener("click", () => {
          console.log("⬅ Back button clicked");
          window.renderHome();
        });
      }
      
      // Set up upload button
      if (uploadBtn && fileInput) {
        uploadBtn.addEventListener("click", () => {
          console.log("📤 Upload button clicked");
          fileInput.click();
        });
      }
      
      // Set up menu navigation
      document.querySelectorAll(".menu-item").forEach(btn => {
        btn.addEventListener("click", () => {
          console.log("🔘 Menu clicked:", btn.dataset.view);
          
          const view = btn.dataset.view;
          
          // Update active state
          document.querySelectorAll(".menu-item").forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          
          if (view === "home") {
            window.renderHome();
          } else if (view === "shared") {
            if (typeof window.openSharedView === "function") {
              window.openSharedView();
            }
          } else if (view === "recycle") {
            if (typeof window.openRecycleView === "function") {
              window.openRecycleView();
            }
          }
          
          // Close mobile menu
          if (window.matchMedia("(max-width: 760px)").matches) {
            document.getElementById("sidebarDrawer")?.classList.remove("open");
          }
        });
      });
      
      // Set up mobile menu
      const mobileMenuBtn = document.getElementById("mobileMenuBtn");
      const closeMenuBtn = document.getElementById("closeMenuBtn");
      const sidebarDrawer = document.getElementById("sidebarDrawer");
      
      if (mobileMenuBtn && sidebarDrawer) {
        mobileMenuBtn.addEventListener("click", () => {
          sidebarDrawer.classList.add("open");
        });
      }
      
      if (closeMenuBtn && sidebarDrawer) {
        closeMenuBtn.addEventListener("click", () => {
          sidebarDrawer.classList.remove("open");
        });
      }
      
      // Initial render
      console.log("🎬 Performing initial render...");
      window.renderHome();
      
      console.log("✅ Manual initialization complete!");
      
    } else {
      console.log("✅ renderHome already exists, initialization was successful");
      
      // Just render home to be safe
      if (typeof window.renderHome === 'function') {
        window.renderHome();
      }
    }
    
  } catch (err) {
    console.error("❌ Init-fix error:", err);
  }
}, 500); // Wait 500ms for scripts to load