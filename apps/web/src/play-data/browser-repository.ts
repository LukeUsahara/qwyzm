import {
  createJsonPlayRepository,
  type PlayRepository,
} from "@qwyzm/play-data";

/** Browser adapter. Swap this for an API repository later. */
export function createBrowserPlayRepository(): PlayRepository {
  return createJsonPlayRepository(window.localStorage);
}
