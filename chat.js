// --- 1. CONFIGURATION & GENZ LOGIC ---
const genZBurners = [
    "VibeDestroyer_fr",
    "NoCap_Agastyan",
    "GhostMode_ON",
    "Delulu_Realist",
    "MainCharacter_Vibes"
];

const chatBox = document.getElementById('chat-messages');
const mainInput = document.getElementById('main-input');
const sendBtn = document.getElementById('send-btn');
const overlay = document.getElementById('setup-overlay');
const grid = document.getElementById('genz-options');
const customInput = document.getElementById('custom-name');

// Initialize the GenZ Username Grid
genZBurners.forEach(name => {
    const btn = document.createElement('button');
    btn.className = 'user-opt';
    btn.innerText = name;
    btn.onclick = () => finishLogin(name);
    grid.appendChild(btn);
});

// Handle Identity Selection
function finishLogin(selectedName) {
    const name = selectedName || customInput.value.trim();
    if (!name) return alert("Pick a name first!");

    sessionStorage.setItem('anon_user', name);
    overlay.classList.add('hidden');
    
    // Start real-time sync
    loadExistingMessages();
    subscribeToLiveMessages();
}

// --- 2. SUPABASE CORE LOGIC ---

// Load messages and filter out those older than 10 hours
async function loadExistingMessages() {
    const tenHoursAgo = new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
        .from('messages')
        .select('*')
        .gt('created_at', tenHoursAgo) // The "Vanish" filter
        .order('created_at', { ascending: true });

    if (error) return console.error(error);

    chatBox.innerHTML = ''; 
    data.forEach(msg => renderMessage(msg));
    scrollToBottom();
}

// Real-time listener for new messages
function subscribeToLiveMessages() {
    supabase
        .channel('public:messages')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
            const msg = payload.new;
            const tenHoursAgo = new Date(Date.now() - 10 * 60 * 60 * 1000);
            
            // Only show if it's within the 10-hour window
            if (new Date(msg.created_at) > tenHoursAgo) {
                renderMessage(msg);
                scrollToBottom();
            }
        })
        .subscribe();
}

// Send Message Function
async function sendMessage() {
    const text = mainInput.value.trim();
    const user = sessionStorage.getItem('anon_user');

    if (!text || !user) return;

    const { error } = await supabase
        .from('messages')
        .insert([{ content: text, username: user }]);

    if (!error) {
        mainInput.value = '';
        // Reset the input UI (hides Send button, shows icons)
        mainInput.dispatchEvent(new Event('input')); 
    }
}

// --- 3. UI RENDERING ---

function renderMessage(msg) {
    const currentUser = sessionStorage.getItem('anon_user');
    const isMe = msg.username === currentUser;

    const div = document.createElement('div');
    div.className = `msg ${isMe ? 'sent' : 'received'}`;
    
    // Manual styling for the "Sent" side
    if(isMe) {
        div.style.alignSelf = 'flex-end';
        div.style.background = 'var(--accent)';
        div.style.borderBottomRightRadius = '4px';
    } else {
        div.style.alignSelf = 'flex-start';
        div.style.background = 'var(--input-bg)';
        div.style.borderBottomLeftRadius = '4px';
    }

    div.innerHTML = `
        <span class="sender" style="color: ${isMe ? '#e0e0e0' : 'var(--accent)'}">
            ${isMe ? 'You' : msg.username}
        </span>
        <div class="text">${msg.content}</div>
    `;
    chatBox.appendChild(div);
}

function scrollToBottom() {
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Event Listeners
sendBtn.onclick = sendMessage;
mainInput.onkeypress = (e) => { if (e.key === 'Enter') sendMessage(); };
