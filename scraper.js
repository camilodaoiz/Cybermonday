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
      .replace(',', '.') // Reemplaza coma decimal (si la hay)
      .trim()
  );
}

// Función principal del scraper
async function iniciarScraping() {
  console.log('Iniciando scraping...');

  // 1. Leer los productos que queremos rastrear
  const datosAntiguos = JSON.parse(fs.readFileSync(RUTA_JSON));
  const fechaActual = new Date().toISOString();
  let nuevosDatos = [];

  // 2. Iniciar el navegador "invisible"
  // Opciones para que funcione en GitHub Actions
  const browser = await puppeteer.launch({
      headless: true, // "true" para que sea invisible
      args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // 3. Procesar cada TV de nuestra lista
  for (const tv of datosAntiguos) {
    console.log(`Procesando: ${tv.marca} ${tv.modelo} de ${tv.tienda}`);
    const page = await browser.newPage();

    // Evitar cargar imágenes/CSS para ir más rápido
    await page.setRequestInterception(true);
    page.on('request', (req) => {
        if(['image', 'stylesheet', 'font'].includes(req.resourceType())){
            req.abort();
        } else {
            req.continue();
        }
    });

    // Poner un User-Agent de navegador real para evitar bloqueos
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

    try {
      // 4. Ir a la URL del producto
      await page.goto(tv.url, { waitUntil: 'networkidle2', timeout: 60000 }); // Espera 60s

      // 5. Esperar a que el selector del precio aparezca
      await page.waitForSelector(tv.selector_precio, { timeout: 10000 });

      // 6. Extraer el texto del precio
      const textoPrecio = await page.$eval(tv.selector_precio, (el) => el.textContent);
      const precioActual = limpiarPrecio(textoPrecio);

      console.log(`Precio encontrado: $${precioActual}`);

      // 7. Añadir el nuevo precio al historial
      tv.historial_precios.push({
        fecha: fechaActual,
        precio: precioActual,
      });

    } catch (error) {
      console.error(`Error al procesar ${tv.url}: ${error.message}`);
      // Si falla, igualmente añadimos el producto a la lista para no perderlo
      // (Podrías añadir un precio de '0' o 'null' para marcar el error)
    }

    nuevosDatos.push(tv);
    await page.close();
  }

  // 8. Cerrar el navegador
  await browser.close();

  // 9. Guardar el archivo JSON actualizado
  fs.writeFileSync(RUTA_JSON, JSON.stringify(nuevosDatos, null, 2));
  console.log('Scraping finalizado. Archivo precios.json actualizado.');
}

// Ejecutar la función
iniciarScraping();
