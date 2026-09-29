#!/usr/bin/env node
import QRCode from "qrcode";

const url = process.argv[2] ?? "https://github.com/khawajad02-dev/hadx-labs-owner-app/releases/latest/download/app-release.apk";
const output = "assets/images/owner-app-download-qr.png";

await QRCode.toFile(output, url, { width: 512, margin: 2 });
console.log(`✅ Latest Owner App QR code saved to ${output}`);
console.log(`   Encoded URL: ${url}`);
