Document.addEventListener("DOMContentLoaded", () => {

const db = window.db

const input = document.getElementById("msgInput")
const sendBtn = document.getElementById("sendBtn")
const voiceBtn = document.getElementById("voiceBtn")
const messages = document.querySelector(".messages")
const fileInput = document.querySelector('input[type="file"]')
const gifBtn = document.getElementById("gifBtn")

if(!input || !sendBtn || !messages){
console.error("UI elements missing")
return
}

/* ========================= */
/* USER */
/* ========================= */

let storedUser = null
try{
storedUser = JSON.parse(localStorage.getItem("anon_user"))
}catch(e){}

// The current user's name
const username = storedUser?.name || "User_" + Math.floor(Math.random()*1000)
const userId = storedUser?.id || crypto.randomUUID()

/* ========================= */
/* REPLY STATE */
/* ========================= */

let replyTo = null

function setReply(msg) {
  replyTo = msg
  const bar = document.getElementById("replyBar")
  const replyName = document.getElementById("replyName")
  const replyText = document.getElementById("replyPreview")
  replyName.textContent = msg.username
  replyText.textContent = msg.message || "📷 Media"
  bar.style.display = "flex"
  input.focus()
}

function clearReply() {
  replyTo = null
  const bar = document.getElementById("replyBar")
  if(bar) bar.style.display = "none"
}

/* ========================= */
/* REPLY BAR */
/* ========================= */

const replyBar = document.createElement("div")
replyBar.id = "replyBar"
replyBar.style = `
  display: none;
  align-items: center;
  justify-content: space-between;
  background: #1e293b;
  border-left: 3px solid #3b82f6;
  padding: 6px 10px;
  border-radius: 8px;
  margin-bottom: 4px;
  gap: 8px;
`
replyBar.innerHTML = `
  <div style="flex:1;overflow:hidden">
    <div id="replyName" style="font-size:11px;color:#3b82f6;font-weight:bold;"></div>
    <div id="replyPreview" style="font-size:12px;color:#9ca3af;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"></div>
  </div>
  <button id="cancelReply" style="color:#9ca3af;font-size:18px;flex-shrink:0;">✕</button>
`

const bottomChat = document.querySelector(".bottom-chat")
if(bottomChat) {
    bottomChat.insertBefore(replyBar, bottomChat.firstChild)
    document.getElementById("cancelReply").addEventListener("click", clearReply)
}

/* ========================= */
/* CONTEXT MENU (hold menu) */
/* ========================= */

function showContextMenu(msg, bubble, e) {
  // SWAPPED: Using username check instead of ID
  if (msg.username !== username) return;

  const existingMenu = document.getElementById("ctxMenu");
  if (existingMenu) existingMenu.remove();

  const menu = document.createElement("div");
  menu.id = "ctxMenu";
  menu.style = `
    position: fixed;
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 12px;
    overflow: hidden;
    z-index: 10000; 
    min-width: 140px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.6);
    pointer-events: auto;
  `;

  menu.innerHTML = `
    <button id="ctxEdit" style="display:block; width:100%; padding:14px 16px; background:none; border:none; color:white; font-size:15px; text-align:left; cursor:pointer; border-bottom:1px solid #334155;">✏️ Edit</button>
    <button id="ctxDelete" style="display:block; width:100%; padding:14px 16px; background:none; border:none; color:#f87171; font-size:15px; text-align:left; cursor:pointer;">🗑️ Delete</button>
  `;

  document.body.appendChild(menu);

  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;

  let top = clientY - 80; 
  let left = clientX - 70;

  if (left + 140 > window.innerWidth) left = window.innerWidth - 150;
  if (top + 100 > window.innerHeight) top = window.innerHeight - 110;
  
  menu.style.top = Math.max(10, top) + "px";
  menu.style.left = Math.max(10, left) + "px";

  document.getElementById("ctxEdit").onclick = (ev) => {
    ev.stopPropagation();
    menu.remove();
    const newText = prompt("Edit message:", msg.message);
    if (newText && newText.trim() !== msg.message) {
        editMessage(msg.id, newText.trim(), bubble);
    }
  };

  document.getElementById("ctxDelete").onclick = (ev) => {
    ev.stopPropagation();
    menu.remove();
    if (confirm("Delete this message?")) {
        deleteMessage(msg.id);
    }
  };

  setTimeout(() => {
    const closeMenu = () => { if(menu) menu.remove(); };
    window.addEventListener('click', closeMenu, { once: true });
    window.addEventListener('touchstart', closeMenu, { once: true });
  }, 100);
}


/* ========================= */
/* EDIT / DELETE LOGIC */
/* ========================= */

async function editMessage(msgId, newText, bubble) {
  const { error } = await db.from("chat_messages").update({ message: newText }).eq("id", msgId)
  if (error) return alert("Edit failed")

  const msgTextEl = bubble.querySelector(".msgText")
  if (msgTextEl) msgTextEl.textContent = newText
  if (!bubble.querySelector(".editedLabel")) {
    const span = document.createElement("span")
    span.className = "editedLabel"
    span.style = "font-size:10px;color:#64748b;margin-left:6px;"
    span.textContent = "edited"
    bubble.appendChild(span)
  }
}

async function deleteMessage(msgId) {
  const { error } = await db.from("chat_messages").delete().eq("id", msgId)
  if (error) return alert("Delete failed")
  const el = document.querySelector(`[data-id="${msgId}"]`)
  if (el) el.remove()
}

/* ========================= */
/* INPUT UI */
/* ========================= */

function updateInputUI(){
    const hasText = input.value.trim().length > 0;
    sendBtn.style.display = hasText ? "flex" : "none";
    if(voiceBtn) voiceBtn.style.display = hasText ? "none" : "flex";
}

input.addEventListener("input", updateInputUI)

/* ========================= */
/* DISPLAY MESSAGE */
/* ========================= */

const messageMap = {}

function displayMessage(msg){
  messageMap[msg.id] = msg
  const div = document.createElement("div")
  div.className = "mb-3"
  div.dataset.id = msg.id

  // SWAPPED: Ownership check uses username now
  const isOwn = msg.username === username;

  let replyHTML = ""
  if (msg.reply_to) {
    const original = msg._replyData || messageMap[msg.reply_to]
    if (original) {
      replyHTML = `<div style="background:#0f172a;border-left:3px solid #3b82f6;border-radius:6px;padding:5px 8px;margin-bottom:5px;font-size:11px;color:#9ca3af;max-width:100%;overflow:hidden;"><span style="color:#3b82f6;font-weight:bold;">${original.username}</span><br><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block;">${original.message || "📷 Media"}</span></div>`
    }
  }

  let mediaHTML = msg.media_url ? `<img src="${msg.media_url}" style="max-width:200px;border-radius:10px;margin-top:5px;">` : ""
  const editedHTML = msg.is_edited ? `<span class="editedLabel" style="font-size:10px;color:#64748b;margin-left:6px;">edited</span>` : ""

  div.innerHTML = `
    <div style="font-size:11px;color:#9ca3af;margin-bottom:2px;">${msg.username}</div>
    <div class="msgBubble" style="background:#1e293b;color:white;padding:10px 14px;border-radius:14px;display:inline-block;max-width:80%;position:relative;transition:transform 0.2s ease;user-select:none;-webkit-user-select:none;">
      ${replyHTML}
      <span class="msgText">${msg.message || ""}</span>
      ${editedHTML}
      ${mediaHTML}
    </div>
  `

  const bubble = div.querySelector(".msgBubble")

  if (isOwn) {
    let holdTimer = null
    bubble.addEventListener("touchstart", (e) => {
      holdTimer = setTimeout(() => {
        if(e.cancelable) e.preventDefault();
        if (navigator.vibrate) navigator.vibrate(40)
        showContextMenu(msg, bubble, e)
      }, 600)
    }, { passive: false })
    bubble.addEventListener("touchend", () => clearTimeout(holdTimer))
    bubble.addEventListener("touchmove", () => clearTimeout(holdTimer))
    bubble.addEventListener("contextmenu", (e) => e.preventDefault()) 
  }

  // Swipe logic
  let startX = 0, currentX = 0, isSwiping = false
  bubble.addEventListener("touchstart", (e) => { startX = e.touches[0].clientX; isSwiping = true; }, { passive: true })
  bubble.addEventListener("touchmove", (e) => {
    if (!isSwiping) return
    currentX = e.touches[0].clientX
    const diff = currentX - startX
    if (diff > 0 && diff < 100) {
      bubble.style.transform = `translateX(${diff}px)`
      bubble.style.borderLeft = diff > 60 ? "3px solid #3b82f6" : ""
    }
  }, { passive: true })
  bubble.addEventListener("touchend", () => {
    const diff = currentX - startX
    isSwiping = false; bubble.style.transform = "translateX(0)"; bubble.style.borderLeft = ""
    if (diff > 60) { setReply(msg); if (navigator.vibrate) navigator.vibrate(40); }
    currentX = 0; startX = 0;
  })

  messages.appendChild(div)
  messages.scrollTop = messages.scrollHeight
}

/* ========================= */
/* SEND MESSAGE */
/* ========================= */

async function sendMessage(){
  const text = input.value.trim()
  if(text === "") return

  const msgData = { user_id: userId, username, message: text }
  if (replyTo) msgData.reply_to = replyTo.id

  displayMessage({
    id: Date.now(),
    username,
    message: text,
    reply_to: replyTo?.id,
    _replyData: replyTo ? { ...replyTo } : null
  })

  await db.from("chat_messages").insert(msgData)
  input.value = ""; clearReply(); updateInputUI();
}

/* ========================= */
/* INITIAL LOAD & REALTIME */
/* ========================= */

async function loadMessages(){
  const { data } = await db.from("chat_messages").select("*").order("created_at", { ascending: true })
  if(!data) return;
  messages.innerHTML = ""
  data.forEach(msg => { messageMap[msg.id] = msg })
  data.forEach(msg => {
    if (msg.reply_to) msg._replyData = messageMap[msg.reply_to] || null
    displayMessage(msg)
  })
}
loadMessages()

db.channel("live-chat").on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, (payload) => {
    if (payload.eventType === "INSERT") {
        if(payload.new.username !== username) displayMessage(payload.new)
    } else if (payload.eventType === "DELETE") {
        const el = document.querySelector(`[data-id="${payload.old.id}"]`)
        if (el) el.remove()
    } else if (payload.eventType === "UPDATE") {
        const el = document.querySelector(`[data-id="${payload.new.id}"]`)
        if (el) el.querySelector(".msgText").textContent = payload.new.message
    }
}).subscribe()

sendBtn.addEventListener("click", sendMessage)
input.addEventListener("keydown", e => { if(e.key === "Enter") { e.preventDefault(); sendMessage(); } })

})

