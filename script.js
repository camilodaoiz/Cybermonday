document.addEventListener("DOMContentLoaded", () => {
    cargarDatosPrecios();
});

async function cargarDatosPrecios() {
    try {
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

    const marcas = [...new Set(modelos.map(m => m.marca))].sort();
    
    marcas.forEach(marca => {
        const tituloMarca = document.createElement('h2');
        tituloMarca.className = 'titulo-marca';
        tituloMarca.textContent = marca;
        contenedorLista.appendChild(tituloMarca);
        
        const modelosDeMarca = modelos.filter(m => m.marca === marca);

        modelosDeMarca.forEach(modelo => {
            const modeloDiv = document.createElement('div');
            modeloDiv.className = 'modelo-item';
            
            let htmlTiendas = ''; 
            
            // Ordenar tiendas por el precio de AHORA
            const tiendasOrdenadas = modelo.tiendas.sort((a, b) => {
                return (a.precio_ahora || Infinity) - (b.precio_ahora || Infinity);
            });

            tiendasOrdenadas.forEach(tienda => {
                const precioAntes = tienda.precio_antes || 0;
                const precioAhora = tienda.precio_ahora || 0;

                let htmlPrecios = '';
                let clasePrecioAhora = 'precio-igual';

                if (precioAhora > 0 && precioAhora < precioAntes) {
                    clasePrecioAhora = 'precio-bajo'; // Verde
                } else if (precioAhora > 0 && precioAhora > precioAntes) {
                    clasePrecioAhora = 'precio-subio'; // Rojo
                } else if (precioAhora <= 0) {
                    clasePrecioAhora = 'sin-datos';
                }

                // Genera el HTML para los precios
                if (precioAntes > 0) {
                     htmlPrecios = `<span class="precio-antes">Antes: $${new Intl.NumberFormat('es-AR').format(precioAntes)}</span>`;
                }
                
                if (precioAhora > 0) {
                    htmlPrecios += `<span class="${clasePrecioAhora}">Ahora: $${new Intl.NumberFormat('es-AR').format(precioAhora)}</span>`;
                } else {
                     htmlPrecios += `<span class="sin-datos">(Sin precio CyberMonday)</span>`;
                }

                // Genera el HTML de la tienda
                htmlTiendas += `
                    <li class="tienda-precio">
                        <a href="${tienda.url}" target="_blank">${tienda.tienda}</a>
                        <div class="precios-comparativa">
                            ${htmlPrecios}
                        </div>
                    </li>
                `;
            });

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
    contenedorGrafico.innerHTML = ''; 
    
    const newCanvas = document.createElement('canvas');
    newCanvas.id = 'graficoPrecios';
    contenedorGrafico.appendChild(newCanvas);
    const ctx = newCanvas.getContext('2d');
    
    let etiquetas = [];
    let datosPreciosAntes = [];
    let datosPreciosAhora = [];

    // Preparamos los datos para el gráfico
    modelos.forEach(modelo => {
        modelo.tiendas.forEach(tienda => {
            etiquetas.push(`${modelo.modelo.substring(0,10)}... (${tienda.tienda})`);
            datosPreciosAntes.push(tienda.precio_antes || null);
            datosPreciosAhora.push(tienda.precio_ahora || null);
        });
    });

    new Chart(ctx, {
        type: 'bar', // Gráfico de barras
        data: {
            labels: etiquetas,
            datasets: [
                {
                    label: 'Precio Antes',
                    data: datosPreciosAntes,
                    backgroundColor: 'rgba(150, 150, 150, 0.6)',
                    borderColor: 'rgba(150, 150, 150, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Precio CyberMonday',
                    data: datosPreciosAhora,
                    backgroundColor: 'rgba(217, 83, 79, 0.6)',
                    borderColor: 'rgba(217, 83, 79, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            indexAxis: 'y', // Barras horizontales
            responsive: true,
            scales: {
                x: { 
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
