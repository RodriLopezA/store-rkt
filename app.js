// Datos del proyecto de Supabase
const SUPABASE_URL = "https://kgzffjbwhlrlgxforfgv.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnemZmamJ3aGxybGd4Zm9yZmd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5ODE3MDUsImV4cCI6MjA5NjU1NzcwNX0.FkaQALy1TU2_S8ae0gxAcmsikNLO72qm0_k3knNw2jo";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const NUMERO_WSP = "549221XXXXXXX"; // numero con codigo de area (sin el + ni el 15)

let productosData = [];

async function obtenerProductos() {
    const { data, error } = await supabase
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
    
    const textoMensaje = `Hola! Vi este producto en tu web y me interesa comprarlo:\n\nProducto: ${nombre}\nTalle: ${talleSeleccionado}\nPrecio: $${Number(precio).toLocaleString('es-AR')}\n\nSeguis teniendo en stock?`;
    
    const urlWsp = `https://wa.me/${NUMERO_WSP}?text=${encodeURIComponent(textoMensaje)}`;
    window.open(urlWsp, '_blank');
}

// Arranca al cargar la pagina
window.onload = obtenerProductos;
