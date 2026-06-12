const SUPABASE_URL = "https://zpyhryenaaiewbjzjmfg.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpweWhyeWVuYWFpZXdianpqbWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMjgyNTIsImV4cCI6MjA5NjgwNDI1Mn0.hzHO4eRH7xH_O1zo6_lBs9kbsImBNLnDxL23okgK9_g";
const BUCKET_FOTOS = "fotos-ropa";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const formLogin = document.getElementById('form-login');
const loginAdmin = document.getElementById('login-admin');
const panelAdmin = document.getElementById('panel-admin');
const form = document.getElementById('form-panel');
const productosAdmin = document.getElementById('admin-productos');
const inputFotos = document.getElementById('foto');
const previewFotos = document.getElementById('preview-fotos');
const modalBorrar = document.getElementById('modal-borrar');
const btnConfirmarBorrar = document.getElementById('btn-confirmar-borrar');
const btnCancelarBorrar = document.getElementById('btn-cancelar-borrar');

const PESO_MAXIMO_IMAGEN = 100 * 1024;
const ANCHO_MAXIMO_IMAGEN = 800;
const CALIDAD_INICIAL_IMAGEN = 0.7;
const MAX_FOTOS_PRODUCTO = 3;
let fotosSeleccionadas = [];
let productosAdminCache = [];
let productoPendienteBorrar = null;
let productoEditando = null;

function mostrarEstado(mensaje) {
    const btn = document.getElementById('btn-publicar');
    const label = btn?.querySelector('.btn-label');
    if (label) label.innerText = mensaje;
}

function setPublicando(publicando, mensaje = "Subiendo...") {
    const btn = document.getElementById('btn-publicar');
    if (!btn) return;

    btn.disabled = publicando;
    btn.classList.toggle('is-loading', publicando);
    mostrarEstado(mensaje);
}

function mostrarToast(mensaje, tipo = 'exito') {
    let toast = document.getElementById('admin-toast');

    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'admin-toast';
        toast.className = 'admin-toast';
        document.body.appendChild(toast);
    }

    toast.className = `admin-toast ${tipo} visible`;
    toast.innerText = mensaje;

    clearTimeout(mostrarToast.timeout);
    mostrarToast.timeout = setTimeout(() => {
        toast.classList.remove('visible');
    }, 3000);
}

function mostrarPanelAutenticado(autenticado) {
    loginAdmin.hidden = autenticado;
    panelAdmin.hidden = !autenticado;
}

async function verificarSesion() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    mostrarPanelAutenticado(Boolean(session));

    if (session) {
        await cargarProductosAdmin();
    }
}

function blobDesdeCanvas(canvas, calidad, tipo = 'image/webp') {
    return new Promise((resolve) => {
        canvas.toBlob(resolve, tipo, calidad);
    });
}

async function comprimirImagen(archivo, pesoMaximo = PESO_MAXIMO_IMAGEN) {
    const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(archivo);
    });

    const imagen = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = dataUrl;
    });

    let maxDimension = ANCHO_MAXIMO_IMAGEN;
    let tipoSalida = 'image/webp';

    while (maxDimension >= 320) {
        const escala = Math.min(1, maxDimension / Math.max(imagen.width, imagen.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(imagen.width * escala);
        canvas.height = Math.round(imagen.height * escala);

        const ctx = canvas.getContext('2d');
        ctx.drawImage(imagen, 0, 0, canvas.width, canvas.height);

        let calidad = CALIDAD_INICIAL_IMAGEN;

        while (calidad >= 0.4) {
            let blobComprimido = await blobDesdeCanvas(canvas, calidad, tipoSalida);

            if (!blobComprimido) {
                tipoSalida = 'image/jpeg';
                blobComprimido = await blobDesdeCanvas(canvas, calidad, tipoSalida);
            }

            if (blobComprimido && blobComprimido.size <= pesoMaximo) {
                return {
                    blob: blobComprimido,
                    extension: tipoSalida === 'image/webp' ? 'webp' : 'jpg',
                    contentType: tipoSalida
                };
            }

            calidad -= 0.1;
        }

        maxDimension -= 200;
    }

    return null;
}

function obtenerPathStorage(imagenUrl) {
    if (!imagenUrl) return null;

    const marcador = `/storage/v1/object/public/${BUCKET_FOTOS}/`;
    const indice = imagenUrl.indexOf(marcador);

    if (indice === -1) return null;

    return decodeURIComponent(imagenUrl.slice(indice + marcador.length));
}

function obtenerImagenesProducto(producto) {
    if (Array.isArray(producto.imagenes_urls) && producto.imagenes_urls.length) {
        return producto.imagenes_urls.filter(Boolean);
    }

    if (typeof producto.imagenes_urls === 'string' && producto.imagenes_urls.trim()) {
        try {
            const imagenesParseadas = JSON.parse(producto.imagenes_urls);
            if (Array.isArray(imagenesParseadas) && imagenesParseadas.length) {
                return imagenesParseadas.filter(Boolean);
            }
        } catch (error) {
            return [producto.imagenes_urls, producto.imagen_url].filter(Boolean);
        }
    }

    return [producto.imagen_url].filter(Boolean);
}

function escaparAtributo(valor) {
    return String(valor || '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function normalizarCategoria(categoria) {
    return String(categoria || 'sin categoria').trim().toLowerCase();
}

const CATEGORIAS_RELACIONADAS = {
    conjuntos: ['remeras', 'pantalones', 'joggings'],
    remeras: ['partes-arriba'],
    chombas: ['remeras', 'partes-arriba'],
    buzos: ['hoodies', 'partes-arriba'],
    hoodies: ['buzos', 'partes-arriba'],
    camperas: ['rompevientos', 'partes-arriba'],
    rompevientos: ['camperas', 'partes-arriba'],
    chalecos: ['camperas', 'partes-arriba'],
    pantalones: ['joggings', 'partes-abajo'],
    joggings: ['pantalones', 'partes-abajo'],
    jeans: ['pantalones', 'partes-abajo'],
    bermudas: ['cortos', 'pantalones', 'partes-abajo'],
    cortos: ['bermudas', 'pantalones', 'partes-abajo'],
    rinonera: ['accesorios'],
    bandoleras: ['rinonera', 'accesorios'],
    cadenas: ['accesorios'],
    medias: ['accesorios'],
    guantes: ['accesorios'],
    viseras: ['gorras-viceras', 'caps'],
    gorros: ['gorras-viceras', 'caps'],
    caps: ['gorras-viceras', 'viseras'],
    pilusos: ['gorras-viceras', 'gorros'],
    importados: []
};

function obtenerCategoriasAutomaticas(categoria) {
    const principal = normalizarCategoria(categoria);
    return [...new Set([principal, ...(CATEGORIAS_RELACIONADAS[principal] || [])])];
}

function sincronizarCategoriaSeleccionada(categoria = 'conjuntos') {
    const inputCategoria = document.getElementById('categoria');
    const previewCategoria = document.getElementById('categoria-preview');
    const valor = normalizarCategoria(categoria || 'conjuntos');
    const categoriasAuto = obtenerCategoriasAutomaticas(valor).filter((cat) => cat !== valor);

    if (inputCategoria) inputCategoria.value = valor;

    document.querySelectorAll('[data-categoria-admin]').forEach((boton) => {
        boton.classList.toggle('selected', boton.dataset.categoriaAdmin === valor);
    });

    if (previewCategoria) {
        previewCategoria.innerText = categoriasAuto.length
            ? `Se va a mostrar tambien en: ${categoriasAuto.join(', ')}`
            : 'Se va a mostrar solo en esta categoria.';
    }
}

function configurarCategoriaSelector() {
    const selector = document.getElementById('categoria-selector');
    if (!selector) return;

    selector.addEventListener('click', (event) => {
        const boton = event.target.closest('[data-categoria-admin]');
        if (!boton) return;
        sincronizarCategoriaSeleccionada(boton.dataset.categoriaAdmin);
    });

    sincronizarCategoriaSeleccionada(document.getElementById('categoria')?.value || 'conjuntos');
}

function renderizarMetricas(productos) {
    const activas = productos.filter((prod) => prod.stock !== false);
    const categorias = activas.reduce((acc, prod) => {
        const categoria = normalizarCategoria(prod.categoria);
        acc[categoria] = (acc[categoria] || 0) + 1;
        return acc;
    }, {});

    const categoriaFuerte = Object.entries(categorias)
        .sort((a, b) => b[1] - a[1])[0];
    const remerasRecientes = productos
        .filter((prod) => normalizarCategoria(prod.categoria) === 'remeras')
        .slice(0, 5);

    document.getElementById('metrica-activas').innerText = activas.length;
    document.getElementById('metrica-categoria').innerText = categoriaFuerte
        ? `${categoriaFuerte[0]} (${categoriaFuerte[1]})`
        : '-';
    document.getElementById('metrica-remeras').innerText = remerasRecientes.length;
    document.getElementById('metrica-remeras-lista').innerText = remerasRecientes.length
        ? remerasRecientes.map((prod) => prod.nombre).join(', ')
        : 'Sin remeras recientes';
}

function sincronizarInputFotos() {
    if (typeof DataTransfer === 'undefined') return;

    const dataTransfer = new DataTransfer();
    fotosSeleccionadas.forEach((foto) => dataTransfer.items.add(foto));
    inputFotos.files = dataTransfer.files;
}

function renderizarPreviewFotos() {
    if (!previewFotos) return;

    if (!fotosSeleccionadas.length) {
        previewFotos.innerHTML = '';
        return;
    }

    previewFotos.innerHTML = fotosSeleccionadas.map((foto, index) => `
        <article class="preview-foto">
            <img src="${URL.createObjectURL(foto)}" alt="Foto seleccionada ${index + 1}">
            <button type="button" data-index="${index}" aria-label="Quitar foto">×</button>
            <span>${index + 1}</span>
        </article>
    `).join('');
}

function limpiarPreviewFotos() {
    fotosSeleccionadas = [];
    if (inputFotos) inputFotos.value = '';
    renderizarPreviewFotos();
}

function configurarPreviewFotos() {
    if (!inputFotos || !previewFotos) return;

    inputFotos.addEventListener('change', () => {
        const nuevasFotos = Array.from(inputFotos.files || []);
        fotosSeleccionadas = [...fotosSeleccionadas, ...nuevasFotos].slice(0, MAX_FOTOS_PRODUCTO);
        sincronizarInputFotos();
        renderizarPreviewFotos();

        if (nuevasFotos.length && fotosSeleccionadas.length === MAX_FOTOS_PRODUCTO) {
            mostrarEstado("Maximo 3 fotos por producto");
            setTimeout(() => mostrarEstado("PUBLICAR EN LA WEB"), 1200);
        }
    });

    previewFotos.addEventListener('click', (event) => {
        const boton = event.target.closest('button');
        if (!boton) return;

        fotosSeleccionadas.splice(Number(boton.dataset.index), 1);
        sincronizarInputFotos();
        renderizarPreviewFotos();
    });
}

function actualizarPrecioPreview() {
    const inputPrecio = document.getElementById('precio');
    const previewPrecio = document.getElementById('precio-preview');
    if (!inputPrecio || !previewPrecio) return;

    const precio = Number(inputPrecio.value || 0);
    const descuento = obtenerDescuentoFormulario();
    const precioAnterior = descuento > 0
        ? Math.round(precio / (1 - descuento / 100))
        : 0;

    previewPrecio.innerText = precio > 0 && descuento > 0
        ? `$ ${precio.toLocaleString('es-AR')} con ${descuento}% OFF antes $ ${precioAnterior.toLocaleString('es-AR')}`
        : precio > 0
        ? `$ ${precio.toLocaleString('es-AR')}`
        : '$ 0';
}

function obtenerDescuentoFormulario() {
    const input = document.getElementById('descuento');
    const valorCrudo = String(input?.value || '').trim();
    const valor = valorCrudo === '' ? 0 : Number(valorCrudo);

    if (!Number.isFinite(valor) || valor <= 0) return 0;
    return Math.min(90, Math.round(valor));
}

function configurarPrecioPreview() {
    const inputPrecio = document.getElementById('precio');
    const inputDescuento = document.getElementById('descuento');
    if (!inputPrecio) return;

    inputPrecio.addEventListener('input', actualizarPrecioPreview);
    inputDescuento?.addEventListener('input', actualizarPrecioPreview);
    actualizarPrecioPreview();
}

function sincronizarTallesSeleccionados() {
    const inputTalles = document.getElementById('talles');
    const previewTalles = document.getElementById('talles-preview');
    const talles = Array.from(document.querySelectorAll('#talles-selector button.selected'))
        .map((boton) => boton.dataset.talle);

    inputTalles.value = talles.join(', ');
    previewTalles.innerText = talles.length
        ? `Seleccionados: ${talles.join(', ')}`
        : 'Selecciona al menos un talle';
}

function configurarTallesSelector() {
    const selector = document.getElementById('talles-selector');
    if (!selector) return;

    selector.addEventListener('click', (event) => {
        const boton = event.target.closest('button');
        if (!boton) return;

        boton.classList.toggle('selected');
        sincronizarTallesSeleccionados();
    });

    sincronizarTallesSeleccionados();
}

function resetearControlesGuiados() {
    document.querySelectorAll('#talles-selector button').forEach((boton) => {
        boton.classList.toggle('selected', ['XS', 'S', 'M', 'L', 'XL'].includes(boton.dataset.talle));
    });
    sincronizarCategoriaSeleccionada('conjuntos');
    document.getElementById('descuento').value = '';
    document.getElementById('nuevo-ingreso').checked = true;
    sincronizarTallesSeleccionados();
    actualizarPrecioPreview();
}

function abrirModalBorrar(producto) {
    productoPendienteBorrar = producto;
    modalBorrar.hidden = false;
}

function cerrarModalBorrar() {
    productoPendienteBorrar = null;
    modalBorrar.hidden = true;
}

async function borrarProductoConfirmado() {
    if (!productoPendienteBorrar) return;

    btnConfirmarBorrar.disabled = true;
    btnConfirmarBorrar.innerText = "Eliminando...";

    const { id, imagenes } = productoPendienteBorrar;
    const pathsStorage = imagenes
        .map((imagen) => obtenerPathStorage(imagen))
        .filter(Boolean);

    const { error: dbError } = await supabaseClient
        .from('productos')
        .delete()
        .eq('id', id);

    if (dbError) {
        alert("No se pudo borrar el producto: " + dbError.message);
        btnConfirmarBorrar.disabled = false;
        btnConfirmarBorrar.innerText = "Si, eliminar";
        return;
    }

    if (pathsStorage.length) {
        const { error: storageError } = await supabaseClient.storage
            .from(BUCKET_FOTOS)
            .remove(pathsStorage);

        if (storageError) {
            console.warn("Producto borrado, pero no se pudieron borrar todas las fotos:", storageError);
        }
    }

    btnConfirmarBorrar.disabled = false;
    btnConfirmarBorrar.innerText = "Si, eliminar";
    cerrarModalBorrar();
    await cargarProductosAdmin();
}

function cargarProductoParaEditar(producto) {
    productoEditando = producto;
    document.getElementById('nombre').value = producto.nombre || '';
    document.getElementById('precio').value = producto.precio || '';
    sincronizarCategoriaSeleccionada(producto.categoria || 'conjuntos');
    document.getElementById('colores').value = producto.colores || '';
    document.getElementById('descuento').value = producto.descuento_porcentaje || '';
    document.getElementById('nuevo-ingreso').checked = producto.nuevo_ingreso !== false;

    const talles = String(producto.talles || '')
        .split(',')
        .map((talle) => talle.trim())
        .filter(Boolean);

    document.querySelectorAll('#talles-selector button').forEach((boton) => {
        boton.classList.toggle('selected', talles.includes(boton.dataset.talle));
    });
    sincronizarTallesSeleccionados();
    actualizarPrecioPreview();
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    mostrarEstado("GUARDAR CAMBIOS");
}

async function cargarProductosAdmin() {
    productosAdmin.innerHTML = Array.from({ length: 4 }, () => `
        <article class="admin-producto admin-producto-skeleton" aria-hidden="true">
            <span class="admin-skeleton-img skeleton-shine"></span>
            <div>
                <span class="skeleton-line skeleton-line-wide skeleton-shine"></span>
                <span class="skeleton-line skeleton-line-short skeleton-shine"></span>
                <span class="skeleton-line skeleton-line-mini skeleton-shine"></span>
            </div>
            <span class="admin-skeleton-btn skeleton-shine"></span>
            <span class="admin-skeleton-btn skeleton-shine"></span>
        </article>
    `).join('');

    const { data, error } = await supabaseClient
        .from('productos')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error(error);
        productosAdmin.innerHTML = '<p class="mensaje-alerta">No se pudieron cargar los productos.</p>';
        return;
    }

    renderizarMetricas(data || []);

    if (!data.length) {
        productosAdmin.innerHTML = '<p class="mensaje-alerta">Todavia no hay productos cargados.</p>';
        return;
    }

    productosAdminCache = data || [];
    productosAdmin.innerHTML = data.map((prod) => {
        const imagenes = obtenerImagenesProducto(prod);
        const imagenPrincipal = imagenes[0] || prod.imagen_url || '';
        const detalleFotos = `${imagenes.length} foto${imagenes.length === 1 ? '' : 's'}`;
        const detalleColores = prod.colores ? ` - ${prod.colores}` : '';
        const detalleDescuento = Number(prod.descuento_porcentaje || 0) > 0 ? `-${Number(prod.descuento_porcentaje)}% OFF` : '';
        const detalleIngreso = prod.nuevo_ingreso === false ? '' : 'Nuevo ingreso';
        const detallePromo = [detalleDescuento, detalleIngreso].filter(Boolean).join(' - ');
        const disponible = prod.stock !== false;

        return `
        <article class="admin-producto ${prod.stock === false ? 'sin-stock' : ''}">
            <img src="${imagenPrincipal}" alt="${prod.nombre}">
            <div>
                <strong>${prod.nombre}</strong>
                <span>${prod.categoria || 'sin categoria'} - $${Number(prod.precio || 0).toLocaleString('es-AR')}</span>
                <span>${detalleFotos}${detalleColores}</span>
                ${detallePromo ? `<span>${detallePromo}</span>` : ''}
                <small>${prod.stock === false ? 'SIN STOCK' : 'EN STOCK'}</small>
            </div>
            <button class="stock-switch ${disponible ? 'active' : ''}" type="button" data-accion="stock" data-id="${prod.id}" data-stock="${disponible ? 'false' : 'true'}">
                <span></span>
                Mostrar en la web
            </button>
            <button type="button" data-accion="editar" data-id="${prod.id}">
                Editar
            </button>
            <button type="button" data-accion="borrar" data-id="${prod.id}" data-imagenes="${escaparAtributo(JSON.stringify(imagenes))}">
                Borrar
            </button>
        </article>
    `;
    }).join('');
}

formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();

    const btn = document.getElementById('btn-login');
    btn.innerText = "INGRESANDO...";
    btn.disabled = true;

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

    if (error) {
        alert("No se pudo iniciar sesion: " + error.message);
        btn.innerText = "INGRESAR";
        btn.disabled = false;
        return;
    }

    formLogin.reset();
    btn.innerText = "INGRESAR";
    btn.disabled = false;
    mostrarPanelAutenticado(true);
    await cargarProductosAdmin();
});

document.getElementById('btn-logout').addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    mostrarPanelAutenticado(false);
});

document.getElementById('btn-recargar-productos').addEventListener('click', cargarProductosAdmin);

productosAdmin.addEventListener('click', async (e) => {
    const boton = e.target.closest('button');
    if (!boton) return;

    const id = boton.dataset.id;

    if (boton.dataset.accion === 'stock') {
        boton.disabled = true;
        const nuevoStock = boton.dataset.stock === 'true';
        const { error } = await supabaseClient
            .from('productos')
            .update({ stock: nuevoStock })
            .eq('id', id);

        if (error) {
            alert("No se pudo actualizar stock: " + error.message);
            boton.disabled = false;
            return;
        }

        await cargarProductosAdmin();
    }

    if (boton.dataset.accion === 'editar') {
        const producto = productosAdminCache.find((prod) => String(prod.id) === String(id));
        if (producto) cargarProductoParaEditar(producto);
    }

    if (boton.dataset.accion === 'borrar') {
        const imagenes = JSON.parse(boton.dataset.imagenes || '[]');
        abrirModalBorrar({ id, imagenes });
    }
});

btnConfirmarBorrar.addEventListener('click', borrarProductoConfirmado);
btnCancelarBorrar.addEventListener('click', cerrarModalBorrar);
modalBorrar.addEventListener('click', (event) => {
    if (event.target === modalBorrar) cerrarModalBorrar();
});

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const btn = document.getElementById('btn-publicar');
    setPublicando(true, "Subiendo...");

    const nombre = document.getElementById('nombre').value;
    const precio = Number(document.getElementById('precio').value);
    const descuentoPorcentaje = obtenerDescuentoFormulario();
    const precioAnterior = descuentoPorcentaje > 0
        ? Math.round(precio / (1 - descuentoPorcentaje / 100))
        : 0;
    const nuevoIngreso = document.getElementById('nuevo-ingreso').checked;
    const categoria = document.getElementById('categoria').value;
    const categoriasBusqueda = obtenerCategoriasAutomaticas(categoria);
    const talles = document.getElementById('talles').value;
    const colores = document.getElementById('colores').value;
    const fotosArchivos = fotosSeleccionadas.length
        ? fotosSeleccionadas
        : Array.from(inputFotos.files);

    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) {
            throw new Error("Tenes que iniciar sesion para publicar.");
        }

        if (!productoEditando && !fotosArchivos.length) {
            throw new Error("Selecciona al menos una foto antes de publicar.");
        }

        if (fotosArchivos.length > MAX_FOTOS_PRODUCTO) {
            throw new Error(`Selecciona como maximo ${MAX_FOTOS_PRODUCTO} fotos por producto.`);
        }

        if (!talles.trim()) {
            throw new Error("Selecciona al menos un talle disponible.");
        }

        let urlsFotos = productoEditando && !fotosArchivos.length
            ? obtenerImagenesProducto(productoEditando)
            : [];

        for (const [index, fotoArchivo] of fotosArchivos.entries()) {
            mostrarEstado(`Preparando fotos ${index + 1}/${fotosArchivos.length}...`);
            const fotoComprimida = await comprimirImagen(fotoArchivo);

            if (!fotoComprimida) {
                throw new Error(`No se pudo preparar la foto ${index + 1}. Proba sacarla de nuevo con buena luz.`);
            }

            const nombreBase = fotoArchivo.name
                .replace(/\.[^/.]+$/, '')
                .replace(/\s+/g, '-')
                .replace(/[^a-zA-Z0-9-_]/g, '');
            const nombreImagen = `${Date.now()}-${index + 1}-${nombreBase || 'producto'}.${fotoComprimida.extension}`;

            mostrarEstado(`Subiendo fotos ${index + 1}/${fotosArchivos.length}...`);
            const { error: uploadError } = await supabaseClient.storage
                .from(BUCKET_FOTOS)
                .upload(nombreImagen, fotoComprimida.blob, {
                    contentType: fotoComprimida.contentType,
                    upsert: false
                });

            if (uploadError) throw uploadError;

            const { data: urlData } = supabaseClient.storage
                .from(BUCKET_FOTOS)
                .getPublicUrl(nombreImagen);

            urlsFotos.push(urlData.publicUrl);
        }

        mostrarEstado("Guardando producto...");
        const datosProducto = {
            nombre,
            precio,
            categoria,
            talles,
            colores,
            descuento_porcentaje: descuentoPorcentaje,
            descuento: descuentoPorcentaje > 0,
            precio_anterior: precioAnterior,
            nuevo_ingreso: nuevoIngreso,
            categorias_busqueda: categoriasBusqueda,
            imagen_url: urlsFotos[0],
            imagenes_urls: urlsFotos,
            stock: productoEditando ? productoEditando.stock !== false : true
        };

        const { error: dbError } = productoEditando
            ? await supabaseClient
                .from('productos')
                .update(datosProducto)
                .eq('id', productoEditando.id)
            : await supabaseClient
                .from('productos')
                .insert([datosProducto]);

        if (dbError) throw dbError;

        if (productoEditando && fotosArchivos.length) {
            const pathsAnteriores = obtenerImagenesProducto(productoEditando)
                .map((imagen) => obtenerPathStorage(imagen))
                .filter(Boolean);

            if (pathsAnteriores.length) {
                const { error: storageError } = await supabaseClient.storage
                    .from(BUCKET_FOTOS)
                    .remove(pathsAnteriores);

                if (storageError) {
                    console.warn("Producto actualizado, pero no se pudieron borrar fotos anteriores:", storageError);
                }
            }
        }

        const mensajeExito = productoEditando
            ? "🚀 ¡Producto actualizado con éxito!"
            : "🚀 ¡Producto publicado con éxito!";
        mostrarToast(mensajeExito);
        productoEditando = null;
        form.reset();
        resetearControlesGuiados();
        limpiarPreviewFotos();
        await cargarProductosAdmin();

    } catch (err) {
        console.error(err);
        const mensaje = String(err.message || '');
        const faltaColumnaDescuento = mensaje.includes('descuento')
            || mensaje.includes('precio_anterior')
            || mensaje.includes('nuevo_ingreso');

        mostrarToast(
            faltaColumnaDescuento
                ? "Faltan columnas de descuento en Supabase. Pega el SQL supabase-descuentos-badges.sql."
                : "Ocurrio un error: " + mensaje,
            "error"
        );
    } finally {
        setPublicando(false, productoEditando ? "GUARDAR CAMBIOS" : "PUBLICAR EN LA WEB");
    }
});

configurarPreviewFotos();
configurarPrecioPreview();
configurarCategoriaSelector();
configurarTallesSelector();
verificarSesion();
