const input = document.getElementById("msgInput")
const sendBtn = document.getElementById("sendBtn")
const messages = document.querySelector(".messages")

// username from storage
const username = localStorage.getItem("username") || "Anonymous"

// show send button when typing
input.addEventListener("input", () => {

if(input.value.trim() !== ""){
sendBtn.style.display = "block"
}else{
sendBtn.style.display = "none"
}

})

// send message
function sendMessage(){

const text = input.value.trim()

if(text === "") return

const msg = document.createElement("div")

msg.className = "mb-3 text-right"

msg.innerHTML = `
<div class="text-xs text-gray-400">${username}</div>
<div class="bg-blue-500 px-4 py-2 inline-block rounded-xl">
${text}
</div>
`

messages.appendChild(msg)

input.value=""
sendBtn.style.display="none"

messages.scrollTop = messages.scrollHeight

}

// click send
sendBtn.addEventListener("click", sendMessage)

// enter key send
input.addEventListener("keypress", function(e){

if(e.key === "Enter"){
sendMessage()
}

})
