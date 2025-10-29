// Espera a que todo el contenido del HTML esté cargado
document.addEventListener("DOMContentLoaded", () => {
    cargarDatosPrecios();
});

// Función asíncrona para cargar los datos desde el archivo JSON
async function cargarDatosPrecios() {
    try {
        // Usamos un 'cache buster' para asegurarnos de que siempre cargue el JSON más nuevo
        const response = await fetch(`precios.json?v=${new Date().getTime()}`);
        if (!response.ok) {
            throw new Error('No se pudo cargar precios.json');
        }
        const modelos = await response.json();

        mostrarListaPrecios(modelos);
        mostrarGrafico(modelos);

    } catch (error) {
        console.error("Error al cargar los datos:", error);
        document.getElementById('lista-precios').innerHTML = "<p>Error al cargar los datos.</p>";
    }
}

// Función para mostrar los precios en formato de lista
function mostrarListaPrecios(modelos) {
    const contenedorLista = document.getElementById('lista-precios');
    contenedorLista.innerHTML = ''; 

    // 1. Agrupar por marca
    const marcas = [...new Set(modelos.map(m => m.marca))].sort();
    
    marcas.forEach(marca => {
        // Añade un título para la marca
        const tituloMarca = document.createElement('h2');
        tituloMarca.className = 'titulo-marca';
        tituloMarca.textContent = marca;
        contenedorLista.appendChild(tituloMarca);
        
        // 2. Filtrar modelos de esta marca
        const modelosDeMarca = modelos.filter(m => m.marca === marca);

        modelosDeMarca.forEach(modelo => {
            // 3. Crear el contenedor para el MODELO
            const modeloDiv = document.createElement('div');
            modeloDiv.className = 'modelo-item';
            
            let htmlTiendas = ''; // String para acumular los HTML de las tiendas
            
            // 4. Iterar por cada TIENDA en este modelo y ordenarlas por precio
            const tiendasOrdenadas = modelo.tiendas.sort((a, b) => {
                const precioA = a.historial_precios?.length ? a.historial_precios[a.historial_precios.length - 1].precio : Infinity;
                const precioB = b.historial_precios?.length ? b.historial_precios[b.historial_precios.length - 1].precio : Infinity;
                return precioA - precioB;
            });

            tiendasOrdenadas.forEach(tienda => {
                const historial = tienda.historial_precios;
                let precioActualStr = '<span class="sin-datos">(Sin datos)</span>';
                
                if (historial && historial.length > 0) {
                    // Tomamos el último precio del historial
                    const precioActual = historial[historial.length - 1].precio;
                    
                    if (historial.length > 1) {
                        // Comparamos con el precio *anterior* en el historial
                        const precioAnterior = historial[historial.length - 2].precio;
                        if (precioActual < precioAnterior) {
                            precioActualStr = `<span class="precio-bajo">$${precioActual} (Bajó)</span>`;
                        } else if (precioActual > precioAnterior) {
                            precioActualStr = `<span class="precio-subio">$${precioActual} (Subió)</span>`;
                        } else {
                            precioActualStr = `<span class="precio-igual">$${precioActual}</span>`;
                        }
                    } else {
                        // Solo hay un precio en el historial, es el precio base
                        precioActualStr = `<span class="precio-igual">$${precioActual}</span>`;
                    }
                }
                
                htmlTiendas += `
                    <li class="tienda-precio">
                        <a href="${tienda.url}" target="_blank">${tienda.tienda}</a>:
                        ${precioActualStr}
                    </li>
                `;
            });

            // 5. Insertar el HTML del modelo
            modeloDiv.innerHTML = `
                <h3 class="modelo-titulo">${modelo.modelo}</h3>
                <ul class="lista-tiendas">
                    ${htmlTiendas}
                </ul>
            `;
            contenedorLista.appendChild(modeloDiv);
        });
    });
}

// Función para mostrar el gráfico (con Chart.js)
function mostrarGrafico(modelos) {
    const contenedorGrafico = document.getElementById('contenedor-grafico');
    contenedorGrafico.innerHTML = ''; // Limpiamos el canvas viejo
    
    // Creamos un nuevo canvas
    const newCanvas = document.createElement('canvas');
    newCanvas.id = 'graficoPrecios';
    contenedorGrafico.appendChild(newCanvas);
    const ctx = newCanvas.getContext('2d');
    
    let etiquetas = [];
    let datosPreciosActuales = [];

    // Preparamos los datos para el gráfico
    // Un gráfico comparando el precio actual de cada tienda para cada modelo
    modelos.forEach(modelo => {
        modelo.tiendas.forEach(tienda => {
            // Etiqueta: "Samsung Q60C (Cetrogar)"
            etiquetas.push(`${modelo.marca.substring(0,3)}. ${modelo.modelo.substring(0,10)}... (${tienda.tienda.substring(0,4)}.)`);
            
            let precio = null; // null si no hay datos
            if (tienda.historial_precios && tienda.historial_precios.length > 0) {
                precio = tienda.historial_precios[tienda.historial_precios.length - 1].precio;
            }
            datosPreciosActuales.push(precio);
        });
    });

    new Chart(ctx, {
        type: 'bar', // Gráfico de barras
        data: {
            labels: etiquetas,
            datasets: [
                {
                    label: 'Precio Actual',
                    data: datosPreciosActuales,
                    backgroundColor: 'rgba(217, 83, 79, 0.6)',
                    borderColor: 'rgba(217, 83, 79, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            indexAxis: 'y', // Ponemos las barras en horizontal (mejor si son muchas)
            responsive: true,
            scales: {
                x: { // Eje X (precios)
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + new Intl.NumberFormat('es-AR').format(value);
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.x !== null) {
                                label += new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(context.parsed.x);
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
}
