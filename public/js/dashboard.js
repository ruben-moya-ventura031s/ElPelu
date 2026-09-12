const API_URL = 'http://localhost:3001/api/dashboard';

let datosGrafico = [
  { dia: 'Lun', valor: 0 }, { dia: 'Mar', valor: 0 }, { dia: 'Mié', valor: 0 },
  { dia: 'Jue', valor: 0 }, { dia: 'Vie', valor: 0 }, { dia: 'Sáb', valor: 0 }, { dia: 'Dom', valor: 0 }
];

function dibujarGrafico() {
  const canvas = document.getElementById('graficoVentas');
  const ctx = canvas.getContext('2d');
  canvas.width = canvas.clientWidth;
  canvas.height = 150;

  const max = Math.max(...datosGrafico.map(d => d.valor), 1);
  const barW = canvas.width / datosGrafico.length;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  datosGrafico.forEach((d, i) => {
    const h = (d.valor / max) * 110;
    const x = i * barW + barW * 0.25;
    const y = canvas.height - h - 20;

    ctx.fillStyle = '#ff9d2b';
    ctx.fillRect(x, y, barW * 0.5, h);

    ctx.fillStyle = '#8b929c';
    ctx.font = '11px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(d.dia, x + barW * 0.25, canvas.height - 5);
  });
}

async function cargarDashboard() {
  try {
    const respuesta = await fetch(API_URL);
    if (!respuesta.ok) throw new Error('API no disponible');
    const datos = await respuesta.json();

    document.getElementById('statVentasHoy').textContent = `RD$ ${datos.ventas_hoy.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`;
    document.getElementById('statPedidos').textContent = datos.pedidos_pendientes;
    document.getElementById('statStockBajo').textContent = datos.productos_stock_bajo;
    document.getElementById('statCuentasCobrar').textContent = `RD$ ${datos.cuentas_por_cobrar.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`;
    document.getElementById('statValorInventario').textContent = `RD$ ${datos.valor_inventario.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`;
    document.getElementById('statEntradasMes').textContent = datos.entradas_mes.toLocaleString('es-DO');
    document.getElementById('statSalidasMes').textContent = datos.salidas_mes.toLocaleString('es-DO');

    const tbodyMov = document.getElementById('tablaMovimientos');
    tbodyMov.innerHTML = datos.ultimos_movimientos.length === 0
      ? '<tr><td colspan="3" style="color:var(--text-dim);">Sin movimientos todavía</td></tr>'
      : datos.ultimos_movimientos.map(m => `
        <tr>
          <td>${m.producto_nombre}</td>
          <td><span class="badge ${m.tipo === 'ENTRADA' ? 'on' : 'off'}">${m.tipo}</span></td>
          <td>${m.cantidad} ${m.unidad_medida}</td>
        </tr>`).join('');

    const nombresDias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    datosGrafico = datos.ventas_ultimos_7_dias.map(d => ({
      dia: nombresDias[new Date(d.dia).getUTCDay()],
      valor: d.total
    }));
    dibujarGrafico();
  } catch (error) {
    console.warn('No se pudo conectar con la API.', error.message);
    dibujarGrafico();
  }
  cargarStockBajo();
}

async function cargarStockBajo() {
  const tbody = document.getElementById('tablaStockBajo');
  try {
    const respuesta = await fetch('http://localhost:3001/api/reportes/inventario-bajo');
    if (!respuesta.ok) throw new Error('API no disponible');
    const datos = await respuesta.json();

    if (datos.length === 0) {
      tbody.innerHTML = '<tr><td colspan="2" style="color:var(--text-dim);">Todo el inventario está en buen nivel</td></tr>';
      return;
    }

    tbody.innerHTML = datos.map(p => `
      <tr>
        <td>${p.nombre}</td>
        <td><span class="badge off">${p.stock} ${p.unidad_medida}</span></td>
      </tr>`).join('');
  } catch (error) {
    tbody.innerHTML = '<tr><td colspan="2" style="color:var(--text-dim);">No se pudo cargar</td></tr>';
  }
}

cargarDashboard();
