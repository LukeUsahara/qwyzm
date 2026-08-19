import { GENRE, GENRES } from "@qwyzm/play-data";

export { GENRE, GENRES };

export const TOP_LEVEL_GENRES = GENRES.filter((genre) => genre.parentId === null);
