const API_URL = '/api/configuracion';

async function cargarConfiguracion() {
  try {
    const respuesta = await fetch(API_URL);
    if (!respuesta.ok) throw new Error('API no disponible');
    const datos = await respuesta.json();
    document.getElementById('nombre').value = datos.nombre || '';
    document.getElementById('rnc').value = datos.rnc || '';
    document.getElementById('direccion').value = datos.direccion || '';
    document.getElementById('telefono').value = datos.telefono || '';
    document.getElementById('correo').value = datos.correo || '';
    document.getElementById('mensajePie').value = datos.mensaje_pie || 'Gracias por su compra';
  } catch (error) {
    console.warn('No se pudo conectar con la API.', error.message);
  }
}

async function guardarConfiguracion() {
  const nombre = document.getElementById('nombre').value.trim();
  if (!nombre) {
    mostrarToast('El nombre del negocio es obligatorio.', 'error');
    return;
  }

  try {
    const respuesta = await fetch(API_URL, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre,
        rnc: document.getElementById('rnc').value.trim(),
        direccion: document.getElementById('direccion').value.trim(),
        telefono: document.getElementById('telefono').value.trim(),
        correo: document.getElementById('correo').value.trim(),
        mensaje_pie: document.getElementById('mensajePie').value.trim() || 'Gracias por su compra'
      })
    });
    if (!respuesta.ok) throw new Error((await respuesta.json()).error);
    mostrarToast('Configuración guardada.', 'ok');
  } catch (error) {
    mostrarToast('No se pudo guardar: ' + error.message, 'error');
  }
}

cargarConfiguracion();
