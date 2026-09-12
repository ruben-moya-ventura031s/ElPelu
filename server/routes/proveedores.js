import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM proveedores ORDER BY nombre');
    res.json(r.rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/', async (req, res) => {
  const { nombre, telefono, correo, direccion } = req.body;
  if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });
  try {
    const r = await pool.query(
      'INSERT INTO proveedores (nombre, telefono, correo, direccion) VALUES ($1,$2,$3,$4) RETURNING *',
      [nombre, telefono, correo, direccion]
    );
    res.status(201).json(r.rows[0]);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.put('/:id', async (req, res) => {
  const { nombre, telefono, correo, direccion, estado } = req.body;
  try {
    const r = await pool.query(
      'UPDATE proveedores SET nombre=$1, telefono=$2, correo=$3, direccion=$4, estado=$5 WHERE id_proveedor=$6 RETURNING *',
      [nombre, telefono, correo, direccion, estado, req.params.id]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'No encontrado' });
    res.json(r.rows[0]);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM proveedores WHERE id_proveedor = $1', [req.params.id]);
    res.status(204).send();
  } catch (error) { res.status(500).json({ error: error.message }); }
});

export default router;
