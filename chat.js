document.addEventListener("DOMContentLoaded", () => {

const db = window.db

const input = document.getElementById("msgInput")
const sendBtn = document.getElementById("sendBtn")
const voiceBtn = document.getElementById("voiceBtn")
const messages = document.querySelector(".messages")
const fileInput = document.querySelector('input[type="file"]')
const gifBtn = document.getElementById("gifBtn")

if(!input || !sendBtn || !messages){
console.error("UI elements missing")
return
}

/* ========================= */
/* USER */
/* ========================= */

let storedUser = null
try{
storedUser = JSON.parse(localStorage.getItem("anon_user"))
}catch(e){}

const username = storedUser?.name || "User_" + Math.floor(Math.random()*1000)
const userId = storedUser?.id || crypto.randomUUID()

/* ========================= */
/* 🔔 ONESIGNAL (FIXED) */
/* ========================= */
window.OneSignalDeferred = window.OneSignalDeferred || [];

OneSignalDeferred.push(async function(OneSignal) {

  await OneSignal.init({
    appId: "4a955aa0-18a1-48ea-a2bf-7eb74d85eebc",
  });

  await OneSignal.Notifications.requestPermission();
  await OneSignal.login(userId);
  await OneSignal.User.addTag("username", username);

  console.log("✅ OneSignal initialized");

  // 🔥 DEBUG (FIXED)
  setTimeout(async () => {
    try {
      const permission = await OneSignal.Notifications.permission;
      const subId = await OneSignal.User.PushSubscription.id;

      alert(
        "Permission: " + permission + "\n" +
        "Subscription ID: " + subId
      );

      console.log("Permission:", permission);
      console.log("Subscription ID:", subId);

    } catch (e) {
      alert("Error: " + e.message);
    }
  }, 6000);

});

/* ========================= */
/* IMAGE UPLOAD */
/* ========================= */

fileInput.addEventListener("change", async (e) => {

const file = e.target.files[0]
if (!file) return

const fileName = `chat/${Date.now()}-${file.name}`

const { error: uploadError } = await db.storage
.from("chat-images")
.upload(fileName, file)

if (uploadError) {
console.error(uploadError)
alert("Image upload failed")
return
}

const { data } = db.storage
.from("chat-images")
.getPublicUrl(fileName)

const publicUrl = data.publicUrl

displayMessage({
id: Date.now(),
username,
media_url: publicUrl
})

await db.from("chat_messages").insert({
user_id: userId,
username,
media_url: publicUrl
})

fileInput.value = ""

})

/* ========================= */
/* INPUT UI */
/* ========================= */

function updateInputUI(){
  try {
    const hasText = input.value.trim().length > 0

    sendBtn.style.display = hasText ? "inline-block" : "none"

    if(voiceBtn){
      voiceBtn.style.display = hasText ? "none" : "inline-block"
    }
  } catch(e){
    console.error("UI error:", e)
  }
}

input.addEventListener("input", () => {
  console.log("Typing:", input.value) // debug
  updateInputUI()
})

updateInputUI()

/* ========================= */
/* DISPLAY MESSAGE */
/* ========================= */

function displayMessage(msg){

const div = document.createElement("div")
div.className = "mb-3"

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

messages.appendChild(div)
messages.scrollTop = messages.scrollHeight
}

/* ========================= */
/* SEND MESSAGE */
/* ========================= */
/* ========================= */
/* SEND MESSAGE */
/* ========================= */

async function sendMessage(){

  const text = input.value.trim()
  if(text === "") return

  displayMessage({
    id: Date.now(),
    username,
    message: text
  })

  const { error } = await db.from("chat_messages").insert({
    user_id: userId,
    username,
    message: text
  })

  if(error){
    console.error(error)
    alert("❌ Not saved in DB")
    return
  }

  // ✅ reset only after success
  input.value = ""
  updateInputUI()
}


/* ========================= */
/* LOAD MESSAGES */
/* ========================= */

async function loadMessages(){

const { data } = await db
.from("chat_messages")
.select("*")
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
/* GIF */
/* ========================= */

const GIPHY_API_KEY = "4O3KmphtX0AmuqeXjq61mvOdzYJWe8gN"

gifBtn.onclick = openGifPicker

async function openGifPicker(){

const overlay = document.createElement("div")
overlay.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:999"

const box = document.createElement("div")
box.style = "position:absolute;bottom:0;width:100%;height:50%;background:#0f172a;overflow-y:scroll;padding:10px"

overlay.appendChild(box)
document.body.appendChild(overlay)

const res = await fetch(`https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=20`)
const data = await res.json()

data.data.forEach(gif => {

const img = document.createElement("img")
img.src = gif.images.fixed_height.url
img.style = "width:100px;margin:5px;border-radius:10px"

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

/* EVENTS */

input.addEventListener("keydown", e => {
if(e.key === "Enter") sendMessage()
})

sendBtn.addEventListener("click", sendMessage)

})
