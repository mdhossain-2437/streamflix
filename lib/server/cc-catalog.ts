// Curated Creative Commons / open-source film catalog. All entries are
// distributed under permissive licenses (CC-BY, CC-BY-SA, CC-BY-NC, public
// domain). These are the films Blender Studio, Big Buck Bunny project,
// Sintel project, etc. ship with downloadable HLS/mp4 derivatives.

export interface CcFilm {
  externalId: string;
  title: string;
  description: string;
  posterUrl: string;
  backdropUrl: string;
  videoUrl: string; // direct mp4 — clients can play without HLS
  trailerUrl?: string;
  durationMinutes: number;
  releaseYear: number;
  genres: string[];
  license: string;
  rating: string; // e.g. "G", "PG", "Open Movie"
  imdbRating?: string;
}

export const CC_CATALOG: CcFilm[] = [
  {
    externalId: "cc-big-buck-bunny",
    title: "Big Buck Bunny",
    description:
      "An open-source animated short by the Blender Foundation about a giant rabbit with a heart bigger than himself. Created with Blender, fully Creative Commons.",
    posterUrl:
      "https://archive.org/services/img/BigBuckBunny_124",
    backdropUrl:
      "https://upload.wikimedia.org/wikipedia/commons/c/c5/Big.Buck.Bunny.-.Opening.Screen.png",
    videoUrl:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    durationMinutes: 10,
    releaseYear: 2008,
    genres: ["Animation", "Comedy", "Short"],
    license: "CC-BY-3.0",
    rating: "G",
    imdbRating: "6.5",
  },
  {
    externalId: "cc-sintel",
    title: "Sintel",
    description:
      "A girl's quest to find her dragon companion. The third Blender Open Movie, directed by Colin Levy. Hand-crafted CC-licensed fantasy short.",
    posterUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/Sintel_poster.jpg/440px-Sintel_poster.jpg",
    backdropUrl:
      "https://durian.blender.org/wp-content/themes/durian/img/header_bg.jpg",
    videoUrl:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
    durationMinutes: 14,
    releaseYear: 2010,
    genres: ["Animation", "Fantasy", "Drama"],
    license: "CC-BY-3.0",
    rating: "PG",
    imdbRating: "8.0",
  },
  {
    externalId: "cc-tears-of-steel",
    title: "Tears of Steel",
    description:
      "Sci-fi short film by the Blender Foundation. Live-action with VFX, set in a future where robotic forces threaten humanity. CC-BY licensed.",
    posterUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Tears_of_Steel_poster.jpg/440px-Tears_of_Steel_poster.jpg",
    backdropUrl: "https://mango.blender.org/wp-content/uploads/2012/07/3.jpg",
    videoUrl:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    durationMinutes: 12,
    releaseYear: 2012,
    genres: ["Sci-Fi", "Action", "Short"],
    license: "CC-BY-3.0",
    rating: "PG-13",
    imdbRating: "7.0",
  },
  {
    externalId: "cc-elephants-dream",
    title: "Elephants Dream",
    description:
      "The world's first open-source animated film. Two strangers explore a fantastical machine. Made with Blender, released under CC-BY.",
    posterUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Elephants_Dream_s5_both.jpg/440px-Elephants_Dream_s5_both.jpg",
    backdropUrl:
      "https://orange.blender.org/wp-content/themes/orange/images/header.jpg",
    videoUrl:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    durationMinutes: 11,
    releaseYear: 2006,
    genres: ["Animation", "Surreal", "Short"],
    license: "CC-BY-2.5",
    rating: "PG",
    imdbRating: "6.9",
  },
  {
    externalId: "cc-cosmos-laundromat",
    title: "Cosmos Laundromat: First Cycle",
    description:
      "A suicidal sheep meets a wacky salesman who offers him an exit. Pilot of an open-source feature film by Blender Studio.",
    posterUrl:
      "https://studio.blender.org/film-assets/projects/cosmos-laundromat/cosmos_poster.jpg",
    backdropUrl:
      "https://studio.blender.org/film-assets/projects/cosmos-laundromat/cosmos_header.jpg",
    videoUrl:
      "https://download.blender.org/demo/movies/ToS/tears_of_steel_720p.mov",
    durationMinutes: 12,
    releaseYear: 2015,
    genres: ["Animation", "Adventure", "Short"],
    license: "CC-BY-4.0",
    rating: "PG",
    imdbRating: "7.4",
  },
  {
    externalId: "cc-spring",
    title: "Spring",
    description:
      "An animated short by Blender Studio about a girl and her cat encountering ancient forest creatures. Open-source production.",
    posterUrl:
      "https://studio.blender.org/film-assets/projects/spring/spring_poster.jpg",
    backdropUrl:
      "https://studio.blender.org/film-assets/projects/spring/spring_backdrop.jpg",
    videoUrl:
      "https://download.blender.org/demo/movies/Spring/spring-tpr-bypass-1080p.mp4",
    durationMinutes: 8,
    releaseYear: 2019,
    genres: ["Animation", "Fantasy", "Short"],
    license: "CC-BY-4.0",
    rating: "G",
    imdbRating: "8.2",
  },
  {
    externalId: "cc-caminandes-llamigos",
    title: "Caminandes 3: Llamigos",
    description:
      "Koro the llama and Oti the penguin team up against a grumpy fox in this CC-licensed comedy short by Blender Studio.",
    posterUrl:
      "https://studio.blender.org/film-assets/projects/caminandes-3/llamigos_poster.jpg",
    backdropUrl:
      "https://studio.blender.org/film-assets/projects/caminandes-3/llamigos_backdrop.jpg",
    videoUrl:
      "https://download.blender.org/demo/movies/caminandes_03_llamigos_1080p.mp4",
    durationMinutes: 3,
    releaseYear: 2016,
    genres: ["Animation", "Comedy", "Short"],
    license: "CC-BY-4.0",
    rating: "G",
    imdbRating: "8.0",
  },
  {
    externalId: "cc-charge",
    title: "Charge",
    description:
      "An open-source action short by Blender Studio. CC-BY licensed.",
    posterUrl:
      "https://studio.blender.org/film-assets/projects/charge/charge_poster.jpg",
    backdropUrl:
      "https://studio.blender.org/film-assets/projects/charge/charge_backdrop.jpg",
    videoUrl:
      "https://download.blender.org/demo/movies/Charge/charge_1080p.mp4",
    durationMinutes: 2,
    releaseYear: 2022,
    genres: ["Animation", "Action", "Short"],
    license: "CC-BY-4.0",
    rating: "PG",
    imdbRating: "7.5",
  },
];

export function getCcFilm(externalId: string): CcFilm | undefined {
  return CC_CATALOG.find((f) => f.externalId === externalId);
}
