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
try{ storedUser = JSON.parse(localStorage.getItem("anon_user")) }catch(e){}

const username = storedUser?.name || "User_" + Math.floor(Math.random()*1000)
let userId = storedUser?.id || crypto.randomUUID()
// Always sync with real Supabase auth ID
db.auth.getUser().then(function(res) {
  if (res.data?.user?.id) {
    userId = res.data.user.id
    var u = JSON.parse(localStorage.getItem('anon_user') || '{}')
    u.id = userId
    localStorage.setItem('anon_user', JSON.stringify(u))
  }
})
/* ========================= */
/* REPLY STATE */
/* ========================= */

let replyTo = null

function setReply(msg) {
  replyTo = msg
  document.getElementById("replyName").textContent = msg.username
  document.getElementById("replyPreview").textContent = msg.message || "📷 Media"
  document.getElementById("replyBar").style.display = "flex"
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
replyBar.style = `display:none;align-items:center;justify-content:space-between;background:#1e293b;border-left:3px solid #3b82f6;padding:6px 10px;border-radius:8px;margin-bottom:4px;gap:8px;`
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
  menu.style = `position:fixed;background:#1e293b;border:1px solid #334155;border-radius:12px;overflow:hidden;z-index:10000;min-width:160px;box-shadow:0 10px 30px rgba(0,0,0,0.6);pointer-events:auto;`
  menu.innerHTML = `
    <button id="ctxEdit" style="display:block;width:100%;padding:14px 16px;background:none;border:none;color:white;font-size:15px;text-align:left;cursor:pointer;border-bottom:1px solid #334155;">${msg.media_url ? '💬 Add Caption' : '✏️ Edit'}</button>
    <button id="ctxDelete" style="display:block;width:100%;padding:14px 16px;background:none;border:none;color:#f87171;font-size:15px;text-align:left;cursor:pointer;">🗑️ Delete</button>
  `
  document.body.appendChild(menu)

  const rect = bubble.getBoundingClientRect()
  let top = rect.top + (rect.height / 2)
  let left = rect.left + (rect.width / 2)
  if (left + 160 > window.innerWidth) left = window.innerWidth - 180
  if (top + 110 > window.innerHeight) top = window.innerHeight - 130
  if (left < 10) left = 10
  if (top < 10) top = 10
  menu.style.top = top + "px"
  menu.style.left = left + "px"

  document.getElementById("ctxEdit").addEventListener("click", (e) => {
    e.stopPropagation(); menu.remove()
    const newText = prompt(msg.media_url ? "Add a caption:" : "Edit message:", msg.message || "")
    if (newText !== null && newText.trim() !== msg.message) editMessage(msg.id, newText.trim(), bubble)
  })
  document.getElementById("ctxDelete").addEventListener("click", (e) => {
    e.stopPropagation(); menu.remove()
    if (confirm("Delete this message?")) deleteMessage(msg.id)
  })

  const backdrop = document.createElement("div")
  backdrop.style = "position:fixed;inset:0;z-index:9999;"
  document.body.insertBefore(backdrop, menu)
  backdrop.addEventListener("click", () => { backdrop.remove(); menu.remove() })
  backdrop.addEventListener("touchstart", () => { backdrop.remove(); menu.remove() })
}

/* ========================= */
/* EDIT / DELETE */
/* ========================= */

async function editMessage(msgId, newText, bubble) {
  const { error } = await db.from("chat_messages").update({ message: newText, edited: true }).eq("id", msgId)
  if (error) { alert("Edit failed"); return }
  const msgTextEl = bubble.querySelector(".msgText")
  if (msgTextEl) msgTextEl.textContent = newText
  if (!bubble.querySelector(".editedLabel")) {
    const el = document.createElement("span")
    el.className = "editedLabel"
    el.style = "font-size:10px;color:#64748b;margin-left:6px;"
    el.textContent = "edited"
    bubble.appendChild(el)
  }
  if (messageMap[msgId]) { messageMap[msgId].message = newText; messageMap[msgId].edited = true }
}

async function deleteMessage(msgId) {
  const { error } = await db.from("chat_messages").delete().eq("id", msgId)
  if (error) { alert("Delete failed"); return }
  const el = document.querySelector(`[data-id="${msgId}"]`)
  if (el) el.remove()
  delete messageMap[msgId]
}

/* ========================= */
/* REACTIONS */
/* ========================= */

const REACTION_EMOJIS = ["❤️", "😂", "😮", "😢", "🔥", "👍"]
const reactionCache = {}

async function loadReactionsForMessages(msgIds) {
  if (!msgIds.length) return
  const { data, error } = await db.from("reactions").select("*").in("message_id", msgIds)
  if (error) return
  data.forEach(r => {
    if (!reactionCache[r.message_id]) reactionCache[r.message_id] = []
    if (!reactionCache[r.message_id].find(x => x.id === r.id)) reactionCache[r.message_id].push(r)
  })
}

function renderReactions(msgId, reactionsRow) {
  const reactions = reactionCache[msgId] || []
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
    chip.style = `display:inline-flex;align-items:center;gap:3px;background:${myReaction?"rgba(59,130,246,0.25)":"rgba(255,255,255,0.07)"};border:1px solid ${myReaction?"rgba(59,130,246,0.6)":"rgba(255,255,255,0.1)"};border-radius:20px;padding:3px 8px;font-size:14px;cursor:pointer;color:white;transition:transform 0.15s ease;`
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
      await db.from("reactions").delete().eq("id", existing.id)
      reactionCache[msgId] = reactionCache[msgId].filter(r => r.id !== existing.id)
    } else {
      await db.from("reactions").update({ emoji }).eq("id", existing.id)
      existing.emoji = emoji
    }
  } else {
    const { data, error } = await db.from("reactions").insert({ message_id: msgId, emoji, user_id: userId, username }).select().single()
    if (!error && data) reactionCache[msgId].push(data)
  }
  renderReactions(msgId, reactionsRow)
}

function showEmojiPicker(msgId, anchor, reactionsRow) {
  const existing = document.getElementById("emojiPicker")
  if (existing) { existing.remove(); return }

  const picker = document.createElement("div")
  picker.id = "emojiPicker"
  picker.style = `position:fixed;background:#1e293b;border:1px solid #334155;border-radius:30px;padding:8px 10px;display:flex;gap:6px;z-index:10001;box-shadow:0 8px 30px rgba(0,0,0,0.7);animation:popIn 0.15s cubic-bezier(0.34,1.56,0.64,1);`

  if (!document.getElementById("emojiPickerStyle")) {
    const style = document.createElement("style")
    style.id = "emojiPickerStyle"
    style.textContent = `@keyframes popIn{from{transform:scale(0.5) translateY(10px);opacity:0}to{transform:scale(1) translateY(0);opacity:1}} .reaction-chip:active{transform:scale(1.15);}`
    document.head.appendChild(style)
  }

  REACTION_EMOJIS.forEach(emoji => {
    const btn = document.createElement("button")
    btn.textContent = emoji
    btn.style = "font-size:22px;background:none;border:none;cursor:pointer;padding:4px;border-radius:50%;transition:transform 0.1s;line-height:1;"
    btn.addEventListener("click", () => {
      picker.remove(); backdrop.remove()
      toggleReaction(msgId, emoji, reactionsRow)
      if (navigator.vibrate) navigator.vibrate(20)
    })
    btn.addEventListener("mouseover", () => { btn.style.transform = "scale(1.3)" })
    btn.addEventListener("mouseout",  () => { btn.style.transform = "scale(1)" })
    picker.appendChild(btn)
  })

  document.body.appendChild(picker)
  const rect = anchor.getBoundingClientRect()
  const pickerWidth = REACTION_EMOJIS.length * 38 + 20
  let left = rect.left
  if (left + pickerWidth > window.innerWidth) left = window.innerWidth - pickerWidth - 10
  if (left < 5) left = 5
  picker.style.top = Math.max(rect.top - 60, 10) + "px"
  picker.style.left = left + "px"

  const backdrop = document.createElement("div")
  backdrop.style = "position:fixed;inset:0;z-index:10000;"
  document.body.insertBefore(backdrop, picker)
  backdrop.addEventListener("click", () => { picker.remove(); backdrop.remove() })
  backdrop.addEventListener("touchstart", () => { picker.remove(); backdrop.remove() }, { passive: true })
}

/* ========================= */
/* POLLS */
/* ========================= */

const pollCache = {} // { [pollId]: { poll, votes:[] } }

async function loadPollsForMessages(msgIds) {
  if (!msgIds.length) return
  const { data: polls } = await db.from("polls").select("*").in("message_id", msgIds)
  if (!polls || !polls.length) return
  const pollIds = polls.map(p => p.id)
  const { data: votes } = await db.from("poll_votes").select("*").in("poll_id", pollIds)
  polls.forEach(poll => {
    pollCache[poll.id] = { poll, votes: (votes || []).filter(v => v.poll_id === poll.id) }
  })
}

function renderPoll(pollId, container) {
  const cached = pollCache[pollId]
  if (!cached || !container) return
  const { poll, votes } = cached
  const options = poll.options
  const totalVotes = votes.length
  const myVotes = votes.filter(v => v.user_id === userId).map(v => v.option_index)

  container.innerHTML = ""

  const q = document.createElement("div")
  q.style = "font-size:14px;font-weight:bold;color:white;margin-bottom:8px;"
  q.textContent = "📊 " + poll.question
  container.appendChild(q)

  const typeLabel = document.createElement("div")
  typeLabel.style = "font-size:10px;color:#64748b;margin-bottom:8px;"
  typeLabel.textContent = poll.is_multiple ? "Multiple choice" : "Single choice"
  container.appendChild(typeLabel)

  options.forEach((opt, idx) => {
    const optVotes = votes.filter(v => v.option_index === idx).length
    const percent = totalVotes ? Math.round((optVotes / totalVotes) * 100) : 0
    const isMyVote = myVotes.includes(idx)

    const optDiv = document.createElement("div")
    optDiv.style = "margin-bottom:8px;cursor:pointer;"
    optDiv.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">
        <span style="font-size:13px;color:${isMyVote ? '#3b82f6' : '#e2e8f0'};">${isMyVote ? '✓ ' : ''}${opt}</span>
        <span style="font-size:11px;color:#64748b;">${optVotes} (${percent}%)</span>
      </div>
      <div style="background:#0f172a;border-radius:10px;height:6px;overflow:hidden;">
        <div style="height:100%;width:${percent}%;background:${isMyVote ? '#3b82f6' : '#334155'};border-radius:10px;transition:width 0.3s;"></div>
      </div>
    `
    optDiv.addEventListener("click", () => castVote(pollId, idx, container))
    container.appendChild(optDiv)
  })

  const total = document.createElement("div")
  total.style = "font-size:10px;color:#64748b;margin-top:4px;"
  total.textContent = `${totalVotes} vote${totalVotes !== 1 ? 's' : ''}`
  container.appendChild(total)
}

async function castVote(pollId, optionIndex, container) {
  const cached = pollCache[pollId]
  if (!cached) return
  const { poll, votes } = cached
  const myVotes = votes.filter(v => v.user_id === userId)

  if (!poll.is_multiple) {
    if (myVotes.length > 0) {
      const existing = myVotes[0]
      if (existing.option_index === optionIndex) {
        await db.from("poll_votes").delete().eq("id", existing.id)
        pollCache[pollId].votes = votes.filter(v => v.id !== existing.id)
        renderPoll(pollId, container)
        return
      }
      await db.from("poll_votes").delete().eq("id", existing.id)
      pollCache[pollId].votes = votes.filter(v => v.id !== existing.id)
    }
  } else {
    const existing = myVotes.find(v => v.option_index === optionIndex)
    if (existing) {
      await db.from("poll_votes").delete().eq("id", existing.id)
      pollCache[pollId].votes = votes.filter(v => v.id !== existing.id)
      renderPoll(pollId, container)
      return
    }
  }

  const { data, error } = await db.from("poll_votes")
    .insert({ poll_id: pollId, option_index: optionIndex, username, user_id: userId })
    .select().single()
  if (!error && data) pollCache[pollId].votes.push(data)
  renderPoll(pollId, container)
}

function showPollCreator() {
  const existing = document.getElementById("pollCreator")
  if (existing) { existing.remove(); return }

  const overlay = document.createElement("div")
  overlay.id = "pollCreator"
  overlay.style = "position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:999;display:flex;align-items:flex-end;"

  const panel = document.createElement("div")
  panel.style = "width:100%;background:#0f172a;border-radius:20px 20px 0 0;padding:20px;max-height:80vh;overflow-y:auto;"
  panel.innerHTML = `
    <div style="font-size:16px;font-weight:bold;color:white;margin-bottom:16px;">📊 Create Poll</div>
    <div style="margin-bottom:12px;">
      <div style="font-size:11px;color:#64748b;margin-bottom:4px;">QUESTION</div>
      <input id="pollQuestion" type="text" placeholder="Ask a question..." style="width:100%;background:#1e293b;border:1px solid #334155;border-radius:10px;padding:10px 12px;color:white;font-size:14px;outline:none;">
    </div>
    <div style="margin-bottom:12px;">
      <div style="font-size:11px;color:#64748b;margin-bottom:6px;">OPTIONS</div>
      <div id="pollOptions">
        <input type="text" placeholder="Option 1" class="pollOpt" style="width:100%;background:#1e293b;border:1px solid #334155;border-radius:10px;padding:9px 12px;color:white;font-size:13px;outline:none;margin-bottom:6px;display:block;">
        <input type="text" placeholder="Option 2" class="pollOpt" style="width:100%;background:#1e293b;border:1px solid #334155;border-radius:10px;padding:9px 12px;color:white;font-size:13px;outline:none;margin-bottom:6px;display:block;">
      </div>
      <button id="addPollOpt" style="background:none;border:1px dashed #334155;color:#64748b;width:100%;padding:8px;border-radius:10px;font-size:13px;cursor:pointer;">+ Add Option</button>
    </div>
    <div style="margin-bottom:16px;display:flex;align-items:center;gap:10px;">
      <input type="checkbox" id="pollMultiple" style="width:16px;height:16px;cursor:pointer;">
      <label for="pollMultiple" style="color:#9ca3af;font-size:13px;cursor:pointer;">Allow multiple choices</label>
    </div>
    <div style="display:flex;gap:10px;">
      <button id="pollCancel" style="flex:1;padding:12px;background:#1e293b;border:none;border-radius:10px;color:#9ca3af;font-size:14px;cursor:pointer;">Cancel</button>
      <button id="pollSubmit" style="flex:2;padding:12px;background:linear-gradient(135deg,#3b82f6,#2563eb);border:none;border-radius:10px;color:white;font-weight:bold;font-size:14px;cursor:pointer;">Send Poll</button>
    </div>
  `
  overlay.appendChild(panel)
  document.body.appendChild(overlay)

  document.getElementById("addPollOpt").addEventListener("click", () => {
    const opts = document.getElementById("pollOptions")
    const count = opts.querySelectorAll(".pollOpt").length + 1
    if (count > 6) { alert("Max 6 options"); return }
    const inp = document.createElement("input")
    inp.type = "text"
    inp.placeholder = `Option ${count}`
    inp.className = "pollOpt"
    inp.style = "width:100%;background:#1e293b;border:1px solid #334155;border-radius:10px;padding:9px 12px;color:white;font-size:13px;outline:none;margin-bottom:6px;display:block;"
    document.getElementById("pollOptions").appendChild(inp)
  })

  document.getElementById("pollCancel").addEventListener("click", () => overlay.remove())
  overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove() })

  document.getElementById("pollSubmit").addEventListener("click", async () => {
    const question = document.getElementById("pollQuestion").value.trim()
    const options = Array.from(document.querySelectorAll(".pollOpt")).map(o => o.value.trim()).filter(o => o !== "")
    const isMultiple = document.getElementById("pollMultiple").checked

    if (!question) { alert("Enter a question"); return }
    if (options.length < 2) { alert("Add at least 2 options"); return }

    const { data: msg, error: msgError } = await db.from("chat_messages")
      .insert({ user_id: userId, username, message: `📊 ${question}`, type: "poll" })
      .select().single()
    if (msgError) { alert("Failed to create poll"); return }

    const { data: poll, error: pollError } = await db.from("polls")
      .insert({ message_id: msg.id, question, options, is_multiple: isMultiple, created_by: username })
      .select().single()
    if (pollError) { alert("Failed to save poll"); return }

    pollCache[poll.id] = { poll, votes: [] }
    displayMessage({ ...msg, _pollId: poll.id })
    overlay.remove()
  })
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
  const insertData = { user_id: userId, username, media_url: data.publicUrl }
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
  const isPoll = msg.type === "poll" || msg._pollId

  let replyHTML = ""
  if (msg.reply_to) {
    const original = msg._replyData || messageMap[msg.reply_to]
    if (original) {
      replyHTML = `<div style="background:#0f172a;border-left:3px solid #3b82f6;border-radius:6px;padding:5px 8px;margin-bottom:5px;font-size:11px;color:#9ca3af;overflow:hidden;">
        <span style="color:#3b82f6;font-weight:bold;">${original.username}</span><br>
        <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block;">${original.message || "📷 Media"}</span>
      </div>`
    }
  }

  const mediaHTML = msg.media_url ? `<img src="${msg.media_url}" style="max-width:200px;border-radius:10px;margin-top:5px;">` : ""
  const editedHTML = msg.edited ? `<span class="editedLabel" style="font-size:10px;color:#64748b;margin-left:6px;">edited</span>` : ""
  const dotsHTML = `<button class="dotsBtn" style="position:absolute;top:6px;right:6px;background:none;border:none;color:#64748b;font-size:18px;cursor:pointer;padding:2px 6px;line-height:1;">⋮</button>`
  const pollContainerHTML = isPoll ? `<div class="pollContainer" style="margin-top:4px;min-width:220px;"></div>` : ""

  div.innerHTML = `
    <div style="font-size:11px;color:#9ca3af;margin-bottom:2px;">${msg.username}</div>
    <div class="msgBubble" style="background:#1e293b;color:white;padding:10px 32px 10px 14px;border-radius:14px;display:inline-block;max-width:85%;position:relative;transition:transform 0.2s ease;user-select:none;">
      ${replyHTML}
      <span class="msgText">${isPoll ? "" : (msg.message || "")}</span>
      ${editedHTML}
      ${mediaHTML}
      ${pollContainerHTML}
      ${dotsHTML}
    </div>
    <div class="reactionsRow" style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;margin-left:4px;"></div>
  `

  const bubble = div.querySelector(".msgBubble")
  const dotsBtn = div.querySelector(".dotsBtn")
  const reactionsRow = div.querySelector(".reactionsRow")

  // Render poll
  if (isPoll) {
    const pollContainer = div.querySelector(".pollContainer")
    const pollEntry = Object.values(pollCache).find(c => c.poll.message_id === msg.id)
    if (pollEntry) renderPoll(pollEntry.poll.id, pollContainer)
    else if (msg._pollId) renderPoll(msg._pollId, pollContainer)
  }

  if (reactionCache[msg.id]) renderReactions(msg.id, reactionsRow)

  // Dots
  dotsBtn.addEventListener("click", (e) => {
    e.stopPropagation()
    if (!isOwn) {
      const jokes = ["😂 Nice try!", "🚫 Not your message!", "👀 You can't touch this!", "u cant edit or delete this🙂"]
      alert(jokes[Math.floor(Math.random() * jokes.length)])
      return
    }
    showContextMenu(msg, bubble)
  })

  // Long press
  let holdTimer = null
  bubble.addEventListener("touchstart", () => {
    holdTimer = setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(40)
      if (isOwn) showContextMenu(msg, bubble)
      else showEmojiPicker(msg.id, bubble, reactionsRow)
    }, 500)
  }, { passive: true })
  bubble.addEventListener("touchend",  () => clearTimeout(holdTimer))
  bubble.addEventListener("touchmove", () => clearTimeout(holdTimer))

  // Double tap ❤️
  let lastTap = 0
  bubble.addEventListener("touchend", (e) => {
    const now = Date.now()
    if (now - lastTap < 300) {
      toggleReaction(msg.id, "❤️", reactionsRow)
      if (navigator.vibrate) navigator.vibrate(20)
      const heart = document.createElement("span")
      heart.textContent = "❤️"
      heart.style = `position:fixed;font-size:28px;pointer-events:none;z-index:9999;animation:floatHeart 0.7s ease forwards;left:${e.changedTouches[0].clientX - 14}px;top:${e.changedTouches[0].clientY - 14}px;`
      document.body.appendChild(heart)
      setTimeout(() => heart.remove(), 700)
      if (!document.getElementById("heartAnimStyle")) {
        const s = document.createElement("style")
        s.id = "heartAnimStyle"
        s.textContent = `@keyframes floatHeart{to{transform:translateY(-50px) scale(1.5);opacity:0;}}`
        document.head.appendChild(s)
      }
    }
    lastTap = now
  })

  // Swipe right → reply
  let startX = 0, currentX = 0, isSwiping = false
  bubble.addEventListener("touchstart", (e) => { startX = e.touches[0].clientX; isSwiping = true }, { passive: true })
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
    isSwiping = false
    bubble.style.transform = "translateX(0)"
    bubble.style.borderLeft = ""
    if (diff > 60) { setReply(msg); if (navigator.vibrate) navigator.vibrate(40) }
    currentX = 0; startX = 0
  })

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
  const { data } = await db.from("chat_messages").select("*").order("created_at", { ascending: true })
  messages.innerHTML = ""
  data.forEach(msg => { messageMap[msg.id] = msg })
  await loadReactionsForMessages(data.map(m => m.id))
  await loadPollsForMessages(data.map(m => m.id))
  data.forEach(msg => {
    if (msg.reply_to) msg._replyData = messageMap[msg.reply_to] || null
    displayMessage(msg)
  })
}

loadMessages()

/* ========================= */
/* REALTIME */
/* ========================= */

db.removeAllChannels()

db.channel("live-chat")
  .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, async (payload) => {
    if (payload.new.username !== username) {
      const msg = payload.new
      if (msg.reply_to) msg._replyData = messageMap[msg.reply_to] || null
      // Load poll if it's a poll message
      if (msg.type === "poll") await loadPollsForMessages([msg.id])
      displayMessage(msg)
    }
  })
  .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_messages" }, (payload) => {
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
  .on("postgres_changes", { event: "DELETE", schema: "public", table: "chat_messages" }, (payload) => {
    const el = document.querySelector(`[data-id="${payload.old.id}"]`)
    if (el) el.remove()
    delete messageMap[payload.old.id]
  })
  .subscribe()

db.channel("live-reactions")
  .on("postgres_changes", { event: "INSERT", schema: "public", table: "reactions" }, (payload) => {
    const r = payload.new
    if (!reactionCache[r.message_id]) reactionCache[r.message_id] = []
    if (!reactionCache[r.message_id].find(x => x.id === r.id)) reactionCache[r.message_id].push(r)
    const el = document.querySelector(`[data-id="${r.message_id}"]`)
    if (el) renderReactions(r.message_id, el.querySelector(".reactionsRow"))
  })
  .on("postgres_changes", { event: "UPDATE", schema: "public", table: "reactions" }, (payload) => {
    const r = payload.new
    if (reactionCache[r.message_id]) {
      const idx = reactionCache[r.message_id].findIndex(x => x.id === r.id)
      if (idx !== -1) reactionCache[r.message_id][idx] = r
    }
    const el = document.querySelector(`[data-id="${r.message_id}"]`)
    if (el) renderReactions(r.message_id, el.querySelector(".reactionsRow"))
  })
  .on("postgres_changes", { event: "DELETE", schema: "public", table: "reactions" }, (payload) => {
    const r = payload.old
    if (reactionCache[r.message_id]) reactionCache[r.message_id] = reactionCache[r.message_id].filter(x => x.id !== r.id)
    const el = document.querySelector(`[data-id="${r.message_id}"]`)
    if (el) renderReactions(r.message_id, el.querySelector(".reactionsRow"))
  })
  .subscribe()

db.channel("live-poll-votes")
  .on("postgres_changes", { event: "INSERT", schema: "public", table: "poll_votes" }, (payload) => {
    const v = payload.new
    if (v.user_id === userId) return
    if (pollCache[v.poll_id]) {
      if (!pollCache[v.poll_id].votes.find(x => x.id === v.id)) pollCache[v.poll_id].votes.push(v)
      const poll = pollCache[v.poll_id].poll
      const el = document.querySelector(`[data-id="${poll.message_id}"]`)
      if (el) renderPoll(v.poll_id, el.querySelector(".pollContainer"))
    }
  })
  .on("postgres_changes", { event: "DELETE", schema: "public", table: "poll_votes" }, (payload) => {
    const v = payload.old
    if (pollCache[v.poll_id]) {
      pollCache[v.poll_id].votes = pollCache[v.poll_id].votes.filter(x => x.id !== v.id)
      const poll = pollCache[v.poll_id].poll
      const el = document.querySelector(`[data-id="${poll.message_id}"]`)
      if (el) renderPoll(v.poll_id, el.querySelector(".pollContainer"))
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
  const container = document.createElement("div")
  container.style = "position:absolute;bottom:0;width:100%;height:60%;background:#0f172a;border-radius:20px 20px 0 0;display:flex;flex-direction:column;"
  const searchBar = document.createElement("div")
  searchBar.style = "padding:12px;border-bottom:1px solid #1e293b;flex-shrink:0;"
  searchBar.innerHTML = `<input id="gifSearch" type="text" placeholder="Search GIFs..." style="width:100%;background:#1e293b;border:none;border-radius:10px;padding:10px 14px;color:white;font-size:14px;outline:none;">`
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
    if (!data.data.length) { box.innerHTML = `<p style="color:#64748b;font-size:13px;width:100%;text-align:center;padding:20px;">No GIFs found</p>`; return }
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
/* POLL BUTTON */
/* ========================= */

const actionRow = document.querySelector(".action-row")
if (actionRow) {
  const pollBtn = document.createElement("button")
  pollBtn.className = "icon"
  pollBtn.textContent = "📊"
  pollBtn.title = "Create Poll"
  pollBtn.addEventListener("click", showPollCreator)
  actionRow.insertBefore(pollBtn, actionRow.firstChild)
}

/* ========================= */
/* EVENTS */
/* ========================= */

input.addEventListener("keydown", e => { if(e.key === "Enter") sendMessage() })
sendBtn.addEventListener("click", sendMessage)

})
