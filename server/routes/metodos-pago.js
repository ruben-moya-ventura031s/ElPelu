import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM metodos_pago ORDER BY nombre');
    res.json(r.rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/', async (req, res) => {
  const { nombre } = req.body;
  if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });
  try {
    const r = await pool.query('INSERT INTO metodos_pago (nombre) VALUES ($1) RETURNING *', [nombre]);
    res.status(201).json(r.rows[0]);
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Ya existe ese método de pago' });
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  const { nombre, estado } = req.body;
  try {
    const r = await pool.query('UPDATE metodos_pago SET nombre=$1, estado=$2 WHERE id_metodo_pago=$3 RETURNING *', [nombre, estado, req.params.id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'No encontrado' });
    res.json(r.rows[0]);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM metodos_pago WHERE id_metodo_pago = $1', [req.params.id]);
    res.status(204).send();
  } catch (error) { res.status(500).json({ error: error.message }); }
});

export default router;
