// Espera a que todo el contenido del HTML esté cargado
document.addEventListener("DOMContentLoaded", () => {
    // Llama a la función principal para cargar los datos
    cargarDatosPrecios();
});

// Función asíncrona para cargar los datos desde el archivo JSON
async function cargarDatosPrecios() {
    try {
        // 1. Carga los datos del archivo precios.json
        const response = await fetch('precios.json');
        if (!response.ok) {
            throw new Error('No se pudo cargar precios.json');
        }
        const televisores = await response.json();

        // 2. Llama a las funciones para mostrar los datos
        mostrarListaPrecios(televisores);
        mostrarGrafico(televisores);

    } catch (error) {
        console.error("Error al cargar los datos:", error);
        document.getElementById('lista-precios').innerHTML = "<p>Error al cargar los datos.</p>";
    }
}

// Función para mostrar los precios en formato de lista (números)
function mostrarListaPrecios(televisores) {
    const contenedorLista = document.getElementById('lista-precios');
    contenedorLista.innerHTML = ''; 
    
    // 1. Agrupar por marca (como pediste)
    const marcas = [...new Set(televisores.map(tv => tv.marca))]; // Lista única de marcas
    
    marcas.forEach(marca => {
        // Añade un título para la marca
        const tituloMarca = document.createElement('h2');
        tituloMarca.textContent = marca;
        contenedorLista.appendChild(tituloMarca);
        
        // Filtra los televisores de esta marca
        const tvsDeMarca = televisores.filter(tv => tv.marca === marca);

        tvsDeMarca.forEach(tv => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'tv-item';

            // 2. Extraer precios del historial
            const historial = tv.historial_precios;
            const precioOriginal = historial[0].precio; // El primer precio que guardamos
            const precioActual = historial[historial.length - 1].precio; // El último precio
            
            let htmlPrecio;
            if (precioActual < precioOriginal) {
                // Hay oferta
                htmlPrecio = `
                    <span class="precio-antes">Antes: $${precioOriginal}</span>
                    <span class="precio-oferta">Ahora: $${precioActual}</span>
                `;
            } else {
                // El precio es igual o subió
                htmlPrecio = `<span class="precio-actual">Precio: $${precioActual}</span>`;
            }

            itemDiv.innerHTML = `
                <div class="modelo">${tv.marca} - ${tv.modelo} (<a href="${tv.url}" target="_blank">${tv.tienda}</a>)</div>
                <div class="precios">
                    ${htmlPrecio}
                </div>
            `;
            contenedorLista.appendChild(itemDiv);
        });
    });
}

function mostrarGrafico(televisores) {
    const ctx = document.getElementById('graficoPrecios').getContext('2d');

    // 3. Preparar datos del historial para el gráfico
    const etiquetas = televisores.map(tv => `${tv.marca} ${tv.modelo.substring(0, 10)}...`);
    const datosPrecioOriginal = televisores.map(tv => tv.historial_precios[0].precio);
    const datosPrecioActual = televisores.map(tv => tv.historial_precios[tv.historial_precios.length - 1].precio);

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: etiquetas,
            datasets: [
                {
                    label: 'Precio Original (Referencia)',
                    data: datosPrecioOriginal,
                    backgroundColor: 'rgba(150, 150, 150, 0.6)',
                },
                {
                    label: 'Precio Actual',
                    data: datosPrecioActual,
                    backgroundColor: 'rgba(217, 83, 79, 0.6)',
                }
            ]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        // Formatear el eje Y como dinero
                        callback: function(value) {
                            return '$' + value;
                        }
                    }
                }
            },
            responsive: true,
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
                            if (context.parsed.y !== null) {
                                label += new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD' }).format(context.parsed.y);
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
}
