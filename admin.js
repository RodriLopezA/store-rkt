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

categoriaSelector?.addEventListener('click', (e) => {
    const boton = e.target.closest('[data-categoria-admin]');
    if (!boton) return;

    categoriaSelector.querySelectorAll('[data-categoria-admin]')
        .forEach((item) => item.classList.remove('selected'));

    boton.classList.add('selected');
    categoriaInput.value = boton.dataset.categoriaAdmin;
    actualizarCategoriaPreview(boton.dataset.categoriaAdmin);
});

tallesSelector?.addEventListener('click', (e) => {
    const boton = e.target.closest('[data-talle]');
    if (!boton) return;

    boton.classList.toggle('selected');
    actualizarTalles();
});

coloresSelector?.addEventListener('click', (e) => {
    const boton = e.target.closest('[data-color-admin]');
    if (!boton) return;

    boton.classList.toggle('selected');
    actualizarColores();
});

actualizarCategoriaPreview(categoriaInput?.value);
actualizarTalles();
actualizarColores();

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const btn = document.getElementById('btn-publicar');
    btn.innerText = "ðŸ’¥ SUBIENDO ROPA... ESPERÃ";
    btn.disabled = true;

    const nombre = document.getElementById('nombre').value;
    const precio = Number(document.getElementById('precio').value);
    const categoria = document.getElementById('categoria').value;
    const talles = document.getElementById('talles').value;
    const fotoArchivo = document.getElementById('foto').files[0];

    try {
        // 1. Crear nombre Ãºnico de imagen para que no se pisen
        const nombreImagen = `${Date.now()}-${fotoArchivo.name.replace(/\s+/g, '')}`;

        // 2. Subir al Storage (Asegurate de crear el bucket pÃºblico llamado "fotos-ropa" en Supabase)
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('fotos-ropa')
            .upload(nombreImagen, fotoArchivo);

        if (uploadError) throw uploadError;

        // 3. Conseguir la URL pÃºblica de la imagen
        const { data: urlData } = supabase.storage
            .from('fotos-ropa')
            .getPublicUrl(nombreImagen);

        const urlFinalImagen = urlData.publicUrl;

        // 4. Subir los datos a la tabla de base de datos "productos"
        const { error: dbError } = await supabase
            .from('productos')
            .insert([
                {
                    nombre: nombre,
                    precio: precio,
                    categoria: categoria,
                    talles: talles,
                    imagen_url: urlFinalImagen
                }
            ]);

        if (dbError) throw dbError;

        alert("ðŸš€ Â¡PRENDA PUBLICADA CON Ã‰XITO!");
        form.reset();

    } catch (err) {
        console.error(err);
        alert("OcurriÃ³ un error: " + err.message);
    } finally {
        btn.innerText = "âš¡ PUBLICAR EN LA WEB âš¡";
        btn.disabled = false;
    }
});
