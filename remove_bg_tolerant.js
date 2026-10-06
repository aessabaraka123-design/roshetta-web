const { Jimp } = require('jimp');

async function processImage() {
  try {
    const image = await Jimp.read('C:/Users/XPRISTO/.gemini/antigravity/brain/f491e9ed-3623-45fa-867c-9ec3cd7b2209/.user_uploaded/media_1791190709723.jpg');
    
    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
      const r = this.bitmap.data[idx + 0];
      const g = this.bitmap.data[idx + 1];
      const b = this.bitmap.data[idx + 2];
      
      // If the pixel is close to white, make it transparent
      if (r > 210 && g > 210 && b > 210) {
        this.bitmap.data[idx + 3] = 0; // Alpha
      }
    });

    await image.write('web/public/logo.png');
    await image.write('web/src/app/icon.png');
    console.log("Images saved with higher transparency tolerance.");
  } catch (err) {
    console.error(err);
  }
}

processImage();
