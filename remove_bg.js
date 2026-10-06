const { Jimp, rgbaToInt, intToRGBA } = require('jimp');

async function processImage() {
  try {
    const image = await Jimp.read('C:/Users/XPRISTO/.gemini/antigravity/brain/f491e9ed-3623-45fa-867c-9ec3cd7b2209/.user_uploaded/media_1791190709723.jpg');
    
    // We want to remove the white-ish background.
    // The background is likely anything very light.
    // We will scan all pixels.
    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
      const red = this.bitmap.data[idx + 0];
      const green = this.bitmap.data[idx + 1];
      const blue = this.bitmap.data[idx + 2];
      
      // If the pixel is very light (e.g., r,g,b > 240)
      if (red > 240 && green > 240 && blue > 240) {
        // Set alpha to 0 (transparent)
        this.bitmap.data[idx + 3] = 0;
      }
    });

    // Save as PNG
    await image.write('web/src/app/icon.png');
    await image.write('web/public/logo.png');
    console.log("Images saved successfully.");
  } catch (err) {
    console.error(err);
  }
}

processImage();
