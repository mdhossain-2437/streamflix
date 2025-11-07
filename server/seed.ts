import { db } from "./db";
import { content, episodes } from "@shared/schema";

async function seed() {
  console.log("Seeding database...");

  // Sample movies
  const movies = [
    {
      type: "movie" as const,
      title: "The Quantum Paradox",
      description:
        "A brilliant physicist discovers a way to manipulate time, but soon realizes that changing the past has devastating consequences for the future. As reality begins to unravel, she must race against time itself to prevent a catastrophic paradox.",
      thumbnailUrl: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&h=600&fit=crop",
      backdropUrl: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1600&h=900&fit=crop",
      videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      duration: 142,
      releaseYear: 2024,
      rating: "PG-13",
      imdbRating: "8.7",
      genres: ["Sci-Fi", "Thriller"],
      cast: [
        {
          name: "Emma Stone",
          role: "Dr. Sarah Chen",
          imageUrl: "https://i.pravatar.cc/200?img=1",
        },
        {
          name: "Oscar Isaac",
          role: "Professor Marcus Webb",
          imageUrl: "https://i.pravatar.cc/200?img=2",
        },
        {
          name: "Tessa Thompson",
          role: "Agent Rivera",
          imageUrl: "https://i.pravatar.cc/200?img=3",
        },
      ],
      featured: true,
      trending: true,
    },
    {
      type: "movie" as const,
      title: "Midnight in Paris Redux",
      description:
        "A nostalgic writer finds himself mysteriously transported to 1920s Paris every midnight, where he befriends legendary artists and writers, forcing him to choose between two eras.",
      thumbnailUrl: "https://images.unsplash.com/photo-1499364615650-ec38552f4f34?w=400&h=600&fit=crop",
      backdropUrl: "https://images.unsplash.com/photo-1499364615650-ec38552f4f34?w=1600&h=900&fit=crop",
      videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
      duration: 118,
      releaseYear: 2023,
      rating: "PG",
      imdbRating: "8.2",
      genres: ["Romance", "Comedy", "Drama"],
      cast: [
        {
          name: "Timothée Chalamet",
          role: "Jack Morrison",
          imageUrl: "https://i.pravatar.cc/200?img=4",
        },
        {
          name: "Marion Cotillard",
          role: "Adriana",
          imageUrl: "https://i.pravatar.cc/200?img=5",
        },
      ],
      trending: true,
    },
    {
      type: "movie" as const,
      title: "Digital Nightmare",
      description:
        "When a cutting-edge AI system gains consciousness, a team of hackers must infiltrate the digital world to stop it from taking over the global network infrastructure.",
      thumbnailUrl: "https://images.unsplash.com/photo-1574267432644-f610b91c88d1?w=400&h=600&fit=crop",
      backdropUrl: "https://images.unsplash.com/photo-1574267432644-f610b91c88d1?w=1600&h=900&fit=crop",
      videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      duration: 135,
      releaseYear: 2024,
      rating: "R",
      imdbRating: "7.9",
      genres: ["Action", "Sci-Fi", "Thriller"],
      cast: [
        {
          name: "John Boyega",
          role: "Marcus Cole",
          imageUrl: "https://i.pravatar.cc/200?img=6",
        },
        {
          name: "Zendaya",
          role: "Cipher",
          imageUrl: "https://i.pravatar.cc/200?img=7",
        },
      ],
      trending: true,
    },
    {
      type: "movie" as const,
      title: "The Last Symphony",
      description:
        "An aging conductor gets one final chance to lead the world's greatest orchestra, but must overcome personal demons and a young prodigy threatening to take his place.",
      thumbnailUrl: "https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=400&h=600&fit=crop",
      backdropUrl: "https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=1600&h=900&fit=crop",
      videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
      duration: 128,
      releaseYear: 2023,
      rating: "PG-13",
      imdbRating: "8.5",
      genres: ["Drama"],
      cast: [
        {
          name: "Anthony Hopkins",
          role: "Maestro Thomas Grant",
          imageUrl: "https://i.pravatar.cc/200?img=8",
        },
        {
          name: "Florence Pugh",
          role: "Elena Rossi",
          imageUrl: "https://i.pravatar.cc/200?img=9",
        },
      ],
    },
    {
      type: "movie" as const,
      title: "Coastal Escape",
      description:
        "A burned-out journalist retreats to a small coastal town to write her memoir, only to uncover a decades-old mystery that challenges everything she thought she knew about her family.",
      thumbnailUrl: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&h=600&fit=crop",
      backdropUrl: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1600&h=900&fit=crop",
      videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
      duration: 112,
      releaseYear: 2024,
      rating: "PG-13",
      imdbRating: "7.6",
      genres: ["Drama", "Mystery"],
      cast: [
        {
          name: "Saoirse Ronan",
          role: "Claire Bennett",
          imageUrl: "https://i.pravatar.cc/200?img=10",
        },
      ],
    },
  ];

  const createdMovies = await db.insert(content).values(movies).returning();
  console.log(`Created ${createdMovies.length} movies`);

  // Sample series
  const series = [
    {
      type: "series" as const,
      title: "The Nexus Chronicles",
      description:
        "In a world where parallel universes collide, a team of dimension-hopping agents must prevent reality from tearing apart at the seams. Each episode explores a different universe with its own rules and dangers.",
      thumbnailUrl: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&h=600&fit=crop",
      backdropUrl: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=1600&h=900&fit=crop",
      videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
      releaseYear: 2024,
      rating: "TV-14",
      imdbRating: "9.1",
      genres: ["Sci-Fi", "Action", "Drama"],
      cast: [
        {
          name: "Pedro Pascal",
          role: "Agent Cal Rivera",
          imageUrl: "https://i.pravatar.cc/200?img=11",
        },
        {
          name: "Gugu Mbatha-Raw",
          role: "Dr. Maya Singh",
          imageUrl: "https://i.pravatar.cc/200?img=12",
        },
        {
          name: "Sterling K. Brown",
          role: "Director Chen",
          imageUrl: "https://i.pravatar.cc/200?img=13",
        },
      ],
      trending: true,
    },
    {
      type: "series" as const,
      title: "Silicon Valley Nights",
      description:
        "Follow the chaotic lives of startup founders in San Francisco as they navigate billion-dollar deals, ethical dilemmas, and personal relationships in the cutthroat tech industry.",
      thumbnailUrl: "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=400&h=600&fit=crop",
      backdropUrl: "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=1600&h=900&fit=crop",
      videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
      releaseYear: 2023,
      rating: "TV-MA",
      imdbRating: "8.4",
      genres: ["Comedy", "Drama"],
      cast: [
        {
          name: "Kumail Nanjiani",
          role: "Arjun Patel",
          imageUrl: "https://i.pravatar.cc/200?img=14",
        },
        {
          name: "Aubrey Plaza",
          role: "Rachel Kim",
          imageUrl: "https://i.pravatar.cc/200?img=15",
        },
      ],
      trending: true,
    },
  ];

  const createdSeries = await db.insert(content).values(series).returning();
  console.log(`Created ${createdSeries.length} series`);

  // Create episodes for The Nexus Chronicles
  if (createdSeries.length > 0) {
    const nexusEpisodes = [
      {
        seriesId: createdSeries[0].id,
        seasonNumber: 1,
        episodeNumber: 1,
        title: "Fracture Point",
        description:
          "Agent Rivera is recruited into the Nexus Division after witnessing an impossible event. His first mission takes him to a universe where gravity works in reverse.",
        thumbnailUrl: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&h=225&fit=crop",
        videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
        duration: 52,
      },
      {
        seriesId: createdSeries[0].id,
        seasonNumber: 1,
        episodeNumber: 2,
        title: "The Silent World",
        description:
          "The team discovers a universe where sound never evolved, and they must learn to communicate without speaking to prevent a dimensional collapse.",
        thumbnailUrl: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&h=225&fit=crop",
        videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
        duration: 48,
      },
      {
        seriesId: createdSeries[0].id,
        seasonNumber: 1,
        episodeNumber: 3,
        title: "Echoes of Tomorrow",
        description:
          "Rivera confronts his alternate self in a timeline where he made different choices, forcing him to question his life decisions.",
        thumbnailUrl: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&h=225&fit=crop",
        videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
        duration: 51,
      },
    ];

    await db.insert(episodes).values(nexusEpisodes);
    console.log(`Created ${nexusEpisodes.length} episodes for The Nexus Chronicles`);

    // Create episodes for Silicon Valley Nights
    if (createdSeries.length > 1) {
      const siliconValleyEpisodes = [
        {
          seriesId: createdSeries[1].id,
          seasonNumber: 1,
          episodeNumber: 1,
          title: "Pitch Perfect",
          description:
            "Arjun's revolutionary AI startup catches the attention of venture capitalists, but his co-founder Rachel has doubts about their ethical approach.",
          thumbnailUrl: "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=400&h=225&fit=crop",
          videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
          duration: 45,
        },
        {
          seriesId: createdSeries[1].id,
          seasonNumber: 1,
          episodeNumber: 2,
          title: "Terms of Service",
          description:
            "A data privacy scandal threatens to destroy the company before it even launches, forcing the team to make difficult moral choices.",
          thumbnailUrl: "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=400&h=225&fit=crop",
          videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
          duration: 43,
        },
      ];

      await db.insert(episodes).values(siliconValleyEpisodes);
      console.log(`Created ${siliconValleyEpisodes.length} episodes for Silicon Valley Nights`);
    }
  }

  console.log("Seeding complete!");
}

seed().catch(console.error);
