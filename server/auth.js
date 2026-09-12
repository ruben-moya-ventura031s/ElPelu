import crypto from 'crypto';

// Sesiones activas en memoria: token -> { id_usuario, nombre }
const sesiones = new Map();

export function crearSesion(usuario) {
  const token = crypto.randomBytes(24).toString('hex');
  sesiones.set(token, usuario);
  return token;
}

export function requireAuth(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const usuario = token && sesiones.get(token);

  if (!usuario) {
    return res.status(401).json({ error: 'Sesión inválida o expirada. Vuelve a iniciar sesión.' });
  }
  req.usuario = usuario;
  next();
}
