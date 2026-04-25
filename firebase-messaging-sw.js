importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBUOY-y9cqFqjBOIQbzms6sr7zCofod1QU",
  authDomain: "original-harate.firebaseapp.com",
  projectId: "original-harate",
  storageBucket: "original-harate.firebasestorage.app",
  messagingSenderId: "484091091861",
  appId: "1:484091091861:web:95da49ae32cddfd385b49c"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  // Close existing notifications first
  self.registration.getNotifications({ tag: 'chat-message' }).then(function(notifications) {
    notifications.forEach(function(n) { n.close() })
  })

  const title = payload.notification.title
  const body = payload.notification.body

  self.registration.showNotification(title, {
    body: body,
    icon: '/icon-192.png',
    tag: 'chat-message',        // ← same tag = replaces old notification
    renotify: true,             // ← still vibrates/sounds on update
    badge: '/icon-192.png',
    data: { url: '/chat.html' }
  })
})

// Click notification → open chat
self.addEventListener('notificationclick', function(event) {
  event.notification.close()
  event.waitUntil(
    clients.openWindow('/chat.html')
  )
})
