const RUTAS = {
    usuarios: "data/usuarios.xml",
    tipos: "data/tipos-falla.xml",
    zonas: "data/zonas.xml",
    brigadas: "data/brigadas.xml",
    estados: "data/estados.xml",
    reportes: "data/reportes.xml"
};

function $(selector) {
    return document.querySelector(selector);
}

function limpiarTexto(valor) {
    return String(valor || "").trim();
}

function escaparHTML(texto) {
    return String(texto || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

async function cargarXML(ruta) {
    const respuesta = await fetch(ruta);
    const texto = await respuesta.text();
    return new DOMParser().parseFromString(texto, "application/xml");
}

function textoXML(nodo, etiqueta) {
    const elemento = nodo.querySelector(etiqueta);
    return elemento ? elemento.textContent.trim() : "";
}

function obtenerReportesLocales() {
    return JSON.parse(localStorage.getItem("reportesAlumbrado")) || [];
}

function guardarReportesLocales(reportes) {
    localStorage.setItem("reportesAlumbrado", JSON.stringify(reportes));
}

async function obtenerReportesXML() {
    const xml = await cargarXML(RUTAS.reportes);
    const nodos = [...xml.querySelectorAll("reporte")];

    return nodos.map(nodo => ({
        folio: textoXML(nodo, "folio"),
        nombre: textoXML(nodo, "nombre"),
        telefono: textoXML(nodo, "telefono"),
        zona: textoXML(nodo, "zona"),
        colonia: textoXML(nodo, "colonia"),
        calle: textoXML(nodo, "calle"),
        tipo: textoXML(nodo, "tipo"),
        prioridad: textoXML(nodo, "prioridad"),
        descripcion: textoXML(nodo, "descripcion"),
        estado: textoXML(nodo, "estado"),
        fecha: textoXML(nodo, "fecha"),
        origen: "XML"
    }));
}

async function obtenerTodosLosReportes() {
    const desdeXML = await obtenerReportesXML();
    const locales = obtenerReportesLocales();
    return [...desdeXML, ...locales];
}

async function cargarTiposFalla() {
    const xml = await cargarXML(RUTAS.tipos);
    return [...xml.querySelectorAll("tipo")].map(tipo => ({
        id: tipo.getAttribute("id"),
        nombre: textoXML(tipo, "nombre"),
        prioridad: textoXML(tipo, "prioridad")
    }));
}

async function cargarZonas() {
    const xml = await cargarXML(RUTAS.zonas);
    return [...xml.querySelectorAll("zona")].map(zona => ({
        id: zona.getAttribute("id"),
        nombre: textoXML(zona, "nombre"),
        responsable: textoXML(zona, "responsable")
    }));
}

async function cargarEstados() {
    const xml = await cargarXML(RUTAS.estados);
    return [...xml.querySelectorAll("estado")].map(estado => estado.textContent.trim());
}

function crearOpcion(valor, texto) {
    return `<option value="${escaparHTML(valor)}">${escaparHTML(texto)}</option>`;
}

async function iniciarPaginaInicio() {
    const contenedor = $("#resumenXML");
    if (!contenedor) return;

    const tipos = await cargarTiposFalla();
    const zonas = await cargarZonas();

    contenedor.innerHTML = `
        <article class="tarjeta">
            <h3>${tipos.length}</h3>
            <p>Tipos de falla cargados desde XML</p>
        </article>

        <article class="tarjeta">
            <h3>${zonas.length}</h3>
            <p>Zonas de atención cargadas desde XML</p>
        </article>

        <article class="tarjeta">
            <h3>XML</h3>
            <p>Datos estructurados para tablas y formularios</p>
        </article>

        <article class="tarjeta">
            <h3>JS</h3>
            <p>Plantillas, filtros y validaciones dinámicas</p>
        </article>
    `;
}

async function iniciarPaginaReportar() {
    const form = $("#formReporte");
    if (!form) return;

    const tipos = await cargarTiposFalla();
    const zonas = await cargarZonas();

    $("#tipo").innerHTML = `<option value="">Selecciona una opción</option>` +
        tipos.map(tipo => crearOpcion(tipo.nombre, tipo.nombre)).join("");

    $("#zona").innerHTML = `<option value="">Selecciona una zona</option>` +
        zonas.map(zona => crearOpcion(zona.nombre, zona.nombre)).join("");

    $("#tipo").addEventListener("change", () => {
        const seleccionado = tipos.find(tipo => tipo.nombre === $("#tipo").value);
        $("#prioridad").value = seleccionado ? seleccionado.prioridad : "";
    });

    form.addEventListener("submit", async evento => {
        evento.preventDefault();

        const reportes = await obtenerTodosLosReportes();
        const folio = generarFolio(reportes.length + 1);

        const reporte = {
            folio,
            nombre: limpiarTexto($("#nombre").value),
            telefono: limpiarTexto($("#telefono").value),
            zona: limpiarTexto($("#zona").value),
            colonia: limpiarTexto($("#colonia").value),
            calle: limpiarTexto($("#calle").value),
            tipo: limpiarTexto($("#tipo").value),
            prioridad: limpiarTexto($("#prioridad").value),
            descripcion: limpiarTexto($("#descripcion").value),
            estado: "Pendiente",
            fecha: new Date().toLocaleDateString("es-MX"),
            origen: "Local"
        };

        const reportesLocales = obtenerReportesLocales();
        reportesLocales.push(reporte);
        guardarReportesLocales(reportesLocales);

        $("#mensaje").innerHTML = `
            <div class="alerta exito">
                Reporte registrado correctamente.<br>
                Folio generado: <strong>${escaparHTML(reporte.folio)}</strong>
            </div>
        `;

        form.reset();
        $("#prioridad").value = "";
    });
}

function generarFolio(numero) {
    const anio = new Date().getFullYear();
    return `AP-${anio}-${String(numero).padStart(4, "0")}`;
}

async function iniciarPaginaConsultas() {
    const form = $("#formConsulta");
    if (!form) return;

    form.addEventListener("submit", async evento => {
        evento.preventDefault();

        const folio = limpiarTexto($("#folioBuscar").value).toUpperCase();
        const reportes = await obtenerTodosLosReportes();
        const reporte = reportes.find(item => item.folio.toUpperCase() === folio);

        if (!reporte) {
            $("#resultadoConsulta").innerHTML = `
                <div class="alerta error">
                    No se encontró ningún reporte con el folio ingresado.
                </div>
            `;
            return;
        }

        $("#resultadoConsulta").innerHTML = crearTarjetaReporte(reporte);
    });
}

function crearTarjetaReporte(reporte) {
    return `
        <article class="resultado">
            <h3>Información del reporte</h3>
            <p><strong>Folio:</strong> ${escaparHTML(reporte.folio)}</p>
            <p><strong>Zona:</strong> ${escaparHTML(reporte.zona)}</p>
            <p><strong>Colonia:</strong> ${escaparHTML(reporte.colonia)}</p>
            <p><strong>Calle o referencia:</strong> ${escaparHTML(reporte.calle)}</p>
            <p><strong>Tipo de falla:</strong> ${escaparHTML(reporte.tipo)}</p>
            <p><strong>Prioridad:</strong> ${escaparHTML(reporte.prioridad)}</p>
            <p><strong>Descripción:</strong> ${escaparHTML(reporte.descripcion)}</p>
            <p><strong>Estado:</strong> ${escaparHTML(reporte.estado)}</p>
            <p><strong>Fecha:</strong> ${escaparHTML(reporte.fecha)}</p>
        </article>
    `;
}

async function iniciarPaginaReportes() {
    const tabla = $("#tablaReportes");
    if (!tabla) return;

    const estados = await cargarEstados();
    const tipos = await cargarTiposFalla();
    const zonas = await cargarZonas();

    $("#filtroEstado").innerHTML = `<option value="">Todos</option>` +
        estados.map(estado => crearOpcion(estado, estado)).join("");

    $("#filtroTipo").innerHTML = `<option value="">Todos</option>` +
        tipos.map(tipo => crearOpcion(tipo.nombre, tipo.nombre)).join("");

    $("#filtroZona").innerHTML = `<option value="">Todas</option>` +
        zonas.map(zona => crearOpcion(zona.nombre, zona.nombre)).join("");

    const actualizar = async () => {
        const reportes = await obtenerTodosLosReportes();

        const estado = $("#filtroEstado").value;
        const tipo = $("#filtroTipo").value;
        const zona = $("#filtroZona").value;

        const filtrados = reportes.filter(reporte => {
            const coincideEstado = !estado || reporte.estado === estado;
            const coincideTipo = !tipo || reporte.tipo === tipo;
            const coincideZona = !zona || reporte.zona === zona;
            return coincideEstado && coincideTipo && coincideZona;
        });

        tabla.innerHTML = crearFilasReportes(filtrados);
    };

    $("#filtroEstado").addEventListener("change", actualizar);
    $("#filtroTipo").addEventListener("change", actualizar);
    $("#filtroZona").addEventListener("change", actualizar);

    $("#limpiarFiltrosReportes").addEventListener("click", () => {
        $("#filtroEstado").value = "";
        $("#filtroTipo").value = "";
        $("#filtroZona").value = "";
        actualizar();
    });

    actualizar();
}

function crearFilasReportes(reportes) {
    if (reportes.length === 0) {
        return `<tr><td colspan="7">No hay reportes para mostrar.</td></tr>`;
    }

    return reportes.map(reporte => `
        <tr>
            <td>${escaparHTML(reporte.folio)}</td>
            <td>${escaparHTML(reporte.nombre)}</td>
            <td>${escaparHTML(reporte.zona)}</td>
            <td>${escaparHTML(reporte.colonia)}</td>
            <td>${escaparHTML(reporte.tipo)}</td>
            <td>${escaparHTML(reporte.estado)}</td>
            <td>${escaparHTML(reporte.fecha)}</td>
        </tr>
    `).join("");
}

async function iniciarPaginaBrigadas() {
    const tabla = $("#tablaBrigadas");
    if (!tabla) return;

    const xml = await cargarXML(RUTAS.brigadas);
    const brigadas = [...xml.querySelectorAll("brigada")].map(brigada => ({
        nombre: textoXML(brigada, "nombre"),
        zona: textoXML(brigada, "zona"),
        turno: textoXML(brigada, "turno"),
        especialidad: textoXML(brigada, "especialidad")
    }));

    const zonasUnicas = [...new Set(brigadas.map(item => item.zona))];

    $("#filtroZonaBrigada").innerHTML = `<option value="">Todas</option>` +
        zonasUnicas.map(zona => crearOpcion(zona, zona)).join("");

    const actualizar = () => {
        const zona = $("#filtroZonaBrigada").value;
        const turno = $("#filtroTurnoBrigada").value;

        const filtradas = brigadas.filter(brigada => {
            const coincideZona = !zona || brigada.zona === zona;
            const coincideTurno = !turno || brigada.turno === turno;
            return coincideZona && coincideTurno;
        });

        tabla.innerHTML = crearFilasBrigadas(filtradas);
    };

    $("#filtroZonaBrigada").addEventListener("change", actualizar);
    $("#filtroTurnoBrigada").addEventListener("change", actualizar);

    $("#limpiarFiltrosBrigadas").addEventListener("click", () => {
        $("#filtroZonaBrigada").value = "";
        $("#filtroTurnoBrigada").value = "";
        actualizar();
    });

    actualizar();
}

function crearFilasBrigadas(brigadas) {
    if (brigadas.length === 0) {
        return `<tr><td colspan="4">No hay brigadas con esos filtros.</td></tr>`;
    }

    return brigadas.map(brigada => `
        <tr>
            <td>${escaparHTML(brigada.nombre)}</td>
            <td>${escaparHTML(brigada.zona)}</td>
            <td>${escaparHTML(brigada.turno)}</td>
            <td>${escaparHTML(brigada.especialidad)}</td>
        </tr>
    `).join("");
}

async function iniciarPaginaAdmin() {
    const form = $("#formLogin");
    if (!form) return;

    if (sessionStorage.getItem("adminActivo") === "true") {
        mostrarPanelAdmin();
    }

    form.addEventListener("submit", async evento => {
        evento.preventDefault();

        const usuario = limpiarTexto($("#usuario").value);
        const password = limpiarTexto($("#password").value);

        const valido = await validarUsuarioXML(usuario, password);

        if (!valido) {
            $("#mensajeLogin").innerHTML = `
                <div class="alerta error">
                    Usuario o contraseña incorrectos.
                </div>
            `;
            return;
        }

        sessionStorage.setItem("adminActivo", "true");
        mostrarPanelAdmin();
    });
}

async function validarUsuarioXML(usuario, password) {
    const xml = await cargarXML(RUTAS.usuarios);
    const usuarios = [...xml.querySelectorAll("usuario")];

    return usuarios.some(item => {
        const usernameXML = textoXML(item, "username");
        const passwordXML = textoXML(item, "password");
        const activoXML = textoXML(item, "activo");

        return usernameXML === usuario && passwordXML === password && activoXML === "true";
    });
}

async function mostrarPanelAdmin() {
    $("#loginAdmin").classList.add("oculto");
    $("#panelAdmin").classList.remove("oculto");
    await cargarTablaAdmin();
}

async function cargarTablaAdmin() {
    const tabla = $("#tablaAdmin");
    if (!tabla) return;

    const reportes = await obtenerTodosLosReportes();

    if (reportes.length === 0) {
        tabla.innerHTML = `<tr><td colspan="6">No hay reportes registrados.</td></tr>`;
        return;
    }

    tabla.innerHTML = reportes.map((reporte, index) => `
        <tr>
            <td>${escaparHTML(reporte.folio)}</td>
            <td>${escaparHTML(reporte.nombre)}</td>
            <td>${escaparHTML(reporte.zona)}</td>
            <td>${escaparHTML(reporte.tipo)}</td>
            <td>${escaparHTML(reporte.estado)}</td>
            <td>
                ${reporte.origen === "Local" ? `
                    <select onchange="cambiarEstadoLocal(${index}, this.value)">
                        <option value="Pendiente" ${reporte.estado === "Pendiente" ? "selected" : ""}>Pendiente</option>
                        <option value="En proceso" ${reporte.estado === "En proceso" ? "selected" : ""}>En proceso</option>
                        <option value="Atendido" ${reporte.estado === "Atendido" ? "selected" : ""}>Atendido</option>
                    </select>
                ` : "Solo lectura"}
            </td>
        </tr>
    `).join("");
}

function cambiarEstadoLocal(indexGlobal, nuevoEstado) {
    const locales = obtenerReportesLocales();
    const reporte = locales[indexGlobal];

    if (reporte) {
        reporte.estado = nuevoEstado;
        guardarReportesLocales(locales);
        cargarTablaAdmin();
    }
}

function cerrarSesion() {
    sessionStorage.removeItem("adminActivo");
    location.reload();
}

async function iniciarPaginaEstadisticas() {
    const totalHTML = $("#totalReportes");
    if (!totalHTML) return;

    const reportes = await obtenerTodosLosReportes();

    const total = reportes.length;
    const pendientes = reportes.filter(reporte => reporte.estado === "Pendiente").length;
    const proceso = reportes.filter(reporte => reporte.estado === "En proceso").length;
    const atendidos = reportes.filter(reporte => reporte.estado === "Atendido").length;

    $("#totalReportes").textContent = total;
    $("#pendientes").textContent = pendientes;
    $("#proceso").textContent = proceso;
    $("#atendidos").textContent = atendidos;

    if (total === 0) {
        $("#resumenEstadisticas").textContent = "Aún no hay reportes registrados en el sistema.";
    } else {
        $("#resumenEstadisticas").textContent =
            `Actualmente existen ${total} reportes registrados: ${pendientes} pendientes, ${proceso} en proceso y ${atendidos} atendidos.`;
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    const pagina = document.body.dataset.page;

    try {
        if (pagina === "inicio") await iniciarPaginaInicio();
        if (pagina === "reportar") await iniciarPaginaReportar();
        if (pagina === "consultas") await iniciarPaginaConsultas();
        if (pagina === "reportes") await iniciarPaginaReportes();
        if (pagina === "brigadas") await iniciarPaginaBrigadas();
        if (pagina === "admin") await iniciarPaginaAdmin();
        if (pagina === "estadisticas") await iniciarPaginaEstadisticas();
    } catch (error) {
        console.error("Error al iniciar la página:", error);
    }
});