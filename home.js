const feed = document.getElementById("feed")
const noPosts = document.getElementById("noPosts")

document.addEventListener("DOMContentLoaded", () => {

    if (!window.db) {
        console.error("Supabase not initialized")
        noPosts.innerText = "Cannot load posts"
        return
    }

    loadPosts()
})


// LOAD POSTS
async function loadPosts() {

    feed.innerHTML = ""

    const { data: posts, error } = await db
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false })

    if (error) {
        console.error(error)
        noPosts.innerText = "Error loading posts"
        return
    }

    if (!posts || posts.length === 0) {
        noPosts.style.display = "block"
        return
    }

    noPosts.style.display = "none"

    for (const post of posts) {

        // GET POST IMAGES
        const { data: images } = await db
            .from("post_images")
            .select("*")
            .eq("post_id", post.id)
            .order("position")

        let imagesHtml = ""

        if (images && images.length > 0) {

            imagesHtml = `<div class="flex gap-2 overflow-x-auto p-3">`

            for (const img of images) {
                imagesHtml += `
                <img src="${img.image_url}"
                onclick="openImage('${img.image_url}')"
                class="w-36 h-36 object-cover rounded-lg flex-shrink-0">
                `
            }

            imagesHtml += `</div>`
        }


        // GET LIKES
        const { data: likes } = await db
            .from("likes")
            .select("*")
            .eq("post_id", post.id)

        const likeCount = likes ? likes.length : 0
        // Check if current user liked this post
const { data: { session } } = await db.auth.getSession()
const currentUserId = session?.user?.id
const userLiked = likes && currentUserId
    ? likes.some(l => l.user_id === currentUserId)
    : false


        // GET COMMENTS COUNT
        const { data: comments } = await db
            .from("comments")
            .select("*")
            .eq("post_id", post.id)

        const commentCount = comments ? comments.length : 0


        // USER DISPLAY
        const nickname = post.nickname || ""
        const fullName = post.full_name || ""

        const displayName = nickname || fullName || "user"
        const letter = displayName.charAt(0).toUpperCase()


        const card = document.createElement("div")

        // divider line between posts
        card.className = "bg-slate-800 rounded-2xl overflow-hidden shadow border border-slate-700 mb-4"


        card.innerHTML = `

        <div class="flex items-center gap-3 p-3">

            <div class="w-10 h-10 rounded-full bg-cyan-500 flex items-center justify-center font-bold">
            ${letter}
            </div>

            <div>
                <p class="text-sm font-bold text-cyan-400">${displayName}</p>
                <p class="text-xs text-slate-400">${fullName}</p>
            </div>

        </div>

        ${imagesHtml}

        <div class="p-3 text-sm text-slate-200">
        ${post.caption || ""}
        </div>

        <div class="flex justify-between items-center p-3 border-t border-slate-700">

            <div class="flex gap-4 items-center">

                <button onclick="likePost('${post.id}')"
                class="text-slate-400 hover:text-red-400 flex items-center gap-1">

                <i data-lucide="heart" class="w-5 h-5"></i>

                <span id="likes-${post.id}" class="text-xs">${likeCount}</span>

                </button>

                <button onclick="openComments('${post.id}')"
                class="text-slate-400 hover:text-blue-400 flex items-center gap-1">

                <i data-lucide="message-circle" class="w-5 h-5"></i>

                <span class="text-xs">${commentCount}</span>

                </button>

            </div>

            <button onclick="deletePost('${post.id}','${post.user_id}')"
            class="text-red-400 hover:text-red-500">

            <i data-lucide="trash-2" class="w-5 h-5"></i>

            </button>

        </div>
        `

        feed.appendChild(card)

    }

    // RENDER ICONS
    lucide.createIcons()
}



// LIKE / UNLIKE
async function likePost(postId) {

    const { data: { session } } = await db.auth.getSession()

    if (!session) {
        alert("Login required")
        return
    }

    const user = session.user

    const { data: existing } = await db
        .from("likes")
        .select("*")
        .eq("post_id", postId)
        .eq("user_id", user.id)
        .maybeSingle()

    if (existing) {

        await db
        .from("likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", user.id)

    } else {

        await db
        .from("likes")
        .insert({
            post_id: postId,
            user_id: user.id
        })

    }

    updateLikes(postId)
}



// UPDATE LIKE COUNT
async function updateLikes(postId) {

    const { data: { session } } = await db.auth.getSession()
    const currentUserId = session?.user?.id

    const { data } = await db
        .from("likes")
        .select("*")
        .eq("post_id", postId)

    const count = data ? data.length : 0
    const userLiked = data && currentUserId
        ? data.some(l => l.user_id === currentUserId)
        : false

    document.getElementById("likes-" + postId).innerText = count

    const heart = document.getElementById("heart-" + postId)
    if (heart) {
        heart.style.fill = userLiked ? "red" : "none"
        heart.style.color = userLiked ? "red" : "#94a3b8"
    }
}



// DELETE POST
async function deletePost(postId, ownerId) {

    const { data: { session } } = await db.auth.getSession()

    if (!session) {
        alert("Login required")
        return
    }

    const user = session.user

    if (user.id !== ownerId) {
        alert("You cannot delete this post")
        return
    }

    const confirmDelete = confirm("Are you sure you want to delete this post?")

    if (!confirmDelete) return

    await db.from("post_images").delete().eq("post_id", postId)

    await db
        .from("posts")
        .delete()
        .eq("id", postId)

    location.reload()
}



// OPEN COMMENTS PAGE
function openComments(postId) {

    window.location.href = "comments.html?post=" + postId

}



// OPEN IMAGE FULLSCREEN
function openImage(url) {

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
