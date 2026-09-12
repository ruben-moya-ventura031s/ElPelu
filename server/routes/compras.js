import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT c.id_compra, c.fecha, c.total, c.estado, p.nombre AS proveedor_nombre
      FROM compras c JOIN proveedores p ON p.id_proveedor = c.id_proveedor
      ORDER BY c.fecha DESC
    `);
    res.json(r.rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// POST /api/compras  { id_proveedor, items: [{id_producto, cantidad, precio}] }
router.post('/', async (req, res) => {
  const { id_proveedor, items } = req.body;
  if (!id_proveedor || !items || items.length === 0) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    const total = items.reduce((acc, i) => acc + i.precio * i.cantidad, 0);

    const compra = await cliente.query(
      'INSERT INTO compras (id_proveedor, total) VALUES ($1,$2) RETURNING *',
      [id_proveedor, total]
    );

    for (const item of items) {
      const subtotal = item.precio * item.cantidad;
      await cliente.query(
        'INSERT INTO compra_detalle (id_compra, id_producto, cantidad, precio, subtotal) VALUES ($1,$2,$3,$4,$5)',
        [compra.rows[0].id_compra, item.id_producto, item.cantidad, item.precio, subtotal]
      );
      await cliente.query('UPDATE productos SET stock = stock + $1 WHERE id_producto = $2', [item.cantidad, item.id_producto]);
      await cliente.query(
        "INSERT INTO inventario_movimientos (id_producto, tipo, cantidad, motivo) VALUES ($1,'ENTRADA',$2,'Compra a proveedor')",
        [item.id_producto, item.cantidad]
      );
    }

    await cliente.query('COMMIT');
    res.status(201).json(compra.rows[0]);
  } catch (error) {
    await cliente.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    cliente.release();
  }
});

export default router;
