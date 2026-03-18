document.addEventListener("DOMContentLoaded", () => {

const input = document.getElementById("msgInput")
const sendBtn = document.getElementById("sendBtn")
const voiceBtn = document.getElementById("voiceBtn")
const messages = document.querySelector(".messages")

const db = window.db

const username = localStorage.getItem("username") || "Anonymous"



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



/* SEND MESSAGE */

async function sendMessage(){
async function sendMessage(){

const text = input.value.trim()
if(text === "") return

const { data, error } = await db
.from("chat_messages")
.insert({
username: username,
message: text
})
.select()

if(error){
console.error("Send message error:", error)
alert(error.message)
return
}

input.value=""

sendBtn.style.display="none"
if(voiceBtn) voiceBtn.style.display="block"

}


/* DISPLAY MESSAGE */

function displayMessage(msg){

const div = document.createElement("div")

const isMine = msg.username === username

div.className = isMine ? "mb-3 text-right" : "mb-3"

div.innerHTML = `
<div class="text-xs text-gray-400">${msg.username}</div>
<div class="${isMine ? "bg-blue-500" : "bg-gray-700"} text-white px-4 py-2 rounded-xl inline-block">
${msg.message || ""}
</div>
`

messages.appendChild(div)

messages.scrollTop = messages.scrollHeight

}



/* LOAD LAST 10 HOURS MESSAGES */

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



/* REALTIME CHAT */

db.channel("live-chat")

.on(
"postgres_changes",
{
event: "INSERT",
schema: "public",
table: "chat_messages"
},
(payload) => {

displayMessage(payload.new)

}
)

.subscribe()



/* ENTER KEY SEND */

input.addEventListener("keypress", (e) => {

if(e.key === "Enter"){
sendMessage()
}

})



/* SEND BUTTON CLICK */

sendBtn.addEventListener("click", sendMessage)



/* AUTO DELETE OLD MESSAGES */

async function deleteOldMessages(){

const tenHoursAgo = new Date(Date.now() - 10*60*60*1000).toISOString()

await db
.from("chat_messages")
.delete()
.lt("created_at", tenHoursAgo)

}

setInterval(deleteOldMessages, 600000) // every 10 minutes


})
