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
  document.getElementById("replyBar").style.display = "none"
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
bottomChat.insertBefore(replyBar, bottomChat.firstChild)
document.getElementById("cancelReply").addEventListener("click", clearReply)

/* ========================= */
/* CONTEXT MENU */
/* ========================= */
function showContextMenu(msg, bubble) {
  const existingMenu = document.getElementById("ctxMenu")
  if (existingMenu) existingMenu.remove()

  const menu = document.createElement("div")
  menu.id = "ctxMenu"
  menu.style = `
    position: fixed;
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 12px;
    overflow: hidden;
    z-index: 10000;
    min-width: 160px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.6);
    pointer-events: auto;
  `

  menu.innerHTML = `
    <button id="ctxEdit" style="display:block;width:100%;padding:14px 16px;background:none;border:none;color:white;font-size:15px;text-align:left;cursor:pointer;border-bottom:1px solid #334155;">
      ${msg.media_url ? '💬 Add Caption' : '✏️ Edit'}
    </button>
    <button id="ctxDelete" style="display:block;width:100%;padding:14px 16px;background:none;border:none;color:#f87171;font-size:15px;text-align:left;cursor:pointer;">🗑️ Delete</button>
  `

  document.body.appendChild(menu)

  const rect = bubble.getBoundingClientRect()
  const menuWidth = 160
  const menuHeight = 110
  let top = rect.top + (rect.height / 2)
  let left = rect.left + (rect.width / 2)
  if (left + menuWidth > window.innerWidth) left = window.innerWidth - menuWidth - 20
  if (top + menuHeight > window.innerHeight) top = window.innerHeight - menuHeight - 20
  if (left < 10) left = 10
  if (top < 10) top = 10
  menu.style.top = top + "px"
  menu.style.left = left + "px"

  document.getElementById("ctxEdit").addEventListener("click", (e) => {
    e.stopPropagation()
    menu.remove()
    const promptText = msg.media_url ? "Add a caption:" : "Edit message:"
    const newText = prompt(promptText, msg.message || "")
    if (newText !== null && newText.trim() !== msg.message) {
      editMessage(msg.id, newText.trim(), bubble)
    }
  })

  document.getElementById("ctxDelete").addEventListener("click", (e) => {
    e.stopPropagation()
    menu.remove()
    if (confirm("Delete this message?")) {
      deleteMessage(msg.id)
    }
  })

  const backdrop = document.createElement("div")
  backdrop.style = "position:fixed;inset:0;z-index:9999;"
  backdrop.id = "ctxBackdrop"
  document.body.insertBefore(backdrop, menu)

  backdrop.addEventListener("click", () => { backdrop.remove(); menu.remove() })
  backdrop.addEventListener("touchstart", () => { backdrop.remove(); menu.remove() })
}

/* ========================= */
/* EDIT MESSAGE */
/* ========================= */

async function editMessage(msgId, newText, bubble) {
  const { error } = await db
    .from("chat_messages")
    .update({ message: newText, edited: true })
    .eq("id", msgId)

  if (error) { alert("Edit failed"); return }

  const msgTextEl = bubble.querySelector(".msgText")
  if (msgTextEl) msgTextEl.textContent = newText

  let editedLabel = bubble.querySelector(".editedLabel")
  if (!editedLabel) {
    editedLabel = document.createElement("span")
    editedLabel.className = "editedLabel"
    editedLabel.style = "font-size:10px;color:#64748b;margin-left:6px;"
    editedLabel.textContent = "edited"
    bubble.appendChild(editedLabel)
  }

  if (messageMap[msgId]) {
    messageMap[msgId].message = newText
    messageMap[msgId].edited = true
  }
}

/* ========================= */
/* DELETE MESSAGE */
/* ========================= */

async function deleteMessage(msgId) {
  const { error } = await db
    .from("chat_messages")
    .delete()
    .eq("id", msgId)

  if (error) { alert("Delete failed"); return }

  const el = document.querySelector(`[data-id="${msgId}"]`)
  if (el) el.remove()
  delete messageMap[msgId]
}

/* ========================= */
/* REACTIONS */
/* ========================= */

const REACTION_EMOJIS = ["❤️", "😂", "😮", "😢", "🔥", "👍"]

// reactionCache: { [messageId]: [ { id, message_id, emoji, user_id, username } ] }
const reactionCache = {}

async function loadReactionsForMessages(msgIds) {
  if (!msgIds.length) return
  const { data, error } = await db
    .from("reactions")
    .select("*")
    .in("message_id", msgIds)
  if (error) return
  data.forEach(r => {
    if (!reactionCache[r.message_id]) reactionCache[r.message_id] = []
    // avoid duplicates
    if (!reactionCache[r.message_id].find(x => x.id === r.id)) {
      reactionCache[r.message_id].push(r)
    }
  })
}

function renderReactions(msgId, reactionsRow) {
  const reactions = reactionCache[msgId] || []

  // Group by emoji
  const groups = {}
  reactions.forEach(r => {
    if (!groups[r.emoji]) groups[r.emoji] = []
    groups[r.emoji].push(r)
  })

  reactionsRow.innerHTML = ""

  Object.entries(groups).forEach(([emoji, list]) => {
    const myReaction = list.find(r => r.user_id === userId)
    const chip = document.createElement("button")
    chip.className = "reaction-chip"
    chip.style = `
      display: inline-flex;
      align-items: center;
      gap: 3px;
      background: ${myReaction ? "rgba(59,130,246,0.25)" : "rgba(255,255,255,0.07)"};
      border: 1px solid ${myReaction ? "rgba(59,130,246,0.6)" : "rgba(255,255,255,0.1)"};
      border-radius: 20px;
      padding: 3px 8px;
      font-size: 14px;
      cursor: pointer;
      color: white;
      transition: transform 0.15s ease;
    `
    chip.innerHTML = `${emoji}<span style="font-size:11px;color:#94a3b8;">${list.length > 1 ? list.length : ""}</span>`

    chip.addEventListener("click", () => toggleReaction(msgId, emoji, reactionsRow))
    chip.addEventListener("touchstart", () => { chip.style.transform = "scale(1.2)" }, { passive: true })
    chip.addEventListener("touchend", () => { chip.style.transform = "scale(1)" }, { passive: true })

    reactionsRow.appendChild(chip)
  })
}

async function toggleReaction(msgId, emoji, reactionsRow) {
  if (!reactionCache[msgId]) reactionCache[msgId] = []
  const existing = reactionCache[msgId].find(r => r.user_id === userId)

  if (existing) {
    if (existing.emoji === emoji) {
      // Remove reaction
      await db.from("reactions").delete().eq("id", existing.id)
      reactionCache[msgId] = reactionCache[msgId].filter(r => r.id !== existing.id)
    } else {
      // Change reaction
      await db.from("reactions").update({ emoji }).eq("id", existing.id)
      existing.emoji = emoji
    }
  } else {
    // Add new reaction
    const { data, error } = await db
      .from("reactions")
      .insert({ message_id: msgId, emoji, user_id: userId, username })
      .select()
      .single()
    if (!error && data) reactionCache[msgId].push(data)
  }

  renderReactions(msgId, reactionsRow)
}

function showEmojiPicker(msgId, anchor, reactionsRow) {
  // Remove existing picker
  const existing = document.getElementById("emojiPicker")
  if (existing) { existing.remove(); return }

  const picker = document.createElement("div")
  picker.id = "emojiPicker"
  picker.style = `
    position: fixed;
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 30px;
    padding: 8px 10px;
    display: flex;
    gap: 6px;
    z-index: 10001;
    box-shadow: 0 8px 30px rgba(0,0,0,0.7);
    animation: popIn 0.15s cubic-bezier(0.34,1.56,0.64,1);
  `

  // Add CSS animation once
  if (!document.getElementById("emojiPickerStyle")) {
    const style = document.createElement("style")
    style.id = "emojiPickerStyle"
    style.textContent = `
      @keyframes popIn {
        from { transform: scale(0.5) translateY(10px); opacity: 0; }
        to   { transform: scale(1) translateY(0); opacity: 1; }
      }
      .reaction-chip:active { transform: scale(1.15); }
    `
    document.head.appendChild(style)
  }

  REACTION_EMOJIS.forEach(emoji => {
    const btn = document.createElement("button")
    btn.textContent = emoji
    btn.style = `
      font-size: 22px;
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px;
      border-radius: 50%;
      transition: transform 0.1s;
      line-height: 1;
    `
    btn.addEventListener("click", () => {
      picker.remove()
      backdrop.remove()
      toggleReaction(msgId, emoji, reactionsRow)
      if (navigator.vibrate) navigator.vibrate(20)
    })
    btn.addEventListener("mouseover", () => { btn.style.transform = "scale(1.3)" })
    btn.addEventListener("mouseout",  () => { btn.style.transform = "scale(1)" })
    picker.appendChild(btn)
  })

  document.body.appendChild(picker)

  // Position above the anchor
  const rect = anchor.getBoundingClientRect()
  const pickerWidth = REACTION_EMOJIS.length * 38 + 20
  let left = rect.left
  if (left + pickerWidth > window.innerWidth) left = window.innerWidth - pickerWidth - 10
  if (left < 5) left = 5
  const top = Math.max(rect.top - 60, 10)
  picker.style.top = top + "px"
  picker.style.left = left + "px"

  const backdrop = document.createElement("div")
  backdrop.style = "position:fixed;inset:0;z-index:10000;"
  document.body.insertBefore(backdrop, picker)
  backdrop.addEventListener("click", () => { picker.remove(); backdrop.remove() })
  backdrop.addEventListener("touchstart", () => { picker.remove(); backdrop.remove() }, { passive: true })
}

/* ========================= */
/* IMAGE UPLOAD */
/* ========================= */

fileInput.addEventListener("change", async (e) => {
  const file = e.target.files[0]
  if (!file) return

  const fileName = `chat/${Date.now()}-${file.name}`
  const { error: uploadError } = await db.storage.from("chat-images").upload(fileName, file)

  if (uploadError) { alert("Image upload failed"); return }

  const { data } = db.storage.from("chat-images").getPublicUrl(fileName)
  const publicUrl = data.publicUrl

  const insertData = { user_id: userId, username, media_url: publicUrl }
  if (replyTo) insertData.reply_to = replyTo.id

  const { data: inserted, error: insertError } = await db.from("chat_messages").insert(insertData).select().single()
  if (insertError) { alert("Failed to send image"); return }

  displayMessage({ ...inserted, _replyData: replyTo ? { ...replyTo } : null })
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
  } catch(e){ console.error("UI error:", e) }
}

input.addEventListener("input", updateInputUI)
updateInputUI()

/* ========================= */
/* DISPLAY MESSAGE */
/* ========================= */

const messageMap = {}

function displayMessage(msg){
  messageMap[msg.id] = msg

  const div = document.createElement("div")
  div.className = "mb-3"
  div.dataset.id = msg.id

  const isOwn = msg.username === username

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

  const editedHTML = msg.edited
    ? `<span class="editedLabel" style="font-size:10px;color:#64748b;margin-left:6px;">edited</span>`
    : ""

  const dotsHTML = `
    <button class="dotsBtn" style="
      position:absolute;
      top:6px;
      right:6px;
      background:none;
      border:none;
      color:#64748b;
      font-size:18px;
      cursor:pointer;
      padding:2px 6px;
      line-height:1;
    ">⋮</button>
  `

  div.innerHTML = `
    <div style="font-size:11px;color:#9ca3af;margin-bottom:2px;">${msg.username}</div>
    <div class="msgBubble" style="
      background:#1e293b;
      color:white;
      padding:10px 32px 10px 14px;
      border-radius:14px;
      display:inline-block;
      max-width:80%;
      position:relative;
      transition: transform 0.2s ease;
      user-select: none;
    ">
      ${replyHTML}
      <span class="msgText">${msg.message || ""}</span>
      ${editedHTML}
      ${mediaHTML}
      ${dotsHTML}
    </div>
    <div class="reactionsRow" style="
      display:flex;
      flex-wrap:wrap;
      gap:4px;
      margin-top:4px;
      margin-left:4px;
      min-height:0;
    "></div>
  `

  const bubble = div.querySelector(".msgBubble")
  const dotsBtn = div.querySelector(".dotsBtn")
  const reactionsRow = div.querySelector(".reactionsRow")

  // Render cached reactions if any
  if (reactionCache[msg.id]) renderReactions(msg.id, reactionsRow)

  // ── DOTS BUTTON ──
  dotsBtn.addEventListener("click", (e) => {
    e.stopPropagation()
    if (!isOwn) {
      const jokes = [
        "😂 Nice try!",
        "🚫 Not your message!",
        "👀 You can't touch this!",
        "u cant edit or delete this🙂",
      ]
      alert(jokes[Math.floor(Math.random() * jokes.length)])
      return
    }
    showContextMenu(msg, bubble)
  })

  // ── LONG PRESS → context menu (own) or emoji picker (others) ──
  let holdTimer = null

  bubble.addEventListener("touchstart", (e) => {
    holdTimer = setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(40)
      if (isOwn) {
        showContextMenu(msg, bubble)
      } else {
        showEmojiPicker(msg.id, bubble, reactionsRow)
      }
    }, 500)
  }, { passive: true })

  bubble.addEventListener("touchend",  () => clearTimeout(holdTimer))
  bubble.addEventListener("touchmove", () => clearTimeout(holdTimer))

  // ── DOUBLE TAP → quick ❤️ reaction ──
  let lastTap = 0
  bubble.addEventListener("touchend", (e) => {
    const now = Date.now()
    if (now - lastTap < 300) {
      toggleReaction(msg.id, "❤️", reactionsRow)
      if (navigator.vibrate) navigator.vibrate(20)
      // Floating heart animation
      const heart = document.createElement("span")
      heart.textContent = "❤️"
      heart.style = `
        position:fixed;
        font-size:28px;
        pointer-events:none;
        z-index:9999;
        animation: floatHeart 0.7s ease forwards;
        left: ${e.changedTouches[0].clientX - 14}px;
        top:  ${e.changedTouches[0].clientY - 14}px;
      `
      document.body.appendChild(heart)
      setTimeout(() => heart.remove(), 700)

      if (!document.getElementById("heartAnimStyle")) {
        const s = document.createElement("style")
        s.id = "heartAnimStyle"
        s.textContent = `@keyframes floatHeart { to { transform: translateY(-50px) scale(1.5); opacity:0; } }`
        document.head.appendChild(s)
      }
    }
    lastTap = now
  })

  // ── SWIPE RIGHT → reply ──
  let startX = 0, currentX = 0, isSwiping = false
  const SWIPE_THRESHOLD = 60

  bubble.addEventListener("touchstart", (e) => {
    startX = e.touches[0].clientX
    isSwiping = true
  }, { passive: true })

  bubble.addEventListener("touchmove", (e) => {
    if (!isSwiping) return
    currentX = e.touches[0].clientX
    const diff = currentX - startX
    if (diff > 0 && diff < 100) {
      bubble.style.transform = `translateX(${diff}px)`
      bubble.style.borderLeft = diff > SWIPE_THRESHOLD ? "3px solid #3b82f6" : ""
    }
  }, { passive: true })

  bubble.addEventListener("touchend", () => {
    const diff = currentX - startX
    isSwiping = false
    bubble.style.transform = "translateX(0)"
    bubble.style.borderLeft = ""
    if (diff > SWIPE_THRESHOLD) {
      setReply(msg)
      if (navigator.vibrate) navigator.vibrate(40)
    }
    currentX = 0
    startX = 0
  })

  // ── DESKTOP: right click → emoji picker ──
  bubble.addEventListener("contextmenu", (e) => {
    e.preventDefault()
    if (isOwn) showContextMenu(msg, bubble)
    else showEmojiPicker(msg.id, bubble, reactionsRow)
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

  const { data, error } = await db.from("chat_messages").insert(msgData).select().single()

  if(error){ console.error(error); alert("❌ Not saved in DB"); return }

  displayMessage({ ...data, _replyData: replyTo ? { ...replyTo } : null })
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
  data.forEach(msg => { messageMap[msg.id] = msg })

  // Load all reactions in one query
  await loadReactionsForMessages(data.map(m => m.id))

  data.forEach(msg => {
    if (msg.reply_to) msg._replyData = messageMap[msg.reply_to] || null
    displayMessage(msg)
  })
}

loadMessages()

/* ========================= */
/* REALTIME - MESSAGES */
/* ========================= */

db.channel("live-chat")
.on("postgres_changes",
  { event: "INSERT", schema: "public", table: "chat_messages" },
  (payload) => {
    if(payload.new.username !== username){
      const msg = payload.new
      if (msg.reply_to) msg._replyData = messageMap[msg.reply_to] || null
      displayMessage(msg)
    }
  })
.on("postgres_changes",
  { event: "UPDATE", schema: "public", table: "chat_messages" },
  (payload) => {
    const msg = payload.new
    const el = document.querySelector(`[data-id="${msg.id}"]`)
    if (!el) return
    const bubble = el.querySelector(".msgBubble")
    const msgTextEl = bubble?.querySelector(".msgText")
    if (msgTextEl) msgTextEl.textContent = msg.message || ""
    if (!bubble?.querySelector(".editedLabel")) {
      const editedLabel = document.createElement("span")
      editedLabel.className = "editedLabel"
      editedLabel.style = "font-size:10px;color:#64748b;margin-left:6px;"
      editedLabel.textContent = "edited"
      bubble?.appendChild(editedLabel)
    }
    if (messageMap[msg.id]) messageMap[msg.id].message = msg.message
  })
.on("postgres_changes",
  { event: "DELETE", schema: "public", table: "chat_messages" },
  (payload) => {
    const el = document.querySelector(`[data-id="${payload.old.id}"]`)
    if (el) el.remove()
    delete messageMap[payload.old.id]
  })
.subscribe()

/* ========================= */
/* REALTIME - REACTIONS */
/* ========================= */

db.channel("live-reactions")
.on("postgres_changes",
  { event: "INSERT", schema: "public", table: "reactions" },
  (payload) => {
    const r = payload.new
    if (!reactionCache[r.message_id]) reactionCache[r.message_id] = []
    if (!reactionCache[r.message_id].find(x => x.id === r.id)) {
      reactionCache[r.message_id].push(r)
    }
    const el = document.querySelector(`[data-id="${r.message_id}"]`)
    if (el) renderReactions(r.message_id, el.querySelector(".reactionsRow"))
  })
.on("postgres_changes",
  { event: "UPDATE", schema: "public", table: "reactions" },
  (payload) => {
    const r = payload.new
    if (reactionCache[r.message_id]) {
      const idx = reactionCache[r.message_id].findIndex(x => x.id === r.id)
      if (idx !== -1) reactionCache[r.message_id][idx] = r
    }
    const el = document.querySelector(`[data-id="${r.message_id}"]`)
    if (el) renderReactions(r.message_id, el.querySelector(".reactionsRow"))
  })
.on("postgres_changes",
  { event: "DELETE", schema: "public", table: "reactions" },
  (payload) => {
    const r = payload.old
    if (reactionCache[r.message_id]) {
      reactionCache[r.message_id] = reactionCache[r.message_id].filter(x => x.id !== r.id)
    }
    const el = document.querySelector(`[data-id="${r.message_id}"]`)
    if (el) renderReactions(r.message_id, el.querySelector(".reactionsRow"))
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

  const container = document.createElement("div")
  container.style = "position:absolute;bottom:0;width:100%;height:60%;background:#0f172a;border-radius:20px 20px 0 0;display:flex;flex-direction:column;"

  const searchBar = document.createElement("div")
  searchBar.style = "padding:12px;border-bottom:1px solid #1e293b;flex-shrink:0;"
  searchBar.innerHTML = `
    <input id="gifSearch" type="text" placeholder="Search GIFs..."
      style="width:100%;background:#1e293b;border:none;border-radius:10px;padding:10px 14px;color:white;font-size:14px;outline:none;">
  `

  const box = document.createElement("div")
  box.style = "flex:1;overflow-y:scroll;padding:10px;display:flex;flex-wrap:wrap;gap:6px;align-content:flex-start;"

  container.appendChild(searchBar)
  container.appendChild(box)
  overlay.appendChild(container)
  document.body.appendChild(overlay)

  async function loadGifs(query = "") {
    box.innerHTML = `<p style="color:#64748b;font-size:13px;width:100%;text-align:center;padding:20px;">Loading...</p>`
    const url = query
      ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=30`
      : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=30`
    const res = await fetch(url)
    const data = await res.json()
    box.innerHTML = ""
    if (!data.data.length) {
      box.innerHTML = `<p style="color:#64748b;font-size:13px;width:100%;text-align:center;padding:20px;">No GIFs found</p>`
      return
    }
    data.data.forEach(gif => {
      const img = document.createElement("img")
      img.src = gif.images.fixed_height_small.url
      img.style = "width:calc(33% - 4px);border-radius:8px;cursor:pointer;object-fit:cover;"
      img.onclick = async () => {
        const insertData = { user_id: userId, username, media_url: gif.images.fixed_height.url }
        if (replyTo) insertData.reply_to = replyTo.id
        const { data: inserted, error: insertError } = await db.from("chat_messages").insert(insertData).select().single()
        if (insertError) { alert("Failed to send GIF"); return }
        displayMessage({ ...inserted, _replyData: replyTo ? { ...replyTo } : null })
        clearReply()
        overlay.remove()
      }
      box.appendChild(img)
    })
  }

  let searchTimer = null
  document.getElementById("gifSearch").addEventListener("input", (e) => {
    clearTimeout(searchTimer)
    searchTimer = setTimeout(() => loadGifs(e.target.value.trim()), 500)
  })

  loadGifs()
  overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove() })
}

/* ========================= */
/* EVENTS */
/* ========================= */

input.addEventListener("keydown", e => { if(e.key === "Enter") sendMessage() })
sendBtn.addEventListener("click", sendMessage)

})

