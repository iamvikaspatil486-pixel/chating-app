document.addEventListener("DOMContentLoaded", () => {

const input = document.getElementById("msgInput")
const sendBtn = document.getElementById("sendBtn")
const voiceBtn = document.getElementById("voiceBtn")
const messages = document.querySelector(".messages")
function adjustPadding(){
const bottomBar = document.querySelector(".bottom-chat")
if(bottomBar){
messages.style.paddingBottom = bottomBar.offsetHeight + "px"
}
}

window.addEventListener("load", adjustPadding)
window.addEventListener("resize", adjustPadding)

/* 🔥 FIX: ensure elements exist */
if(!input || !sendBtn || !messages){
console.error("UI elements missing")
return
}

const db = window.db

/* 🔥 FIX: safe user parsing */
let storedUser = null
try{
storedUser = JSON.parse(localStorage.getItem("anon_user"))
}catch(e){
storedUser = null
}

const username = storedUser?.name || "Anonymous"
const userId = storedUser?.id || crypto.randomUUID()

/* REPLY STATE */
let replyToMessage = null
let longPressTimer = null



/* 🔥 FIX: force initial button state */
if(input.value.trim() !== ""){
sendBtn.style.display = "block"
if(voiceBtn) voiceBtn.style.display = "none"
}else{
sendBtn.style.display = "none"
if(voiceBtn) voiceBtn.style.display = "block"
}



/* 🔥 FIX: handle back/refresh */
window.addEventListener("pageshow", () => {
input.dispatchEvent(new Event("input"))
})



/* ========================= */
/* 🔥 TYPING INDICATOR */
/* ========================= */

let typingTimeout = null

input.addEventListener("input", async () => {

if(input.value.trim() !== ""){

sendBtn.style.display = "block"
if(voiceBtn) voiceBtn.style.display = "none"

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

sendBtn.style.display = "none"
if(voiceBtn) voiceBtn.style.display = "block"

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

if(!data || data.length === 0){
typingDiv.innerText = ""
return
}

const others = data.filter(u => u.user_id !== userId)

if(others.length > 0){
typingDiv.innerText = `${others[0].username} is typing...`
}else{
typingDiv.innerText = ""
}

}

setInterval(loadTyping, 2000)



/* DISPLAY MESSAGE */

function displayMessage(msg){

const div = document.createElement("div")
div.className = "mb-3"

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

let startX = 0

div.addEventListener("touchstart", (e) => {
startX = e.touches[0].clientX

longPressTimer = setTimeout(() => {
showReactions(msg.id)
}, 500)
})

div.addEventListener("touchmove", (e) => {
let moveX = e.touches[0].clientX - startX

if(moveX > 80){
replyToMessage = msg.message
input.placeholder = "Replying to: " + msg.username
div.style.transform = "translateX(20px)"
}
})

div.addEventListener("touchend", () => {
div.style.transform = "translateX(0)"
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



/* SEND MESSAGE */

async function sendMessage(){

const text = input.value.trim()
if(text === "") return

displayMessage({
username: username,
message: text,
reply_to: replyToMessage
})

await db?.from("online_users").update({ typing: false }).eq("user_id", userId)

const { error } = await db
.from("chat_messages")
.insert({
user_id: userId,
username: username,
message: text,
reply_to: replyToMessage
})

if(error){
console.error(error)
}

input.value = ""
replyToMessage = null
input.placeholder = "Message..."

sendBtn.style.display = "none"
if(voiceBtn) voiceBtn.style.display = "block"

}



/* LOAD MESSAGES */

async function loadMessages(){

const tenHoursAgo = new Date(Date.now() - 10*60*60*1000).toISOString()

const { data, error } = await db
.from("chat_messages")
.select("*")
.gt("created_at", tenHoursAgo)
.order("created_at", { ascending: true })

if(error){
console.error(error)
return
}

messages.innerHTML = ""
messages.appendChild(typingDiv)

data.forEach(displayMessage)

}

loadMessages()



/* REALTIME CHAT */

db.channel("live-chat")
.on("postgres_changes",
{ event: "INSERT", schema: "public", table: "chat_messages" },
(payload) => {
if(payload.new.user_id === userId) return
displayMessage(payload.new)
})
.subscribe()



/* REALTIME REACTIONS */

db.channel("reactions-live")
.on("postgres_changes",
{ event: "*", schema: "public", table: "reactions" },
() => loadMessages()
)
.subscribe()



input.addEventListener("keypress", (e) => {
if(e.key === "Enter") sendMessage()
})

sendBtn.addEventListener("click", sendMessage)



/* AUTO DELETE */

async function deleteOldMessages(){
const tenHoursAgo = new Date(Date.now() - 10*60*60*1000).toISOString()
await db.from("chat_messages").delete().lt("created_at", tenHoursAgo)
}

setInterval(deleteOldMessages, 600000)



/* REACTIONS */

function showReactions(messageId){

const oldPicker = document.getElementById("reaction-picker")
if(oldPicker) oldPicker.remove()

const emojis = ["❤️","😂","🔥","🖕","👍","💯","💔"]

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
picker.style.zIndex = "999"

emojis.forEach(emoji => {
const btn = document.createElement("span")
btn.innerText = emoji
btn.style.fontSize = "20px"
btn.style.cursor = "pointer"

btn.onclick = async () => {
await addReaction(messageId, emoji)
document.body.removeChild(picker)
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



/* GROUPED REACTIONS */

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
reactionDiv.style.marginTop = "4px"
reactionDiv.style.display = "flex"
reactionDiv.style.gap = "6px"
reactionDiv.style.flexWrap = "wrap"

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

})
