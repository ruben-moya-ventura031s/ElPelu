import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT p.*, pr.nombre AS proveedor_nombre
      FROM productos p
      LEFT JOIN proveedores pr ON pr.id_proveedor = p.id_proveedor
      ORDER BY p.nombre
    `);
    res.json(r.rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/', async (req, res) => {
  const { codigo, nombre, descripcion, tipo, unidad_medida, id_proveedor, precio_compra, precio_venta, stock, stock_minimo, imagen } = req.body;

  if (!codigo || !nombre || !tipo || precio_compra == null || precio_venta == null) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  try {
    const r = await pool.query(
      `INSERT INTO productos (codigo, nombre, descripcion, tipo, unidad_medida, id_proveedor, precio_compra, precio_venta, stock, stock_minimo, imagen)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [codigo, nombre, descripcion, tipo, unidad_medida || 'unidad', id_proveedor || null, precio_compra, precio_venta, stock || 0, stock_minimo || 5, imagen || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Ya existe un producto con ese código' });
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  const { codigo, nombre, descripcion, tipo, unidad_medida, id_proveedor, precio_compra, precio_venta, stock, stock_minimo, estado, imagen } = req.body;

  try {
    const r = await pool.query(
      `UPDATE productos SET codigo=$1, nombre=$2, descripcion=$3, tipo=$4, unidad_medida=$5, id_proveedor=$6,
       precio_compra=$7, precio_venta=$8, stock=$9, stock_minimo=$10, estado=$11, imagen=$12
       WHERE id_producto=$13 RETURNING *`,
      [codigo, nombre, descripcion, tipo, unidad_medida, id_proveedor || null, precio_compra, precio_venta, stock, stock_minimo, estado, imagen || null, req.params.id]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(r.rows[0]);
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Ya existe un producto con ese código' });
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM productos WHERE id_producto = $1', [req.params.id]);
    res.status(204).send();
  } catch (error) { res.status(500).json({ error: error.message }); }
});

export default router;
