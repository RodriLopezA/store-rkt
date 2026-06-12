const SUPABASE_URL = "https://zpyhryenaaiewbjzjmfg.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpweWhyeWVuYWFpZXdianpqbWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMjgyNTIsImV4cCI6MjA5NjgwNDI1Mn0.hzHO4eRH7xH_O1zo6_lBs9kbsImBNLnDxL23okgK9_g";
const BUCKET_FOTOS = "fotos-ropa";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const formLogin = document.getElementById('form-login');
const loginAdmin = document.getElementById('login-admin');
const panelAdmin = document.getElementById('panel-admin');
const form = document.getElementById('form-panel');
const productosAdmin = document.getElementById('admin-productos');

const PESO_MAXIMO_IMAGEN = 100 * 1024;
const ANCHO_MAXIMO_IMAGEN = 800;
const CALIDAD_INICIAL_IMAGEN = 0.7;

function mostrarEstado(mensaje) {
    const btn = document.getElementById('btn-publicar');
    if (btn) btn.innerText = mensaje;
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

async function cargarProductosAdmin() {
    productosAdmin.innerHTML = '<p class="mensaje-alerta">Cargando productos...</p>';

    const { data, error } = await supabaseClient
        .from('productos')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error(error);
        productosAdmin.innerHTML = '<p class="mensaje-alerta">No se pudieron cargar los productos.</p>';
        return;
    }

    if (!data.length) {
        productosAdmin.innerHTML = '<p class="mensaje-alerta">Todavia no hay productos cargados.</p>';
        return;
    }

    productosAdmin.innerHTML = data.map((prod) => `
        <article class="admin-producto ${prod.stock === false ? 'sin-stock' : ''}">
            <img src="${prod.imagen_url}" alt="${prod.nombre}">
            <div>
                <strong>${prod.nombre}</strong>
                <span>${prod.categoria || 'sin categoria'} · $${Number(prod.precio || 0).toLocaleString('es-AR')}</span>
                <small>${prod.stock === false ? 'SIN STOCK' : 'EN STOCK'}</small>
            </div>
            <button type="button" data-accion="stock" data-id="${prod.id}" data-stock="${prod.stock === false ? 'true' : 'false'}">
                ${prod.stock === false ? 'Reactivar' : 'Sin stock'}
            </button>
            <button type="button" data-accion="borrar" data-id="${prod.id}" data-imagen="${prod.imagen_url}">
                Borrar
            </button>
        </article>
    `).join('');
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

    if (boton.dataset.accion === 'borrar') {
        const confirmar = confirm("Seguro que queres borrar este producto y su foto?");
        if (!confirmar) return;

        boton.disabled = true;
        const pathStorage = obtenerPathStorage(boton.dataset.imagen);

        const { error: dbError } = await supabaseClient
            .from('productos')
            .delete()
            .eq('id', id);

        if (dbError) {
            alert("No se pudo borrar el producto: " + dbError.message);
            boton.disabled = false;
            return;
        }

        if (pathStorage) {
            const { error: storageError } = await supabaseClient.storage
                .from(BUCKET_FOTOS)
                .remove([pathStorage]);

            if (storageError) {
                console.warn("Producto borrado, pero no se pudo borrar la foto:", storageError);
            }
        }

        await cargarProductosAdmin();
    }
});

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
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) {
            throw new Error("Tenes que iniciar sesion para publicar.");
        }

        if (!fotoArchivo) {
            throw new Error("Selecciona una foto antes de publicar.");
        }

        mostrarEstado("Comprimiendo foto...");
        const fotoComprimida = await comprimirImagen(fotoArchivo);

        if (!fotoComprimida) {
            throw new Error("No se pudo comprimir la imagen por debajo de 100KB. Proba con otra foto.");
        }

        const nombreBase = fotoArchivo.name
            .replace(/\.[^/.]+$/, '')
            .replace(/\s+/g, '-')
            .replace(/[^a-zA-Z0-9-_]/g, '');
        const nombreImagen = `${Date.now()}-${nombreBase || 'producto'}.${fotoComprimida.extension}`;

        mostrarEstado("Subiendo ropa...");
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

        mostrarEstado("Guardando producto...");
        const { error: dbError } = await supabaseClient
            .from('productos')
            .insert([
                {
                    nombre,
                    precio,
                    categoria,
                    talles,
                    imagen_url: urlData.publicUrl,
                    stock: true
                }
            ]);

        if (dbError) throw dbError;

        alert("Prenda publicada con exito.");
        form.reset();
        await cargarProductosAdmin();

    } catch (err) {
        console.error(err);
        alert("Ocurrio un error: " + err.message);
    } finally {
        mostrarEstado("PUBLICAR EN LA WEB");
        btn.disabled = false;
    }
});

verificarSesion();
