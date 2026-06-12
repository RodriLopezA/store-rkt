const SUPABASE_URL = "TU_SUPABASE_URL";
const SUPABASE_KEY = "TU_SUPABASE_ANON_KEY";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const form = document.getElementById('form-panel');

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const btn = document.getElementById('btn-publicar');
    btn.innerText = "💥 SUBIENDO ROPA... ESPERÁ";
    btn.disabled = true;

    const nombre = document.getElementById('nombre').value;
    const precio = Number(document.getElementById('precio').value);
    const categoria = document.getElementById('categoria').value;
    const talles = document.getElementById('talles').value;
    const fotoArchivo = document.getElementById('foto').files[0];

    try {
        // 1. Crear nombre único de imagen para que no se pisen
        const nombreImagen = `${Date.now()}-${fotoArchivo.name.replace(/\s+/g, '')}`;

        // 2. Subir al Storage (Asegurate de crear el bucket público llamado "fotos-ropa" en Supabase)
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('fotos-ropa')
            .upload(nombreImagen, fotoArchivo);

        if (uploadError) throw uploadError;

        // 3. Conseguir la URL pública de la imagen
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

        alert("🚀 ¡PRENDA PUBLICADA CON ÉXITO, TÍO!");
        form.reset();

    } catch (err) {
        console.error(err);
        alert("Ocurrió un error: " + err.message);
    } finally {
        btn.innerText = "⚡ PUBLICAR EN LA WEB ⚡";
        btn.disabled = false;
    }
});