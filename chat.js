document.addEventListener("DOMContentLoaded", () => {

const input = document.getElementById("msgInput")
const sendBtn = document.getElementById("sendBtn")
const voiceBtn = document.getElementById("voiceBtn")
const messages = document.querySelector(".messages")

const db = window.db

/* GET USER */
const storedUser = JSON.parse(localStorage.getItem("anon_user"))

const username = storedUser?.name || "Anonymous"
const userId = storedUser?.id || crypto.randomUUID()

/* REPLY STATE */
let replyToMessage = null
let longPressTimer = null



/* SEND BUTTON VISIBILITY */

input.addEventListener("input", () => {

if(input.value.trim() !== ""){
sendBtn.style.display = "block"
if(voiceBtn) voiceBtn.style.display = "none"
}else{
sendBtn.style.display = "none"
if(voiceBtn) voiceBtn.style.display = "block"
}

})



/* DISPLAY MESSAGE */

function displayMessage(msg){

const div = document.createElement("div")

div.className = "mb-3"

/* REPLY UI */
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

/* CLICK TO REPLY */
div.onclick = () => {
replyToMessage = msg.message
input.placeholder = "Replying..."
}

/* 📱 SWIPE + LONG PRESS */
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

/* DESKTOP RIGHT CLICK */
div.addEventListener("contextmenu", (e) => {
e.preventDefault()
showReactions(msg.id)
})

messages.appendChild(div)
messages.scrollTop = messages.scrollHeight

/* LOAD REACTIONS */
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

data.forEach(displayMessage)

}

loadMessages()



/* REALTIME */

db.channel("live-chat")
.on(
"postgres_changes",
{
event: "INSERT",
schema: "public",
table: "chat_messages"
},
(payload) => {

const msg = payload.new

if(msg.user_id === userId) return

displayMessage(msg)

}
)
.subscribe()



/* ENTER KEY */

input.addEventListener("keypress", (e) => {
if(e.key === "Enter"){
sendMessage()
}
})



/* BUTTON CLICK */

sendBtn.addEventListener("click", sendMessage)



/* AUTO DELETE */

async function deleteOldMessages(){

const tenHoursAgo = new Date(Date.now() - 10*60*60*1000).toISOString()

await db
.from("chat_messages")
.delete()
.lt("created_at", tenHoursAgo)

}

setInterval(deleteOldMessages, 600000)



/* ========================= */
/* 🔥 REACTIONS SYSTEM */
/* ========================= */

function showReactions(messageId){

const emojis = ["❤️","😂","🔥","🖕","👍"]

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
.select("*")
.eq("message_id", messageId)
.eq("user_id", userId)
.single()

if(data){

await db
.from("reactions")
.update({ emoji: emoji })
.eq("id", data.id)

}else{

await db
.from("reactions")
.insert({
message_id: messageId,
user_id: userId,
emoji: emoji
})

}

}



async function loadReactions(messageId, container){

const { data } = await db
.from("reactions")
.select("emoji")
.eq("message_id", messageId)

if(!data || data.length === 0) return

const reactionDiv = document.createElement("div")

reactionDiv.style.marginTop = "4px"
reactionDiv.style.fontSize = "14px"

reactionDiv.innerText = data.map(r => r.emoji).join(" ")

container.appendChild(reactionDiv)

}

})
