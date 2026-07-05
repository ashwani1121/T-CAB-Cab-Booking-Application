importScripts(
  "https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js"
);
const firebaseConfig = {
  apiKey: "AIzaSyDTd24h9owf8kQFFqt8PJkMkXfgAUUN-IQ",
  authDomain: "tcab-b8f12.firebaseapp.com",
  databaseURL: "https://tcab-b8f12-default-rtdb.firebaseio.com",
  projectId: "tcab-b8f12",
  storageBucket: "tcab-b8f12.firebasestorage.app",
  messagingSenderId: "431377243166",
  appId: "1:431377243166:web:1e5e47a63aff7753dea20f",
  measurementId: "G-0JJMEE9NJD"
};
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();
const NOTIFICATION_CONFIGS = {
  SOS_EMERGENCY: {
    icon: "/favicon.ico",
    badge: "/badge.png",
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 200],
    sound: "/sounds/emergency.mp3",
    actions: [
      { action: "view", title: "View Details", icon: "/icons/view.png" },
      { action: "dismiss", title: "Dismiss", icon: "/icons/dismiss.png" },
    ],
  },
  SOS_ALERT: {
    icon: "/favicon.ico",
    badge: "/badge.png",
    requireInteraction: true,
    vibrate: [200, 100, 200],
    sound: "/sounds/alert.mp3",
    actions: [
      { action: "view", title: "View Details" },
      { action: "dismiss", title: "Dismiss" },
    ],
  },
  CUSTOM_TRIP_REQUEST: {
    icon: "/favicon.ico",
    badge: "/badge.png",
    requireInteraction: true,
    vibrate: [100, 50, 100, 50, 100],
    sound: "/sounds/notification.mp3",
    actions: [
      { action: "view", title: "View Request", icon: "/icons/trip.png" },
      { action: "dismiss", title: "Later", icon: "/icons/later.png" },
    ],
  },
  RIDE_TRANSFERRED: {
    icon: "/favicon.ico",
    badge: "/badge.png",
    requireInteraction: true,
    vibrate: [150, 75, 150, 75, 150],
    sound: "/sounds/notification.mp3",
    actions: [
      { action: "view", title: "View Ride", icon: "/icons/ride.png" },
      { action: "dismiss", title: "Later", icon: "/icons/later.png" },
    ],
  },
  general: {
    icon: "/favicon.ico",
    badge: "/badge.png",
    requireInteraction: false,
    vibrate: [100, 50, 100],
  },
};

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log("📨 Background message received:", payload);
  const notificationType = payload.data?.type || "general";
  const notificationTitle =
    payload.notification?.title || payload.data?.title || "New Notification";
  const notificationBody =
    payload.notification?.body ||
    payload.data?.message ||
    "You have a new message";
  const config =
    NOTIFICATION_CONFIGS[notificationType] || NOTIFICATION_CONFIGS.general;
  const notificationOptions = {
    body: notificationBody,
    icon: config.icon,
    badge: config.badge,
    tag: notificationType,
    data: payload.data,
    requireInteraction: config.requireInteraction,
    vibrate: config.vibrate,
    silent: false,
    actions: config.actions || [],
  };
  // Add timestamp to notification data
  if (notificationOptions.data) {
    notificationOptions.data.timestamp = Date.now();
  }
  // Show notification
  self.registration.showNotification(notificationTitle, notificationOptions);
  // Play sound for high-priority notifications
  if (
    notificationType === "SOS_EMERGENCY" ||
    notificationType === "SOS_ALERT" ||
    notificationType === "CUSTOM_TRIP_REQUEST"
  ) {
    playNotificationSound(notificationType);
  }
  // Send message to main thread for special notification types
  if (
    notificationType === "SOS_EMERGENCY" ||
    notificationType === "SOS_ALERT"
  ) {
    notifyMainThread("SOS_NOTIFICATION", payload);
  } else if (notificationType === "CUSTOM_TRIP_REQUEST") {
    notifyMainThread("CUSTOM_TRIP_NOTIFICATION", payload);
  } else if (notificationType === "RIDE_TRANSFERRED") {
    notifyMainThread("RIDE_TRANSFER_NOTIFICATION", payload);
  } else {
    notifyMainThread("BACKGROUND_NOTIFICATION", payload);
  }
});

// Function to play notification sound
function playNotificationSound(type) {
  const soundMap = {
    SOS_EMERGENCY: "/sounds/emergency.mp3",
    SOS_ALERT: "/sounds/alert.mp3",
    CUSTOM_TRIP_REQUEST: "/sounds/notification.mp3",
    RIDE_TRANSFERRED: "/sounds/notification.mp3",
  };
  const soundUrl = soundMap[type];
  if (soundUrl) {
    // Note: Background sound in service workers has limitations
    // The notification itself will use system sound
    console.log(`🔊 Notification sound configured: ${soundUrl}`);
  }
}

// Helper function to notify main thread
function notifyMainThread(type, payload) {
  self.clients
    .matchAll({ type: "window", includeUncontrolled: true })
    .then((clients) => {
      if (clients.length === 0) {
        console.log("📪 No active clients, notification queued");
        return;
      }
      clients.forEach((client) => {
        client.postMessage({
          type: type,
          payload: payload,
        });
      });
      console.log(`✅ Notified ${clients.length} client(s) of ${type}`);
    })
    .catch((error) => {
      console.error("❌ Error notifying clients:", error);
    });
}

// Handle notification click
self.addEventListener("notificationclick", (event) => {
  console.log("🖱️ Notification clicked:", event.action, event.notification.tag);
  event.notification.close();
  const notificationType = event.notification.tag;
  const notificationData = event.notification.data;
  // Handle different actions
  if (event.action === "dismiss") {
    console.log("Notification dismissed");
    return;
  }
  // Determine target URL based on notification type
  let targetUrl = "/dashboard";
  if (
    notificationType === "SOS_EMERGENCY" ||
    notificationType === "SOS_ALERT"
  ) {
    targetUrl = "/sos";
  } else if (notificationType === "CUSTOM_TRIP_REQUEST") {
    const rideRequestId = notificationData?.ride_request_id;
    targetUrl = rideRequestId
      ? `/riderequest?id=${rideRequestId}`
      : "/riderequest";
  } else if (notificationType === "RIDE_TRANSFERRED") {
    const rideRequestId = notificationData?.ride_request_id;
    targetUrl = rideRequestId
      ? `/riderequest?id=${rideRequestId}`
      : "/riderequest";
  }
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // Check if app is already open
        const appWindow = windowClients.find((client) =>
          client.url.includes(self.location.origin)
        );
        if (appWindow) {
          // Focus existing window and navigate
          return appWindow.focus().then((client) => {
            if (client.navigate) {
              return client.navigate(targetUrl);
            }
            return client.postMessage({
              type: "NAVIGATE",
              url: targetUrl,
              notificationData: notificationData,
            });
          });
        } else {
          // Open new window
          return self.clients.openWindow(targetUrl);
        }
      })
      .catch((error) => {
        console.error("❌ Error handling notification click:", error);
      })
  );
});

// Handle service worker installation
self.addEventListener("install", (event) => {
  console.log("🔧 Service worker installing...");
  self.skipWaiting();
});

// Handle service worker activation
self.addEventListener("activate", (event) => {
  console.log("✅ Service worker activated");
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Clear old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName.includes("firebase") || cacheName.includes("fcm")) {
              console.log("🗑️ Clearing old cache:", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
    ])
  );
});

// Handle push events (for additional reliability)
self.addEventListener("push", (event) => {
  console.log("📬 Push event received");
  if (event.data) {
    try {
      const payload = event.data.json();
      console.log("Push payload:", payload);
    } catch (error) {
      console.error("Error parsing push data:", error);
    }
  }
});
