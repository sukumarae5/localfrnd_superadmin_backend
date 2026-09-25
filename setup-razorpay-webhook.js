require("dotenv").config();

const { prisma } = require("./src/config/database");
const { encryptSecret } = require("./src/utils/secretCipher.util");

async function main() {
const webhookSecret = "localfrnd_webhook_test_2026";

  const encryptedWebhookSecret = encryptSecret(webhookSecret);

  const config = await prisma.paymentGatewayConfig.findUnique({
    where: {
      gateway: "razorpay",
    },
  });

  if (!config) {
    throw new Error("Razorpay PaymentGatewayConfig not found");
  }

  console.log("Razorpay config found:", config.id);

  await prisma.paymentGatewayConfig.update({
    where: {
      gateway: "razorpay",
    },
    data: {
      webhookSecretEncrypted: encryptedWebhookSecret,
    },
  });

  console.log("");
  console.log("==========================================");
  console.log("RAZORPAY WEBHOOK SECRET UPDATED");
  console.log("==========================================");
  console.log("Webhook secret:", webhookSecret);
  console.log("Encrypted value saved successfully.");
  console.log("==========================================");
}

main()
  .catch((error) => {
    console.error("ERROR:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });