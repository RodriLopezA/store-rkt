const SUPABASE_URL = "https://kgzffjbwhlrlgxforfgv.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnemZmamJ3aGxybGd4Zm9yZmd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5ODE3MDUsImV4cCI6MjA5NjU1NzcwNX0.FkaQALy1TU2_S8ae0gxAcmsikNLO72qm0_k3knNw2jo";
const formLogin = document.getElementById('form-login');
const btnLogin = document.getElementById('btn-login');
const loginAdmin = document.getElementById('login-admin');
const panelAdmin = document.getElementById('panel-admin');
const btnLogout = document.getElementById('btn-logout');

if (!window.supabase) {
    btnLogin?.addEventListener('click', (e) => {
        e.preventDefault();
        alert("No se pudo cargar Supabase. Revisa la conexion o recarga la pagina.");
    });

    formLogin?.addEventListener('submit', (e) => {
        e.preventDefault();
        alert("No se pudo cargar Supabase. Revisa la conexion o recarga la pagina.");
    });

    throw new Error("Supabase JS no esta cargado.");
}

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

function mostrarPanelAutenticado(autenticado) {
    if (loginAdmin) loginAdmin.hidden = autenticado;
    if (panelAdmin) panelAdmin.hidden = !autenticado;
}

async function verificarSesion() {
    const { data: { session } } = await supabase.auth.getSession();
    mostrarPanelAutenticado(Boolean(session));
}

supabase.auth.onAuthStateChange((_event, session) => {
    mostrarPanelAutenticado(Boolean(session));
});

async function ingresarAdmin(e) {
    e.preventDefault();

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
        alert("Completa email y contrasena para ingresar.");
        return;
    }

    btnLogin.innerText = "INGRESANDO...";
    btnLogin.disabled = true;

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        alert("No se pudo iniciar sesion: " + error.message);
        btnLogin.innerText = "INGRESAR";
        btnLogin.disabled = false;
        return;
    }

    formLogin.reset();
    btnLogin.innerText = "INGRESAR";
    btnLogin.disabled = false;
    mostrarPanelAutenticado(true);
}

if (!window.__adminLoginInline) {
    formLogin?.addEventListener('submit', ingresarAdmin);
    btnLogin?.addEventListener('click', ingresarAdmin);
}

btnLogout?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    mostrarPanelAutenticado(false);
});

verificarSesion();
const form = document.getElementById('form-panel');
const categoriaInput = document.getElementById('categoria');
const categoriaSelector = document.getElementById('categoria-selector');
const categoriaPreview = document.getElementById('categoria-preview');
const tallesInput = document.getElementById('talles');
const tallesSelector = document.getElementById('talles-selector');
const tallesPreview = document.getElementById('talles-preview');
const coloresInput = document.getElementById('colores');
const coloresSelector = document.getElementById('colores-selector');
const coloresPreview = document.getElementById('colores-preview');

const categoriasRelacionadas = {
    conjuntos: ['remeras', 'pantalones', 'joggings'],
    hoodies: ['buzos'],
    cortos: ['shorts', 'bermudas'],
    rinonera: ['rinoneras'],
    viseras: ['gorras', 'caps']
};

function obtenerCategoriasBusqueda(categoria) {
    return [categoria, ...(categoriasRelacionadas[categoria] || [])];
}

function actualizarCategoriaPreview(categoria) {
    const extras = categoriasRelacionadas[categoria] || [];
    if (!categoriaPreview) return;

    categoriaPreview.innerText = extras.length
        ? `Se va a mostrar tambien en: ${extras.join(', ')}`
        : 'Categoria principal seleccionada';
}

function actualizarTalles() {
    const talles = [...tallesSelector.querySelectorAll('button.selected')]
        .map((boton) => boton.dataset.talle);

    tallesInput.value = talles.join(', ');
    tallesPreview.innerText = talles.length
        ? `Seleccionados: ${talles.join(', ')}`
        : 'Selecciona al menos un talle';
}

function actualizarColores() {
    const colores = [...coloresSelector.querySelectorAll('button.selected')]
        .map((boton) => boton.dataset.colorAdmin);

    coloresInput.value = colores.join(', ');
    coloresPreview.innerText = colores.length
        ? `Seleccionados: ${colores.join(', ')}`
        : 'Sin colores seleccionados';
}

function seleccionarCategoria(e) {
    const boton = e.target.closest('[data-categoria-admin]');
    if (!boton) return;
    e.preventDefault();

    categoriaSelector.querySelectorAll('[data-categoria-admin]')
        .forEach((item) => item.classList.remove('selected'));

    boton.classList.add('selected');
    categoriaInput.value = boton.dataset.categoriaAdmin;
    actualizarCategoriaPreview(boton.dataset.categoriaAdmin);
}

function seleccionarTalle(e) {
    const boton = e.target.closest('[data-talle]');
    if (!boton) return;
    e.preventDefault();

    boton.classList.toggle('selected');
    actualizarTalles();
}

function seleccionarColor(e) {
    const boton = e.target.closest('[data-color-admin]');
    if (!boton) return;
    e.preventDefault();

    boton.classList.toggle('selected');
    actualizarColores();
}

categoriaSelector?.addEventListener('click', seleccionarCategoria);
tallesSelector?.addEventListener('click', seleccionarTalle);
coloresSelector?.addEventListener('click', seleccionarColor);

actualizarCategoriaPreview(categoriaInput?.value);
actualizarTalles();
actualizarColores();

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const btn = document.getElementById('btn-publicar');
    const btnLabel = btn.querySelector('.btn-label');
    const textoOriginal = btnLabel ? btnLabel.innerText : btn.innerText;
    btn.classList.add('is-loading');
    if (btnLabel) {
        btnLabel.innerText = "SUBIENDO...";
    } else {
        btn.innerText = "SUBIENDO...";
    }
    btn.disabled = true;

    const nombre = document.getElementById('nombre').value;
    const precio = Number(document.getElementById('precio').value);
    const categoria = document.getElementById('categoria').value;
    const talles = document.getElementById('talles').value;
    const descripcion = document.getElementById('descripcion')?.value || '';
    const descuento = Number(document.getElementById('descuento')?.value || 0);
    const nuevoIngreso = document.getElementById('nuevo-ingreso')?.checked ?? true;
    const colores = document.getElementById('colores')?.value || '';
    const fotosArchivos = [...document.getElementById('foto').files].slice(0, 5);

    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            mostrarPanelAutenticado(false);
            throw new Error("La sesion expiro. Inicia sesion otra vez antes de publicar.");
        }

        if (!fotosArchivos.length) {
            throw new Error("Selecciona al menos una foto antes de publicar.");
        }

        if (!talles) {
            throw new Error("Selecciona al menos un talle.");
        }

        const imagenesUrls = [];

        for (const fotoArchivo of fotosArchivos) {
            const nombreImagen = `${Date.now()}-${crypto.randomUUID()}-${fotoArchivo.name.replace(/\s+/g, '')}`;

            const { error: uploadError } = await supabase.storage
                .from('fotos-ropa')
                .upload(nombreImagen, fotoArchivo);

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage
                .from('fotos-ropa')
                .getPublicUrl(nombreImagen);

            imagenesUrls.push(urlData.publicUrl);
        }

        const urlFinalImagen = imagenesUrls[0];
        const descuentoActivo = descuento > 0;
        const precioAnterior = descuentoActivo
            ? Math.round(precio / (1 - descuento / 100))
            : 0;

        const productoCompleto = {
            nombre: nombre,
            precio: precio,
            categoria: categoria,
            talles: talles,
            imagen_url: urlFinalImagen,
            imagenes_urls: imagenesUrls,
            descripcion: descripcion,
            descuento: descuentoActivo,
            descuento_porcentaje: descuento,
            precio_anterior: precioAnterior,
            nuevo_ingreso: nuevoIngreso,
            colores: colores,
            categorias_busqueda: obtenerCategoriasBusqueda(categoria)
        };

        const productoBasico = {
            nombre: nombre,
            precio: precio,
            categoria: categoria,
            talles: talles,
            imagen_url: urlFinalImagen
        };

        let { error: dbError } = await supabase
            .from('productos')
            .insert([productoCompleto]);

        if (dbError && dbError.message?.toLowerCase().includes('column')) {
            const fallback = await supabase
                .from('productos')
                .insert([productoBasico]);

            dbError = fallback.error;
        }

        if (dbError) throw dbError;

        alert("Producto publicado con exito.");
        form.reset();
        categoriaSelector?.querySelectorAll('[data-categoria-admin]').forEach((item) => item.classList.remove('selected'));
        categoriaSelector?.querySelector('[data-categoria-admin="conjuntos"]')?.classList.add('selected');
        categoriaInput.value = 'conjuntos';
        actualizarCategoriaPreview('conjuntos');
        tallesSelector?.querySelectorAll('[data-talle]').forEach((item) => item.classList.remove('selected'));
        ['XS', 'S', 'M', 'L', 'XL'].forEach((talle) => {
            tallesSelector?.querySelector(`[data-talle="${talle}"]`)?.classList.add('selected');
        });
        actualizarTalles();
        coloresSelector?.querySelectorAll('[data-color-admin]').forEach((item) => item.classList.remove('selected'));
        actualizarColores();

    } catch (err) {
        console.error(err);
        alert("Ocurrio un error: " + err.message);
    } finally {
        btn.classList.remove('is-loading');
        if (btnLabel) {
            btnLabel.innerText = textoOriginal;
        } else {
            btn.innerText = textoOriginal;
        }
        btn.disabled = false;
    }
});
