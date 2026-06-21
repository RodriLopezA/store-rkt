const SUPABASE_URL = "https://zpyhryenaaiewbjzjmfg.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpweWhyeWVuYWFpZXdianpqbWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMjgyNTIsImV4cCI6MjA5NjgwNDI1Mn0.hzHO4eRH7xH_O1zo6_lBs9kbsImBNLnDxL23okgK9_g";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const formLogin = document.getElementById('form-login');
const loginAdmin = document.getElementById('login-admin');
const panelAdmin = document.getElementById('panel-admin');
const btnLogout = document.getElementById('btn-logout');

function mostrarPanelAutenticado(autenticado) {
    if (loginAdmin) loginAdmin.hidden = autenticado;
    if (panelAdmin) panelAdmin.hidden = !autenticado;
}

async function verificarSesion() {
    const { data: { session } } = await supabase.auth.getSession();
    mostrarPanelAutenticado(Boolean(session));
}

formLogin?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const btn = document.getElementById('btn-login');
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    btn.innerText = "INGRESANDO...";
    btn.disabled = true;

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

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
});

btnLogout?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    mostrarPanelAutenticado(false);
});

verificarSesion();
const form = document.getElementById('form-panel');

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
