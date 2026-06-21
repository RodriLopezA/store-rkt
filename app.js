const SUPABASE_URL = "https://zpyhryenaaiewbjzjmfg.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpweWhyeWVuYWFpZXdianpqbWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMjgyNTIsImV4cCI6MjA5NjgwNDI1Mn0.hzHO4eRH7xH_O1zo6_lBs9kbsImBNLnDxL23okgK9_g";
const NUMERO_WSP = "5492215676073";

let productosData = [];
let productosVisibles = 12;
const filtros = {
    categoria: new Set(),
    talle: new Set(),
    color: new Set(),
    precio: null,
    descuento: false,
    busqueda: '',
    orden: 'relevantes'
};

function precioARS(valor) {
    return `$${Number(valor || 0).toLocaleString('es-AR')}`;
}

function textoSeguro(valor) {
    return String(valor || '').replace(/[<>"']/g, '');
}

function imagenesProducto(producto) {
    if (Array.isArray(producto.imagenes_urls) && producto.imagenes_urls.length) {
        return producto.imagenes_urls.filter(Boolean);
    }

    return producto.imagen_url ? [producto.imagen_url] : [];
}

function categoriasProducto(producto) {
    const extras = Array.isArray(producto.categorias_busqueda) ? producto.categorias_busqueda : [];
    return [producto.categoria, ...extras].filter(Boolean).map((item) => item.toLowerCase());
}

function tallesProducto(producto) {
    return String(producto.talles || 'U')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
}

function coloresProducto(producto) {
    return String(producto.colores || '')
        .split(',')
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean);
}

async function obtenerProductos() {
    const url = `${SUPABASE_URL}/rest/v1/productos?select=*&order=created_at.desc`;

    try {
        let respuesta = await fetch(url, {
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`
            }
        });

        if (!respuesta.ok && respuesta.status === 400) {
            respuesta = await fetch(`${SUPABASE_URL}/rest/v1/productos?select=*`, {
                headers: {
                    apikey: SUPABASE_KEY,
                    Authorization: `Bearer ${SUPABASE_KEY}`
                }
            });
        }

        if (!respuesta.ok) {
            throw new Error(await respuesta.text());
        }

        productosData = await respuesta.json();
        return productosData;
    } catch (error) {
        mostrarErrorCarga(error.message);
        return [];
    }
}

function ocultarLoading(id) {
    const nodo = document.getElementById(id);
    if (nodo) nodo.style.display = 'none';
}

function mostrarErrorCarga(mensaje) {
    ocultarLoading('loading');
    ocultarLoading('loading-destacados');

    ['grid-productos', 'grid-destacados'].forEach((id) => {
        const grid = document.getElementById(id);
        if (grid) {
            grid.innerHTML = `<p class="input-ayuda">No se pudieron cargar productos: ${textoSeguro(mensaje)}</p>`;
        }
    });
}

function cardProducto(producto) {
    const imagenes = imagenesProducto(producto);
    const imagen = imagenes[0] || 'assets/hero-demo.webp';
    const hover = imagenes[1] || imagen;
    const nombre = textoSeguro(producto.nombre || 'Producto');
    const categoria = textoSeguro(producto.categoria || 'Producto');
    const precio = precioARS(producto.precio);
    const tieneDescuento = Boolean(producto.descuento || producto.descuento_porcentaje > 0);
    const sinStock = producto.stock === false;
    const badge = sinStock ? 'AGOTADO' : (producto.nuevo_ingreso === false ? '' : 'NUEVO INGRESO');
    const detalleUrl = `producto.html?id=${encodeURIComponent(producto.id)}`;
    const variantes = [
        ...tallesProducto(producto).slice(0, 4),
        ...coloresProducto(producto).slice(0, 2)
    ];

    return `
        <article class="producto-card">
            <a href="${detalleUrl}" class="producto-link" aria-label="Ver ${nombre}">
                <div class="img-contenedor">
                    ${badge ? `<span class="badge-demo ${sinStock ? 'agotado' : ''}">${badge}</span>` : ''}
                    <img class="producto-img" src="${imagen}" alt="${nombre}" loading="lazy">
                    ${hover !== imagen ? `<img class="producto-img producto-img-hover" src="${hover}" alt="" loading="lazy">` : ''}
                </div>
                <div class="producto-info">
                    <span class="prod-cat">${categoria}</span>
                    <h3 class="prod-nom">${nombre}</h3>
                    <div class="prod-variantes">
                        ${variantes.map((item) => `<span>${textoSeguro(item)}</span>`).join('')}
                    </div>
                    <div class="prod-price-row">
                        <span class="prod-precio">${precio}</span>
                        ${tieneDescuento ? `<span class="discount-badge">-${Number(producto.descuento_porcentaje || 0)}%</span>` : ''}
                    </div>
                    ${producto.precio_anterior ? `<span class="prod-precio-anterior">${precioARS(producto.precio_anterior)}</span>` : ''}
                    <div class="prod-badges">
                        <span class="stock-badge">${sinStock ? 'Sin stock' : 'Stock disponible'}</span>
                    </div>
                </div>
            </a>
        </article>
    `;
}

function renderDestacados(productos) {
    const grid = document.getElementById('grid-destacados');
    if (!grid) return;

    ocultarLoading('loading-destacados');
    const destacados = productos.slice(0, 4);
    grid.innerHTML = destacados.length
        ? destacados.map(cardProducto).join('')
        : '<p class="input-ayuda">Todavia no hay productos cargados.</p>';
}

function productoPasaFiltros(producto) {
    const categorias = categoriasProducto(producto);
    const talles = tallesProducto(producto).map((item) => item.toLowerCase());
    const colores = coloresProducto(producto);
    const nombre = String(producto.nombre || '').toLowerCase();
    const categoria = String(producto.categoria || '').toLowerCase();

    if (filtros.busqueda && !nombre.includes(filtros.busqueda) && !categoria.includes(filtros.busqueda)) {
        return false;
    }

    if (filtros.categoria.size && ![...filtros.categoria].some((item) => categorias.includes(item))) {
        return false;
    }

    if (filtros.talle.size && ![...filtros.talle].some((item) => talles.includes(item.toLowerCase()))) {
        return false;
    }

    if (filtros.color.size && ![...filtros.color].some((item) => colores.includes(item.toLowerCase()))) {
        return false;
    }

    if (filtros.precio) {
        const [min, max] = filtros.precio.split('-').map(Number);
        const precio = Number(producto.precio || 0);
        if (precio < min || precio > max) return false;
    }

    if (filtros.descuento && !(producto.descuento || producto.descuento_porcentaje > 0)) {
        return false;
    }

    return true;
}

function ordenarProductos(lista) {
    const ordenada = [...lista];
    if (filtros.orden === 'menor-precio') ordenada.sort((a, b) => Number(a.precio || 0) - Number(b.precio || 0));
    if (filtros.orden === 'mayor-precio') ordenada.sort((a, b) => Number(b.precio || 0) - Number(a.precio || 0));
    if (filtros.orden === 'nombre') ordenada.sort((a, b) => String(a.nombre || '').localeCompare(String(b.nombre || '')));
    return ordenada;
}

function renderCatalogo() {
    const grid = document.getElementById('grid-productos');
    if (!grid) return;

    ocultarLoading('loading');
    const filtrados = ordenarProductos(productosData.filter(productoPasaFiltros));
    const visibles = filtrados.slice(0, productosVisibles);
    const contador = document.getElementById('contador-productos');
    const btnVerMas = document.getElementById('btn-ver-mas');

    if (contador) contador.innerText = filtrados.length;
    grid.innerHTML = visibles.length
        ? visibles.map(cardProducto).join('')
        : '<p class="input-ayuda">No encontramos productos con esos filtros.</p>';

    if (btnVerMas) {
        btnVerMas.style.display = filtrados.length > productosVisibles ? 'inline-flex' : 'none';
    }
}

function activarBoton(boton, activo) {
    boton.classList.toggle('active', activo);
    boton.setAttribute('aria-pressed', activo ? 'true' : 'false');
}

function configurarFiltros() {
    document.querySelectorAll('.filter-accordion').forEach((boton) => {
        boton.addEventListener('click', () => boton.closest('.filter-group')?.classList.toggle('open'));
    });

    document.querySelectorAll('[data-filter-categoria], [data-categoria]').forEach((boton) => {
        boton.addEventListener('click', () => {
            const categoria = boton.dataset.filterCategoria || boton.dataset.categoria;
            if (!categoria || categoria === 'todo') {
                filtros.categoria.clear();
                document.querySelectorAll('[data-filter-categoria], [data-categoria]').forEach((item) => activarBoton(item, false));
            } else {
                filtros.categoria.has(categoria) ? filtros.categoria.delete(categoria) : filtros.categoria.add(categoria);
                activarBoton(boton, filtros.categoria.has(categoria));
            }
            productosVisibles = 12;
            renderCatalogo();
        });
    });

    document.querySelectorAll('[data-filter-talle]').forEach((boton) => {
        boton.addEventListener('click', () => {
            const talle = boton.dataset.filterTalle;
            filtros.talle.has(talle) ? filtros.talle.delete(talle) : filtros.talle.add(talle);
            activarBoton(boton, filtros.talle.has(talle));
            renderCatalogo();
        });
    });

    document.querySelectorAll('[data-filter-color]').forEach((boton) => {
        boton.addEventListener('click', () => {
            const color = boton.dataset.filterColor;
            filtros.color.has(color) ? filtros.color.delete(color) : filtros.color.add(color);
            activarBoton(boton, filtros.color.has(color));
            renderCatalogo();
        });
    });

    document.querySelectorAll('[data-filter-precio]').forEach((boton) => {
        boton.addEventListener('click', () => {
            filtros.precio = filtros.precio === boton.dataset.filterPrecio ? null : boton.dataset.filterPrecio;
            document.querySelectorAll('[data-filter-precio]').forEach((item) => activarBoton(item, item.dataset.filterPrecio === filtros.precio));
            renderCatalogo();
        });
    });

    document.querySelectorAll('[data-filter-descuento]').forEach((boton) => {
        boton.addEventListener('click', () => {
            filtros.descuento = !filtros.descuento;
            activarBoton(boton, filtros.descuento);
            renderCatalogo();
        });
    });

    document.getElementById('orden-productos')?.addEventListener('change', (event) => {
        filtros.orden = event.target.value;
        renderCatalogo();
    });

    document.getElementById('limpiar-filtros')?.addEventListener('click', () => {
        filtros.categoria.clear();
        filtros.talle.clear();
        filtros.color.clear();
        filtros.precio = null;
        filtros.descuento = false;
        filtros.busqueda = '';
        productosVisibles = 12;
        document.querySelectorAll('.filter-panel button, .dropdown-menu button').forEach((boton) => activarBoton(boton, false));
        renderCatalogo();
    });

    document.getElementById('btn-ver-mas')?.addEventListener('click', () => {
        productosVisibles += 12;
        renderCatalogo();
    });

    document.getElementById('mobile-filter-toggle')?.addEventListener('click', () => document.body.classList.add('filters-open'));
    document.getElementById('mobile-filter-close')?.addEventListener('click', () => document.body.classList.remove('filters-open'));
    document.getElementById('filters-backdrop')?.addEventListener('click', () => document.body.classList.remove('filters-open'));
}

function aplicarParametrosUrl() {
    const params = new URLSearchParams(window.location.search);
    const categoria = params.get('categoria');
    const q = params.get('q');

    if (categoria && categoria !== 'todo') filtros.categoria.add(categoria);
    if (q) filtros.busqueda = q.toLowerCase().trim();

    document.querySelectorAll('[data-filter-categoria], [data-categoria]').forEach((boton) => {
        const categoriaBoton = boton.dataset.filterCategoria || boton.dataset.categoria;
        activarBoton(boton, filtros.categoria.has(categoriaBoton));
    });
}

async function renderDetalleProducto() {
    const contenedor = document.getElementById('producto-detalle');
    if (!contenedor) return;

    const id = new URLSearchParams(window.location.search).get('id');
    if (!id) {
        contenedor.innerHTML = '<p class="input-ayuda">Producto no encontrado.</p>';
        return;
    }

    const producto = productosData.find((item) => String(item.id) === String(id));
    if (!producto) {
        contenedor.innerHTML = '<p class="input-ayuda">Producto no encontrado.</p>';
        return;
    }

    const imagenes = imagenesProducto(producto);
    const talles = tallesProducto(producto);
    const colores = coloresProducto(producto);
    const nombre = textoSeguro(producto.nombre);
    const precio = precioARS(producto.precio);
    const mensaje = encodeURIComponent(`Hola! Quiero consultar por ${producto.nombre} - ${precio}`);

    contenedor.innerHTML = `
        <section class="detalle-media">
            <img src="${imagenes[0] || 'assets/hero-demo.webp'}" alt="${nombre}">
        </section>
        <section class="detalle-info">
            <span class="prod-cat">${textoSeguro(producto.categoria)}</span>
            <h1>${nombre}</h1>
            <strong class="detalle-precio">${precio}</strong>
            <p>${textoSeguro(producto.descripcion || 'Consultanos por talles, stock y detalles de la prenda.')}</p>
            <div class="prod-variantes">${talles.map((item) => `<span>${textoSeguro(item)}</span>`).join('')}</div>
            <div class="prod-variantes">${colores.map((item) => `<span>${textoSeguro(item)}</span>`).join('')}</div>
            <a class="btn-wsp" href="https://wa.me/${NUMERO_WSP}?text=${mensaje}" target="_blank" rel="noopener">Consultar por WhatsApp</a>
        </section>
    `;
}

document.addEventListener('DOMContentLoaded', async () => {
    configurarFiltros();
    aplicarParametrosUrl();
    const productos = await obtenerProductos();
    renderDestacados(productos);
    renderCatalogo();
    renderDetalleProducto();
});
