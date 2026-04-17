window.OneSignalDeferred = window.OneSignalDeferred || [];
OneSignalDeferred.push(async function(OneSignal) {
  try {
    if (OneSignal.initialized) {
      // Already initialized, just login
      const { data: { user } } = await db.auth.getUser();
      if (!user) return;
      await OneSignal.login(user.id);
      console.log("✅ OneSignal re-linked:", user.id);
      return;
    }

    await OneSignal.init({ appId: "d433012f-f675-43f4-b382-f9e8b32407f0" });
    await OneSignal.Notifications.requestPermission();

    const { data: { user } } = await db.auth.getUser();
    if (!user) return;

    await OneSignal.login(user.id);
    console.log("✅ OneSignal linked:", user.id);
  } catch(e) {
    console.log("OneSignal error:", e.message);
  }
});
