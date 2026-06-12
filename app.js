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
let filtrosActivos = {
    categorias: new Set(),
    talles: new Set(),
    colores: new Set(),
    precio: "",
    descuento: false,
    genero: ""
};
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
        <a class="whatsapp-fab" href="https://wa.me/${NUMERO_WSP}" target="_blank" rel="noopener" aria-label="Abrir WhatsApp">
            WhatsApp
        </a>

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

function obtenerCategoriasProducto(prod) {
    const categorias = [normalizarCategoria(prod.categoria)];
    const extras = prod.categorias_busqueda || prod.categorias || prod.tags_categorias;

    if (Array.isArray(extras)) {
        categorias.push(...extras.map(normalizarCategoria));
    }

    if (typeof extras === 'string' && extras.trim()) {
        try {
            const parsed = JSON.parse(extras);
            if (Array.isArray(parsed)) {
                categorias.push(...parsed.map(normalizarCategoria));
            } else {
                categorias.push(...extras.split(',').map(normalizarCategoria));
            }
        } catch (error) {
            categorias.push(...extras.split(',').map(normalizarCategoria));
        }
    }

    return [...new Set(categorias.filter(Boolean))];
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

function actualizarMeta(nombre, valor, atributo = 'property') {
    if (!valor) return;

    let meta = document.querySelector(`meta[${atributo}="${nombre}"]`);

    if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(atributo, nombre);
        document.head.appendChild(meta);
    }

    meta.setAttribute('content', valor);
}

function actualizarMetasProducto(producto, imagen) {
    const precio = Number(producto.precio || 0);
    const titulo = `${producto.nombre} | IMPORTADOS RKT`;
    const descripcion = producto.descripcion
        ? String(producto.descripcion).slice(0, 155)
        : `${producto.categoria || 'Producto urbano'} disponible en IMPORTADOS RKT. Precio: $${precio.toLocaleString('es-AR')}. Consulta stock y talle por WhatsApp.`;

    document.title = titulo;
    actualizarMeta('description', descripcion, 'name');
    actualizarMeta('og:title', titulo);
    actualizarMeta('og:description', descripcion);
    actualizarMeta('og:image', imagen);
    actualizarMeta('twitter:title', titulo, 'name');
    actualizarMeta('twitter:description', descripcion, 'name');
    actualizarMeta('twitter:image', imagen, 'name');
}

function obtenerDescripcionProducto(producto) {
    return String(producto.descripcion || '').trim()
        || 'Prenda urbana seleccionada por IMPORTADOS RKT. Confirmamos stock, talle, color y forma de entrega por WhatsApp antes de cerrar la compra.';
}

function obtenerGuiaTallesProducto(producto, talles) {
    const categorias = obtenerCategoriasProducto(producto);
    const esAbajo = categorias.some((cat) => ['pantalones', 'joggings', 'jeans', 'bermudas', 'cortos', 'partes-abajo'].includes(cat));
    const esAccesorio = categorias.some((cat) => ['medias', 'rinonera', 'bandoleras', 'cadenas', 'guantes', 'viseras', 'gorros', 'caps', 'pilusos', 'gorras-viceras', 'accesorios'].includes(cat));

    if (esAbajo) {
        return `
            <p>Talles disponibles: ${talles.join(', ')}.</p>
            <p>Para pantalones, joggings, jeans, bermudas y shorts, compara cintura, tiro y largo con una prenda que uses comoda.</p>
            <p>Si estas entre dos talles, consulta medidas por WhatsApp antes de cerrar la compra.</p>
        `;
    }

    if (esAccesorio) {
        return `
            <p>Talles disponibles: ${talles.join(', ')}.</p>
            <p>En accesorios, revisa si el producto es talle unico o si tiene regulacion.</p>
            <p>Para gorras, viseras, guantes o bandoleras, consulta medidas si buscas un calce especifico.</p>
        `;
    }

    return `
        <p>Talles disponibles: ${talles.join(', ')}.</p>
        <p>Para remeras, buzos, hoodies, camperas y chalecos, compara ancho de pecho y largo con una prenda que uses comoda.</p>
        <p>Para calce oversize, elegi tu talle habitual si buscas que quede amplio.</p>
    `;
}

function aplicarFiltros() {
    let lista = [...productosData];

    if (categoriaActiva !== "todo") {
        lista = lista.filter((prod) => obtenerCategoriasProducto(prod).includes(categoriaActiva));
    }

    if (filtrosActivos.categorias.size) {
        lista = lista.filter((prod) => {
            const categoriasProducto = obtenerCategoriasProducto(prod);
            return [...filtrosActivos.categorias].some((cat) => categoriasProducto.includes(cat));
        });
    }

    if (filtrosActivos.talles.size) {
        lista = lista.filter((prod) => {
            const tallesProducto = obtenerListaTexto(prod.talles).map((talle) => talle.toUpperCase());
            return [...filtrosActivos.talles].some((talle) => tallesProducto.includes(talle));
        });
    }

    if (filtrosActivos.colores.size) {
        lista = lista.filter((prod) => {
            const coloresProducto = obtenerListaTexto(prod.colores).map((color) => normalizarCategoria(color));
            return [...filtrosActivos.colores].some((color) => coloresProducto.includes(color));
        });
    }

    if (filtrosActivos.precio) {
        const [min, max] = filtrosActivos.precio.split('-').map(Number);
        lista = lista.filter((prod) => {
            const precio = Number(prod.precio || 0);
            return precio >= min && precio <= max;
        });
    }

    if (filtrosActivos.descuento) {
        lista = lista.filter((prod) => prod.descuento || prod.oferta || Number(prod.precio_anterior || 0) > Number(prod.precio || 0));
    }

    if (filtrosActivos.genero) {
        lista = lista.filter((prod) => {
            const textoGenero = `${prod.genero || ''} ${prod.nombre || ''} ${prod.categoria || ''}`.toLowerCase();
            return textoGenero.includes(filtrosActivos.genero);
        });
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
    if (!grid || !contador) return;

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
        const descuentoPorcentaje = Math.max(0, Number(prod.descuento_porcentaje || 0));
        const precioAnterior = Number(prod.precio_anterior || 0);
        const tieneDescuento = descuentoPorcentaje > 0 || precioAnterior > precio;
        const precioAnteriorFinal = precioAnterior > precio
            ? precioAnterior
            : descuentoPorcentaje > 0
            ? Math.round(precio / (1 - descuentoPorcentaje / 100))
            : 0;
        const descuentoFinal = descuentoPorcentaje > 0
            ? descuentoPorcentaje
            : precioAnteriorFinal > precio
            ? Math.round(100 - (precio * 100 / precioAnteriorFinal))
            : 0;

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
        const imagenHoverHTML = !videoProducto && imagenes[1]
            ? `<img class="producto-img-hover" src="${imagenes[1]}" alt="${prod.nombre} segunda foto" loading="lazy">`
            : '';
        const alertaStockHTML = alertaStock && prod.stock !== false
            ? `<span class="stock-alerta">${alertaStock}</span>`
            : '';
        const badgeHTML = prod.stock === false
            ? '<span class="badge-rkt agotado">Agotado</span>'
            : prod.nuevo_ingreso === false
            ? ''
            : '<span class="badge-rkt">Nuevo ingreso</span>';
        const descuentoHTML = tieneDescuento
            ? `<div class="prod-price-row">
                    <span class="prod-precio">$${precio.toLocaleString('es-AR')}</span>
                    <span class="discount-pill">-${descuentoFinal}%</span>
               </div>
               <span class="prod-precio-anterior">$${precioAnteriorFinal.toLocaleString('es-AR')}</span>`
            : `<span class="prod-precio">$${precio.toLocaleString('es-AR')}</span>`;

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
                ${badgeHTML}
                <div class="card-slider" data-slide="0">
                    <div class="card-slider-track">
                        ${imagenesHTML}
                    </div>
                    ${imagenHoverHTML}
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
                ${descuentoHTML}
                <div class="prod-badges">
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
    const descuentoPorcentaje = Math.max(0, Number(producto.descuento_porcentaje || 0));
    const precioAnteriorGuardado = Number(producto.precio_anterior || 0);
    const precioAnterior = precioAnteriorGuardado > precio
        ? precioAnteriorGuardado
        : descuentoPorcentaje > 0
        ? Math.round(precio / (1 - descuentoPorcentaje / 100))
        : 0;
    const imagenes = obtenerImagenesProducto(producto);
    const alertaStock = obtenerAlertaStock(producto);
    const talles = obtenerListaTexto(producto.talles).length ? obtenerListaTexto(producto.talles) : ['U'];
    const colores = obtenerListaTexto(producto.colores);
    const descripcionProducto = obtenerDescripcionProducto(producto);
    const guiaTallesHTML = obtenerGuiaTallesProducto(producto, talles);
    const tallesOptions = talles.map((talle) => `<option value="${talle}">${talle}</option>`).join('');
    const coloresOptions = colores.map((color) => `<option value="${color}">${color}</option>`).join('');
    const miniaturasHTML = imagenes.map((imagen, index) => `
        <button type="button" class="${index === 0 ? 'active' : ''}" data-imagen="${imagen}">
            <img src="${imagen}" alt="${producto.nombre} foto ${index + 1}">
        </button>
    `).join('');

    actualizarMetasProducto(producto, imagenes[0] || producto.imagen_url || 'assets/hero-rkt.webp');

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
                ${precioAnterior > precio ? `<span>$${precioAnterior.toLocaleString('es-AR')}</span>` : ''}
            </div>

            <p class="detalle-desc">
                ${descripcionProducto}
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

            <div class="detalle-actions">
                <button class="detalle-cta" type="button" id="detalle-consultar" ${producto.stock === false ? 'disabled' : ''}>
                    ${producto.stock === false ? 'Agotado' : 'Agregar al carrito'}
                </button>
                <button class="detalle-cta detalle-whatsapp" type="button" id="detalle-whatsapp" ${producto.stock === false ? 'disabled' : ''}>
                    Consultar por WhatsApp
                </button>
            </div>

            <div class="detalle-beneficios">
                <div>
                    <strong>Envio coordinado</strong>
                    <span>Entrega o retiro en La Plata segun zona disponible</span>
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
                <p>${descripcionProducto}</p>
                <p>Categoria: ${producto.categoria || 'Producto urbano'}.</p>
                ${colores.length ? `<p>Colores o detalles: ${colores.join(', ')}.</p>` : ''}
                <p>Producto disponible para consultar por WhatsApp antes de comprar. El total no incluye envio salvo que se indique expresamente.</p>
                <strong>SKU: ${generarSku(producto.nombre)}</strong>
            </div>

            <div class="detalle-tab-panel" id="tab-talles">
                ${guiaTallesHTML}
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
    const whatsapp = document.getElementById('detalle-whatsapp');

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

    whatsapp?.addEventListener('click', () => {
        const talle = document.getElementById('detalle-talle').value;
        const color = document.getElementById('detalle-color')?.value;
        const cantidad = cantidadValor.innerText;
        const detalleColor = color ? `\nColor/detalle: ${color}` : '';
        const mensaje = `Hola. Quiero consultar stock de este producto:\n\n${producto.nombre}\nTalle: ${talle}${detalleColor}\nCantidad: ${cantidad}\nPrecio: $${Number(precio || 0).toLocaleString('es-AR')}\n\nMe confirman disponibilidad, envio o retiro en La Plata?`;
        window.open(`https://wa.me/${NUMERO_WSP}?text=${encodeURIComponent(mensaje)}`, '_blank');
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
            filtrosActivos.categorias.clear();

            botonesCategoria.forEach((item) => item.classList.remove('active'));
            document.querySelectorAll('[data-filter-categoria]').forEach((item) => item.classList.remove('active'));
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

    document.querySelectorAll('.filter-group .filter-accordion').forEach((boton) => {
        boton.addEventListener('click', () => {
            boton.closest('.filter-group').classList.toggle('open');
        });
    });

    document.querySelectorAll('[data-filter-categoria]').forEach((boton) => {
        boton.addEventListener('click', () => {
            const valor = boton.dataset.filterCategoria;
            boton.classList.toggle('active');
            filtrosActivos.categorias[boton.classList.contains('active') ? 'add' : 'delete'](valor);
            categoriaActiva = "todo";
            botonesCategoria.forEach((item) => item.classList.remove('active'));
            aplicarFiltros();
        });
    });

    document.querySelectorAll('[data-filter-talle]').forEach((boton) => {
        boton.addEventListener('click', () => {
            const valor = boton.dataset.filterTalle.toUpperCase();
            boton.classList.toggle('active');
            filtrosActivos.talles[boton.classList.contains('active') ? 'add' : 'delete'](valor);
            aplicarFiltros();
        });
    });

    document.querySelectorAll('[data-filter-color]').forEach((boton) => {
        boton.addEventListener('click', () => {
            const valor = normalizarCategoria(boton.dataset.filterColor);
            boton.classList.toggle('active');
            filtrosActivos.colores[boton.classList.contains('active') ? 'add' : 'delete'](valor);
            aplicarFiltros();
        });
    });

    document.querySelectorAll('[data-filter-precio]').forEach((boton) => {
        boton.addEventListener('click', () => {
            document.querySelectorAll('[data-filter-precio]').forEach((item) => item.classList.remove('active'));
            filtrosActivos.precio = filtrosActivos.precio === boton.dataset.filterPrecio ? "" : boton.dataset.filterPrecio;
            boton.classList.toggle('active', Boolean(filtrosActivos.precio));
            aplicarFiltros();
        });
    });

    document.querySelectorAll('[data-filter-descuento]').forEach((boton) => {
        boton.addEventListener('click', () => {
            filtrosActivos.descuento = !filtrosActivos.descuento;
            boton.classList.toggle('active', filtrosActivos.descuento);
            aplicarFiltros();
        });
    });

    document.querySelectorAll('[data-filter-genero]').forEach((boton) => {
        boton.addEventListener('click', () => {
            document.querySelectorAll('[data-filter-genero]').forEach((item) => item.classList.remove('active'));
            filtrosActivos.genero = filtrosActivos.genero === boton.dataset.filterGenero ? "" : boton.dataset.filterGenero;
            boton.classList.toggle('active', Boolean(filtrosActivos.genero));
            aplicarFiltros();
        });
    });

    document.getElementById('limpiar-filtros')?.addEventListener('click', () => {
        filtrosActivos = {
            categorias: new Set(),
            talles: new Set(),
            colores: new Set(),
            precio: "",
            descuento: false,
            genero: ""
        };
        categoriaActiva = "todo";
        document.querySelectorAll('.filter-panel button, [data-categoria]').forEach((boton) => boton.classList.remove('active'));
        document.querySelectorAll('[data-categoria="todo"]').forEach((boton) => boton.classList.add('active'));
        aplicarFiltros();
    });
}

function configurarFiltrosMobile() {
    const btnAbrir = document.getElementById('mobile-filter-toggle');
    const btnCerrar = document.getElementById('mobile-filter-close');
    const backdrop = document.getElementById('filters-backdrop');
    const panel = document.querySelector('.filters-panel');

    if (!btnAbrir || !panel) return;

    const abrir = () => {
        document.body.classList.add('filters-open');
        btnAbrir.setAttribute('aria-expanded', 'true');
    };

    const cerrar = () => {
        document.body.classList.remove('filters-open');
        btnAbrir.setAttribute('aria-expanded', 'false');
    };

    btnAbrir.setAttribute('aria-expanded', 'false');
    btnAbrir.addEventListener('click', abrir);
    btnCerrar?.addEventListener('click', cerrar);
    backdrop?.addEventListener('click', cerrar);

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') cerrar();
    });
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
    configurarFiltrosMobile();
    obtenerProductos();
});
