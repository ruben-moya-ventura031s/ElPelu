import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();
router.use(requireAuth);

router.get('/ventas', async (req, res) => {
  const { desde, hasta } = req.query;
  try {
    const r = await pool.query(`
      SELECT v.fecha, c.nombre AS cliente, v.tipo_pago, v.ncf, v.total
      FROM ventas v LEFT JOIN clientes c ON c.id_cliente = v.id_cliente
      WHERE ($1::date IS NULL OR v.fecha::date >= $1::date)
        AND ($2::date IS NULL OR v.fecha::date <= $2::date)
      ORDER BY v.fecha DESC
    `, [desde || null, hasta || null]);
    res.json(r.rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/compras', async (req, res) => {
  const { desde, hasta } = req.query;
  try {
    const r = await pool.query(`
      SELECT co.fecha, p.nombre AS proveedor, co.total
      FROM compras co JOIN proveedores p ON p.id_proveedor = co.id_proveedor
      WHERE ($1::date IS NULL OR co.fecha::date >= $1::date)
        AND ($2::date IS NULL OR co.fecha::date <= $2::date)
      ORDER BY co.fecha DESC
    `, [desde || null, hasta || null]);
    res.json(r.rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/inventario-bajo', async (req, res) => {
  try {
    const r = await pool.query('SELECT codigo, nombre, tipo, stock, stock_minimo, unidad_medida FROM productos WHERE stock <= stock_minimo AND estado = TRUE ORDER BY stock ASC');
    res.json(r.rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/cuentas-cobrar', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT c.nombre AS cliente, cc.saldo, cc.fecha_vencimiento, cc.estado
      FROM cuentas_cobrar cc
      JOIN ventas v ON v.id_venta = cc.id_venta
      JOIN clientes c ON c.id_cliente = v.id_cliente
      WHERE cc.estado <> 'PAGADA'
      ORDER BY cc.fecha_vencimiento
    `);
    res.json(r.rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/pedidos-por-estado', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT p.descripcion, c.nombre AS cliente, p.estado, p.fecha_entrega_estimada
      FROM pedidos_medida p JOIN clientes c ON c.id_cliente = p.id_cliente
      ORDER BY p.estado, p.fecha_entrega_estimada
    `);
    res.json(r.rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

export default router;
