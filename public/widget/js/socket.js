export function connectWidgetSocket() {
  const socket = io(location.origin, { transports:['websocket'] });
  return socket;
}
