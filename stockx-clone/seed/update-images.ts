import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Update product images in the database without re-seeding.
 * Maps product SKUs to their new local image paths.
 */
const IMAGE_MAP: Record<string, string[]> = {
  "CT1685-100": ["/images/air-max-90-infrared.webp"],
  "HQ4540": ["/images/yeezy-350-v2-onyx.webp"],
  "DZ5485-612": ["/images/jordan-1-chicago.webp"],
  "BB550WT1": ["/images/nb-550-white-green.webp"],
  "DD1391-100": ["/images/dunk-low-panda.webp"],
  "SUP-BOGO-NVY": ["/images/supreme-bogo-navy.webp"],
  "FOG-ESS-OAT": ["/images/essentials-hoodie-oatmeal.webp"],
  "STU-INT-BLK": ["/images/stussy-intl-tee-black.webp"],
  "BAPE-SHARK-BLK": ["/images/bape-shark-hoodie.webp"],
  "CFI-1215A": ["/images/ps5-console.webp"],
  "MTJV3AM/A": ["/images/airpods-pro-2.webp"],
  "VALVE-SD-OLED": ["/images/steam-deck-oled.webp"],
  "NV-4090-FE": ["/images/rtx-4090-fe.webp"],
};

async function main() {
  console.log("Updating product images...");

  for (const [sku, images] of Object.entries(IMAGE_MAP)) {
    const result = await prisma.product.updateMany({
      where: { sku },
      data: { images },
    });
    console.log(`  ${sku}: ${result.count} updated`);
  }

  console.log("Done!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
