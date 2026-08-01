// ╔══════════════════════════════════════════════════════════════╗
// ║           CellCom Tecnology — Sistema POS v1.0              ║
// ║                      js/pos.js                               ║
// ║    POS Táctil Premium — Venta Rápida + Caja + PDF           ║
// ║    Descuadre de caja + Arqueo completo + PDF profesional    ║
// ╚══════════════════════════════════════════════════════════════╝

'use strict';

// ════════════════════════════════════════════════════════════════
// ESTADO GLOBAL DEL POS
// ════════════════════════════════════════════════════════════════

const POS = {
  // Campo activo del teclado numérico
  campoActivo:      'precio',

  // Datos de la venta actual
  producto:         '',
  precio:           '',
  costo:            '',
  cantidad:         '1',
  metodoPago:       'Efectivo',

  // Caja del día
  cajaAbierta:      false,
  cajaInicial:      0,
  turnoId:          null,

  // Ventas del día (en memoria)
  ventasHoy:        [],
  totalVentasHoy:   0,
  totalGananciaHoy: 0,
  totalGastosHoy:   0,

  // Contadores por método de pago
  ventasPorMetodo: {
    Efectivo: 0,
    Yape:     0,
    Plin:     0,
    Tarjeta:  0,
    BCP:      0
  },

  // Datos del cierre de caja (para PDF)
  cierreData: null,

  // Usuario
  usuario:  null,
  esAdmin:  false
};

// ════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', async () => {
  console.log('🛒 Iniciando CellCom POS...');
  await inicializarPOS();
});

async function inicializarPOS() {
  const sesionOK = await AUTH.requerirSesion('pos');
  if (!sesionOK) return;

  POS.usuario = AUTH.usuario;
  POS.esAdmin = AUTH.esAdmin;

  actualizarHeaderUsuario();
  cargarTema();
  activarCampo('precio');

  await cargarVentasHoy();
  await verificarCaja();

  document.getElementById('inputProducto')?.focus();
  configurarAtajosTeclado();

  console.log('✅ POS inicializado correctamente');
  mostrarToast('✅ POS listo para operar', 'success');
}

// ════════════════════════════════════════════════════════════════
// HEADER Y USUARIO
// ════════════════════════════════════════════════════════════════

function actualizarHeaderUsuario() {
  const nombre  = POS.usuario?.nombre || 'Usuario';
  const inicial = nombre.charAt(0).toUpperCase();
  const rol     = POS.usuario?.rol || 'Vendedor';

  const avatar = document.getElementById('posAvatar');
  const nameEl = document.getElementById('posUserName');
  const roleEl = document.getElementById('posUserRole');

  if (avatar) avatar.textContent = inicial;
  if (nameEl) nameEl.textContent = nombre.split(' ')[0];
  if (roleEl) roleEl.textContent = rol === 'Admin' ? '👑 Admin' : '🧑‍💼 Vendedor';
}

// ════════════════════════════════════════════════════════════════
// TEMA OSCURO / CLARO
// ════════════════════════════════════════════════════════════════

function cargarTema() {
  const tema = localStorage.getItem('cellcom_tema') || 'light';
  document.documentElement.setAttribute('data-theme', tema);
}

function toggleTema() {
  const actual = document.documentElement.getAttribute('data-theme') || 'light';
  const nuevo  = actual === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', nuevo);
  localStorage.setItem('cellcom_tema', nuevo);
}

// ════════════════════════════════════════════════════════════════
// TECLADO NUMÉRICO — CAMPO ACTIVO
// ════════════════════════════════════════════════════════════════

function activarCampo(campo) {
  POS.campoActivo = campo;

  ['tagPrecio', 'tagCosto', 'tagCantidad'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  ['inputPrecio', 'inputCosto', 'inputCantidad'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.style.borderColor = ''; el.style.boxShadow = ''; }
  });

  const mapeo = {
    precio:   { tag: 'tagPrecio',   input: 'inputPrecio' },
    costo:    { tag: 'tagCosto',    input: 'inputCosto' },
    cantidad: { tag: 'tagCantidad', input: 'inputCantidad' }
  };

  const info = mapeo[campo];
  if (info) {
    const tagEl   = document.getElementById(info.tag);
    const inputEl = document.getElementById(info.input);
    if (tagEl)   tagEl.style.display     = 'inline-flex';
    if (inputEl) {
      inputEl.style.borderColor = '#4A90D9';
      inputEl.style.boxShadow   = '0 0 0 3px rgba(74,144,217,0.15)';
    }
  }
}

// ════════════════════════════════════════════════════════════════
// TECLADO — PROCESAR TECLAS
// ════════════════════════════════════════════════════════════════

function tecla(valor) {
  if (navigator.vibrate) navigator.vibrate(15);
  const campo = POS.campoActivo;

  switch(valor) {
    case 'borrar':
      if (campo === 'precio')   POS.precio   = POS.precio.slice(0, -1);
      if (campo === 'costo')    POS.costo    = POS.costo.slice(0, -1);
      if (campo === 'cantidad') POS.cantidad = POS.cantidad.slice(0, -1) || '';
      break;

    case 'limpiar':
      limpiarFormulario();
      return;

    case '.':
      if (campo === 'precio'  && !POS.precio.includes('.')) POS.precio += '.';
      if (campo === 'costo'   && !POS.costo.includes('.'))  POS.costo  += '.';
      break;

    default:
      if (campo === 'precio'   && POS.precio.length   < 8) POS.precio   += valor;
      if (campo === 'costo'    && POS.costo.length    < 8) POS.costo    += valor;
      if (campo === 'cantidad' && POS.cantidad.length < 4) POS.cantidad += valor;
      break;
  }

  actualizarCamposUI();
  calcularGanancia();
}

function actualizarCamposUI() {
  const precioEl   = document.getElementById('inputPrecio');
  const costoEl    = document.getElementById('inputCosto');
  const cantidadEl = document.getElementById('inputCantidad');

  if (precioEl)   precioEl.value   = POS.precio   || '';
  if (costoEl)    costoEl.value    = POS.costo    || '';
  if (cantidadEl) cantidadEl.value = POS.cantidad || '';
}

function limpiarFormulario() {
  POS.producto = '';
  POS.precio   = '';
  POS.costo    = '';
  POS.cantidad = '1';

  const prod = document.getElementById('inputProducto');
  if (prod) prod.value = '';
  actualizarCamposUI();
  calcularGanancia();
  activarCampo('precio');
  document.getElementById('inputProducto')?.focus();
}

// ════════════════════════════════════════════════════════════════
// CÁLCULO DE GANANCIA EN TIEMPO REAL
// ════════════════════════════════════════════════════════════════

function calcularGanancia() {
  const precio        = parseFloat(POS.precio)   || 0;
  const costo         = parseFloat(POS.costo)    || 0;
  const cantidad      = parseInt(POS.cantidad)   || 1;
  const gananciaUnit  = precio - costo;
  const gananciaTotal = gananciaUnit * cantidad;

  const box    = document.getElementById('gananciaBox');
  const label  = document.getElementById('gananciaLabel');
  const valorEl= document.getElementById('gananciaValor');
  if (!box || !label || !valorEl) return;

  if (gananciaTotal < 0) {
    box.classList.add('negativa');
    label.textContent = '📉 Pérdida:';
  } else {
    box.classList.remove('negativa');
    label.textContent = '📈 Ganancia bruta:';
  }

  valorEl.textContent = `S/ ${gananciaTotal.toFixed(2)}`;
}

// ════════════════════════════════════════════════════════════════
// MÉTODO DE PAGO
// ════════════════════════════════════════════════════════════════

function seleccionarPago(metodo, btn) {
  POS.metodoPago = metodo;
  document.querySelectorAll('.pago-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  if (navigator.vibrate) navigator.vibrate(10);
}

// ════════════════════════════════════════════════════════════════
// REGISTRAR VENTA — FUNCIÓN PRINCIPAL
// ════════════════════════════════════════════════════════════════

async function registrarVenta() {
  const producto = document.getElementById('inputProducto')?.value.trim() || '';
  const precio   = parseFloat(POS.precio)   || 0;
  const costo    = parseFloat(POS.costo)    || 0;
  const cantidad = parseInt(POS.cantidad)   || 1;

  if (precio <= 0) {
    mostrarToast('💰 Ingresa el precio de venta', 'warning');
    activarCampo('precio');
    return;
  }

  if (navigator.vibrate) navigator.vibrate([30, 20, 30]);

  const ganancia = (precio - costo) * cantidad;
  const subtotal = precio * cantidad;

  if (ganancia < 0) {
    const confirma = await Swal.fire({
      title:             '⚠️ Venta con pérdida',
      html:              `La ganancia es negativa: <strong style="color:#C53030">S/ ${ganancia.toFixed(2)}</strong><br>¿Deseas continuar?`,
      icon:              'warning',
      showCancelButton:  true,
      confirmButtonText: 'Sí, vender',
      cancelButtonText:  'Cancelar',
      confirmButtonColor:'#4A90D9',
      cancelButtonColor: '#FC8181'
    });
    if (!confirma.isConfirmed) return;
  }

  const btnVender = document.querySelector('.tec-vender');
  if (btnVender) {
    btnVender.disabled    = true;
    btnVender.textContent = '⏳ Registrando...';
  }

  try {
    const datosVenta = {
      vendedor:         POS.usuario?.nombre || 'Vendedor',
      metodoPago1:      POS.metodoPago,
      montoPago1:       subtotal,
      estadoVenta:      'Completada',
      confirmarPerdida: true,
      items: [{
        idProducto:     'VENTA-RAPIDA',
        cantidad,
        precioSugerido: precio,
        precioFinal:    precio,
        costoBase:      costo,
        seProbo:        'NO',
        nombreProducto: producto || 'Producto sin nombre'
      }]
    };

    console.log('📡 Registrando venta:', datosVenta);
    const resultado = await API.crearVenta(datosVenta);

    if (resultado.success) {
      const venta = resultado.data;
      console.log('✅ Venta registrada:', venta);

      const hora = new Date().toLocaleTimeString('es-PE', {
        hour:   '2-digit',
        minute: '2-digit'
      });

      POS.ventasHoy.unshift({
        hora,
        producto: producto || 'Sin nombre',
        precio:   subtotal,
        costo:    costo * cantidad,
        ganancia,
        cantidad,
        metodo:   POS.metodoPago,
        nota:     venta?.numeroNota || ''
      });

      POS.totalVentasHoy   += subtotal;
      POS.totalGananciaHoy += ganancia;
      POS.ventasPorMetodo[POS.metodoPago] =
        (POS.ventasPorMetodo[POS.metodoPago] || 0) + subtotal;

      renderizarVentasHoy();
      actualizarKPIs();
      limpiarFormulario();

      mostrarToast(`✅ Venta registrada: S/${subtotal.toFixed(2)} — ${POS.metodoPago}`, 'success');
      if (navigator.vibrate) navigator.vibrate([50, 30, 50]);

    } else {
      throw new Error(resultado.message || resultado.data?.mensaje || 'Error al registrar');
    }

  } catch(e) {
    console.error('❌ Error en venta:', e);
    mostrarToast(`❌ ${e.message}`, 'error');
  } finally {
    if (btnVender) {
      btnVender.disabled    = false;
      btnVender.textContent = '✅ VENDER';
    }
  }
}

// ════════════════════════════════════════════════════════════════
// AGREGAR AL INVENTARIO
// ════════════════════════════════════════════════════════════════

async function agregarAlInventario() {
  const producto = document.getElementById('inputProducto')?.value.trim() || '';
  const precio   = parseFloat(POS.precio) || 0;
  const costo    = parseFloat(POS.costo)  || 0;
  const cantidad = parseInt(POS.cantidad) || 1;

  if (!producto) {
    mostrarToast('📝 Escribe el nombre del producto', 'warning');
    document.getElementById('inputProducto')?.focus();
    return;
  }

  if (precio <= 0) {
    mostrarToast('💰 Ingresa el precio del producto', 'warning');
    return;
  }

  try {
    const { value: categoria } = await Swal.fire({
      title: '📦 Agregar al inventario',
      html:  `<strong>${producto}</strong><br>Precio: S/${precio.toFixed(2)} | Costo: S/${costo.toFixed(2)}`,
      input: 'select',
      inputOptions: {
        'Audifonos':    '🎧 Audífonos',
        'Parlantes':    '🔊 Parlantes',
        'Cargadores':   '🔌 Cargadores',
        'Controles':    '🎮 Controles',
        'USB_Memorias': '💾 USB y Memorias',
        'Otros':        '📦 Otros'
      },
      inputPlaceholder: 'Selecciona categoría',
      showCancelButton:  true,
      confirmButtonText: '📦 Guardar en inventario',
      cancelButtonText:  'Cancelar',
      confirmButtonColor:'#4A90D9',
      inputValidator: (value) => {
        if (!value) return 'Selecciona una categoría';
      }
    });

    if (!categoria) return;

    const resultado = await API.crearProducto({
      Nombre:           producto,
      Marca:            '',
      Categoria:        categoria,
      Costo_Actual:     costo,
      Precio_Sugerido:  precio,
      Stock_Disponible: cantidad,
      Estado:           'Activo',
      Descripcion:      'Agregado desde POS'
    });

    if (resultado.success) {
      mostrarToast(`📦 "${producto}" agregado al inventario`, 'success');
    } else {
      const msg = resultado.data?.mensaje || resultado.message || 'Error';
      mostrarToast(`⚠️ ${msg}`, 'warning');
    }

  } catch(e) {
    mostrarToast(`❌ ${e.message}`, 'error');
  }
}

// ════════════════════════════════════════════════════════════════
// CARGAR VENTAS DEL DÍA DESDE EL SERVIDOR
// ════════════════════════════════════════════════════════════════

async function cargarVentasHoy() {
  try {
    const resultado = await API.getResumenHoy();

    if (resultado.success && resultado.data) {
      const data = resultado.data;

      POS.totalVentasHoy   = data.montoTotal    || 0;
      POS.totalGananciaHoy = data.gananciaTotal || 0;

      const ultimasVentas = data.ultimasVentas || [];
      POS.ventasHoy = ultimasVentas.map(v => ({
        hora:     (v.Fecha_Hora || '').split(' ')[1] || '',
        producto: v.items?.[0]?.Nombre || v.items?.[0]?.ID_Producto || 'Venta',
        precio:   Number(v.Total_Venta)    || 0,
        costo:    0,
        ganancia: Number(v.Ganancia_Venta) || 0,
        cantidad: v.items?.reduce((s, i) => s + (Number(i.Cantidad) || 0), 0) || 1,
        metodo:   v.Metodo_1 || 'Efectivo',
        nota:     v.Numero_Nota || ''
      }));

      if (data.ventasPorMetodo) {
        Object.entries(data.ventasPorMetodo).forEach(([metodo, monto]) => {
          POS.ventasPorMetodo[metodo] = Number(monto) || 0;
        });
      }

      renderizarVentasHoy();
      actualizarKPIs();
    }
  } catch(e) {
    console.warn('⚠️ Error cargando ventas de hoy:', e.message);
  }
}

// ════════════════════════════════════════════════════════════════
// RENDERIZAR VENTAS DEL DÍA
// ════════════════════════════════════════════════════════════════

function renderizarVentasHoy() {
  const lista = document.getElementById('ventasList');
  const count = document.getElementById('ventasCount');
  if (!lista) return;

  if (count) count.textContent = POS.ventasHoy.length;

  if (POS.ventasHoy.length === 0) {
    lista.innerHTML = `
      <div class="ventas-empty">
        <div class="ventas-empty-icon">🛒</div>
        <div class="ventas-empty-texto">
          Sin ventas hoy<br>
          <span style="font-weight:400;font-size:11px;color:var(--texto-muted);">
            Registra tu primera venta del día
          </span>
        </div>
      </div>`;
    return;
  }

  const iconosPago = {
    Efectivo: '💵', Yape: '📱', Plin: '📲', Tarjeta: '💳', BCP: '🏦'
  };

  lista.innerHTML = POS.ventasHoy.map((v, i) => `
    <div class="venta-item"
         style="animation:fadeUp 0.2s ease ${Math.min(i * 30, 300)}ms both;"
         onclick="verDetalleVenta(${i})">
      <div class="venta-hora">${v.hora || '--:--'}</div>
      <div class="venta-desc">
        <div class="venta-nombre">${v.producto || 'Sin nombre'}</div>
        <div class="venta-detalle">
          ${v.cantidad > 1 ? `${v.cantidad} und. · ` : ''}
          ${v.nota || ''} · ${v.metodo}
        </div>
      </div>
      <div class="venta-monto">
        <div class="venta-precio">S/${v.precio.toFixed(2)}</div>
        <div class="venta-ganancia"
             style="color:${v.ganancia >= 0 ? '#276749' : '#C53030'}">
          ${v.ganancia >= 0 ? '📈' : '📉'} S/${Math.abs(v.ganancia).toFixed(2)}
        </div>
      </div>
      <div class="venta-metodo">${iconosPago[v.metodo] || '💳'}</div>
    </div>
  `).join('');
}

// ════════════════════════════════════════════════════════════════
// ACTUALIZAR KPIs
// ════════════════════════════════════════════════════════════════

function actualizarKPIs() {
  const kpiVentas   = document.getElementById('kpiVentas');
  const kpiGanancia = document.getElementById('kpiGanancia');
  const kpiCount    = document.getElementById('kpiCount');

  if (kpiVentas)   kpiVentas.textContent   = `S/${POS.totalVentasHoy.toFixed(0)}`;
  if (kpiGanancia) kpiGanancia.textContent = `S/${POS.totalGananciaHoy.toFixed(0)}`;
  if (kpiCount)    kpiCount.textContent    = POS.ventasHoy.length;

  const cajaIngresos = document.getElementById('cajaIngresos');
  const cajaTotal    = document.getElementById('cajaTotal');

  if (cajaIngresos) cajaIngresos.textContent = `S/${POS.totalVentasHoy.toFixed(2)}`;
  if (cajaTotal) {
    const total = POS.cajaInicial + POS.totalVentasHoy - POS.totalGastosHoy;
    cajaTotal.textContent = `S/${total.toFixed(2)}`;
  }
}

// ════════════════════════════════════════════════════════════════
// VER DETALLE DE VENTA
// ════════════════════════════════════════════════════════════════

function verDetalleVenta(index) {
  const v = POS.ventasHoy[index];
  if (!v) return;

  Swal.fire({
    title: `🧾 ${v.nota || 'Venta'}`,
    html: `
      <div style="text-align:left;font-family:'Inter',sans-serif;">
        <div style="margin-bottom:12px;">
          <div style="font-size:11px;color:#718096;text-transform:uppercase;font-weight:600;">Producto</div>
          <div style="font-size:16px;font-weight:700;color:#1A1A2E;">${v.producto}</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
          <div style="background:#EBF4FF;border-radius:10px;padding:10px;text-align:center;">
            <div style="font-size:10px;color:#4A90D9;font-weight:700;">PRECIO</div>
            <div style="font-size:18px;font-weight:900;color:#2E6DB4;">S/${v.precio.toFixed(2)}</div>
          </div>
          <div style="background:${v.ganancia >= 0 ? '#F0FFF4' : '#FFF5F5'};border-radius:10px;padding:10px;text-align:center;">
            <div style="font-size:10px;color:${v.ganancia >= 0 ? '#276749' : '#C53030'};font-weight:700;">GANANCIA</div>
            <div style="font-size:18px;font-weight:900;color:${v.ganancia >= 0 ? '#276749' : '#C53030'};">
              S/${v.ganancia.toFixed(2)}
            </div>
          </div>
        </div>
        <div style="background:#F7FAFC;border-radius:10px;padding:10px;font-size:12px;color:#718096;">
          🕐 ${v.hora} &nbsp;·&nbsp; 💳 ${v.metodo} &nbsp;·&nbsp; 📦 ${v.cantidad} und.
          ${v.costo > 0 ? `<br>💸 Costo: S/${(v.costo / v.cantidad).toFixed(2)} c/u` : ''}
        </div>
      </div>
    `,
    confirmButtonText:  'Cerrar',
    confirmButtonColor: '#4A90D9'
  });
}

// ════════════════════════════════════════════════════════════════
// APERTURA DE CAJA
// ════════════════════════════════════════════════════════════════

async function verificarCaja() {
  try {
    const resultado = await API.getTurnoActivo();
    if (resultado.success && resultado.data?.hayTurnoActivo) {
      POS.cajaAbierta = true;
      POS.turnoId     = resultado.data.turno?.ID_Turno || null;
      POS.cajaInicial = Number(resultado.data.turno?.Saldo_Inicial) || 0;

      const cajaInicio = document.getElementById('cajaInicio');
      if (cajaInicio) cajaInicio.textContent = `S/${POS.cajaInicial.toFixed(2)}`;

      const btnCaja = document.getElementById('btnCajaText');
      if (btnCaja) btnCaja.textContent = '✅ Caja abierta';
    }
  } catch(e) {
    console.warn('⚠️ Error verificando caja:', e.message);
  }
}

async function abrirCaja() {
  if (POS.cajaAbierta) {
    mostrarToast('✅ La caja ya está abierta', 'info');
    return;
  }

  const { value: monto } = await Swal.fire({
    title:             '💰 Abrir Caja del Día',
    html:              '<p style="font-size:13px;color:#718096;">¿Cuánto dinero hay en caja al iniciar el día?</p>',
    input:             'number',
    inputPlaceholder:  '0.00',
    inputAttributes:   { min: '0', step: '0.01' },
    showCancelButton:  true,
    confirmButtonText: '🟢 Abrir caja',
    cancelButtonText:  'Cancelar',
    confirmButtonColor:'#48BB78',
    inputValidator: value => {
      if (!value && value !== '0') return 'Ingresa un monto (puede ser 0)';
    }
  });

  if (monto === undefined || monto === null) return;

  try {
    const resultado = await API.abrirTurno({
      Responsable:   POS.usuario?.nombre || 'Cajero',
      Saldo_Inicial: parseFloat(monto) || 0
    });

    if (resultado.success) {
      POS.cajaAbierta = true;
      POS.cajaInicial = parseFloat(monto) || 0;
      POS.turnoId     = resultado.data?.idTurno || null;
      POS.cierreData  = null; // Resetear datos de cierre anterior

      const cajaInicio = document.getElementById('cajaInicio');
      if (cajaInicio) cajaInicio.textContent = `S/${POS.cajaInicial.toFixed(2)}`;

      const btnCaja = document.getElementById('btnCajaText');
      if (btnCaja) btnCaja.textContent = '✅ Caja abierta';

      actualizarKPIs();
      mostrarToast(`✅ Caja abierta con S/${POS.cajaInicial.toFixed(2)}`, 'success');
    } else {
      mostrarToast(`⚠️ ${resultado.message || resultado.data?.mensaje}`, 'warning');
    }
  } catch(e) {
    mostrarToast(`❌ ${e.message}`, 'error');
  }
}

// ════════════════════════════════════════════════════════════════
// CIERRE DE CAJA CON ARQUEO Y DESCUADRE
// ════════════════════════════════════════════════════════════════

async function cerrarCaja() {
  if (!POS.cajaAbierta) {
    mostrarToast('⚠️ No hay caja abierta', 'warning');
    return;
  }

  const totalEnCaja = POS.cajaInicial + POS.totalVentasHoy - POS.totalGastosHoy;

  // Paso 1: Pedir el efectivo real contado
  const { value: efectivoRealStr } = await Swal.fire({
    title: '🔒 Cerrar Caja del Día',
    html: `
      <div style="font-family:'Inter',sans-serif;text-align:left;">
        <div style="background:#EBF4FF;border-radius:12px;padding:14px;margin-bottom:14px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
            <span style="font-size:12px;color:#4A5568;">💰 Inicio caja:</span>
            <span style="font-weight:700;">S/${POS.cajaInicial.toFixed(2)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
            <span style="font-size:12px;color:#4A5568;">📈 + Ventas del día:</span>
            <span style="font-weight:700;color:#276749;">S/${POS.totalVentasHoy.toFixed(2)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
            <span style="font-size:12px;color:#4A5568;">💸 - Gastos del día:</span>
            <span style="font-weight:700;color:#C53030;">S/${POS.totalGastosHoy.toFixed(2)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding-top:10px;border-top:2px solid #D4E9FF;">
            <span style="font-weight:800;font-size:14px;">💵 Efectivo esperado:</span>
            <span style="font-size:20px;font-weight:900;color:#2E6DB4;">S/${totalEnCaja.toFixed(2)}</span>
          </div>
        </div>
        <p style="font-size:13px;color:#718096;font-weight:500;">
          Cuenta el dinero físico en caja y escríbelo aquí:
        </p>
      </div>
    `,
    input:             'number',
    inputPlaceholder:  totalEnCaja.toFixed(2),
    inputAttributes:   { min: '0', step: '0.01' },
    showCancelButton:  true,
    confirmButtonText: '🔒 Calcular arqueo',
    cancelButtonText:  'Cancelar',
    confirmButtonColor:'#C53030'
  });

  if (efectivoRealStr === undefined || efectivoRealStr === null) return;

  const efectivoContado = parseFloat(efectivoRealStr) || 0;
  const descuadre       = efectivoContado - totalEnCaja;
  const horaActual      = new Date().toLocaleTimeString('es-PE', { hour:'2-digit', minute:'2-digit' });

  // Paso 2: Mostrar resultado del arqueo con detalle
  let iconoCierre, tituloCierre, colorCierre, mensajeCierre, bgCierre, borderCierre;

  if (Math.abs(descuadre) < 0.01) {
    iconoCierre   = '✅';
    tituloCierre  = '¡Caja Cuadrada!';
    colorCierre   = '#276749';
    mensajeCierre = 'El efectivo coincide exactamente con lo esperado. ¡Perfecto!';
    bgCierre      = '#F0FFF4';
    borderCierre  = 'rgba(72,187,120,0.4)';
  } else if (descuadre > 0) {
    iconoCierre   = '🟡';
    tituloCierre  = 'Hay un Sobrante en Caja';
    colorCierre   = '#C05621';
    mensajeCierre = `Hay S/${descuadre.toFixed(2)} de más en caja. Revisa si falta registrar algún gasto.`;
    bgCierre      = '#FFFAF0';
    borderCierre  = 'rgba(246,173,85,0.4)';
  } else {
    iconoCierre   = '🔴';
    tituloCierre  = 'Hay un Faltante en Caja';
    colorCierre   = '#C53030';
    mensajeCierre = `Faltan S/${Math.abs(descuadre).toFixed(2)} en caja. Revisa si falta registrar alguna venta o gasto.`;
    bgCierre      = '#FFF5F5';
    borderCierre  = 'rgba(252,129,129,0.4)';
  }

  const { isConfirmed: confirmarCierre } = await Swal.fire({
    title: `${iconoCierre} ${tituloCierre}`,
    html: `
      <div style="font-family:'Inter',sans-serif;text-align:left;">

        <!-- Resultado principal -->
        <div style="background:${bgCierre};border:2px solid ${borderCierre};
                    border-radius:14px;padding:18px;margin-bottom:16px;text-align:center;">
          <div style="font-size:13px;font-weight:700;color:${colorCierre};
                      text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">
            Diferencia encontrada
          </div>
          <div style="font-size:38px;font-weight:900;color:${colorCierre};letter-spacing:-1px;">
            ${descuadre >= 0 ? '+' : '-'}S/${Math.abs(descuadre).toFixed(2)}
          </div>
          <div style="font-size:12px;color:${colorCierre};margin-top:6px;font-weight:500;">
            ${mensajeCierre}
          </div>
        </div>

        <!-- Comparativa esperado vs contado -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">
          <div style="background:#EBF4FF;border-radius:12px;padding:12px;text-align:center;">
            <div style="font-size:10px;color:#4A90D9;font-weight:700;text-transform:uppercase;">
              Esperado en caja
            </div>
            <div style="font-size:20px;font-weight:900;color:#2E6DB4;margin-top:4px;">
              S/${totalEnCaja.toFixed(2)}
            </div>
          </div>
          <div style="background:${bgCierre};border:1.5px solid ${borderCierre};border-radius:12px;padding:12px;text-align:center;">
            <div style="font-size:10px;color:${colorCierre};font-weight:700;text-transform:uppercase;">
              Contado en físico
            </div>
            <div style="font-size:20px;font-weight:900;color:${colorCierre};margin-top:4px;">
              S/${efectivoContado.toFixed(2)}
            </div>
          </div>
        </div>

        <!-- Resumen del día -->
        <div style="background:#F7FAFC;border-radius:12px;padding:12px;font-size:12px;color:#4A5568;line-height:1.8;">
          <div style="display:flex;justify-content:space-between;">
            <span>📊 Total ventas:</span>
            <span style="font-weight:700;">${POS.ventasHoy.length} ventas</span>
          </div>
          <div style="display:flex;justify-content:space-between;">
            <span>💰 Monto vendido:</span>
            <span style="font-weight:700;color:#2E6DB4;">S/${POS.totalVentasHoy.toFixed(2)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;">
            <span>📈 Ganancia bruta:</span>
            <span style="font-weight:700;color:#276749;">S/${POS.totalGananciaHoy.toFixed(2)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;">
            <span>💸 Gastos del día:</span>
            <span style="font-weight:700;color:#C53030;">S/${POS.totalGastosHoy.toFixed(2)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:6px;padding-top:6px;border-top:1px solid #E2E8F0;">
            <span style="font-weight:800;">💎 Ganancia neta:</span>
            <span style="font-weight:900;color:${(POS.totalGananciaHoy - POS.totalGastosHoy) >= 0 ? '#276749' : '#C53030'};">
              S/${(POS.totalGananciaHoy - POS.totalGastosHoy).toFixed(2)}
            </span>
          </div>
        </div>

        <div style="margin-top:10px;font-size:11px;color:#A0AEC0;text-align:center;">
          🕐 Cierre realizado a las ${horaActual}
        </div>
      </div>
    `,
    showCancelButton:  true,
    confirmButtonText: '✅ Confirmar cierre',
    cancelButtonText:  'Cancelar',
    confirmButtonColor: Math.abs(descuadre) < 0.01 ? '#276749' : '#C05621',
    width:             500
  });

  if (!confirmarCierre) return;

  // Paso 3: Guardar datos del cierre para el PDF
  POS.cierreData = {
    cajaInicial:       POS.cajaInicial,
    totalVentas:       POS.totalVentasHoy,
    totalGastos:       POS.totalGastosHoy,
    totalGanancia:     POS.totalGananciaHoy,
    gananciaNet:       POS.totalGananciaHoy - POS.totalGastosHoy,
    efectivoEsperado:  totalEnCaja,
    efectivoContado,
    descuadre,
    descuadreTexto:    Math.abs(descuadre) < 0.01
                       ? 'CAJA CUADRADA ✅'
                       : descuadre > 0
                       ? `SOBRANTE: S/${descuadre.toFixed(2)} 🟡`
                       : `FALTANTE: S/${Math.abs(descuadre).toFixed(2)} 🔴`,
    fechaCierre:       new Date().toLocaleDateString('es-PE'),
    horaCierre:        horaActual,
    totalVentasCount:  POS.ventasHoy.length
  };

  // Paso 4: Enviar al servidor
  try {
    const resultado = await API.cerrarTurno({
      idTurno:              POS.turnoId,
      Efectivo_Real_Caja:   efectivoContado,
      Monto_Retirado_Banco: 0,
      Gastos_Efectivo:      POS.totalGastosHoy
    });

    if (resultado.success) {
      POS.cajaAbierta = false;
      POS.turnoId     = null;

      const btnCaja = document.getElementById('btnCajaText');
      if (btnCaja) btnCaja.textContent = 'Abrir caja';

      const tipoToast = Math.abs(descuadre) < 0.01 ? 'success' : 'warning';
      mostrarToast(POS.cierreData.descuadreTexto, tipoToast);

      // Paso 5: Preguntar si quiere PDF
      const { isConfirmed: quierePDF } = await Swal.fire({
        title:             '📄 ¿Exportar resumen del día?',
        html:              `
          <p style="font-family:'Inter',sans-serif;font-size:13px;color:#4A5568;">
            Genera un PDF profesional con el cierre de caja,
            arqueo, descuadre y detalle de ventas.
          </p>`,
        icon:              'question',
        showCancelButton:  true,
        confirmButtonText: '📄 Sí, exportar PDF',
        cancelButtonText:  'No, gracias',
        confirmButtonColor:'#4A90D9'
      });

      if (quierePDF) exportarPDF();

    } else {
      mostrarToast(`⚠️ ${resultado.message || 'Error al cerrar'}`, 'warning');
    }
  } catch(e) {
    mostrarToast(`❌ ${e.message}`, 'error');
  }
}

// ════════════════════════════════════════════════════════════════
// REGISTRAR GASTO RÁPIDO
// ════════════════════════════════════════════════════════════════

async function registrarGasto() {
  const { value: datos } = await Swal.fire({
    title: '💸 Registrar Gasto',
    html: `
      <div style="text-align:left;font-family:'Inter',sans-serif;">
        <label style="font-size:11px;font-weight:700;color:#4A5568;text-transform:uppercase;">Concepto</label>
        <input id="gastoConcepto" class="swal2-input" placeholder="Ej: Almuerzo, pasajes..." style="font-size:14px;">
        <label style="font-size:11px;font-weight:700;color:#4A5568;text-transform:uppercase;margin-top:8px;display:block;">Monto (S/)</label>
        <input id="gastoMonto" class="swal2-input" type="number" placeholder="0.00" step="0.01" style="font-size:18px;font-weight:800;">
      </div>
    `,
    showCancelButton:  true,
    confirmButtonText: '💸 Registrar',
    cancelButtonText:  'Cancelar',
    confirmButtonColor:'#C05621',
    preConfirm: () => {
      const concepto = document.getElementById('gastoConcepto').value.trim();
      const monto    = parseFloat(document.getElementById('gastoMonto').value);
      if (!concepto) return Swal.showValidationMessage('Ingresa el concepto');
      if (!monto || monto <= 0) return Swal.showValidationMessage('Ingresa el monto');
      return { concepto, monto };
    }
  });

  if (!datos) return;

  try {
    const resultado = await API.crearGasto({
      Concepto_Gasto: datos.concepto,
      Monto:          datos.monto,
      Responsable:    POS.usuario?.nombre || 'Cajero'
    });

    if (resultado.success) {
      POS.totalGastosHoy += datos.monto;

      const cajaGastos = document.getElementById('cajaGastos');
      if (cajaGastos) cajaGastos.textContent = `S/${POS.totalGastosHoy.toFixed(2)}`;

      actualizarKPIs();
      mostrarToast(`💸 Gasto registrado: S/${datos.monto.toFixed(2)}`, 'success');
    }
  } catch(e) {
    mostrarToast(`❌ ${e.message}`, 'error');
  }
}

// ════════════════════════════════════════════════════════════════
// EXPORTAR PDF PROFESIONAL CON ARQUEO Y DESCUADRE
// ════════════════════════════════════════════════════════════════

function exportarPDF() {
  const fecha     = new Date().toLocaleDateString('es-PE');
  const hora      = new Date().toLocaleTimeString('es-PE', { hour:'2-digit', minute:'2-digit' });
  const totalCaja = POS.cajaInicial + POS.totalVentasHoy - POS.totalGastosHoy;
  const cierre    = POS.cierreData;

  // Filas de ventas
  let filasVentas = '';
  POS.ventasHoy.forEach(v => {
    filasVentas += `
      <tr>
        <td style="padding:8px 10px;border-bottom:1px solid #EBF4FF;font-size:12px;">${v.hora}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #EBF4FF;font-size:12px;font-weight:600;">${v.producto}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #EBF4FF;font-size:12px;text-align:center;">${v.cantidad}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #EBF4FF;font-size:12px;text-align:right;">S/${v.precio.toFixed(2)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #EBF4FF;font-size:12px;text-align:right;">S/${v.costo.toFixed(2)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #EBF4FF;font-size:12px;text-align:right;font-weight:700;
                   color:${v.ganancia >= 0 ? '#276749' : '#C53030'};">
          ${v.ganancia >= 0 ? '+' : ''}S/${v.ganancia.toFixed(2)}
        </td>
        <td style="padding:8px 10px;border-bottom:1px solid #EBF4FF;font-size:12px;text-align:center;">${v.metodo}</td>
      </tr>`;
  });

  // Filas por método de pago
  let filasPago = '';
  Object.entries(POS.ventasPorMetodo).forEach(([metodo, monto]) => {
    if (monto > 0) {
      filasPago += `
        <tr>
          <td style="padding:8px 10px;border-bottom:1px solid #EBF4FF;font-size:13px;font-weight:600;">${metodo}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #EBF4FF;font-size:13px;text-align:right;font-weight:700;color:#2E6DB4;">
            S/${monto.toFixed(2)}
          </td>
          <td style="padding:8px 10px;border-bottom:1px solid #EBF4FF;font-size:12px;text-align:right;color:#718096;">
            ${((monto / (POS.totalVentasHoy || 1)) * 100).toFixed(1)}%
          </td>
        </tr>`;
    }
  });

  // Sección del arqueo (si hay datos de cierre)
  const seccionArqueo = cierre ? `
    <div style="margin-bottom:24px;">
      <div style="font-size:15px;font-weight:800;color:#1A1A2E;margin-bottom:12px;
                  display:flex;align-items:center;gap:8px;">
        🔒 Arqueo de Cierre de Caja
      </div>
      <div style="background:${Math.abs(cierre.descuadre) < 0.01 ? '#F0FFF4' : cierre.descuadre > 0 ? '#FFFAF0' : '#FFF5F5'};
                  border:2px solid ${Math.abs(cierre.descuadre) < 0.01 ? '#C6F6D5' : cierre.descuadre > 0 ? '#FEEBC8' : '#FED7D7'};
                  border-radius:14px;padding:20px;text-align:center;margin-bottom:12px;">
        <div style="font-size:13px;font-weight:700;
                    color:${Math.abs(cierre.descuadre) < 0.01 ? '#276749' : cierre.descuadre > 0 ? '#C05621' : '#C53030'};
                    text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">
          Resultado del Arqueo
        </div>
        <div style="font-size:36px;font-weight:900;letter-spacing:-1px;
                    color:${Math.abs(cierre.descuadre) < 0.01 ? '#276749' : cierre.descuadre > 0 ? '#C05621' : '#C53030'};">
          ${Math.abs(cierre.descuadre) < 0.01
            ? '✅ CAJA CUADRADA'
            : cierre.descuadre > 0
            ? `🟡 SOBRANTE +S/${cierre.descuadre.toFixed(2)}`
            : `🔴 FALTANTE -S/${Math.abs(cierre.descuadre).toFixed(2)}`
          }
        </div>
        <div style="display:flex;justify-content:center;gap:40px;margin-top:14px;">
          <div>
            <div style="font-size:10px;color:#718096;text-transform:uppercase;font-weight:600;">Esperado</div>
            <div style="font-size:18px;font-weight:900;color:#2E6DB4;">S/${cierre.efectivoEsperado.toFixed(2)}</div>
          </div>
          <div>
            <div style="font-size:10px;color:#718096;text-transform:uppercase;font-weight:600;">Contado</div>
            <div style="font-size:18px;font-weight:900;
                        color:${Math.abs(cierre.descuadre) < 0.01 ? '#276749' : '#C53030'};">
              S/${cierre.efectivoContado.toFixed(2)}
            </div>
          </div>
        </div>
      </div>
      <div style="font-size:11px;color:#A0AEC0;text-align:center;">
        Cierre realizado el ${cierre.fechaCierre} a las ${cierre.horaCierre}
      </div>
    </div>
  ` : '';

  const htmlPDF = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Cierre del Día — CellCom Tecnology</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      font-family: 'Inter', sans-serif;
      background: #fff;
      color: #1A1A2E;
      padding: 30px;
      font-size: 13px;
    }

    /* Header */
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
      padding-bottom: 18px;
      border-bottom: 3px solid #4A90D9;
    }
    .header-logo { font-size: 32px; }
    .header-info { flex: 1; margin-left: 16px; }
    .header-info h1 { font-size: 22px; font-weight: 900; color: #2E6DB4; }
    .header-info p { font-size: 12px; color: #718096; margin-top: 2px; }
    .header-fecha {
      text-align: right;
      font-size: 12px;
      color: #718096;
      border-left: 2px solid #EBF4FF;
      padding-left: 16px;
    }
    .header-fecha strong { font-size: 15px; color: #1A1A2E; display: block; }

    /* KPIs */
    .kpis {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
    }
    .kpi {
      flex: 1;
      background: #EBF4FF;
      border-radius: 12px;
      padding: 14px;
      text-align: center;
      border: 1.5px solid #D4E9FF;
    }
    .kpi-valor { font-size: 22px; font-weight: 900; color: #2E6DB4; }
    .kpi-label { font-size: 9px; color: #718096; font-weight: 700; text-transform: uppercase; margin-top: 4px; letter-spacing: 0.3px; }
    .kpi.verde  { background: #F0FFF4; border-color: #C6F6D5; }
    .kpi.verde .kpi-valor { color: #276749; }
    .kpi.rojo   { background: #FFF5F5; border-color: #FED7D7; }
    .kpi.rojo   .kpi-valor { color: #C53030; }
    .kpi.morado { background: #FAF5FF; border-color: #E9D8FD; }
    .kpi.morado .kpi-valor { color: #6B46C1; }

    /* Caja box */
    .caja-box {
      background: linear-gradient(135deg, #0F2044, #1A3A6B, #2E6DB4);
      border-radius: 16px;
      padding: 20px;
      color: #fff;
      margin-bottom: 20px;
    }
    .caja-title { font-size: 11px; color: rgba(255,255,255,0.6); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px; }
    .caja-grid { display: flex; justify-content: space-around; text-align: center; }
    .caja-item-label { font-size: 10px; color: rgba(255,255,255,0.55); text-transform: uppercase; letter-spacing: 0.3px; }
    .caja-item-valor { font-size: 18px; font-weight: 900; margin-top: 4px; }

    /* Section titles */
    .section-title {
      font-size: 14px;
      font-weight: 800;
      color: #1A1A2E;
      margin: 22px 0 10px;
      display: flex;
      align-items: center;
      gap: 8px;
      padding-bottom: 8px;
      border-bottom: 2px solid #EBF4FF;
    }

    /* Tablas */
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    thead { background: linear-gradient(135deg, #EBF4FF, #D4E9FF); }
    th {
      padding: 10px 10px;
      font-size: 10px;
      font-weight: 800;
      color: #2E6DB4;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      text-align: left;
    }
    td { vertical-align: middle; }
    tbody tr:hover { background: #F7FBFF; }
    tbody tr:last-child td { border-bottom: none !important; }

    /* Totales tabla */
    .tabla-total td {
      padding: 10px 10px !important;
      background: #EBF4FF;
      font-weight: 800 !important;
      font-size: 14px !important;
      border-top: 2px solid #4A90D9;
    }

    /* Footer */
    .footer {
      text-align: center;
      padding-top: 18px;
      border-top: 2px solid #EBF4FF;
      margin-top: 28px;
    }
    .footer p { font-size: 10px; color: #A0AEC0; line-height: 1.6; }

    /* Botón imprimir */
    .no-print { margin-top: 24px; text-align: center; }
    .btn-print {
      padding: 14px 36px;
      background: linear-gradient(135deg, #4A90D9, #2E6DB4);
      color: #fff;
      border: none;
      border-radius: 14px;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      font-family: 'Inter', sans-serif;
      box-shadow: 0 4px 16px rgba(74,144,217,0.4);
    }

    @media print {
      .no-print { display: none; }
      body { padding: 15px; }
    }
  </style>
</head>
<body>

  <!-- Header -->
  <div class="header">
    <div class="header-logo">📱</div>
    <div class="header-info">
      <h1>CellCom Tecnology</h1>
      <p>Cierre y Resumen del Día — Sistema POS v1.0</p>
      <p>Cieneguilla, Lima, Perú</p>
    </div>
    <div class="header-fecha">
      <strong>${fecha}</strong>
      Hora: ${hora}<br>
      Vendedor: ${POS.usuario?.nombre || '—'}
    </div>
  </div>

  <!-- KPIs -->
  <div class="kpis">
    <div class="kpi">
      <div class="kpi-valor">S/${POS.totalVentasHoy.toFixed(2)}</div>
      <div class="kpi-label">💰 Ventas totales</div>
    </div>
    <div class="kpi verde">
      <div class="kpi-valor">S/${POS.totalGananciaHoy.toFixed(2)}</div>
      <div class="kpi-label">📈 Ganancia bruta</div>
    </div>
    <div class="kpi rojo">
      <div class="kpi-valor">S/${POS.totalGastosHoy.toFixed(2)}</div>
      <div class="kpi-label">💸 Gastos del día</div>
    </div>
    <div class="kpi morado">
      <div class="kpi-valor">S/${(POS.totalGananciaHoy - POS.totalGastosHoy).toFixed(2)}</div>
      <div class="kpi-label">💎 Ganancia neta</div>
    </div>
    <div class="kpi">
      <div class="kpi-valor">${POS.ventasHoy.length}</div>
      <div class="kpi-label">🛒 Transacciones</div>
    </div>
  </div>

  <!-- Caja del día -->
  <div class="caja-box">
    <div class="caja-title">📊 Movimiento de Caja del Día</div>
    <div class="caja-grid">
      <div>
        <div class="caja-item-label">Inicio caja</div>
        <div class="caja-item-valor">S/${POS.cajaInicial.toFixed(2)}</div>
      </div>
      <div>
        <div class="caja-item-label">+ Ingresos</div>
        <div class="caja-item-valor" style="color:#48BB78;">S/${POS.totalVentasHoy.toFixed(2)}</div>
      </div>
      <div>
        <div class="caja-item-label">- Gastos</div>
        <div class="caja-item-valor" style="color:#FC8181;">S/${POS.totalGastosHoy.toFixed(2)}</div>
      </div>
      <div>
        <div class="caja-item-label">= En caja</div>
        <div class="caja-item-valor" style="color:#F6AD55;">S/${totalCaja.toFixed(2)}</div>
      </div>
    </div>
  </div>

  <!-- Arqueo de cierre -->
  ${seccionArqueo}

  <!-- Detalle de ventas -->
  <div class="section-title">📋 Detalle de Ventas del Día (${POS.ventasHoy.length})</div>
  <table>
    <thead>
      <tr>
        <th>Hora</th>
        <th>Producto</th>
        <th style="text-align:center;">Cant</th>
        <th style="text-align:right;">Precio</th>
        <th style="text-align:right;">Costo</th>
        <th style="text-align:right;">Ganancia</th>
        <th style="text-align:center;">Método</th>
      </tr>
    </thead>
    <tbody>
      ${filasVentas || '<tr><td colspan="7" style="text-align:center;padding:24px;color:#A0AEC0;font-size:13px;">Sin ventas registradas</td></tr>'}
    </tbody>
    ${POS.ventasHoy.length > 0 ? `
    <tfoot>
      <tr class="tabla-total">
        <td colspan="3" style="padding:10px;">TOTALES</td>
        <td style="padding:10px;text-align:right;color:#2E6DB4;">
          S/${POS.totalVentasHoy.toFixed(2)}
        </td>
        <td style="padding:10px;text-align:right;color:#718096;">
          S/${POS.ventasHoy.reduce((s, v) => s + v.costo, 0).toFixed(2)}
        </td>
        <td style="padding:10px;text-align:right;color:${POS.totalGananciaHoy >= 0 ? '#276749' : '#C53030'};">
          S/${POS.totalGananciaHoy.toFixed(2)}
        </td>
        <td></td>
      </tr>
    </tfoot>
    ` : ''}
  </table>

  <!-- Desglose por método de pago -->
  <div class="section-title">💳 Desglose por Método de Pago</div>
  <table>
    <thead>
      <tr>
        <th>Método</th>
        <th style="text-align:right;">Monto</th>
        <th style="text-align:right;">%</th>
      </tr>
    </thead>
    <tbody>
      ${filasPago || '<tr><td colspan="3" style="text-align:center;padding:16px;color:#A0AEC0;">Sin datos de pago</td></tr>'}
    </tbody>
  </table>

  <!-- Footer -->
  <div class="footer">
    <p style="font-weight:700;color:#4A5568;font-size:12px;margin-bottom:4px;">
      CellCom Tecnology — Sistema POS v1.0.0
    </p>
    <p>
      Documento generado el ${fecha} a las ${hora}<br>
      Cieneguilla, Lima, Perú &nbsp;·&nbsp;
      Operador: ${POS.usuario?.nombre || '—'}
    </p>
  </div>

  <div class="no-print">
    <button class="btn-print" onclick="window.print()">
      🖨️ Imprimir / Guardar como PDF
    </button>
  </div>

</body>
</html>`;

  const ventana = window.open('', '_blank', 'width=850,height=950,scrollbars=yes');
  if (ventana) {
    ventana.document.write(htmlPDF);
    ventana.document.close();
    ventana.focus();
    mostrarToast('📄 PDF generado — Usa Ctrl+P para guardar', 'success');
  } else {
    mostrarToast('⚠️ Permite las ventanas emergentes del navegador', 'warning');
  }
}

// ════════════════════════════════════════════════════════════════
// NAVEGACIÓN
// ════════════════════════════════════════════════════════════════

function verInventario() {
  window.location.href = '/cellcomtecnology/inventario.html';
}

function verHistorial() {
  window.location.href = '/cellcomtecnology/ventas.html';
}

function cerrarSesion() {
  Swal.fire({
    title:             '🚪 ¿Cerrar sesión?',
    text:              'Se cerrará tu sesión de CellCom Tecnology',
    icon:              'question',
    showCancelButton:  true,
    confirmButtonText: 'Sí, cerrar sesión',
    cancelButtonText:  'Cancelar',
    confirmButtonColor:'#C53030'
  }).then(result => {
    if (result.isConfirmed) AUTH.cerrarSesion();
  });
}

// ════════════════════════════════════════════════════════════════
// ATAJOS DE TECLADO FÍSICO
// ════════════════════════════════════════════════════════════════

function configurarAtajosTeclado() {
  document.addEventListener('keydown', e => {
    if (document.activeElement?.id === 'inputProducto') return;

    if (e.key >= '0' && e.key <= '9') { e.preventDefault(); tecla(e.key); }
    if (e.key === '.')         { e.preventDefault(); tecla('.'); }
    if (e.key === 'Backspace') { e.preventDefault(); tecla('borrar'); }
    if (e.key === 'Escape')    { e.preventDefault(); tecla('limpiar'); }
    if (e.key === 'Enter')     { e.preventDefault(); registrarVenta(); }

    if (e.key === 'Tab') {
      e.preventDefault();
      const campos = ['precio', 'costo', 'cantidad'];
      const idx    = campos.indexOf(POS.campoActivo);
      const next   = campos[(idx + 1) % campos.length];
      activarCampo(next);
    }

    if (e.key === 'F2') {
      e.preventDefault();
      document.getElementById('inputProducto')?.focus();
    }
  });
}

// ════════════════════════════════════════════════════════════════
// SISTEMA DE TOASTS
// ════════════════════════════════════════════════════════════════

function mostrarToast(mensaje, tipo = 'info') {
  const colores = {
    success: { bg: 'linear-gradient(135deg, #276749, #48BB78)', dur: 3000 },
    error:   { bg: 'linear-gradient(135deg, #C53030, #FC8181)', dur: 4000 },
    warning: { bg: 'linear-gradient(135deg, #C05621, #F6AD55)', dur: 3500 },
    info:    { bg: 'linear-gradient(135deg, #1A4F8A, #4A90D9)', dur: 2500 }
  };

  const cfg = colores[tipo] || colores.info;

  if (typeof Toastify === 'function') {
    Toastify({
      text:     mensaje,
      duration: cfg.dur,
      gravity:  'bottom',
      position: 'center',
      style: {
        background:   cfg.bg,
        borderRadius: '14px',
        fontFamily:   "'Inter', sans-serif",
        fontSize:     '13px',
        fontWeight:   '600',
        padding:      '12px 20px',
        boxShadow:    '0 8px 32px rgba(0,0,0,0.25)',
        border:       '1px solid rgba(255,255,255,0.15)'
      },
      onClick: function() {}
    }).showToast();
  } else {
    console.log(`[${tipo.toUpperCase()}] ${mensaje}`);
  }
}









