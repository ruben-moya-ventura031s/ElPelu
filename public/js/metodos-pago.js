const API_URL = 'http://localhost:3001/api/metodos-pago';

let metodos = [];

async function cargarMetodos() {
  try {
    const respuesta = await fetch(API_URL);
    if (!respuesta.ok) throw new Error('API no disponible');
    metodos = await respuesta.json();
  } catch (error) {
    console.warn('No se pudo conectar con la API.', error.message);
    metodos = [];
  }
  render(metodos);
}

function render(lista) {
  const tbody = document.getElementById('tablaMetodos');
  tbody.innerHTML = lista.length === 0
    ? '<tr><td colspan="3" style="color:var(--text-dim);">Sin métodos de pago todavía.</td></tr>'
    : lista.map(m => `
      <tr>
        <td>${m.nombre}</td>
        <td><span class="badge ${m.estado ? 'on' : 'off'}" style="cursor:pointer;" onclick="cambiarEstadoMetodo(${m.id_metodo_pago})">${m.estado ? 'Activo' : 'Inactivo'}</span></td>
        <td style="text-align:right;"><button class="btn-icon" onclick="eliminarMetodo(${m.id_metodo_pago})">🗑</button></td>
      </tr>`).join('');
}

function nuevoMetodo() {
  document.getElementById('nombre').value = '';
  document.getElementById('fNombre').classList.remove('error');
  abrirModal('modalMetodo');
}

async function guardarMetodo() {
  const nombre = document.getElementById('nombre').value.trim();
  if (!nombre) { document.getElementById('fNombre').classList.add('error'); return; }

  try {
    const respuesta = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre }) });
    if (!respuesta.ok) throw new Error((await respuesta.json()).error);
    cerrarModal('modalMetodo');
    cargarMetodos();
  } catch (error) {
    mostrarToast('No se pudo guardar: ' + error.message, 'error');
  }
}

function eliminarMetodo(id) {
  if (!confirm('¿Eliminar este método de pago?')) return;
  fetch(`${API_URL}/${id}`, { method: 'DELETE' })
    .then(r => { if (!r.ok) throw new Error('No se pudo eliminar'); cargarMetodos(); })
    .catch(error => mostrarToast(error.message, 'error'));
}

async function cambiarEstadoMetodo(id) {
  const m = metodos.find(x => x.id_metodo_pago === id);
  try {
    const respuesta = await fetch(`${API_URL}/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre: m.nombre, estado: !m.estado })
    });
    if (!respuesta.ok) throw new Error((await respuesta.json()).error);
    cargarMetodos();
  } catch (error) {
    mostrarToast('No se pudo actualizar: ' + error.message, 'error');
  }
}

cargarMetodos();
