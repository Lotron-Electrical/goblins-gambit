import { io } from "socket.io-client";

const URL = import.meta.env.VITE_SERVER_URL || undefined;

export const socket = io(URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
});
