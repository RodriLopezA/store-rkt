const SUPABASE_URL = "https://zpyhryenaaiewbjzjmfg.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpweWhyeWVuYWFpZXdianpqbWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMjgyNTIsImV4cCI6MjA5NjgwNDI1Mn0.hzHO4eRH7xH_O1zo6_lBs9kbsImBNLnDxL23okgK9_g";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const NUMERO_WSP = "549221XXXXXXX";

let productosData = [];
let categoriaActiva = "todo";
let ordenActivo = "relevantes";

async function obtenerProductos() {
    const loading = document.getElementById('loading');

    const { data, error } = await supabaseClient
        .from('productos')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error cargando productos:", error);
        loading.innerText = "No se pudieron cargar los productos.";
        return;
    }

    productosData = data || [];
    loading.style.display = 'none';
    renderizarDestacados(productosData.slice(0, 4));
    aplicarFiltros();
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
        grid.appendChild(card);
    });
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

    botonesCategoria.forEach((boton) => {
        boton.addEventListener('click', () => {
            categoriaActiva = boton.dataset.categoria;

            botonesCategoria.forEach((item) => item.classList.remove('active'));
            document.querySelectorAll(`[data-categoria="${categoriaActiva}"]`).forEach((item) => {
                item.classList.add('active');
            });

            aplicarFiltros();

            if (boton.closest('.dropdown-menu')) {
                document.getElementById('catalogo').scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    selectOrden.addEventListener('change', () => {
        ordenActivo = selectOrden.value;
        aplicarFiltros();
    });
}

function configurarHeaderScroll() {
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
