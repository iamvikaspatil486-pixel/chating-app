async function initFCM() {
  try {
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

    const token = await getToken(messaging, {
      vapidKey: 'your-VAPID-key',
      serviceWorkerRegistration: await navigator.serviceWorker.register('/firebase-messaging-sw.js')
    });

    if (token) {
      console.log('✅ FCM Token:', token);
      const { data: { user } } = await db.auth.getUser();
      if (user) {
        await db.from('students').update({ fcm_token: token }).eq('id', user.id);
        console.log('✅ FCM token saved');
      }
    } else {
      console.log('❌ No FCM token');
    }

    onMessage(messaging, function(payload) {
      new Notification(payload.notification.title, {
        body: payload.notification.body,
        icon: '/icon-192.png'
      });
    });

  } catch(e) {
    console.log('FCM error:', e.message);
  }
}

initFCM();
