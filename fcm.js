async function initFCM() {
  try {
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js');
    const { getMessaging, getToken, onMessage } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging.js');

    const firebaseConfig = {
      apiKey: "AIzaSyBUOY-y9cqFqjBOIQbzms6sr7zCofod1QU",
      authDomain: "original-harate.firebaseapp.com",
      projectId: "original-harate",
      storageBucket: "original-harate.firebasestorage.app",
      messagingSenderId: "484091091861",
      appId: "1:484091091861:web:95da49ae32cddfd385b49c"
    };

    const app = initializeApp(firebaseConfig);
    const messaging = getMessaging(app);

    const token = await getToken(messaging, {
      vapidKey: 'BN7Ir1MTxK7PwllwVyFt2OPtDKEBZk4dRHSj99CcVvYKYPx1PQ11cr1ZIxr-xMaAbIzhYVgyYi23-dtMVd5NkEE',
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

db.auth.getUser().then(function(res) {
  if (res.data.user) {
    initFCM();
  } else {
    console.log('❌ No user logged in, skipping FCM');
  }
});
