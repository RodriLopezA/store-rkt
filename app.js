// Reemplazá con tus datos reales del proyecto nuevo de Supabase
const SUPABASE_URL = "TU_SUPABASE_URL";
const SUPABASE_KEY = "TU_SUPABASE_ANON_KEY";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const NUMERO_WSP = "549221XXXXXXX"; // Poné el número de tu tío con código de área (sin el + ni el 15)

let productosData = [];

async function obtenerProductos() {
    const { data, error } = await supabaseClient
        .from('productos')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error cargando productos:", error);
        return;
    }

    productosData = data;
    document.getElementById('loading').style.display = 'none';
    renderizarGrid(productosData);
}

function renderizarGrid(lista) {
    const grid = document.getElementById('grid-productos');
    grid.innerHTML = "";

    lista.forEach(prod => {
        // Transformamos el string de talles "S, M, L" en un array
        const arrayTalles = prod.talles ? prod.talles.split(',') : ['U'];
        
        let tallesHTML = arrayTalles.map((t, index) => 
            `<button class="talle-btn ${index === 0 ? 'selected' : ''}" onclick="seleccionarTalle(this)">${t.trim()}</button>`
        ).join('');

        const card = document.createElement('div');
        card.className = 'producto-card';
        card.innerHTML = `
            <span class="badge-rkt">NUEVO INGRESO</span>
            <div class="img-contenedor">
                <img src="${prod.imagen_url}" alt="${prod.nombre}">
            </div>
            <div class="producto-info">
                <span class="prod-cat">${prod.categoria}</span>
                <h3 class="prod-nom">${prod.nombre}</h3>
                <span class="prod-precio">$${prod.precio.toLocaleString('es-AR')}</span>
                <div class="talles-grid">${tallesHTML}</div>
                <button class="btn-wsp" onclick="enviarPedido('${prod.nombre}', '${prod.precio}', this)">PEDIR POR WHATSAPP</button>
            </div>
        `;
        grid.appendChild(card);
    });
}

function seleccionarTalle(boton) {
    // Deselecciona los otros talles de la misma tarjeta
    const contenedor = boton.parentElement;
    contenedor.querySelectorAll('.talle-btn').forEach(b => b.classList.remove('selected'));
    boton.classList.add('selected');
}

function enviarPedido(nombre, precio, boton) {
    const tarjeta = boton.parentElement;
    const talleSeleccionado = tarjeta.querySelector('.talle-btn.selected').innerText;
    
    const textoMensaje = `¡Hola! Vi este producto en tu web y me interesa comprarlo:\n\n🔥 *Producto:* ${nombre}\n📏 *Talle:* ${talleSeleccionado}\n💰 *Precio:* $${Number(precio).toLocaleString('es-AR')}\n\n¿Seguís teniendo en stock?`;
    
    const urlWsp = `https://wa.me/${NUMERO_WSP}?text=${encodeURIComponent(textoMensaje)}`;
    window.open(urlWsp, '_blank');
}

// Arranca al cargar la página
window.onload = obtenerProductos;
