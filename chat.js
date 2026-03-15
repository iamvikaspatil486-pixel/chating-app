const chatBox = document.getElementById("chatBox")
const msgInput = document.getElementById("msg")

let username = null


// PAGE LOAD

window.addEventListener("DOMContentLoaded",()=>{

// SET DEFAULT WALLPAPER

document.getElementById("chatBody").style.backgroundImage="url('chatw.png')"
document.getElementById("chatBody").style.backgroundSize="cover"

msgInput.disabled=true

const savedUser=sessionStorage.getItem("chatUsername")

if(savedUser){

username=savedUser

msgInput.disabled=false

document.getElementById("usernameModal").style.display="none"

loadMessages()

}

})


// SET USERNAME

function setUsername(name){

username=name

sessionStorage.setItem("chatUsername",name)

document.getElementById("usernameModal").style.display="none"

msgInput.disabled=false

setTimeout(()=>{
msgInput.focus()
},300)

loadMessages()

}


// CUSTOM USERNAME

function setCustomUsername(){

const name=document.getElementById("customUsername").value.trim()

if(!name){

alert("Enter username")

return

}

setUsername(name)

}


// LOAD MESSAGES

async function loadMessages(){

if(!username) return

const {data,error}=await db

.from("chat_messages")

.select("*")

.order("created_at")

if(error){

console.log(error)

return

}

chatBox.innerHTML=""

data.forEach(m=>{

const div=document.createElement("div")

div.className="bg-slate-800 p-2 rounded max-w-xs"

div.innerHTML=`
<p class="text-xs text-cyan-400">${m.username}</p>
${m.message}
`

chatBox.appendChild(div)

})

chatBox.scrollTop=chatBox.scrollHeight

}


// SEND MESSAGE

async function sendMsg(){

if(!username){

alert("Select username first")
return

}

const text=msgInput.value.trim()

if(!text) return

await db.from("chat_messages").insert({

username:username,
message:`<p>${text}</p>`

})

msgInput.value=""

loadMessages()

}


// AUTO REFRESH CHAT

setInterval(loadMessages,2000)


// LOGOUT

function logout(){

sessionStorage.removeItem("chatUsername")

if(typeof signOut === "function"){
signOut()
}

location.reload()

}
