const db = new Dexie("ASBMoviesDB");

db.version(1).stores({
    movies: '++id, title, genre, category, year, rating, isNew, isTrending, isTop10',
    users: '++id, email, password',
    watchlist: '++id, userId, movieId',
    history: '++id, userId, movieId, progress',
    profiles: '++id, userId, name, isKids'
});

db.version(2).stores({
    movies: '++id, title, genre, category, year, rating, isNew, isTrending, isTop10',
    videos: 'movieId',
    users: '++id, email, password',
    watchlist: '++id, userId, movieId, [userId+movieId]',
    history: '++id, userId, movieId, progress',
    profiles: '++id, userId, name, isKids'
}).upgrade(tx => {
    return tx.movies.toCollection().modify(movie => {
        if (movie.videoBlob) delete movie.videoBlob;
    });
});

db.version(3).stores({
    movies: '++id, title, genre, category, year, rating, ageRating, isNew, isTrending, isTop10',
    trailers: 'movieId',
    videos: 'movieId',
    users: '++id, email, password',
    watchlist: '++id, userId, movieId, [userId+movieId]',
    history: '++id, userId, movieId, progress',
    profiles: '++id, userId, name, isKids'
});

async function seedData() {
    const movieCount = await db.movies.count();
    if (movieCount === 0) {
        await db.movies.bulkAdd([
            {
                title: "Dark Knight",
                description: "When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.",
                poster: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
                trailer: "https://www.youtube.com/embed/EXeTwQWrcwY",
                video: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
                genre: "Action",
                category: "Action",
                cast: "Christian Bale, Heath Ledger",
                director: "Christopher Nolan",
                year: 2008,
                rating: 9.0,
                isNew: false,
                isTrending: true,
                isTop10: true
            },
            {
                title: "Inception",
                description: "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.",
                poster: "https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg",
                trailer: "https://www.youtube.com/embed/YoHD9XEInc0",
                video: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
                genre: "Sci-Fi",
                category: "Action",
                cast: "Leonardo DiCaprio, Joseph Gordon-Levitt",
                director: "Christopher Nolan",
                year: 2010,
                rating: 8.8,
                isNew: false,
                isTrending: true,
                isTop10: true
            },
            {
                title: "Gindari 2",
                description: "Sri lankan comedy movie.",
                poster: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR6sV7x_b4bA7vU1A9AQQM-tGj8kKx2X8A8w&s",
                trailer: "https://www.youtube.com/embed/EXeTwQWrcwY", // placeholder
                video: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
                genre: "Comedy",
                category: "Sri Lankan Movies",
                cast: "Bandu Samarasinghe, Tennyson Cooray",
                director: "Udayakantha Warnasuriya",
                year: 2015,
                rating: 7.5,
                isNew: false,
                isTrending: false,
                isTop10: false
            },
            {
                title: "Dune: Part Two",
                description: "Paul Atreides unites with Chani and the Fremen while on a warpath of revenge against the conspirators who destroyed his family.",
                poster: "https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2JGqqc9bG.jpg",
                trailer: "https://www.youtube.com/embed/Way9Dexny3w",
                video: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
                genre: "Sci-Fi",
                category: "Action",
                cast: "Timothée Chalamet, Zendaya",
                director: "Denis Villeneuve",
                year: 2024,
                rating: 8.8,
                isNew: true,
                isTrending: true,
                isTop10: true
            }
        ]);
    }
}

seedData();
