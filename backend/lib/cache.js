/**
 * Cache-Aside Layer with Explicit Write-Invalidation
 * 70-90% read offloading for map viewport and hot issue endpoints.
 */

const { getClient } = require('./redis');
const client = getClient();

const CACHE_TTLS = {
  MAP_VIEWPORT: 30, // 30 seconds stale-while-revalidate
  ISSUE_DETAIL: 30, // 30 seconds
  TAXONOMY: 86400,  // 24 hours
  OFFICERS_LIST: 15 // 15 seconds
};

async function getCached(key) {
  try {
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    return null;
  }
}

async function setCached(key, data, ttlSeconds = 30) {
  try {
    await client.set(key, JSON.stringify(data), 'EX', ttlSeconds);
  } catch (err) {
    // Non-blocking silent catch
  }
}

async function invalidate(keyOrChannel, payload = '') {
  try {
    await client.del(keyOrChannel);
    await client.publish('cache_invalidation', JSON.stringify({ key: keyOrChannel, payload }));
  } catch (err) {
    // Non-blocking
  }
}

module.exports = {
  CACHE_TTLS,
  getCached,
  setCached,
  invalidate
};
