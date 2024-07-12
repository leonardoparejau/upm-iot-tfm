// $ npm install qrcode
// $ npm install canvas

const QRCode = require('qrcode');
const fs = require('fs');
const { createCanvas, loadImage } = require('canvas'); // Required for image handling

// Function to generate QR code with image and text
async function generateQRCode() {
  try {
    // URL or text to encode into QR code
    const qrData = 'http://tx.lpareja.com/decode?txHash=0xe46b65ca504f699e20b60130708652a727b8fcea80666b5389c656f47348fbe6';

    // Load image to embed in QR code
    const img = await loadImage('./vechain.jpg'); // Replace './logo.png' with your image path

    const canvas = createCanvas(300, 300);
    const ctx = canvas.getContext('2d');

    // Generate QR code
    await QRCode.toCanvas(canvas, qrData, {
      errorCorrectionLevel: 'H', // High error correction level
      width: 300, // Width of the QR code
      margin: 1, // Margin around the QR code
      color: { dark: '#000000FF', light: '#FFFFFFFF' }, // Color options (dark and light)
      rendererOpts: {
        quality: 1.0 // Image quality (1.0 is default)
      }
    });

    // Draw logo (image) on QR code (centered)
    const logoSize = 140; // Size of the logo (adjust as needed)
    const logoX = (canvas.width - logoSize) / 2;
    const logoY = (canvas.height - logoSize) / 2;
    ctx.drawImage(img, logoX, logoY, logoSize, logoSize);

    // Save QR code as PNG file (optional)
    const qrCodeBuffer = canvas.toBuffer('image/png');
    fs.writeFileSync('./qrcode.png', qrCodeBuffer);

    console.log('QR code with logo only generated successfully!');
  } catch (err) {
    console.error('Error generating QR code with logo only:', err);
  }
}

// Call the function to generate QR code
generateQRCode();