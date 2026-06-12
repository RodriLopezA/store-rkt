const SUPABASE_URL = "https://zpyhryenaaiewbjzjmfg.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpweWhyeWVuYWFpZXdianpqbWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMjgyNTIsImV4cCI6MjA5NjgwNDI1Mn0.hzHO4eRH7xH_O1zo6_lBs9kbsImBNLnDxL23okgK9_g";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const NUMERO_WSP = "549221XXXXXXX";
const PRODUCTOS_POR_PAGINA = 12;
const CARRITO_KEY = "urban_rkt_carrito";

let productosData = [];
let categoriaActiva = "todo";
let ordenActivo = "relevantes";
let busquedaActiva = "";
let paginaActual = 0;
let hayMasProductos = true;
let cargandoProductos = false;

async function obtenerProductos() {
    const loading = document.getElementById('loading');
    const loadingDestacados = document.getElementById('loading-destacados');
    const detalleProducto = document.getElementById('producto-detalle');

    if (detalleProducto) {
        mostrarSkeletonDetalle(detalleProducto);
        await obtenerProductoDetalle();
        return;
    }

    if (loadingDestacados && !loading) {
        mostrarSkeletonProductos(loadingDestacados, 4, true);
        await obtenerProductosDestacados();
        return;
    }

    if (loading) {
        mostrarSkeletonProductos(loading, PRODUCTOS_POR_PAGINA);
        await cargarPaginaProductos({ reiniciar: true });
    }
}

function mostrarSkeletonProductos(contenedor, cantidad = 8, destacados = false) {
    if (!contenedor) return;

    contenedor.style.display = 'grid';
    contenedor.className = destacados ? 'skeleton-grid skeleton-grid-4' : 'skeleton-grid';
    contenedor.innerHTML = Array.from({ length: cantidad }, () => `
        <article class="skeleton-card" aria-hidden="true">
            <div class="skeleton-img skeleton-shine"></div>
            <div class="skeleton-body">
                <span class="skeleton-line skeleton-line-wide skeleton-shine"></span>
                <span class="skeleton-line skeleton-line-short skeleton-shine"></span>
                <span class="skeleton-price skeleton-shine"></span>
                <span class="skeleton-line skeleton-line-mini skeleton-shine"></span>
            </div>
        </article>
    `).join('');
}

function mostrarSkeletonDetalle(contenedor) {
    if (!contenedor) return;

    contenedor.classList.add('producto-detalle-skeleton');
    contenedor.innerHTML = `
        <section class="skeleton-detail-media" aria-hidden="true">
            <div class="skeleton-detail-image skeleton-shine"></div>
            <div class="skeleton-thumbs">
                <span class="skeleton-thumb skeleton-shine"></span>
                <span class="skeleton-thumb skeleton-shine"></span>
            </div>
        </section>
        <section class="skeleton-detail-info" aria-hidden="true">
            <span class="skeleton-pill skeleton-shine"></span>
            <span class="skeleton-title skeleton-shine"></span>
            <span class="skeleton-line skeleton-line-short skeleton-shine"></span>
            <span class="skeleton-detail-price skeleton-shine"></span>
            <span class="skeleton-line skeleton-line-wide skeleton-shine"></span>
            <span class="skeleton-line skeleton-line-wide skeleton-shine"></span>
            <span class="skeleton-line skeleton-line-short skeleton-shine"></span>
            <span class="skeleton-select skeleton-shine"></span>
            <span class="skeleton-button skeleton-shine"></span>
        </section>
    `;
}

function mostrarMensajeCarga(contenedor, mensaje) {
    if (!contenedor) return;

    contenedor.className = 'mensaje-alerta';
    contenedor.style.display = 'block';
    contenedor.innerText = mensaje;
}

function configurarHeroVideo() {
    const hero = document.querySelector('.hero-inicio');
    const video = document.querySelector('.hero-video');
    if (!hero || !video) return;

    const videoSrc = video.dataset.src || video.getAttribute('src');
    if (!videoSrc) return;

    if (!video.getAttribute('src')) {
        video.src = videoSrc;
    }

    hero.classList.add('has-video');
    video.play().catch(() => {
        hero.classList.remove('has-video');
    });
}

function leerCarrito() {
    try {
        return JSON.parse(localStorage.getItem(CARRITO_KEY)) || [];
    } catch (error) {
        return [];
    }
}

function guardarCarrito(items) {
    localStorage.setItem(CARRITO_KEY, JSON.stringify(items));
    renderizarCarrito();
}

function calcularTotalCarrito(items = leerCarrito()) {
    return items.reduce((total, item) => total + (Number(item.precio || 0) * Number(item.cantidad || 1)), 0);
}

function crearCarritoUI() {
    if (document.getElementById('cart-drawer')) return;

    document.body.insertAdjacentHTML('beforeend', `
        <button class="cart-fab" type="button" id="cart-open" aria-label="Abrir carrito">
            <span>Carrito</span>
            <strong id="cart-count">0</strong>
        </button>

        <aside class="cart-drawer" id="cart-drawer" aria-hidden="true">
            <div class="cart-head">
                <div>
                    <span>Tu compra</span>
                    <strong>Carrito</strong>
                </div>
                <button type="button" id="cart-close" aria-label="Cerrar carrito">×</button>
            </div>

            <div class="cart-items" id="cart-items"></div>

            <form class="checkout-form" id="checkout-form">
                <label>
                    Nombre
                    <input type="text" id="checkout-nombre" placeholder="Tu nombre" required>
                </label>
                <label>
                    Envio o retiro
                    <select id="checkout-envio">
                        <option value="Envio a domicilio">Envio a domicilio</option>
                        <option value="Retiro coordinado">Retiro coordinado</option>
                    </select>
                </label>
                <label>
                    Zona / direccion
                    <input type="text" id="checkout-direccion" placeholder="Barrio, ciudad o direccion">
                </label>
                <label>
                    Comentario
                    <input type="text" id="checkout-nota" placeholder="Horario, referencia, consulta">
                </label>

                <div class="cart-total">
                    <div>
                        <span>Total prendas</span>
                        <small id="cart-total-note">No incluye envio</small>
                    </div>
                    <strong id="cart-total">$0</strong>
                </div>

                <button class="checkout-btn" type="submit">Finalizar compra por WhatsApp</button>
            </form>
        </aside>

        <div class="cart-backdrop" id="cart-backdrop"></div>
    `);

    document.getElementById('cart-open').addEventListener('click', abrirCarrito);
    document.getElementById('cart-close').addEventListener('click', cerrarCarrito);
    document.getElementById('cart-backdrop').addEventListener('click', cerrarCarrito);
    document.getElementById('checkout-form').addEventListener('submit', finalizarCompraWhatsApp);
    document.getElementById('cart-items').addEventListener('click', manejarClickCarrito);
    renderizarCarrito();
}

function abrirCarrito() {
    document.body.classList.add('cart-open');
    document.getElementById('cart-drawer')?.setAttribute('aria-hidden', 'false');
}

function cerrarCarrito() {
    document.body.classList.remove('cart-open');
    document.getElementById('cart-drawer')?.setAttribute('aria-hidden', 'true');
}

function renderizarCarrito() {
    const items = leerCarrito();
    const contenedor = document.getElementById('cart-items');
    const contador = document.getElementById('cart-count');
    const total = document.getElementById('cart-total');

    if (contador) {
        contador.innerText = items.reduce((acc, item) => acc + Number(item.cantidad || 1), 0);
    }

    if (total) {
        total.innerText = `$${calcularTotalCarrito(items).toLocaleString('es-AR')}`;
    }

    if (!contenedor) return;

    if (!items.length) {
        contenedor.innerHTML = '<p class="cart-empty">Todavia no agregaste prendas.</p>';
        return;
    }

    contenedor.innerHTML = items.map((item) => `
        <article class="cart-item">
            <img src="${escaparAtributo(item.imagen || '')}" alt="${escaparAtributo(item.nombre)}">
            <div>
                <strong>${item.nombre}</strong>
                <span>Talle: ${item.talle || 'U'}${item.color ? ` · ${item.color}` : ''}</span>
                <small>$${Number(item.precio || 0).toLocaleString('es-AR')} c/u</small>
                <div class="cart-qty">
                    <button type="button" data-accion="menos" data-key="${escaparAtributo(item.key)}">−</button>
                    <b>${item.cantidad}</b>
                    <button type="button" data-accion="mas" data-key="${escaparAtributo(item.key)}">+</button>
                    <button type="button" data-accion="eliminar" data-key="${escaparAtributo(item.key)}">Quitar</button>
                </div>
            </div>
        </article>
    `).join('');
}

function agregarAlCarrito(producto) {
    const items = leerCarrito();
    const key = `${producto.id || generarSku(producto.nombre)}-${generarSku(producto.talle || 'U')}-${generarSku(producto.color || '')}`;
    const existente = items.find((item) => item.key === key);

    if (existente) {
        existente.cantidad += Number(producto.cantidad || 1);
    } else {
        items.push({
            key,
            id: producto.id,
            nombre: producto.nombre,
            precio: Number(producto.precio || 0),
            talle: producto.talle || 'U',
            color: producto.color || '',
            cantidad: Number(producto.cantidad || 1),
            imagen: producto.imagen || ''
        });
    }

    guardarCarrito(items);
    abrirCarrito();
}

function manejarClickCarrito(event) {
    const boton = event.target.closest('button');
    if (!boton) return;

    const items = leerCarrito();
    const item = items.find((prod) => prod.key === boton.dataset.key);
    if (!item) return;

    if (boton.dataset.accion === 'mas') {
        item.cantidad += 1;
    }

    if (boton.dataset.accion === 'menos') {
        item.cantidad -= 1;
    }

    const actualizados = boton.dataset.accion === 'eliminar' || item.cantidad <= 0
        ? items.filter((prod) => prod.key !== item.key)
        : items;

    guardarCarrito(actualizados);
}

function finalizarCompraWhatsApp(event) {
    event.preventDefault();

    const items = leerCarrito();
    if (!items.length) {
        alert("Agrega al menos una prenda al carrito.");
        return;
    }

    const nombre = document.getElementById('checkout-nombre').value.trim();
    const envio = document.getElementById('checkout-envio').value;
    const direccion = document.getElementById('checkout-direccion').value.trim();
    const nota = document.getElementById('checkout-nota').value.trim();
    const total = calcularTotalCarrito(items);
    const resumen = items.map((item, index) => {
        const subtotal = Number(item.precio || 0) * Number(item.cantidad || 1);
        const color = item.color ? `\n   Color/detalle: ${item.color}` : '';
        return `${index + 1}. ${item.nombre}\n   Talle: ${item.talle || 'U'}${color}\n   Cantidad: ${item.cantidad}\n   Precio: $${Number(item.precio || 0).toLocaleString('es-AR')}\n   Subtotal: $${subtotal.toLocaleString('es-AR')}`;
    }).join('\n\n');

    const mensaje = `Hola. Quiero finalizar esta compra:\n\n${resumen}\n\nTotal estimado: $${total.toLocaleString('es-AR')}\n\nDatos del cliente:\nNombre: ${nombre}\nMetodo: ${envio}\nZona/direccion: ${direccion || 'A coordinar'}\nComentario: ${nota || 'Sin comentario'}\n\nMe confirman disponibilidad y envio?`;
    window.open(`https://wa.me/${NUMERO_WSP}?text=${encodeURIComponent(mensaje)}`, '_blank');
}

async function obtenerProductosDestacados() {
    const loadingDestacados = document.getElementById('loading-destacados');

    const { data, error } = await supabaseClient
        .from('productos')
        .select('*')
        .order('created_at', { ascending: false })
        .range(0, 3);

    if (error) {
        console.error("Error cargando productos:", error);
        mostrarMensajeCarga(loadingDestacados, "No se pudieron cargar los destacados.");
        return;
    }

    productosData = data || [];
    renderizarDestacados(productosData);
}

async function cargarPaginaProductos({ reiniciar = false } = {}) {
    const loading = document.getElementById('loading');
    const btnVerMas = document.getElementById('btn-ver-mas');

    if (cargandoProductos) return;

    if (reiniciar) {
        paginaActual = 0;
        hayMasProductos = true;
        productosData = [];
    }

    if (!hayMasProductos) return;

    cargandoProductos = true;
    if (btnVerMas) {
        btnVerMas.disabled = true;
        btnVerMas.innerText = "Cargando...";
    }

    const desde = paginaActual * PRODUCTOS_POR_PAGINA;
    const hasta = desde + PRODUCTOS_POR_PAGINA - 1;

    const { data, error } = await supabaseClient
        .from('productos')
        .select('*')
        .order('created_at', { ascending: false })
        .range(desde, hasta);

    cargandoProductos = false;

    if (error) {
        console.error("Error cargando productos:", error);
        mostrarMensajeCarga(loading, "No se pudieron cargar los productos.");
        if (btnVerMas) {
            btnVerMas.disabled = false;
            btnVerMas.innerText = "Ver mas";
        }
        return;
    }

    if (loading) {
        loading.style.display = 'none';
    }

    const nuevosProductos = data || [];
    productosData = reiniciar ? nuevosProductos : [...productosData, ...nuevosProductos];
    paginaActual += 1;
    hayMasProductos = nuevosProductos.length === PRODUCTOS_POR_PAGINA;

    aplicarFiltros();
    actualizarBotonVerMas();
}

async function obtenerProductoDetalle() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const nombre = params.get('nombre');
    let query = supabaseClient.from('productos').select('*').limit(1);

    if (id !== null) {
        query = query.eq('id', id);
    } else if (nombre !== null) {
        query = query.eq('nombre', nombre);
    }

    const { data, error } = await query;

    if (error) {
        console.error("Error cargando producto:", error);
        document.getElementById('producto-detalle').innerHTML = '<div class="mensaje-alerta">No se pudo cargar el producto.</div>';
        return;
    }

    productosData = data || [];
    renderizarDetalleProducto();
}

function actualizarBotonVerMas() {
    const btnVerMas = document.getElementById('btn-ver-mas');
    if (!btnVerMas) return;

    btnVerMas.disabled = false;
    btnVerMas.innerText = "Ver mas";
    btnVerMas.style.display = hayMasProductos ? 'inline-flex' : 'none';
}

function normalizarCategoria(categoria) {
    return String(categoria || "")
        .trim()
        .toLowerCase();
}

function obtenerImagenesProducto(producto) {
    if (Array.isArray(producto.imagenes_urls) && producto.imagenes_urls.length) {
        return producto.imagenes_urls.filter(Boolean).slice(0, 3);
    }

    if (typeof producto.imagenes_urls === 'string' && producto.imagenes_urls.trim()) {
        try {
            const imagenesParseadas = JSON.parse(producto.imagenes_urls);
            if (Array.isArray(imagenesParseadas) && imagenesParseadas.length) {
                return imagenesParseadas.filter(Boolean).slice(0, 3);
            }
        } catch (error) {
            return [producto.imagenes_urls, producto.imagen_url].filter(Boolean).slice(0, 3);
        }
    }

    return [producto.imagen_url].filter(Boolean).slice(0, 3);
}

function obtenerVideoProducto(producto) {
    if (producto.video_url) return producto.video_url;

    if (Array.isArray(producto.videos_urls) && producto.videos_urls.length) {
        return producto.videos_urls.find(Boolean) || '';
    }

    if (typeof producto.videos_urls === 'string' && producto.videos_urls.trim()) {
        try {
            const videosParseados = JSON.parse(producto.videos_urls);
            if (Array.isArray(videosParseados)) return videosParseados.find(Boolean) || '';
        } catch (error) {
            return producto.videos_urls;
        }
    }

    return '';
}

function obtenerAlertaStock(producto) {
    const stockTalles = producto.stock_talles || producto.stock_por_talle || producto.stockTalles;
    let mapaStock = stockTalles;

    if (typeof stockTalles === 'string' && stockTalles.trim()) {
        try {
            mapaStock = JSON.parse(stockTalles);
        } catch (error) {
            return '';
        }
    }

    if (!mapaStock || typeof mapaStock !== 'object' || Array.isArray(mapaStock)) {
        return '';
    }

    const talleEscaso = Object.entries(mapaStock).find(([, cantidad]) => {
        const numero = Number(cantidad);
        return numero > 0 && numero <= 2;
    });

    if (!talleEscaso) return '';

    const [talle, cantidad] = talleEscaso;
    return `Quedan ${cantidad} en talle ${talle}`;
}

function obtenerListaTexto(valor) {
    return String(valor || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
}

function escaparAtributo(valor) {
    return String(valor || '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function aplicarFiltros() {
    let lista = [...productosData];

    if (categoriaActiva !== "todo") {
        lista = lista.filter((prod) => normalizarCategoria(prod.categoria) === categoriaActiva);
    }

    if (busquedaActiva) {
        lista = lista.filter((prod) => {
            const textoProducto = `${prod.nombre || ''} ${prod.categoria || ''} ${prod.talles || ''} ${prod.colores || ''}`.toLowerCase();
            return textoProducto.includes(busquedaActiva);
        });
    }

    if (ordenActivo === "menor-precio") {
        lista.sort((a, b) => Number(a.precio) - Number(b.precio));
    }

    if (ordenActivo === "mayor-precio") {
        lista.sort((a, b) => Number(b.precio) - Number(a.precio));
    }

    if (ordenActivo === "nombre") {
        lista.sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), 'es'));
    }

    renderizarGrid(lista);
}

function renderizarGrid(lista) {
    const grid = document.getElementById('grid-productos');
    const contador = document.getElementById('contador-productos');
    grid.innerHTML = "";
    contador.innerText = lista.length;

    if (!lista.length) {
        grid.innerHTML = '<div class="mensaje-alerta">No hay productos para esta categoria.</div>';
        return;
    }

    renderizarCards(lista, grid);
}

function renderizarDestacados(lista) {
    const loading = document.getElementById('loading-destacados');
    const grid = document.getElementById('grid-destacados');

    loading.style.display = 'none';
    grid.innerHTML = "";

    if (!lista.length) {
        grid.innerHTML = '<div class="mensaje-alerta">Todavia no hay productos destacados.</div>';
        return;
    }

    renderizarCards(lista, grid);
}

function renderizarCards(lista, grid) {
    lista.forEach((prod) => {
        const arrayTalles = obtenerListaTexto(prod.talles);
        const talles = arrayTalles.length ? arrayTalles : ['U'];
        const imagenes = obtenerImagenesProducto(prod);
        const videoProducto = obtenerVideoProducto(prod);
        const alertaStock = obtenerAlertaStock(prod);
        const colores = obtenerListaTexto(prod.colores);
        const precio = Number(prod.precio || 0);
        const cuotas = Math.ceil(precio / 6);

        const tallesHTML = talles.map((t, index) =>
            `<button class="talle-btn ${index === 0 ? 'selected' : ''}" onclick="seleccionarTalle(this)">${t.trim()}</button>`
        ).join('');
        const imagenesHTML = imagenes.map((imagen, index) =>
            `<img class="producto-img" src="${imagen}" alt="${prod.nombre} foto ${index + 1}" loading="lazy">`
        ).join('');
        const dotsHTML = imagenes.length > 1
            ? `<div class="card-slider-dots">${imagenes.map((_, index) => `<span class="${index === 0 ? 'active' : ''}"></span>`).join('')}</div>`
            : '';
        const variantesHTML = colores.length
            ? `<div class="prod-variantes">${colores.map((color) => `<span>${color}</span>`).join('')}</div>`
            : '';
        const videoHTML = videoProducto
            ? `<video class="producto-video-hover" src="${videoProducto}" muted loop playsinline preload="none"></video>`
            : '';
        const alertaStockHTML = alertaStock && prod.stock !== false
            ? `<span class="stock-alerta">${alertaStock}</span>`
            : '';

        const card = document.createElement('article');
        card.className = 'producto-card';
        card.tabIndex = 0;
        card.dataset.id = prod.id || '';
        card.dataset.nombre = prod.nombre || '';
        card.dataset.precio = precio;
        card.dataset.imagen = imagenes[0] || prod.imagen_url || '';
        card.dataset.color = colores[0] || '';
        card.innerHTML = `
            <div class="img-contenedor">
                <span class="badge-rkt ${prod.stock === false ? 'agotado' : ''}">${prod.stock === false ? 'Agotado' : 'Nuevo ingreso'}</span>
                <button class="fav-btn" type="button" aria-label="Agregar a favoritos">&hearts;</button>
                <div class="card-slider" data-slide="0">
                    <div class="card-slider-track">
                        ${imagenesHTML}
                    </div>
                    ${videoHTML}
                    ${imagenes.length > 1 ? `
                        <button class="card-slide-btn card-slide-prev" type="button" aria-label="Foto anterior">‹</button>
                        <button class="card-slide-btn card-slide-next" type="button" aria-label="Foto siguiente">›</button>
                    ` : ''}
                    ${dotsHTML}
                </div>
            </div>
            <div class="producto-info">
                <span class="prod-cat">${prod.categoria || 'Producto'}</span>
                <h3 class="prod-nom">${prod.nombre}</h3>
                ${variantesHTML}
                <span class="prod-precio">$${precio.toLocaleString('es-AR')}</span>
                <span class="prod-cuotas">6 cuotas sin interes de $${cuotas.toLocaleString('es-AR')}</span>
                <div class="prod-badges">
                    <span class="mini-badge">Gratis</span>
                    <span class="stock-badge">${prod.stock === false ? 'Sin stock' : 'Stock disponible'}</span>
                </div>
                ${alertaStockHTML}
                <div class="talles-grid">${tallesHTML}</div>
                <button class="btn-wsp" ${prod.stock === false ? 'disabled' : ''} onclick="agregarProductoDesdeCard(this)">
                    ${prod.stock === false ? 'Agotado' : 'Agregar al carrito'}
                </button>
            </div>
        `;

        card.addEventListener('click', (event) => {
            if (event.target.closest('button')) return;
            window.location.href = obtenerUrlProducto(prod);
        });

        card.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter') return;
            window.location.href = obtenerUrlProducto(prod);
        });

        grid.appendChild(card);
        configurarCardSlider(card);
        configurarCardVideo(card);
    });
}

function configurarCardVideo(card) {
    const video = card.querySelector('.producto-video-hover');
    if (!video) return;

    card.addEventListener('mouseenter', () => {
        video.play().catch(() => {});
    });

    card.addEventListener('mouseleave', () => {
        video.pause();
        video.currentTime = 0;
    });
}

function configurarCardSlider(card) {
    const slider = card.querySelector('.card-slider');
    const track = card.querySelector('.card-slider-track');
    const dots = card.querySelectorAll('.card-slider-dots span');
    if (!slider || !track || !dots.length) return;

    const moverA = (indice) => {
        const total = dots.length;
        const siguiente = (indice + total) % total;
        slider.dataset.slide = String(siguiente);
        track.scrollTo({
            left: track.clientWidth * siguiente,
            behavior: 'smooth'
        });
        dots.forEach((dot, dotIndex) => dot.classList.toggle('active', dotIndex === siguiente));
    };

    card.querySelector('.card-slide-prev')?.addEventListener('click', (event) => {
        event.stopPropagation();
        moverA(Number(slider.dataset.slide || 0) - 1);
    });

    card.querySelector('.card-slide-next')?.addEventListener('click', (event) => {
        event.stopPropagation();
        moverA(Number(slider.dataset.slide || 0) + 1);
    });

    track.addEventListener('scroll', () => {
        const indice = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
        slider.dataset.slide = String(indice);
        dots.forEach((dot, dotIndex) => dot.classList.toggle('active', dotIndex === indice));
    }, { passive: true });
}

function obtenerUrlProducto(prod) {
    if (prod.id !== undefined && prod.id !== null) {
        return `producto.html?id=${encodeURIComponent(prod.id)}`;
    }

    return `producto.html?nombre=${encodeURIComponent(prod.nombre || '')}`;
}

function renderizarDetalleProducto() {
    const contenedor = document.getElementById('producto-detalle');
    contenedor.classList.remove('producto-detalle-skeleton');
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const nombre = params.get('nombre');

    const producto = productosData.find((prod) => {
        if (id !== null && String(prod.id) === String(id)) return true;
        if (nombre !== null && String(prod.nombre) === String(nombre)) return true;
        return false;
    });

    if (!producto) {
        contenedor.innerHTML = '<div class="mensaje-alerta">No se encontro el producto.</div>';
        return;
    }

    const precio = Number(producto.precio || 0);
    const precioAnterior = Math.round(precio * 1.25);
    const imagenes = obtenerImagenesProducto(producto);
    const alertaStock = obtenerAlertaStock(producto);
    const talles = obtenerListaTexto(producto.talles).length ? obtenerListaTexto(producto.talles) : ['U'];
    const colores = obtenerListaTexto(producto.colores);
    const tallesOptions = talles.map((talle) => `<option value="${talle}">${talle}</option>`).join('');
    const coloresOptions = colores.map((color) => `<option value="${color}">${color}</option>`).join('');
    const miniaturasHTML = imagenes.map((imagen, index) => `
        <button type="button" class="${index === 0 ? 'active' : ''}" data-imagen="${imagen}">
            <img src="${imagen}" alt="${producto.nombre} foto ${index + 1}">
        </button>
    `).join('');

    contenedor.innerHTML = `
        <section class="detalle-media">
            <div class="detalle-img-principal">
                <img id="detalle-imagen-activa" src="${imagenes[0] || producto.imagen_url}" alt="${producto.nombre}">
            </div>
            <div class="detalle-miniaturas">
                ${miniaturasHTML}
            </div>
        </section>

        <section class="detalle-info">
            <div class="detalle-pills">
                <span>${producto.categoria || 'Producto'}</span>
                <strong>${producto.stock === false ? 'Agotado' : 'Ingreso'}</strong>
            </div>

            <h1>${producto.nombre}</h1>
            <p class="detalle-rating">★ 0.0 · 0 reseñas de la comunidad</p>

            <div class="detalle-precios">
                <strong>$${precio.toLocaleString('es-AR')}</strong>
                <span>$${precioAnterior.toLocaleString('es-AR')}</span>
            </div>

            <p class="detalle-desc">
                Prenda urbana seleccionada para el catalogo. Consulta disponibilidad, talle y forma de entrega antes de cerrar la compra.
            </p>

            <div class="detalle-tags">
                <span>${producto.categoria || 'URBANO'}</span>
                <span>STOCK</span>
                <span>RKT</span>
            </div>

            <div class="detalle-divider"></div>

            <label class="detalle-label" for="detalle-talle">Talle</label>
            <select id="detalle-talle" class="detalle-select">${tallesOptions}</select>

            ${colores.length ? `
                <label class="detalle-label" for="detalle-color">Color / detalle</label>
                <select id="detalle-color" class="detalle-select">${coloresOptions}</select>
            ` : ''}

            <span class="detalle-label">Cantidad</span>
            <div class="detalle-cantidad">
                <button type="button" id="cantidad-menos">−</button>
                <strong id="cantidad-valor">1</strong>
                <button type="button" id="cantidad-mas">+</button>
            </div>

            <span class="detalle-alerta">${producto.stock === false ? 'Sin stock' : (alertaStock || 'Ultimas unidades')}</span>

            <button class="detalle-cta" type="button" id="detalle-consultar" ${producto.stock === false ? 'disabled' : ''}>
                ${producto.stock === false ? 'Agotado' : 'Agregar al carrito'}
            </button>

            <div class="detalle-beneficios">
                <div>
                    <strong>Envio coordinado</strong>
                    <span>Entrega o retiro segun zona disponible</span>
                </div>
                <div>
                    <strong>Cambios faciles</strong>
                    <span>Por talle o producto disponible</span>
                </div>
                <div>
                    <strong>Calidad seleccionada</strong>
                    <span>Prendas urbanas revisadas antes de entregar</span>
                </div>
            </div>
        </section>

        <section class="detalle-extra">

            <div class="detalle-tabs">
                <button class="active" type="button" data-tab="descripcion">Descripcion</button>
                <button type="button" data-tab="talles">Guia de talles</button>
                <button type="button" data-tab="cuidados">Cuidados</button>
            </div>

            <div class="detalle-tab-panel active" id="tab-descripcion">
                <p>${producto.nombre}.</p>
                <p>Categoria: ${producto.categoria || 'Producto urbano'}.</p>
                ${colores.length ? `<p>Colores o detalles: ${colores.join(', ')}.</p>` : ''}
                <p>Producto disponible para consultar por WhatsApp antes de comprar.</p>
                <strong>SKU: ${generarSku(producto.nombre)}</strong>
            </div>

            <div class="detalle-tab-panel" id="tab-talles">
                <p>Talles disponibles: ${talles.join(', ')}.</p>
                <p>Si estas entre dos talles, consulta medidas antes de cerrar la compra.</p>
                <p>Recomendamos comparar con una prenda que ya uses comoda.</p>
            </div>

            <div class="detalle-tab-panel" id="tab-cuidados">
                <p>Lavar con agua fria y colores similares.</p>
                <p>No usar lavandina. Secar a la sombra para cuidar color y tela.</p>
                <p>Planchar del reves si la prenda lo permite.</p>
            </div>
        </section>

        <section class="relacionados-section">
            <h2>Tambien te puede interesar</h2>
            <div class="productos-grid relacionados-grid" id="grid-relacionados"></div>
        </section>
    `;

    configurarDetalleAcciones(producto, precio);
    configurarDetalleGaleria();
    configurarDetalleTabs();
    renderizarRelacionados(producto);
}

function generarSku(nombre) {
    return String(nombre || 'producto')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

function configurarDetalleAcciones(producto, precio) {
    const cantidadValor = document.getElementById('cantidad-valor');
    const menos = document.getElementById('cantidad-menos');
    const mas = document.getElementById('cantidad-mas');
    const consultar = document.getElementById('detalle-consultar');

    menos.addEventListener('click', () => {
        const actual = Number(cantidadValor.innerText);
        cantidadValor.innerText = Math.max(1, actual - 1);
    });

    mas.addEventListener('click', () => {
        const actual = Number(cantidadValor.innerText);
        cantidadValor.innerText = actual + 1;
    });

    consultar.addEventListener('click', () => {
        const talle = document.getElementById('detalle-talle').value;
        const color = document.getElementById('detalle-color')?.value;
        const cantidad = cantidadValor.innerText;
        const imagenes = obtenerImagenesProducto(producto);

        agregarAlCarrito({
            id: producto.id,
            nombre: producto.nombre,
            precio,
            talle,
            color,
            cantidad,
            imagen: imagenes[0] || producto.imagen_url
        });
    });
}

function configurarDetalleGaleria() {
    const imagenActiva = document.getElementById('detalle-imagen-activa');
    const miniaturas = document.querySelectorAll('.detalle-miniaturas button');
    if (!imagenActiva || !miniaturas.length) return;

    miniaturas.forEach((boton) => {
        boton.addEventListener('click', () => {
            imagenActiva.src = boton.dataset.imagen;
            miniaturas.forEach((item) => item.classList.remove('active'));
            boton.classList.add('active');
        });
    });
}

function configurarDetalleTabs() {
    const botones = document.querySelectorAll('.detalle-tabs button');
    const paneles = document.querySelectorAll('.detalle-tab-panel');

    botones.forEach((boton) => {
        boton.addEventListener('click', () => {
            botones.forEach((item) => item.classList.remove('active'));
            paneles.forEach((item) => item.classList.remove('active'));

            boton.classList.add('active');
            document.getElementById(`tab-${boton.dataset.tab}`).classList.add('active');
        });
    });
}

async function renderizarRelacionados(productoActual) {
    const grid = document.getElementById('grid-relacionados');
    if (!grid) return;

    let query = supabaseClient
        .from('productos')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (productoActual.id !== undefined) {
        query = query.neq('id', productoActual.id);
    }

    const { data, error } = await query;

    if (error) {
        console.error("Error cargando relacionados:", error);
        grid.innerHTML = '<div class="mensaje-alerta">No se pudieron cargar productos relacionados.</div>';
        return;
    }

    const relacionados = (data || [])
        .filter((prod) => {
            const mismoProducto = productoActual.id !== undefined
                ? String(prod.id) === String(productoActual.id)
                : String(prod.nombre) === String(productoActual.nombre);
            return !mismoProducto;
        })
        .slice(0, 4);

    if (!relacionados.length) {
        grid.innerHTML = '<div class="mensaje-alerta">No hay productos relacionados por ahora.</div>';
        return;
    }

    renderizarCards(relacionados, grid);
}

function escaparTexto(texto) {
    return String(texto || '').replace(/'/g, "\\'");
}

function seleccionarTalle(boton) {
    const contenedor = boton.parentElement;
    contenedor.querySelectorAll('.talle-btn').forEach((b) => b.classList.remove('selected'));
    boton.classList.add('selected');
}

function agregarProductoDesdeCard(boton) {
    const tarjeta = boton.closest('.producto-card');
    const talleSeleccionado = tarjeta.querySelector('.talle-btn.selected').innerText;

    agregarAlCarrito({
        id: tarjeta.dataset.id,
        nombre: tarjeta.dataset.nombre,
        precio: tarjeta.dataset.precio,
        talle: talleSeleccionado,
        color: tarjeta.dataset.color,
        cantidad: 1,
        imagen: tarjeta.dataset.imagen
    });
}

function enviarPedido(nombre, precio, boton) {
    const tarjeta = boton.closest('.producto-card');
    const talleSeleccionado = tarjeta.querySelector('.talle-btn.selected').innerText;

    agregarAlCarrito({
        nombre,
        precio,
        talle: talleSeleccionado,
        cantidad: 1,
        imagen: tarjeta.dataset.imagen
    });
}

function configurarFiltros() {
    const botonesCategoria = document.querySelectorAll('[data-categoria]');
    const selectOrden = document.getElementById('orden-productos');
    const btnVerMas = document.getElementById('btn-ver-mas');

    const params = new URLSearchParams(window.location.search);
    const categoriaUrl = params.get('categoria');
    const busquedaUrl = params.get('q');
    if (categoriaUrl) {
        categoriaActiva = categoriaUrl;
        botonesCategoria.forEach((boton) => boton.classList.remove('active'));
    }

    if (busquedaUrl) {
        busquedaActiva = busquedaUrl.trim().toLowerCase();
    }

    botonesCategoria.forEach((boton) => {
        if (boton.dataset.categoria === categoriaActiva) {
            boton.classList.add('active');
        }

        boton.addEventListener('click', () => {
            categoriaActiva = boton.dataset.categoria;

            botonesCategoria.forEach((item) => item.classList.remove('active'));
            document.querySelectorAll(`[data-categoria="${categoriaActiva}"]`).forEach((item) => {
                item.classList.add('active');
            });

            aplicarFiltros();

            if (boton.closest('.dropdown-menu')) {
                const catalogo = document.getElementById('catalogo');
                if (catalogo) catalogo.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    if (selectOrden) {
        selectOrden.addEventListener('change', () => {
            ordenActivo = selectOrden.value;
            aplicarFiltros();
        });
    }

    if (btnVerMas) {
        btnVerMas.addEventListener('click', () => cargarPaginaProductos());
    }
}

function configurarHeaderScroll() {
    if (!document.querySelector('.hero-header')) return;

    const actualizarHeader = () => {
        document.body.classList.toggle('scrolled', window.scrollY > 80);
    };

    actualizarHeader();
    window.addEventListener('scroll', actualizarHeader, { passive: true });
}

window.addEventListener('DOMContentLoaded', () => {
    configurarHeroVideo();
    crearCarritoUI();
    configurarHeaderScroll();
    configurarFiltros();
    obtenerProductos();
});
