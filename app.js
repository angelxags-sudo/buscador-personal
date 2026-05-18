let table;
let masterData = [];

$(document).ready(function() {
    // Carga directa de datos sin pedir credenciales
    iniciarCargaDeDatos();

    function iniciarCargaDeDatos() {
        fetch('datos.json')
            .then(response => response.json())
            .then(data => {
                masterData = data;
                $('#totalCounter').text(masterData.length.toLocaleString() + ' registros totales');
                inicializarSistemaBuscador(masterData);
            })
            .catch(error => {
                console.error("Base de datos vacía o no encontrada:", error);
                $('#totalCounter').text("0 registros activos");
                inicializarSistemaBuscador([]);
            });
    }

    function inicializarSistemaBuscador(data) {
        table = $('#personalTable').DataTable({
            data: data,
            deferRender: true,
            pageLength: 15,
            lengthMenu: [10, 15, 30, 50, 100],
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
            let queryCode = $('#searchCode').val().toLowerCase().trim();
            let queryGrado  = $('#searchGrado').val().toLowerCase().trim();

            let filtrados = masterData.filter(row => {
                let txtNombre = (row["Apellidos y Nombres"] || row["Nombre"] || "").toLowerCase();
                let txtCode = (row["Codigo Funcionario"] || row["Cod.Func."] || "").toLowerCase();
                let txtGrado  = (row["Grado"] || "").toLowerCase();

                if (queryNombre && !queryNombre.split(" ").every(t => txtNombre.includes(t))) return false;
                if (queryCode && !txtCode.includes(queryCode)) return false;
                if (queryGrado && !txtGrado.includes(queryGrado)) return false;
                return true;
            });
            table.clear().rows.add(filtrados).draw();
            $('#totalCounter').text(filtrados.length.toLocaleString() + ' coincidencias');
        }

        $('#searchName, #searchCode, #searchGrado').on('input', ejecutarFiltrado);
        $('#resetFilters').on('click', function() {
            $('#searchName, #searchCode, #searchGrado').val('');
            table.clear().rows.add(masterData).draw();
        });
    }

    // Módulo de Actualización Excel
    const dropzone = $('#dropzone');
    const fileInput = $('#excelFileInput');
    dropzone.on('click', () => fileInput.click());
    dropzone.on('dragover', (e) => { e.preventDefault(); });
    dropzone.on('drop', (e) => {
        e.preventDefault();
        if (e.originalEvent.dataTransfer.files.length > 0) processFile(e.originalEvent.dataTransfer.files[0]);
    });
    fileInput.on('change', (e) => { if (e.target.files.length > 0) processFile(e.target.files[0]); });

    function processFile(file) {
        const reader = new FileReader();
        $('#fileUploadStatus').removeClass('d-none').addClass('alert-info').text("Procesando Excel...");
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const parsedJson = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
                masterData = parsedJson;
                table.clear().rows.add(masterData).draw();
                $('#fileUploadStatus').removeClass('alert-info').addClass('alert-success').html(`¡Éxito! Cargadas ${masterData.length} filas.`);
                $('#btnDownloadJson').removeClass('d-none');
            } catch (err) {
                $('#fileUploadStatus').text("Error al procesar el archivo.");
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
