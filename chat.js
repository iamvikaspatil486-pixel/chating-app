const chatBox = document.getElementById("chatBox")

let username = "Anonymous"
let replyTo = null

// DEFAULT WALLPAPER
window.onload = () => {

document.getElementById("chatBody").style.background =
"url('chatw.png')"

document.getElementById("chatBody").style.backgroundSize = "cover"

}

// USERNAME SELECT

function setUsername(name){

username = name

document.getElementById("usernameModal").style.display = "none"

loadMessages()

}

// CUSTOM USERNAME

function setCustomUsername(){

const name =
document.getElementById("customUsername").value.trim()

if(!name){

alert("Enter username")

return

}

username = name

document.getElementById("usernameModal").style.display="none"

loadMessages()

}

// LOAD MESSAGES

async function loadMessages(){

const { data, error } = await db
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

let replyHTML = ""

if(m.reply_to){

replyHTML =
'<p class="text-xs text-gray-400">Replying to message</p>'

}

div.innerHTML = `

<p class="text-xs text-cyan-400">${m.username}</p>${replyHTML}

${m.message}

<div class="flex gap-2 mt-1 text-sm"><span onclick="react('${m.id}','❤️')">❤️</span>

<span onclick="react('${m.id}','😂')">😂</span>

<span onclick="react('${m.id}','🔥')">🔥</span>

<span onclick="react('${m.id}','👍')">👍</span>

</div>`

// SWIPE REPLY

let startX = 0

div.addEventListener("touchstart", e => {

startX = e.touches[0].clientX

})

div.addEventListener("touchend", e => {

let endX = e.changedTouches[0].clientX

if(endX - startX > 80){

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

const text = document.getElementById("msg").value

if(!text) return

await db.from("chat_messages").insert({

username: username,

message: "<p>${text}</p>",

reply_to: replyTo

})

replyTo = null

document.getElementById("msg").value = ""

loadMessages()

}

// REACTIONS

async function react(id,emoji){

await db.from("reactions").insert({

message_id: id,

emoji: emoji

})

}

// SEND MEDIA (IMAGE / VIDEO)

function sendMedia(){

const input = document.createElement("input")

input.type = "file"

input.accept = "image/,video/"

input.onchange = async () => {

const file = input.files[0]

const reader = new FileReader()

reader.onload = async function(){

let content = ""

if(file.type.startsWith("video")){

content = "<video controls class="w-48 rounded"> <source src="${reader.result}"> </video>"

}else{

content =
"<img src="${reader.result}" class="w-40 rounded">"

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

const stream =
await navigator.mediaDevices.getUserMedia({audio:true})

const recorder = new MediaRecorder(stream)

let chunks = []

recorder.ondataavailable =
e => chunks.push(e.data)

recorder.onstop = async () => {

const blob =
new Blob(chunks,{type:"audio/webm"})

const url =
URL.createObjectURL(blob)

await db.from("chat_messages").insert({

username: username,

message:
"<audio controls src="${url}"></audio>"

})

loadMessages()

}

recorder.start()

setTimeout(()=>recorder.stop(),5000)

}

// SELECT WALLPAPER FROM GALLERY

function selectWallpaper(){

const input = document.createElement("input")

input.type = "file"

input.accept = "image/*"

input.onchange = () => {

const file = input.files[0]

const reader = new FileReader()

reader.onload = function(){

document.getElementById("chatBody").style.background =
"url(${reader.result})"

document.getElementById("chatBody").style.backgroundSize = "cover"

}

reader.readAsDataURL(file)

}

input.click()

}

// GIF PANEL

function openGif(){

document
.getElementById("gifPanel")
.classList.toggle("hidden")

}

document
.getElementById("gifSearch")
.addEventListener("input", searchGif)

async function searchGif(){

const q =
document.getElementById("gifSearch").value

if(!q) return

const res = await fetch(

"https://api.giphy.com/v1/gifs/search?api_key=YOUR_GIPHY_KEY&q="+q

)

const data = await res.json()

const box =
document.getElementById("gifResults")

box.innerHTML = ""

data.data.slice(0,9).forEach(g => {

const img = document.createElement("img")

img.src = g.images.fixed_height.url

img.className = "rounded"

img.onclick = () => sendGif(img.src)

box.appendChild(img)

})

}

// SEND GIF

async function sendGif(url){

await db.from("chat_messages").insert({

username: username,

message:
"<img src="${url}" class="w-40 rounded">"

})

loadMessages()

}

// CREATE POLL

async function createPoll(){

const question = prompt("Poll Question")

const opt1 = prompt("Option 1")

const opt2 = prompt("Option 2")

await db.from("chat_messages").insert({

username: username,

message: `

<p class="font-bold">${question}</p><button onclick="vote('${opt1}')" class="bg-slate-700 p-1 rounded m-1">
${opt1}
</button><button onclick="vote('${opt2}')" class="bg-slate-700 p-1 rounded m-1">
${opt2}
</button>`

})

loadMessages()

}

function vote(option){

alert("You voted: " + option)

}

// LOGOUT

async function logout(){

await db.auth.signOut()

location.href = "login.html"

}

// AUTO REFRESH CHAT

setInterval(loadMessages,3000)
