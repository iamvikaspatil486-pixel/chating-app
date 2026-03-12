const urlParams = new URLSearchParams(window.location.search)

const postId = urlParams.get("post")

const list = document.getElementById("commentsList")

loadComments()


async function loadComments(){

const {data} = await db
.from("comments")
.select("*")
.eq("post_id",postId)
.order("created_at")

list.innerHTML=""

data.forEach(c => {

const div=document.createElement("div")

div.className="bg-slate-800 p-3 rounded-lg"

div.innerHTML = `

<p class="text-sm">${c.comment}</p>

`

list.appendChild(div)

})

}



// SEND COMMENT
async function sendComment(){

const text=document.getElementById("commentInput").value

if(!text) return

const {data:{session}}=await db.auth.getSession()

const user=session.user


await db.from("comments").insert({

post_id:postId,
user_id:user.id,
comment:text

})

document.getElementById("commentInput").value=""

loadComments()

}



// GIF SEARCH
function openGifSearch(){

document.getElementById("gifPanel").classList.toggle("hidden")

}


document.getElementById("gifSearch")
.addEventListener("input",searchGif)



async function searchGif(){

const q=document.getElementById("gifSearch").value

if(!q) return


const res=await fetch(
"https://api.giphy.com/v1/gifs/search?api_key=YOUR_API_KEY&q="+q
)

const data=await res.json()

const results=document.getElementById("gifResults")

results.innerHTML=""

data.data.slice(0,9).forEach(g=>{

const img=document.createElement("img")

img.src=g.images.fixed_height.url

img.className="rounded"

img.onclick=()=>sendGif(img.src)

results.appendChild(img)

})

}



// SEND GIF
async function sendGif(url){

const {data:{session}}=await db.auth.getSession()

const user=session.user


await db.from("comments").insert({

post_id:postId,
user_id:user.id,
comment:`<img src="${url}" class="w-32">`

})

loadComments()

}
