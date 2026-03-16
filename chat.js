document.addEventListener("DOMContentLoaded", async () => {

// elements
const popup = document.getElementById("usernamePopup")
const options = document.querySelectorAll(".usernameOption")
const customInput = document.getElementById("customUsername")
const startBtn = document.getElementById("startChat")

const chatContainer = document.getElementById("chatContainer")
const msgInput = document.getElementById("messageInput")
const sendBtn = document.getElementById("sendBtn")

let username = localStorage.getItem("chat_username")
let user = null

// get logged in user
const { data, error } = await db.auth.getUser()

if(error || !data.user){
    alert("Login required")
    window.location.href = "login.html"
    return
}

user = data.user

// if username already saved skip popup
if(username){
    popup.style.display = "none"
    loadMessages()
}

// username option click
options.forEach(opt => {

    opt.addEventListener("click", () => {

        username = opt.innerText

        options.forEach(o=>{
            o.style.background = "#334155"
        })

        opt.style.background = "#6366f1"

    })

})

// start chat
startBtn.addEventListener("click", () => {

    const customName = customInput.value.trim()

    if(customName !== ""){
        username = customName
    }

    if(!username){
        alert("Select or create username")
        return
    }

    localStorage.setItem("chat_username", username)

    popup.style.display = "none"

    loadMessages()

})

// load messages
async function loadMessages(){

    const { data } = await db
    .from("chat_messages")
    .select("*")
    .order("created_at",{ascending:true})

    chatContainer.innerHTML = ""

    data.forEach(renderMessage)

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
sendBtn.addEventListener("click", async ()=>{

    const text = msgInput.value.trim()

    if(text === "") return

    await db.from("chat_messages").insert({
        user_id: user.id,
        username: username,
        message: text
    })

    msgInput.value = ""

})

// send message with enter
msgInput.addEventListener("keypress",(e)=>{
    if(e.key === "Enter"){
        sendBtn.click()
    }
})

// realtime messages
db.channel("chat-room")
.on(
"postgres_changes",
{
event:"INSERT",
schema:"public",
table:"chat_messages"
},
(payload)=>{
    renderMessage(payload.new)
})
.subscribe()

})
