// elements
const popup = document.getElementById("usernamePopup")
const options = document.querySelectorAll(".usernameOption")
const customInput = document.getElementById("customUsername")
const startBtn = document.getElementById("startChat")

const chatContainer = document.getElementById("chatContainer")
const msgInput = document.getElementById("messageInput")
const sendBtn = document.getElementById("sendBtn")

let username = null
let user = null

// get logged user
async function initUser(){
    const { data } = await db.auth.getUser()
    user = data.user
}

initUser()

// select predefined username
options.forEach(opt=>{
    opt.addEventListener("click", ()=>{
        username = opt.innerText
        options.forEach(o=>o.style.background="#334155")
        opt.style.background="#6366f1"
    })
})

// start chat button
startBtn.onclick = ()=>{

    if(customInput.value.trim() !== ""){
        username = customInput.value.trim()
    }

    if(!username){
        alert("Select username")
        return
    }

    localStorage.setItem("chat_username", username)

    popup.style.display = "none"

    loadMessages()
}

// load messages
async function loadMessages(){

    const { data: messages } = await db
    .from("chat_messages")
    .select("*")
    .order("created_at", {ascending:true})

    chatContainer.innerHTML = ""

    messages.forEach(renderMessage)

}

// render message
function renderMessage(msg){

    const div = document.createElement("div")
    div.className = "message"

    div.innerHTML =
    "<b>"+msg.username+"</b><br>"+msg.message

    chatContainer.appendChild(div)

    chatContainer.scrollTop = chatContainer.scrollHeight
}

// send message
sendBtn.onclick = async ()=>{

    const text = msgInput.value.trim()

    if(text === "") return

    await db.from("chat_messages").insert({
        user_id: user.id,
        username: username,
        message: text
    })

    msgInput.value = ""
}

// realtime new messages
db.channel("chat-room")
.on(
"postgres_changes",
{
event: "INSERT",
schema: "public",
table: "chat_messages"
},
(payload)=>{
    renderMessage(payload.new)
}
)
.subscribe()
