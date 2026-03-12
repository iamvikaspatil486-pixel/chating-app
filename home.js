const feed = document.getElementById("feed")

loadPosts()


// LOAD POSTS
async function loadPosts(){

const { data:posts } = await db
.from("posts")
.select("*")
.order("created_at",{ascending:false})


if(!posts || posts.length === 0) return


document.getElementById("noPosts").style.display="none"


for(const post of posts){

// GET IMAGES
const { data:images } = await db
.from("post_images")
.select("*")
.eq("post_id",post.id)
.order("position")


const imageUrl = images[0]?.image_url || ""


// GET LIKE COUNT
const { data:likes } = await db
.from("likes")
.select("*")
.eq("post_id",post.id)


const likeCount = likes.length


const card = document.createElement("div")

card.className="bg-slate-800 rounded-2xl overflow-hidden"


card.innerHTML = `

<div class="flex items-center gap-3 p-3">

<div class="w-10 h-10 rounded-full bg-cyan-500 flex items-center justify-center font-bold">
U
</div>

<div>
<p class="text-sm font-bold text-cyan-400">@user</p>
</div>

</div>


<img src="${imageUrl}"
onclick="openImage('${imageUrl}')"
class="w-full aspect-square object-cover">


<div class="p-3 text-sm text-slate-200">
${post.caption || ""}
</div>


<div class="flex justify-between items-center p-3 border-t border-slate-700">

<div class="flex gap-4 items-center">

<button onclick="likePost('${post.id}')"
class="text-slate-400 hover:text-red-400">

<i data-lucide="heart"></i>

</button>

<span id="likes-${post.id}" class="text-xs">${likeCount}</span>


<button onclick="openComments('${post.id}')"
class="text-slate-400 hover:text-blue-400">

<i data-lucide="message-circle"></i>

</button>

</div>

</div>

`


feed.appendChild(card)

}


lucide.createIcons()

}



// LIKE POST
async function likePost(postId){

const {data:{session}} = await db.auth.getSession()

if(!session){

alert("Login required")
return

}

const user=session.user


await db
.from("likes")
.insert({

post_id:postId,
user_id:user.id

})


updateLikes(postId)

}



// UPDATE LIKE COUNT
async function updateLikes(postId){

const { data } = await db
.from("likes")
.select("*")
.eq("post_id",postId)


document.getElementById("likes-"+postId).innerText=data.length

}



// OPEN COMMENTS
function openComments(postId){

window.location.href="comments.html?post="+postId

}



// OPEN IMAGE FULLSCREEN
function openImage(url){

const win = window.open()

win.document.write(`

<style>

body{
margin:0;
background:black;
display:flex;
align-items:center;
justify-content:center;
height:100vh;
}

img{
max-width:100%;
max-height:100%;
}

</style>

<img src="${url}">

`)

}
