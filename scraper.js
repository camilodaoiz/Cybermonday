// Importar las librerías necesarias
const fs = require('fs');

// 1. Usar puppeteer-extra en lugar de puppeteer normal
const puppeteer = require('puppeteer-extra');

// 2. Cargar el plugin "stealth" (sigiloso)
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin()); // ¡La magia está aquí!

// La ruta a nuestra "base de datos"
const RUTA_JSON = './precios.json';

// Función para limpiar el texto del precio (quitar "$", ".", etc.)
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
  console.log('Iniciando scraping con MODO STEALTH...');
  
  const datosAntiguos = JSON.parse(fs.readFileSync(RUTA_JSON));
  const fechaActual = new Date().toISOString();
  let nuevosDatos = [];

  // 3. Iniciar el navegador "invisible"
  const browser = await puppeteer.launch({
      headless: true, // "true" para que sea invisible en el servidor
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
      
      // 4. Simular un navegador real (Viewport)
      await page.setViewport({ width: 1366, height: 768 });
      
      // No interceptamos peticiones, puede ser sospechoso
      
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36');
      
      try {
        // 5. Ir a la URL con más paciencia
        await page.goto(tienda.url, { waitUntil: 'load', timeout: 90000 }); // 90 segundos

        // 6. Esperar a que el selector del precio aparezca
        console.log(`--- Esperando el selector: ${tienda.selector_precio}`);
        await page.waitForSelector(tienda.selector_precio, { timeout: 15000 }); // 15 segundos

        // 7. Extraer el texto del precio
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
        
        // 8. ¡NUEVO! Tomar una captura de pantalla del error
        // Esto nos dirá si es un CAPTCHA
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
