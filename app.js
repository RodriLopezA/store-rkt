const SUPABASE_URL = "https://zpyhryenaaiewbjzjmfg.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpweWhyeWVuYWFpZXdianpqbWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMjgyNTIsImV4cCI6MjA5NjgwNDI1Mn0.hzHO4eRH7xH_O1zo6_lBs9kbsImBNLnDxL23okgK9_g";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const NUMERO_WSP = "549221XXXXXXX";
const PRODUCTOS_POR_PAGINA = 12;

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

    if (document.getElementById('producto-detalle')) {
        await obtenerProductoDetalle();
        return;
    }

    if (loadingDestacados && !loading) {
        await obtenerProductosDestacados();
        return;
    }

    if (loading) {
        await cargarPaginaProductos({ reiniciar: true });
    }
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
        if (loadingDestacados) loadingDestacados.innerText = "No se pudieron cargar los destacados.";
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
        if (loading) loading.innerText = "No se pudieron cargar los productos.";
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

function aplicarFiltros() {
    let lista = [...productosData];

    if (categoriaActiva !== "todo") {
        lista = lista.filter((prod) => normalizarCategoria(prod.categoria) === categoriaActiva);
    }

    if (busquedaActiva) {
        lista = lista.filter((prod) => {
            const textoProducto = `${prod.nombre || ''} ${prod.categoria || ''} ${prod.talles || ''}`.toLowerCase();
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
        const arrayTalles = prod.talles ? prod.talles.split(',') : ['U'];
        const precio = Number(prod.precio || 0);
        const cuotas = Math.ceil(precio / 6);

        const tallesHTML = arrayTalles.map((t, index) =>
            `<button class="talle-btn ${index === 0 ? 'selected' : ''}" onclick="seleccionarTalle(this)">${t.trim()}</button>`
        ).join('');

        const card = document.createElement('article');
        card.className = 'producto-card';
        card.tabIndex = 0;
        card.innerHTML = `
            <div class="img-contenedor">
                <span class="badge-rkt">Nuevo ingreso</span>
                <button class="fav-btn" type="button" aria-label="Agregar a favoritos">&hearts;</button>
                <img class="producto-img" src="${prod.imagen_url}" alt="${prod.nombre}" loading="lazy">
            </div>
            <div class="producto-info">
                <span class="prod-cat">${prod.categoria || 'Producto'}</span>
                <h3 class="prod-nom">${prod.nombre}</h3>
                <span class="prod-precio">$${precio.toLocaleString('es-AR')}</span>
                <span class="prod-cuotas">6 cuotas sin interes de $${cuotas.toLocaleString('es-AR')}</span>
                <div class="prod-badges">
                    <span class="mini-badge">Gratis</span>
                    <span class="stock-badge">Stock disponible</span>
                </div>
                <div class="talles-grid">${tallesHTML}</div>
                <button class="btn-wsp" onclick="enviarPedido('${escaparTexto(prod.nombre)}', '${precio}', this)">Consultar por WhatsApp</button>
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
    });
}

function obtenerUrlProducto(prod) {
    if (prod.id !== undefined && prod.id !== null) {
        return `producto.html?id=${encodeURIComponent(prod.id)}`;
    }

    return `producto.html?nombre=${encodeURIComponent(prod.nombre || '')}`;
}

function renderizarDetalleProducto() {
    const contenedor = document.getElementById('producto-detalle');
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
    const talles = producto.talles ? producto.talles.split(',').map((t) => t.trim()).filter(Boolean) : ['U'];
    const tallesOptions = talles.map((talle) => `<option value="${talle}">${talle}</option>`).join('');

    contenedor.innerHTML = `
        <section class="detalle-media">
            <div class="detalle-img-principal">
                <img src="${producto.imagen_url}" alt="${producto.nombre}">
            </div>
            <div class="detalle-miniaturas">
                <button type="button" class="active"><img src="${producto.imagen_url}" alt="${producto.nombre}"></button>
                <button type="button"><img src="${producto.imagen_url}" alt="${producto.nombre}"></button>
            </div>
        </section>

        <section class="detalle-info">
            <div class="detalle-pills">
                <span>${producto.categoria || 'Producto'}</span>
                <strong>Ingreso</strong>
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

            <span class="detalle-label">Cantidad</span>
            <div class="detalle-cantidad">
                <button type="button" id="cantidad-menos">−</button>
                <strong id="cantidad-valor">1</strong>
                <button type="button" id="cantidad-mas">+</button>
            </div>

            <span class="detalle-alerta">Ultimas unidades</span>

            <button class="detalle-cta" type="button" id="detalle-consultar">Agregar al carrito</button>

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
        const cantidad = cantidadValor.innerText;
        const textoMensaje = `Hola. Quiero consultar por este producto:\n\nProducto: ${producto.nombre}\nTalle: ${talle}\nCantidad: ${cantidad}\nPrecio: $${Number(precio).toLocaleString('es-AR')}\n\nSigue disponible?`;
        window.open(`https://wa.me/${NUMERO_WSP}?text=${encodeURIComponent(textoMensaje)}`, '_blank');
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

function enviarPedido(nombre, precio, boton) {
    const tarjeta = boton.closest('.producto-card');
    const talleSeleccionado = tarjeta.querySelector('.talle-btn.selected').innerText;

    const textoMensaje = `Hola. Vi este producto en la web y me interesa comprarlo:\n\nProducto: ${nombre}\nTalle: ${talleSeleccionado}\nPrecio: $${Number(precio).toLocaleString('es-AR')}\n\nSigue disponible?`;

    const urlWsp = `https://wa.me/${NUMERO_WSP}?text=${encodeURIComponent(textoMensaje)}`;
    window.open(urlWsp, '_blank');
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
    configurarHeaderScroll();
    configurarFiltros();
    obtenerProductos();
});
