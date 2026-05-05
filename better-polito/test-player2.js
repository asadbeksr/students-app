const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  
  await page.goto('http://localhost:3000/test-manim');
  
  // Inject console.log into the iframe
  await new Promise(r => setTimeout(r, 2000));
  const iframeElement = await page.$('iframe');
  const frame = await iframeElement.contentFrame();
  
  await frame.evaluate(() => {
    window.tOffsets = [];
    window.dts = [];
    const originalGoAround = dot.updaters[0];
    dot.updaters[0] = (mob, dt) => {
      window.tOffsets.push(tOffset);
      window.dts.push(dt);
      originalGoAround(mob, dt);
    };
  }).catch(e => console.error(e));

  await new Promise(r => setTimeout(r, 2000));
  
  const stats = await frame.evaluate(() => {
    return {
      tOffsets: window.tOffsets,
      dts: window.dts
    };
  }).catch(e => console.error(e));
  
  console.log(stats);
  await browser.close();
})();
