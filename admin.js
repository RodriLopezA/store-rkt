const SUPABASE_URL = "https://zpyhryenaaiewbjzjmfg.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpweWhyeWVuYWFpZXdianpqbWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMjgyNTIsImV4cCI6MjA5NjgwNDI1Mn0.hzHO4eRH7xH_O1zo6_lBs9kbsImBNLnDxL23okgK9_g";
let supabaseClient = null;

const form = document.getElementById('form-panel');
const PESO_MAXIMO_IMAGEN = 100 * 1024; // 100KB

function mostrarEstado(mensaje) {
    const btn = document.getElementById('btn-publicar');
    if (btn) btn.innerText = mensaje;
}

function obtenerSupabaseClient() {
    if (!window.supabase) {
        throw new Error("No se pudo cargar Supabase. Revisa tu conexion a internet.");
    }

    if (
        SUPABASE_URL === "TU_SUPABASE_URL" ||
        SUPABASE_KEY === "TU_SUPABASE_ANON_KEY"
    ) {
        throw new Error("Faltan configurar SUPABASE_URL y SUPABASE_ANON_KEY en admin.js.");
    }

    if (!supabaseClient) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }

    return supabaseClient;
}

function blobDesdeCanvas(canvas, calidad) {
    return new Promise((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', calidad);
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

    let maxDimension = 1200;
    let blobComprimido = null;

    while (maxDimension >= 320) {
        const escala = Math.min(1, maxDimension / Math.max(imagen.width, imagen.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(imagen.width * escala);
        canvas.height = Math.round(imagen.height * escala);

        const ctx = canvas.getContext('2d');
        ctx.drawImage(imagen, 0, 0, canvas.width, canvas.height);

        let calidad = 0.82;

        while (calidad >= 0.35) {
            blobComprimido = await blobDesdeCanvas(canvas, calidad);

            if (blobComprimido && blobComprimido.size <= pesoMaximo) {
                return blobComprimido;
            }

            calidad -= 0.08;
        }

        maxDimension -= 200;
    }

    return null;
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const btn = document.getElementById('btn-publicar');
    mostrarEstado("Preparando publicacion...");
    btn.disabled = true;

    const nombre = document.getElementById('nombre').value;
    const precio = Number(document.getElementById('precio').value);
    const categoria = document.getElementById('categoria').value;
    const talles = document.getElementById('talles').value;
    const fotoArchivo = document.getElementById('foto').files[0];

    try {
        const supabase = obtenerSupabaseClient();

        if (!fotoArchivo) {
            throw new Error("Selecciona una foto antes de publicar.");
        }

        mostrarEstado("Comprimiendo foto...");
        const fotoComprimida = await comprimirImagen(fotoArchivo);

        if (!fotoComprimida) {
            throw new Error("No se pudo comprimir la imagen por debajo de 100KB. Proba con otra foto.");
        }

        // Crear nombre unico de imagen para que no se pisen.
        const nombreBase = fotoArchivo.name
            .replace(/\.[^/.]+$/, '')
            .replace(/\s+/g, '-')
            .replace(/[^a-zA-Z0-9-_]/g, '');
        const nombreImagen = `${Date.now()}-${nombreBase || 'producto'}.jpg`;

        mostrarEstado("Subiendo ropa...");
        const { error: uploadError } = await supabase.storage
            .from('fotos-ropa')
            .upload(nombreImagen, fotoComprimida, {
                contentType: 'image/jpeg',
                upsert: false
            });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
            .from('fotos-ropa')
            .getPublicUrl(nombreImagen);

        const urlFinalImagen = urlData.publicUrl;

        mostrarEstado("Guardando producto...");
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

        alert("Prenda publicada con exito.");
        form.reset();

    } catch (err) {
        console.error(err);
        alert("Ocurrio un error: " + err.message);
    } finally {
        mostrarEstado("PUBLICAR EN LA WEB");
        btn.disabled = false;
    }
});
