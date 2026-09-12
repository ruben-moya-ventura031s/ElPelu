import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT v.*, c.nombre AS cliente_nombre
      FROM ventas v LEFT JOIN clientes c ON c.id_cliente = v.id_cliente
      ORDER BY v.fecha DESC
    `);
    res.json(r.rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const venta = await pool.query(`
      SELECT v.*, c.nombre AS cliente_nombre
      FROM ventas v LEFT JOIN clientes c ON c.id_cliente = v.id_cliente
      WHERE v.id_venta = $1
    `, [req.params.id]);
    if (venta.rows.length === 0) return res.status(404).json({ error: 'Venta no encontrada' });

    const detalle = await pool.query('SELECT * FROM venta_detalle WHERE id_venta = $1', [req.params.id]);
    res.json({ ...venta.rows[0], detalle: detalle.rows });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// POST /api/ventas
// Venta de productos normales: { id_cliente, tipo_pago, ncf, descuento, itbis, items: [{id_producto, cantidad, precio}] }
// Facturar un pedido a medida ya hecho: { id_cliente, id_pedido, tipo_pago, ncf, descuento, itbis, mano_obra }
router.post('/', async (req, res) => {
  const { id_cliente, id_pedido, tipo_pago, ncf, descuento, itbis, items, mano_obra } = req.body;

  if (!tipo_pago || (tipo_pago !== 'CONTADO' && tipo_pago !== 'CREDITO')) {
    return res.status(400).json({ error: 'El tipo de pago es obligatorio (CONTADO o CREDITO)' });
  }
  if (tipo_pago === 'CREDITO' && !id_cliente) {
    return res.status(400).json({ error: 'Una venta a crédito necesita un cliente asignado' });
  }
  if (!id_pedido && (!items || items.length === 0)) {
    return res.status(400).json({ error: 'La venta necesita productos o un pedido a medida' });
  }

  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');

    let subtotal = 0;
    const lineas = [];

    if (id_pedido) {
      // Facturar un pedido a medida: se usa el total de materiales ya asignados + la mano de obra
      const materiales = await cliente.query(
        `SELECT pd.cantidad, pd.precio_unitario, pd.subtotal, p.nombre
         FROM pedido_detalle pd JOIN productos p ON p.id_producto = pd.id_producto
         WHERE pd.id_pedido = $1`,
        [id_pedido]
      );
      for (const m of materiales.rows) {
        subtotal += Number(m.subtotal);
        lineas.push({ id_producto: null, descripcion: `Material: ${m.nombre}`, cantidad: m.cantidad, precio: m.precio_unitario, subtotal: m.subtotal });
      }
      const manoObraNum = Number(mano_obra || 0);
      if (manoObraNum > 0) {
        subtotal += manoObraNum;
        lineas.push({ id_producto: null, descripcion: 'Mano de obra', cantidad: 1, precio: manoObraNum, subtotal: manoObraNum });
      }
    } else {
      // Venta de productos normales: valida y descuenta stock
      for (const item of items) {
        const producto = await cliente.query('SELECT stock, nombre FROM productos WHERE id_producto = $1 FOR UPDATE', [item.id_producto]);
        if (producto.rows.length === 0) throw new Error('Producto no encontrado');
        if (producto.rows[0].stock < item.cantidad) {
          throw new Error(`No hay suficiente stock de "${producto.rows[0].nombre}" (disponible: ${producto.rows[0].stock})`);
        }
        const itemSubtotal = item.precio * item.cantidad;
        subtotal += itemSubtotal;
        lineas.push({ id_producto: item.id_producto, descripcion: null, cantidad: item.cantidad, precio: item.precio, subtotal: itemSubtotal });
      }
    }

    const descuentoNum = Number(descuento || 0);
    const itbisNum = Number(itbis || 0);
    const total = Math.max(subtotal - descuentoNum + itbisNum, 0);

    // Si es a crédito, valida el límite de crédito disponible del cliente
    if (tipo_pago === 'CREDITO') {
      const datosCliente = await cliente.query('SELECT limite_credito FROM clientes WHERE id_cliente = $1', [id_cliente]);
      if (datosCliente.rows.length === 0) throw new Error('Cliente no encontrado');

      const usado = await cliente.query(`
        SELECT COALESCE(SUM(cc.saldo), 0) AS total
        FROM cuentas_cobrar cc JOIN ventas v ON v.id_venta = cc.id_venta
        WHERE v.id_cliente = $1 AND cc.estado <> 'PAGADA'
      `, [id_cliente]);

      const limite = Number(datosCliente.rows[0].limite_credito);
      const disponible = limite - Number(usado.rows[0].total);
      if (total > disponible) {
        throw new Error(`El cliente excede su límite de crédito. Disponible: RD$ ${disponible.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`);
      }
    }

    const venta = await cliente.query(
      `INSERT INTO ventas (id_cliente, id_pedido, tipo_pago, ncf, subtotal, descuento, itbis, total)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [id_cliente || null, id_pedido || null, tipo_pago, ncf || null, subtotal, descuentoNum, itbisNum, total]
    );

    for (const linea of lineas) {
      await cliente.query(
        `INSERT INTO venta_detalle (id_venta, id_producto, descripcion, cantidad, precio, subtotal)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [venta.rows[0].id_venta, linea.id_producto, linea.descripcion, linea.cantidad, linea.precio, linea.subtotal]
      );
      if (linea.id_producto) {
        await cliente.query('UPDATE productos SET stock = stock - $1 WHERE id_producto = $2', [linea.cantidad, linea.id_producto]);
      }
    }

    if (id_pedido) {
      await cliente.query("UPDATE pedidos_medida SET estado = 'ENTREGADO' WHERE id_pedido = $1", [id_pedido]);
    }

    if (tipo_pago === 'CREDITO') {
      await cliente.query(
        `INSERT INTO cuentas_cobrar (id_venta, saldo, fecha_vencimiento) VALUES ($1, $2, CURRENT_DATE + 30)`,
        [venta.rows[0].id_venta, total]
      );
    }

    await cliente.query('COMMIT');
    res.status(201).json(venta.rows[0]);
  } catch (error) {
    await cliente.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    cliente.release();
  }
});

export default router;
