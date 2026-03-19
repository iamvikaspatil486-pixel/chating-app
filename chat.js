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

const username = storedUser?.name || "User_" + Math.floor(Math.random()*1000)
const userId = storedUser?.id || crypto.randomUUID()

let replyToMessage = null
let longPressTimer = null

/* ========================= */
/* 🔥 FIX MESSAGE HIDE */
/* ========================= */

function adjustPadding(){
const bottomBar = document.querySelector(".bottom-chat")
const preview = document.getElementById("previewBox")

let extra = 0
if(preview) extra = preview.offsetHeight

if(bottomBar){
const height = bottomBar.getBoundingClientRect().height
messages.style.paddingBottom = (height + extra + 15) + "px"
}
}

window.addEventListener("load", adjustPadding)
window.addEventListener("resize", adjustPadding)
window.visualViewport?.addEventListener("resize", adjustPadding)
setTimeout(adjustPadding, 300)

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
/* 🟢 ONLINE USERS */
/* ========================= */

setInterval(async () => {
await db.from("online_users").upsert({
user_id: userId,
username: username,
typing: false,
last_seen: new Date().toISOString()
})
}, 5000)

async function loadOnlineCount(){
const fiveSecAgo = new Date(Date.now() - 5000).toISOString()

const { data } = await db
.from("online_users")
.select("*")
.gt("last_seen", fiveSecAgo)

document.getElementById("onlineCount").innerText = `🟢 ${data?.length || 0}`
}

setInterval(loadOnlineCount, 3000)

/* ========================= */
/* ⌨️ TYPING INDICATOR */
/* ========================= */

let typingTimeout = null

input.addEventListener("input", async () => {

updateInputUI()

await db.from("online_users").upsert({
user_id: userId,
username: username,
typing: true,
last_seen: new Date().toISOString()
})

clearTimeout(typingTimeout)

typingTimeout = setTimeout(async () => {
await db.from("online_users")
.update({ typing: false })
.eq("user_id", userId)
}, 2000)

})

const typingDiv = document.createElement("div")
typingDiv.style.fontSize = "12px"
typingDiv.style.color = "#9ca3af"
messages.appendChild(typingDiv)

async function loadTyping(){

const { data } = await db
.from("online_users")
.select("*")
.eq("typing", true)

const others = data?.filter(u => u.user_id !== userId)

typingDiv.innerText = others?.length
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

let mediaHTML = ""

if(msg.media_url){
mediaHTML = `<img src="${msg.media_url}" style="max-width:200px;border-radius:10px;margin-top:5px;">`
}

div.innerHTML = `
<div style="font-size:11px;color:#9ca3af;">${msg.username}</div>
<div style="background:#1e293b;color:white;padding:10px 14px;border-radius:14px;display:inline-block;max-width:80%;">
${msg.message || ""}
${mediaHTML}
</div>
`

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
adjustPadding() // 🔥 important
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
message: text
})

await db.from("chat_messages").insert({
user_id: userId,
username,
message: text
})

input.value = ""
updateInputUI()
}

/* ========================= */
/* 📸 IMAGE UPLOAD */
/* ========================= */

fileInput?.addEventListener("change", async (e) => {

const file = e.target.files[0]
if(!file) return

const preview = document.createElement("div")
preview.id = "previewBox" // 🔥 important
preview.style.position = "fixed"
preview.style.bottom = "120px"
preview.style.left = "50%"
preview.style.transform = "translateX(-50%)"
preview.style.background = "#0f172a"
preview.style.padding = "10px"
preview.style.borderRadius = "10px"
preview.style.zIndex = "999"

preview.innerHTML = `
<img src="${URL.createObjectURL(file)}" style="max-width:200px;border-radius:10px;"><br>
<div id="progressText">Ready</div>
<button id="sendImageBtn">Send</button>
<button id="cancelImageBtn">Cancel</button>
`

document.body.appendChild(preview)
adjustPadding()

document.getElementById("cancelImageBtn").onclick = () => {
preview.remove()
adjustPadding()
}

document.getElementById("sendImageBtn").onclick = async () => {

const fileName = Date.now() + "-" + file.name

await db.storage.from("chat-images").upload(fileName, file)

const { data: publicUrl } = db.storage
.from("chat-images")
.getPublicUrl(fileName)

const url = publicUrl.publicUrl

displayMessage({
id: Date.now(),
username,
media_url: url
})

await db.from("chat_messages").insert({
user_id: userId,
username,
media_url: url
})

preview.remove()
adjustPadding()
}

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
messages.appendChild(typingDiv)

data.forEach(displayMessage)
adjustPadding()
}

loadMessages()

/* ========================= */
/* 🔥 REALTIME CHAT */
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
/* 🔥 REALTIME REACTIONS */
/* ========================= */

db.channel("reactions-live")
.on("postgres_changes",
{ event: "*", schema: "public", table: "reactions" },
(payload) => {
updateReactionUI(payload.new)
})
.subscribe()

function updateReactionUI(reaction){

const msgDiv = document.querySelector(`[data-id="${reaction.message_id}"]`)
if(!msgDiv) return

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

const emojis = ["❤️","😂","🔥","👍"]

const picker = document.createElement("div")

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

await db.from("reactions").delete()
.eq("message_id", messageId)
.eq("user_id", userId)

await db.from("reactions").insert({
message_id: messageId,
user_id: userId,
emoji
})

updateReactionUI({message_id: messageId}) // 🔥 instant update
picker.remove()
}

picker.appendChild(btn)
})

document.body.appendChild(picker)
}

async function loadReactions(messageId, container){

const { data } = await db
.from("reactions")
.select("emoji")
.eq("message_id", messageId)

if(!data) return

const counts = {}

data.forEach(r => {
counts[r.emoji] = (counts[r.emoji] || 0) + 1
})

const reactionDiv = document.createElement("div")
reactionDiv.className = "reaction-box"
reactionDiv.style.display = "flex"
reactionDiv.style.gap = "6px"
reactionDiv.style.marginTop = "4px"

Object.keys(counts).forEach(emoji => {
const span = document.createElement("span")
span.innerText = `${emoji} ${counts[emoji]}`
reactionDiv.appendChild(span)
})

container.appendChild(reactionDiv)
}

/* EVENTS */

input.addEventListener("keypress", e => {
if(e.key === "Enter") sendMessage()
})

sendBtn.addEventListener("click", sendMessage)

})
