// Importar las librerías necesarias
const puppeteer = require('puppeteer');
const fs = require('fs');

// La ruta a nuestra "base de datos"
const RUTA_JSON = './precios.json';

// Función para limpiar el texto del precio (quitar "$", ".", etc.)
function limpiarPrecio(textoPrecio) {
  if (!textoPrecio) return 0;
  // Esto es específico para Argentina, ajusta según sea necesario
  return parseInt(
    textoPrecio
      .replace('$', '')
      .replace(/\./g, '') // Quita los puntos de miles
      .replace(',','.') // Reemplaza coma decimal (si la hay)
      .replace(' ', '') // Quita espacios
      .trim()
  );
}

// Función principal del scraper
async function iniciarScraping() {
  console.log('Iniciando scraping...');
  
  // 1. Leer los modelos que queremos rastrear
  const datosAntiguos = JSON.parse(fs.readFileSync(RUTA_JSON));
  const fechaActual = new Date().toISOString();
  let nuevosDatos = []; // Esta será la nueva lista de modelos

  // 2. Iniciar el navegador "invisible"
  const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // 3. Bucle 1: Iterar sobre cada MODELO
  for (const modelo of datosAntiguos) {
    console.log(`Procesando modelo: ${modelo.marca} ${modelo.modelo}`);
    let nuevasTiendas = []; // Array para guardar las tiendas actualizadas

    // 4. Bucle 2: Iterar sobre cada TIENDA dentro del modelo
    for (const tienda of modelo.tiendas) {
      console.log(`--- Verificando tienda: ${tienda.tienda}`);
      const page = await browser.newPage();
      
      await page.setRequestInterception(true);
      page.on('request', (req) => {
          if(['image', 'stylesheet', 'font'].includes(req.resourceType())){
              req.abort();
          } else {
              req.continue();
          }
      });
      
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      try {
        // 5. Ir a la URL de la tienda para este producto
        await page.goto(tienda.url, { waitUntil: 'networkidle2', timeout: 60000 });

        // 6. Esperar a que el selector del precio aparezca
        await page.waitForSelector(tienda.selector_precio, { timeout: 10000 });

        // 7. Extraer el texto del precio
        const textoPrecio = await page.$eval(tienda.selector_precio, (el) => el.textContent);
        const precioActual = limpiarPrecio(textoPrecio);

        console.log(`--- Precio encontrado: $${precioActual}`);

        // 8. Añadir el nuevo precio al historial de ESTA TIENDA
        if (!tienda.historial_precios) {
          tienda.historial_precios = []; // Inicializar si no existe
        }
        tienda.historial_precios.push({
          fecha: fechaActual,
          precio: precioActual,
        });

      } catch (error) {
        console.error(`Error al procesar ${tienda.url}: ${error.message}`);
        // Si falla, no se añade nuevo precio, pero la tienda y su historial viejo se conservan
      }
      
      nuevasTiendas.push(tienda); // Añadir la tienda (actualizada o no)
      await page.close();
    }

    // 9. Actualizar el objeto "modelo" con su lista de "tiendas" actualizada
    nuevosDatos.push({
      ...modelo, // Copia las propiedades (marca, modelo, etc.)
      tiendas: nuevasTiendas // Sobrescribe con las tiendas actualizadas
    });
  }

  // 10. Cerrar el navegador
  await browser.close();

  // 11. Guardar el archivo JSON actualizado
  fs.writeFileSync(RUTA_JSON, JSON.stringify(nuevosDatos, null, 2));
  console.log('Scraping finalizado. Archivo precios.json actualizado.');
}

// Ejecutar la función
iniciarScraping();
