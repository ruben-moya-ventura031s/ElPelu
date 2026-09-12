const API_URL = 'http://localhost:3001/api/clientes';

let clientes = [];

async function cargarClientes() {
  try {
    const respuesta = await fetch(API_URL);
    if (!respuesta.ok) throw new Error('API no disponible');
    clientes = await respuesta.json();
  } catch (error) {
    console.warn('No se pudo conectar con la API.', error.message);
    clientes = [];
  }
  render(clientes);
}

function render(lista) {
  const tbody = document.getElementById('tablaClientes');
  tbody.innerHTML = '';

  if (lista.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="color:var(--text-dim);">Sin clientes registrados todavía.</td></tr>';
    return;
  }

  lista.forEach(c => {
    const fila = document.createElement('tr');
    fila.innerHTML = `
      <td>${c.nombre}</td>
      <td>${c.cedula_rnc || '—'}</td>
      <td>${c.telefono || '—'}</td>
      <td>RD$ ${Number(c.limite_credito).toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
      <td>
        <span class="badge ${c.estado ? 'on' : 'off'}" style="cursor:pointer;" onclick="cambiarEstadoCliente(${c.id_cliente})">
          ${c.estado ? 'Activo' : 'Inactivo'}
        </span>
      </td>
      <td style="text-align:right;">
        <button class="btn-icon" onclick="editarCliente(${c.id_cliente})">✎</button>
        <button class="btn-icon" onclick="eliminarCliente(${c.id_cliente})">🗑</button>
      </td>`;
    tbody.appendChild(fila);
  });
}

function filtrar() {
  const q = document.getElementById('buscador').value.toLowerCase();
  render(clientes.filter(c =>
    c.nombre.toLowerCase().includes(q) || (c.cedula_rnc || '').includes(q)
  ));
}

function nuevoCliente() {
  document.getElementById('tituloModal').textContent = 'Nuevo cliente';
  document.getElementById('idCliente').value = '';
  ['nombre', 'cedula', 'telefono', 'correo', 'direccion'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('limiteCredito').value = 0;
  limpiarErrores();
  abrirModal('modalCliente');
}

function editarCliente(id) {
  const c = clientes.find(x => x.id_cliente === id);
  document.getElementById('tituloModal').textContent = 'Editar cliente';
  document.getElementById('idCliente').value = c.id_cliente;
  document.getElementById('nombre').value = c.nombre;
  document.getElementById('cedula').value = c.cedula_rnc || '';
  document.getElementById('telefono').value = c.telefono || '';
  document.getElementById('correo').value = c.correo || '';
  document.getElementById('direccion').value = c.direccion || '';
  document.getElementById('limiteCredito').value = c.limite_credito || 0;
  limpiarErrores();
  abrirModal('modalCliente');
}

function eliminarCliente(id) {
  if (!confirm('¿Eliminar este cliente?')) return;

  fetch(`${API_URL}/${id}`, { method: 'DELETE' })
    .then(r => { if (!r.ok) throw new Error('No se pudo eliminar'); cargarClientes(); })
    .catch(error => mostrarToast(error.message, 'error'));
}

async function cambiarEstadoCliente(id) {
  const c = clientes.find(x => x.id_cliente === id);
  const nuevoEstado = !c.estado;

  try {
    const respuesta = await fetch(`${API_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: c.nombre, cedula_rnc: c.cedula_rnc, telefono: c.telefono, correo: c.correo, direccion: c.direccion, limite_credito: c.limite_credito, estado: nuevoEstado })
    });
    if (!respuesta.ok) throw new Error((await respuesta.json()).error);
    cargarClientes();
  } catch (error) {
    mostrarToast('No se pudo actualizar: ' + error.message, 'error');
  }
}

function limpiarErrores() {
  ['fNombre', 'fCedula', 'fTelefono', 'fCorreo'].forEach(id => document.getElementById(id).classList.remove('error'));
}

function validar() {
  limpiarErrores();
  let valido = true;

  if (!document.getElementById('nombre').value.trim()) {
    document.getElementById('fNombre').classList.add('error');
    valido = false;
  }
  const cedula = document.getElementById('cedula').value.trim();
  if (cedula && !cedulaValida(cedula)) {
    document.getElementById('fCedula').classList.add('error');
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

async function guardarCliente() {
  if (!validar()) return;

  const id = document.getElementById('idCliente').value;
  const datos = {
    nombre: document.getElementById('nombre').value.trim(),
    cedula_rnc: document.getElementById('cedula').value.trim() || null,
    telefono: document.getElementById('telefono').value.trim(),
    correo: document.getElementById('correo').value.trim(),
    direccion: document.getElementById('direccion').value.trim(),
    limite_credito: Number(document.getElementById('limiteCredito').value) || 0,
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

  cerrarModal('modalCliente');
  cargarClientes();
}

cargarClientes();
