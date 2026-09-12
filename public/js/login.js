const API_URL = 'http://localhost:3001/api/usuarios/login';

function mostrarToast(mensaje, tipo = 'ok') {
  let cont = document.getElementById('toastContainer');
  if (!cont) {
    cont = document.createElement('div');
    cont.id = 'toastContainer';
    document.body.appendChild(cont);
  }
  const toast = document.createElement('div');
  toast.className = 'toast' + (tipo === 'error' ? ' error' : '');
  toast.textContent = mensaje;
  cont.appendChild(toast);
  setTimeout(() => toast.remove(), 3800);
}

function togglePass() {
  const clave = document.getElementById('clave');
  const btn = document.getElementById('btnTogglePass');
  const oculto = clave.type === 'password';
  clave.type = oculto ? 'text' : 'password';
  btn.textContent = oculto ? 'Ocultar' : 'Ver';
}

async function cargarMetricasLogin() {
  try {
    const respuesta = await fetch('http://localhost:3001/api/dashboard');
    // El dashboard exige sesión; en el login no la hay todavía, así que si falla, se queda en "—".
    if (!respuesta.ok) return;
    const datos = await respuesta.json();
    document.getElementById('metricVentasHoy').textContent = `RD$ ${datos.ventas_hoy.toLocaleString('es-DO')}`;
    document.getElementById('metricPedidos').textContent = datos.pedidos_pendientes;
    document.getElementById('metricStockBajo').textContent = datos.productos_stock_bajo;
  } catch (error) {
    // silencioso: solo es un adorno informativo del login
  }
}

async function iniciarSesion() {
  document.getElementById('fUsuario').classList.remove('error');
  document.getElementById('fClave').classList.remove('error');

  const usuario = document.getElementById('usuario').value.trim();
  const clave = document.getElementById('clave').value.trim();
  let valido = true;

  if (!usuario) { document.getElementById('fUsuario').classList.add('error'); valido = false; }
  if (!clave) { document.getElementById('fClave').classList.add('error'); valido = false; }
  if (!valido) return;

  try {
    const respuesta = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario, clave })
    });

    if (!respuesta.ok) {
      const error = await respuesta.json();
      mostrarToast(error.error || 'Usuario o contraseña incorrectos', 'error');
      return;
    }

    const datos = await respuesta.json();
    localStorage.setItem('sesionElPelu', JSON.stringify({
      id: datos.id_usuario, nombre: datos.nombre, usuario: datos.usuario, token: datos.token
    }));
    window.location.href = 'dashboard.html';

  } catch (error) {
    mostrarToast('No se pudo conectar con el servidor. Verifica que el backend esté corriendo.', 'error');
  }
}

cargarMetricasLogin();
