// ╔══════════════════════════════════════════════════════════════╗
// ║           CellCom Tecnology — Sistema POS v1.0              ║
// ║                      js/pos.js                               ║
// ║    POS Táctil Premium — Venta Rápida + Caja + PDF           ║
// ║    PARTE 1: Estado + Inicialización + Teclado + Ventas      ║
// ╚══════════════════════════════════════════════════════════════╝

'use strict';

// ════════════════════════════════════════════════════════════════
// ESTADO GLOBAL DEL POS
// ════════════════════════════════════════════════════════════════

const POS = {
  // Campo activo del teclado numérico
  campoActivo:    'precio',

  // Datos de la venta actual
  producto:       '',
  precio:         '',
  costo:          '',
  cantidad:       '1',
  metodoPago:     'Efectivo',

  // Caja del día
  cajaAbierta:    false,
  cajaInicial:    0,
  turnoId:        null,

  // Ventas del día (en memoria)
  ventasHoy:      [],
  totalVentasHoy: 0,
  totalGananciaHoy: 0,
  totalGastosHoy: 0,

  // Contadores por método de pago
  ventasPorMetodo: {
    Efectivo: 0,
    Yape: 0,
    Plin: 0,
    Tarjeta: 0,
    BCP: 0
  },

  // Usuario
  usuario:        null,
  esAdmin:        false
};

// ════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', async () => {
  console.log('🛒 Iniciando CellCom POS...');
  await inicializarPOS();
});

async function inicializarPOS() {
  // Verificar sesión
  const sesionOK = await AUTH.requerirSesion('pos');
  if (!sesionOK) return;

  // Cargar datos del usuario
  POS.usuario = AUTH.usuario;
  POS.esAdmin = AUTH.esAdmin;

  // Actualizar UI del header
  actualizarHeaderUsuario();

  // Cargar tema
  cargarTema();

  // Activar campo precio por defecto
  activarCampo('precio');

  // Cargar ventas del día desde el servidor
  await cargarVentasHoy();

  // Verificar si hay caja abierta
  await verificarCaja();

  // Focus en el campo producto
  document.getElementById('inputProducto')?.focus();

  // Configurar atajos de teclado
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

  const avatar  = document.getElementById('posAvatar');
  const nameEl  = document.getElementById('posUserName');
  const roleEl  = document.getElementById('posUserRole');

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

  // Quitar todos los tags activos
  ['tagPrecio', 'tagCosto', 'tagCantidad'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  // Quitar bordes de todos los inputs
  ['inputPrecio', 'inputCosto', 'inputCantidad'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.style.borderColor = '';
      el.style.boxShadow   = '';
    }
  });

  // Activar el campo seleccionado
  const mapeo = {
    precio:   { tag: 'tagPrecio',   input: 'inputPrecio' },
    costo:    { tag: 'tagCosto',    input: 'inputCosto' },
    cantidad: { tag: 'tagCantidad', input: 'inputCantidad' }
  };

  const info = mapeo[campo];
  if (info) {
    const tagEl   = document.getElementById(info.tag);
    const inputEl = document.getElementById(info.input);
    if (tagEl)   tagEl.style.display = 'inline-flex';
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
  // Vibración táctil
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
      // Solo un punto decimal permitido
      if (campo === 'precio'   && !POS.precio.includes('.'))   POS.precio   += '.';
      if (campo === 'costo'    && !POS.costo.includes('.'))    POS.costo    += '.';
      // Cantidad no lleva punto (es entero)
      break;

    default:
      // Es un número (0-9)
      if (campo === 'precio') {
        // Máximo 8 caracteres
        if (POS.precio.length < 8) POS.precio += valor;
      }
      if (campo === 'costo') {
        if (POS.costo.length < 8) POS.costo += valor;
      }
      if (campo === 'cantidad') {
        // Máximo 4 dígitos para cantidad
        if (POS.cantidad.length < 4) POS.cantidad += valor;
      }
      break;
  }

  // Actualizar campos en pantalla
  actualizarCamposUI();

  // Recalcular ganancia
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

  document.getElementById('inputProducto').value = '';
  actualizarCamposUI();
  calcularGanancia();
  activarCampo('precio');
  document.getElementById('inputProducto')?.focus();
}

// ════════════════════════════════════════════════════════════════
// CÁLCULO DE GANANCIA EN TIEMPO REAL
// ════════════════════════════════════════════════════════════════

function calcularGanancia() {
  const precio   = parseFloat(POS.precio)   || 0;
  const costo    = parseFloat(POS.costo)    || 0;
  const cantidad = parseInt(POS.cantidad)   || 1;

  const gananciaUnit = precio - costo;
  const gananciaTotal= gananciaUnit * cantidad;

  const box      = document.getElementById('gananciaBox');
  const label    = document.getElementById('gananciaLabel');
  const valorEl  = document.getElementById('gananciaValor');

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

  // Quitar active de todos
  document.querySelectorAll('.pago-btn').forEach(b => {
    b.classList.remove('active');
  });

  // Activar el seleccionado
  if (btn) btn.classList.add('active');

  if (navigator.vibrate) navigator.vibrate(10);
}

// ════════════════════════════════════════════════════════════════
// REGISTRAR VENTA — FUNCIÓN PRINCIPAL
// ════════════════════════════════════════════════════════════════

async function registrarVenta() {
  // Obtener valores
  const producto = document.getElementById('inputProducto')?.value.trim() || '';
  const precio   = parseFloat(POS.precio)   || 0;
  const costo    = parseFloat(POS.costo)    || 0;
  const cantidad = parseInt(POS.cantidad)   || 1;

  // Validaciones mínimas
  if (precio <= 0) {
    mostrarToast('💰 Ingresa el precio de venta', 'warning');
    activarCampo('precio');
    return;
  }

  // Vibración de confirmación
  if (navigator.vibrate) navigator.vibrate([30, 20, 30]);

  const ganancia = (precio - costo) * cantidad;
  const subtotal = precio * cantidad;

  // Confirmar si hay pérdida
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

  // Deshabilitar botón de vender
  const btnVender = document.querySelector('.tec-vender');
  if (btnVender) {
    btnVender.disabled     = true;
    btnVender.textContent  = '⏳ Registrando...';
  }

  try {
    // Preparar datos
    const datosVenta = {
      vendedor:         POS.usuario?.nombre || 'Vendedor',
      metodoPago1:      POS.metodoPago,
      montoPago1:       subtotal,
      estadoVenta:      'Completada',
      confirmarPerdida: true,
      items: [{
        idProducto:     'VENTA-RAPIDA',
        cantidad:       cantidad,
        precioSugerido: precio,
        precioFinal:    precio,
        costoBase:      costo,
        seProbo:        'NO',
        nombreProducto: producto || 'Producto sin nombre'
      }]
    };

    console.log('📡 Registrando venta:', datosVenta);

    // Enviar al servidor
    const resultado = await API.crearVenta(datosVenta);

    if (resultado.success) {
      const venta = resultado.data;
      console.log('✅ Venta registrada:', venta);

      // Agregar a la lista local
      const hora = new Date().toLocaleTimeString('es-PE', {
        hour:   '2-digit',
        minute: '2-digit'
      });

      POS.ventasHoy.unshift({
        hora,
        producto:  producto || 'Sin nombre',
        precio:    subtotal,
        costo:     costo * cantidad,
        ganancia,
        cantidad,
        metodo:    POS.metodoPago,
        nota:      venta?.numeroNota || ''
      });

      // Actualizar totales
      POS.totalVentasHoy   += subtotal;
      POS.totalGananciaHoy += ganancia;
      POS.ventasPorMetodo[POS.metodoPago] =
        (POS.ventasPorMetodo[POS.metodoPago] || 0) + subtotal;

      // Actualizar UI
      renderizarVentasHoy();
      actualizarKPIs();

      // Limpiar formulario
      limpiarFormulario();

      // Toast de éxito
      mostrarToast(
        `✅ Venta registrada: S/${subtotal.toFixed(2)} — ${POS.metodoPago}`,
        'success'
      );

      // Sonido de éxito (vibración)
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
// AGREGAR AL INVENTARIO (Botón +Inv)
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
    // Preguntar categoría
    const { value: categoria } = await Swal.fire({
      title: '📦 Agregar al inventario',
      html:  `<strong>${producto}</strong><br>Precio: S/${precio.toFixed(2)} | Costo: S/${costo.toFixed(2)}`,
      input: 'select',
      inputOptions: {
        'Audifonos':      '🎧 Audífonos',
        'Parlantes':      '🔊 Parlantes',
        'Cargadores':     '🔌 Cargadores',
        'Controles':      '🎮 Controles',
        'USB_Memorias':   '💾 USB y Memorias',
        'Otros':          '📦 Otros'
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

      POS.totalVentasHoy   = data.montoTotal     || 0;
      POS.totalGananciaHoy = data.gananciaTotal  || 0;

      // Cargar ventas individuales
      const ultimasVentas  = data.ultimasVentas || [];

      POS.ventasHoy = ultimasVentas.map(v => ({
        hora:     (v.Fecha_Hora || '').split(' ')[1] || '',
        producto: v.items?.[0]?.Nombre || v.items?.[0]?.ID_Producto || 'Venta',
        precio:   Number(v.Total_Venta) || 0,
        costo:    0,
        ganancia: Number(v.Ganancia_Venta) || 0,
        cantidad: v.items?.reduce((s, i) => s + (Number(i.Cantidad) || 0), 0) || 1,
        metodo:   v.Metodo_1 || 'Efectivo',
        nota:     v.Numero_Nota || ''
      }));

      // Ventas por método
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


// ╔══════════════════════════════════════════════════════════════╗
// ║           CellCom Tecnology — js/pos.js                     ║
// ║    PARTE 2: Renderizado + Caja + PDF + Utilidades           ║
// ╚══════════════════════════════════════════════════════════════╝

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
    Efectivo: '💵',
    Yape:     '📱',
    Plin:     '📲',
    Tarjeta:  '💳',
    BCP:      '🏦'
  };

  lista.innerHTML = POS.ventasHoy.map((v, i) => `
    <div class="venta-item" style="animation:fadeUp 0.2s ease ${Math.min(i * 30, 300)}ms both;"
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
        <div class="venta-ganancia" style="color:${v.ganancia >= 0 ? '#276749' : '#C53030'}">
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

  // Actualizar caja
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
          <div style="background:#F0FFF4;border-radius:10px;padding:10px;text-align:center;">
            <div style="font-size:10px;color:#276749;font-weight:700;">GANANCIA</div>
            <div style="font-size:18px;font-weight:900;color:${v.ganancia >= 0 ? '#276749' : '#C53030'};">
              S/${v.ganancia.toFixed(2)}
            </div>
          </div>
        </div>
        <div style="font-size:12px;color:#718096;">
          🕐 ${v.hora} · 💳 ${v.metodo} · 📦 ${v.cantidad} und.
        </div>
      </div>
    `,
    confirmButtonText: 'Cerrar',
    confirmButtonColor: '#4A90D9'
  });
}

// ════════════════════════════════════════════════════════════════
// APERTURA Y CIERRE DE CAJA
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
    html:              '<p style="font-size:13px;color:#718096;">¿Cuánto dinero hay en caja al iniciar?</p>',
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

async function cerrarCaja() {
  if (!POS.cajaAbierta) {
    mostrarToast('⚠️ No hay caja abierta', 'warning');
    return;
  }

  const totalEnCaja = POS.cajaInicial + POS.totalVentasHoy - POS.totalGastosHoy;

  const { value: efectivoReal } = await Swal.fire({
    title: '🔒 Cerrar Caja del Día',
    html: `
      <div style="font-family:'Inter',sans-serif;text-align:left;">
        <div style="background:#EBF4FF;border-radius:12px;padding:14px;margin-bottom:14px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
            <span style="font-size:12px;color:#4A5568;">Inicio:</span>
            <span style="font-weight:700;">S/${POS.cajaInicial.toFixed(2)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
            <span style="font-size:12px;color:#4A5568;">+ Ventas:</span>
            <span style="font-weight:700;color:#276749;">S/${POS.totalVentasHoy.toFixed(2)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
            <span style="font-size:12px;color:#4A5568;">- Gastos:</span>
            <span style="font-weight:700;color:#C53030;">S/${POS.totalGastosHoy.toFixed(2)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding-top:8px;border-top:2px solid #D4E9FF;">
            <span style="font-weight:800;">Esperado:</span>
            <span style="font-size:18px;font-weight:900;color:#2E6DB4;">S/${totalEnCaja.toFixed(2)}</span>
          </div>
        </div>
        <p style="font-size:12px;color:#718096;">¿Cuánto hay realmente en caja?</p>
      </div>
    `,
    input:             'number',
    inputPlaceholder:  totalEnCaja.toFixed(2),
    inputAttributes:   { min: '0', step: '0.01' },
    showCancelButton:  true,
    confirmButtonText: '🔒 Cerrar caja',
    cancelButtonText:  'Cancelar',
    confirmButtonColor:'#C53030'
  });

  if (efectivoReal === undefined || efectivoReal === null) return;

  try {
    const resultado = await API.cerrarTurno({
      idTurno:              POS.turnoId,
      Efectivo_Real_Caja:   parseFloat(efectivoReal) || 0,
      Monto_Retirado_Banco: 0,
      Gastos_Efectivo:      POS.totalGastosHoy
    });

    if (resultado.success) {
      const descuadre = parseFloat(efectivoReal) - totalEnCaja;
      let msg;

      if (Math.abs(descuadre) < 0.01) {
        msg = '✅ Caja cerrada — Cuadrada perfectamente';
      } else if (descuadre > 0) {
        msg = `🟡 Caja cerrada — Sobrante: S/${descuadre.toFixed(2)}`;
      } else {
        msg = `🔴 Caja cerrada — Faltante: S/${Math.abs(descuadre).toFixed(2)}`;
      }

      POS.cajaAbierta = false;
      POS.turnoId     = null;

      const btnCaja = document.getElementById('btnCajaText');
      if (btnCaja) btnCaja.textContent = 'Abrir caja';

      mostrarToast(msg, Math.abs(descuadre) < 0.01 ? 'success' : 'warning');

      // Preguntar si quiere exportar PDF
      const { isConfirmed } = await Swal.fire({
        title:             '📄 ¿Exportar resumen del día?',
        text:              'Genera un PDF profesional con el cierre de caja',
        icon:              'question',
        showCancelButton:  true,
        confirmButtonText: '📄 Sí, exportar PDF',
        cancelButtonText:  'No, gracias',
        confirmButtonColor:'#4A90D9'
      });

      if (isConfirmed) exportarPDF();
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
// EXPORTAR PDF PROFESIONAL
// ════════════════════════════════════════════════════════════════

function exportarPDF() {
  const fecha = new Date().toLocaleDateString('es-PE');
  const hora  = new Date().toLocaleTimeString('es-PE', { hour:'2-digit', minute:'2-digit' });
  const totalCaja = POS.cajaInicial + POS.totalVentasHoy - POS.totalGastosHoy;

  // Generar tabla de ventas
  let filasVentas = '';
  POS.ventasHoy.forEach(v => {
    filasVentas += `
      <tr>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;font-size:12px;">${v.hora}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;font-size:12px;font-weight:600;">${v.producto}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;font-size:12px;text-align:center;">${v.cantidad}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;font-size:12px;text-align:right;">S/${v.precio.toFixed(2)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;font-size:12px;text-align:right;">S/${v.costo.toFixed(2)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;font-size:12px;text-align:right;font-weight:700;color:${v.ganancia >= 0 ? '#276749' : '#C53030'};">
          S/${v.ganancia.toFixed(2)}
        </td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;font-size:12px;text-align:center;">${v.metodo}</td>
      </tr>`;
  });

  // Generar desglose por método
  let filasPago = '';
  Object.entries(POS.ventasPorMetodo).forEach(([metodo, monto]) => {
    if (monto > 0) {
      filasPago += `
        <tr>
          <td style="padding:6px 10px;font-size:13px;font-weight:600;">${metodo}</td>
          <td style="padding:6px 10px;font-size:13px;text-align:right;font-weight:700;">S/${monto.toFixed(2)}</td>
        </tr>`;
    }
  });

  const htmlPDF = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Resumen del Día — CellCom Tecnology</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Inter',sans-serif; background:#fff; color:#1A1A2E; padding:30px; }
    .header { text-align:center; margin-bottom:24px; padding-bottom:16px; border-bottom:3px solid #4A90D9; }
    .header h1 { font-size:22px; font-weight:900; color:#2E6DB4; }
    .header p { font-size:12px; color:#718096; margin-top:4px; }
    .kpis { display:flex; gap:12px; margin-bottom:20px; }
    .kpi { flex:1; background:#EBF4FF; border-radius:12px; padding:14px; text-align:center; border:1.5px solid #D4E9FF; }
    .kpi-valor { font-size:22px; font-weight:900; color:#2E6DB4; }
    .kpi-label { font-size:10px; color:#718096; font-weight:600; text-transform:uppercase; margin-top:3px; }
    .kpi.verde  { background:#F0FFF4; border-color:#C6F6D5; }
    .kpi.verde .kpi-valor { color:#276749; }
    .kpi.rojo   { background:#FFF5F5; border-color:#FED7D7; }
    .kpi.rojo .kpi-valor  { color:#C53030; }
    .section-title { font-size:14px; font-weight:800; color:#1A1A2E; margin:20px 0 10px; display:flex; align-items:center; gap:6px; }
    table { width:100%; border-collapse:collapse; margin-bottom:20px; }
    th { background:linear-gradient(135deg,#EBF4FF,#D4E9FF); padding:10px; font-size:11px; font-weight:700; color:#2E6DB4; text-transform:uppercase; text-align:left; }
    .caja-box { background:linear-gradient(135deg,#0F2044,#2E6DB4); border-radius:14px; padding:18px; color:#fff; margin-bottom:20px; }
    .caja-grid { display:flex; justify-content:space-around; text-align:center; }
    .caja-item-label { font-size:10px; color:rgba(255,255,255,0.6); text-transform:uppercase; }
    .caja-item-valor { font-size:18px; font-weight:900; margin-top:4px; }
    .footer { text-align:center; padding-top:16px; border-top:2px solid #EBF4FF; margin-top:24px; }
    .footer p { font-size:10px; color:#A0AEC0; }
    .no-print { margin-top:20px; text-align:center; }
    .btn-print { padding:12px 28px; background:linear-gradient(135deg,#4A90D9,#2E6DB4); color:#fff; border:none; border-radius:12px; font-size:14px; font-weight:700; cursor:pointer; font-family:'Inter',sans-serif; }
    @media print { .no-print { display:none; } body { padding:15px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>📱 CellCom Tecnology</h1>
    <p>Resumen del Día — ${fecha} · ${hora}</p>
    <p>Cieneguilla, Lima, Perú</p>
  </div>

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
      <div class="kpi-label">💸 Gastos</div>
    </div>
    <div class="kpi verde">
      <div class="kpi-valor">S/${(POS.totalGananciaHoy - POS.totalGastosHoy).toFixed(2)}</div>
      <div class="kpi-label">💎 Ganancia neta</div>
    </div>
  </div>

  <div class="caja-box">
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
        <div class="caja-item-label">En caja</div>
        <div class="caja-item-valor" style="color:#48BB78;">S/${totalCaja.toFixed(2)}</div>
      </div>
    </div>
  </div>

  <div class="section-title">📋 Detalle de Ventas (${POS.ventasHoy.length})</div>
  <table>
    <thead>
      <tr>
        <th>Hora</th>
        <th>Producto</th>
        <th style="text-align:center;">Cant</th>
        <th style="text-align:right;">Precio</th>
        <th style="text-align:right;">Costo</th>
        <th style="text-align:right;">Ganancia</th>
        <th style="text-align:center;">Pago</th>
      </tr>
    </thead>
    <tbody>
      ${filasVentas || '<tr><td colspan="7" style="text-align:center;padding:20px;color:#A0AEC0;">Sin ventas registradas</td></tr>'}
    </tbody>
  </table>

  <div class="section-title">💳 Desglose por Método de Pago</div>
  <table>
    <thead>
      <tr>
        <th>Método</th>
        <th style="text-align:right;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${filasPago || '<tr><td colspan="2" style="text-align:center;padding:12px;color:#A0AEC0;">Sin datos</td></tr>'}
    </tbody>
  </table>

  <div class="footer">
    <p>Generado por CellCom Tecnology POS v1.0.0</p>
    <p>${fecha} — ${hora} — Cieneguilla, Lima, Perú</p>
  </div>

  <div class="no-print">
    <button class="btn-print" onclick="window.print()">🖨️ Imprimir / Guardar PDF</button>
  </div>
</body>
</html>`;

  // Abrir en nueva ventana
  const ventana = window.open('', '_blank', 'width=800,height=900');
  if (ventana) {
    ventana.document.write(htmlPDF);
    ventana.document.close();
    ventana.focus();
    mostrarToast('📄 PDF generado — Usa Ctrl+P para guardar', 'success');
  } else {
    mostrarToast('⚠️ Permite las ventanas emergentes', 'warning');
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
    text:              'Se cerrará tu sesión de CellCom',
    icon:              'question',
    showCancelButton:  true,
    confirmButtonText: 'Sí, cerrar',
    cancelButtonText:  'Cancelar',
    confirmButtonColor:'#C53030'
  }).then(result => {
    if (result.isConfirmed) {
      AUTH.cerrarSesion();
    }
  });
}

// ════════════════════════════════════════════════════════════════
// ATAJOS DE TECLADO FÍSICO
// ════════════════════════════════════════════════════════════════

function configurarAtajosTeclado() {
  document.addEventListener('keydown', e => {
    // Si está escribiendo en el campo de producto → no interceptar
    if (document.activeElement?.id === 'inputProducto') return;

    // Números 0-9 → teclado numérico
    if (e.key >= '0' && e.key <= '9') {
      e.preventDefault();
      tecla(e.key);
    }

    // Punto decimal
    if (e.key === '.') {
      e.preventDefault();
      tecla('.');
    }

    // Backspace → borrar
    if (e.key === 'Backspace') {
      e.preventDefault();
      tecla('borrar');
    }

    // Escape → limpiar
    if (e.key === 'Escape') {
      e.preventDefault();
      tecla('limpiar');
    }

    // Enter → vender
    if (e.key === 'Enter') {
      e.preventDefault();
      registrarVenta();
    }

    // Tab → cambiar campo activo
    if (e.key === 'Tab') {
      e.preventDefault();
      const campos = ['precio', 'costo', 'cantidad'];
      const idx    = campos.indexOf(POS.campoActivo);
      const next   = campos[(idx + 1) % campos.length];
      activarCampo(next);
    }

    // F2 → focus en producto
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
    warning: { bg: 'linear-gradient(135deg, #C05621, #F6AD55)', dur: 3000 },
    info:    { bg: 'linear-gradient(135deg, #1A4F8A, #4A90D9)', dur: 2500 }
  };

  const cfg = colores[tipo] || colores.info;

  if (typeof Toastify === 'function') {
    Toastify({
      text:       mensaje,
      duration:   cfg.dur,
      gravity:    'bottom',
      position:   'center',
      style: {
        background:    cfg.bg,
        borderRadius:  '14px',
        fontFamily:    "'Inter', sans-serif",
        fontSize:      '13px',
        fontWeight:    '600',
        padding:       '12px 20px',
        boxShadow:     '0 8px 32px rgba(0,0,0,0.25)',
        border:        '1px solid rgba(255,255,255,0.15)'
      },
      onClick: function() {}
    }).showToast();
  } else {
    // Fallback sin Toastify
    console.log(`[${tipo.toUpperCase()}] ${mensaje}`);
  }
}









