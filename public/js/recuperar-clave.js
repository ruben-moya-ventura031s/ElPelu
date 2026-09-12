const API_URL = 'http://localhost:3001/api/usuarios/recuperar';

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

function limpiarErrores() {
  ['fUsuario', 'fCorreo', 'fClaveNueva'].forEach(id => document.getElementById(id).classList.remove('error'));
}

async function recuperarClave() {
  limpiarErrores();
  const usuario = document.getElementById('usuario').value.trim();
  const correo = document.getElementById('correo').value.trim();
  const claveNueva = document.getElementById('claveNueva').value;
  let valido = true;

  if (!usuario) { document.getElementById('fUsuario').classList.add('error'); valido = false; }
  if (!correo) { document.getElementById('fCorreo').classList.add('error'); valido = false; }
  if (!claveNueva) { document.getElementById('fClaveNueva').classList.add('error'); valido = false; }
  if (!valido) return;

  try {
    const respuesta = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario, correo, clave_nueva: claveNueva })
    });
    if (!respuesta.ok) throw new Error((await respuesta.json()).error);

    mostrarToast('Contraseña restablecida. Ya puedes iniciar sesión.', 'ok');
    setTimeout(() => window.location.href = 'index.html', 1200);
  } catch (error) {
    mostrarToast('No se pudo restablecer: ' + error.message, 'error');
  }
}
