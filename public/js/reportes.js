const API_BASE = 'http://localhost:3001/api/reportes';

const config = {
  ventas: {
    endpoint: 'ventas', porFecha: true,
    columnas: ['Fecha', 'Cliente', 'Tipo de pago', 'NCF', 'Total'],
    fila: r => [
      new Date(r.fecha).toLocaleDateString('es-DO'),
      r.cliente || 'Consumidor final',
      r.tipo_pago,
      r.ncf || '—',
      `RD$ ${Number(r.total).toLocaleString('es-DO', { minimumFractionDigits: 2 })}`
    ]
  },
  compras: {
    endpoint: 'compras', porFecha: true,
    columnas: ['Fecha', 'Proveedor', 'Total'],
    fila: r => [new Date(r.fecha).toLocaleDateString('es-DO'), r.proveedor, `RD$ ${Number(r.total).toLocaleString('es-DO', { minimumFractionDigits: 2 })}`]
  },
  inventarioBajo: {
    endpoint: 'inventario-bajo', porFecha: false,
    columnas: ['Código', 'Nombre', 'Tipo', 'Stock', 'Stock mínimo'],
    fila: r => [r.codigo, r.nombre, r.tipo === 'PRODUCTO' ? 'Producto' : 'Material', `${r.stock} ${r.unidad_medida}`, `${r.stock_minimo} ${r.unidad_medida}`]
  },
  cuentasCobrar: {
    endpoint: 'cuentas-cobrar', porFecha: false,
    columnas: ['Cliente', 'Saldo', 'Vencimiento', 'Estado'],
    fila: r => [r.cliente, `RD$ ${Number(r.saldo).toLocaleString('es-DO', { minimumFractionDigits: 2 })}`, new Date(r.fecha_vencimiento).toLocaleDateString('es-DO'), r.estado]
  },
  pedidosPorEstado: {
    endpoint: 'pedidos-por-estado', porFecha: false,
    columnas: ['Descripción', 'Cliente', 'Estado', 'Entrega estimada'],
    fila: r => [r.descripcion, r.cliente, r.estado, r.fecha_entrega_estimada ? new Date(r.fecha_entrega_estimada).toLocaleDateString('es-DO') : '—']
  }
};

async function cambiarReporte() {
  const tipo = document.getElementById('tipoReporte').value;
  const c = config[tipo];

  document.getElementById('filtroFechas').style.display = c.porFecha ? 'flex' : 'none';
  document.getElementById('cabeceraReporte').innerHTML = '<tr>' + c.columnas.map(col => `<th>${col}</th>`).join('') + '</tr>';
  document.getElementById('tablaReporte').innerHTML = `<tr><td colspan="${c.columnas.length}" style="color:var(--text-dim);">Cargando...</td></tr>`;

  let url = `${API_BASE}/${c.endpoint}`;
  if (c.porFecha) {
    const desde = document.getElementById('fechaDesde').value;
    const hasta = document.getElementById('fechaHasta').value;
    const params = new URLSearchParams();
    if (desde) params.set('desde', desde);
    if (hasta) params.set('hasta', hasta);
    if ([...params].length) url += `?${params.toString()}`;
  }

  try {
    const respuesta = await fetch(url);
    if (!respuesta.ok) throw new Error('API no disponible');
    const datos = await respuesta.json();

    document.getElementById('tablaReporte').innerHTML = datos.length === 0
      ? `<tr><td colspan="${c.columnas.length}" style="color:var(--text-dim);">Sin datos</td></tr>`
      : datos.map(r => '<tr>' + c.fila(r).map(v => `<td>${v}</td>`).join('') + '</tr>').join('');
  } catch (error) {
    document.getElementById('tablaReporte').innerHTML = `<tr><td colspan="${c.columnas.length}" style="color:var(--text-dim);">No se pudo conectar con la base de datos.</td></tr>`;
  }
}

cambiarReporte();
