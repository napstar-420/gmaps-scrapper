import type { Server as HttpServer } from 'http'
import { Server as IoServer, type Socket } from 'socket.io'
import { config } from '../config.js'
import { logger } from '../logger.js'

export class SocketService {
    private io: IoServer | null = null

    /**
     * Attach Socket.IO to the same HTTP server Express uses.
     * Call before `server.listen()` or after; both orders work.
     */
    init(httpServer: HttpServer): IoServer {
        if (this.io) {
            logger.warn('Socket.IO server already initialized; returning existing instance')
            return this.io
        }

        this.io = new IoServer(httpServer, {
            cors: {
                origin: config.clientOrigin,
                methods: ['GET', 'POST'],
                credentials: true,
            },
        })

        this.io.on('connection', (socket: Socket) => {
            logger.info('Socket connected: %s', socket.id)

            socket.on('disconnect', (reason: string) => {
                logger.info('Socket disconnected: %s (%s)', socket.id, reason)
            })

            socket.on('error', (err: Error) => {
                logger.error('Socket error [%s]: %s', socket.id, err.message)
            })
        })

        return this.io
    }

    /** Raw Socket.IO server; throws if `init` was not called. */
    getServer(): IoServer {
        if (!this.io) {
            throw new Error('SocketService.init() must be called before using the Socket.IO server')
        }
        return this.io
    }

    /** Broadcast to all connected clients on the default namespace. */
    emit(event: string, ...args: unknown[]): void {
        this.getServer().emit(event, ...args)
    }

    /** Emit to everyone in a room (default namespace). */
    emitToRoom(room: string, event: string, ...args: unknown[]): void {
        this.getServer()
            .to(room)
            .emit(event, ...args)
    }

    /**
     * Emit to a specific connection. Each socket is automatically in a room
     * equal to its `socket.id`, so this targets one client.
     */
    emitToSocket(socketId: string, event: string, ...args: unknown[]): void {
        this.getServer()
            .to(socketId)
            .emit(event, ...args)
    }

    async joinRoom(socket: Socket, room: string): Promise<void> {
        await socket.join(room)
    }

    async leaveRoom(socket: Socket, room: string): Promise<void> {
        await socket.leave(room)
    }

    /** Join a room by id (e.g. from an HTTP handler after the client connected). */
    async joinRoomBySocketId(socketId: string, room: string): Promise<boolean> {
        const socket = this.getServer().sockets.sockets.get(socketId)
        if (!socket) {
            return false
        }
        await socket.join(room)
        return true
    }

    async leaveRoomBySocketId(socketId: string, room: string): Promise<boolean> {
        const socket = this.getServer().sockets.sockets.get(socketId)
        if (!socket) {
            return false
        }
        await socket.leave(room)
        return true
    }
}

export const socketService = new SocketService()
