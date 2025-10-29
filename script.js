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
    contenedorLista.innerHTML = ''; // Limpia el contenedor

    televisores.forEach(tv => {
        // Crea un elemento HTML para cada TV
        const itemDiv = document.createElement('div');
        itemDiv.className = 'tv-item';

        // Define el HTML interno del elemento
        let htmlPrecioOferta;
        if (tv.precio_oferta > 0 && tv.precio_oferta < tv.precio_antes) {
            // Si hay oferta válida
            htmlPrecioOferta = `<span class="precio-oferta">$${tv.precio_oferta}</span>`;
        } else {
            // Si aún no hay oferta
            htmlPrecioOferta = `<span class="sin-oferta">(Sin oferta aún)</span>`;
        }

        itemDiv.innerHTML = `
            <div class="modelo">${tv.marca} - ${tv.modelo}</div>
            <div class="marca">Tienda: ${tv.tienda}</div>
            <div class="precios">
                <span class="precio-antes">Antes: $${tv.precio_antes}</span>
                ${htmlPrecioOferta}
            </div>
        `;

        // Añade el elemento a la lista
        contenedorLista.appendChild(itemDiv);
    });
}

// Función para mostrar el gráfico (con Chart.js)
function mostrarGrafico(televisores) {
    const ctx = document.getElementById('graficoPrecios').getContext('2d');

    // Prepara los datos para el gráfico
    const etiquetas = televisores.map(tv => `${tv.marca} ${tv.modelo.substring(0, 10)}...`); // Nombres cortos
    const datosPrecioAntes = televisores.map(tv => tv.precio_antes);
    const datosPrecioOferta = televisores.map(tv => tv.precio_oferta > 0 ? tv.precio_oferta : null); // Muestra null si no hay oferta

    // Crea el gráfico
    new Chart(ctx, {
        type: 'bar', // Tipo de gráfico: barras
        data: {
            labels: etiquetas,
            datasets: [
                {
                    label: 'Precio Antes',
                    data: datosPrecioAntes,
                    backgroundColor: 'rgba(150, 150, 150, 0.6)', // Gris
                    borderColor: 'rgba(150, 150, 150, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Precio Oferta (Black Friday)',
                    data: datosPrecioOferta,
                    backgroundColor: 'rgba(217, 83, 79, 0.6)', // Rojo
                    borderColor: 'rgba(217, 83, 79, 1)',
                    borderWidth: 1
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
