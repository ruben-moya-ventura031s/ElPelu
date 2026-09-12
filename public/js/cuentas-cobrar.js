const API_URL = 'http://localhost:3001/api/cuentas-cobrar';

let cuentas = [];
let idCuentaSeleccionada = null;

async function cargarCuentas() {
  try {
    const respuesta = await fetch(API_URL);
    if (!respuesta.ok) throw new Error('API no disponible');
    cuentas = await respuesta.json();
  } catch (error) {
    console.warn('No se pudo conectar con la API.', error.message);
    cuentas = [];
  }
  render(cuentas);
}

async function cargarMetodosPago() {
  try {
    const respuesta = await fetch('http://localhost:3001/api/metodos-pago');
    if (!respuesta.ok) throw new Error('API no disponible');
    const metodos = await respuesta.json();
    document.getElementById('metodoPago').innerHTML = metodos.map(m => `<option value="${m.id_metodo_pago}">${m.nombre}</option>`).join('');
  } catch (error) {
    console.warn('No se pudieron cargar los métodos de pago.', error.message);
  }
}

function render(lista) {
  const tbody = document.getElementById('tablaCuentas');
  tbody.innerHTML = lista.length === 0
    ? '<tr><td colspan="5" style="color:var(--text-dim);">No hay cuentas por cobrar registradas.</td></tr>'
    : lista.map(c => `
      <tr>
        <td>${c.cliente_nombre}</td>
        <td>RD$ ${Number(c.saldo).toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
        <td>${new Date(c.fecha_vencimiento).toLocaleDateString('es-DO')}</td>
        <td><span class="badge ${c.estado === 'PAGADA' ? 'on' : 'off'}">${c.estado}</span></td>
        <td style="text-align:right;">${c.estado !== 'PAGADA' ? `<button class="btn btn-outline" style="padding:6px 12px;font-size:12px;" onclick="abrirAbono(${c.id_cuenta})">Abonar</button>` : ''}</td>
      </tr>`).join('');
}

function filtrar() {
  const q = document.getElementById('buscador').value.toLowerCase();
  render(cuentas.filter(c => c.cliente_nombre.toLowerCase().includes(q)));
}

function abrirAbono(id) {
  idCuentaSeleccionada = id;
  const c = cuentas.find(x => x.id_cuenta === id);
  document.getElementById('resumenAbono').innerHTML =
    `Cliente: <strong style="color:var(--text);">${c.cliente_nombre}</strong><br>
     Saldo pendiente: <strong style="color:var(--text);">RD$ ${Number(c.saldo).toLocaleString('es-DO', { minimumFractionDigits: 2 })}</strong>`;
  document.getElementById('monto').value = '';
  document.getElementById('fMonto').classList.remove('error');
  abrirModal('modalAbono');
}

async function confirmarAbono() {
  const monto = Number(document.getElementById('monto').value);
  if (!monto || monto <= 0) { document.getElementById('fMonto').classList.add('error'); return; }

  try {
    const respuesta = await fetch(`${API_URL}/${idCuentaSeleccionada}/abonos`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ monto, id_metodo_pago: document.getElementById('metodoPago').value })
    });
    if (!respuesta.ok) throw new Error((await respuesta.json()).error);
    cerrarModal('modalAbono');
    cargarCuentas();
    mostrarToast('Abono registrado.', 'ok');
  } catch (error) {
    mostrarToast('No se pudo registrar el abono: ' + error.message, 'error');
  }
}

cargarMetodosPago();
cargarCuentas();
