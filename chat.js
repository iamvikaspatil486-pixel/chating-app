document.addEventListener("DOMContentLoaded", () => {

const input = document.getElementById("msgInput")
const sendBtn = document.getElementById("sendBtn")
const voiceBtn = document.getElementById("voiceBtn")
const messages = document.querySelector(".messages")
const fileInput = document.querySelector('input[type="file"]')

if(!input || !sendBtn || !messages){
console.error("UI elements missing")
return
}

const db = window.db

/* USER */
let storedUser = null
try{
storedUser = JSON.parse(localStorage.getItem("anon_user"))
}catch(e){}

const username = storedUser?.name || "Anonymous"
const userId = storedUser?.id || crypto.randomUUID()

let replyToMessage = null
let longPressTimer = null

/* ========================= */
/* INPUT UI */
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

input.addEventListener("input", updateInputUI)
updateInputUI()

/* ========================= */
/* DISPLAY MESSAGE */
/* ========================= */

function displayMessage(msg){

const div = document.createElement("div")
div.className = "mb-3"
div.setAttribute("data-id", msg.id)

let replyHTML = msg.reply_to ? `
<div style="font-size:12px;opacity:0.7;border-left:2px solid #3b82f6;padding-left:6px;margin-bottom:4px;">
Reply to: ${msg.reply_to}
</div>` : ""

let mediaHTML = ""

if(msg.media_url){
if(msg.media_url.endsWith(".mp4")){
mediaHTML = `<video src="${msg.media_url}" controls style="max-width:200px;border-radius:10px;margin-top:5px;"></video>`
}else{
mediaHTML = `<img src="${msg.media_url}" style="max-width:200px;border-radius:10px;margin-top:5px;">`
}
}

div.innerHTML = `
<div style="font-size:11px;color:#9ca3af;">${msg.username}</div>
${replyHTML}
<div style="background:#1e293b;color:white;padding:10px 14px;border-radius:14px;display:inline-block;max-width:80%;">
${msg.message || ""}
${mediaHTML}
</div>
`

/* reply */
div.onclick = () => {
replyToMessage = msg.message
input.placeholder = "Replying..."
}

/* reactions trigger */
div.addEventListener("touchstart", () => {
longPressTimer = setTimeout(() => {
showReactions(msg.id)
}, 500)
})

div.addEventListener("touchend", () => {
clearTimeout(longPressTimer)
})

messages.appendChild(div)
messages.scrollTop = messages.scrollHeight

loadReactions(msg.id, div)
}

/* ========================= */
/* SEND TEXT */
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

/* ========================= */
/* 📸 IMAGE / GIF UPLOAD */
/* ========================= */

fileInput?.addEventListener("change", async (e) => {

const file = e.target.files[0]
if(!file) return

const fileName = Date.now() + "-" + file.name

const { data, error } = await db.storage
.from("chat-media")
.upload(fileName, file)

if(error){
console.error(error)
return
}

const { data: publicUrl } = db.storage
.from("chat-images")
.getPublicUrl(fileName)

const url = publicUrl.publicUrl

// show instantly
displayMessage({
id: Date.now(),
username,
media_url: url
})

// store in DB
await db.from("chat_messages").insert({
user_id: userId,
username,
media_url: url
})

})

/* ========================= */
/* LOAD MESSAGES */
/* ========================= */

async function loadMessages(){

const tenHoursAgo = new Date(Date.now() - 10*60*60*1000).toISOString()

const { data } = await db
.from("chat_messages")
.select("*")
.gt("created_at", tenHoursAgo)
.order("created_at", { ascending: true })

messages.innerHTML = ""
data.forEach(displayMessage)
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
displayMessage(payload.new)
}
})
.subscribe()

/* ========================= */
/* REACTIONS */
/* ========================= */

function showReactions(messageId){

const old = document.getElementById("reaction-picker")
if(old) old.remove()

const emojis = ["❤️","😂","🔥","👍"]

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

btn.onclick = async () => {
await addReaction(messageId, emoji)
picker.remove()
}

picker.appendChild(btn)
})

document.body.appendChild(picker)
}

/* 🔥 FIX: single reaction per user */

async function addReaction(messageId, emoji){

await db.from("reactions").delete()
.eq("message_id", messageId)
.eq("user_id", userId)

await db.from("reactions").insert({
message_id: messageId,
user_id: userId,
emoji
})
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
reactionDiv.style.marginTop = "4px"
reactionDiv.style.display = "flex"
reactionDiv.style.gap = "6px"

Object.keys(counts).forEach(emoji => {

const bubble = document.createElement("span")
bubble.style.background = "#1e293b"
bubble.style.padding = "2px 8px"
bubble.style.borderRadius = "12px"
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

})
