// ============================================
// 2FA with Firebase Phone Authentication
// ============================================

/**
 * הגדרת Firebase Phone Auth (חינמי לגמרי!)
 * 
 * צעדים:
 * 1. Firebase Console → Authentication → Sign-in method
 * 2. Enable "Phone" 
 * 3. זהו! Firebase מטפל בהכל!
 * 
 * יתרונות:
 * - ✅ חינמי לחלוטין (ללא הגבלה)
 * - ✅ עובד בישראל
 * - ✅ אין צורך ב-API keys חיצוניים
 * - ✅ Firebase מטפל באימות ובאבטחה
 * - ✅ תמיכה ב-reCAPTCHA אוטומטית
 */

import { 
    getAuth, 
    RecaptchaVerifier, 
    signInWithPhoneNumber,
    PhoneAuthProvider,
    linkWithCredential
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

class FirebasePhone2FA {
    constructor() {
        this.auth = getAuth();
        this.recaptchaVerifier = null;
        this.confirmationResult = null;
        
        console.log('✅ Firebase Phone 2FA initialized');
    }

    /**
     * מאתחל reCAPTCHA (חובה לפני שליחת SMS)
     * @param {string} containerId - ID של אלמנט ה-reCAPTCHA
     */
    initRecaptcha(containerId = 'recaptcha-container') {
        if (this.recaptchaVerifier) {
            console.log('♻️ reCAPTCHA already initialized');
            return;
        }

        try {
            this.recaptchaVerifier = new RecaptchaVerifier(this.auth, containerId, {
                'size': 'invisible',
                'callback': (response) => {
                    console.log('✅ reCAPTCHA verified');
                },
                'expired-callback': () => {
                    console.log('⚠️ reCAPTCHA expired');
                }
            });

            console.log('✅ reCAPTCHA initialized');
        } catch (error) {
            console.error('❌ reCAPTCHA initialization failed:', error);
            throw error;
        }
    }

    /**
     * שולח SMS עם קוד אימות
     * @param {string} phoneNumber - מספר טלפון בפורמט +972501234567
     * @returns {Promise}
     */
    async sendVerificationCode(phoneNumber) {
        try {
            console.log('📱 Sending verification code to:', phoneNumber);

            // נרמול מספר
            const normalizedPhone = this.normalizePhone(phoneNumber);
            
            if (!this.isValidPhone(normalizedPhone)) {
                throw new Error('מספר טלפון לא תקין');
            }

            // אתחול reCAPTCHA אם עדיין לא
            if (!this.recaptchaVerifier) {
                this.initRecaptcha();
            }

            // שליחת SMS דרך Firebase
            this.confirmationResult = await signInWithPhoneNumber(
                this.auth, 
                normalizedPhone, 
                this.recaptchaVerifier
            );

            console.log('✅ Verification code sent successfully');
            return true;

        } catch (error) {
            console.error('❌ Error sending verification code:', error);
            
            // הודעות שגיאה ידידותיות
            if (error.code === 'auth/invalid-phone-number') {
                throw new Error('מספר טלפון לא תקין');
            } else if (error.code === 'auth/too-many-requests') {
                throw new Error('יותר מדי ניסיונות. נסי שוב מאוחר יותר.');
            } else if (error.code === 'auth/quota-exceeded') {
                throw new Error('חרגת ממכסת ה-SMS היומית');
            }
            
            throw error;
        }
    }

    /**
     * מאמת את הקוד שהמשתמש הזין
     * @param {string} code - קוד בן 6 ספרות
     * @returns {Promise<boolean>}
     */
    async verifyCode(code) {
        try {
            if (!this.confirmationResult) {
                throw new Error('לא נשלח קוד אימות. שלחי קוד קודם.');
            }

            console.log('🔐 Verifying code:', code);

            // אימות הקוד מול Firebase
            const result = await this.confirmationResult.confirm(code);
            
            console.log('✅ Code verified successfully');
            console.log('User:', result.user);

            return true;

        } catch (error) {
            console.error('❌ Error verifying code:', error);

            if (error.code === 'auth/invalid-verification-code') {
                throw new Error('קוד שגוי. נסי שוב.');
            } else if (error.code === 'auth/code-expired') {
                throw new Error('הקוד פג תוקף. בקשי קוד חדש.');
            }

            throw error;
        }
    }

    /**
     * קישור מספר טלפון למשתמש קיים (לשמירת מספר)
     * @param {string} phoneNumber 
     * @returns {Promise}
     */
    async linkPhoneToUser(phoneNumber) {
        try {
            const user = this.auth.currentUser;
            
            if (!user) {
                throw new Error('אין משתמש מחובר');
            }

            console.log('🔗 Linking phone to user:', user.email);

            // שליחת קוד
            await this.sendVerificationCode(phoneNumber);

            // מחזירים Promise שצריך לפתור עם הקוד
            return {
                confirm: async (code) => {
                    const credential = PhoneAuthProvider.credential(
                        this.confirmationResult.verificationId,
                        code
                    );
                    await linkWithCredential(user, credential);
                    console.log('✅ Phone linked to user');
                    return true;
                }
            };

        } catch (error) {
            console.error('❌ Error linking phone:', error);
            throw error;
        }
    }

    /**
     * נרמול מספר טלפון
     * @param {string} phone 
     * @returns {string}
     */
    normalizePhone(phone) {
        // הסרת רווחים ומקפים
        let cleaned = phone.replace(/[\s-]/g, '');
        
        // אם מתחיל ב-0, החלף ב-+972
        if (cleaned.startsWith('0')) {
            cleaned = '+972' + cleaned.substring(1);
        }
        
        // אם לא מתחיל ב-+, הוסף +972
        if (!cleaned.startsWith('+')) {
            cleaned = '+972' + cleaned;
        }

        return cleaned;
    }

    /**
     * בדיקת תקינות מספר
     * @param {string} phone 
     * @returns {boolean}
     */
    isValidPhone(phone) {
        // מספר ישראלי: +972 ואחריו 9-10 ספרות
        return /^\+972\d{9,10}$/.test(phone);
    }

    /**
     * ניקוי - לשימוש בין ניסיונות
     */
    reset() {
        this.confirmationResult = null;
        if (this.recaptchaVerifier) {
            this.recaptchaVerifier.clear();
            this.recaptchaVerifier = null;
        }
        console.log('🔄 Firebase Phone 2FA reset');
    }
}

// יצירת instance גלובלי
window.firebasePhone2FA = new FirebasePhone2FA();

console.log('✅ Firebase Phone 2FA loaded');

export default FirebasePhone2FA;
