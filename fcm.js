importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');

async function initFCM() {
  // Import Firebase
  const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js');
  const { getMessaging, getToken, onMessage } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging.js');

  const firebaseConfig = {
    apiKey: "your-apiKey",
    authDomain: "your-authDomain",
    projectId: "your-projectId",
    storageBucket: "your-storageBucket",
    messagingSenderId: "your-messagingSenderId",
    appId: "your-appId"
  };

  const app = initializeApp(firebaseConfig);
  const messaging = getMessaging(app);

  // Get FCM token
  const token = await getToken(messaging, {
    vapidKey: 'your-VAPID-key'
  });

  if (token) {
    console.log('✅ FCM Token:', token);
    // Save token to Supabase
    const { data: { user } } = await db.auth.getUser();
    if (user) {
      await db.from('students').update({ fcm_token: token }).eq('id', user.id);
      console.log('✅ FCM token saved to DB');
    }
  }

  // Handle foreground messages
  onMessage(messaging, function(payload) {
    console.log('Message received:', payload);
    new Notification(payload.notification.title, {
      body: payload.notification.body,
      icon: '/icon-192.png'
    });
  });
}

initFCM();
