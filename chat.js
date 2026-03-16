// --- DATABASE SYNC ---
const msgContainer = document.getElementById('messages-container');
const msgInput = document.getElementById('msg-input');
const loginScreen = document.getElementById('login-screen');
const chatScreen = document.getElementById('chat-screen');
const errorMsg = document.getElementById('error-msg');

let myUsername = sessionStorage.getItem('temp_user') || "";
let myUserId = sessionStorage.getItem('temp_id') || crypto.randomUUID();

// Auto-login if username exists in session
window.onload = () => {
    if (myUsername) {
        showChat();
    }
};

function showChat() {
    document.getElementById('display-name').innerText = `@${myUsername}`;
    loginScreen.classList.add('hidden'); // This hides the login box
    chatScreen.classList.remove('hidden'); // This shows the chat box
    initRealtime();
    loadRecentMessages();
}

// 1. Join Chat Logic
document.getElementById('join-btn').onclick = async () => {
    const inputName = document.getElementById('username-input').value.trim();
    if (!inputName) {
        errorMsg.innerText = "Please enter a username!";
        return;
    }

    const tenHoursAgo = new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString();

    // Check if name is taken in the 'chat_messages' table
    const { data: existingUser } = await supabase
        .from('chat_messages') 
        .select('username')
        .eq('username', inputName)
        .gt('created_at', tenHoursAgo)
        .limit(1);

    if (existingUser && existingUser.length > 0) {
        errorMsg.innerText = "That name is already vibing here. Try another!";
        return;
    }

    // Set Identity
    myUsername = inputName;
    sessionStorage.setItem('temp_user', myUsername);
    sessionStorage.setItem('temp_id', myUserId);
    
    showChat();
};

// 2. Load Messages (10h filter)
async function loadRecentMessages() {
    const tenHoursAgo = new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString();
    
    const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .gt('created_at', tenHoursAgo)
        .order('created_at', { ascending: true });

    msgContainer.innerHTML = '';
    if (data) data.forEach(msg => renderMessage(msg));
}

// 3. Realtime Listener
function initRealtime() {
    supabase
        .channel('student_lounge')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, payload => {
            renderMessage(payload.new);
        })
        .subscribe();
}

// 4. Send Message (Your Schema)
async function sendMessage() {
    const text = msgInput.value.trim();
    if (!text) return;

    const { error } = await supabase.from('chat_messages').insert([
        { 
            username: myUsername, 
            message: text,        // Your column
            user_id: myUserId,    // Your column
            media_url: null,
            reply_to: null
        }
    ]);

    if (!error) msgInput.value = '';
}

// 5. UI Rendering
function renderMessage(msg) {
    const div = document.createElement('div');
    const isMe = msg.username === myUsername;
    div.className = `msg-bubble ${isMe ? 'me' : ''}`;
    
    // Support for text or media
    let content = msg.media_url 
        ? `<img src="${msg.media_url}" class="chat-media">` 
        : `<span class="text">${msg.message}</span>`;

    div.innerHTML = `
        <span class="user-label">${isMe ? 'You' : msg.username}</span>
        ${content}
    `;
    
    msgContainer.appendChild(div);
    msgContainer.scrollTo({ top: msgContainer.scrollHeight, behavior: 'smooth' });
}

// Event Listeners
document.getElementById('send-btn').onclick = sendMessage;
msgInput.onkeypress = (e) => { if (e.key === 'Enter') sendMessage(); };
