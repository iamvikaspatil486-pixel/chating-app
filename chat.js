const chatBox = document.getElementById("chatBox")

const randomNames=[
"SilentTiger",
"HiddenYogi",
"DarkCoder",
"GhostStudent",
"MysteryMind",
"ShadowNinja"
]

const name=randomNames[
Math.floor(Math.random()*randomNames.length)
]

loadMessages()

async function loadMessages(){

const {data} = await db
.from("chat_messages")
.select("*")
.order("created_at")

chatBox.innerHTML=""

data.forEach(m=>{

const div=document.createElement("div")

div.className="bg-slate-800 p-2 rounded max-w-xs"

div.innerHTML=`

<p class="text-xs text-cyan-400">${m.username}</p>
${m.message}
`chatBox.appendChild(div)

})

chatBox.scrollTop=chatBox.scrollHeight

}

async function sendMsg(){

const text=document.getElementById("msg").value

if(!text) return

await db.from("chat_messages").insert({

username:name,
message:"<p>${text}</p>"

})

document.getElementById("msg").value=""

loadMessages()

}

// TYPING INDICATOR

const input=document.getElementById("msg")

input.addEventListener("input",()=>{

document.getElementById("typing")
.classList.remove("hidden")

setTimeout(()=>{
document.getElementById("typing")
.classList.add("hidden")
},2000)

})

// WALLPAPER SETTINGS

function toggleWallpaper(){

document.getElementById("wallpaperPanel")
.classList.toggle("hidden")

}

function setWallpaper(type){

const body=document.getElementById("chatBody")

if(type==="dark")
body.style.background="#0f172a"

if(type==="space")
body.style.background="url(space.jpg)"

if(type==="ocean")
body.style.background="url(ocean.jpg)"

if(type==="forest")
body.style.background="url(forest.jpg)"

}

// LOGOUT

async function logout(){

await db.auth.signOut()

location.href="login.html"

}

// AUTO REFRESH CHAT

setInterval(loadMessages,3000)
