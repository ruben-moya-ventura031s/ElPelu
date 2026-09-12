import express from 'express';
import cors from 'cors';
import usuariosRouter from './routes/usuarios.js';
import clientesRouter from './routes/clientes.js';
import proveedoresRouter from './routes/proveedores.js';
import productosRouter from './routes/productos.js';
import metodosPagoRouter from './routes/metodos-pago.js';
import pedidosRouter from './routes/pedidos.js';
import ventasRouter from './routes/ventas.js';
import cuentasCobrarRouter from './routes/cuentas-cobrar.js';
import comprasRouter from './routes/compras.js';
import inventarioRouter from './routes/inventario.js';
import reportesRouter from './routes/reportes.js';
import dashboardRouter from './routes/dashboard.js';
import configuracionRouter from './routes/configuracion.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '5mb' })); // límite más alto por las fotos de productos en base64

app.use('/api/usuarios', usuariosRouter);
app.use('/api/clientes', clientesRouter);
app.use('/api/proveedores', proveedoresRouter);
app.use('/api/productos', productosRouter);
app.use('/api/metodos-pago', metodosPagoRouter);
app.use('/api/pedidos', pedidosRouter);
app.use('/api/ventas', ventasRouter);
app.use('/api/cuentas-cobrar', cuentasCobrarRouter);
app.use('/api/compras', comprasRouter);
app.use('/api/inventario', inventarioRouter);
app.use('/api/reportes', reportesRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/configuracion', configuracionRouter);

app.get('/api/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API corriendo en http://localhost:${PORT}`));
