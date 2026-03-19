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

div.className = "mb-3"  // ALL LEFT SIDE

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

messages.appendChild(div)
messages.scrollTop = messages.scrollHeight

}



/* SEND MESSAGE */

async function sendMessage(){

const text = input.value.trim()
if(text === "") return

// 🔥 instant UI
displayMessage({
username: username,
message: text,
reply_to: replyToMessage
})

// send to DB
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



/* LOAD MESSAGES (last 10 hrs) */

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

// prevent duplicate
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



/* AUTO DELETE (10 hrs) */

async function deleteOldMessages(){

const tenHoursAgo = new Date(Date.now() - 10*60*60*1000).toISOString()

await db
.from("chat_messages")
.delete()
.lt("created_at", tenHoursAgo)

}

setInterval(deleteOldMessages, 600000)


})
