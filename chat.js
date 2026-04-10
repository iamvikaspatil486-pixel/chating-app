document.addEventListener("DOMContentLoaded", () => {

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

const username = storedUser?.name || "User_" + Math.floor(Math.random()*1000)
const userId = storedUser?.id || crypto.randomUUID()

/* ========================= */
/* REPLY STATE */
/* ========================= */

let replyTo = null // { id, username, message }

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
  document.getElementById("replyBar").style.display = "none"
}

/* ========================= */
/* REPLY BAR (inject into DOM) */
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
bottomChat.insertBefore(replyBar, bottomChat.firstChild)

document.getElementById("cancelReply").addEventListener("click", clearReply)

/* ========================= */
/* 🔔 ONESIGNAL */
/* ========================= */
window.OneSignalDeferred = window.OneSignalDeferred || [];

OneSignalDeferred.push(async function(OneSignal) {
  await OneSignal.init({ appId: "d433012f-f675-43f4-b382-f9e8b32407f0" });
  await OneSignal.Notifications.requestPermission();
  await OneSignal.login(userId);
  await OneSignal.User.addTag("username", username);
  console.log("✅ OneSignal initialized");

  setTimeout(async () => {
    try {
      const permission = await OneSignal.Notifications.permission;
      const subId = await OneSignal.User.PushSubscription.id;
      alert("Permission: " + permission + "\nSubscription ID: " + subId);
    } catch (e) {
      alert("Error: " + e.message);
    }
  }, 6000);
});

/* ========================= */
/* IMAGE UPLOAD */
/* ========================= */

fileInput.addEventListener("change", async (e) => {
  const file = e.target.files[0]
  if (!file) return

  const fileName = `chat/${Date.now()}-${file.name}`
  const { error: uploadError } = await db.storage.from("chat-images").upload(fileName, file)

  if (uploadError) {
    console.error(uploadError)
    alert("Image upload failed")
    return
  }

  const { data } = db.storage.from("chat-images").getPublicUrl(fileName)
  const publicUrl = data.publicUrl

  const insertData = {
    user_id: userId,
    username,
    media_url: publicUrl
  }

  if (replyTo) {
    insertData.reply_to = replyTo.id
  }

  displayMessage({ id: Date.now(), username, media_url: publicUrl, reply_to: replyTo?.id, _replyData: replyTo })

  await db.from("chat_messages").insert(insertData)
  clearReply()
  fileInput.value = ""
})

/* ========================= */
/* INPUT UI */
/* ========================= */

function updateInputUI(){
  try {
    const hasText = input.value.trim().length > 0
    sendBtn.style.display = hasText ? "inline-block" : "none"
    if(voiceBtn) voiceBtn.style.display = hasText ? "none" : "inline-block"
  } catch(e){
    console.error("UI error:", e)
  }
}

input.addEventListener("input", updateInputUI)
updateInputUI()

/* ========================= */
/* DISPLAY MESSAGE */
/* ========================= */

// Store all loaded messages by id for reply lookup
const messageMap = {}
function displayMessage(msg){
  messageMap[msg.id] = msg

  const div = document.createElement("div")
  div.className = "mb-3"
  div.dataset.id = msg.id

  let replyHTML = ""
  if (msg.reply_to) {
    const original = msg._replyData || messageMap[msg.reply_to]
    if (original) {
      replyHTML = `
        <div style="
          background:#0f172a;
          border-left:3px solid #3b82f6;
          border-radius:6px;
          padding:5px 8px;
          margin-bottom:5px;
          font-size:11px;
          color:#9ca3af;
          max-width:100%;
          overflow:hidden;
        ">
          <span style="color:#3b82f6;font-weight:bold;">${original.username}</span><br>
          <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block;">
            ${original.message || "📷 Media"}
          </span>
        </div>
      `
    }
  }

  let mediaHTML = msg.media_url
    ? `<img src="${msg.media_url}" style="max-width:200px;border-radius:10px;margin-top:5px;">`
    : ""

  div.innerHTML = `
    <div style="font-size:11px;color:#9ca3af;margin-bottom:2px;">${msg.username}</div>
    <div class="msgBubble" style="
      background:#1e293b;
      color:white;
      padding:10px 14px;
      border-radius:14px;
      display:inline-block;
      max-width:80%;
      position:relative;
      transition: transform 0.2s ease;
      cursor: pointer;
    ">
      ${replyHTML}
      ${msg.message || ""}
      ${mediaHTML}
    </div>
    
  `

  // Reply button click
  div.querySelector(".replyBtn").addEventListener("click", () => {
    setReply(msg)
  })

  // ========================
  // SWIPE TO REPLY GESTURE
  // ========================
  const bubble = div.querySelector(".msgBubble")
  let startX = 0
  let currentX = 0
  let isSwiping = false
  const SWIPE_THRESHOLD = 60

  bubble.addEventListener("touchstart", (e) => {
    startX = e.touches[0].clientX
    isSwiping = true
  }, { passive: true })

  bubble.addEventListener("touchmove", (e) => {
    if (!isSwiping) return
    currentX = e.touches[0].clientX
    const diff = currentX - startX

    // Only allow swipe right
    if (diff > 0 && diff < 100) {
      bubble.style.transform = `translateX(${diff}px)`

      // Show reply icon hint
      if (diff > SWIPE_THRESHOLD) {
        bubble.style.borderLeft = "3px solid #3b82f6"
      } else {
        bubble.style.borderLeft = ""
      }
    }
  }, { passive: true })

  bubble.addEventListener("touchend", () => {
    const diff = currentX - startX
    isSwiping = false

    // Snap back
    bubble.style.transform = "translateX(0)"
    bubble.style.borderLeft = ""

    if (diff > SWIPE_THRESHOLD) {
      // Trigger reply
      setReply(msg)

      // Vibrate for haptic feedback
      if (navigator.vibrate) navigator.vibrate(40)
    }

    currentX = 0
    startX = 0
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

  const msgData = {
    user_id: userId,
    username,
    message: text
  }

  if (replyTo) {
    msgData.reply_to = replyTo.id
  }

  displayMessage({
    id: Date.now(),
    username,
    message: text,
    reply_to: replyTo?.id,
    _replyData: replyTo ? { ...replyTo } : null
  })

  const { error } = await db.from("chat_messages").insert(msgData)

  if(error){
    console.error(error)
    alert("❌ Not saved in DB")
    return
  }

  input.value = ""
  clearReply()
  updateInputUI()
}

/* ========================= */
/* LOAD MESSAGES */
/* ========================= */

async function loadMessages(){
  const { data } = await db
    .from("chat_messages")
    .select("*")
    .order("created_at", { ascending: true })

  messages.innerHTML = ""

  // First pass: populate messageMap
  data.forEach(msg => { messageMap[msg.id] = msg })

  // Second pass: display with reply context
  data.forEach(msg => {
    if (msg.reply_to) {
      msg._replyData = messageMap[msg.reply_to] || null
    }
    displayMessage(msg)
  })
}

loadMessages()

/* ========================= */
/* REALTIME */
/* ========================= */

db.channel("live-chat")
.on("postgres_changes",
  { event: "INSERT", schema: "public", table: "chat_messages" },
  (payload) => {
    if(payload.new.user_id !== userId){
      const msg = payload.new
      if (msg.reply_to) {
        msg._replyData = messageMap[msg.reply_to] || null
      }
      displayMessage(msg)
    }
  })
.subscribe()

/* ========================= */
/* GIF */
/* ========================= */

const GIPHY_API_KEY = "4O3KmphtX0AmuqeXjq61mvOdzYJWe8gN"

gifBtn.onclick = openGifPicker

async function openGifPicker(){
  const overlay = document.createElement("div")
  overlay.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:999"

  const box = document.createElement("div")
  box.style = "position:absolute;bottom:0;width:100%;height:50%;background:#0f172a;overflow-y:scroll;padding:10px"

  overlay.appendChild(box)
  document.body.appendChild(overlay)

  const res = await fetch(`https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=20`)
  const data = await res.json()

  data.data.forEach(gif => {
    const img = document.createElement("img")
    img.src = gif.images.fixed_height.url
    img.style = "width:100px;margin:5px;border-radius:10px"

    img.onclick = async () => {
      const insertData = {
        user_id: userId,
        username,
        media_url: gif.images.fixed_height.url
      }

      if (replyTo) insertData.reply_to = replyTo.id

      displayMessage({
        id: Date.now(),
        username,
        media_url: gif.images.fixed_height.url,
        reply_to: replyTo?.id,
        _replyData: replyTo ? { ...replyTo } : null
      })

      await db.from("chat_messages").insert(insertData)
      clearReply()
      overlay.remove()
    }

    box.appendChild(img)
  })

  overlay.onclick = () => overlay.remove()
}

/* ========================= */
/* EVENTS */
/* ========================= */

input.addEventListener("keydown", e => {
  if(e.key === "Enter") sendMessage()
})

sendBtn.addEventListener("click", sendMessage)

})
