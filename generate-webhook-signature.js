require("dotenv").config();

const crypto = require("crypto");
const { prisma } = require("./src/config/database");
const { decryptSecret } = require("./src/utils/secretCipher.util");

const payload = {
  entity: "event",
  account_id: "acc_test_local",
  event: "payment.captured",
  contains: ["payment"],
  payload: {
    payment: {
      entity: {
        id: "pay_test_1757500000",
        entity: "payment",
        amount: 9900,
        currency: "INR",
        status: "captured",
        order_id: "order_TaDWaccs39ksA6",
        method: "upi",
        captured: true,
      },
    },
  },
  created_at: 1757500000,
};

const body = JSON.stringify(payload);
async function main() {
  const config = await prisma.paymentGatewayConfig.findUnique({
    where: {
      gateway: "razorpay"
    }
  });

  if (!config) {
    throw new Error("Razorpay PaymentGatewayConfig not found");
  }

  if (!config.webhookSecretEncrypted) {
    throw new Error(
      "webhookSecretEncrypted is NULL/empty in PaymentGatewayConfig"
    );
  }

  const webhookSecret = decryptSecret(
    config.webhookSecretEncrypted
  );

  const signature = crypto
    .createHmac("sha256", webhookSecret)
    .update(body, "utf8")
    .digest("hex");

  console.log("\n==========================================");
  console.log("RAZORPAY WEBHOOK TEST");
  console.log("==========================================");
  console.log("Order ID:");
  console.log(payload.payload.payment.entity.order_id);
  console.log("\nSignature:");
  console.log(signature);
  console.log("\nBody:");
  console.log(body);
  console.log("==========================================\n");

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});