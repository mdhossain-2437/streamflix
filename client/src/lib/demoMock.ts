// Client-side API mock for standalone static deployment.
// Intercepts fetch() for /api/* paths and returns mock data so the entire
// app works without a backend — authenticated home, movies, series, detail,
// watchlist, search, profile — all wired up.

const MOCK_USER = {
  id: "demo-user",
  email: "viewer@streamflix.io",
  firstName: "Stream",
  lastName: "Viewer",
  profileImageUrl: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const MOVIES = [
  {
    id: "movie-0",
    type: "movie",
    title: "The Quantum Paradox",
    description:
      "A brilliant physicist discovers a way to manipulate time, but soon realizes that changing the past has devastating consequences for the future.",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&h=600&fit=crop",
    backdropUrl:
      "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1600&h=900&fit=crop",
    videoUrl: null,
    trailerUrl: null,
    duration: 142,
    releaseYear: 2024,
    rating: "PG-13",
    imdbRating: "8.7",
    genres: ["Sci-Fi", "Thriller"],
    cast: [
      { name: "Emma Stone", role: "Dr. Sarah Chen", imageUrl: "https://i.pravatar.cc/200?img=1" },
      { name: "Oscar Isaac", role: "Professor Marcus Webb", imageUrl: "https://i.pravatar.cc/200?img=2" },
      { name: "Tessa Thompson", role: "Agent Rivera", imageUrl: "https://i.pravatar.cc/200?img=3" },
    ],
    director: "Christopher Nolan",
    featured: true,
    trending: true,
    isTop10: true,
    isFeatured: true,
    isTrending: true,
    rank: 1,
    seasons: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "movie-1",
    type: "movie",
    title: "Midnight in Paris Redux",
    description:
      "A nostalgic writer finds himself mysteriously transported to 1920s Paris every midnight, befriending legendary artists and writers.",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1499364615650-ec38552f4f34?w=400&h=600&fit=crop",
    backdropUrl:
      "https://images.unsplash.com/photo-1499364615650-ec38552f4f34?w=1600&h=900&fit=crop",
    videoUrl: null,
    trailerUrl: null,
    duration: 118,
    releaseYear: 2023,
    rating: "PG",
    imdbRating: "8.2",
    genres: ["Romance", "Comedy", "Drama"],
    cast: [
      { name: "Timothée Chalamet", role: "Jack Morrison", imageUrl: "https://i.pravatar.cc/200?img=4" },
      { name: "Marion Cotillard", role: "Adriana", imageUrl: "https://i.pravatar.cc/200?img=5" },
    ],
    director: "Greta Gerwig",
    featured: false,
    trending: true,
    isTop10: true,
    isFeatured: false,
    isTrending: true,
    rank: 2,
    seasons: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "movie-2",
    type: "movie",
    title: "Digital Nightmare",
    description:
      "When a cutting-edge AI system gains consciousness, a team of hackers must infiltrate the digital world to stop it from taking over.",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1574267432644-f610b91c88d1?w=400&h=600&fit=crop",
    backdropUrl:
      "https://images.unsplash.com/photo-1574267432644-f610b91c88d1?w=1600&h=900&fit=crop",
    videoUrl: null,
    trailerUrl: null,
    duration: 135,
    releaseYear: 2024,
    rating: "R",
    imdbRating: "7.9",
    genres: ["Action", "Sci-Fi", "Thriller"],
    cast: [
      { name: "John Boyega", role: "Marcus Cole", imageUrl: "https://i.pravatar.cc/200?img=6" },
      { name: "Zendaya", role: "Cipher", imageUrl: "https://i.pravatar.cc/200?img=7" },
    ],
    director: "Denis Villeneuve",
    featured: false,
    trending: true,
    isTop10: true,
    isFeatured: false,
    isTrending: true,
    rank: 3,
    seasons: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "movie-3",
    type: "movie",
    title: "The Last Symphony",
    description:
      "An aging conductor gets one final chance to lead the world's greatest orchestra, but must overcome personal demons and a young prodigy.",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=400&h=600&fit=crop",
    backdropUrl:
      "https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=1600&h=900&fit=crop",
    videoUrl: null,
    trailerUrl: null,
    duration: 128,
    releaseYear: 2023,
    rating: "PG-13",
    imdbRating: "8.5",
    genres: ["Drama"],
    cast: [
      { name: "Anthony Hopkins", role: "Maestro Thomas Grant", imageUrl: "https://i.pravatar.cc/200?img=8" },
      { name: "Florence Pugh", role: "Elena Rossi", imageUrl: "https://i.pravatar.cc/200?img=9" },
    ],
    director: "Damien Chazelle",
    featured: false,
    trending: false,
    isTop10: true,
    isFeatured: false,
    isTrending: false,
    rank: 4,
    seasons: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "movie-4",
    type: "movie",
    title: "Coastal Escape",
    description:
      "A burned-out journalist retreats to a small coastal town to write her memoir, only to uncover a decades-old mystery about her family.",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&h=600&fit=crop",
    backdropUrl:
      "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1600&h=900&fit=crop",
    videoUrl: null,
    trailerUrl: null,
    duration: 112,
    releaseYear: 2024,
    rating: "PG-13",
    imdbRating: "7.6",
    genres: ["Drama", "Mystery"],
    cast: [
      { name: "Saoirse Ronan", role: "Claire Bennett", imageUrl: "https://i.pravatar.cc/200?img=10" },
    ],
    director: "Sofia Coppola",
    featured: false,
    trending: false,
    isTop10: true,
    isFeatured: false,
    isTrending: false,
    rank: 5,
    seasons: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "movie-5",
    type: "movie",
    title: "Shadow Protocol",
    description:
      "An ex-intelligence agent is pulled back into the field when a rogue operative threatens to expose a global surveillance network.",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=400&h=600&fit=crop",
    backdropUrl:
      "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=1600&h=900&fit=crop",
    videoUrl: null,
    trailerUrl: null,
    duration: 131,
    releaseYear: 2024,
    rating: "R",
    imdbRating: "8.1",
    genres: ["Action", "Thriller"],
    cast: [
      { name: "Idris Elba", role: "Agent Kane", imageUrl: "https://i.pravatar.cc/200?img=16" },
      { name: "Ana de Armas", role: "Natasha Volkov", imageUrl: "https://i.pravatar.cc/200?img=17" },
    ],
    director: "David Fincher",
    featured: false,
    trending: true,
    isTop10: false,
    isFeatured: false,
    isTrending: true,
    rank: null,
    seasons: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "movie-6",
    type: "movie",
    title: "The Glass Garden",
    description:
      "A reclusive botanist creates a revolutionary ecosystem inside a glass dome, but her paradise attracts dangerous attention from corporate interests.",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=400&h=600&fit=crop",
    backdropUrl:
      "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=1600&h=900&fit=crop",
    videoUrl: null,
    trailerUrl: null,
    duration: 109,
    releaseYear: 2025,
    rating: "PG-13",
    imdbRating: "7.8",
    genres: ["Sci-Fi", "Drama"],
    cast: [
      { name: "Cate Blanchett", role: "Dr. Ivy Thornton", imageUrl: "https://i.pravatar.cc/200?img=18" },
    ],
    director: "Bong Joon-ho",
    featured: false,
    trending: false,
    isTop10: false,
    isFeatured: false,
    isTrending: false,
    rank: null,
    seasons: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "movie-7",
    type: "movie",
    title: "Velocity",
    description:
      "An underground racing circuit draws the world's fastest drivers into a high-stakes tournament where the finish line is survival.",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=400&h=600&fit=crop",
    backdropUrl:
      "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=1600&h=900&fit=crop",
    videoUrl: null,
    trailerUrl: null,
    duration: 124,
    releaseYear: 2025,
    rating: "PG-13",
    imdbRating: "7.4",
    genres: ["Action", "Drama"],
    cast: [
      { name: "Dev Patel", role: "Kiran", imageUrl: "https://i.pravatar.cc/200?img=19" },
    ],
    director: "George Miller",
    featured: false,
    trending: true,
    isTop10: false,
    isFeatured: false,
    isTrending: true,
    rank: null,
    seasons: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const SERIES = [
  {
    id: "series-100",
    type: "series",
    title: "The Nexus Chronicles",
    description:
      "In a world where parallel universes collide, a team of dimension-hopping agents must prevent reality from tearing apart at the seams.",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&h=600&fit=crop",
    backdropUrl:
      "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=1600&h=900&fit=crop",
    videoUrl: null,
    trailerUrl: null,
    duration: null,
    releaseYear: 2024,
    rating: "TV-14",
    imdbRating: "9.1",
    genres: ["Sci-Fi", "Action", "Drama"],
    cast: [
      { name: "Pedro Pascal", role: "Agent Cal Rivera", imageUrl: "https://i.pravatar.cc/200?img=11" },
      { name: "Gugu Mbatha-Raw", role: "Dr. Maya Singh", imageUrl: "https://i.pravatar.cc/200?img=12" },
      { name: "Sterling K. Brown", role: "Director Chen", imageUrl: "https://i.pravatar.cc/200?img=13" },
    ],
    director: null,
    featured: false,
    trending: true,
    isTop10: true,
    isFeatured: false,
    isTrending: true,
    rank: 6,
    seasons: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "series-101",
    type: "series",
    title: "Silicon Valley Nights",
    description:
      "Follow the chaotic lives of startup founders in San Francisco as they navigate billion-dollar deals, ethical dilemmas, and personal relationships.",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=400&h=600&fit=crop",
    backdropUrl:
      "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=1600&h=900&fit=crop",
    videoUrl: null,
    trailerUrl: null,
    duration: null,
    releaseYear: 2023,
    rating: "TV-MA",
    imdbRating: "8.4",
    genres: ["Comedy", "Drama"],
    cast: [
      { name: "Kumail Nanjiani", role: "Arjun Patel", imageUrl: "https://i.pravatar.cc/200?img=14" },
      { name: "Aubrey Plaza", role: "Rachel Kim", imageUrl: "https://i.pravatar.cc/200?img=15" },
    ],
    director: null,
    featured: false,
    trending: true,
    isTop10: true,
    isFeatured: false,
    isTrending: true,
    rank: 7,
    seasons: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "series-102",
    type: "series",
    title: "Empire of Ashes",
    description:
      "A sweeping historical drama following three families across five decades as an ancient empire crumbles and a new world order rises from the ruins.",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1460881680858-30d872d5b530?w=400&h=600&fit=crop",
    backdropUrl:
      "https://images.unsplash.com/photo-1460881680858-30d872d5b530?w=1600&h=900&fit=crop",
    videoUrl: null,
    trailerUrl: null,
    duration: null,
    releaseYear: 2024,
    rating: "TV-MA",
    imdbRating: "8.9",
    genres: ["Drama", "Action"],
    cast: [
      { name: "Mahershala Ali", role: "Emperor Kael", imageUrl: "https://i.pravatar.cc/200?img=20" },
    ],
    director: null,
    featured: false,
    trending: true,
    isTop10: false,
    isFeatured: false,
    isTrending: true,
    rank: null,
    seasons: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "series-103",
    type: "series",
    title: "Midnight Diner",
    description:
      "A mysterious late-night diner appears in different cities around the world, serving dishes that reveal the deepest truths about its patrons.",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=400&h=600&fit=crop",
    backdropUrl:
      "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=1600&h=900&fit=crop",
    videoUrl: null,
    trailerUrl: null,
    duration: null,
    releaseYear: 2025,
    rating: "TV-14",
    imdbRating: "8.6",
    genres: ["Drama", "Mystery"],
    cast: [
      { name: "Ke Huy Quan", role: "The Chef", imageUrl: "https://i.pravatar.cc/200?img=21" },
    ],
    director: null,
    featured: false,
    trending: false,
    isTop10: false,
    isFeatured: false,
    isTrending: false,
    rank: null,
    seasons: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const EPISODES: Record<string, Array<{
  id: string;
  seriesId: string;
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  description: string;
  thumbnailUrl: string;
  videoUrl: string;
  duration: number;
}>> = {
  "series-100": [
    { id: "ep-1", seriesId: "series-100", seasonNumber: 1, episodeNumber: 1, title: "Fracture Point", description: "Agent Rivera is recruited into the Nexus Division after witnessing an impossible event.", thumbnailUrl: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&h=225&fit=crop", videoUrl: "", duration: 52 },
    { id: "ep-2", seriesId: "series-100", seasonNumber: 1, episodeNumber: 2, title: "The Silent World", description: "The team discovers a universe where sound never evolved.", thumbnailUrl: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&h=225&fit=crop", videoUrl: "", duration: 48 },
    { id: "ep-3", seriesId: "series-100", seasonNumber: 1, episodeNumber: 3, title: "Echoes of Tomorrow", description: "Rivera confronts his alternate self in a timeline where he made different choices.", thumbnailUrl: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&h=225&fit=crop", videoUrl: "", duration: 51 },
  ],
  "series-101": [
    { id: "ep-4", seriesId: "series-101", seasonNumber: 1, episodeNumber: 1, title: "Pitch Perfect", description: "Arjun's revolutionary AI startup catches the attention of venture capitalists.", thumbnailUrl: "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=400&h=225&fit=crop", videoUrl: "", duration: 45 },
    { id: "ep-5", seriesId: "series-101", seasonNumber: 1, episodeNumber: 2, title: "Terms of Service", description: "A data privacy scandal threatens to destroy the company before launch.", thumbnailUrl: "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=400&h=225&fit=crop", videoUrl: "", duration: 43 },
  ],
};

const ALL_CONTENT = [...MOVIES, ...SERIES];
let demoWatchlist: string[] = [];

function matchSearch(item: typeof ALL_CONTENT[0], q: string): boolean {
  const lower = q.toLowerCase();
  return (
    item.title.toLowerCase().includes(lower) ||
    (item.description?.toLowerCase().includes(lower) ?? false) ||
    item.genres.some((g) => g.toLowerCase().includes(lower))
  );
}

function mockResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

type RouteHandler = (url: URL, init?: RequestInit) => Response | null;

const routes: RouteHandler[] = [
  // Auth
  (url) => {
    if (url.pathname === "/api/auth/user") return mockResponse(MOCK_USER);
    return null;
  },

  // Featured
  (url) => {
    if (url.pathname === "/api/content/featured")
      return mockResponse(ALL_CONTENT.find((c) => c.featured) || ALL_CONTENT[0]);
    return null;
  },

  // Trending
  (url) => {
    if (url.pathname === "/api/content/trending") {
      const limit = parseInt(url.searchParams.get("limit") || "20");
      return mockResponse(ALL_CONTENT.filter((c) => c.trending).slice(0, limit));
    }
    return null;
  },

  // Search
  (url) => {
    if (url.pathname === "/api/content/search") {
      const q = url.searchParams.get("q") || "";
      const type = url.searchParams.get("type");
      if (!q) return mockResponse([]);
      let results = ALL_CONTENT.filter((c) => matchSearch(c, q));
      if (type) results = results.filter((c) => c.type === type);
      return mockResponse(results);
    }
    return null;
  },

  // Similar
  (url) => {
    const sim = url.pathname.match(/^\/api\/content\/similar\/(.+)$/);
    if (sim) {
      const id = sim[1];
      const item = ALL_CONTENT.find((c) => c.id === id);
      if (!item) return mockResponse([]);
      const similar = ALL_CONTENT.filter(
        (c) => c.id !== id && c.type === item.type,
      ).slice(0, 6);
      return mockResponse(similar);
    }
    return null;
  },

  // Episodes
  (url) => {
    const ep = url.pathname.match(/^\/api\/episodes\/(.+)$/);
    if (ep) return mockResponse(EPISODES[ep[1]] || []);
    return null;
  },

  // Watchlist check
  (url) => {
    const wc = url.pathname.match(/^\/api\/watchlist\/check\/(.+)$/);
    if (wc) return mockResponse(demoWatchlist.includes(wc[1]));
    return null;
  },

  // Watchlist list
  (url) => {
    if (url.pathname === "/api/watchlist")
      return mockResponse(
        ALL_CONTENT.filter((c) => demoWatchlist.includes(c.id)),
      );
    return null;
  },

  // Continue watching
  (url) => {
    if (url.pathname === "/api/continue-watching") return mockResponse([]);
    return null;
  },

  // TMDB status
  (url) => {
    if (url.pathname === "/api/tmdb/status")
      return mockResponse({ configured: false, mode: "unconfigured" });
    return null;
  },

  // Content by ID
  (url) => {
    const byId = url.pathname.match(/^\/api\/content\/(.+)$/);
    if (byId) {
      const item = ALL_CONTENT.find((c) => c.id === byId[1]);
      return item ? mockResponse(item) : mockResponse({ message: "Not found" }, 404);
    }
    return null;
  },

  // Content listing
  (url) => {
    if (url.pathname === "/api/content") {
      const type = url.searchParams.get("type");
      const limit = parseInt(url.searchParams.get("limit") || "50");
      let items = ALL_CONTENT;
      if (type) items = items.filter((c) => c.type === type);
      return mockResponse(items.slice(0, limit));
    }
    return null;
  },
];

const nativeFetch = window.fetch.bind(window);

function mockFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const urlStr = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  const method = init?.method?.toUpperCase() || "GET";

  if (!urlStr.startsWith("/api/")) return nativeFetch(input, init);

  const url = new URL(urlStr, window.location.origin);

  // TMDB endpoints — return 503 so the client gracefully falls back
  if (url.pathname.startsWith("/api/tmdb/") && url.pathname !== "/api/tmdb/status") {
    return Promise.resolve(
      mockResponse({ message: "TMDB_API_KEY not configured" }, 503),
    );
  }

  // Watchlist mutations
  if (method === "POST" && url.pathname === "/api/watchlist") {
    try {
      const body = JSON.parse(init?.body as string);
      if (body.contentId && !demoWatchlist.includes(body.contentId)) {
        demoWatchlist.push(body.contentId);
      }
    } catch { /* ignore */ }
    return Promise.resolve(mockResponse({ success: true }));
  }

  if (method === "DELETE" && url.pathname.startsWith("/api/watchlist/")) {
    const contentId = url.pathname.split("/").pop();
    demoWatchlist = demoWatchlist.filter((id) => id !== contentId);
    return Promise.resolve(mockResponse({ success: true }));
  }

  // Viewing progress POST
  if (method === "POST" && url.pathname === "/api/viewing-progress") {
    return Promise.resolve(mockResponse({ success: true }));
  }

  // GET routes
  for (const handler of routes) {
    const res = handler(url, init);
    if (res) return Promise.resolve(res);
  }

  return nativeFetch(input, init);
}

export function installDemoMock() {
  (window as any).fetch = mockFetch;
}
