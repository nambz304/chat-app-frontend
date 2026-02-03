declare module "socket.io-client" {
  export type Socket = {
    emit: (...args: any[]) => void;
    on: (...args: any[]) => void;
    disconnect: () => void;
  };

  export function io(...args: any[]): Socket;
}
