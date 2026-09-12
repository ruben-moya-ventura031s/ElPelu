const API_URL = 'http://localhost:3001/api/pedidos';

let pedidos = [];
let pedidoAbiertoId = null;

async function cargarClientesSelect() {
  try {
    const respuesta = await fetch('http://localhost:3001/api/clientes');
    if (!respuesta.ok) throw new Error('API no disponible');
    const clientes = await respuesta.json();
    document.getElementById('cliente').innerHTML = clientes.map(c => `<option value="${c.id_cliente}">${c.nombre}</option>`).join('');
  } catch (error) {
    console.warn('No se pudieron cargar los clientes.', error.message);
  }
}

async function cargarMaterialesSelect() {
  try {
    const respuesta = await fetch('http://localhost:3001/api/productos');
    if (!respuesta.ok) throw new Error('API no disponible');
    const productos = await respuesta.json();
    const materiales = productos.filter(p => p.tipo === 'MATERIAL' && p.estado);
    document.getElementById('materialSeleccionado').innerHTML = materiales.map(m =>
      `<option value="${m.id_producto}">${m.nombre} (stock: ${m.stock} ${m.unidad_medida})</option>`
    ).join('');
  } catch (error) {
    console.warn('No se pudieron cargar los materiales.', error.message);
  }
}

async function cargarPedidos() {
  try {
    const respuesta = await fetch(API_URL);
    if (!respuesta.ok) throw new Error('API no disponible');
    pedidos = await respuesta.json();
  } catch (error) {
    console.warn('No se pudo conectar con la API.', error.message);
    pedidos = [];
  }
  render(pedidos);
}

const ESTADOS = {
  PENDIENTE: 'off', EN_PROCESO: 'warn', TERMINADO: 'on', ENTREGADO: 'on', CANCELADO: 'off'
};
const ETIQUETAS_ESTADO = {
  PENDIENTE: 'Pendiente', EN_PROCESO: 'En proceso', TERMINADO: 'Terminado', ENTREGADO: 'Entregado', CANCELADO: 'Cancelado'
};

function render(lista) {
  const tbody = document.getElementById('tablaPedidos');
  tbody.innerHTML = lista.length === 0
    ? '<tr><td colspan="7" style="color:var(--text-dim);">Sin pedidos registrados todavía.</td></tr>'
    : lista.map(p => `
      <tr>
        <td>${p.cliente_nombre}</td>
        <td>${p.descripcion}</td>
        <td>${p.ancho && p.alto ? `${p.ancho} x ${p.alto} ${p.unidad_medida}` : '—'}</td>
        <td>RD$ ${Number(p.total_materiales).toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
        <td>RD$ ${Number(p.precio_mano_obra).toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
        <td><span class="badge ${ESTADOS[p.estado]}">${ETIQUETAS_ESTADO[p.estado]}</span></td>
        <td style="text-align:right;"><button class="btn btn-outline" style="padding:6px 12px;font-size:12px;" onclick="abrirDetalle(${p.id_pedido})">Ver / editar</button></td>
      </tr>`).join('');
}

function filtrar() {
  const q = document.getElementById('buscador').value.toLowerCase();
  render(pedidos.filter(p => p.cliente_nombre.toLowerCase().includes(q) || p.descripcion.toLowerCase().includes(q)));
}

function nuevoPedido() {
  ['descripcion', 'ancho', 'alto', 'fechaEntrega'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('precioManoObra').value = 0;
  document.getElementById('fCliente').classList.remove('error');
  document.getElementById('fDescripcion').classList.remove('error');
  abrirModal('modalPedido');
}

async function guardarPedido() {
  let valido = true;
  document.getElementById('fCliente').classList.remove('error');
  document.getElementById('fDescripcion').classList.remove('error');

  if (!document.getElementById('cliente').value) { document.getElementById('fCliente').classList.add('error'); valido = false; }
  if (!document.getElementById('descripcion').value.trim()) { document.getElementById('fDescripcion').classList.add('error'); valido = false; }
  if (!valido) return;

  const datos = {
    id_cliente: document.getElementById('cliente').value,
    descripcion: document.getElementById('descripcion').value.trim(),
    ancho: document.getElementById('ancho').value || null,
    alto: document.getElementById('alto').value || null,
    unidad_medida: document.getElementById('unidadMedida').value,
    precio_mano_obra: Number(document.getElementById('precioManoObra').value) || 0,
    fecha_entrega_estimada: document.getElementById('fechaEntrega').value || null
  };

  try {
    const respuesta = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos) });
    if (!respuesta.ok) throw new Error((await respuesta.json()).error);
    cerrarModal('modalPedido');
    cargarPedidos();
    mostrarToast('Pedido creado.', 'ok');
  } catch (error) {
    mostrarToast('No se pudo crear: ' + error.message, 'error');
  }
}

async function abrirDetalle(id) {
  pedidoAbiertoId = id;
  try {
    const respuesta = await fetch(`${API_URL}/${id}`);
    if (!respuesta.ok) throw new Error('API no disponible');
    const pedido = await respuesta.json();

    document.getElementById('estadoPedido').value = pedido.estado;
    renderMaterialesPedido(pedido.materiales);
    abrirModal('modalDetalle');
  } catch (error) {
    mostrarToast('No se pudo cargar el pedido: ' + error.message, 'error');
  }
}

function renderMaterialesPedido(materiales) {
  const tbody = document.getElementById('tablaMaterialesPedido');
  tbody.innerHTML = materiales.length === 0
    ? '<tr><td colspan="4" style="color:var(--text-dim);">Sin materiales asignados todavía.</td></tr>'
    : materiales.map(m => `
      <tr>
        <td>${m.producto_nombre}</td>
        <td>${m.cantidad} ${m.unidad_medida}</td>
        <td>RD$ ${Number(m.subtotal).toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
        <td style="text-align:right;"><button class="btn-icon" onclick="quitarMaterial(${m.id_pedido_detalle})">🗑</button></td>
      </tr>`).join('');
}

async function agregarMaterial() {
  const idProducto = document.getElementById('materialSeleccionado').value;
  const cantidad = Number(document.getElementById('cantidadMaterial').value);

  if (!idProducto || !cantidad || cantidad <= 0) {
    mostrarToast('Selecciona un material y una cantidad válida.', 'error');
    return;
  }

  try {
    const respuesta = await fetch(`${API_URL}/${pedidoAbiertoId}/materiales`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_producto: idProducto, cantidad })
    });
    if (!respuesta.ok) throw new Error((await respuesta.json()).error);

    document.getElementById('cantidadMaterial').value = '';
    await abrirDetalle(pedidoAbiertoId);
    cargarPedidos();
    cargarMaterialesSelect();
  } catch (error) {
    mostrarToast('No se pudo agregar: ' + error.message, 'error');
  }
}

async function quitarMaterial(idDetalle) {
  if (!confirm('¿Quitar este material del pedido? El stock se regresará al inventario.')) return;
  try {
    const respuesta = await fetch(`${API_URL}/${pedidoAbiertoId}/materiales/${idDetalle}`, { method: 'DELETE' });
    if (!respuesta.ok) throw new Error((await respuesta.json()).error);
    await abrirDetalle(pedidoAbiertoId);
    cargarPedidos();
  } catch (error) {
    mostrarToast('No se pudo quitar: ' + error.message, 'error');
  }
}

async function cambiarEstadoPedido() {
  const pedido = pedidos.find(p => p.id_pedido === pedidoAbiertoId);
  try {
    const respuesta = await fetch(`${API_URL}/${pedidoAbiertoId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        descripcion: pedido.descripcion, ancho: pedido.ancho, alto: pedido.alto,
        precio_mano_obra: pedido.precio_mano_obra, estado: document.getElementById('estadoPedido').value,
        fecha_entrega_estimada: pedido.fecha_entrega_estimada
      })
    });
    if (!respuesta.ok) throw new Error((await respuesta.json()).error);
    cargarPedidos();
    mostrarToast('Estado actualizado.', 'ok');
  } catch (error) {
    mostrarToast('No se pudo actualizar: ' + error.message, 'error');
  }
}

cargarClientesSelect();
cargarMaterialesSelect();
cargarPedidos();
