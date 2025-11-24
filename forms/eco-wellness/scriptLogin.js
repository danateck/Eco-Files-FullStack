// scriptLogin.js
// Cloud Firestore Version - All data stored in Firebase Firestore

import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, setPersistence, browserLocalPersistence }
  from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";




// Firestore Database functions
async function loadUserDataFromFirestore(email) {
    try {
        const db = window.db;
        const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js");
        
        const userRef = doc(db, "users", email);
        const snapshot = await getDoc(userRef);
        
        if (snapshot.exists()) {
            return snapshot.data();
        }
        return null;
    } catch (err) {
        console.error("Error loading user data:", err);
        return null;
    }
}

async function saveUserDataToFirestore(email, userData) {
    try {
        const db = window.db;
        const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js");
        
        const userRef = doc(db, "users", email);
        await setDoc(userRef, userData, { merge: true });
        return true;
    } catch (err) {
        console.error("Error saving user data:", err);
        return false;
    }
}

async function setCurrentUser() {
    const user = window.auth?.currentUser;

    if (user) {
        const email = user.email?.toLowerCase() ?? "";
        console.log("✅ Current logged-in user from Firebase:", email);
        // You can use `email` directly wherever you need it
        return email;
    } else {
        console.log("❌ No user currently logged in");
        return null;
    }
}


function getCurrentUser() {
    return auth.currentUser?.email ?? null;
}


class EcoWellnessLoginForm {
    constructor() {
        // אלמנטים מהדף
        this.form = document.getElementById('loginForm');
        this.emailInput = document.getElementById('email');
        this.passwordInput = document.getElementById('password');
        this.passwordToggle = document.getElementById('passwordToggle');
        this.submitButton = this.form.querySelector('.harmony-button');
        this.successMessage = document.getElementById('successMessage');
        this.socialButtons = document.querySelectorAll('.earth-social');
        this.forgotLink = document.querySelector(".healing-link");

        // Firebase
        this.auth = null;
        this.db = null;
        this.googleProvider = null;
        this.signInWithEmailAndPassword = null;
        this.createUserWithEmailAndPassword = null;
        this.signInWithPopup = null;
        this.sendPasswordResetEmail = null;

        this.init();
    }

    async init() {
        await this.initFirebase();
        this.bindEvents();
        this.setupPasswordToggle();
        this.setupWellnessEffects();
        this.setupGoogleButton();
        this.setupForgotPassword();
    }

    async initFirebase() {
    try {
        const [appModule, authModule, firestoreModule] = await Promise.all([
            import("https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js"),
            import("https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js"),
            import("https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js")
        ]);

      const { initializeApp, getApp, getApps } = appModule;
        const { 
            getAuth, 
            GoogleAuthProvider, 
            signInWithPopup,
            signInWithEmailAndPassword,
            createUserWithEmailAndPassword,
            sendPasswordResetEmail,
            setPersistence,               // ✅ add this
            browserLocalPersistence ,      // ✅ and this
            sendEmailVerification 
        } = authModule;

        const { getFirestore } = firestoreModule;

        const firebaseApp = getApps().length ? getApp() : initializeApp(window.firebaseConfig);
        this.auth = getAuth(firebaseApp);

        // ✅ ADD THIS — persistence handled by Firebase cookie
        await setPersistence(this.auth, browserLocalPersistence);

        this.db = getFirestore(firebaseApp);
        this.googleProvider = new GoogleAuthProvider();

        // Store auth functions
        this.signInWithPopup = signInWithPopup;
        this.signInWithEmailAndPassword = signInWithEmailAndPassword;
        this.createUserWithEmailAndPassword = createUserWithEmailAndPassword;
        this.sendPasswordResetEmail = sendPasswordResetEmail;
        this.sendEmailVerification = sendEmailVerification;

        window.auth = this.auth;
        window.db = this.db;

        console.log("Firebase initialized successfully (cookie persistence enabled)");
    } catch (err) {
        console.error("Firebase initialization error:", err);
        alert("שגיאה באתחול המערכת. אנא רענני את הדף.");
    }
}


async registerNewUserWithVerification() {
  const email = this.emailInput.value.trim();
  const password = this.passwordInput.value.trim();

  const okEmail = this.validateEmail();
  const okPass = this.validatePassword();
  if (!okEmail || !okPass) return;

  this.setLoading(true);

  try {
    // יצירת משתמש חדש
    const cred = await this.createUserWithEmailAndPassword(this.auth, email, password);

    // שליחת מייל אימות
    await this.sendEmailVerification(cred.user, {
      // אפשר להשאיר ריק או לשים URL חזרה ללוגין שלך
      url: "https://danateck.github.io/Eco-Files-FullStack/forms/eco-wellness/",
      handleCodeInApp: false
    });

    alert("נוצר משתמש חדש! שלחנו אליך מייל לאימות. רק אחרי שתאשרי את המייל תוכלי להתחבר.");

    // ניתוק – שלא תהיה גישה לפני אימות
    await this.auth.signOut();
    this.setLoading(false);

  } catch (err) {
    console.error("Register error:", err);
    if (err.code === "auth/email-already-in-use") {
      this.showError("email", "יש כבר משתמש עם האימייל הזה.");
    } else if (err.code === "auth/weak-password") {
      this.showError("password", "הסיסמה צריכה להיות לפחות 6 תווים.");
    } else {
      alert("שגיאה ביצירת משתמש חדש. נסי שוב.");
    }
    this.setLoading(false);
  }
}



    bindEvents() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));

        this.emailInput.addEventListener('blur', () => this.validateEmail());
        this.passwordInput.addEventListener('blur', () => this.validatePassword());
        this.emailInput.addEventListener('input', () => this.clearError('email'));
        this.passwordInput.addEventListener('input', () => this.clearError('password'));

        this.emailInput.setAttribute('placeholder', ' ');
        this.passwordInput.setAttribute('placeholder', ' ');



    }

    setupPasswordToggle() {
        if (!this.passwordToggle) return;
        this.passwordToggle.addEventListener('click', () => {
            const type = this.passwordInput.type === 'password' ? 'text' : 'password';
            this.passwordInput.type = type;
            this.passwordToggle.classList.toggle('toggle-visible', type === 'text');
        });
    }

    setupForgotPassword() {
        if (!this.forgotLink) return;

        this.forgotLink.addEventListener("click", async (e) => {
            e.preventDefault();
            await this.handleForgotPassword();
        });
    }

    async handleForgotPassword() {
        const email = this.emailInput.value.trim();

        if (!email) {
            alert("כדי לאפס סיסמה, הזיני קודם את כתובת האימייל שלך.");
            this.emailInput.focus();
            return;
        }

        try {
            await this.sendPasswordResetEmail(this.auth, email);
            alert("נשלח אליך מייל לאיפוס סיסמה. בדקי את תיבת הדואר שלך.");
        } catch (err) {
            console.error("Password reset error:", err);
            if (err.code === "auth/user-not-found") {
                alert("לא נמצא משתמש עם כתובת המייל הזו.");
            } else {
                alert("שגיאה בשליחת מייל לאיפוס סיסמה. נסי שוב מאוחר יותר.");
            }
        }
    }

    setupWellnessEffects() {
        [this.emailInput, this.passwordInput].forEach(input => {
            input.addEventListener('focus', (e) => {
                this.triggerMindfulEffect(e.target.closest('.organic-field'));
            });
            input.addEventListener('blur', (e) => {
                this.resetMindfulEffect(e.target.closest('.organic-field'));
            });
        });
    }

    triggerMindfulEffect(field) {
        const fieldNature = field?.querySelector('.field-nature');
        if (fieldNature) {
            fieldNature.style.animation = 'gentleBreath 3s ease-in-out infinite';
        }
    }

    resetMindfulEffect(field) {
        const fieldNature = field?.querySelector('.field-nature');
        if (fieldNature) {
            fieldNature.style.animation = '';
        }
    }

    validateEmail() {
        const email = this.emailInput.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!email) {
            this.showError('email', 'אנא הזיני כתובת אימייל');
            return false;
        }
        if (!emailRegex.test(email)) {
            this.showError('email', 'כתובת האימייל אינה חוקית');
            return false;
        }

        this.clearError('email');
        return true;
    }

    validatePassword() {
        const password = this.passwordInput.value;
        if (!password) {
            this.showError('password', 'נא להזין סיסמה');
            return false;
        }
        if (password.length < 6) {
            this.showError('password', 'הסיסמה קצרה מדי (לפחות 6 תווים)');
            return false;
        }

        this.clearError('password');
        return true;
    }

    showError(field, message) {
        const organicField = document.getElementById(field)?.closest('.organic-field');
        const errorElement = document.getElementById(`${field}Error`);
        if (organicField && errorElement) {
            organicField.classList.add('error');
            errorElement.textContent = message;
            errorElement.classList.add('show');
        } else {
            alert(message);
        }
    }

    clearError(field) {
        const organicField = document.getElementById(field)?.closest('.organic-field');
        const errorElement = document.getElementById(`${field}Error`);
        if (organicField && errorElement) {
            organicField.classList.remove('error');
            errorElement.classList.remove('show');
            setTimeout(() => {
                errorElement.textContent = '';
            }, 300);
        }
    }

    setLoading(loading) {
        this.submitButton.classList.toggle('loading', loading);
        this.submitButton.disabled = loading;
        this.socialButtons.forEach(button => {
            button.style.pointerEvents = loading ? 'none' : 'auto';
            button.style.opacity = loading ? '0.6' : '1';
        });
    }



        // 🔐 מודאל לאימות דו־שלבי (2FA)
    async runTwoFactorFlow(email) {
        // בסיס ל־API כמו בשרת
        const TWOFA_BASE =
            (location.hostname === "localhost" || location.hostname === "127.0.0.1")
                ? "http://localhost:8787"
                : "https://eco-files.onrender.com";

        // 1) שולחים מייל עם קוד
        try {
            const res = await fetch(`${TWOFA_BASE}/api/auth/send-2fa`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email })
            });

            if (!res.ok) {
                console.error("2FA send failed:", await res.text());
                alert("לא הצלחנו לשלוח קוד אימות למייל. נסי שוב.");
                return false;
            }
        } catch (err) {
            console.error("2FA send error:", err);
            alert("שגיאה בשליחת קוד אימות. בדקי חיבור אינטרנט ונסי שוב.");
            return false;
        }

        // 2) מציגים את המודאל
        const overlay = document.getElementById("twofaOverlay");
        const form = document.getElementById("twofaForm");
        const cancelBtn = document.getElementById("twofaCancel");
        const resendBtn = document.getElementById("twofaResend");
        const errorEl = document.getElementById("twofaError");
        const inputs = Array.from(
            overlay.querySelectorAll(".twofa-digit")
        );

        if (!overlay || !form || !cancelBtn || !inputs.length) {
            console.error("2FA modal elements not found");
            alert("שגיאה בטעינת חלון האימות.");
            return false;
        }

        // איפוס
        inputs.forEach((i) => (i.value = ""));
        errorEl.textContent = "";
        overlay.style.display = "flex";
        inputs[0].focus();

        // תזוזת פוקוס, בהשראת הדוגמה ששלחת
        const handleKeyDown = (e) => {
            if (
                !/^[0-9]{1}$/.test(e.key) &&
                e.key !== "Backspace" &&
                e.key !== "Delete" &&
                e.key !== "Tab"
            ) {
                e.preventDefault();
            }

            if (e.key === "Delete" || e.key === "Backspace") {
                const index = inputs.indexOf(e.target);
                if (index > 0) {
                    inputs[index].value = "";
                    inputs[index - 1].focus();
                }
            }
        };

        const handleInput = (e) => {
            const index = inputs.indexOf(e.target);
            if (e.target.value && index < inputs.length - 1) {
                inputs[index + 1].focus();
            }
        };

        const handleFocus = (e) => e.target.select();

        const handlePaste = (e) => {
            e.preventDefault();
            const text = e.clipboardData.getData("text");
            if (!/^[0-9]{6}$/.test(text)) return;
            const digits = text.split("");
            inputs.forEach((input, index) => (input.value = digits[index] || ""));
        };

        inputs.forEach((input) => {
            input.addEventListener("keydown", handleKeyDown);
            input.addEventListener("input", handleInput);
            input.addEventListener("focus", handleFocus);
            input.addEventListener("paste", handlePaste);
        });

        const cleanup = () => {
            overlay.style.display = "none";
            inputs.forEach((input) => {
                input.removeEventListener("keydown", handleKeyDown);
                input.removeEventListener("input", handleInput);
                input.removeEventListener("focus", handleFocus);
                input.removeEventListener("paste", handlePaste);
            });
            form.removeEventListener("submit", onSubmit);
            cancelBtn.removeEventListener("click", onCancel);
            if (resendBtn) resendBtn.removeEventListener("click", onResend);
        };

        const getCodeFromInputs = () =>
            inputs.map((i) => i.value.trim()).join("");

        const onResend = async () => {
            errorEl.textContent = "";
            inputs.forEach((i) => (i.value = ""));
            inputs[0].focus();
            try {
                const res = await fetch(`${TWOFA_BASE}/api/auth/send-2fa`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email })
                });
                if (!res.ok) {
                    errorEl.textContent = "לא הצלחנו לשלוח מחדש. נסי שוב עוד רגע.";
                }
            } catch (err) {
                errorEl.textContent = "שגיאה בשליחה מחדש. בדקי אינטרנט.";
            }
        };

        return new Promise((resolve) => {
            const onCancel = () => {
                cleanup();
                resolve(false);
            };

            const onSubmit = async (e) => {
                e.preventDefault();
                const code = getCodeFromInputs();
                if (code.length !== 6) {
                    errorEl.textContent = "נא להזין 6 ספרות.";
                    return;
                }

                try {
                    const res = await fetch(`${TWOFA_BASE}/api/auth/verify-2fa`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email, code })
                    });

                    if (!res.ok) {
                        errorEl.textContent = "קוד לא נכון. נסי שוב.";
                        return;
                    }

                    // הצלחה
                    cleanup();
                    resolve(true);
                } catch (err) {
                    console.error("2FA verify error:", err);
                    errorEl.textContent = "שגיאה באימות הקוד. נסי שוב.";
                }
            };

            form.addEventListener("submit", onSubmit);
            cancelBtn.addEventListener("click", onCancel);
            if (resendBtn) resendBtn.addEventListener("click", onResend);
        });
    }




       async handleSubmit(e) {
        e.preventDefault();

        const okEmail = this.validateEmail();
        const okPass = this.validatePassword();
        if (!okEmail || !okPass) return;

        this.setLoading(true);

        const email = this.emailInput.value.trim();
        const password = this.passwordInput.value.trim();

        console.log("=== LOGIN ATTEMPT ===");
        console.log("Email:", email);

        try {
            console.log("Attempting signInWithEmailAndPassword...");
            const userCred = await this.signInWithEmailAndPassword(this.auth, email, password);
            const user = userCred.user;

            // 👇 חובה מייל מאומת לפני כניסה
            if (!user.emailVerified) {
                try {
                    await this.sendEmailVerification(user, {
                        url: "https://danateck.github.io/Eco-Files-FullStack/forms/eco-wellness/",
                        handleCodeInApp: false,
                    });
                } catch (e) {
                    console.warn("Could not re-send verification email:", e);
                }

                alert("עליך לאמת את כתובת האימייל לפני כניסה למערכת. שלחנו שוב מייל אימות, בדקי (כולל ספאם).");
                await this.auth.signOut();
                this.setLoading(false);
                return;
            }

            console.log("Sign in successful:", userCred);
            await this.finishLogin(email);

        } catch (err) {
            const code = err.code || "";
            const msg = err.message || "";

            console.log("Login error code:", code);
            console.log("Login error message:", msg);

            // סיסמה שגויה למשתמש קיים
            if (code === "auth/wrong-password") {
                this.showError("password", "סיסמה שגויה");
                this.passwordInput.focus();
                this.setLoading(false);
                return;
            }

            // משתמש לא קיים / קרדנציאל לא תקין / באג של ספארי => ליצור משתמש חדש + מייל אימות
            if (
                code === "auth/user-not-found" ||
                code === "auth/invalid-credential" ||
                (code === "auth/internal-error" && msg.includes("INVALID_LOGIN_CREDENTIALS"))
            ) {
                try {
                    console.log("No existing user. Creating a new one with email verification.");
                    const cred = await this.createUserWithEmailAndPassword(this.auth, email, password);

                    await this.sendEmailVerification(cred.user, {
                        url: "https://danateck.github.io/Eco-Files-FullStack/forms/eco-wellness/",
                        handleCodeInApp: false,
                    });

                    alert("יצרנו עבורך משתמש חדש ושלחנו מייל לאימות. אחרי שתאשרי את המייל – תוכלי להתחבר עם אותם פרטים.");
                    await this.auth.signOut();
                    this.setLoading(false);
                    return;
                } catch (createErr) {
                    console.error("Create user with verification failed:", createErr);
                    const createCode = createErr.code || "";
                    if (createCode === "auth/email-already-in-use") {
                        this.showError("password", "האימייל כבר קיים במערכת. נסי שוב עם הסיסמה הנכונה.");
                    } else if (createCode === "auth/weak-password") {
                        this.showError("password", "הסיסמה צריכה להיות לפחות 6 תווים.");
                    } else {
                        this.showError("password", "שגיאה ביצירת משתמש חדש. נסי שוב.");
                    }
                    this.setLoading(false);
                    return;
                }
            }

            // כל שגיאה אחרת
            console.error("Login failed (unknown error):", err);
            this.showError("password", "શגિઆ בהתחברות. אנא נסי שוב.");
            this.setLoading(false);
        }
    }





async runTwoFactorFlow(email) {
    const BASE_URL = "https://eco-files.onrender.com";

    // 1. שולחים מייל עם קוד מהשרת
    try {
        const resp = await fetch(`${BASE_URL}/api/auth/send-2fa`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email })
        });

        if (!resp.ok) {
            console.error("send-2fa failed:", await resp.text());
            alert("שגיאה בשליחת קוד אימות. נסי שוב מאוחר יותר.");
            return false;
        }
    } catch (e) {
        console.error("send-2fa fetch error:", e);
        alert("שגיאה בשליחת קוד אימות. נסי שוב מאוחר יותר.");
        return false;
    }

    // 2. פותחים חלון להזנת קוד וממתינים לתשובה
    return await new Promise((resolve) => {
        let modal = document.getElementById("twofa-modal");

        if (!modal) {
            modal = document.createElement("div");
            modal.id = "twofa-modal";
            modal.style.position = "fixed";
            modal.style.inset = "0";
            modal.style.background = "rgba(0,0,0,0.5)";
            modal.style.display = "flex";
            modal.style.alignItems = "center";
            modal.style.justifyContent = "center";
            modal.style.zIndex = "9999";

            modal.innerHTML = `
              <div style="background:#fff; padding:24px; border-radius:16px; max-width:320px; width:100%; box-shadow:0 10px 40px rgba(0,0,0,0.15); text-align:center; direction:rtl;">
                <h3 style="margin-bottom:8px;">אימות דו־שלבי</h3>
                <p style="margin-bottom:16px; font-size:0.9rem; color:#555;">
                  שלחנו אליך קוד אימות לכתובת <br><strong>${email}</strong>
                </p>
                <input id="twofa-code-input" type="text" maxlength="6"
                       style="letter-spacing:0.4em; text-align:center; font-size:1.4rem; padding:8px 12px; border-radius:8px; border:1px solid #ccc; width:100%; box-sizing:border-box;">
                <div id="twofa-error" style="color:#c00; font-size:0.8rem; margin-top:8px; min-height:1em;"></div>
                <div style="margin-top:16px; display:flex; gap:8px; justify-content:space-between;">
                  <button id="twofa-cancel" type="button"
                          style="flex:1; padding:8px 0; border-radius:8px; border:1px solid #ccc; background:#f5f5f5; cursor:pointer;">
                    ביטול
                  </button>
                  <button id="twofa-confirm" type="button"
                          style="flex:1; padding:8px 0; border-radius:8px; border:none; background:#2f855a; color:#fff; cursor:pointer;">
                    אימות
                  </button>
                </div>
              </div>
            `;
            document.body.appendChild(modal);
        } else {
            modal.style.display = "flex";
            const errBox = modal.querySelector("#twofa-error");
            if (errBox) errBox.textContent = "";
            const codeInput = modal.querySelector("#twofa-code-input");
            if (codeInput) codeInput.value = "";
        }

        const codeInput  = modal.querySelector("#twofa-code-input");
        const errorBox   = modal.querySelector("#twofa-error");
        const btnCancel  = modal.querySelector("#twofa-cancel");
        const btnConfirm = modal.querySelector("#twofa-confirm");

        if (codeInput) codeInput.focus();

        const cleanup = () => {
            if (btnCancel)  btnCancel.removeEventListener("click", onCancel);
            if (btnConfirm) btnConfirm.removeEventListener("click", onConfirm);
            if (codeInput)  codeInput.removeEventListener("keydown", onKeyDown);
        };

        const closeModal = () => {
            modal.style.display = "none";
        };

        const onCancel = () => {
            cleanup();
            closeModal();
            resolve(false);
        };

        const onKeyDown = (e) => {
            if (e.key === "Enter") {
                onConfirm();
            }
        };

        const onConfirm = async () => {
            const code = codeInput.value.trim();
            if (code.length !== 6) {
                if (errorBox) errorBox.textContent = "הקוד חייב להיות באורך 6 ספרות.";
                return;
            }

            try {
                const resp = await fetch(`${BASE_URL}/api/auth/verify-2fa`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, code })
                });

                if (!resp.ok) {
                    let data = {};
                    try { data = await resp.json(); } catch {}
                    console.error("verify-2fa failed:", data);
                    if (errorBox) errorBox.textContent = "הקוד אינו תקין. נסי שוב.";
                    return;
                }
            } catch (e) {
                console.error("verify-2fa fetch error:", e);
                if (errorBox) errorBox.textContent = "שגיאה באימות הקוד. נסי שוב.";
                return;
            }

            cleanup();
            closeModal();
            resolve(true);
        };

        if (btnCancel)  btnCancel.addEventListener("click", onCancel);
        if (btnConfirm) btnConfirm.addEventListener("click", onConfirm);
        if (codeInput)  codeInput.addEventListener("keydown", onKeyDown);
    });
}




     async finishLogin(email, isNewUser = false) {
        try {
            console.log("=== FINISH LOGIN START ===");
            console.log("Email:", email);
            console.log("Is new user:", isNewUser);
            
            // CRITICAL: Set user in session first
            await setCurrentUser(email);
            
            // Verify it was set
           const storedUser = this.auth?.currentUser?.email?.toLowerCase() ?? "";

            console.log("Stored user after setCurrentUser:", storedUser);

            // Load or create user data in Firestore
            console.log("Loading user data from Firestore...");
            let userData = await loadUserDataFromFirestore(email);
            console.log("User data loaded:", userData);

            if (!userData) {
                console.log("Creating new user data in Firestore");
                userData = {
                    email: email,
                    docs: [],
                    createdAt: new Date().toISOString()
                };
                const saveResult = await saveUserDataToFirestore(email, userData);
                console.log("User data save result:", saveResult);
            }

            // Show success animation
            console.log("Calling showHarmonySuccess...");
            this.showHarmonySuccess();

            // IMPORTANT: Wait for animation, then redirect
            console.log("Setting timeout for redirect...");
setTimeout(() => {
  onAuthStateChanged(this.auth, (user) => {
    if (user) {
      // Dashboard (repo root)
      window.location.replace("/Eco-Files-FullStack/");
    } else {
      // Login page (folder with index.html)
      window.location.replace("/Eco-Files-FullStack/forms/eco-wellness/");
    }
  });
}, 1500);


            
        } catch (err) {
            console.error("=== ERROR IN FINISH LOGIN ===");
            console.error("Error details:", err);
            this.setLoading(false);
            alert("שגיאה בהתחברות. אנא נסי שוב.");
        }
    }
    showHarmonySuccess() {
        this.form.style.transform = 'scale(0.95)';
        this.form.style.opacity = '0';

        setTimeout(() => {
            this.form.style.display = 'none';
            document
                .querySelectorAll('.natural-social, .nurture-signup, .balance-divider')
                .forEach(el => el?.classList.add('hidden'));

            this.successMessage.classList.add('show');
        }, 300);
    }

    setupGoogleButton() {
        const googleBtn = document.querySelector(".earth-social");
        if (!googleBtn) return;

        googleBtn.addEventListener("click", async () => {
            try {
                this.setLoading(true);

                const result = await this.signInWithPopup(this.auth, this.googleProvider);
                const user = result.user;

                // Check if user data exists in Firestore
                let userData = await loadUserDataFromFirestore(user.email);

                // Create user data if doesn't exist
                if (!userData) {
                    userData = {
                        email: user.email,
                        displayName: user.displayName || "",
                        photoURL: user.photoURL || "",
                        docs: [],
                        createdAt: new Date().toISOString(),
                        loginMethod: "google"
                    };
                    await saveUserDataToFirestore(user.email, userData);
                }

                await setCurrentUser(user.email);

                this.showHarmonySuccess();
                setTimeout(() => {
  window.location.replace("/Eco-Files-FullStack/");
}, 1500);


            } catch (err) {
                console.error("Google Sign-In Error:", err);
                alert("שגיאה בהתחברות עם Google. נסי שוב.");
            } finally {
                this.setLoading(false);
            }
        });
    }
}

// Animation keyframes
if (!document.querySelector('#wellness-keyframes')) {
    const style = document.createElement('style');
    style.id = 'wellness-keyframes';
    style.textContent = `
        @keyframes gentleBreath {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.01); }
        }
    `;
    document.head.appendChild(style);
}

let loginFormInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    // Only initialize once
    if (!loginFormInstance) {
        console.log("📝 Initializing login form...");
        loginFormInstance = new EcoWellnessLoginForm();
    } else {
        console.log("⚠️ Login form already initialized, skipping");
    }
});





async function updateTwoFactorSetting(enabled) {
  const email = getCurrentUser(); // כמו בשאר המערכת
  let userData = await loadUserDataFromFirestore(email);
  if (!userData) userData = { email, docs: [], createdAt: new Date().toISOString() };

  userData.twoFactorEnabled = enabled;
  await saveUserDataToFirestore(email, userData);
}
