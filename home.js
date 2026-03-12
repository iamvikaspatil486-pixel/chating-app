const feed = document.getElementById("feed")
const noPosts = document.getElementById("noPosts")

// Wait until DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
    if (!window.db) {
        console.error("Supabase client (db) not initialized yet!")
        noPosts.innerText = "Cannot load posts"
        return
    }
    loadPosts()
})

// LOAD POSTS
async function loadPosts() {
    const { data: posts, error } = await db
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false })

    if (error) {
        console.error("Error fetching posts:", error)
        noPosts.innerText = "Error loading posts"
        return
    }

    if (!posts || posts.length === 0) {
        noPosts.style.display = "block"
        return
    }

    noPosts.style.display = "none"

    for (const post of posts) {
        // ✅ GET ALL IMAGES from correct table
        const { data: images } = await db
            .from("post_images")   // <-- corrected table name
            .select("*")
            .eq("post_id", post.id)
            .order("position")

        // CREATE IMAGE HTML
        let imagesHtml = ""
        if (images && images.length > 0) {
            imagesHtml = `<div class="flex gap-2 overflow-x-auto p-3">`
            for (const img of images) {
                imagesHtml += `<img src="${img.image_url}" onclick="openImage('${img.image_url}')" class="w-36 h-36 object-cover rounded-lg flex-shrink-0">`
            }
            imagesHtml += `</div>`
        }

        // GET LIKE COUNT
        const { data: likes } = await db
            .from("likes")
            .select("*")
            .eq("post_id", post.id)

        const likeCount = likes.length

        // USER DISPLAY
        const nickname = post.nickname || post.full_name
        const fullName = post.full_name || ""
        const letter = nickname.charAt(0).toUpperCase()

        const card = document.createElement("div")
        card.className = "bg-slate-800 rounded-2xl overflow-hidden"

        card.innerHTML = `
        <div class="flex items-center gap-3 p-3">
            <div class="w-10 h-10 rounded-full bg-cyan-500 flex items-center justify-center font-bold">
                ${letter}
            </div>
            <div>
                <p class="text-sm font-bold text-cyan-400">@${nickname}</p>
                <p class="text-xs text-slate-400">${fullName}</p>
            </div>
        </div>

        ${imagesHtml}

        <div class="p-3 text-sm text-slate-200">
            ${post.caption || ""}
        </div>

        <div class="flex justify-between items-center p-3 border-t border-slate-700">
            <div class="flex gap-4 items-center">
                <button onclick="likePost('${post.id}')" class="text-slate-400 hover:text-red-400">
                    <i data-lucide="heart"></i>
                </button>
                <span id="likes-${post.id}" class="text-xs">${likeCount}</span>
                <button onclick="openComments('${post.id}')" class="text-slate-400 hover:text-blue-400">
                    <i data-lucide="message-circle"></i>
                </button>
            </div>
            <button onclick="deletePost('${post.id}','${post.user_id}')" class="text-red-400">
                <i data-lucide="trash-2"></i>
            </button>
        </div>
        `

        feed.appendChild(card)
    }

    lucide.createIcons()
}

// LIKE / DISLIKE
async function likePost(postId) {
    const { data: { session } } = await db.auth.getSession()
    if (!session) { alert("Login required"); return }
    const user = session.user

    const { data: existing } = await db
        .from("likes")
        .select("*")
        .eq("post_id", postId)
        .eq("user_id", user.id)
        .single()

    if (existing) {
        await db.from("likes").delete().eq("post_id", postId).eq("user_id", user.id)
    } else {
        await db.from("likes").insert({ post_id: postId, user_id: user.id })
    }

    updateLikes(postId)
}

// UPDATE LIKE COUNT
async function updateLikes(postId) {
    const { data } = await db.from("likes").select("*").eq("post_id", postId)
    document.getElementById("likes-" + postId).innerText = data.length
}

// DELETE POST
async function deletePost(postId, ownerId) {
    const { data: { session } } = await db.auth.getSession()
    const user = session.user
    if (user.id !== ownerId) { alert("You have not right to delete this post"); return }
    await db.from("posts").delete().eq("id", postId)
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
    body { margin:0; background:black; display:flex; align-items:center; justify-content:center; height:100vh; }
    img { max-width:100%; max-height:100%; }
    </style>
    <img src="${url}">
    `)
}
