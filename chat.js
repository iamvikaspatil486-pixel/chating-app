const chatBox = document.getElementById("chatBox")
const msgInput = document.getElementById("msg")

let username = null
let replyTo = null

// PAGE LOAD

window.addEventListener("DOMContentLoaded", () => {

document.getElementById("chatBody").style.backgroundImage = "url('chatw.png')"
document.getElementById("chatBody").style.backgroundSize = "cover"

document.getElementById("usernameModal").style.display = "flex"

msgInput.disabled = true

})

// SELECT USERNAME

function setUsername(name){

username = name

sessionStorage.setItem("chatUsername", name)

document.getElementById("usernameModal").style.display = "none"

msgInput.disabled = false

loadMessages()

}

// CUSTOM USERNAME

function setCustomUsername(){

const name = document
.getElementById("customUsername")
.value.trim()

if(!name){

alert("Enter username")

return

}

setUsername(name)

}

// LOAD MESSAGES

async function loadMessages(){

if(!username) return

const {data,error} = await db
.from("chat_messages")
.select("*")
.order("created_at")

if(error){

console.log(error)

return

}

chatBox.innerHTML = ""

data.forEach(m => {

const div = document.createElement("div")

div.className = "bg-slate-800 p-2 rounded max-w-xs"

let replyHTML=""

if(m.reply_to){

replyHTML =
'<p class="text-xs text-gray-400">Replying...</p>'

}

div.innerHTML = `

<p class="text-xs text-cyan-400">${m.username}</p>${replyHTML}

${m.message}

<div class="flex gap-2 mt-1 text-sm"><span onclick="react('${m.id}','❤️')">❤️</span>
<span onclick="react('${m.id}','😂')">😂</span>
<span onclick="react('${m.id}','🔥')">🔥</span>
<span onclick="react('${m.id}','👍')">👍</span>

</div>`

// SWIPE TO REPLY

let startX = 0

div.addEventListener("touchstart",e=>{
startX = e.touches[0].clientX
})

div.addEventListener("touchend",e=>{

let endX = e.changedTouches[0].clientX

if(endX-startX > 80){

replyTo = m.id

alert("Reply mode activated")

}

})

chatBox.appendChild(div)

})

chatBox.scrollTop = chatBox.scrollHeight

}

// SEND MESSAGE

async function sendMsg(){

if(!username){

alert("Select username first")

return

}

const text = msgInput.value.trim()

if(!text) return

await db.from("chat_messages").insert({

username: username,

message: "<p>${text}</p>",

reply_to: replyTo

})

msgInput.value = ""

replyTo = null

loadMessages()

}

// SEND IMAGE / VIDEO

function sendMedia(){

const input = document.createElement("input")

input.type = "file"

input.accept = "image/,video/"

input.onchange = async () => {

const file = input.files[0]

const reader = new FileReader()

reader.onload = async function(){

let content=""

if(file.type.startsWith("video")){

content = "<video controls class="w-48 rounded"> <source src="${reader.result}"> </video>"

}else{

content = "<img src="${reader.result}" class="w-40 rounded">"

}

await db.from("chat_messages").insert({

username: username,
message: content

})

loadMessages()

}

reader.readAsDataURL(file)

}

input.click()

}

// VOICE MESSAGE

async function recordVoice(){

const stream = await navigator.mediaDevices.getUserMedia({audio:true})

const recorder = new MediaRecorder(stream)

let chunks=[]

recorder.ondataavailable = e => chunks.push(e.data)

recorder.onstop = async ()=>{

const blob = new Blob(chunks,{type:"audio/webm"})

const url = URL.createObjectURL(blob)

await db.from("chat_messages").insert({

username: username,

message: "<audio controls src="${url}"></audio>"

})

loadMessages()

}

recorder.start()

setTimeout(()=>recorder.stop(),5000)

}

// WALLPAPER FROM GALLERY

function selectWallpaper(){

const input = document.createElement("input")

input.type = "file"

input.accept = "image/*"

input.onchange = ()=>{

const file = input.files[0]

const reader = new FileReader()

reader.onload = function(){

document.getElementById("chatBody").style.backgroundImage =
"url(${reader.result})"

document.getElementById("chatBody").style.backgroundSize = "cover"

}

reader.readAsDataURL(file)

}

input.click()

}

// REACTION

async function react(id,emoji){

await db.from("reactions").insert({

message_id:id,
emoji:emoji

})

}

// AUTO REFRESH

setInterval(loadMessages,3000)

// LOGOUT

async function logout(){

sessionStorage.removeItem("chatUsername")

await db.auth.signOut()

location.href = "login.html"

}
