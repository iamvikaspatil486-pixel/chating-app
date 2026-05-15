// ==========================================
// FCM - BATCH-ISOLATED NOTIFICATIONS ONLY
// FIXED VERSION - NO student_id
// ==========================================

// Get current user and batch info
const userStr = localStorage.getItem('anon_user');
const batchStr = localStorage.getItem('selectedBatch');

let currentUserId = null;
let currentBatchId = null;

if (userStr) {
  const user = JSON.parse(userStr);
  currentUserId = user?.id;
}

if (batchStr) {
  const batch = JSON.parse(batchStr);
  currentBatchId = batch?.batchId;
}

console.log('🔔 FCM Config:', { currentUserId, currentBatchId });

// ==========================================
// LISTEN FOR MESSAGES FROM BATCHMATES ONLY
// ==========================================

async function setupBatchNotificationListener() {
  try {
    const db = window.db;

    if (!db) {
      console.error('Database not initialized');
      return;
    }

    if (!currentBatchId) {
      console.error('Batch ID not found');
      return;
    }

    console.log('🔔 Setting up batch notification listener for:', currentBatchId);

    // Subscribe to new messages in THIS BATCH ONLY
    db.channel(`batch-${currentBatchId}:fcm`)
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `batch_id=eq.${currentBatchId}` // ← BATCH FILTER
        },
        (payload) => {
          const message = payload.new;

          console.log('📨 New message received:', message);

          // Don't notify for own messages
          if (message.user_id === currentUserId) {
            console.log('Own message, skipping notification');
            return;
          }

          // Check if current window is focused
          if (document.hidden) {
            console.log('Page hidden, showing notification for batchmate message');
            showNotification(message);
          } else {
            console.log('Page focused, notification suppressed');
          }
        }
      )
      .subscribe();

    console.log('✅ Batch notification listener active');

  } catch (err) {
    console.error('Error setting up batch notification listener:', err);
  }
}

// ==========================================
// SHOW LOCAL NOTIFICATION (if page hidden)
// ==========================================

function showNotification(message) {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(message.username || 'New Message', {
        body: message.message?.substring(0, 100) || '📷 Sent an image',
        badge: '/icon.png',
        icon: '/icon.png',
        tag: `batch-${currentBatchId}`
      });
      console.log('✅ Notification shown');
    } catch (err) {
      console.error('Error showing notification:', err);
    }
  }
}

// ==========================================
// INITIALIZE
// ==========================================

window.addEventListener('load', () => {
  console.log('🔔 FCM initializing...');
  
  // Wait for db to be ready
  let attempts = 0;
  const checkInterval = setInterval(() => {
    if (window.db && currentBatchId && currentUserId) {
      clearInterval(checkInterval);
      console.log('✅ DB ready, setting up listener');
      setupBatchNotificationListener();
      requestNotificationPermission();
    }
    attempts++;
    if (attempts > 50) {
      clearInterval(checkInterval);
      console.error('Database not ready after timeout');
    }
  }, 100);
});

// ==========================================
// REQUEST NOTIFICATION PERMISSION
// ==========================================

function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().then((permission) => {
      console.log('🔔 Notification permission:', permission);
    }).catch(err => {
      console.error('Error requesting notification permission:', err);
    });
  }
}

console.log('✅ Batch notification handler loaded - NO student_id references');

