// get elements
const input = document.getElementById("msgInput")
const sendBtn = document.getElementById("sendBtn")
const messages = document.querySelector(".messages")

// get username from storage
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

// create message container
const msgBox = document.createElement("div")
msgBox.className = "mb-3"

// message design
msgBox.innerHTML = `
<div class="text-xs text-gray-400">${username}</div>
<div class="bg-blue-500 text-white px-4 py-2 rounded-xl inline-block">
${text}
</div>
`

// add message
messages.appendChild(msgBox)

// clear input
input.value = ""
sendBtn.style.display = "none"

// scroll to bottom
messages.scrollTop = messages.scrollHeight

}

// send button click
sendBtn.addEventListener("click", sendMessage)

// send when pressing enter
input.addEventListener("keypress", function(e){

if(e.key === "Enter"){
sendMessage()
}

})
