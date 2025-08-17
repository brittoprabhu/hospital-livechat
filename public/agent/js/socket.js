export function connectAgentSocket(token, department) {
  const socket = io(location.origin, { transports:['websocket'] });
  socket.emit('agent:register', { token, department });
  return socket;
}
