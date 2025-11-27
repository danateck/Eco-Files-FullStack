// scriptLogin.js
// Cloud Firestore Version - All data stored in Firebase Firestore

import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, setPersistence, browserLocalPersistence }
  from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";




  function showAlert(title, type = "info") {
  const icons = {
    success: "✅",
    error: "⛔",
    warning: "⚠️",
    info: "ℹ️"
  };

  const root = document.getElementById("eco-alert-root");

  const box = document.createElement("div");
  box.className = `eco-alert eco-${type}`;
  box.innerHTML = `
    <div class="eco-alert-icon">${icons[type]}</div>
    <div class="eco-alert-title">${title}</div>
  `;

  root.appendChild(box);

  setTimeout(() => {
    box.style.opacity = "0";
    box.style.transition = "opacity 0.3s";
    setTimeout(() => box.remove(), 300);
  }, 2500);
}




function showConfirm(message, onYes) {
  const overlay = document.getElementById("eco-confirm-overlay");
  const msg = document.getElementById("eco-confirm-message");
  const btnYes = document.getElementById("eco-confirm-yes");
  const btnNo = document.getElementById("eco-confirm-no");

  msg.textContent = message;
  overlay.style.display = "flex";

  // ביטול קודם כדי לא ליצור כפילויות
  btnYes.onclick = null;
  btnNo.onclick = null;
  overlay.onclick = null;

  btnYes.onclick = () => {
    overlay.style.display = "none";
    if (typeof onYes === "function") onYes();
  };

  btnNo.onclick = () => {
    overlay.style.display = "none";
  };

  // לחיצה בחוץ → ביטול
  overlay.onclick = (e) => {
    if (e.target === overlay) overlay.style.display = "none";
  };
}



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
      url: "https://danateck.github.io/DanDanLon/forms/eco-wellness/",
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
            showAlert("נשלח אליך מייל לאיפוס סיסמה. בדקי את תיבת הדואר שלך.");
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
        // הצגת מסך ה־OTP החדש
document.querySelector(".login-container").style.display = "none";
const otpScreen = document.getElementById("otpContainer");
otpScreen.style.display = "block";

const inputs = Array.from(document.querySelectorAll(".otp-input"));
const form = document.getElementById("otp-form");
const resend = document.getElementById("otpResend");

inputs.forEach((input, idx) => {
    input.addEventListener("input", () => {
        if (input.value && idx < inputs.length - 1) {
            inputs[idx + 1].focus();
        }
    });

    input.addEventListener("keydown", (e) => {
        if (e.key === "Backspace" && idx > 0) {
            inputs[idx - 1].focus();
        }
    });
});

// Resend
resend.addEventListener("click", async (e) => {
    e.preventDefault();
    await fetch(`${TWOFA_BASE}/api/auth/send-2fa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
    });
    alert("נשלח שוב ✔");
});

// Verify
return new Promise((resolve) => {
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const code = inputs.map(i => i.value).join("");

        if (code.length !== 4) {
            alert("נא להזין 4 ספרות");
            return;
        }

        const res = await fetch(`${TWOFA_BASE}/api/auth/verify-2fa`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, code })
        });

        if (!res.ok) {
            alert("קוד שגוי");
            return;
        }

        resolve(true);
    });
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
            // 1) ניסיון התחברות רגיל
            console.log("Attempting signInWithEmailAndPassword...");
            const userCred = await this.signInWithEmailAndPassword(this.auth, email, password);
            const user = userCred.user;

            console.log("Sign in successful:", user);

            // 2) חובה שמייל יהיה מאומת לפני שנכנסים למערכת
            if (!user.emailVerified) {
                try {
                    // שולחים שוב מייל אימות, עם חזרה לעמוד הלוגין שלך
                    await this.sendEmailVerification(user, {
                        url: "https://danateck.github.io/DanDanLon/forms/eco-wellness/",
                        handleCodeInApp: false,
                    });
                } catch (e) {
                    console.warn("Could not re-send verification email:", e);
                }

                alert("עליך לאמת את כתובת האימייל לפני כניסה למערכת. שלחנו אלייך מייל אימות, בדקי (כולל ספאם).");
                await this.auth.signOut();
                this.setLoading(false);
                return;
            }

            // 3) אם מאומת – ממשיכים כרגיל
           // 3) אם מאומת – ממשיכים כרגיל, תמיד עם מייל במצב lowercase
const emailKey = email.trim().toLowerCase();
await this.finishLogin(emailKey);


        } catch (err) {
            const code = err.code || "";
            const msg = err.message || "";

            console.log("Login error code:", code);
            console.log("Login error message:", msg);

            // 🔴 סיסמה שגויה למשתמש קיים
            if (code === "auth/wrong-password") {
                this.showError("password", "סיסמה שגויה");
                this.passwordInput.focus();
                this.setLoading(false);
                return;
            }

            // 🔴 משתמש לא קיים / קרדנציאל לא תקין / באג של ספארי
            if (
                code === "auth/user-not-found" ||
                code === "auth/invalid-credential" ||
                (code === "auth/internal-error" && msg.includes("INVALID_LOGIN_CREDENTIALS"))
            ) {
                try {
                    console.log("User not found / invalid, creating new user with email verification...");
                    const cred = await this.createUserWithEmailAndPassword(this.auth, email, password);

                    // שולחים מייל אימות למשתמש החדש
                    await this.sendEmailVerification(cred.user, {
                        url: "https://danateck.github.io/DanDanLon/forms/eco-wellness/",
                        handleCodeInApp: false,
                    });

                    alert(
                        "יצרנו עבורך משתמש חדש ושלחנו מייל אימות. אחרי שתאשרי את המייל – תוכלי להתחבר עם אותם פרטים."
                    );

                    // ננתק מהמערכת עד האימות
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

            // 🔴 שגיאה אחרת
            console.error("Login failed (unknown error):", err);
            this.showError("password", "שגיאה בהתחברות. אנא נסי שוב.");
            this.setLoading(false);
        }
    }









async finishLogin(email, isNewUser = false) {
  try {
    // נוודא שתמיד עובדים עם מייל מנורמל
    const emailKey = (email || "").trim().toLowerCase();

    console.log("=== FINISH LOGIN START ===");
    console.log("Email (raw):", email);
    console.log("Email (key):", emailKey);
    console.log("Is new user:", isNewUser);

    // לשים את המשתמש הנוכחי בסשן (כמו שהיה לך)
    await setCurrentUser(emailKey);

    // טוענים פרטי משתמש מה־Firestore
    console.log("Loading user data from Firestore...");
    let userData = await loadUserDataFromFirestore(emailKey);
    console.log("User data loaded:", userData);

    if (!userData) {
      console.log("Creating new user data in Firestore");
      userData = {
        email: emailKey,
        docs: [],
        createdAt: new Date().toISOString(),
      };
      await saveUserDataToFirestore(emailKey, userData);
    }

       // 🔐 אם אימות דו־שלבי מופעל – מריצים את זרימת ה־2FA במייל לפני שממשיכים
    if (userData.twoFactorEnabled) {
        const verified = await this.runTwoFactorFlow(emailKey);
        if (!verified) {
            await this.auth.signOut();
            return;
        }
    } else {
      console.log("2FA כבוי עבור המשתמש הזה, ממשיכים כרגיל.");
    }



    // אנימציית הצלחה
    console.log("Calling showHarmonySuccess...");
    this.showHarmonySuccess();

    // אחרי האנימציה – רידיירקט לדשבורד / לוגין (כמו שהיה)
    console.log("Setting timeout for redirect...");
    setTimeout(() => {
      onAuthStateChanged(this.auth, (user) => {
        if (user) {
          // Dashboard (repo root)
          window.location.replace("/DanDanLon/");
        } else {
          // Login page (folder with index.html)
          window.location.replace("/DanDanLon/forms/eco-wellness/");
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














async runFirebasePhone2FA(email) {
    try {
        console.log('📱 Starting Firebase Phone 2FA');
        
        // טוען נתונים
        const userData = await loadUserDataFromFirestore(email);
        let phoneNumber = userData?.phoneNumber;

        // אם אין מספר - בקש
        if (!phoneNumber) {
            phoneNumber = await this.requestPhoneNumber();
            if (!phoneNumber) return false;
            
            // שמור ב-Firestore
            await saveUserDataToFirestore(email, {
                ...userData,
                phoneNumber: phoneNumber
            });
        }

        // שלח SMS
        await window.firebasePhone2FA.sendVerificationCode(phoneNumber);
        
        // אמת קוד
        const verified = await this.showPhoneVerifyModal(phoneNumber);
        return verified;

    } catch (err) {
        console.error('❌ Phone 2FA error:', err);
        alert(err.message);
        return false;
    }
}

async requestPhoneNumber() {
    return new Promise((resolve) => {
        const modal = document.getElementById('phoneSetupModal');
        const form = document.getElementById('phoneSetupForm');
        const input = document.getElementById('phoneInput');
        const errorDiv = document.getElementById('phoneError');
        const skipBtn = document.getElementById('phoneSkip');

        modal.style.display = 'flex';
        input.value = '';
        errorDiv.textContent = '';

        form.onsubmit = async (e) => {
            e.preventDefault();
            const phone = input.value.trim();
            
            if (!phone) {
                errorDiv.textContent = 'נא להזין מספר טלפון';
                return;
            }

            const normalized = window.firebasePhone2FA.normalizePhone(phone);
            
            if (!window.firebasePhone2FA.isValidPhone(normalized)) {
                errorDiv.textContent = 'מספר טלפון לא תקין';
                return;
            }

            modal.style.display = 'none';
            resolve(normalized);
        };

        skipBtn.onclick = () => {
            modal.style.display = 'none';
            resolve(null);
        };
    });
}

async showPhoneVerifyModal(phoneNumber) {
    return new Promise((resolve) => {
        const modal = document.getElementById('phoneVerifyModal');
        const form = document.getElementById('phoneVerifyForm');
        const inputs = modal.querySelectorAll('.twofa-digit');
        const errorDiv = document.getElementById('verifyError');
        const cancelBtn = document.getElementById('verifyCancel');
        const resendBtn = document.getElementById('phoneResend');
        const phoneDisplay = document.getElementById('verifyPhoneDisplay');

        // הצג מספר מוסתר
        const masked = phoneNumber.replace(/(\+972)(\d{2})(\d{3})(\d{4})/, '$1-$2-XXX-$4');
        phoneDisplay.textContent = masked;

        modal.style.display = 'flex';
        inputs.forEach(inp => inp.value = '');
        errorDiv.textContent = '';
        inputs[0].focus();

        // ניווט בין שדות
        inputs.forEach((inp, idx) => {
            inp.oninput = (e) => {
                if (e.target.value.length === 1 && idx < inputs.length - 1) {
                    inputs[idx + 1].focus();
                }
            };
            inp.onkeydown = (e) => {
                if (e.key === 'Backspace' && !e.target.value && idx > 0) {
                    inputs[idx - 1].focus();
                }
            };
        });

        form.onsubmit = async (e) => {
            e.preventDefault();
            const code = Array.from(inputs).map(i => i.value).join('');
            
            if (code.length !== 6) {
                errorDiv.textContent = 'נא להזין 6 ספרות';
                return;
            }

            try {
                await window.firebasePhone2FA.verifyCode(code);
                console.log('✅ Verified!');
                modal.style.display = 'none';
                resolve(true);
            } catch (err) {
                errorDiv.textContent = err.message;
                inputs.forEach(inp => {
                    inp.value = '';
                    inp.classList.add('error');
                });
                inputs[0].focus();
                setTimeout(() => {
                    inputs.forEach(inp => inp.classList.remove('error'));
                }, 500);
            }
        };

        cancelBtn.onclick = () => {
            modal.style.display = 'none';
            resolve(false);
        };

        resendBtn.onclick = async () => {
            try {
                await window.firebasePhone2FA.sendVerificationCode(phoneNumber);
                alert('קוד חדש נשלח!');
                inputs.forEach(inp => inp.value = '');
                errorDiv.textContent = '';
                inputs[0].focus();
            } catch (err) {
                alert(err.message);
            }
        };
    });
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

    /**
     * מריץ זרימת 2FA - שולח קוד למייל ומציג מודל לאימות
     * @param {string} email - כתובת המייל של המשתמש
     * @returns {Promise<boolean>} - true אם האימות עבר בהצלחה, false אם לא
     */
    async runTwoFactorFlow(email) {
        return new Promise(async (resolve, reject) => {
            try {
                console.log("🔐 Starting 2FA flow for:", email);

                // שליחת קוד למייל דרך השרת
                console.log("📤 Sending request to:", 'https://eco-files.onrender.com/api/auth/send-2fa'
);
                
                const sendResponse = await fetch('https://eco-files.onrender.com/api/auth/send-2fa'
, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email })
                }).catch(err => {
                    console.error("❌ Fetch error:", err);
                    throw new Error(`Network error: ${err.message}`);
                });

                console.log("📥 Response status:", sendResponse.status);
                
                if (!sendResponse.ok) {
                    const errorText = await sendResponse.text();
                    console.error("❌ Server error:", errorText);
                    throw new Error(`Server error: ${sendResponse.status} - ${errorText}`);
                }

                const responseData = await sendResponse.json();
console.log("✅ 2FA code generated on server:", responseData);

const code = responseData.code;
if (!code) {
  throw new Error("Server did not return 2FA code");
}

// 📧 שליחת המייל דרך EmailJS
try {
  await emailjs.send(
    "service_q88zsbi",    // להחליף
    "template_swvlrtd",   // להחליף
    {
      to_email: email,
      code: code,
    }
  );
  console.log("📧 2FA email sent via EmailJS");
} catch (e) {
  console.error("❌ EmailJS error:", e);
  alert("שגיאה בשליחת המייל עם קוד האימות. נסי שוב.");
  return resolve(false);
}


                // הצגת המודל
                const overlay = document.getElementById('twofaOverlay');
const form = document.getElementById('twofaForm');
const inputs = overlay.querySelectorAll('.twofa-digit');

                const errorDiv = document.getElementById('twofaError');
                const cancelBtn = document.getElementById('twofaCancel');
                const resendBtn = document.getElementById('twofaResend');

                if (!overlay) {
                    console.error("❌ twofaOverlay element not found!");
                    throw new Error("2FA modal not found in DOM");
                }

                overlay.style.display = 'flex';

                // ניקוי שדות קלט
                inputs.forEach(input => {
                    input.value = '';
                    input.disabled = false;
                });
                errorDiv.textContent = '';
                inputs[0].focus();

                // טיפול בניווט בין השדות
                inputs.forEach((input, index) => {
                    input.addEventListener('input', (e) => {
                        if (e.target.value.length === 1 && index < inputs.length - 1) {
                            inputs[index + 1].focus();
                        }
                    });

                    input.addEventListener('keydown', (e) => {
                        if (e.key === 'Backspace' && !e.target.value && index > 0) {
                            inputs[index - 1].focus();
                        }
                    });
                });

                // טיפול בשליחת הטופס
                const submitHandler = async (e) => {
                    e.preventDefault();
                    
                    const enteredCode = Array.from(inputs).map(i => i.value).join('');
                    
                    if (enteredCode.length !== 6) {
                        errorDiv.textContent = 'נא להזין 6 ספרות';
                        return;
                    }

                    // אימות הקוד מול השרת
                    try {
                        const verifyResponse = await fetch('https://eco-files.onrender.com/api/auth/verify-2fa'
, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email, code: enteredCode })
                        });

                        if (verifyResponse.ok) {
                            console.log("✅ 2FA code verified successfully");
                            overlay.style.display = 'none';
                            cleanup();
                            resolve(true);
                        } else {
                            errorDiv.textContent = 'קוד שגוי, נסי שוב';
                            inputs.forEach(input => {
                                input.value = '';
                                input.classList.add('error');
                            });
                            inputs[0].focus();
                            
                            setTimeout(() => {
                                inputs.forEach(input => input.classList.remove('error'));
                            }, 500);
                        }
                    } catch (err) {
                        console.error('Error verifying 2FA code:', err);
                        errorDiv.textContent = 'שגיאה באימות הקוד';
                    }
                };

                // טיפול בביטול
                const cancelHandler = () => {
                    console.log("⛔ 2FA cancelled by user");
                    overlay.style.display = 'none';
                    cleanup();
                    resolve(false);
                };

                // טיפול בשליחה מחדש
                const resendHandler = async () => {
  try {
    console.log("🔐 Resending 2FA code");
    
    const response = await fetch('https://eco-files.onrender.com/api/auth/send-2fa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    if (!response.ok) {
      alert('שגיאה בשליחת הקוד מחדש');
      return;
    }

    const data = await response.json();
    const newCode = data.code;

    await emailjs.send(
      "service_q88zsbi",
      "template_swvlrtd",
      {
        to_email: email,
        code: newCode,
      }
    );

    alert('הקוד נשלח שוב למייל שלך');
    inputs.forEach(input => input.value = '');
    errorDiv.textContent = '';
    inputs[0].focus();
  } catch (err) {
    console.error('Error resending 2FA code:', err);
    alert('שגיאה בשליחת הקוד מחדש');
  }
};


                // הוספת מאזינים
                form.addEventListener('submit', submitHandler);
                cancelBtn.addEventListener('click', cancelHandler);
                resendBtn.addEventListener('click', resendHandler);

                // פונקציית ניקוי
                function cleanup() {
                    form.removeEventListener('submit', submitHandler);
                    cancelBtn.removeEventListener('click', cancelHandler);
                    resendBtn.removeEventListener('click', resendHandler);
                }

            } catch (err) {
                console.error("❌ Error in 2FA flow:", err);
                console.error("Error stack:", err.stack);
                
                // הצגת שגיאה ידידותית למשתמש
                let errorMessage = "שגיאה באימות דו-שלבי.";
                
                if (err.message.includes("Network error")) {
                    errorMessage = "לא ניתן להתחבר לשרת. בדקי את החיבור לאינטרנט.";
                } else if (err.message.includes("Server error")) {
                    errorMessage = "שגיאה בשרת. נסי שוב מאוחר יותר.";
                } else if (err.message.includes("modal not found")) {
                    errorMessage = "שגיאה בטעינת מסך האימות.";
                }
                
                alert(errorMessage + "\n\nפרטים טכניים: " + err.message);
                resolve(false);
            }
        });
    }

    setupGoogleButton() {
    const googleBtn = document.querySelector(".earth-social");
    if (!googleBtn) return;

    googleBtn.addEventListener("click", async () => {
    try {
        this.setLoading(true);

        const result = await this.signInWithPopup(this.auth, this.googleProvider);
        const user = result.user;

        // נרמל אימייל למפתח ב־Firestore
        const emailKey = (user.email || "").trim().toLowerCase();

        // טוענים פרטי משתמש מה־Firestore
        let userData = await loadUserDataFromFirestore(emailKey);

        // אם אין – ניצור רשומה חדשה
        if (!userData) {
            userData = {
                email: emailKey,
                displayName: user.displayName || "",
                photoURL: user.photoURL || "",
                docs: [],
                createdAt: new Date().toISOString(),
                loginMethod: "google",
            };
            await saveUserDataToFirestore(emailKey, userData);
        }

        // 🔐 אם 2FA דולק למשתמש הזה – מריצים את זרימת הקוד
        if (userData.twoFactorEnabled) {
            console.log("🔐 twoFactorEnabled = true (Google), running 2FA...");
            const ok = await this.runTwoFactorFlow(emailKey);

            if (!ok) {
                console.log("⛔ 2FA לא עבר / בוטל – לא נכנסים לדשבורד (Google)");
                await this.auth.signOut();
                this.setLoading(false);
                return;
            }
        } else {
            console.log("2FA כבוי עבור המשתמש הזה (Google), ממשיכים כרגיל.");
        }

        // שומרים משתמש נוכחי + אנימציה + רידיירקט
        await setCurrentUser(emailKey);
        this.showHarmonySuccess();
        setTimeout(() => {
            window.location.replace("/DanDanLon/");
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
  // לוקחים את המשתמש שמחובר כרגע מפיירבייס
  const user = window.auth?.currentUser;

  if (!user || !user.email) {
    console.error("❌ אין משתמש מחובר, אי אפשר לעדכן twoFactorEnabled");
    return;
  }

  const email = user.email.toLowerCase();

  let userData = await loadUserDataFromFirestore(email);
  if (!userData) {
    userData = {
      email,
      docs: [],
      createdAt: new Date().toISOString(),
    };
  }

  userData.twoFactorEnabled = enabled;
  await saveUserDataToFirestore(email, userData);

  console.log("✅ twoFactorEnabled עודכן ל:", enabled);
}
