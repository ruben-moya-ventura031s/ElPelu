import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT im.id_movimiento, im.tipo, im.cantidad, im.motivo, im.fecha,
             p.id_producto, p.nombre AS producto_nombre, p.stock, p.unidad_medida
      FROM inventario_movimientos im
      JOIN productos p ON p.id_producto = im.id_producto
      ORDER BY im.fecha DESC
      LIMIT 100
    `);
    res.json(r.rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/', async (req, res) => {
  const { id_producto, tipo, cantidad, motivo } = req.body;
  if (!id_producto || !tipo || !cantidad || cantidad <= 0) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }
  if (!['ENTRADA', 'SALIDA'].includes(tipo)) {
    return res.status(400).json({ error: 'Tipo inválido' });
  }

  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');

    if (tipo === 'SALIDA') {
      const producto = await cliente.query('SELECT stock FROM productos WHERE id_producto = $1 FOR UPDATE', [id_producto]);
      if (producto.rows.length === 0) throw new Error('Producto no encontrado');
      if (producto.rows[0].stock < cantidad) throw new Error('No hay suficiente stock para esa salida');
      await cliente.query('UPDATE productos SET stock = stock - $1 WHERE id_producto = $2', [cantidad, id_producto]);
    } else {
      await cliente.query('UPDATE productos SET stock = stock + $1 WHERE id_producto = $2', [cantidad, id_producto]);
    }

    const movimiento = await cliente.query(
      'INSERT INTO inventario_movimientos (id_producto, tipo, cantidad, motivo) VALUES ($1,$2,$3,$4) RETURNING *',
      [id_producto, tipo, cantidad, motivo || null]
    );

    await cliente.query('COMMIT');
    res.status(201).json(movimiento.rows[0]);
  } catch (error) {
    await cliente.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    cliente.release();
  }
});

export default router;
