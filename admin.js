// Admin App Logic

document.addEventListener("DOMContentLoaded", () => {
    const isAdmin = sessionStorage.getItem('ASB_ADMIN_LOGGED_IN');
    if (isAdmin) showDashboard();
});

function handleAdminLogin(e) {
    e.preventDefault();
    const user = document.getElementById('admin-user').value.toUpperCase();
    const pass = document.getElementById('admin-pass').value.toUpperCase();

    if (user === 'AYESH' && pass === 'AYESH') {
        sessionStorage.setItem('ASB_ADMIN_LOGGED_IN', 'true');
        showDashboard();
    } else {
        alert('Access Denied! Please check your username and password.');
    }
}

function logoutAdmin() {
    sessionStorage.removeItem('ASB_ADMIN_LOGGED_IN');
    document.getElementById('admin-login').classList.remove('hidden');
    document.getElementById('admin-dashboard').classList.add('hidden');
}

function showDashboard() {
    document.getElementById('admin-login').classList.add('hidden');
    document.getElementById('admin-dashboard').classList.remove('hidden');
    loadMovies();
}

function previewFile(input, imgId) {
    if (input.files[0]) {
        document.getElementById(imgId).src = URL.createObjectURL(input.files[0]);
        document.getElementById(imgId).classList.remove('hidden');
        document.getElementById('poster-preview-container').classList.add('opacity-0');
    }
}

function updateFileName(input, textId, successText) {
    if (input.files[0]) {
        document.getElementById(textId).innerHTML = `<span class="text-white font-bold truncate block w-48">${input.files[0].name}</span><span class="text-[#e50914] text-xs">${successText}</span>`;
    }
}

async function loadMovies() {
    const query = document.getElementById('admin-search').value.toLowerCase();
    let movies = await db.movies.toArray();
    if (query) movies = movies.filter(m => m.title.toLowerCase().includes(query));
    movies.reverse();

    document.getElementById('movie-count').innerText = `${movies.length} Films`;
    const grid = document.getElementById('movie-grid');
    grid.innerHTML = '';

    if (!movies.length) return grid.innerHTML = '<div class="col-span-full py-20 text-center"><p>No movies.</p></div>';

    movies.forEach(m => {
        let posterSrc = m.posterBlob ? URL.createObjectURL(m.posterBlob) : m.poster;
        grid.innerHTML += `
            <div class="bg-[#181818] rounded border border-gray-800 p-4">
                <img src="${posterSrc}" class="w-full h-40 object-cover rounded mb-2">
                <h3 class="font-bold">${m.title}</h3>
                <p class="text-sm text-gray-400 mb-2">${m.genre}</p>
                <div class="flex gap-2">
                    <button onclick="editMovie(${m.id})" class="flex-1 bg-[#333] py-1 rounded hover:bg-white hover:text-black">Edit</button>
                    <button onclick="deleteMovie(${m.id})" class="w-10 bg-[#333] rounded hover:bg-[#e50914] flex justify-center items-center"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>`;
    });
}

async function saveMovie(e) {
    e.preventDefault();
    const isUpdating = document.getElementById('movie-id').value !== '';
    const mData = {
        title: document.getElementById('title').value,
        description: document.getElementById('description').value,
        genre: document.getElementById('genre').value,
        category: document.getElementById('category').value,
        year: document.getElementById('year').value,
        rating: document.getElementById('rating').value,
        ageRating: document.getElementById('ageRating').value,
        isNew: document.getElementById('isNew').checked,
        isTrending: document.getElementById('isTrending').checked,
        isTop10: document.getElementById('isTop10').checked
    };

    const poster = document.getElementById('poster-file').files[0];
    const video = document.getElementById('video-file').files[0];
    const sub = document.getElementById('sub-file').files[0];
    const trailer = document.getElementById('trailer-file').files[0];

    if (poster) mData.posterBlob = poster;
    else if (!isUpdating) mData.poster = 'https://via.placeholder.com/300x450.png?text=No+Poster';

    if (sub) mData.subtitleBlob = sub;

    document.getElementById('submit-btn').innerText = 'Saving...';

    if (isUpdating) {
        const id = parseInt(document.getElementById('movie-id').value);
        const existing = await db.movies.get(id);
        if (!poster) mData.posterBlob = existing.posterBlob;
        if (!sub) mData.subtitleBlob = existing.subtitleBlob;
        await db.movies.update(id, mData);
        if (video) await db.videos.put({ movieId: id, videoBlob: video });
        if (trailer) await db.trailers.put({ movieId: id, trailerBlob: trailer });
    } else {
        const newId = await db.movies.add(mData);
        if (video) await db.videos.put({ movieId: newId, videoBlob: video });
        if (trailer) await db.trailers.put({ movieId: newId, trailerBlob: trailer });
    }

    resetForm();
    loadMovies();
}

async function editMovie(id) {
    const m = await db.movies.get(id);
    document.getElementById('movie-id').value = m.id;
    document.getElementById('title').value = m.title;
    document.getElementById('description').value = m.description;
    document.getElementById('genre').value = m.genre;
    document.getElementById('category').value = m.category;
    document.getElementById('year').value = m.year;
    document.getElementById('rating').value = m.rating;
    document.getElementById('ageRating').value = m.ageRating || 'U';

    document.getElementById('submit-btn').innerText = 'Save Changes';
    document.getElementById('cancel-btn').classList.remove('hidden');

    if (m.posterBlob) {
        document.getElementById('poster-preview').src = URL.createObjectURL(m.posterBlob);
        document.getElementById('poster-preview').classList.remove('hidden');
        document.getElementById('poster-preview-container').classList.add('opacity-0');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function deleteMovie(id) {
    if (confirm('Delete?')) { 
        await db.movies.delete(id);
        await db.videos.delete(id);
        await db.trailers.delete(id);
        loadMovies(); 
    }
}

function resetForm() {
    document.getElementById('movie-form').reset();
    document.getElementById('movie-id').value = '';
    document.getElementById('poster-preview').classList.add('hidden');
    document.getElementById('poster-preview-container').classList.remove('opacity-0');
    document.getElementById('video-file-name').innerHTML = '<span class="font-semibold text-white">Select Video</span> from Gallery';
    document.getElementById('sub-file-name').innerHTML = '<span class="font-semibold text-white">Select Subtitle</span> from Gallery';
    document.getElementById('trailer-file-name').innerHTML = '<span class="font-semibold text-white">Select Trailer</span>';
    document.getElementById('submit-btn').innerText = 'Upload to ASB';
    document.getElementById('cancel-btn').classList.add('hidden');
}
