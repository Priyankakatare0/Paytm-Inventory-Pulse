import { io } from 'socket.io-client'

let socket

export function getSocket() {
	if (socket) return socket

	const url = import.meta.env.VITE_API_URL || 'http://localhost:5000'

	socket = io(url, {
		transports: ['websocket'],
	})

	return socket
}

