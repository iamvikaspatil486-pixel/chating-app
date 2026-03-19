document.addEventListener("DOMContentLoaded", () => {

const input = document.getElementById("msgInput")
const sendBtn = document.getElementById("sendBtn")
const voiceBtn = document.getElementById("voiceBtn")
const messages = document.querySelector(".messages")

/* 🔥 FIX: ensure elements exist */
if(!input || !sendBtn || !messages){
console.error("UI elements missing")
return
}

const db = window.db

/* 🔥 SAFE USER */
let storedUser = null
try{
storedUser = JSON.parse(localStorage.getItem("anon_user"))
}catch(e){
storedUser = null
}

const username = storedUser?.name || "Anonymous"
const userId = storedUser?.id || crypto.randomUUID()

let replyToMessage = null
let longPressTimer = null



/* ========================= */
/* 🔥 MESSAGE BAR FIX */
/* ========================= */

function adjustPadding(){
const bottomBar = document.querySelector(".bottom-chat")
if(bottomBar){
messages.style.paddingBottom = (bottomBar.offsetHeight + 10) + "px"
}
}

window.addEventListener("load", adjustPadding)
window.addEventListener("resize", adjustPadding)
adjustPadding()



/* ========================= */
/* SEND BUTTON STATE FIX */
/* ========================= */

function updateInputUI(){
if(input.value.trim() !== ""){
sendBtn.style.display = "block"
if(voiceBtn) voiceBtn.style.display = "none"
}else{
sendBtn.style.display = "none"
if(voiceBtn) voiceBtn.style.display = "block"
}
}

updateInputUI()

window.addEventListener("pageshow", () => {
updateInputUI()
})



/* ========================= */
/* TYPING INDICATOR */
/* ========================= */

let typingTimeout = null

input.addEventListener("input", async () => {

updateInputUI()

if(input.value.trim() !== ""){

await db?.from("online_users").upsert({
user_id: userId,
username: username,
typing: true,
last_seen: new Date().toISOString()
})

clearTimeout(typingTimeout)

typingTimeout = setTimeout(async () => {
await db?.from("online_users").update({ typing: false }).eq("user_id", userId)
}, 2000)

}else{
await db?.from("online_users").update({ typing: false }).eq("user_id", userId)
}

})



/* SHOW TYPING */

const typingDiv = document.createElement("div")
typingDiv.style.fontSize = "12px"
typingDiv.style.color = "#9ca3af"
typingDiv.style.padding = "5px"

messages.appendChild(typingDiv)

async function loadTyping(){

const { data } = await db
.from("online_users")
.select("*")
.eq("typing", true)

if(!data){
typingDiv.innerText = ""
return
}

const others = data.filter(u => u.user_id !== userId)

typingDiv.innerText = others.length > 0
? `${others[0].username} is typing...`
: ""

}

setInterval(loadTyping, 2000)



/* ========================= */
/* DISPLAY MESSAGE */
/* ========================= */

function displayMessage(msg){

const div = document.createElement("div")
div.className = "mb-3"
div.setAttribute("data-id", msg.id)

let replyHTML = ""

if(msg.reply_to){
replyHTML = `
<div style="font-size:12px;opacity:0.7;border-left:2px solid #3b82f6;padding-left:6px;margin-bottom:4px;">
Reply to: ${msg.reply_to}
</div>
`
}

div.innerHTML = `
<div style="font-size:11px;color:#9ca3af;">${msg.username}</div>
${replyHTML}
<div style="background:#1e293b;color:white;padding:10px 14px;border-radius:14px;display:inline-block;max-width:80%;">
${msg.message || ""}
</div>
`

div.onclick = () => {
replyToMessage = msg.message
input.placeholder = "Replying..."
}

/* LONG PRESS */

div.addEventListener("touchstart", () => {
longPressTimer = setTimeout(() => {
showReactions(msg.id)
}, 500)
})

div.addEventListener("touchend", () => {
clearTimeout(longPressTimer)
})

div.addEventListener("contextmenu", (e) => {
e.preventDefault()
showReactions(msg.id)
})

messages.appendChild(div)
messages.scrollTop = messages.scrollHeight

loadReactions(msg.id, div)

}



/* ========================= */
/* SEND MESSAGE */
/* ========================= */

async function sendMessage(){

const text = input.value.trim()
if(text === "") return

displayMessage({
id: Date.now(),
username,
message: text,
reply_to: replyToMessage
})

await db?.from("online_users").update({ typing: false }).eq("user_id", userId)

await db.from("chat_messages").insert({
user_id: userId,
username,
message: text,
reply_to: replyToMessage
})

input.value = ""
replyToMessage = null
input.placeholder = "Message..."

updateInputUI()

}



/* LOAD MESSAGES */

async function loadMessages(){

const tenHoursAgo = new Date(Date.now() - 10*60*60*1000).toISOString()

const { data } = await db
.from("chat_messages")
.select("*")
.gt("created_at", tenHoursAgo)
.order("created_at", { ascending: true })

messages.innerHTML = ""
messages.appendChild(typingDiv)

data.forEach(displayMessage)

}

loadMessages()



/* ========================= */
/* REALTIME CHAT */
/* ========================= */

db.channel("live-chat")
.on("postgres_changes",
{ event: "INSERT", schema: "public", table: "chat_messages" },
(payload) => {
if(payload.new.user_id !== userId){
displayMessage(payload.new)
}
})
.subscribe()



/* ========================= */
/* 🔥 REALTIME REACTIONS FIX */
/* ========================= */

db.channel("reactions-live")
.on("postgres_changes",
{ event: "INSERT", schema: "public", table: "reactions" },
(payload) => updateReactionUI(payload.new)
)
.on("postgres_changes",
{ event: "UPDATE", schema: "public", table: "reactions" },
(payload) => updateReactionUI(payload.new)
)
.subscribe()



function updateReactionUI(reaction){

const msgDiv = document.querySelector(`[data-id="${reaction.message_id}"]`)
if(!msgDiv) return

// remove old reactions
const old = msgDiv.querySelector(".reaction-box")
if(old) old.remove()

loadReactions(reaction.message_id, msgDiv)

}



/* ========================= */
/* REACTIONS */
/* ========================= */

function showReactions(messageId){

const old = document.getElementById("reaction-picker")
if(old) old.remove()

const emojis = ["❤️","😂","🔥","👍","💯"]

const picker = document.createElement("div")
picker.id = "reaction-picker"

picker.style.position = "fixed"
picker.style.bottom = "100px"
picker.style.left = "50%"
picker.style.transform = "translateX(-50%)"
picker.style.background = "#1e293b"
picker.style.padding = "10px"
picker.style.borderRadius = "20px"
picker.style.display = "flex"
picker.style.gap = "10px"

emojis.forEach(emoji => {
const btn = document.createElement("span")
btn.innerText = emoji
btn.style.fontSize = "20px"

btn.onclick = async () => {
await addReaction(messageId, emoji)
updateReactionUI({message_id: messageId}) // 🔥 instant
picker.remove()
}

picker.appendChild(btn)
})

document.body.appendChild(picker)

}



async function addReaction(messageId, emoji){

const { data } = await db
.from("reactions")
.update({ emoji })
.eq("message_id", messageId)
.eq("user_id", userId)
.select()

if(!data || data.length === 0){
await db.from("reactions").insert({
message_id: messageId,
user_id: userId,
emoji
})
}

}



/* LOAD REACTIONS */

async function loadReactions(messageId, container){

const { data } = await db
.from("reactions")
.select("emoji")
.eq("message_id", messageId)

if(!data || data.length === 0) return

const counts = {}

data.forEach(r => {
counts[r.emoji] = (counts[r.emoji] || 0) + 1
})

const reactionDiv = document.createElement("div")
reactionDiv.className = "reaction-box"
reactionDiv.style.marginTop = "4px"
reactionDiv.style.display = "flex"
reactionDiv.style.gap = "6px"

Object.keys(counts).forEach(emoji => {
const bubble = document.createElement("span")
bubble.style.background = "#1e293b"
bubble.style.padding = "2px 8px"
bubble.style.borderRadius = "12px"
bubble.style.fontSize = "12px"
bubble.innerText = `${emoji} ${counts[emoji]}`
reactionDiv.appendChild(bubble)
})

container.appendChild(reactionDiv)

}



/* EVENTS */

input.addEventListener("keypress", e => {
if(e.key === "Enter") sendMessage()
})

sendBtn.addEventListener("click", sendMessage)



/* AUTO DELETE */

setInterval(async () => {
const tenHoursAgo = new Date(Date.now() - 10*60*60*1000).toISOString()
await db.from("chat_messages").delete().lt("created_at", tenHoursAgo)
}, 600000)

})
