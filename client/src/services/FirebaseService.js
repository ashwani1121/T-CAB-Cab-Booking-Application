import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, deleteToken } from 'firebase/messaging';
import { getDatabase } from 'firebase/database';
const firebaseConfig = {
    apiKey            : import.meta.env.VITE_API_KEY,
    authDomain        : import.meta.env.VITE_AUTH_DOMAIN,
    databaseURL       : import.meta.env.VITE_DATABASE_URL,
    projectId         : import.meta.env.VITE_PROJECT_ID,
    storageBucket     : import.meta.env.VITE_STORAGE_BUCKET,
    messagingSenderId : import.meta.env.VITE_SENDER_ID,
    appId             : import.meta.env.VITE_APP_ID,
    measurementId     : import.meta.env.VITE_MEASUREMENT_ID
};
const app       = initializeApp(firebaseConfig);
const messaging = getMessaging(app);
const VAPID_KEY = import.meta.env.VITE_VAPID_KEY;

// Enhanced token management with smarter caching
class FCMTokenManager{
    constructor(){
        this.tokenCache        = null;
        this.lastValidation    = null;
        this.isGenerating      = false;
        this.generationPromise = null; // Track ongoing generation
        this.maxRetries        = 3;
        this.retryDelay        = 1000;
    }

    // Check if stored token is valid and fresh
    isTokenValid(){
        try{
            const tokenData = localStorage.getItem('fcmTokenData');
            if(!tokenData) return false;
            const { token, generated_at, validated_at } = JSON.parse(tokenData);
            if(!token) return false;
            const now           = Date.now();
            const tokenAge      = now - generated_at;
            const lastValidated = validated_at || generated_at;
            const validationAge = now - lastValidated;
            // Token is valid if:
            // 1. Less than 6 hours old (fresh), OR
            // 2. Less than 3 days old AND validated within last 30 minutes
            return (tokenAge < 6 * 60 * 60 * 1000) || (tokenAge < 3 * 24 * 60 * 60 * 1000 && validationAge < 30 * 60 * 1000);
        }catch{
            return false;
        }
    }

    // Get cached token if valid, otherwise generate new one
    async getValidToken(forceNew = false){
        // If already generating, return the existing promise
        if(this.isGenerating && this.generationPromise){
            console.log('Waiting for ongoing token generation...');
            return this.generationPromise;
        }
        // Check for valid cached token first (unless forced)
        if(!forceNew && this.isTokenValid()){
            const tokenData = JSON.parse(localStorage.getItem('fcmTokenData'));
            this.tokenCache = tokenData.token;
            console.log('✅ Using valid cached FCM token');
            return this.tokenCache;
        }
        // Check if we have a token but it's just old (not invalid)
        if(!forceNew){
            const existingToken = localStorage.getItem('fcmToken');
            if(existingToken){
                console.log('⚡ Using existing token (background refresh will happen)');
                // Start background refresh but return existing token
                this.backgroundRefreshToken();
                return existingToken;
            }
        }
        return this.generateNewToken();
    }

    // Background token refresh without blocking UI
    async backgroundRefreshToken(){
        try{
            console.log('🔄 Background token refresh started...');
            const newToken = await this.generateNewToken();
            if(newToken){
                console.log('✅ Background token refresh completed');
            }
        }catch(error){
            console.warn('⚠️ Background token refresh failed:', error);
        }
    }

    // Generate a completely fresh token
    async generateNewToken(){
        if(this.isGenerating && this.generationPromise){
            return this.generationPromise;
        }
        this.isGenerating = true;
        console.log('🔧 Generating fresh FCM token...');
        // Create and store the generation promise
        this.generationPromise = this._performTokenGeneration();
        try{
            const result = await this.generationPromise;
            return result;
        }finally{
            this.isGenerating      = false;
            this.generationPromise = null;
        }
    }

    async _performTokenGeneration(){
        try{
            // Step 1: Ensure service worker is ready (don't cleanup existing token yet)
            const registration = await this.ensureServiceWorker();

            // Step 2: Request permission
            const permission = await this.requestNotificationPermission();
            if (permission !== 'granted') {
                throw new Error('Notification permission denied');
            }

            // Step 3: Generate new token with retry logic
            const token = await this.generateTokenWithRetry(registration);
            if(token){
                // Only cleanup previous token AFTER we have a new one
                await this.cleanupPreviousToken(token);
                this.cacheToken(token);
                console.log('✅ Fresh FCM token generated successfully');
                return token;
            }
            throw new Error('Failed to generate FCM token');
        }catch(error){
            console.error('❌ Error generating FCM token:', error);
            return null;
        }
    }

    // Clean up previous token only if we have a new one
    async cleanupPreviousToken(newToken){
        try{
            const oldToken = localStorage.getItem('fcmToken');
            if(oldToken && oldToken !== newToken){
                // Only delete if it's actually different
                await deleteToken(messaging);
                console.log('🧹 Cleaned up old token');
            }
        }catch(error){
            console.warn('⚠️ Could not delete previous token:', error);
        }
    }

    // Ensure service worker is properly registered and ready
    async ensureServiceWorker(){
        if(!('serviceWorker' in navigator)){
            throw new Error('Service Worker not supported');
        }
        try{
            let registration = await navigator.serviceWorker.getRegistration('/');
            if(!registration){
                console.log('📝 Registering service worker...');
                registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
                    scope: '/',
                    updateViaCache: 'none'
                });
            }
            await navigator.serviceWorker.ready;
            console.log('✅ Service worker ready');
            return registration;
        }catch(error){
            console.error('❌ Service worker registration failed:', error);
            throw error;
        }
    }

    // Request notification permission with better error handling
    async requestNotificationPermission(){
        if(!('Notification' in window)){
            throw new Error('Notifications not supported');
        }
        if(Notification.permission === 'granted'){
            return 'granted';
        }
        if(Notification.permission === 'denied'){
            console.warn('⚠️ Notification permission previously denied');
            throw new Error('Notification permission denied');
        }
        console.log('🔔 Requesting notification permission...');
        return await Notification.requestPermission();
    }

    // Generate token with exponential backoff retry
    async generateTokenWithRetry(registration, attempt = 1) {
        try{
            const token = await getToken(messaging, {
                vapidKey: VAPID_KEY,
                serviceWorkerRegistration: registration
            });
            if(!token && attempt < this.maxRetries){
                console.log(`⚠️ Token generation attempt ${attempt} failed, retrying...`);
                await this.delay(this.retryDelay * Math.pow(2, attempt - 1));
                return this.generateTokenWithRetry(registration, attempt + 1);
            }
            return token;
        }catch(error){
            if(attempt < this.maxRetries){
                console.log(`⚠️ Token generation error on attempt ${attempt}, retrying:`, error.message);
                await this.delay(this.retryDelay * Math.pow(2, attempt - 1));
                return this.generateTokenWithRetry(registration, attempt + 1);
            }
            throw error;
        }
    }

    // Cache token with metadata
    cacheToken(token) {
        const tokenData = {
            token,
            generated_at : Date.now(),
            validated_at : Date.now(),
            version      : '2.1' // Updated version for new logic
        };
        localStorage.setItem('fcmTokenData', JSON.stringify(tokenData));
        localStorage.setItem('fcmToken', token);
        this.tokenCache = token;
    }

    // Utility: Promise-based delay
    delay(ms){
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Get token status for debugging
    getTokenStatus(){
        const tokenData   = localStorage.getItem('fcmTokenData');
        const simpleToken = localStorage.getItem('fcmToken');
        if(!tokenData && !simpleToken){
            return { hasToken: false };
        }
        if(!tokenData && simpleToken){
            // Legacy token without metadata
            return { 
                hasToken : true, 
                isValid  : true, // Assume valid for legacy tokens
                legacy   : true 
            };
        }
        try{
            const parsed = JSON.parse(tokenData);
            const now    = Date.now();
            return{
                hasToken      : true,
                age           : Math.floor((now - parsed.generated_at) / 1000 / 60), // minutes
                lastValidated : Math.floor((now - (parsed.validated_at || parsed.generated_at)) / 1000 / 60),
                isValid       : this.isTokenValid(),
                version       : parsed.version || '1.0'
            };
        }catch{
            return{ 
                hasToken: false, 
                error: 'Invalid token data' 
            };
        }
    }

    // Clear all token data (for logout)
    clearTokenData(){
        localStorage.removeItem('fcmToken');
        localStorage.removeItem('fcmTokenData');
        this.tokenCache = null;
        console.log('🧹 FCM token data cleared');
    }
}

// Create singleton instance
const tokenManager = new FCMTokenManager();

// Public API - simplified and more reliable
export const requestFCMToken = async (forceNew = false) => {
    return tokenManager.getValidToken(forceNew);
};

export const forceRefreshFCMToken = async () => {
    return tokenManager.generateNewToken();
};

export const getTokenStatus = () => {
    return tokenManager.getTokenStatus();
};

export const clearFCMTokenData = () => {
    tokenManager.clearTokenData();
};

// Enhanced notification manager with better error handling
class NotificationManager{
    constructor(){
        this.listeners    = new Set();
        this.isListening  = false;
        this.unsubscribe  = null;
        this.messageQueue = [];
    }
    subscribe(callback){
        if(typeof callback !== 'function'){
            console.error('❌ Callback must be a function');
            return () => {};
        }
        this.listeners.add(callback);
        if(!this.isListening){
            this.startListening();
        }
        // Deliver any queued messages to new subscriber
        if(this.messageQueue.length > 0){
            console.log(`📨 Delivering ${this.messageQueue.length} queued messages`);
            this.messageQueue.forEach(payload => {
                try{
                    callback(payload);
                }catch(error){
                    console.error('❌ Error delivering queued message:', error);
                }
            });
            this.messageQueue = [];
        }
        // Return unsubscribe function
        return() => {
            this.listeners.delete(callback);
            if(this.listeners.size === 0){
                this.stopListening();
            }
        };
    }
    startListening(){
        if(this.isListening) return;
        try{
            this.unsubscribe = onMessage(messaging, (payload) => {
                console.log('📨 FCM message received:', payload);
                if(this.listeners.size === 0){
                    // Queue message if no listeners
                    this.messageQueue.push(payload);
                    console.log('📪 Message queued - no active listeners');
                    return;
                }
                // Deliver to all listeners
                this.listeners.forEach(callback => {
                    try{
                        callback(payload);
                    }catch(error){
                        console.error('❌ Error in notification callback:', error);
                    }
                });
            });
            this.isListening = true;
            console.log('👂 Started listening for FCM messages');
        }catch(error){
            console.error('❌ Failed to start listening for messages:', error);
        }
    }
    stopListening(){
        if(this.unsubscribe){
            this.unsubscribe();
            this.unsubscribe = null;
        }
        this.isListening  = false;
        this.messageQueue = []; // Clear queue when stopping
        console.log('🛑 Stopped listening for FCM messages');
    }
    getStatus(){
        return{
            isListening     : this.isListening,
            subscriberCount : this.listeners.size,
            queuedMessages  : this.messageQueue.length
        };
    }
}

export const notificationManager = new NotificationManager();

// Legacy compatibility
export const onMessageListener = () => {
    return new Promise((resolve) => {
        const unsubscribe = notificationManager.subscribe((payload) => {
            resolve(payload);
        });
        // Clean up after first message
        setTimeout(() => unsubscribe(), 30000); // Auto-cleanup after 30s
    });
};

export { messaging };
export const database = getDatabase(app);