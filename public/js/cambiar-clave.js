const API_URL = 'http://localhost:3001/api/usuarios';

function limpiarErrores() {
  ['fActual', 'fNueva', 'fConfirmar'].forEach(id => document.getElementById(id).classList.remove('error'));
}

async function cambiarClave() {
  limpiarErrores();
  const sesion = JSON.parse(localStorage.getItem('sesionElPelu') || '{}');

  if (!sesion.id) {
    mostrarToast('No se pudo identificar tu sesión. Inicia sesión de nuevo.', 'error');
    return;
  }

  const actual = document.getElementById('claveActual').value;
  const nueva = document.getElementById('claveNueva').value;
  const confirmar = document.getElementById('claveConfirmar').value;
  let valido = true;

  if (!actual) { document.getElementById('fActual').classList.add('error'); valido = false; }
  if (!nueva) { document.getElementById('fNueva').classList.add('error'); valido = false; }
  if (nueva !== confirmar) { document.getElementById('fConfirmar').classList.add('error'); valido = false; }
  if (!valido) return;

  try {
    const respuesta = await fetch(`${API_URL}/${sesion.id}/cambiar-clave`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clave_actual: actual, clave_nueva: nueva })
    });
    if (!respuesta.ok) throw new Error((await respuesta.json()).error);

    mostrarToast('Contraseña actualizada correctamente.', 'ok');
    document.getElementById('claveActual').value = '';
    document.getElementById('claveNueva').value = '';
    document.getElementById('claveConfirmar').value = '';
  } catch (error) {
    mostrarToast('No se pudo cambiar la contraseña: ' + error.message, 'error');
  }
}
