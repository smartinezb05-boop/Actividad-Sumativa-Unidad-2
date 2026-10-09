let experiencias = [];
let reservas = [];
let textoBusqueda = "";
let categoriaActual = "todas";
let ordenActual = "normal";
let precioMaximo = null;

const catalogo = document.querySelector("#catalogo");
const buscador = document.querySelector("#buscador");
const filtroCategoria = document.querySelector("#filtroCategoria");
const filtroPrecio = document.querySelector("#filtroPrecio");
const ordenPrecio = document.querySelector("#ordenPrecio");
const listaReservas = document.querySelector("#listaReservas");
const total = document.querySelector("#total");
const totalPersonasSpan = document.querySelector("#totalPersonas");
const estado = document.querySelector("#estado");
const btnVaciar = document.querySelector("#btnVaciar");
const confirmacionVaciar = document.querySelector("#confirmacionVaciar");
const btnConfirmarVaciar = document.querySelector("#btnConfirmarVaciar");
const btnCancelarVaciar = document.querySelector("#btnCancelarVaciar");
const contenedorMensajes = document.querySelector("#contenedorMensajes");

async function cargarExperiencias() {
  try {
    estado.textContent = "Cargando experiencias...";
    const respuesta = await fetch("./data/experiencias.json");
    if (!respuesta.ok) throw new Error("No fue posible cargar las experiencias");
    experiencias = await respuesta.json();
    estado.textContent = `${experiencias.length} experiencias disponibles`;
    actualizarCatalogo();
  } catch (error) {
    estado.textContent = "Error al cargar la información";
    console.error(error);
  }
}

// Reemplazo de los alert() por mensajes en la pantalla
function mostrarMensaje(texto, tipo = "error") {
  contenedorMensajes.innerHTML = `<div class="mensaje ${tipo}">${texto}</div>`;
  setTimeout(() => {
    contenedorMensajes.innerHTML = "";
  }, 4000);
}

function obtenerResultados() {
  let resultados = [...experiencias];
  if (categoriaActual !== "todas") {
    resultados = resultados.filter(e => e.categoria === categoriaActual);
  }
  if (textoBusqueda !== "") {
    resultados = resultados.filter(e => e.nombre.toLowerCase().includes(textoBusqueda));
  }
  if (precioMaximo !== null && precioMaximo > 0) {
    resultados = resultados.filter(e => e.precio <= precioMaximo);
  }
  if (ordenActual === "ascendente") resultados.sort((a, b) => a.precio - b.precio);
  if (ordenActual === "descendente") resultados.sort((a, b) => b.precio - a.precio);
  return resultados;
}

function actualizarCatalogo() {
  const resultados = obtenerResultados();
  if (resultados.length === 0) {
    catalogo.innerHTML = '<p class="sin-resultados">No se encontraron experiencias</p>';
    estado.textContent = "0 resultados";
    return;
  }
  catalogo.innerHTML = resultados.map(e => `
    <article class="tarjeta">
      <div class="imagen">${e.icono}</div>
      <div class="informacion">
        <span class="categoria">${e.categoria}</span>
        <h3>${e.nombre}</h3>
        <p>Cupo disponible: ${e.cupo}</p>
        <p class="precio">$${e.precio} MXN</p>
        <label>Personas:
          <input type="number" id="cantidad-${e.id}" min="1" max="${e.cupo}" value="1">
        </label>
        <button class="btn-reservar" data-id="${e.id}">Agregar</button>
      </div>
    </article>
  `).join("");
  estado.textContent = `${resultados.length} resultados`;
  agregarEventosReservar();
}

function agregarEventosReservar() {
  document.querySelectorAll(".btn-reservar").forEach(boton => {
    boton.addEventListener("click", () => agregarReserva(Number(boton.dataset.id)));
  });
}

function agregarReserva(id) {
  const experiencia = experiencias.find(e => e.id === id);
  const entradaCantidad = document.querySelector(`#cantidad-${id}`);
  const cantidad = Number(entradaCantidad.value);

  if (cantidad < 1 || cantidad > experiencia.cupo) {
    mostrarMensaje(`Cantidad no válida para ${experiencia.nombre}`);
    return;
  }

  const existente = reservas.find(r => r.experienciaId === id);

  if (existente) {
    const nuevaCantidad = existente.cantidad + cantidad;
    if (nuevaCantidad > experiencia.cupo) {
      mostrarMensaje(`La cantidad supera el cupo disponible (${experiencia.cupo}) para ${experiencia.nombre}`);
      return;
    }
    existente.cantidad = nuevaCantidad;
    existente.subtotal = nuevaCantidad * experiencia.precio;
  } else {
    reservas.push({
      experienciaId: experiencia.id,
      nombre: experiencia.nombre,
      precio: experiencia.precio,
      cantidad,
      cupoMax: experiencia.cupo,
      subtotal: experiencia.precio * cantidad
    });
  }
  
  mostrarMensaje(`Se ha agregado ${experiencia.nombre} a tu reservación`, "exito");
  mostrarReservas();
}

function modificarCantidad(id, ajuste) {
  const reserva = reservas.find(r => r.experienciaId === id);
  if (!reserva) return;

  const nuevaCantidad = reserva.cantidad + ajuste;

  if (nuevaCantidad === 0) {
    eliminarReserva(id);
    return;
  }

  if (nuevaCantidad > reserva.cupoMax) {
    mostrarMensaje(`No hay más cupo disponible para ${reserva.nombre}`);
    return;
  }

  reserva.cantidad = nuevaCantidad;
  reserva.subtotal = nuevaCantidad * reserva.precio;
  mostrarReservas();
}

function mostrarReservas() {
  if (reservas.length === 0) {
    listaReservas.innerHTML = "<p>No hay experiencias seleccionadas.</p>";
    total.textContent = "$0 MXN";
    totalPersonasSpan.textContent = "0";
    btnVaciar.style.display = "none";
    confirmacionVaciar.className = "confirmacion-oculta"; 
    return;
  }

  listaReservas.innerHTML = reservas.map(r => `
    <article class="item-reserva">
      <div>
        <strong>${r.nombre}</strong>
        <div class="controles-cantidad">
            <button class="btn-modificar btn-restar" data-id="${r.experienciaId}">-</button>
            <span>${r.cantidad} pers. x $${r.precio}</span>
            <button class="btn-modificar btn-sumar" data-id="${r.experienciaId}">+</button>
        </div>
      </div>
      <div>
        <strong>$${r.subtotal} MXN</strong><br>
        <button class="btn-eliminar" data-id="${r.experienciaId}">Eliminar</button>
      </div>
    </article>
  `).join("");

  const totalReserva = reservas.reduce((suma, r) => suma + r.subtotal, 0);
  const totalPersonas = reservas.reduce((suma, r) => suma + r.cantidad, 0);

  total.textContent = `$${totalReserva} MXN`;
  totalPersonasSpan.textContent = totalPersonas;
  btnVaciar.style.display = "block";
  confirmacionVaciar.className = "confirmacion-oculta";

  agregarEventosCarrito();
}

function agregarEventosCarrito() {
  document.querySelectorAll(".btn-eliminar").forEach(boton => {
    boton.addEventListener("click", () => eliminarReserva(Number(boton.dataset.id)));
  });
  document.querySelectorAll(".btn-sumar").forEach(boton => {
    boton.addEventListener("click", () => modificarCantidad(Number(boton.dataset.id), 1));
  });
  document.querySelectorAll(".btn-restar").forEach(boton => {
    boton.addEventListener("click", () => modificarCantidad(Number(boton.dataset.id), -1));
  });
}

function eliminarReserva(id) {
  reservas = reservas.filter(r => r.experienciaId !== id);
  mostrarReservas();
}

// --- Lógica para vaciar carrito con interfaz en pantalla ---
btnVaciar.addEventListener("click", () => {
  confirmacionVaciar.className = "confirmacion-visible";
  btnVaciar.style.display = "none";
});

btnCancelarVaciar.addEventListener("click", () => {
  confirmacionVaciar.className = "confirmacion-oculta";
  btnVaciar.style.display = "block";
});

btnConfirmarVaciar.addEventListener("click", () => {
  reservas = [];
  mostrarReservas();
  mostrarMensaje("Reservación vaciada con éxito", "exito");
});

// --- Eventos de los filtros ---
buscador.addEventListener("input", () => {
  textoBusqueda = buscador.value.trim().toLowerCase();
  actualizarCatalogo();
});

filtroCategoria.addEventListener("change", () => {
  categoriaActual = filtroCategoria.value;
  actualizarCatalogo();
});

filtroPrecio.addEventListener("input", (e) => {
  precioMaximo = e.target.value === "" ? null : Number(e.target.value);
  actualizarCatalogo();
});

ordenPrecio.addEventListener("change", () => {
  ordenActual = ordenPrecio.value;
  actualizarCatalogo();
});

cargarExperiencias();