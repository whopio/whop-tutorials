import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PRODUCTS = [
  // Sneakers
  {
    name: "Air Max 90 OG Infrared",
    brand: "Nike",
    sku: "CT1685-100",
    description: "The classic Air Max 90 returns in its original infrared colorway. Mesh and leather upper with visible Air cushioning.",
    images: ["/images/air-max-90-infrared.webp"],
    category: "Sneakers",
    retailPrice: 140,
  },
  {
    name: "Yeezy Boost 350 V2 Onyx",
    brand: "Adidas",
    sku: "HQ4540",
    description: "The Yeezy Boost 350 V2 in a sleek all-black Onyx colorway. Primeknit upper with Boost midsole.",
    images: ["/images/yeezy-350-v2-onyx.webp"],
    category: "Sneakers",
    retailPrice: 230,
  },
  {
    name: 'Air Jordan 1 Retro High OG "Chicago"',
    brand: "Nike",
    sku: "DZ5485-612",
    description: "The iconic Air Jordan 1 in the Chicago colorway. Premium leather upper in red, white, and black.",
    images: ["/images/jordan-1-chicago.webp"],
    category: "Sneakers",
    retailPrice: 180,
  },
  {
    name: "New Balance 550 White Green",
    brand: "New Balance",
    sku: "BB550WT1",
    description: "Retro basketball-inspired sneaker with leather upper and classic NB branding in white and green.",
    images: ["/images/nb-550-white-green.webp"],
    category: "Sneakers",
    retailPrice: 110,
  },
  {
    name: "Dunk Low Panda",
    brand: "Nike",
    sku: "DD1391-100",
    description: "The Nike Dunk Low in the viral black and white Panda colorway. Leather upper with padded collar.",
    images: ["/images/dunk-low-panda.webp"],
    category: "Sneakers",
    retailPrice: 110,
  },
  // Streetwear
  {
    name: "Box Logo Hoodie Navy",
    brand: "Supreme",
    sku: "SUP-BOGO-NVY",
    description: "The iconic Supreme Box Logo hoodie in navy. Heavyweight fleece with embroidered logo.",
    images: ["/images/supreme-bogo-navy.webp"],
    category: "Streetwear",
    retailPrice: 168,
  },
  {
    name: "Essentials Hoodie Dark Oatmeal",
    brand: "Fear of God",
    sku: "FOG-ESS-OAT",
    description: "Fear of God Essentials oversized hoodie in dark oatmeal. Heavyweight cotton blend with front logo.",
    images: ["/images/essentials-hoodie-oatmeal.webp"],
    category: "Streetwear",
    retailPrice: 90,
  },
  {
    name: "Stussy International Tee Black",
    brand: "Stussy",
    sku: "STU-INT-BLK",
    description: "Classic Stussy graphic tee with International print. 100% cotton.",
    images: ["/images/stussy-intl-tee-black.webp"],
    category: "Streetwear",
    retailPrice: 45,
  },
  {
    name: "BAPE Shark Full Zip Hoodie",
    brand: "A Bathing Ape",
    sku: "BAPE-SHARK-BLK",
    description: "Iconic BAPE Shark hoodie with full zip and camo print hood lining.",
    images: ["/images/bape-shark-hoodie.webp"],
    category: "Streetwear",
    retailPrice: 450,
  },
  // Electronics
  {
    name: "PlayStation 5 Console",
    brand: "Sony",
    sku: "CFI-1215A",
    description: "Sony PlayStation 5 disc edition console. Ultra-high speed SSD and 4K gaming.",
    images: ["/images/ps5-console.webp"],
    category: "Electronics",
    retailPrice: 499,
  },
  {
    name: "AirPods Pro 2nd Gen",
    brand: "Apple",
    sku: "MTJV3AM/A",
    description: "Apple AirPods Pro with USB-C, active noise cancellation, and adaptive transparency.",
    images: ["/images/airpods-pro-2.webp"],
    category: "Electronics",
    retailPrice: 249,
  },
  {
    name: "Steam Deck OLED 512GB",
    brand: "Valve",
    sku: "VALVE-SD-OLED",
    description: "Portable PC gaming handheld with vibrant OLED display and 512GB storage.",
    images: ["/images/steam-deck-oled.webp"],
    category: "Electronics",
    retailPrice: 549,
  },
  {
    name: "RTX 4090 Founders Edition",
    brand: "NVIDIA",
    sku: "NV-4090-FE",
    description: "NVIDIA GeForce RTX 4090 Founders Edition graphics card. 24GB GDDR6X.",
    images: ["/images/rtx-4090-fe.webp"],
    category: "Electronics",
    retailPrice: 1599,
  },
  // Collectibles
  {
    name: 'KAWS Companion Figure "Open Edition" Grey',
    brand: "KAWS",
    sku: "KAWS-COMP-GRY",
    description: "KAWS Companion vinyl figure in grey. Open edition, 11 inches tall.",
    images: ["https://placehold.co/600x600/1a1a2e/a8a8a8?text=KAWS"],
    category: "Collectibles",
    retailPrice: 320,
  },
  {
    name: "BE@RBRICK 1000% Sorayama Sexy Robot",
    brand: "Medicom",
    sku: "MED-BEAR-1000",
    description: "Medicom BE@RBRICK 1000% in collaboration with Hajime Sorayama. Chrome finish.",
    images: ["https://placehold.co/600x600/1a1a2e/c0c0c0?text=BEARBRICK"],
    category: "Collectibles",
    retailPrice: 750,
  },
  {
    name: "LEGO Star Wars Millennium Falcon",
    brand: "LEGO",
    sku: "LEGO-75192",
    description: "Ultimate Collector Series Millennium Falcon. 7,541 pieces.",
    images: ["https://placehold.co/600x600/1a1a2e/ffd93d?text=LEGO+Falcon"],
    category: "Collectibles",
    retailPrice: 849,
  },
  // Accessories
  {
    name: "Casio G-Shock DW5600 Black",
    brand: "Casio",
    sku: "DW5600E-1V",
    description: "Classic Casio G-Shock digital watch in black. Shock resistant, 200m water resistant.",
    images: ["https://placehold.co/600x600/1a1a2e/333333?text=G-Shock"],
    category: "Accessories",
    retailPrice: 70,
  },
  {
    name: "The North Face Nuptse 700 Black",
    brand: "The North Face",
    sku: "TNF-NUPTSE-BLK",
    description: "Classic 700 fill goose down Nuptse jacket in black. Recycled materials.",
    images: ["https://placehold.co/600x600/1a1a2e/444444?text=Nuptse"],
    category: "Accessories",
    retailPrice: 330,
  },
  {
    name: "Carhartt WIP Acrylic Watch Hat Black",
    brand: "Carhartt WIP",
    sku: "CW-WATCH-BLK",
    description: "Carhartt WIP knit beanie in rib-knit acrylic. One size fits most.",
    images: ["https://placehold.co/600x600/1a1a2e/8b6914?text=Carhartt"],
    category: "Accessories",
    retailPrice: 25,
  },
  // Trading Cards
  {
    name: "Pokemon Base Set Charizard Holo PSA 9",
    brand: "Pokemon",
    sku: "PKMN-BS-CHAR-9",
    description: "1st Edition Base Set Charizard holographic card. PSA graded 9 Mint condition.",
    images: ["https://placehold.co/600x600/1a1a2e/ff6347?text=Charizard"],
    category: "Trading Cards",
    retailPrice: 0,
  },
  {
    name: "Topps Chrome Luka Doncic RC PSA 10",
    brand: "Topps",
    sku: "TOP-LUKA-RC10",
    description: "2018-19 Topps Chrome Luka Doncic rookie card. PSA 10 Gem Mint.",
    images: ["https://placehold.co/600x600/1a1a2e/0078d4?text=Luka+RC"],
    category: "Trading Cards",
    retailPrice: 0,
  },
  {
    name: "Yu-Gi-Oh! Blue-Eyes White Dragon LOB PSA 8",
    brand: "Konami",
    sku: "YGO-BEWD-LOB8",
    description: "Legend of Blue Eyes White Dragon 1st edition Blue-Eyes White Dragon. PSA 8 Near Mint.",
    images: ["https://placehold.co/600x600/1a1a2e/87ceeb?text=Blue+Eyes"],
    category: "Trading Cards",
    retailPrice: 0,
  },
];

const SNEAKER_SIZES = ["4", "4.5", "5", "5.5", "6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10", "10.5", "11", "11.5", "12", "13"];
const CLOTHING_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
const ELECTRONICS_SIZES = ["One Size"];
const COLLECTIBLE_SIZES = ["One Size"];
const CARD_SIZES = ["One Size"];

function getSizesForCategory(category: string): string[] {
  switch (category) {
    case "Sneakers": return SNEAKER_SIZES.slice(4, 14); // sizes 6-10.5
    case "Streetwear": return CLOTHING_SIZES;
    case "Electronics": return ELECTRONICS_SIZES;
    case "Collectibles": return COLLECTIBLE_SIZES;
    case "Accessories": return CLOTHING_SIZES.slice(0, 4); // XS-L
    case "Trading Cards": return CARD_SIZES;
    default: return ["One Size"];
  }
}

function randomBetween(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function generatePriceData(retailPrice: number) {
  const baseMultiplier = 0.8 + Math.random() * 0.8; // 0.8x to 1.6x retail
  const base = Math.max(retailPrice * baseMultiplier, 20);
  const lowestAsk = Math.round(base + randomBetween(5, 30));
  const highestBid = Math.round(base - randomBetween(5, 30));
  const lastSalePrice = Math.round(base + randomBetween(-15, 15));
  const salesCount = Math.floor(Math.random() * 50) + 1;
  return { lowestAsk, highestBid: Math.max(highestBid, 1), lastSalePrice, salesCount };
}

async function main() {
  console.log("Seeding database...");

  // Clean existing data
  await prisma.notification.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.trade.deleteMany();
  await prisma.bid.deleteMany();
  await prisma.ask.deleteMany();
  await prisma.productSize.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();

  // Create demo users (sequential to avoid connection pool limits)
  const users = [];
  const userData = [
    { whopId: "usr_demo_001", email: "alex@example.com", username: "alexsneakers", displayName: "Alex Chen", role: "USER" as const },
    { whopId: "usr_demo_002", email: "jordan@example.com", username: "jordancollector", displayName: "Jordan Smith", role: "SELLER" as const },
    { whopId: "usr_demo_003", email: "sam@example.com", username: "samtrader", displayName: "Sam Williams", role: "USER" as const },
    { whopId: "usr_demo_004", email: "maya@example.com", username: "mayareseller", displayName: "Maya Johnson", role: "SELLER" as const },
    { whopId: "usr_demo_005", email: "admin@example.com", username: "admin", displayName: "Admin", role: "ADMIN" as const },
  ];
  for (const data of userData) {
    users.push(await prisma.user.create({ data }));
  }

  console.log(`Created ${users.length} users`);

  // Create products with sizes
  const createdProducts = [];
  for (const productData of PRODUCTS) {
    const product = await prisma.product.create({
      data: {
        name: productData.name,
        brand: productData.brand,
        sku: productData.sku,
        description: productData.description,
        images: productData.images,
        category: productData.category,
        retailPrice: productData.retailPrice,
      },
    });

    const productSizes = getSizesForCategory(productData.category);
    const sizes = [];
    for (const size of productSizes) {
      const priceData = generatePriceData(
        productData.retailPrice > 0 ? productData.retailPrice : 200
      );
      const productSize = await prisma.productSize.create({
        data: {
          productId: product.id,
          size,
          lowestAsk: priceData.lowestAsk,
          highestBid: priceData.highestBid,
          lastSalePrice: priceData.lastSalePrice,
          salesCount: priceData.salesCount,
        },
      });
      sizes.push(productSize);
    }

    createdProducts.push({ product, sizes });
  }

  console.log(`Created ${createdProducts.length} products`);

  // Create bids and asks
  let bidCount = 0;
  let askCount = 0;

  for (const { sizes } of createdProducts) {
    for (const size of sizes) {
      // Create 2-4 bids per size
      const numBids = Math.floor(Math.random() * 3) + 2;
      for (let i = 0; i < numBids; i++) {
        const user = users[Math.floor(Math.random() * 4)]; // exclude admin
        const bidPrice = Math.round(
          (size.highestBid ?? 100) - randomBetween(0, 30)
        );
        if (bidPrice < 1) continue;

        await prisma.bid.create({
          data: {
            userId: user.id,
            productSizeId: size.id,
            price: bidPrice,
            status: "ACTIVE",
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        });
        bidCount++;
      }

      // Create 2-4 asks per size
      const numAsks = Math.floor(Math.random() * 3) + 2;
      for (let i = 0; i < numAsks; i++) {
        const user = users[Math.floor(Math.random() * 4)];
        const askPrice = Math.round(
          (size.lowestAsk ?? 150) + randomBetween(0, 30)
        );

        await prisma.ask.create({
          data: {
            userId: user.id,
            productSizeId: size.id,
            price: askPrice,
            status: "ACTIVE",
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        });
        askCount++;
      }
    }
  }

  console.log(`Created ${bidCount} bids and ${askCount} asks`);

  // Create historical trades
  let tradeCount = 0;
  for (const { sizes } of createdProducts.slice(0, 10)) {
    for (const size of sizes.slice(0, 3)) {
      const numTrades = Math.floor(Math.random() * 4) + 1;
      for (let i = 0; i < numTrades; i++) {
        const buyer = users[Math.floor(Math.random() * 4)];
        let seller = users[Math.floor(Math.random() * 4)];
        while (seller.id === buyer.id) {
          seller = users[Math.floor(Math.random() * 4)];
        }

        const tradePrice = Math.round(
          (size.lastSalePrice ?? 150) + randomBetween(-20, 20)
        );
        const platformFee = Math.round(tradePrice * 0.095 * 100) / 100;

        // Create matched bid and ask for trade
        const daysAgo = Math.floor(Math.random() * 90) + 1;
        const tradeDate = new Date(
          Date.now() - daysAgo * 24 * 60 * 60 * 1000
        );

        const bid = await prisma.bid.create({
          data: {
            userId: buyer.id,
            productSizeId: size.id,
            price: tradePrice,
            status: "MATCHED",
            createdAt: tradeDate,
          },
        });

        const ask = await prisma.ask.create({
          data: {
            userId: seller.id,
            productSizeId: size.id,
            price: tradePrice,
            status: "MATCHED",
            createdAt: tradeDate,
          },
        });

        await prisma.trade.create({
          data: {
            buyerId: buyer.id,
            sellerId: seller.id,
            productSizeId: size.id,
            bidId: bid.id,
            askId: ask.id,
            price: tradePrice,
            platformFee,
            status: "DELIVERED",
            createdAt: tradeDate,
          },
        });
        tradeCount++;
      }
    }
  }

  console.log(`Created ${tradeCount} trades`);

  // Create sample notifications
  const notificationData = [
    {
      userId: users[0].id,
      type: "BID_MATCHED" as const,
      title: "Bid Matched!",
      message: "Your bid for Air Max 90 OG Infrared (Size 9) was matched at $155.",
    },
    {
      userId: users[0].id,
      type: "TRADE_COMPLETED" as const,
      title: "Trade Completed",
      message: "Your purchase of Dunk Low Panda has been delivered.",
    },
    {
      userId: users[1].id,
      type: "ASK_MATCHED" as const,
      title: "Ask Matched!",
      message: "Your ask for Yeezy Boost 350 V2 (Size 10) was matched at $245.",
    },
    {
      userId: users[1].id,
      type: "ITEM_SHIPPED" as const,
      title: "Item Shipped",
      message: "Your sold item Jordan 1 Chicago is on its way to authentication.",
    },
    {
      userId: users[2].id,
      type: "PRICE_ALERT" as const,
      title: "Price Drop Alert",
      message: "PlayStation 5 Console dropped below $450.",
    },
    {
      userId: users[0].id,
      type: "ITEM_VERIFIED" as const,
      title: "Item Verified",
      message: "Your Air Max 90 OG Infrared passed authentication.",
    },
    {
      userId: users[3].id,
      type: "SYSTEM" as const,
      title: "Welcome to Swaphause",
      message: "Start browsing the marketplace and place your first bid.",
    },
  ];

  for (const notif of notificationData) {
    await prisma.notification.create({ data: notif });
  }

  console.log(`Created ${notificationData.length} notifications`);
  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
