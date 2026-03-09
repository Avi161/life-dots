import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';

const BASE_URL = process.env.TEST_URL || 'http://localhost:4000';

let accessToken;

async function api(method, path, { body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json();
  return { status: res.status, body: json };
}

describe('Test user setup', () => {
  it('should create a test user and obtain a token', async () => {
    const { status, body } = await api('POST', '/api/test/create-test-user');

    assert.equal(status, 201);
    assert.equal(body.success, true);
    assert.ok(body.data.access_token);

    accessToken = body.data.access_token;
  });
});

describe('Settings — auth enforcement', () => {
  it('should reject GET without a token', async () => {
    const { status, body } = await api('GET', '/api/settings');

    assert.equal(status, 401);
    assert.equal(body.success, false);
  });

  it('should reject PUT without a token', async () => {
    const { status, body } = await api('PUT', '/api/settings', {
      body: { theme: 'dark' },
    });

    assert.equal(status, 401);
    assert.equal(body.success, false);
  });

  it('should reject requests with an invalid token', async () => {
    const { status, body } = await api('GET', '/api/settings', {
      token: 'not-a-real-token',
    });

    assert.equal(status, 401);
    assert.equal(body.success, false);
  });
});

describe('Settings — GET defaults', () => {
  it('should return default settings for a new user', async () => {
    const { status, body } = await api('GET', '/api/settings', {
      token: accessToken,
    });

    assert.equal(status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.theme, 'light');
    assert.equal(body.data.heartbeat_enabled, true);
    assert.deepEqual(body.data.dot_meta, {});
  });
});

describe('Settings — PUT updates', () => {
  it('should update theme to dark', async () => {
    const { status, body } = await api('PUT', '/api/settings', {
      token: accessToken,
      body: { theme: 'dark' },
    });

    assert.equal(status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.theme, 'dark');
  });

  it('should persist the theme change on GET', async () => {
    const { status, body } = await api('GET', '/api/settings', {
      token: accessToken,
    });

    assert.equal(status, 200);
    assert.equal(body.data.theme, 'dark');
  });

  it('should update birth_date and expected_lifespan', async () => {
    const { status, body } = await api('PUT', '/api/settings', {
      token: accessToken,
      body: { birth_date: '2000-06-15', expected_lifespan: 90 },
    });

    assert.equal(status, 200);
    assert.equal(body.data.birth_date, '2000-06-15');
    assert.equal(body.data.expected_lifespan, 90);
  });

  it('should update heartbeat_enabled', async () => {
    const { status, body } = await api('PUT', '/api/settings', {
      token: accessToken,
      body: { heartbeat_enabled: false },
    });

    assert.equal(status, 200);
    assert.equal(body.data.heartbeat_enabled, false);
  });

  it('should update dot_meta with color and tag data', async () => {
    const meta = {
      '0': { color: '#e07070', tag: 'born!' },
      '24': { color: '#7ab87a', tag: null },
    };

    const { status, body } = await api('PUT', '/api/settings', {
      token: accessToken,
      body: { dot_meta: meta },
    });

    assert.equal(status, 200);
    assert.deepEqual(body.data.dot_meta, meta);
  });

  it('should update multiple fields at once', async () => {
    const { status, body } = await api('PUT', '/api/settings', {
      token: accessToken,
      body: {
        theme: 'light',
        heartbeat_enabled: true,
        expected_lifespan: 80,
      },
    });

    assert.equal(status, 200);
    assert.equal(body.data.theme, 'light');
    assert.equal(body.data.heartbeat_enabled, true);
    assert.equal(body.data.expected_lifespan, 80);
  });

  it('should confirm all updates persisted', async () => {
    const { status, body } = await api('GET', '/api/settings', {
      token: accessToken,
    });

    assert.equal(status, 200);
    assert.equal(body.data.theme, 'light');
    assert.equal(body.data.heartbeat_enabled, true);
    assert.equal(body.data.birth_date, '2000-06-15');
    assert.equal(body.data.expected_lifespan, 80);
    assert.deepEqual(body.data.dot_meta, {
      '0': { color: '#e07070', tag: 'born!' },
      '24': { color: '#7ab87a', tag: null },
    });
  });
});

describe('Settings — input validation', () => {
  it('should reject invalid theme value', async () => {
    const { status, body } = await api('PUT', '/api/settings', {
      token: accessToken,
      body: { theme: 'rainbow' },
    });

    assert.equal(status, 400);
    assert.equal(body.success, false);
  });

  it('should reject lifespan over 150', async () => {
    const { status, body } = await api('PUT', '/api/settings', {
      token: accessToken,
      body: { expected_lifespan: 200 },
    });

    assert.equal(status, 400);
    assert.equal(body.success, false);
  });

  it('should reject lifespan of 0', async () => {
    const { status, body } = await api('PUT', '/api/settings', {
      token: accessToken,
      body: { expected_lifespan: 0 },
    });

    assert.equal(status, 400);
    assert.equal(body.success, false);
  });

  it('should reject invalid birth_date format', async () => {
    const { status, body } = await api('PUT', '/api/settings', {
      token: accessToken,
      body: { birth_date: 'June 15, 2000' },
    });

    assert.equal(status, 400);
    assert.equal(body.success, false);
  });

  it('should reject heartbeat_enabled as a string', async () => {
    const { status, body } = await api('PUT', '/api/settings', {
      token: accessToken,
      body: { heartbeat_enabled: 'yes' },
    });

    assert.equal(status, 400);
    assert.equal(body.success, false);
  });

  it('should reject unknown fields', async () => {
    const { status, body } = await api('PUT', '/api/settings', {
      token: accessToken,
      body: { favorite_color: 'blue' },
    });

    assert.equal(status, 400);
    assert.equal(body.success, false);
  });

  it('should reject an empty body', async () => {
    const { status, body } = await api('PUT', '/api/settings', {
      token: accessToken,
      body: {},
    });

    assert.equal(status, 400);
    assert.equal(body.success, false);
  });
});
