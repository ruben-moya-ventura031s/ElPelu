import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const [ventasHoy, pedidosPendientes, stockBajo, cuentasPendientes, ultimos7dias, valorInventario, movimientosMes, ultimosMovimientos] = await Promise.all([
      pool.query("SELECT COALESCE(SUM(total), 0) AS total FROM ventas WHERE fecha::date = CURRENT_DATE AND estado = 'COMPLETADA'"),
      pool.query("SELECT COUNT(*) FROM pedidos_medida WHERE estado IN ('PENDIENTE','EN_PROCESO')"),
      pool.query("SELECT COUNT(*) FROM productos WHERE stock <= stock_minimo AND estado = TRUE"),
      pool.query("SELECT COALESCE(SUM(saldo), 0) AS total FROM cuentas_cobrar WHERE estado <> 'PAGADA'"),
      pool.query(`
        SELECT dia::date AS dia, COALESCE(SUM(total), 0) AS total
        FROM generate_series(CURRENT_DATE - 6, CURRENT_DATE, '1 day') AS dia
        LEFT JOIN ventas v ON v.fecha::date = dia AND v.estado = 'COMPLETADA'
        GROUP BY dia ORDER BY dia
      `),
      pool.query("SELECT COALESCE(SUM(stock * precio_compra), 0) AS total FROM productos WHERE estado = TRUE"),
      pool.query(`
        SELECT
          COALESCE(SUM(cantidad) FILTER (WHERE tipo = 'ENTRADA'), 0) AS entradas,
          COALESCE(SUM(cantidad) FILTER (WHERE tipo = 'SALIDA'), 0) AS salidas
        FROM inventario_movimientos
        WHERE date_trunc('month', fecha) = date_trunc('month', CURRENT_DATE)
      `),
      pool.query(`
        SELECT im.tipo, im.cantidad, im.motivo, im.fecha, p.nombre AS producto_nombre, p.unidad_medida
        FROM inventario_movimientos im JOIN productos p ON p.id_producto = im.id_producto
        ORDER BY im.fecha DESC LIMIT 8
      `)
    ]);

    res.json({
      ventas_hoy: Number(ventasHoy.rows[0].total),
      pedidos_pendientes: Number(pedidosPendientes.rows[0].count),
      productos_stock_bajo: Number(stockBajo.rows[0].count),
      cuentas_por_cobrar: Number(cuentasPendientes.rows[0].total),
      ventas_ultimos_7_dias: ultimos7dias.rows.map(r => ({ dia: r.dia, total: Number(r.total) })),
      valor_inventario: Number(valorInventario.rows[0].total),
      entradas_mes: Number(movimientosMes.rows[0].entradas),
      salidas_mes: Number(movimientosMes.rows[0].salidas),
      ultimos_movimientos: ultimosMovimientos.rows
    });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

export default router;
