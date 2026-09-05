const ApiError = require("../../utils/apiError.util");
const { HTTP_STATUS } = require("../../constants");

const repo = require("./paymentGateway.repository");
const { encryptSecret } = require("../../utils/secretCipher.util");

// apiKeyPlain/webhookSecretPlain are never persisted or logged -- decrypt
// on demand only where a real integration call needs the raw value.
function serializeConfig(item) {
  return {
    id: item.id,
    gateway: item.gateway,
    merchantId: item.merchantId,
    environment: item.environment,

    apiKeyMasked: item.apiKeyEncrypted ? "••••••••••••••••" : null,
    webhookSecretMasked: item.webhookSecretEncrypted ? "••••••••••••••••" : null,
    webhookStatus: item.webhookStatus,

    emiEnabled: item.emiEnabled,
    autoRefundEnabled: item.autoRefundEnabled,
    smartRetryEnabled: item.smartRetryEnabled,

    isActive: item.isActive,

    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

async function listGateways() {
  const configs = await repo.list();
  return configs.map(serializeConfig);
}

async function getGatewayById(id) {
  const config = await repo.findById(id);

  if (!config) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "Gateway config not found");
  }

  return serializeConfig(config);
}

async function createGateway(data, updatedById) {
  const existing = await repo.findByGateway(data.gateway);

  if (existing) {
    throw new ApiError(HTTP_STATUS.CONFLICT, `Config for ${data.gateway} already exists -- use update instead`);
  }

  const created = await repo.create({
    gateway: data.gateway,
    merchantId: data.merchantId,
    environment: data.environment,

    apiKeyEncrypted: data.apiKey ? encryptSecret(data.apiKey) : null,
    webhookSecretEncrypted: data.webhookSecret ? encryptSecret(data.webhookSecret) : null,
    webhookStatus: data.webhookSecret ? "connected" : "disconnected",

    emiEnabled: data.emiEnabled,
    autoRefundEnabled: data.autoRefundEnabled,
    smartRetryEnabled: data.smartRetryEnabled,

    isActive: data.isActive,

    updatedById: updatedById ? BigInt(updatedById) : null,
  });

  return serializeConfig(created);
}

async function updateGateway(id, data, updatedById) {
  const existing = await repo.findById(id);

  if (!existing) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "Gateway config not found");
  }

  const updateData = {
    ...data,
    updatedById: updatedById ? BigInt(updatedById) : null,
  };

  if (data.apiKey !== undefined) {
    updateData.apiKeyEncrypted = encryptSecret(data.apiKey);
    delete updateData.apiKey;
  }

  if (data.webhookSecret !== undefined) {
    updateData.webhookSecretEncrypted = encryptSecret(data.webhookSecret);
    updateData.webhookStatus = "connected";
    delete updateData.webhookSecret;
  }

  const updated = await repo.update(id, updateData);
  return serializeConfig(updated);
}

async function getLedger() {
  const rows = await repo.getGatewayLedger();

  return rows.map((row) => ({
    ...serializeConfig(row.config),
    totalTransactions: row.totalTransactions,
    successCount: row.successCount,
    successRate: row.successRate,
    totalRevenue: row.totalRevenue,
  }));
}

module.exports = {
  listGateways,
  getGatewayById,
  createGateway,
  updateGateway,
  getLedger,
};
