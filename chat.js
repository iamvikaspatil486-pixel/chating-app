// Assumes 'supabase' is initialized in supabase.js
const msgContainer = document.getElementById('messages-container');
const msgInput = document.getElementById('msg-input');
const loginScreen = document.getElementById('login-screen');
const chatScreen = document.getElementById('chat-screen');
const errorMsg = document.getElementById('error-msg');

let myUsername = "";
let myUserId = crypto.randomUUID(); // Generate a temporary unique ID for the session

// 1. Join Chat & Check Uniqueness
document.getElementById('join-btn').onclick = async () => {
    const inputName = document.getElementById('username-input').value.trim();
    if (!inputName) return;

    const tenHoursAgo = new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString();

    // Check uniqueness against your 'username' column
    const { data: existingUser } = await supabase
        .from('chat_messages') 
        .select('username')
        .eq('username', inputName)
        .gt('created_at', tenHoursAgo)
        .limit(1);

    if (existingUser && existingUser.length > 0) {
        errorMsg.innerText = "Username already active! Try another.";
        return;
    }

    myUsername = inputName;
    document.getElementById('display-name').innerText = `@${myUsername}`;
    loginScreen.classList.add('hidden');
    chatScreen.classList.remove('hidden');

    initRealtime();
    loadRecentMessages();
};

// 2. Load Messages using your 'message' column
async function loadRecentMessages() {
    const tenHoursAgo = new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString();
    
    const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .gt('created_at', tenHoursAgo)
        .order('created_at', { ascending: true });

    if (data) {
        msgContainer.innerHTML = '';
        data.forEach(msg => renderMessage(msg));
    }
}

// 3. Realtime Subscription
function initRealtime() {
    supabase
        .channel('student-lounge')
        .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'chat_messages' 
        }, payload => {
            renderMessage(payload.new);
        })
        .subscribe();
}

// 4. Send Message using your exact columns
async function sendMessage() {
    const text = msgInput.value.trim();
    if (!text) return;

    const { error } = await supabase.from('chat_messages').insert([
        { 
            username: myUsername, 
            message: text,        // Your column name
            user_id: myUserId,    // Your column name
            media_url: null,      // Placeholder for GIFs/Stickers
            reply_to: null        // Placeholder for replies
        }
    ]);

    if (!error) {
        msgInput.value = '';
    }
}

// 5. Render Message (Supports Text & Media)
function renderMessage(msg) {
    const div = document.createElement('div');
    const isMe = msg.username === myUsername;
    div.className = `msg-bubble ${isMe ? 'me' : ''}`;
    
    // Check if it's a media/GIF or text
    let contentHTML = msg.media_url 
        ? `<img src="${msg.media_url}" class="chat-media">` 
        : `<span class="text">${msg.message}</span>`;

    div.innerHTML = `
        <span class="user-label">${isMe ? 'You' : msg.username}</span>
        ${contentHTML}
    `;
    
    msgContainer.appendChild(div);
    msgContainer.scrollTop = msgContainer.scrollHeight;
}

// Listeners
document.getElementById('send-btn').onclick = sendMessage;
msgInput.onkeypress = (e) => { if (e.key === 'Enter') sendMessage(); };
