import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT cc.id_cuenta, cc.saldo, cc.fecha_vencimiento, cc.estado,
             c.id_cliente, c.nombre AS cliente_nombre, v.total AS venta_total
      FROM cuentas_cobrar cc
      JOIN ventas v ON v.id_venta = cc.id_venta
      JOIN clientes c ON c.id_cliente = v.id_cliente
      ORDER BY cc.fecha_vencimiento ASC
    `);
    res.json(r.rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/:id/abonos', async (req, res) => {
  const { monto, id_metodo_pago } = req.body;
  if (!monto || monto <= 0) return res.status(400).json({ error: 'El monto debe ser mayor a cero' });

  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');

    const cuenta = await cliente.query('SELECT saldo FROM cuentas_cobrar WHERE id_cuenta = $1 FOR UPDATE', [req.params.id]);
    if (cuenta.rows.length === 0) throw new Error('Cuenta por cobrar no encontrada');
    if (monto > cuenta.rows[0].saldo) throw new Error('El abono no puede ser mayor al saldo pendiente');

    const nuevoSaldo = cuenta.rows[0].saldo - monto;
    const nuevoEstado = nuevoSaldo <= 0 ? 'PAGADA' : 'PENDIENTE';

    await cliente.query('UPDATE cuentas_cobrar SET saldo = $1, estado = $2 WHERE id_cuenta = $3', [nuevoSaldo, nuevoEstado, req.params.id]);
    const abono = await cliente.query(
      'INSERT INTO abonos (id_cuenta, id_metodo_pago, monto) VALUES ($1,$2,$3) RETURNING *',
      [req.params.id, id_metodo_pago || null, monto]
    );

    await cliente.query('COMMIT');
    res.status(201).json({ abono: abono.rows[0], saldo_restante: nuevoSaldo, estado: nuevoEstado });
  } catch (error) {
    await cliente.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    cliente.release();
  }
});

export default router;
