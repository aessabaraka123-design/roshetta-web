const { Jimp } = require('jimp');

async function processImage() {
  try {
    const image = await Jimp.read('web/public/logo.png');
    
    // Autocrop removes borders of the same color (default is to check top-left pixel)
    // Since our top-left pixel is transparent, it will remove all transparent borders!
    image.autocrop();

    await image.write('web/public/logo.png');
    await image.write('web/src/app/icon.png');
    console.log("Images autocropped successfully.");
  } catch (err) {
    console.error(err);
  }
}

processImage();
