import { io } from 'socket.io-client'

let socket

export function getSocket() {
	if (socket) return socket

	const url = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

	socket = io(url, {
		// Allow fallback to HTTP long-polling if WebSocket is blocked.
		transports: ['websocket', 'polling'],
		reconnection: true,
		reconnectionAttempts: 10,
		reconnectionDelay: 500,
	})

	return socket
}

