window.OneSignalDeferred = window.OneSignalDeferred || [];
OneSignalDeferred.push(async function(OneSignal) {
  try {
    if (!OneSignal.initialized) {
      await OneSignal.init({
        appId: "d433012f-f675-43f4-b382-f9e8b32407f0",
        serviceWorkerPath: "/OneSignalSDK.sw.js",
        serviceWorkerParam: { scope: "/" },
        allowLocalhostAsSecureOrigin: true,
      });
      await OneSignal.Notifications.requestPermission();
    }

    const { data: { user } } = await db.auth.getUser();
    if (!user) {
      console.log("❌ No user found");
      return;
    }

    await OneSignal.login(user.id);
    console.log("✅ OneSignal linked:", user.id);

  } catch(e) {
    console.log("OneSignal error:", e.message);
  }
});
