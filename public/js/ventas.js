const API_URL_VENTAS = '/api/ventas';
const API_URL_PRODUCTOS = '/api/productos';
const API_URL_CLIENTES = '/api/clientes';
const API_URL_PEDIDOS = '/api/pedidos';
const API_URL_CONFIG = '/api/configuracion';

let catalogo = [];
let carrito = [];
let pedidosTerminados = [];
let clientesCache = [];
let empresaConfig = { nombre: 'El Pelú' };
let creditoDisponibleActual = null;
let ultimoNumeroFactura = 0;

async function cargarConfigEmpresa() {
  try {
    const respuesta = await fetch(API_URL_CONFIG);
    if (respuesta.ok) empresaConfig = await respuesta.json();
  } catch (error) {
    console.warn('No se pudo cargar la configuración de la empresa.', error.message);
  }
}

async function cargarCatalogo() {
  try {
    const respuesta = await fetch(API_URL_PRODUCTOS);
    if (!respuesta.ok) throw new Error('API no disponible');
    const datos = await respuesta.json();
    catalogo = datos.filter(p => p.tipo === 'PRODUCTO' && p.estado);
  } catch (error) {
    console.warn('No se pudo cargar el catálogo.', error.message);
    catalogo = [];
  }
  renderTiles(catalogo);
}

function renderTiles(lista) {
  const cont = document.getElementById('tilesProductos');
  cont.innerHTML = lista.length === 0
    ? '<p style="color:var(--text-dim);">No hay productos disponibles.</p>'
    : '';

  lista.forEach(p => {
    const tile = document.createElement('button');
    tile.className = 'product-tile';
    tile.onclick = () => agregarAlCarrito(p.id_producto);
    tile.innerHTML = `
      ${p.imagen ? `<img src="${p.imagen}">` : `<div style="width:100%;height:80px;background:var(--bg-panel-2);border-radius:6px;margin-bottom:8px;"></div>`}
      <div style="font-weight:600;font-size:13.5px;">${p.nombre}</div>
      <div style="color:var(--volt);font-weight:700;font-size:14px;">RD$ ${Number(p.precio_venta).toLocaleString('es-DO', { minimumFractionDigits: 2 })}</div>
      <div style="color:var(--text-dim);font-size:11.5px;margin-top:4px;">Stock: ${p.stock} ${p.unidad_medida}</div>
    `;
    cont.appendChild(tile);
  });
}

function filtrarProductos() {
  const q = document.getElementById('buscador').value.toLowerCase();
  renderTiles(catalogo.filter(p => p.nombre.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q)));
}

function agregarAlCarrito(idProducto) {
  const producto = catalogo.find(p => p.id_producto === idProducto);
  const item = carrito.find(i => i.id === idProducto);
  if (item) {
    if (item.cantidad < producto.stock) item.cantidad++;
  } else {
    carrito.push({ id: producto.id_producto, nombre: producto.nombre, precio: Number(producto.precio_venta), cantidad: 1 });
  }
  renderCarrito();
}

function cambiarCantidad(idProducto, delta) {
  const item = carrito.find(i => i.id === idProducto);
  const producto = catalogo.find(p => p.id_producto === idProducto);
  item.cantidad += delta;
  if (item.cantidad <= 0) carrito = carrito.filter(i => i.id !== idProducto);
  else if (item.cantidad > producto.stock) item.cantidad = producto.stock;
  renderCarrito();
}

function vaciarCarrito() {
  carrito = [];
  renderCarrito();
}

function renderCarrito() {
  const cont = document.getElementById('carrito');
  cont.innerHTML = carrito.length === 0
    ? '<p style="color:var(--text-dim);font-size:13px;text-align:center;padding:16px 0;">Selecciona productos para agregarlos</p>'
    : carrito.map(item => `
      <div class="cart-item">
        <div>
          <div>${item.nombre}</div>
          <div style="color:var(--text-dim);font-size:11.5px;">RD$ ${item.precio.toLocaleString('es-DO', { minimumFractionDigits: 2 })} c/u</div>
        </div>
        <div class="cart-qty">
          <button onclick="cambiarCantidad(${item.id}, -1)">−</button>
          <span>${item.cantidad}</span>
          <button onclick="cambiarCantidad(${item.id}, 1)">+</button>
        </div>
        <div style="font-weight:600;">RD$ ${(item.precio * item.cantidad).toLocaleString('es-DO', { minimumFractionDigits: 2 })}</div>
      </div>`).join('');

  actualizarTotales();
}

function cambiarTipoVenta() {
  const tipo = document.getElementById('tipoVenta').value;
  document.getElementById('seccionProductos').style.display = tipo === 'PRODUCTOS' ? 'block' : 'none';
  document.getElementById('seccionPedido').style.display = tipo === 'PEDIDO' ? 'block' : 'none';
  document.getElementById('fClienteVenta').style.display = tipo === 'PRODUCTOS' ? 'block' : 'none';
  vaciarCarrito();
  actualizarTotales();
}

async function cargarClientesSelect() {
  try {
    const respuesta = await fetch(API_URL_CLIENTES);
    if (!respuesta.ok) throw new Error('API no disponible');
    clientesCache = await respuesta.json();
    document.getElementById('cliente').innerHTML = '<option value="">Consumidor final</option>' +
      clientesCache.map(c => `<option value="${c.id_cliente}">${c.nombre}</option>`).join('');
  } catch (error) {
    console.warn('No se pudo cargar la lista de clientes.', error.message);
  }
}

async function cargarPedidosTerminados() {
  try {
    const respuesta = await fetch(API_URL_PEDIDOS);
    if (!respuesta.ok) throw new Error('API no disponible');
    const pedidos = await respuesta.json();
    pedidosTerminados = pedidos.filter(p => p.estado === 'TERMINADO');
    document.getElementById('pedidoSeleccionado').innerHTML = pedidosTerminados.length === 0
      ? '<option value="">No hay pedidos terminados por facturar</option>'
      : '<option value="">Selecciona un pedido</option>' + pedidosTerminados.map(p =>
          `<option value="${p.id_pedido}">${p.cliente_nombre} — ${p.descripcion}</option>`).join('');
  } catch (error) {
    console.warn('No se pudo cargar la lista de pedidos.', error.message);
  }
}

function mostrarResumenPedido() {
  const idPedido = document.getElementById('pedidoSeleccionado').value;
  const cont = document.getElementById('resumenPedido');
  if (!idPedido) { cont.innerHTML = ''; actualizarTotales(); return; }

  const pedido = pedidosTerminados.find(p => p.id_pedido == idPedido);
  cont.innerHTML = `
    <p style="font-size:13px;margin-bottom:6px;"><strong>Cliente:</strong> ${pedido.cliente_nombre}</p>
    <p style="font-size:13px;margin-bottom:6px;"><strong>Trabajo:</strong> ${pedido.descripcion}</p>
    <p style="font-size:13px;margin-bottom:6px;"><strong>Materiales:</strong> RD$ ${Number(pedido.total_materiales).toLocaleString('es-DO', { minimumFractionDigits: 2 })}</p>
    <p style="font-size:13px;"><strong>Mano de obra:</strong> RD$ ${Number(pedido.precio_mano_obra).toLocaleString('es-DO', { minimumFractionDigits: 2 })}</p>
  `;
  actualizarTotales();
}

function calcularSubtotal() {
  const tipo = document.getElementById('tipoVenta').value;
  if (tipo === 'PRODUCTOS') {
    return carrito.reduce((acc, i) => acc + i.precio * i.cantidad, 0);
  }
  const idPedido = document.getElementById('pedidoSeleccionado').value;
  if (!idPedido) return 0;
  const pedido = pedidosTerminados.find(p => p.id_pedido == idPedido);
  return Number(pedido.total_materiales) + Number(pedido.precio_mano_obra);
}

function actualizarTotales() {
  const subtotal = calcularSubtotal();
  const descuento = Number(document.getElementById('descuento').value) || 0;
  const itbis = Number(document.getElementById('itbis').value) || 0;
  const total = Math.max(subtotal - descuento + itbis, 0);

  document.getElementById('subtotalTxt').textContent = `RD$ ${subtotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`;
  document.getElementById('descuentoTxt').textContent = `RD$ ${descuento.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`;
  document.getElementById('itbisTxt').textContent = `RD$ ${itbis.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`;
  document.getElementById('totalTxt').textContent = `RD$ ${total.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`;

  actualizarTextoCredito(total);
}

async function mostrarInfoCredito() {
  actualizarTotales();
}

async function actualizarTextoCredito(total) {
  const idCliente = document.getElementById('cliente').value;
  const tipoPago = document.getElementById('tipoPago').value;
  const info = document.getElementById('infoCredito');

  if (tipoPago !== 'CREDITO' || !idCliente) {
    info.style.display = 'none';
    creditoDisponibleActual = null;
    return;
  }

  try {
    const respuesta = await fetch(`${API_URL_CLIENTES}/${idCliente}/credito`);
    if (!respuesta.ok) throw new Error('API no disponible');
    const { disponible } = await respuesta.json();
    creditoDisponibleActual = disponible;
    const excede = total > disponible;
    info.textContent = excede
      ? `⚠ Esta factura excede el crédito disponible: RD$ ${disponible.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`
      : `Crédito disponible: RD$ ${disponible.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`;
    info.style.color = excede ? 'var(--danger)' : 'var(--text-dim)';
    info.style.display = 'block';
  } catch (error) {
    info.style.display = 'none';
  }
}

async function finalizarVenta() {
  const tipoVenta = document.getElementById('tipoVenta').value;
  const tipoPago = document.getElementById('tipoPago').value;
  const idCliente = tipoVenta === 'PRODUCTOS' ? (document.getElementById('cliente').value || null) : null;
  const descuento = Number(document.getElementById('descuento').value) || 0;
  const itbis = Number(document.getElementById('itbis').value) || 0;
  const ncf = document.getElementById('ncf').value.trim() || null;
  const subtotal = calcularSubtotal();
  const total = Math.max(subtotal - descuento + itbis, 0);

  if (subtotal === 0) {
    mostrarToast(tipoVenta === 'PRODUCTOS' ? 'Agrega al menos un producto.' : 'Selecciona un pedido a facturar.', 'error');
    return;
  }
  if (tipoPago === 'CREDITO' && creditoDisponibleActual !== null && total > creditoDisponibleActual) {
    mostrarToast('⚠ Esta venta excede el crédito disponible del cliente.', 'error');
    return;
  }

  const cuerpo = { tipo_pago: tipoPago, ncf, descuento, itbis };

  if (tipoVenta === 'PEDIDO') {
    const idPedido = document.getElementById('pedidoSeleccionado').value;
    if (!idPedido) { mostrarToast('Selecciona un pedido a facturar.', 'error'); return; }
    const pedido = pedidosTerminados.find(p => p.id_pedido == idPedido);
    cuerpo.id_pedido = idPedido;
    cuerpo.id_cliente = pedido.id_cliente;
    cuerpo.mano_obra = pedido.precio_mano_obra;
  } else {
    cuerpo.id_cliente = idCliente;
    cuerpo.items = carrito.map(i => ({ id_producto: i.id, cantidad: i.cantidad, precio: i.precio }));
  }

  let respuesta;
  try {
    respuesta = await fetch(API_URL_VENTAS, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
  } catch (errorDeRed) {
    mostrarToast('No se pudo conectar con el servidor.', 'error');
    return;
  }

  if (!respuesta.ok) {
    const error = await respuesta.json();
    mostrarToast('No se pudo facturar: ' + error.error, 'error');
    return;
  }

  document.getElementById('reciboContenido').innerHTML = `
    <p style="font-size:13px;margin-bottom:6px;">Factura registrada correctamente. Se abrió en una pestaña nueva lista para imprimir.</p>
    <div class="cart-summary-row total" style="margin-top:10px;"><span>Total facturado</span><span>RD$ ${total.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span></div>
  `;
  abrirModal('modalRecibo');

  const datosVenta = await respuesta.json();
  imprimirFactura(datosVenta, { tipoVenta, tipoPago, ncf, descuento, itbis, subtotal, total, idCliente });

  vaciarCarrito();
  document.getElementById('descuento').value = 0;
  document.getElementById('itbis').value = 0;
  document.getElementById('ncf').value = '';
  cargarCatalogo();
  cargarPedidosTerminados();
  document.getElementById('resumenPedido').innerHTML = '';
}

function imprimirFactura(venta, ctx) {
  const cliente = ctx.idCliente ? clientesCache.find(c => c.id_cliente == ctx.idCliente) : null;
  const nombreCliente = cliente ? cliente.nombre : 'Consumidor final';
  const fecha = new Date(venta.fecha || Date.now());

  let filasHtml;
  if (ctx.tipoVenta === 'PRODUCTOS') {
    filasHtml = carrito.map(i => `
      <tr>
        <td>${i.nombre}</td>
        <td style="text-align:center;">${i.cantidad}</td>
        <td style="text-align:right;">RD$ ${i.precio.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
        <td style="text-align:right;">RD$ ${(i.precio * i.cantidad).toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
      </tr>`).join('');
  } else {
    const idPedido = document.getElementById('pedidoSeleccionado').value || venta.id_pedido;
    const pedido = pedidosTerminados.find(p => p.id_pedido == idPedido);
    filasHtml = `
      <tr>
        <td>Materiales — ${pedido ? pedido.descripcion : 'Pedido a medida'}</td>
        <td style="text-align:center;">1</td>
        <td style="text-align:right;">RD$ ${Number(pedido?.total_materiales || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
        <td style="text-align:right;">RD$ ${Number(pedido?.total_materiales || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
      </tr>
      <tr>
        <td>Mano de obra</td>
        <td style="text-align:center;">1</td>
        <td style="text-align:right;">RD$ ${Number(pedido?.precio_mano_obra || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
        <td style="text-align:right;">RD$ ${Number(pedido?.precio_mano_obra || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
      </tr>`;
  }

  const numeroFactura = String(venta.id_venta).padStart(8, '0');
  const money = n => Number(n || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 });

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Factura ${numeroFactura}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; padding: 32px; max-width: 780px; margin: 0 auto; }
  .encabezado { display: flex; justify-content: space-between; border-bottom: 3px solid #1a1a1a; padding-bottom: 16px; margin-bottom: 20px; }
  .empresa h1 { font-size: 22px; letter-spacing: .5px; margin-bottom: 4px; }
  .empresa p { font-size: 12px; color: #444; line-height: 1.5; }
  .factura-info { text-align: right; }
  .factura-info .titulo { font-size: 16px; font-weight: bold; background: #1a1a1a; color: #fff; padding: 6px 14px; display: inline-block; margin-bottom: 8px; }
  .factura-info p { font-size: 12.5px; margin-bottom: 3px; }
  .datos-cliente { display: flex; justify-content: space-between; background: #f2f2f2; padding: 12px 16px; border-radius: 4px; margin-bottom: 20px; font-size: 12.5px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  thead th { background: #1a1a1a; color: #fff; text-align: left; padding: 8px 10px; font-size: 12px; text-transform: uppercase; }
  thead th:nth-child(2) { text-align: center; }
  thead th:nth-child(3), thead th:nth-child(4) { text-align: right; }
  tbody td { padding: 8px 10px; border-bottom: 1px solid #ddd; font-size: 13px; }
  .totales { width: 280px; margin-left: auto; }
  .totales div { display: flex; justify-content: space-between; padding: 5px 10px; font-size: 13px; }
  .totales .total-final { border-top: 2px solid #1a1a1a; font-weight: bold; font-size: 16px; margin-top: 6px; padding-top: 8px; }
  .pie { text-align: center; margin-top: 40px; font-size: 12px; color: #555; border-top: 1px dashed #999; padding-top: 16px; }
  .firma { margin-top: 60px; display: flex; justify-content: space-between; font-size: 12px; }
  .firma div { width: 220px; border-top: 1px solid #333; text-align: center; padding-top: 6px; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>

  <div class="encabezado">
    <div class="empresa">
      <h1>${empresaConfig.nombre || 'El Pelú'}</h1>
      ${empresaConfig.rnc ? `<p>RNC: ${empresaConfig.rnc}</p>` : ''}
      ${empresaConfig.direccion ? `<p>${empresaConfig.direccion}</p>` : ''}
      ${empresaConfig.telefono ? `<p>Tel: ${empresaConfig.telefono}</p>` : ''}
      ${empresaConfig.correo ? `<p>${empresaConfig.correo}</p>` : ''}
    </div>
    <div class="factura-info">
      <div class="titulo">FACTURA No. ${numeroFactura}</div>
      <p><strong>Fecha:</strong> ${fecha.toLocaleDateString('es-DO')}</p>
      ${venta.ncf ? `<p><strong>NCF:</strong> ${venta.ncf}</p>` : ''}
      <p><strong>Tipo de pago:</strong> ${ctx.tipoPago === 'CONTADO' ? 'Contado' : 'Crédito'}</p>
    </div>
  </div>

  <div class="datos-cliente">
    <div>
      <strong>Cliente:</strong> ${nombreCliente}<br>
      ${cliente?.cedula_rnc ? `Cédula/RNC: ${cliente.cedula_rnc}<br>` : ''}
    </div>
    <div>
      ${cliente?.telefono ? `Tel: ${cliente.telefono}<br>` : ''}
      ${cliente?.direccion ? cliente.direccion : ''}
    </div>
  </div>

  <table>
    <thead>
      <tr><th>Descripción</th><th>Cant.</th><th>Precio</th><th>Subtotal</th></tr>
    </thead>
    <tbody>
      ${filasHtml}
    </tbody>
  </table>

  <div class="totales">
    <div><span>Subtotal</span><span>RD$ ${money(ctx.subtotal)}</span></div>
    <div><span>Descuento</span><span>RD$ ${money(ctx.descuento)}</span></div>
    <div><span>ITBIS</span><span>RD$ ${money(ctx.itbis)}</span></div>
    <div class="total-final"><span>Total</span><span>RD$ ${money(ctx.total)}</span></div>
  </div>

  <div class="firma">
    <div>Firma autorizada</div>
    <div>Firma del cliente</div>
  </div>

  <div class="pie">${empresaConfig.mensaje_pie || 'Gracias por su compra'}</div>

</body>
</html>`;

  const ventana = window.open('', '_blank', 'width=850,height=900');
  ventana.document.write(html);
  ventana.document.close();
  ventana.focus();
  setTimeout(() => ventana.print(), 300);
}

cargarConfigEmpresa();

cargarCatalogo();
cargarClientesSelect();
cargarPedidosTerminados();
renderCarrito();
