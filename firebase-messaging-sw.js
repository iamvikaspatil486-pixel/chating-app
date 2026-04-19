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
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon-192.png'
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});
