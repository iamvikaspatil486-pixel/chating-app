// chat.js

// ---------------- USER INFO ----------------
let anonUser = JSON.parse(localStorage.getItem("anon_user"));
if (!anonUser) {
    // If no anon user, redirect to username selection
    window.location.href = "username.html";
}

// Display username
const displayName = document.getElementById("display-name");
displayName.innerText = anonUser.name;

// ---------------- DOM ELEMENTS ----------------
const messagesContainer = document.getElementById("messages-container");
const msgInput = document.getElementById("msg-input");
const sendBtn = document.getElementById("send-btn");
const pollBtn = document.getElementById("poll-btn");
const pollCreator = document.getElementById("poll-creator");
const createPollBtn = document.getElementById("create-poll");
const cancelPollBtn = document.getElementById("cancel-poll");

// ---------------- SUPABASE ----------------
const supabaseUrl = "https://ntfglwfrhljjkzecifuh.supabase.co";
const supabaseKey = "YOUR_KEY_HERE";
const db = supabase.createClient(supabaseUrl, supabaseKey);

// ---------------- LOGOUT ----------------
async function logout() {
    localStorage.removeItem("anon_user");
    window.location.href = "username.html";
}

// ---------------- MESSAGES ----------------
async function loadMessages() {
    const { data, error } = await db
        .from("chat_messages")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(50);
    if (error) console.error(error);

    messagesContainer.innerHTML = "";
    data.forEach(msg => appendMessage(msg));
}

function appendMessage(msg) {
    const div = document.createElement("div");
    div.className = `msg-bubble ${msg.user_id === anonUser.id ? "me" : ""}`;
    div.innerHTML = `<span class="user-label">${msg.username}</span>${msg.message}`;
    messagesContainer.appendChild(div);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// ---------------- SEND MESSAGE ----------------
sendBtn.addEventListener("click", async () => {
    const text = msgInput.value.trim();
    if (!text) return;

    const { data, error } = await db.from("chat_messages").insert([{
        message: text,
        username: anonUser.name,
        user_id: anonUser.id,
        created_at: new Date()
    }]);

    if (error) console.error(error);
    msgInput.value = "";
});

// ---------------- POLL ----------------
pollBtn.addEventListener("click", () => pollCreator.classList.remove("hidden"));
cancelPollBtn.addEventListener("click", () => pollCreator.classList.add("hidden"));
createPollBtn.addEventListener("click", async () => {
    const question = document.getElementById("poll-question").value.trim();
    const options = Array.from(document.querySelectorAll(".poll-option")).map(i => i.value.trim()).filter(Boolean);
    if (!question || options.length < 2) return alert("Add question + min 2 options");

    await db.from("polls").insert([{
        user_id: anonUser.id,
        question: question,
        option1: options[0],
        option2: options[1],
        option3: options[2] || "",
        option4: options[3] || "",
        created_at: new Date()
    }]);
    pollCreator.classList.add("hidden");
});

// ---------------- REALTIME ----------------
db.channel("public:chat_messages")
    .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, payload => {
        appendMessage(payload.new);
    })
    .subscribe();

// Load initial messages
loadMessages();
