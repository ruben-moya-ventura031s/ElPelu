const API_URL = 'http://localhost:3001/api/proveedores';

let proveedores = [];

async function cargarProveedores() {
  try {
    const respuesta = await fetch(API_URL);
    if (!respuesta.ok) throw new Error('API no disponible');
    proveedores = await respuesta.json();
  } catch (error) {
    console.warn('No se pudo conectar con la API.', error.message);
    proveedores = [];
  }
  render(proveedores);
}

function render(lista) {
  const tbody = document.getElementById('tablaProveedores');
  tbody.innerHTML = '';

  if (lista.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="color:var(--text-dim);">Sin proveedores registrados todavía.</td></tr>';
    return;
  }

  lista.forEach(p => {
    const fila = document.createElement('tr');
    fila.innerHTML = `
      <td>${p.nombre}</td>
      <td>${p.telefono || '—'}</td>
      <td>${p.correo || '—'}</td>
      <td><span class="badge ${p.estado ? 'on' : 'off'}" style="cursor:pointer;" onclick="cambiarEstadoProveedor(${p.id_proveedor})">${p.estado ? 'Activo' : 'Inactivo'}</span></td>
      <td style="text-align:right;">
        <button class="btn-icon" onclick="editarProveedor(${p.id_proveedor})">✎</button>
        <button class="btn-icon" onclick="eliminarProveedor(${p.id_proveedor})">🗑</button>
      </td>`;
    tbody.appendChild(fila);
  });
}

function filtrar() {
  const q = document.getElementById('buscador').value.toLowerCase();
  render(proveedores.filter(p => p.nombre.toLowerCase().includes(q)));
}

function nuevoProveedor() {
  document.getElementById('tituloModal').textContent = 'Nuevo proveedor';
  document.getElementById('idProveedor').value = '';
  ['nombre', 'telefono', 'correo', 'direccion'].forEach(id => document.getElementById(id).value = '');
  limpiarErrores();
  abrirModal('modalProveedor');
}

function editarProveedor(id) {
  const p = proveedores.find(x => x.id_proveedor === id);
  document.getElementById('tituloModal').textContent = 'Editar proveedor';
  document.getElementById('idProveedor').value = p.id_proveedor;
  document.getElementById('nombre').value = p.nombre;
  document.getElementById('telefono').value = p.telefono || '';
  document.getElementById('correo').value = p.correo || '';
  document.getElementById('direccion').value = p.direccion || '';
  limpiarErrores();
  abrirModal('modalProveedor');
}

function eliminarProveedor(id) {
  if (!confirm('¿Eliminar este proveedor?')) return;
  fetch(`${API_URL}/${id}`, { method: 'DELETE' })
    .then(r => { if (!r.ok) throw new Error('No se pudo eliminar'); cargarProveedores(); })
    .catch(error => mostrarToast(error.message, 'error'));
}

async function cambiarEstadoProveedor(id) {
  const p = proveedores.find(x => x.id_proveedor === id);
  const nuevoEstado = !p.estado;
  try {
    const respuesta = await fetch(`${API_URL}/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: p.nombre, telefono: p.telefono, correo: p.correo, direccion: p.direccion, estado: nuevoEstado })
    });
    if (!respuesta.ok) throw new Error((await respuesta.json()).error);
    cargarProveedores();
  } catch (error) {
    mostrarToast('No se pudo actualizar: ' + error.message, 'error');
  }
}

function limpiarErrores() {
  ['fNombre', 'fTelefono', 'fCorreo'].forEach(id => document.getElementById(id).classList.remove('error'));
}

function validar() {
  limpiarErrores();
  let valido = true;
  if (!document.getElementById('nombre').value.trim()) {
    document.getElementById('fNombre').classList.add('error');
    valido = false;
  }
  if (!telefonoValido(document.getElementById('telefono').value)) {
    document.getElementById('fTelefono').classList.add('error');
    valido = false;
  }
  if (!correoValido(document.getElementById('correo').value)) {
    document.getElementById('fCorreo').classList.add('error');
    valido = false;
  }
  return valido;
}

async function guardarProveedor() {
  if (!validar()) return;

  const id = document.getElementById('idProveedor').value;
  const datos = {
    nombre: document.getElementById('nombre').value.trim(),
    telefono: document.getElementById('telefono').value.trim(),
    correo: document.getElementById('correo').value.trim(),
    direccion: document.getElementById('direccion').value.trim(),
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

  cerrarModal('modalProveedor');
  cargarProveedores();
}

cargarProveedores();
