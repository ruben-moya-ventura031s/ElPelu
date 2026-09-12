// --- Autenticación: agrega el token de sesión a toda llamada a la API automáticamente ---
(function interceptarFetch() {
  const fetchOriginal = window.fetch;
  window.fetch = function (url, options = {}) {
    if (typeof url === 'string' && url.startsWith('/api/')) {
      const sesion = JSON.parse(localStorage.getItem('sesionElPelu') || '{}');
      if (sesion.token) {
        options = { ...options, headers: { ...(options.headers || {}), Authorization: 'Bearer ' + sesion.token } };
      }
    }
    return fetchOriginal(url, options);
  };
})();

function abrirModal(id) {
  document.getElementById(id).classList.add('open');
}

function cerrarModal(id) {
  document.getElementById(id).classList.remove('open');
}

document.querySelectorAll('.overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
});

// --- Notificaciones (toast) ---
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

// --- Validación: solo letras (nombres, apellidos, etc.) ---
function soloLetras(input) {
  input.value = input.value.replace(/[^A-Za-zÀ-ÿñÑ\s]/g, '');
}

// --- Formato de teléfono dominicano: 000-000-0000 ---
function formatearTelefono(input) {
  let digitos = input.value.replace(/\D/g, '').substring(0, 10);
  let formateado = digitos;
  if (digitos.length > 3) formateado = digitos.slice(0, 3) + '-' + digitos.slice(3);
  if (digitos.length > 6) formateado = formateado.slice(0, 7) + '-' + formateado.slice(7);
  input.value = formateado;
}

function telefonoValido(valor) {
  if (!valor.trim()) return true;
  return /^\d{3}-\d{3}-\d{4}$/.test(valor.trim());
}

// --- Formato de cédula/RNC dominicano (cédula: 000-0000000-0, RNC: 000000000 u 1-01-00000-0) ---
function formatearCedula(input) {
  let digitos = input.value.replace(/\D/g, '').substring(0, 11);
  let formateado = digitos;
  if (digitos.length > 3) formateado = digitos.slice(0, 3) + '-' + digitos.slice(3);
  if (digitos.length > 10) formateado = formateado.slice(0, 11) + '-' + formateado.slice(11);
  input.value = formateado;
}

function cedulaValida(valor) {
  return /^\d{3}-\d{7}-\d$/.test(valor.trim());
}

// --- Formato de correo ---
function correoValido(valor) {
  if (!valor.trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor.trim());
}

// --- Tema oscuro/claro ---
function aplicarTemaGuardado() {
  const tema = localStorage.getItem('temaElPelu') || 'dark';
  document.documentElement.dataset.theme = tema;
}

function alternarTema() {
  const actual = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
  const nuevo = actual === 'light' ? 'dark' : 'light';
  document.documentElement.dataset.theme = nuevo;
  localStorage.setItem('temaElPelu', nuevo);
  const btn = document.getElementById('btnTema');
  if (btn) btn.textContent = nuevo === 'light' ? '🌙' : '☀️';
}

aplicarTemaGuardado();

// --- Sesión ---
function iniciales(nombre) {
  return nombre.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase();
}

function cerrarSesion() {
  localStorage.removeItem('sesionElPelu');
  window.location.href = 'index.html';
}

function toggleSidebar() {
  document.querySelector('.sidebar')?.classList.toggle('open');
  document.querySelector('.sidebar-backdrop')?.classList.toggle('open');
}

(function protegerPagina() {
  const sesionGuardada = localStorage.getItem('sesionElPelu');
  if (!sesionGuardada) {
    window.location.href = 'index.html';
    return;
  }

  const topbar = document.querySelector('.topbar');
  if (topbar) {
    const hamburguesa = document.createElement('button');
    hamburguesa.className = 'hamburger';
    hamburguesa.innerHTML = '☰';
    hamburguesa.onclick = toggleSidebar;
    topbar.insertBefore(hamburguesa, topbar.firstChild);
  }

  const backdrop = document.createElement('div');
  backdrop.className = 'sidebar-backdrop';
  backdrop.onclick = toggleSidebar;
  document.querySelector('.app')?.appendChild(backdrop);

  const sesion = JSON.parse(sesionGuardada);
  const chip = document.querySelector('.user-chip');
  if (chip) {
    const temaActual = localStorage.getItem('temaElPelu') || 'dark';
    chip.innerHTML = `
      <button class="theme-toggle" id="btnTema" title="Cambiar tema" onclick="alternarTema()">${temaActual === 'light' ? '🌙' : '☀️'}</button>
      <div class="avatar">${iniciales(sesion.nombre)}</div>
      ${sesion.nombre}
      <a href="cambiar-clave.html" class="btn-icon" style="margin-left:6px;" title="Cambiar contraseña">🔑</a>
      <button class="btn-icon" title="Cerrar sesión" onclick="cerrarSesion()">⏻</button>
    `;
  }
})();