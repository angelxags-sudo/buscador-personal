let table;
let masterData = [];

// Firma criptográfica SHA-256 de la contraseña "Secur-Proc-2026!*"
const CLAVE_HASH_MAESTRA = "ca704ec37059dbdd0e4ad9b307bf949437ff866384a51e6b83f06ec14336c1e5";

$(document).ready(function() {
    // Solicitar credenciales al inicio de forma inmediata
    let usuarioEntrada = prompt("Control de Acceso Interno\nIngrese Nombre de Usuario:");
    let claveEntrada = prompt("Ingrese Contraseña de Seguridad:");

    verificarAcceso(usuarioEntrada, claveEntrada).then(autorizado => {
        if (autorizado) {
            iniciarCargaDeDatos();
        } else {
            alert("Credenciales Inválidas. Acceso denegado.");
            $('body').html('<div style="text-align:center; margin-top:150px; color:#ef4444; font-family:sans-serif;"><h2>🔒 Acceso Restringido</h2><p>Este sistema contiene información interna y requiere autorización.</p></div>');
        }
    });

    async function verificarAcceso(user, pass) {
        if (user !== "admin" || !pass) return false;
        const msgBuffer = new TextEncoder().encode(pass);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex === CLAVE_HASH_MAESTRA;
    }

    function iniciarCargaDeDatos() {
        fetch('datos.json')
            .then(response => response.json())
            .then(data => {
                masterData = data;
                $('#totalCounter').text(masterData.length.toLocaleString() + ' registros totales');
                inicializarSistemaBuscador(masterData);
            })
            .catch(error => {
                console.error("Base de datos no encontrada o vacía:", error);
                $('#totalCounter').text("0 registros");
                inicializarSistemaBuscador([]);
            });
    }

    function inicializarSistemaBuscador(data) {
        table = $('#personalTable').DataTable({
            data: data,
            deferRender: true,
            pageLength: 15,
            lengthMenu: [10, 15, 30, 50, 100],
            fixedHeader: true,
            order: [[0, 'asc']],
            dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6">>rt<"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
            language: {
                url: '//cdn.datatables.net/plug-ins/1.13.7/i18n/es-ES.json',
                emptyTable: "Ningún registro coincide con los criterios ingresados."
            },
            columns: [
                { render: function (d, t, row) { return row["N.Ord"] || row["N.ord"] || row["n.ord"] || ""; } },
                { render: function (d, t, row) { return row["Escalafon"] || row["Escalafón"] || ""; } },
                { render: function (d, t, row) { return row["Grado"] || ""; } },
                { render: function (d, t, row) { return row["Apellidos y Nombres"] || row["Nombre"] || ""; } },
                { render: function (d, t, row) { return row["Codigo Funcionario"] || row["Cod.Func."] || row["Cod. Func."] || ""; } },
                { render: function (d, t, row) { return row["Estado Civil"] || row["E.Civil"] || ""; } },
                { render: function (d, t, row) { return row["Fecha Nacimiento"] || row["Fec-Nac"] || ""; } },
                { render: function (d, t, row) { return row["Fecha Ingreso"] || row["Fec-Ing"] || ""; } },
                { render: function (d, t, row) { return row["Fecha Ascenso"] || row["Fec-Asc"] || ""; } },
                { render: function (d, t, row) { return row["Observaciones"] || ""; } },
                { render: function (d, t, row) { return row["Observaciones2"] || row["Column11"] || ""; } }
            ]
        });

        function ejecutarFiltrado() {
            let queryNombre = $('#searchName').val().toLowerCase().trim();
            let queryCodigo = $('#searchCode').val().toLowerCase().trim();
            let queryGrado  = $('#searchGrado').val().toLowerCase().trim();

            if (queryNombre === "" && queryCodigo === "" && queryGrado === "") {
                table.clear().rows.add(masterData).draw();
                $('#totalCounter').text(masterData.length.toLocaleString() + ' registros totales');
                return;
            }

            let filtrados = masterData.filter(row => {
                let txtNombre = (row["Apellidos y Nombres"] || row["Nombre"] || "").toLowerCase();
                let txtCodigo = (row["Codigo Funcionario"] || row["Cod.Func."] || row["Cod. Func."] || "").toLowerCase();
                let txtGrado  = (row["Grado"] || "").toLowerCase();
                let txtEscalafon = (row["Escalafon"] || row["Escalafón"] || "").toLowerCase();

                if (queryNombre !== "") {
                    let terminos = queryNombre.split(" ");
                    if (!terminos.every(t => txtNombre.includes(t))) return false;
                }
                if (queryCodigo !== "" && !txtCodigo.includes(queryCodigo)) return false;
                if (queryGrado !== "" && !txtGrado.includes(queryGrado) && !txtEscalafon.includes(queryGrado)) return false;
                return true;
            });

            table.clear().rows.add(filtrados).draw();
            $('#totalCounter').text(filtrados.length.toLocaleString() + ' coincidencias encontradas');
        }

        $('#searchName, #searchCode, #searchGrado').on('input', ejecutarFiltrado);
        $('#resetFilters').on('click', function() {
            $('#searchName').val(''); $('#searchCode').val(''); $('#searchGrado').val('');
            table.clear().rows.add(masterData).draw();
            $('#totalCounter').text(masterData.length.toLocaleString() + ' registros totales');
        });
    }

    // MÓDULO EXCEL EN MEMORIA
    const dropzone = $('#dropzone');
    const fileInput = $('#excelFileInput');
    dropzone.on('click', () => fileInput.click());
    dropzone.on('dragover', (e) => { e.preventDefault(); dropzone.addClass('dragover'); });
    dropzone.on('dragleave', () => dropzone.removeClass('dragover'));
    dropzone.on('drop', (e) => {
        e.preventDefault(); dropzone.removeClass('dragover');
        const files = e.originalEvent.dataTransfer.files;
        if (files.length > 0) processFile(files[0]);
    });
    fileInput.on('change', (e) => { if (e.target.files.length > 0) processFile(e.target.files[0]); });

    function processFile(file) {
        const reader = new FileReader();
        $('#fileUploadStatus').removeClass('d-none alert-danger alert-success').addClass('alert-info').text("Analizando planilla...");
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const parsedJson = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
                if (parsedJson.length === 0) throw new Error("Vacío");
                masterData = parsedJson;
                table.clear().rows.add(masterData).draw();
                $('#totalCounter').text(masterData.length.toLocaleString() + ' registros totales (Actualizado)');
                $('#fileUploadStatus').removeClass('alert-info').addClass('alert-success').html(`<strong>¡Éxito!</strong> Se cargaron <strong>${masterData.length.toLocaleString()}</strong> filas.`);
                $('#btnDownloadJson').removeClass('d-none');
            } catch (err) {
                $('#fileUploadStatus').removeClass('alert-info').addClass('alert-danger').text("Error en la lectura del archivo.");
            }
        };
        reader.readAsArrayBuffer(file);
    }

    $('#btnDownloadJson').on('click', function() {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(masterData, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", "datos.json");
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    });
});
