import { Router } from 'express';
import crypto from 'crypto';
import { pool } from '../db.js';
import { requireAuth, crearSesion } from '../auth.js';

const router = Router();

function hashClave(clave) {
  return crypto.createHash('sha256').update(clave).digest('hex');
}

// POST /api/usuarios/login  { usuario, clave }
router.post('/login', async (req, res) => {
  const { usuario, clave } = req.body;
  if (!usuario || !clave) return res.status(400).json({ error: 'Usuario y contraseña son obligatorios' });

  try {
    const r = await pool.query(
      'SELECT id_usuario, nombre, usuario FROM usuarios WHERE usuario = $1 AND clave_hash = $2 AND estado = TRUE',
      [usuario, hashClave(clave)]
    );
    if (r.rows.length === 0) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });

    const datos = r.rows[0];
    const token = crearSesion({ id_usuario: datos.id_usuario, nombre: datos.nombre });
    res.json({ ...datos, token });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// POST /api/usuarios/recuperar  { usuario, correo, clave_nueva }
router.post('/recuperar', async (req, res) => {
  const { usuario, correo, clave_nueva } = req.body;
  if (!usuario || !correo || !clave_nueva) return res.status(400).json({ error: 'Faltan campos obligatorios' });

  try {
    const r = await pool.query('SELECT id_usuario FROM usuarios WHERE usuario = $1 AND correo = $2', [usuario, correo]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'No hay un usuario con ese usuario y correo' });

    await pool.query('UPDATE usuarios SET clave_hash = $1 WHERE id_usuario = $2', [hashClave(clave_nueva), r.rows[0].id_usuario]);
    res.json({ ok: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// PUT /api/usuarios/:id/cambiar-clave — solo el propio usuario puede cambiar su clave
router.put('/:id/cambiar-clave', requireAuth, async (req, res) => {
  if (String(req.usuario.id_usuario) !== String(req.params.id)) {
    return res.status(403).json({ error: 'No puedes cambiar la contraseña de otro usuario.' });
  }

  const { clave_actual, clave_nueva } = req.body;
  if (!clave_actual || !clave_nueva) return res.status(400).json({ error: 'Faltan campos obligatorios' });

  try {
    const actual = await pool.query('SELECT clave_hash FROM usuarios WHERE id_usuario = $1', [req.params.id]);
    if (actual.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (actual.rows[0].clave_hash !== hashClave(clave_actual)) {
      return res.status(401).json({ error: 'La contraseña actual no es correcta' });
    }
    await pool.query('UPDATE usuarios SET clave_hash = $1 WHERE id_usuario = $2', [hashClave(clave_nueva), req.params.id]);
    res.json({ ok: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});


router.get('/debug-login', async (req, res) => { try { const r = await pool.query( `SELECT id_usuario, nombre, usuario, estado, (clave_hash = $2) AS coincide FROM usuarios WHERE usuario = $1`, ['admin', hashClave('admin123')] ); res.json(r.rows); } catch (e) { res.json({ error: e.message }); } });

export default router;
