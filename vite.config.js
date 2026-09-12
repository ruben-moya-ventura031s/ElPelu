import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
        clientes: resolve(__dirname, 'clientes.html'),
        proveedores: resolve(__dirname, 'proveedores.html'),
        productos: resolve(__dirname, 'productos.html'),
        pedidos: resolve(__dirname, 'pedidos.html'),
        ventas: resolve(__dirname, 'ventas.html'),
        compras: resolve(__dirname, 'compras.html'),
        inventario: resolve(__dirname, 'inventario.html'),
        cuentasCobrar: resolve(__dirname, 'cuentas-cobrar.html'),
        metodosPago: resolve(__dirname, 'metodos-pago.html'),
        reportes: resolve(__dirname, 'reportes.html'),
        cambiarClave: resolve(__dirname, 'cambiar-clave.html'),
        recuperarClave: resolve(__dirname, 'recuperar-clave.html'),
        configuracion: resolve(__dirname, 'configuracion.html')
      }
    }
  }
});
