import type { Server as IOServer } from "socket.io";

let ioRef: IOServer | undefined;

export const setIO = (io: IOServer) => {
  ioRef = io;
};

export const emitToCommunity = (event: string, payload: any) => {
  ioRef?.to("community").emit(event, payload);
};

export const emitToPost = (postId: string, event: string, payload: any) => {
  ioRef?.to(`post-${postId}`).emit(event, payload);
};

export const emitToUser = (userId: string, event: string, payload: any) => {
  ioRef?.to(`user-${userId}`).emit(event, payload);
};

export const hasIO = () => Boolean(ioRef);

export const getIO = () => ioRef;
