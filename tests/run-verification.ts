import Database from 'better-sqlite3';

const BASE_URL = 'http://127.0.0.1:3000';

async function test() {
  console.log('====================================================');
  console.log('🚀 RUNNING COMPREHENSIVE SECURITY & API TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`✅ [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${msg}`);
      failed++;
    }
  }

  // 1. Healthcheck
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  const healthJson = await healthRes.json();
  assert(healthRes.status === 200 && healthJson.status === 'ok', 'GET /api/health is accessible');

  // 2. Public datasets accessible without authentication
  const pubCatsRes = await fetch(`${BASE_URL}/api/categories`);
  const pubCats = await pubCatsRes.json();
  assert(pubCatsRes.status === 200 && Array.isArray(pubCats) && pubCats.length > 0, `GET /api/categories is public (${pubCats.length} categories)`);

  const pubProdsRes = await fetch(`${BASE_URL}/api/products`);
  const pubProds = await pubProdsRes.json();
  assert(pubProdsRes.status === 200 && Array.isArray(pubProds) && pubProds.length > 0, `GET /api/products is public (${pubProds.length} products)`);

  const pubSettingsRes = await fetch(`${BASE_URL}/api/settings`);
  const pubSettings = await pubSettingsRes.json();
  assert(pubSettingsRes.status === 200 && !!pubSettings.companyName, `GET /api/settings is public (${pubSettings.companyName})`);

  // 3. Unauthenticated access to protected endpoints MUST be rejected (401)
  const unauthUsers = await fetch(`${BASE_URL}/api/users`);
  assert(unauthUsers.status === 401, 'Unauthenticated GET /api/users returns 401 Unauthorized');

  const unauthBackup = await fetch(`${BASE_URL}/api/backup`);
  assert(unauthBackup.status === 401, 'Unauthenticated GET /api/backup returns 401 Unauthorized');

  const unauthRestore = await fetch(`${BASE_URL}/api/backup/restore`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ categories: [], products: [] })
  });
  assert(unauthRestore.status === 401, 'Unauthenticated POST /api/backup/restore returns 401 Unauthorized');

  const unauthPrices = await fetch(`${BASE_URL}/api/products/prices`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ updates: [] })
  });
  assert(unauthPrices.status === 401, 'Unauthenticated PUT /api/products/prices returns 401 Unauthorized');

  const unauthAddCat = await fetch(`${BASE_URL}/api/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'تست هک' })
  });
  assert(unauthAddCat.status === 401, 'Unauthenticated POST /api/categories returns 401 Unauthorized');

  // 4. Invalid credentials rejected
  const badLogin = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'wrongpassword' })
  });
  assert(badLogin.status === 401, 'Login with incorrect password returns 401');

  // 5. Valid login with admin credentials
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin' })
  });
  const loginJson = await loginRes.json();
  assert(loginRes.status === 200 && !!loginJson.token, 'Login with admin credentials returns 200 and session token');
  const adminToken = loginJson.token;

  // Verify password hash in SQLite is now upgraded to PBKDF2
  const sqliteDb = new Database('data/database.sqlite');
  const adminRow = sqliteDb.prepare("SELECT password FROM users WHERE username = 'admin'").get() as any;
  assert(adminRow.password.startsWith('pbkdf2:100000:'), 'Legacy SHA-256 hash was transparently upgraded to PBKDF2 on login');

  // 6. Admin token can access protected endpoints
  const adminUsersRes = await fetch(`${BASE_URL}/api/users`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const adminUsers = await adminUsersRes.json();
  assert(adminUsersRes.status === 200 && Array.isArray(adminUsers), 'Admin can access GET /api/users');

  const adminStatsRes = await fetch(`${BASE_URL}/api/stats`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert(adminStatsRes.status === 200, 'Admin can access GET /api/stats');

  // 7. Audit identity derivation check
  const testProdId = pubProds[0].id;
  const initialPriceLamb = pubProds[0].priceLamb;
  const newTestPrice = (initialPriceLamb || 800) + 5;
  const updatePricesRes = await fetch(`${BASE_URL}/api/products/prices`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      updates: [{ id: testProdId, priceLamb: newTestPrice, priceTwoTeeth: pubProds[0].priceTwoTeeth }],
      userId: 'SPOOFED_ATTACKER_ID' // Attempt to spoof userId in body
    })
  });
  assert(updatePricesRes.status === 200, 'Price update with admin token succeeds');

  const latestHistory = sqliteDb.prepare("SELECT * FROM price_history WHERE productId = ? ORDER BY changedAt DESC LIMIT 1").get(testProdId) as any;
  assert(latestHistory && latestHistory.changedBy === 'مدیر سیستم (admin)', `Audit identity derived from verified session (changedBy: "${latestHistory?.changedBy}"), ignored spoofed userId`);

  // Revert test price change
  await fetch(`${BASE_URL}/api/products/prices`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      updates: [{ id: testProdId, priceLamb: initialPriceLamb, priceTwoTeeth: pubProds[0].priceTwoTeeth }]
    })
  });

  // 8. Protection against deleting root admin
  const deleteAdminRes = await fetch(`${BASE_URL}/api/users/${adminUsers.find((u: any) => u.username === 'admin')?.id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert(deleteAdminRes.status === 400, 'Root admin account cannot be deleted (returns 400 Bad Request)');

  // 9. Role-Based Access Control (RBAC): Editor role test
  const createEditorRes = await fetch(`${BASE_URL}/api/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      username: 'test_editor',
      name: 'کاربر آزمایشی ادیتور',
      password: 'EditorPassword123!',
      role: 'editor'
    })
  });
  const createdEditor = await createEditorRes.json();
  assert(createEditorRes.status === 200 && createdEditor.role === 'editor', 'Admin successfully created an editor user');

  const editorLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'test_editor', password: 'EditorPassword123!' })
  });
  const editorLogin = await editorLoginRes.json();
  const editorToken = editorLogin.token;

  // Editor CAN update prices
  const editorPriceRes = await fetch(`${BASE_URL}/api/products/prices`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${editorToken}`
    },
    body: JSON.stringify({ updates: [] })
  });
  assert(editorPriceRes.status === 200, 'Editor role CAN update prices');

  // Editor CANNOT access /api/users
  const editorUsersRes = await fetch(`${BASE_URL}/api/users`, {
    headers: { 'Authorization': `Bearer ${editorToken}` }
  });
  assert(editorUsersRes.status === 403, 'Editor role is FORBIDDEN (403) from accessing /api/users');

  // Editor CANNOT access /api/backup
  const editorBackupRes = await fetch(`${BASE_URL}/api/backup`, {
    headers: { 'Authorization': `Bearer ${editorToken}` }
  });
  assert(editorBackupRes.status === 403, 'Editor role is FORBIDDEN (403) from accessing /api/backup');

  // Editor CANNOT restore backup
  const editorRestoreRes = await fetch(`${BASE_URL}/api/backup/restore`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${editorToken}`
    },
    body: JSON.stringify({ categories: [], products: [] })
  });
  assert(editorRestoreRes.status === 403, 'Editor role is FORBIDDEN (403) from calling /api/backup/restore');

  // Clean up editor test user
  await fetch(`${BASE_URL}/api/users/${createdEditor.id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });

  // 10. Read-Only Internal Integration API Tests
  // A. Create a scoped API key
  const createKeyRes = await fetch(`${BASE_URL}/api/api-keys`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      name: 'کلید تستی اپلیکیشن دوم',
      scopes: ['read:products', 'read:categories', 'read:prices'],
      expiresInDays: 30
    })
  });
  const keyData = await createKeyRes.json();
  assert(createKeyRes.status === 200 && keyData.key && keyData.key.startsWith('plk_'), 'Admin generated a scoped API key (plk_...)');
  const apiKey = keyData.key;
  const keyId = keyData.record.id;

  // B. Internal Read: Products
  const intProdsRes = await fetch(`${BASE_URL}/api/internal/products`, {
    headers: { 'X-API-Key': apiKey }
  });
  const intProds = await intProdsRes.json();
  assert(intProdsRes.status === 200 && intProds.success === true && Array.isArray(intProds.data) && intProds.total > 0, `Internal API returned products (${intProds.total} items) with X-API-Key`);

  // C. Internal Read: Categories
  const intCatsRes = await fetch(`${BASE_URL}/api/internal/categories`, {
    headers: { 'X-API-Key': apiKey }
  });
  const intCats = await intCatsRes.json();
  assert(intCatsRes.status === 200 && intCats.success === true && Array.isArray(intCats.data), `Internal API returned categories (${intCats.total} items) with X-API-Key`);

  // D. Internal Read: Price List
  const intPriceListRes = await fetch(`${BASE_URL}/api/internal/price-list`, {
    headers: { 'X-API-Key': apiKey }
  });
  const intPriceList = await intPriceListRes.json();
  assert(intPriceListRes.status === 200 && intPriceList.success === true && !!intPriceList.categories, 'Internal API returned structured price list');

  // E. Reject write methods on internal API (Method Not Allowed - 405)
  const intPostRes = await fetch(`${BASE_URL}/api/internal/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey
    },
    body: JSON.stringify({ name: 'قلم غیرمجاز' })
  });
  assert(intPostRes.status === 405, 'POST to /api/internal/products is REJECTED with 405 Method Not Allowed');

  const intPutRes = await fetch(`${BASE_URL}/api/internal/price-list`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey
    },
    body: JSON.stringify({ prices: [] })
  });
  assert(intPutRes.status === 405, 'PUT to /api/internal/price-list is REJECTED with 405 Method Not Allowed');

  // F. Integration credential CANNOT access admin endpoints
  const keyAdminRes = await fetch(`${BASE_URL}/api/users`, {
    headers: { 'X-API-Key': apiKey }
  });
  assert(keyAdminRes.status === 401, 'Integration API key CANNOT access /api/users (401)');

  const keyRestoreRes = await fetch(`${BASE_URL}/api/backup/restore`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey
    },
    body: JSON.stringify({ categories: [], products: [] })
  });
  assert(keyRestoreRes.status === 401, 'Integration API key CANNOT access /api/backup/restore (401)');

  // G. Invalid API key is rejected
  const badKeyRes = await fetch(`${BASE_URL}/api/internal/products`, {
    headers: { 'X-API-Key': 'plk_invalid_fake_key_1234567890' }
  });
  assert(badKeyRes.status === 401, 'Invalid API key returns 401 Unauthorized');

  // H. Revoked API key is rejected
  await fetch(`${BASE_URL}/api/api-keys/${keyId}/revoke`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const revokedRes = await fetch(`${BASE_URL}/api/internal/products`, {
    headers: { 'X-API-Key': apiKey }
  });
  assert(revokedRes.status === 401, 'Revoked API key returns 401 Unauthorized');

  // Clean up test key
  await fetch(`${BASE_URL}/api/api-keys/${keyId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });

  // I. Scope Denial Verification: Create key with ONLY read:categories
  const singleScopeRes = await fetch(`${BASE_URL}/api/api-keys`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      name: 'کلید محدود به دسته‌بندی فقط',
      scopes: ['read:categories'],
      expiresInDays: null
    })
  });
  const singleScopeKeyData = await singleScopeRes.json();
  const catOnlyKey = singleScopeKeyData.key;
  const catOnlyKeyId = singleScopeKeyData.record.id;

  // Should succeed on /api/internal/categories
  const catAccessRes = await fetch(`${BASE_URL}/api/internal/categories`, {
    headers: { 'X-API-Key': catOnlyKey }
  });
  assert(catAccessRes.status === 200, 'Key with read:categories can read /api/internal/categories');

  // Should fail with 403 on /api/internal/products
  const prodAccessRes = await fetch(`${BASE_URL}/api/internal/products`, {
    headers: { 'X-API-Key': catOnlyKey }
  });
  const prodAccessJson = await prodAccessRes.json();
  assert(prodAccessRes.status === 403 && prodAccessJson.error?.code === 'INSUFFICIENT_SCOPE', 'Key without read:products is rejected with 403 INSUFFICIENT_SCOPE');

  // Should fail with 403 on /api/internal/price-list
  const priceAccessRes = await fetch(`${BASE_URL}/api/internal/price-list`, {
    headers: { 'X-API-Key': catOnlyKey }
  });
  const priceAccessJson = await priceAccessRes.json();
  assert(priceAccessRes.status === 403 && priceAccessJson.error?.code === 'INSUFFICIENT_SCOPE', 'Key without read:prices is rejected with 403 INSUFFICIENT_SCOPE');

  // Clean up single scope key
  await fetch(`${BASE_URL}/api/api-keys/${catOnlyKeyId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });

  // J. Expired API Key Verification
  // Insert an expired key directly into DB to test expiration enforcement
  const expiredKeyRaw = 'plk_expired_test_' + Math.random().toString(36).substring(2);
  const cryptoModule = await import('crypto');
  const expiredKeyHash = cryptoModule.createHash('sha256').update(expiredKeyRaw).digest('hex');
  const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  sqliteDb.prepare(`
    INSERT INTO api_keys (id, name, keyPrefix, keyHash, scopes, createdAt, expiresAt, isActive)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `).run('test_expired_id', 'کلید منقضی آزمایشی', expiredKeyRaw.substring(0, 10), expiredKeyHash, JSON.stringify(['read:products']), pastDate, pastDate);

  const expiredRes = await fetch(`${BASE_URL}/api/internal/products`, {
    headers: { 'X-API-Key': expiredKeyRaw }
  });
  const expiredJson = await expiredRes.json();
  assert(expiredRes.status === 401 && expiredJson.error?.code === 'API_KEY_EXPIRED', 'Expired API key is rejected with 401 API_KEY_EXPIRED');

  // Clean up expired key
  sqliteDb.prepare('DELETE FROM api_keys WHERE id = ?').run('test_expired_id');

  // K. Verify GET /api/api-keys NEVER leaks raw key or keyHash
  const listKeysRes = await fetch(`${BASE_URL}/api/api-keys`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const listKeys = await listKeysRes.json();
  const hasSecretLeak = listKeys.some((k: any) => k.key || k.keyHash || (k.keyPrefix && k.keyPrefix.length > 10));
  assert(!hasSecretLeak, 'GET /api/api-keys never returns raw key or keyHash (only id, name, keyPrefix, scopes, dates)');

  // L. Verify unauthenticated & editor users cannot manage API keys
  const unauthKeysRes = await fetch(`${BASE_URL}/api/api-keys`);
  assert(unauthKeysRes.status === 401, 'Unauthenticated GET /api/api-keys returns 401');

  // 11. Verify Production Data Integrity
  const finalCatCount = (sqliteDb.prepare('SELECT count(*) as c FROM categories').get() as any).c;
  const finalProdCount = (sqliteDb.prepare('SELECT count(*) as c FROM products').get() as any).c;
  assert(finalCatCount === pubCats.length && finalProdCount === pubProds.length, `Production data intact: ${finalCatCount} categories, ${finalProdCount} products`);

  sqliteDb.close();

  console.log('\n====================================================');
  console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

test().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
