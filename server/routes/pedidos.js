import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT p.*, c.nombre AS cliente_nombre,
             COALESCE((SELECT SUM(subtotal) FROM pedido_detalle WHERE id_pedido = p.id_pedido), 0) AS total_materiales
      FROM pedidos_medida p
      JOIN clientes c ON c.id_cliente = p.id_cliente
      ORDER BY p.fecha_creacion DESC
    `);
    res.json(r.rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const pedido = await pool.query(`
      SELECT p.*, c.nombre AS cliente_nombre
      FROM pedidos_medida p JOIN clientes c ON c.id_cliente = p.id_cliente
      WHERE p.id_pedido = $1
    `, [req.params.id]);
    if (pedido.rows.length === 0) return res.status(404).json({ error: 'Pedido no encontrado' });

    const materiales = await pool.query(`
      SELECT pd.*, pr.nombre AS producto_nombre, pr.unidad_medida
      FROM pedido_detalle pd JOIN productos pr ON pr.id_producto = pd.id_producto
      WHERE pd.id_pedido = $1
    `, [req.params.id]);

    res.json({ ...pedido.rows[0], materiales: materiales.rows });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/', async (req, res) => {
  const { id_cliente, descripcion, ancho, alto, unidad_medida, precio_mano_obra, fecha_entrega_estimada } = req.body;
  if (!id_cliente || !descripcion) return res.status(400).json({ error: 'Faltan campos obligatorios' });

  try {
    const r = await pool.query(
      `INSERT INTO pedidos_medida (id_cliente, descripcion, ancho, alto, unidad_medida, precio_mano_obra, fecha_entrega_estimada)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [id_cliente, descripcion, ancho || null, alto || null, unidad_medida || 'm', precio_mano_obra || 0, fecha_entrega_estimada || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.put('/:id', async (req, res) => {
  const { descripcion, ancho, alto, precio_mano_obra, estado, fecha_entrega_estimada } = req.body;
  try {
    const r = await pool.query(
      `UPDATE pedidos_medida SET descripcion=$1, ancho=$2, alto=$3, precio_mano_obra=$4, estado=$5, fecha_entrega_estimada=$6
       WHERE id_pedido=$7 RETURNING *`,
      [descripcion, ancho || null, alto || null, precio_mano_obra || 0, estado, fecha_entrega_estimada || null, req.params.id]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'No encontrado' });
    res.json(r.rows[0]);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// POST /api/pedidos/:id/materiales  { id_producto, cantidad }
// Agrega un material al pedido y descuenta el stock real, en una sola transacción
router.post('/:id/materiales', async (req, res) => {
  const { id_producto, cantidad } = req.body;
  if (!id_producto || !cantidad || cantidad <= 0) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');

    const producto = await cliente.query('SELECT precio_venta, stock FROM productos WHERE id_producto = $1 FOR UPDATE', [id_producto]);
    if (producto.rows.length === 0) throw new Error('Producto no encontrado');
    if (producto.rows[0].stock < cantidad) throw new Error(`No hay suficiente stock (disponible: ${producto.rows[0].stock})`);

    const precio = Number(producto.rows[0].precio_venta);
    const subtotal = precio * cantidad;

    const detalle = await cliente.query(
      `INSERT INTO pedido_detalle (id_pedido, id_producto, cantidad, precio_unitario, subtotal)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.params.id, id_producto, cantidad, precio, subtotal]
    );

    await cliente.query('UPDATE productos SET stock = stock - $1 WHERE id_producto = $2', [cantidad, id_producto]);
    await cliente.query(
      "INSERT INTO inventario_movimientos (id_producto, tipo, cantidad, motivo) VALUES ($1,'SALIDA',$2,'Material asignado a pedido a medida')",
      [id_producto, cantidad]
    );

    await cliente.query('COMMIT');
    res.status(201).json(detalle.rows[0]);
  } catch (error) {
    await cliente.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    cliente.release();
  }
});

// DELETE /api/pedidos/:id/materiales/:idDetalle — quita un material del pedido y regresa el stock
router.delete('/:id/materiales/:idDetalle', async (req, res) => {
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');

    const detalle = await cliente.query('SELECT id_producto, cantidad FROM pedido_detalle WHERE id_pedido_detalle = $1', [req.params.idDetalle]);
    if (detalle.rows.length === 0) throw new Error('Material no encontrado en este pedido');

    await cliente.query('UPDATE productos SET stock = stock + $1 WHERE id_producto = $2', [detalle.rows[0].cantidad, detalle.rows[0].id_producto]);
    await cliente.query(
      "INSERT INTO inventario_movimientos (id_producto, tipo, cantidad, motivo) VALUES ($1,'ENTRADA',$2,'Material removido de pedido a medida')",
      [detalle.rows[0].id_producto, detalle.rows[0].cantidad]
    );
    await cliente.query('DELETE FROM pedido_detalle WHERE id_pedido_detalle = $1', [req.params.idDetalle]);

    await cliente.query('COMMIT');
    res.status(204).send();
  } catch (error) {
    await cliente.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    cliente.release();
  }
});

export default router;
