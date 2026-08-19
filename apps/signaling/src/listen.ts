import { createSignalingServer } from "./server.ts";

const port = Number(process.env.SIGNALING_PORT ?? 8788);
const { httpServer } = createSignalingServer();
httpServer.listen(port, () => {
  console.log(`qwyzm-signaling ws://localhost:${port}`);
});
