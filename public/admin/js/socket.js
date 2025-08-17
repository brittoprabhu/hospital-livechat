export function connectAdminSocket(token, onAgentsUpdate) {
  const socket = io(location.origin, { transports:['websocket'] });
  socket.emit('admin:register', { token });
  socket.on('admin:registered', ()=>{ /* noop */ });
  socket.on('admin:agents', (rows)=> onAgentsUpdate && onAgentsUpdate(rows));
  return socket;
}
