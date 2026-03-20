document.addEventListener("DOMContentLoaded", () => {

const input = document.getElementById("msgInput")
const sendBtn = document.getElementById("sendBtn")
const voiceBtn = document.getElementById("voiceBtn")
const messages = document.querySelector(".messages")
const fileInput = document.querySelector('input[type="file"]')
const gifBtn = document.getElementById("gifBtn")
gifBtn.onclick = openGifPicker

if(!input || !sendBtn || !messages){
console.error("UI elements missing")
return
}

const db = window.db

/* ========================= */
/* 🔥 GIPHY API */
/* ========================= */
const GIPHY_API_KEY = "4O3KmphtX0AmuqeXjq61mvOdzYJWe8gN"

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
if(bottomBar){
const height = bottomBar.getBoundingClientRect().height
messages.style.paddingBottom = (height + 15) + "px"
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
/* DISPLAY MESSAGE */
/* ========================= */

function displayMessage(msg){

const div = document.createElement("div")
div.className = "mb-3"
div.setAttribute("data-id", msg.id)

let mediaHTML = msg.media_url
? `<img src="${msg.media_url}" style="max-width:200px;border-radius:10px;margin-top:5px;">`
: ""

div.innerHTML = `
<div style="font-size:11px;color:#9ca3af;">${msg.username}</div>
<div style="background:#1e293b;color:white;padding:10px 14px;border-radius:14px;display:inline-block;max-width:80%;">
${msg.message || ""}
${mediaHTML}
</div>
`

/* 🔥 SWIPE REPLY */
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
input.placeholder = "Replying..."
div.style.transform = "translateX(20px)"
}
})

div.addEventListener("touchend", () => {
div.style.transform = "translateX(0)"
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

loadReactions(reaction.message_id, msgDiv)
}

/* ========================= */
/* REACTIONS */
/* ========================= */

function showReactions(messageId){

const old = document.getElementById("reaction-overlay")
if(old) old.remove()

const emojis = ["❤️","😂","🔥","👍"]

const overlay = document.createElement("div")
overlay.id = "reaction-overlay"

overlay.style.position = "fixed"
overlay.style.top = "0"
overlay.style.left = "0"
overlay.style.width = "100%"
overlay.style.height = "100%"
overlay.style.zIndex = "998"

overlay.onclick = () => overlay.remove()

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
picker.style.zIndex = "999"

emojis.forEach(emoji => {

const btn = document.createElement("span")
btn.innerText = emoji

btn.onclick = async (e) => {
e.stopPropagation()

await db.from("reactions").delete()
.eq("message_id", messageId)
.eq("user_id", userId)

await db.from("reactions").insert({
message_id: messageId,
user_id: userId,
emoji
})

overlay.remove()
}

picker.appendChild(btn)
})

overlay.appendChild(picker)
document.body.appendChild(overlay)
}

/* ========================= */
/* LOAD REACTIONS */
/* ========================= */

async function loadReactions(messageId, container){

const { data } = await db
.from("reactions")
.select("emoji")
.eq("message_id", messageId)

if(!data) return

const old = container.querySelector(".reaction-box")
if(old) old.remove()

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

/* ========================= */
/* 🎬 GIF BUTTON */
/* ========================= */

const gifBtn = document.createElement("button")
gifBtn.innerText = "GIF"
gifBtn.style.fontSize = "16px"
gifBtn.style.color = "white"
gifBtn.style.marginLeft = "10px"

document.querySelector(".action-row")?.appendChild(gifBtn)

/* ========================= */
/* 🎬 GIF PICKER */
/* ========================= */

async function openGifPicker(){

const overlay = document.createElement("div")
overlay.style.position = "fixed"
overlay.style.top = "0"
overlay.style.left = "0"
overlay.style.width = "100%"
overlay.style.height = "100%"
overlay.style.background = "rgba(0,0,0,0.8)"
overlay.style.zIndex = "999"

const box = document.createElement("div")
box.style.position = "absolute"
box.style.bottom = "0"
box.style.width = "100%"
box.style.height = "50%"
box.style.background = "#0f172a"
box.style.overflowY = "scroll"
box.style.padding = "10px"

overlay.appendChild(box)
document.body.appendChild(overlay)

const res = await fetch(`https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=20`)
const data = await res.json()

data.data.forEach(gif => {

const img = document.createElement("img")
img.src = gif.images.fixed_height.url
img.style.width = "100px"
img.style.margin = "5px"
img.style.borderRadius = "10px"

img.onclick = async () => {

displayMessage({
id: Date.now(),
username,
media_url: gif.images.fixed_height.url
})

await db.from("chat_messages").insert({
user_id: userId,
username,
media_url: gif.images.fixed_height.url
})

overlay.remove()
}

box.appendChild(img)
})

overlay.onclick = () => overlay.remove()
}

gifBtn.onclick = openGifPicker

/* EVENTS */

input.addEventListener("keypress", e => {
if(e.key === "Enter") sendMessage()
})

sendBtn.addEventListener("click", sendMessage)

})
