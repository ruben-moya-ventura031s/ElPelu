const API_URL = 'http://localhost:3001/api/compras';

let compras = [];
let productosDisponibles = [];
let itemsCompra = [];

async function cargarCompras() {
  try {
    const respuesta = await fetch(API_URL);
    if (!respuesta.ok) throw new Error('API no disponible');
    compras = await respuesta.json();
  } catch (error) {
    console.warn('No se pudo conectar con la API.', error.message);
    compras = [];
  }
  render(compras);
}

function render(lista) {
  const tbody = document.getElementById('tablaCompras');
  tbody.innerHTML = lista.length === 0
    ? '<tr><td colspan="4" style="color:var(--text-dim);">Sin compras registradas todavía.</td></tr>'
    : lista.map(c => `
      <tr>
        <td>${c.proveedor_nombre}</td>
        <td>${new Date(c.fecha).toLocaleDateString('es-DO')}</td>
        <td>RD$ ${Number(c.total).toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
        <td><span class="badge on">${c.estado}</span></td>
      </tr>`).join('');
}

async function cargarSelects() {
  try {
    const [rProveedores, rProductos] = await Promise.all([
      fetch('http://localhost:3001/api/proveedores'),
      fetch('http://localhost:3001/api/productos')
    ]);
    if (rProveedores.ok) {
      const proveedores = await rProveedores.json();
      document.getElementById('proveedor').innerHTML = proveedores.map(p => `<option value="${p.id_proveedor}">${p.nombre}</option>`).join('');
    }
    if (rProductos.ok) {
      productosDisponibles = await rProductos.json();
      document.getElementById('productoCompra').innerHTML = productosDisponibles.map(p =>
        `<option value="${p.id_producto}" data-precio="${p.precio_compra}">${p.nombre}</option>`).join('');
      actualizarPrecioCompra();
    }
  } catch (error) {
    console.warn('No se pudieron cargar proveedores/productos.', error.message);
  }
}

function actualizarPrecioCompra() {
  const select = document.getElementById('productoCompra');
  document.getElementById('precioCompra').value = select.options[select.selectedIndex]?.dataset.precio || 0;
}

function nuevaCompra() {
  itemsCompra = [];
  document.getElementById('cantidadCompra').value = 1;
  document.getElementById('fProveedor').classList.remove('error');
  renderItemsCompra();
  actualizarPrecioCompra();
  abrirModal('modalCompra');
}

function agregarItemCompra() {
  const select = document.getElementById('productoCompra');
  const idProducto = select.value;
  const nombre = select.options[select.selectedIndex].textContent;
  const cantidad = Number(document.getElementById('cantidadCompra').value);
  const precio = Number(document.getElementById('precioCompra').value);

  if (!cantidad || cantidad <= 0 || !precio) {
    mostrarToast('Ingresa una cantidad y precio válidos.', 'error');
    return;
  }

  itemsCompra.push({ id_producto: idProducto, nombre, cantidad, precio, subtotal: cantidad * precio });
  renderItemsCompra();
}

function quitarItemCompra(index) {
  itemsCompra.splice(index, 1);
  renderItemsCompra();
}

function renderItemsCompra() {
  const tbody = document.getElementById('tablaItemsCompra');
  tbody.innerHTML = itemsCompra.length === 0
    ? '<tr><td colspan="5" style="color:var(--text-dim);">Sin productos agregados</td></tr>'
    : itemsCompra.map((i, idx) => `
      <tr>
        <td>${i.nombre}</td><td>${i.cantidad}</td>
        <td>RD$ ${i.precio.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
        <td>RD$ ${i.subtotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
        <td style="text-align:right;"><button class="btn-icon" onclick="quitarItemCompra(${idx})">🗑</button></td>
      </tr>`).join('');

  const total = itemsCompra.reduce((acc, i) => acc + i.subtotal, 0);
  document.getElementById('totalCompraTxt').textContent = `RD$ ${total.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`;
}

async function guardarCompra() {
  const idProveedor = document.getElementById('proveedor').value;
  if (!idProveedor) { document.getElementById('fProveedor').classList.add('error'); return; }
  if (itemsCompra.length === 0) { mostrarToast('Agrega al menos un producto.', 'error'); return; }

  try {
    const respuesta = await fetch(API_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_proveedor: idProveedor, items: itemsCompra.map(i => ({ id_producto: i.id_producto, cantidad: i.cantidad, precio: i.precio })) })
    });
    if (!respuesta.ok) throw new Error((await respuesta.json()).error);
    cerrarModal('modalCompra');
    cargarCompras();
    mostrarToast('Compra registrada.', 'ok');
  } catch (error) {
    mostrarToast('No se pudo registrar: ' + error.message, 'error');
  }
}

cargarSelects();
cargarCompras();
