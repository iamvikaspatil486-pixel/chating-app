// ---------------- ELEMENTS ----------------
const msgContainer = document.getElementById("messages-container");
const msgInput = document.getElementById("msg-input");

const loginScreen = document.getElementById("login-screen");
const chatScreen = document.getElementById("chat-screen");

const errorMsg = document.getElementById("error-msg");

const joinBtn = document.getElementById("join-btn");
const sendBtn = document.getElementById("send-btn");


// ---------------- USER SESSION ----------------
let myUsername = sessionStorage.getItem("temp_user") || "";
let myUserId = sessionStorage.getItem("temp_id") || crypto.randomUUID();


// ---------------- SUGGESTION CLICK ----------------
function fillName(name) {
    document.getElementById("username-input").value = name;
}


// ---------------- PAGE LOAD ----------------
window.addEventListener("DOMContentLoaded", () => {

    if (myUsername) {
        showChat();
    }

});


// ---------------- SHOW CHAT ----------------
function showChat() {

    document.getElementById("display-name").innerText = "@" + myUsername;

    loginScreen.classList.add("hidden");
    chatScreen.classList.remove("hidden");

    initRealtime();
    loadRecentMessages();

}


// ---------------- JOIN CHAT ----------------
joinBtn.addEventListener("click", async () => {

    const inputName = document.getElementById("username-input").value.trim();

    if (!inputName) {
        errorMsg.innerText = "Please enter a username!";
        return;
    }

    const tenHoursAgo = new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString();

    const { data: existingUser, error } = await supabase
        .from("chat_messages")
        .select("username")
        .eq("username", inputName)
        .gt("created_at", tenHoursAgo)
        .limit(1);

    if (error) {
        console.log(error);
        errorMsg.innerText = "Server error.";
        return;
    }

    if (existingUser && existingUser.length > 0) {
        errorMsg.innerText = "Username already taken.";
        return;
    }

    myUsername = inputName;

    sessionStorage.setItem("temp_user", myUsername);
    sessionStorage.setItem("temp_id", myUserId);

    showChat();

});


// ---------------- LOAD MESSAGES ----------------
async function loadRecentMessages() {

    const tenHoursAgo = new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .gt("created_at", tenHoursAgo)
        .order("created_at", { ascending: true });

    if (error) {
        console.log(error);
        return;
    }

    msgContainer.innerHTML = "";

    if (data) {
        data.forEach(msg => renderMessage(msg));
    }

}


// ---------------- REALTIME ----------------
function initRealtime() {

    supabase
        .channel("student_lounge")
        .on(
            "postgres_changes",
            {
                event: "INSERT",
                schema: "public",
                table: "chat_messages"
            },
            (payload) => {
                renderMessage(payload.new);
            }
        )
        .subscribe();

}


// ---------------- SEND MESSAGE ----------------
async function sendMessage() {

    const text = msgInput.value.trim();

    if (!text) return;

    const { error } = await supabase
        .from("chat_messages")
        .insert([
            {
                username: myUsername,
                message: text,
                user_id: myUserId,
                media_url: null,
                reply_to: null
            }
        ]);

    if (error) {
        console.log(error);
        return;
    }

    msgInput.value = "";

}


// ---------------- RENDER MESSAGE ----------------
function renderMessage(msg) {

    const div = document.createElement("div");

    const isMe = msg.username === myUsername;

    div.className = "msg-bubble " + (isMe ? "me" : "");

    let content;

    if (msg.media_url) {
        content = `<img src="${msg.media_url}" class="chat-media">`;
    } else {
        content = `<span class="text">${msg.message}</span>`;
    }

    div.innerHTML = `
        <span class="user-label">${isMe ? "You" : msg.username}</span>
        ${content}
    `;

    msgContainer.appendChild(div);

    msgContainer.scrollTop = msgContainer.scrollHeight;

}


// ---------------- EVENTS ----------------
sendBtn.addEventListener("click", sendMessage);

msgInput.addEventListener("keypress", (e) => {

    if (e.key === "Enter") {
        sendMessage();
    }

});
