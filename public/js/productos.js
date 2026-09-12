const API_URL = '/api/productos';

let productos = [];
let imagenBase64Actual = null;

async function cargarProductos() {
  try {
    const respuesta = await fetch(API_URL);
    if (!respuesta.ok) throw new Error('API no disponible');
    productos = await respuesta.json();
  } catch (error) {
    console.warn('No se pudo conectar con la API.', error.message);
    productos = [];
  }
  actualizarEstadisticas();
  render(productos);
}

function actualizarEstadisticas() {
  const bajo = productos.filter(p => Number(p.stock) <= Number(p.stock_minimo));
  const valor = productos.reduce((acc, p) => acc + Number(p.stock) * Number(p.precio_compra), 0);
  document.getElementById('statTotal').textContent = productos.length;
  document.getElementById('statBajo').textContent = bajo.length;
  document.getElementById('statValor').textContent = `RD$ ${valor.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`;
}

function nivelStock(p) {
  const stock = Number(p.stock);
  const minimo = Number(p.stock_minimo) || 1;
  const ratio = stock / minimo;
  const ancho = Math.min(ratio * 50, 100);
  const color = stock <= minimo ? 'var(--danger)' : ratio < 2 ? 'var(--warn)' : 'var(--ok)';
  return `
    <div style="width:70px;height:6px;background:var(--bg-panel-2);border-radius:4px;overflow:hidden;">
      <div style="width:${ancho}%;height:100%;background:${color};"></div>
    </div>`;
}

async function cargarProveedoresSelect() {
  try {
    const respuesta = await fetch('/api/proveedores');
    if (!respuesta.ok) throw new Error('API no disponible');
    const proveedores = await respuesta.json();
    document.getElementById('proveedor').innerHTML = '<option value="">Ninguno</option>' +
      proveedores.map(p => `<option value="${p.id_proveedor}">${p.nombre}</option>`).join('');
  } catch (error) {
    console.warn('No se pudieron cargar los proveedores.', error.message);
  }
}

function render(lista) {
  const tbody = document.getElementById('tablaProductos');
  tbody.innerHTML = '';

  if (lista.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="color:var(--text-dim);">Sin productos registrados todavía.</td></tr>';
    return;
  }

  lista.forEach(p => {
    const miniatura = p.imagen
      ? `<img src="${p.imagen}" style="width:28px;height:28px;border-radius:6px;object-fit:cover;margin-right:8px;vertical-align:middle;">`
      : `<span style="display:inline-block;width:28px;height:28px;border-radius:6px;background:var(--bg-panel-2);margin-right:8px;vertical-align:middle;"></span>`;
    const bajoStock = Number(p.stock) <= Number(p.stock_minimo);

    const fila = document.createElement('tr');
    fila.innerHTML = `
      <td>${p.codigo}</td>
      <td>${miniatura}${p.nombre}</td>
      <td>${p.tipo === 'PRODUCTO' ? 'Producto' : 'Material'}</td>
      <td>RD$ ${Number(p.precio_venta).toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
      <td>${bajoStock ? `<span class="badge off" title="Stock mínimo: ${p.stock_minimo}">${p.stock} ${p.unidad_medida} ⚠</span>` : `${p.stock} ${p.unidad_medida}`}</td>
      <td>${nivelStock(p)}</td>
      <td><span class="badge ${p.estado ? 'on' : 'off'}" style="cursor:pointer;" onclick="cambiarEstadoProducto(${p.id_producto})">${p.estado ? 'Activo' : 'Inactivo'}</span></td>
      <td style="text-align:right;">
        <button class="btn-icon" onclick="editarProducto(${p.id_producto})">✎</button>
        <button class="btn-icon" onclick="eliminarProducto(${p.id_producto})">🗑</button>
      </td>`;
    tbody.appendChild(fila);
  });
}

function filtrar() {
  const q = document.getElementById('buscador').value.toLowerCase();
  const tipo = document.getElementById('filtroTipo').value;
  render(productos.filter(p =>
    (p.nombre.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q)) &&
    (!tipo || p.tipo === tipo)
  ));
}

function previsualizarImagen() {
  const archivo = document.getElementById('imagen').files[0];
  if (!archivo) return;
  const lector = new FileReader();
  lector.onload = e => {
    imagenBase64Actual = e.target.result;
    const img = document.getElementById('previewImagen');
    img.src = imagenBase64Actual;
    img.style.display = 'block';
  };
  lector.readAsDataURL(archivo);
}

function nuevoProducto() {
  document.getElementById('tituloModal').textContent = 'Nuevo producto';
  document.getElementById('idProducto').value = '';
  ['codigo', 'nombre', 'precioCompra', 'precioVenta', 'stock'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('stockMinimo').value = 5;
  document.getElementById('tipo').value = 'PRODUCTO';
  document.getElementById('unidadMedida').value = 'unidad';
  document.getElementById('imagen').value = '';
  document.getElementById('previewImagen').style.display = 'none';
  imagenBase64Actual = null;
  limpiarErrores();
  abrirModal('modalProducto');
}

function editarProducto(id) {
  const p = productos.find(x => x.id_producto === id);
  document.getElementById('tituloModal').textContent = 'Editar producto';
  document.getElementById('idProducto').value = p.id_producto;
  document.getElementById('codigo').value = p.codigo;
  document.getElementById('nombre').value = p.nombre;
  document.getElementById('tipo').value = p.tipo;
  document.getElementById('unidadMedida').value = p.unidad_medida;
  if (p.id_proveedor) document.getElementById('proveedor').value = p.id_proveedor;
  document.getElementById('precioCompra').value = p.precio_compra;
  document.getElementById('precioVenta').value = p.precio_venta;
  document.getElementById('stock').value = p.stock;
  document.getElementById('stockMinimo').value = p.stock_minimo;
  document.getElementById('imagen').value = '';
  imagenBase64Actual = p.imagen || null;
  const img = document.getElementById('previewImagen');
  if (p.imagen) { img.src = p.imagen; img.style.display = 'block'; } else { img.style.display = 'none'; }
  limpiarErrores();
  abrirModal('modalProducto');
}

function eliminarProducto(id) {
  if (!confirm('¿Eliminar este producto?')) return;
  fetch(`${API_URL}/${id}`, { method: 'DELETE' })
    .then(r => { if (!r.ok) throw new Error('No se pudo eliminar'); cargarProductos(); })
    .catch(error => mostrarToast(error.message, 'error'));
}

async function cambiarEstadoProducto(id) {
  const p = productos.find(x => x.id_producto === id);
  const nuevoEstado = !p.estado;
  try {
    const respuesta = await fetch(`${API_URL}/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        codigo: p.codigo, nombre: p.nombre, descripcion: p.descripcion, tipo: p.tipo, unidad_medida: p.unidad_medida,
        id_proveedor: p.id_proveedor, precio_compra: p.precio_compra, precio_venta: p.precio_venta,
        stock: p.stock, stock_minimo: p.stock_minimo, estado: nuevoEstado, imagen: p.imagen
      })
    });
    if (!respuesta.ok) throw new Error((await respuesta.json()).error);
    cargarProductos();
  } catch (error) {
    mostrarToast('No se pudo actualizar: ' + error.message, 'error');
  }
}

function limpiarErrores() {
  ['fCodigo', 'fNombre', 'fPrecioCompra', 'fPrecioVenta', 'fStock'].forEach(id => document.getElementById(id).classList.remove('error'));
}

function validar() {
  limpiarErrores();
  let valido = true;
  const requeridos = { fCodigo: 'codigo', fNombre: 'nombre', fPrecioCompra: 'precioCompra', fPrecioVenta: 'precioVenta', fStock: 'stock' };
  for (const campo in requeridos) {
    const valor = document.getElementById(requeridos[campo]).value;
    if (valor === '' || valor === null) {
      document.getElementById(campo).classList.add('error');
      valido = false;
    }
  }
  return valido;
}

async function guardarProducto() {
  if (!validar()) return;

  const id = document.getElementById('idProducto').value;
  const datos = {
    codigo: document.getElementById('codigo').value.trim(),
    nombre: document.getElementById('nombre').value.trim(),
    descripcion: '',
    tipo: document.getElementById('tipo').value,
    unidad_medida: document.getElementById('unidadMedida').value,
    id_proveedor: document.getElementById('proveedor').value || null,
    precio_compra: Number(document.getElementById('precioCompra').value),
    precio_venta: Number(document.getElementById('precioVenta').value),
    stock: Number(document.getElementById('stock').value),
    stock_minimo: Number(document.getElementById('stockMinimo').value) || 5,
    imagen: imagenBase64Actual,
    estado: true
  };

  let respuesta;
  try {
    respuesta = await fetch(id ? `${API_URL}/${id}` : API_URL, {
      method: id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    });
  } catch (errorDeRed) {
    mostrarToast('No se pudo conectar con el servidor.', 'error');
    return;
  }

  if (!respuesta.ok) {
    const error = await respuesta.json();
    mostrarToast('No se pudo guardar: ' + error.error, 'error');
    return;
  }

  cerrarModal('modalProducto');
  cargarProductos();
}

cargarProveedoresSelect();
cargarProductos();
