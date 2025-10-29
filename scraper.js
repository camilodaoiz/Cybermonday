// Importar las librerías necesarias
const fs = require('fs');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

// La ruta a nuestra "base de datos"
const RUTA_JSON = './precios.json';

// Función para limpiar el texto del precio
function limpiarPrecio(textoPrecio) {
  if (!textoPrecio) return 0;
  return parseInt(
    textoPrecio
      .replace('$', '')
      .replace(/\./g, '') // Quita los puntos de miles
      .replace(',', '.') // Reemplaza coma decimal (si la hay)
      .replace(' ', '') // Quita espacios
      .trim()
  );
}

// Función principal del scraper
async function iniciarScraping() {
  console.log('Iniciando scraping con MODO GOOGLE BOT...');
  
  const datosAntiguos = JSON.parse(fs.readFileSync(RUTA_JSON));
  const fechaActual = new Date().toISOString();
  let nuevosDatos = [];

  // 1. Iniciar el navegador con la nueva opción 'headless: "new"'
  const browser = await puppeteer.launch({
      headless: "new", // <-- ¡ARREGLADO EL WARNING!
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--single-process'
      ]
  });

  // Iterar sobre cada MODELO
  for (const modelo of datosAntiguos) {
    console.log(`Procesando modelo: ${modelo.marca} ${modelo.modelo}`);
    let nuevasTiendas = []; 

    // Iterar sobre cada TIENDA dentro del modelo
    for (const tienda of modelo.tiendas) {
      console.log(`--- Verificando tienda: ${tienda.tienda} (${tienda.url})`);
      const page = await browser.newPage();
      
      await page.setViewport({ width: 1366, height: 768 });
      
      // 2. ¡EL GRAN CAMBIO! Nos disfrazamos de Google Bot
      await page.setUserAgent('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)');
      
      try {
        await page.goto(tienda.url, { waitUntil: 'load', timeout: 90000 }); // 90 segundos

        console.log(`--- Esperando el selector: ${tienda.selector_precio}`);
        await page.waitForSelector(tienda.selector_precio, { timeout: 15000 }); // 15 segundos

        const textoPrecio = await page.$eval(tienda.selector_precio, (el) => el.textContent);
        const precioActual = limpiarPrecio(textoPrecio);

        console.log(`--- ¡ÉXITO! Precio encontrado: $${precioActual}`);

        if (!tienda.historial_precios) {
          tienda.historial_precios = [];
        }
        tienda.historial_precios.push({
          fecha: fechaActual,
          precio: precioActual,
        });

      } catch (error) {
        console.error(`--- ERROR al procesar ${tienda.tienda} (${tienda.url}): ${error.message}`);
        
        const screenshotPath = `error-${tienda.tienda}-${Date.now()}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`--- Captura de pantalla del error guardada en: ${screenshotPath}`);

      }
      
      nuevasTiendas.push(tienda);
      await page.close();
    }

    nuevosDatos.push({
      ...modelo,
      tiendas: nuevasTiendas
    });
  }

  await browser.close();

  fs.writeFileSync(RUTA_JSON, JSON.stringify(nuevosDatos, null, 2));
  console.log('Scraping finalizado. Archivo precios.json actualizado.');
}

// Ejecutar la función
iniciarScraping();
