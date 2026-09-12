const API_URL = 'http://localhost:3001/api/inventario';

let movimientos = [];

async function cargarProductosSelect() {
  try {
    const respuesta = await fetch('http://localhost:3001/api/productos');
    if (!respuesta.ok) throw new Error('API no disponible');
    const productos = await respuesta.json();
    document.getElementById('producto').innerHTML = productos.map(p =>
      `<option value="${p.id_producto}">${p.nombre} (stock actual: ${p.stock} ${p.unidad_medida})</option>`).join('');
  } catch (error) {
    console.warn('No se pudo cargar la lista de productos.', error.message);
  }
}

async function cargarMovimientos() {
  try {
    const respuesta = await fetch(API_URL);
    if (!respuesta.ok) throw new Error('API no disponible');
    movimientos = await respuesta.json();
  } catch (error) {
    console.warn('No se pudo conectar con la API.', error.message);
    movimientos = [];
  }
  actualizarEstadisticas();
  render(movimientos);
}

function actualizarEstadisticas() {
  document.getElementById('statTotal').textContent = movimientos.length;
  document.getElementById('statEntradas').textContent = movimientos.filter(m => m.tipo === 'ENTRADA').length;
  document.getElementById('statSalidas').textContent = movimientos.filter(m => m.tipo === 'SALIDA').length;
}

function render(lista) {
  const tbody = document.getElementById('tablaMovimientos');
  tbody.innerHTML = lista.length === 0
    ? '<tr><td colspan="6" style="color:var(--text-dim);">Sin movimientos que coincidan.</td></tr>'
    : lista.map(m => `
      <tr>
        <td>${m.producto_nombre}</td>
        <td><span class="badge ${m.tipo === 'ENTRADA' ? 'on' : 'off'}">${m.tipo}</span></td>
        <td>${m.cantidad} ${m.unidad_medida}</td>
        <td>${m.motivo || '—'}</td>
        <td>${new Date(m.fecha).toLocaleDateString('es-DO')}</td>
        <td>${m.stock} ${m.unidad_medida}</td>
      </tr>`).join('');
}

function filtrar() {
  const q = document.getElementById('buscador').value.toLowerCase();
  const tipo = document.getElementById('filtroTipo').value;
  render(movimientos.filter(m =>
    m.producto_nombre.toLowerCase().includes(q) && (!tipo || m.tipo === tipo)
  ));
}

function nuevoMovimiento() {
  document.getElementById('cantidad').value = '';
  document.getElementById('motivo').value = '';
  document.getElementById('tipo').value = 'ENTRADA';
  document.getElementById('fProducto').classList.remove('error');
  document.getElementById('fCantidad').classList.remove('error');
  abrirModal('modalMovimiento');
}

async function guardarMovimiento() {
  const idProducto = document.getElementById('producto').value;
  const tipo = document.getElementById('tipo').value;
  const cantidad = Number(document.getElementById('cantidad').value);
  const motivo = document.getElementById('motivo').value.trim();

  let valido = true;
  if (!idProducto) { document.getElementById('fProducto').classList.add('error'); valido = false; }
  if (!cantidad || cantidad <= 0) { document.getElementById('fCantidad').classList.add('error'); valido = false; }
  if (!valido) return;

  try {
    const respuesta = await fetch(API_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_producto: idProducto, tipo, cantidad, motivo })
    });
    if (!respuesta.ok) throw new Error((await respuesta.json()).error);
    cerrarModal('modalMovimiento');
    cargarMovimientos();
    cargarProductosSelect();
    mostrarToast('Movimiento registrado.', 'ok');
  } catch (error) {
    mostrarToast('No se pudo registrar: ' + error.message, 'error');
  }
}

cargarProductosSelect();
cargarMovimientos();
