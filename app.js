// State variables
let currentUser = null;
let currentProfile = null;
let hls = null;
let currentMovie = null;

const objectUrlCache = {};
function getBlobUrl(id, desc, blob) {
    const key = id + "_" + desc;
    if (objectUrlCache[key]) return objectUrlCache[key];
    const url = URL.createObjectURL(blob);
    objectUrlCache[key] = url;
    return url;
}

// UI Utilities
function showToast(msg) {
    const t = document.getElementById('toast');
    t.innerText = msg;
    t.classList.remove('translate-x-full');
    setTimeout(() => t.classList.add('translate-x-full'), 3000);
}

// Routing logic
const views = ['home', 'search', 'browse', 'details', 'player', 'mylist', 'downloads', 'profile', 'settings', 'intro'];
function hideAllViews() {
    views.forEach(v => {
        const el = document.getElementById(`${v}-view`);
        if (el) el.classList.add('hidden');
    });
}

function navigate(view, data = null) {
    if (view === 'player' && data) setupPlayer(data);
    else if (view === 'details' && data) setupDetails(data);

    if (view === 'home') renderHome();
    else if (view === 'search') {
        document.getElementById('search-input').value = '';
        document.getElementById('search-results').innerHTML = '';
        document.getElementById('search-empty').classList.remove('hidden');
    } else if (view === 'browse') filterBrowse();
    else if (view === 'mylist') renderMyList();
    else if (view === 'downloads') renderDownloads();
    else if (view === 'profile') {
        renderProfilesList();
        document.getElementById('bottom-nav').classList.add('hidden');
        document.getElementById('navbar').classList.add('hidden');
    }

    hideAllViews();
    const targetEl = document.getElementById(`${view}-view`);
    if (targetEl) targetEl.classList.remove('hidden');
    
    if(view !== 'player' && view !== 'profile') {
        document.getElementById('app-content').scrollTo({top: 0, behavior: 'smooth'});
    }

    document.querySelectorAll('.nav-btn').forEach(btn => {
        if(btn.dataset.target === view) {
            btn.classList.add('text-white');
            btn.classList.remove('text-gray-500');
        } else {
            btn.classList.remove('text-white');
            btn.classList.add('text-gray-500');
        }
    });

    if (['player', 'profile', 'splash', 'onboarding', 'auth'].includes(view)) {
        document.getElementById('navbar').classList.add('hidden');
        document.getElementById('bottom-nav').classList.add('hidden');
    } else {
        if(view !== 'details') document.getElementById('navbar').classList.remove('hidden');
        if(window.innerWidth < 768) document.getElementById('bottom-nav').classList.remove('hidden');
    }
}

document.addEventListener("DOMContentLoaded", () => {
    // Faster Startup Sequence
    const initApp = async () => {
        const splash = document.getElementById('splash-screen');
        try {
            // Check DB and User State
            const usersCount = await db.users.count();
            const savedId = localStorage.getItem('ASB_USER_ID');
            
            // Hide Splash
            if (splash) {
                splash.classList.add('opacity-0');
                setTimeout(() => splash.classList.add('hidden'), 500);
            }

            if (usersCount === 0) {
                document.getElementById('onboarding-screen').classList.remove('hidden');
            } else if (savedId) {
                await loginUserById(parseInt(savedId));
            } else {
                document.getElementById('auth-screen').classList.remove('hidden');
            }
        } catch (err) {
            console.error("Initialization error:", err);
            // Emergency Cleanup
            if (splash) splash.classList.add('hidden');
            document.getElementById('auth-screen').classList.remove('hidden');
            
            // If DB is totally corrupted, offer repair in console or auto-trigger
            if (err.name === 'DatabaseClosedError' || err.name === 'VersionError') {
                db.close();
                Dexie.delete("ASBMoviesDB").then(() => window.location.reload());
            }
        }
    };
    
    // Start with a small delay for branding impact, but not too long
    setTimeout(initApp, 800);
});

let onboardStep = 1;
function nextOnboarding() {
    onboardStep++;
    const title = document.getElementById('onboard-title');
    const desc = document.getElementById('onboard-desc');
    
    document.getElementById('dot1').className = "h-2 w-2 bg-gray-600 rounded-full transition-all duration-300";
    document.getElementById('dot2').className = "h-2 w-2 bg-gray-600 rounded-full transition-all duration-300";
    document.getElementById('dot3').className = "h-2 w-2 bg-gray-600 rounded-full transition-all duration-300";

    if (onboardStep === 2) {
        title.innerText = "Download and watch offline";
        desc.innerText = "Always have something to watch.";
        document.getElementById('dot2').className = "h-2 w-8 bg-netflixRed rounded-full shadow-lg";
    } else if (onboardStep === 3) {
        title.innerText = "No pesky contracts";
        desc.innerText = "Join today, cancel anytime.";
        document.getElementById('dot3').className = "h-2 w-8 bg-netflixRed rounded-full shadow-lg";
    } else {
        skipOnboarding();
    }
}

function skipOnboarding() {
    document.getElementById('onboarding-screen').classList.add('hidden');
    document.getElementById('auth-screen').classList.remove('hidden');
}

let isLoginMode = true;
async function handleAuth(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (isLoginMode) {
        const user = await db.users.where('email').equals(email).first();
        if (user && user.password === password) await loginUserById(user.id);
        else alert('Invalid email or password.');
    }
}

async function guestLogin() {
    let email = "guest@asbmovies.com";
    const existing = await db.users.where('email').equals(email).first();
    let userId = existing ? existing.id : await db.users.add({ email, password: 'guest' });
    if(!existing) await db.profiles.add({ userId, name: 'Guest', isKids: false });
    await loginUserById(userId);
}

// Netflix client-side SRT to VTT converter feature
window.loadLocalSubtitle = async function(input) {
    if(input.files[0]) {
        const file = input.files[0];
        let url = URL.createObjectURL(file);
        
        if(file.name.endsWith('.srt')) {
            const text = await file.text();
            // Convert standard SRT timestamps to VTT format easily
            let vtt = "WEBVTT\n\n" + text.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2");
            const blob = new Blob([vtt], {type: 'text/vtt'});
            url = URL.createObjectURL(blob);
        }
        
        const track = document.getElementById('video-subs');
        track.src = url;
        track.default = true;
        
        const video = document.getElementById('hls-video');
        for(let i = 0; i < video.textTracks.length; i++) {
            video.textTracks[i].mode = 'hidden';
        }
        setTimeout(() => {
            if(video.textTracks[0]) video.textTracks[0].mode = 'showing';
        }, 100);
        showToast("Subtitle Loaded!");
    }
}

async function loginUserById(id) {
    id = parseInt(id);
    if (isNaN(id)) {
        document.getElementById('auth-screen').classList.remove('hidden');
        return;
    }
    currentUser = await db.users.get(id);
    if (!currentUser) {
        localStorage.removeItem('ASB_USER_ID');
        document.getElementById('auth-screen').classList.remove('hidden');
        return;
    }
    localStorage.setItem('ASB_USER_ID', id);
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
    navigate('profile');
}

function logout() {
    localStorage.removeItem('ASB_USER_ID');
    currentUser = null;
    currentProfile = null;
    hideAllViews();
    document.getElementById('main-app').classList.add('hidden');
    document.getElementById('auth-screen').classList.remove('hidden');
}

// ---- Profiles Logic ----
let editProfileMode = false;
let editingProfileId = null;
let queuedProfilePic = null;

function toggleEditProfilesMode() {
    editProfileMode = !editProfileMode;
    const btn = document.getElementById('manage-profiles-toggle');
    btn.innerText = editProfileMode ? "Done" : "Manage Profiles";
    btn.classList.toggle('bg-white');
    btn.classList.toggle('text-black');
    renderProfilesList();
}

function handleProfilePicQueue(input) {
    if(input.files[0]) {
        queuedProfilePic = input.files[0];
        document.getElementById('profile-modal-pic').src = URL.createObjectURL(queuedProfilePic);
    }
}

async function openProfileModal(id = null) {
    editingProfileId = id;
    queuedProfilePic = null;
    
    document.getElementById('profile-modal').classList.remove('hidden');
    
    if (id) {
        document.getElementById('profile-modal-title').innerText = "Edit Profile";
        document.getElementById('delete-profile-btn').classList.remove('hidden');
        const p = await db.profiles.get(id);
        document.getElementById('profile-name-input').value = p.name;
        document.getElementById('profile-kids-input').checked = p.isKids;
        document.getElementById('profile-modal-pic').src = p.picBlob ? URL.createObjectURL(p.picBlob) : "https://upload.wikimedia.org/wikipedia/commons/0/0b/Netflix-avatar.png";
    } else {
        document.getElementById('profile-modal-title').innerText = "Add Profile";
        document.getElementById('delete-profile-btn').classList.add('hidden');
        document.getElementById('profile-name-input').value = "";
        document.getElementById('profile-kids-input').checked = false;
        document.getElementById('profile-modal-pic').src = "https://upload.wikimedia.org/wikipedia/commons/0/0b/Netflix-avatar.png";
    }
}

function closeProfileModal() {
    document.getElementById('profile-modal').classList.add('hidden');
}

async function saveProfile() {
    const name = document.getElementById('profile-name-input').value;
    const isKids = document.getElementById('profile-kids-input').checked;
    if(!name) return showToast("Name is required");

    if (editingProfileId) {
        const p = await db.profiles.get(editingProfileId);
        p.name = name;
        p.isKids = isKids;
        if(queuedProfilePic) p.picBlob = queuedProfilePic;
        await db.profiles.update(editingProfileId, p);
    } else {
        const payload = { userId: currentUser.id, name, isKids };
        if(queuedProfilePic) payload.picBlob = queuedProfilePic;
        await db.profiles.add(payload);
    }
    closeProfileModal();
    renderProfilesList();
}

async function deleteEditingProfile() {
    if(confirm("Are you sure?")) {
        await db.profiles.delete(editingProfileId);
        closeProfileModal();
        renderProfilesList();
    }
}

async function renderProfilesList() {
    if (!currentUser) return;
    const profiles = await db.profiles.where('userId').equals(currentUser.id).toArray();
    const container = document.getElementById('profiles-container');
    container.innerHTML = '';
    
    profiles.forEach((p) => {
        let pic = p.picBlob ? URL.createObjectURL(p.picBlob) : "https://upload.wikimedia.org/wikipedia/commons/0/0b/Netflix-avatar.png";
        
        let overlay = '';
        if (editProfileMode) {
            overlay = `
                <div class="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <i class="fa-solid fa-pen text-3xl text-white"></i>
                </div>
            `;
        }

        container.innerHTML += `
            <div class="flex flex-col items-center gap-2 cursor-pointer profile-card group relative" onclick="${editProfileMode ? `openProfileModal(${p.id})` : `selectProfile(${p.id})`}">
                <div class="w-24 h-24 sm:w-32 sm:h-32 rounded-md bg-cover bg-center border-4 border-transparent ${editProfileMode? '' : 'group-hover:border-white'} transition-all shadow-xl flex items-center justify-center relative overflow-hidden">
                    <img src="${pic}" class="w-full h-full object-cover">
                    ${p.isKids ? '<span class="absolute bottom-1 right-1 bg-white text-black text-[10px] font-bold px-1 rounded">KIDS</span>' : ''}
                    ${overlay}
                </div>
                <span class="text-gray-400 group-hover:text-white font-medium text-sm sm:text-lg transition">${p.name}</span>
            </div>
        `;
    });
    
    if(profiles.length < 10) {
        container.innerHTML += `
            <div class="flex flex-col items-center gap-2 cursor-pointer profile-card group" onclick="openProfileModal()">
                <div class="w-24 h-24 sm:w-32 sm:h-32 rounded-md border-4 border-transparent group-hover:bg-white group-hover:text-black transition-all flex items-center justify-center bg-gray-800">
                    <i class="fa-solid fa-plus text-4xl sm:text-6xl text-gray-500 group-hover:text-black transition"></i>
                </div>
                <span class="text-gray-400 group-hover:text-white font-medium text-sm sm:text-lg transition">Add Profile</span>
            </div>
        `;
    }
}

async function selectProfile(id) {
    if(editProfileMode) return;
    currentProfile = await db.profiles.get(id);
    document.getElementById('nav-profile-pic').src = currentProfile.picBlob ? URL.createObjectURL(currentProfile.picBlob) : "https://upload.wikimedia.org/wikipedia/commons/0/0b/Netflix-avatar.png";
    document.getElementById('bottom-nav').classList.remove('hidden');
    document.getElementById('navbar').classList.remove('hidden');
    navigate('home');
}

// ----- Main Rendering -----
function buildMovieCard(movie) {
    let posterSrc = movie.posterBlob ? getBlobUrl(movie.id, 'poster', movie.posterBlob) : movie.poster;
    return `
        <div class="relative w-32 sm:w-48 aspect-[2/3] shrink-0 rounded-md overflow-hidden cursor-pointer movie-card shadow-lg bg-gray-900 group" onclick="navigate('details', ${movie.id})">
            <img src="${posterSrc}" alt="${movie.title}" class="w-full h-full object-cover group-hover:opacity-80 transition" loading="lazy" onerror="this.src='https://via.placeholder.com/200x300.png'">
            <div class="absolute bottom-0 w-full p-2 bg-gradient-to-t from-black to-transparent opacity-0 group-hover:opacity-100 transition duration-300">
                <p class="text-white text-xs sm:text-sm font-bold truncate">${movie.title}</p>
            </div>
            ${movie.isNew ? '<span class="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow">NEW</span>' : ''}
        </div>
    `;
}

function buildCategoryRow(title, movies) {
    if (movies.length === 0) return '';
    const id = `row-${title.replace(/\s+/g, '-')}`;
    let html = `
        <div class="mb-8 relative pr-4">
            <h3 class="text-xl sm:text-2xl font-bold mb-4 font-sans tracking-wide px-4 sm:px-0 text-white dropshadow-md">${title}</h3>
            <div class="group relative">
                <div class="flex gap-2 sm:gap-4 overflow-x-auto scroll-container no-scrollbar px-4 sm:px-0" id="${id}">
    `;
    movies.forEach(m => html += buildMovieCard(m));
    html += `</div></div></div>`;
    return html;
}

async function renderHome() {
    const movies = await db.movies.toArray();
    
    document.getElementById('app-content').addEventListener('scroll', (e) => {
        const nav = document.getElementById('navbar');
        if (e.target.scrollTop > 50) {
            nav.classList.add('bg-black');
            nav.classList.remove('bg-gradient-to-b', 'from-black/90', 'to-transparent');
        } else {
            nav.classList.remove('bg-black');
            nav.classList.add('bg-gradient-to-b', 'from-black/90', 'to-transparent');
        }
    });

    const heroMovie = movies.find(m => m.isTrending) || movies[0];
    if (heroMovie) {
        let heroPoster = heroMovie.posterBlob ? getBlobUrl(heroMovie.id, 'poster', heroMovie.posterBlob) : heroMovie.poster;
        
        let videoLayer = '';
        if (heroMovie.videoBlob || heroMovie.video) {
            let heroBgUrl = heroMovie.videoBlob ? getBlobUrl(heroMovie.id, 'video', heroMovie.videoBlob) : heroMovie.video;
            videoLayer = `<video src="${heroBgUrl}" class="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-screen" autoplay muted loop playsinline></video>`;
        }
        
        document.getElementById('hero-banner').innerHTML = `
            <div class="absolute inset-0 bg-cover bg-center transition-transform duration-1000 scale-105" style="background-image: url('${heroPoster}');">
                ${videoLayer}
            </div>
            <div class="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-netflixDark via-netflixDark/50 to-transparent z-0"></div>
            <div class="absolute inset-y-0 left-0 w-3/4 bg-gradient-to-r from-netflixDark via-netflixDark/80 to-transparent z-0"></div>
            
            <div class="absolute bottom-[20%] left-4 sm:left-12 w-full max-w-2xl px-2 z-10 fade-in pt-12">
                <h2 class="text-5xl md:text-7xl font-black mb-4 drop-shadow-2xl text-white uppercase tracking-tighter" style="text-shadow: 2px 2px 4px rgba(0,0,0,0.8); line-height: 1.1;">${heroMovie.title}</h2>
                <div class="flex items-center gap-4 mb-4 font-bold text-gray-300 drop-shadow-md text-sm sm:text-lg">
                    <span class="text-green-500 shadow-black drop-shadow-md">98% Match</span>
                    <span>${heroMovie.year || '2024'}</span>
                    <span class="border border-gray-500 px-1.5 text-xs text-white">U/A 13+</span>
                    <span class="border border-gray-500 px-1 text-xs text-white">HD</span>
                </div>
                <p class="text-white text-lg mb-8 drop-shadow-lg line-clamp-3 md:line-clamp-4 font-medium leading-normal max-w-lg mb-8">${heroMovie.description || 'Watch the thrilling new adventure exclusively on ASB Movies.'}</p>
                
                <div class="flex gap-4">
                    <button onclick="navigate('player', ${heroMovie.id})" class="bg-white text-black px-6 sm:px-10 py-3 rounded hover:bg-gray-300 transition font-bold shadow-xl text-xl flex items-center justify-center gap-3"><i class="fa-solid fa-play"></i> Play</button>
                    <button onclick="navigate('details', ${heroMovie.id})" class="bg-gray-500/70 text-white px-6 sm:px-10 py-3 rounded hover:bg-gray-500/50 transition font-bold shadow-xl text-xl flex items-center justify-center gap-3"><i class="fa-solid fa-circle-info"></i> More Info</button>
                </div>
            </div>
        `;
    }

    const rowsContainer = document.getElementById('category-rows');
    rowsContainer.innerHTML = buildCategoryRow('Recently Added', movies.slice(0, 10)) + 
                            buildCategoryRow('Trending Now', movies.filter(m => m.isTrending)) +
                            buildCategoryRow('Top 10 in Sri Lanka', movies.filter(m => m.isTop10)) +
                            buildCategoryRow('New Releases', movies.filter(m => m.isNew)) +
                            buildCategoryRow('Action & Adventure', movies.filter(m => m.genre === 'Action' || m.category === 'Action')) +
                            buildCategoryRow('TV Shows', movies.filter(m => m.category === 'TV Shows')) +
                            buildCategoryRow('Chilling Horror', movies.filter(m => m.category === 'Horror' || m.genre === 'Horror')) +
                            buildCategoryRow('Anime', movies.filter(m => m.category === 'Anime')) +
                            buildCategoryRow('Sri Lankan Cinema', movies.filter(m => m.category === 'Sri Lankan Movies'));
}

async function setupDetails(id) {
    const movie = await db.movies.get(id);
    if (!movie) return;
    currentMovie = movie;

    document.getElementById('navbar').classList.add('bg-black');
    document.getElementById('detail-backdrop').style.backgroundImage = `url('${movie.posterBlob ? getBlobUrl(movie.id, 'poster', movie.posterBlob) : movie.poster}')`;
    document.getElementById('detail-title').innerText = movie.title;
    document.getElementById('detail-year').innerText = movie.year || '2024';
    document.getElementById('detail-age').innerText = movie.ageRating || 'U';
    document.getElementById('detail-rating').innerText = movie.rating ? movie.rating + '/10' : 'PG-13';
    document.getElementById('detail-desc').innerText = movie.description || '';
    document.getElementById('detail-genre').innerText = movie.genre || '';

    const inList = await db.watchlist.where('[userId+movieId]').equals([currentUser.id, movie.id]).first();
    const icon = document.getElementById('detail-list-icon');
    if (inList) {
        icon.innerHTML = '<i class="fa-solid fa-check text-xl"></i>';
        icon.classList.add('border-white', 'text-white');
    } else {
        icon.innerHTML = '<i class="fa-solid fa-plus text-xl"></i>';
        icon.classList.remove('border-white', 'text-white');
    }
}

window.watchTrailer = async function() {
    if(!currentMovie) return;
    const movieId = currentMovie.id;
    const trailerData = await db.trailers.get(movieId);
    
    if(!trailerData || !trailerData.trailerBlob) {
        return showToast("No trailer found for this movie");
    }

    const introView = document.getElementById('intro-view');
    const introVideo = document.getElementById('intro-video');
    const introTitle = document.getElementById('intro-movie-title');
    const skipBtn = document.getElementById('skip-intro-btn');
    
    hideAllViews();
    introView.classList.remove('hidden');
    introTitle.innerText = "Trailer: " + currentMovie.title;
    
    introVideo.src = URL.createObjectURL(trailerData.trailerBlob);
    introVideo.muted = false; // User clicked "Trailer", so sound is allowed
    
    const finishTrailer = () => {
        introVideo.pause();
        introVideo.src = "";
        introView.classList.add('hidden');
        navigate('details', movieId);
    };

    skipBtn.innerText = "Exit Trailer";
    skipBtn.onclick = finishTrailer;
    introVideo.onended = finishTrailer;
    
    introVideo.load();
    introVideo.play().catch(e => {
        console.warn("Autoplay blocked, unmuting...");
        introVideo.muted = true;
        introVideo.play();
    });
}

window.closeIntro = function() {
    const introVideo = document.getElementById('intro-video');
    introVideo.pause();
    introVideo.src = "";
    document.getElementById('intro-view').classList.add('hidden');
    if(currentMovie) navigate('details', currentMovie.id);
}

async function playVideo() { 
    if(!currentMovie) return;
    const movieId = currentMovie.id;
    
    // FETCH TRAILER / INTRO DATA
    const trailerData = await db.trailers.get(movieId);
    const movie = await db.movies.get(movieId);
    
    const introView = document.getElementById('intro-view');
    const introVideo = document.getElementById('intro-video');
    const introTitle = document.getElementById('intro-movie-title');
    const skipBtn = document.getElementById('skip-intro-btn');
    
    hideAllViews();
    introView.classList.remove('hidden');
    introTitle.innerText = movie.title;
    
    // Set Intro/Trailer source
    if(trailerData && trailerData.trailerBlob) {
        introVideo.src = URL.createObjectURL(trailerData.trailerBlob);
        introVideo.muted = true; // Still intro mode, usually muted if autoplay
    } else {
        introVideo.src = ""; 
    }
    
    const startMainPlayer = () => {
        introVideo.pause();
        introVideo.src = "";
        introView.classList.add('hidden');
        navigate('player', movieId);
    };

    skipBtn.innerText = "Skip Intro";
    skipBtn.onclick = startMainPlayer;
    introVideo.onended = startMainPlayer;
    
    if(introVideo.src) {
        introVideo.load();
        introVideo.play().catch(e => {
            console.warn("Intro autoplay blocked, skipping to movie...");
            startMainPlayer();
        });
    }

    // Auto-skip after 2 seconds if no source
    setTimeout(() => {
        if(!introView.classList.contains('hidden') && !introVideo.src) {
            startMainPlayer();
        }
    }, 2000);
}

async function downloadMovie() {
    if(!currentMovie) return;
    showToast(`Downloading ${currentMovie.title}...`);
    let downloads = JSON.parse(localStorage.getItem('ASB_Downloads') || '[]');
    if(!downloads.find(d => d.id === currentMovie.id)) {
        downloads.push({id: currentMovie.id, title: currentMovie.title, poster: currentMovie.poster});
        localStorage.setItem('ASB_Downloads', JSON.stringify(downloads));
    }
}

async function toggleMyList() {
    if(!currentMovie || !currentUser) return;
    const existing = await db.watchlist.where('[userId+movieId]').equals([currentUser.id, currentMovie.id]).first();
    const icon = document.getElementById('detail-list-icon');
    
    if (existing) {
        await db.watchlist.delete(existing.id);
        icon.innerHTML = '<i class="fa-solid fa-plus text-xl"></i>';
        icon.classList.remove('border-white', 'text-white');
    } else {
        await db.watchlist.add({userId: currentUser.id, movieId: currentMovie.id});
        icon.innerHTML = '<i class="fa-solid fa-check text-xl"></i>';
        icon.classList.add('border-white', 'text-white');
    }
}

function simulateShare() {
    if (navigator.share) {
        navigator.share({ title: currentMovie.title, text: `Watch ${currentMovie.title} on ASB Movies!`, url: window.location.href });
    } else showToast("Link copied to clipboard!");
}

async function setupPlayer(id) {
    const movie = await db.movies.get(id);
    if (!movie) return;
    
    // Fetch Heavy Blob dynamically
    const media = await db.videos.get(id);
    if (media && media.videoBlob) movie.videoBlob = media.videoBlob;

    const video = document.getElementById('hls-video');
    video.poster = movie.posterBlob ? getBlobUrl(movie.id, 'poster', movie.posterBlob) : movie.poster;

    // Subtitles logic
    const track = document.getElementById('video-subs');
    if (movie.subtitleBlob) {
        track.src = getBlobUrl(movie.id, 'sub', movie.subtitleBlob);
    } else track.src = '';
    
    if(hls) {
        hls.destroy();
        hls = null;
    }

    let videoUrl = movie.videoBlob ? getBlobUrl(movie.id, 'video', movie.videoBlob) : movie.video;

    if (movie.videoBlob) {
        video.src = videoUrl;
        video.load();
        setTimeout(() => video.play().catch(e => console.error("Playback blocked:", e)), 300);
    } else if (movie.video) {
        if (Hls.isSupported() && videoUrl.includes('.m3u8')) {
            hls = new Hls();
            hls.loadSource(videoUrl);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(e => console.log(e)));
        } else {
            video.src = videoUrl;
            video.load();
            setTimeout(() => video.play().catch(e => console.error("Playback blocked:", e)), 300);
        }
    } else {
        showToast("No video file found in this movie!");
    }
    return true;
}

window.changePlaybackSpeed = function() {
    const video = document.getElementById('hls-video');
    const btn = document.getElementById('speed-btn');
    let speed = video.playbackRate;
    if(speed === 1) speed = 1.25;
    else if(speed === 1.25) speed = 1.5;
    else if(speed === 1.5) speed = 2.0;
    else speed = 1.0;
    
    video.playbackRate = speed;
    btn.innerText = speed.toFixed(1) + 'x Speed';
    showToast(`Speed: ${speed}x`);
}

function closePlayer() {
    document.getElementById('hls-video').pause();
    if(hls) hls.destroy();
    navigate('home');
}

function startVoiceSearch() { showToast("Voice search activated!"); }

async function handleSearch() {
    const query = document.getElementById('search-input').value.toLowerCase();
    const container = document.getElementById('search-results');
    const emptyState = document.getElementById('search-empty');
    if (query.length === 0) {
        container.innerHTML = '';
        emptyState.classList.remove('hidden'); return;
    }
    const movies = await db.movies.toArray();
    const results = movies.filter(m => m.title.toLowerCase().includes(query) || m.genre.toLowerCase().includes(query));
    container.innerHTML = '';
    if (results.length > 0) {
        emptyState.classList.add('hidden');
        results.forEach(m => container.innerHTML += buildMovieCard(m));
    } else emptyState.classList.remove('hidden');
}

async function filterBrowse() {
    const genre = document.getElementById('genre-select').value;
    const movies = await db.movies.toArray();
    const results = genre === 'All' ? movies : movies.filter(m => m.genre === genre || m.category === genre);
    const container = document.getElementById('browse-results');
    container.innerHTML = '';
    if (results.length > 0) results.forEach(m => container.innerHTML += buildMovieCard(m));
}

async function renderMyList() {
    const listItems = currentUser ? await db.watchlist.where('userId').equals(currentUser.id).toArray() : [];
    const container = document.getElementById('mylist-results');
    const emptyState = document.getElementById('mylist-empty');
    container.innerHTML = '';
    if (listItems.length === 0) emptyState.classList.remove('hidden');
    else {
        emptyState.classList.add('hidden');
        for (let item of listItems) {
            const m = await db.movies.get(item.movieId);
            if(m) container.innerHTML += buildMovieCard(m);
        }
    }
}

function renderDownloads() {
    const downloads = JSON.parse(localStorage.getItem('ASB_Downloads') || '[]');
    const container = document.getElementById('downloads-results');
    const emptyState = document.getElementById('downloads-empty');
    container.innerHTML = '';
    if (downloads.length === 0) emptyState.classList.remove('hidden');
    else {
        emptyState.classList.add('hidden');
        downloads.forEach(d => {
            container.innerHTML += `
                <div class="flex items-center justify-between p-4 bg-[#181818] rounded-xl hover:bg-[#333] transition cursor-pointer" onclick="navigate('details', ${d.id})">
                    <div class="flex items-center gap-4">
                        <img src="${d.poster}" class="w-16 h-24 object-cover rounded shadow" onerror="this.src='https://via.placeholder.com/64x96.png'">
                        <div>
                            <h4 class="font-bold text-white mb-1">${d.title}</h4>
                            <p class="text-xs text-green-500"><i class="fa-solid fa-mobile-screen"></i> Downloaded</p>
                        </div>
                    </div>
                </div>`;
        });
    }
}
