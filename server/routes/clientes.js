import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM clientes ORDER BY nombre');
    res.json(r.rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/', async (req, res) => {
  const { nombre, cedula_rnc, telefono, correo, direccion, limite_credito } = req.body;
  if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });

  try {
    const r = await pool.query(
      `INSERT INTO clientes (nombre, cedula_rnc, telefono, correo, direccion, limite_credito)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [nombre, cedula_rnc || null, telefono, correo, direccion, limite_credito || 0]
    );
    res.status(201).json(r.rows[0]);
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Ya existe un cliente con esa cédula/RNC' });
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  const { nombre, cedula_rnc, telefono, correo, direccion, limite_credito, estado } = req.body;
  try {
    const r = await pool.query(
      `UPDATE clientes SET nombre=$1, cedula_rnc=$2, telefono=$3, correo=$4, direccion=$5, limite_credito=$6, estado=$7
       WHERE id_cliente=$8 RETURNING *`,
      [nombre, cedula_rnc || null, telefono, correo, direccion, limite_credito || 0, estado, req.params.id]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(r.rows[0]);
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Ya existe un cliente con esa cédula/RNC' });
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM clientes WHERE id_cliente = $1', [req.params.id]);
    res.status(204).send();
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// GET /api/clientes/:id/credito
router.get('/:id/credito', async (req, res) => {
  try {
    const cliente = await pool.query('SELECT limite_credito FROM clientes WHERE id_cliente = $1', [req.params.id]);
    if (cliente.rows.length === 0) return res.status(404).json({ error: 'Cliente no encontrado' });

    const usado = await pool.query(`
      SELECT COALESCE(SUM(cc.saldo), 0) AS total
      FROM cuentas_cobrar cc JOIN ventas v ON v.id_venta = cc.id_venta
      WHERE v.id_cliente = $1 AND cc.estado <> 'PAGADA'
    `, [req.params.id]);

    const limite = Number(cliente.rows[0].limite_credito);
    const usadoNum = Number(usado.rows[0].total);
    res.json({ limite, usado: usadoNum, disponible: Math.max(limite - usadoNum, 0) });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

export default router;
