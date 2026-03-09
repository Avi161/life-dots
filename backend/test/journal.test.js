import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

const BASE_URL = process.env.TEST_URL || 'http://localhost:3001';

let accessToken;

async function api(method, path, { body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return { status: 204, body: null };

  const json = await res.json();
  return { status: res.status, body: json };
}

describe('Auth — Google OAuth endpoints', () => {
  it('should return a Google OAuth URL', async () => {
    const { status, body } = await api('GET', '/api/auth/google');

    assert.equal(status, 200);
    assert.equal(body.success, true);
    assert.ok(body.data.url);
    assert.ok(body.data.url.includes('google'), 'URL should contain google');
  });

  it('should reject callback without auth code', async () => {
    const { status, body } = await api('GET', '/api/auth/callback');

    assert.equal(status, 400);
    assert.equal(body.success, false);
  });

  it('should reject /me without a token', async () => {
    const { status, body } = await api('GET', '/api/auth/me');

    assert.equal(status, 401);
    assert.equal(body.success, false);
  });
});

describe('Test user setup (admin API)', () => {
  it('should create a test user and obtain a token', async () => {
    const { status, body } = await api('POST', '/api/test/create-test-user');

    assert.equal(status, 201);
    assert.equal(body.success, true);
    assert.ok(body.data.access_token);

    accessToken = body.data.access_token;
  });
});

describe('Journal CRUD — day-level entries', () => {
  const TODAY = '2026-03-08';
  const YESTERDAY = '2026-03-07';

  it('should return empty list when no entries exist', async () => {
    const { status, body } = await api('GET', '/api/journal', {
      token: accessToken,
    });

    assert.equal(status, 200);
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.equal(body.data.length, 0);
  });

  it('should create a journal entry for a specific day', async () => {
    const { status, body } = await api('POST', '/api/journal', {
      token: accessToken,
      body: { entry_date: TODAY, content: 'Today was a good day.' },
    });

    assert.equal(status, 201);
    assert.equal(body.success, true);
    assert.equal(body.data.entry_date, TODAY);
    assert.equal(body.data.content, 'Today was a good day.');
    assert.ok(body.data.id);
  });

  it('should create a second entry for a different day', async () => {
    const { status, body } = await api('POST', '/api/journal', {
      token: accessToken,
      body: { entry_date: YESTERDAY, content: 'Yesterday was quiet.' },
    });

    assert.equal(status, 201);
    assert.equal(body.data.entry_date, YESTERDAY);
  });

  it('should list both entries ordered by date descending', async () => {
    const { status, body } = await api('GET', '/api/journal', {
      token: accessToken,
    });

    assert.equal(status, 200);
    assert.equal(body.data.length, 2);
    assert.equal(body.data[0].entry_date, TODAY);
    assert.equal(body.data[1].entry_date, YESTERDAY);
  });

  it('should filter entries by date range', async () => {
    const { status, body } = await api(
      'GET',
      `/api/journal?from=${TODAY}&to=${TODAY}`,
      { token: accessToken },
    );

    assert.equal(status, 200);
    assert.equal(body.data.length, 1);
    assert.equal(body.data[0].entry_date, TODAY);
  });

  it('should get a single entry by date', async () => {
    const { status, body } = await api('GET', `/api/journal/${TODAY}`, {
      token: accessToken,
    });

    assert.equal(status, 200);
    assert.equal(body.data.entry_date, TODAY);
    assert.equal(body.data.content, 'Today was a good day.');
  });

  it('should return 404 for a day with no entry', async () => {
    const { status, body } = await api('GET', '/api/journal/2026-01-01', {
      token: accessToken,
    });

    assert.equal(status, 404);
    assert.equal(body.success, false);
  });

  it('should update an entry for a specific day', async () => {
    const { status, body } = await api('PUT', `/api/journal/${TODAY}`, {
      token: accessToken,
      body: { content: 'Actually, today was great!' },
    });

    assert.equal(status, 200);
    assert.equal(body.data.content, 'Actually, today was great!');
    assert.equal(body.data.entry_date, TODAY);
  });

  it('should confirm the update persisted', async () => {
    const { status, body } = await api('GET', `/api/journal/${TODAY}`, {
      token: accessToken,
    });

    assert.equal(status, 200);
    assert.equal(body.data.content, 'Actually, today was great!');
  });

  it('should upsert (overwrite) via POST on the same day', async () => {
    const { status, body } = await api('POST', '/api/journal', {
      token: accessToken,
      body: { entry_date: TODAY, content: 'Replaced via upsert.' },
    });

    assert.equal(status, 201);
    assert.equal(body.data.content, 'Replaced via upsert.');
  });

  it('should delete an entry for a specific day', async () => {
    const { status } = await api('DELETE', `/api/journal/${TODAY}`, {
      token: accessToken,
    });

    assert.equal(status, 204);
  });

  it('should confirm the deleted entry is gone', async () => {
    const { status, body } = await api('GET', `/api/journal/${TODAY}`, {
      token: accessToken,
    });

    assert.equal(status, 404);
    assert.equal(body.success, false);
  });

  it('should return 404 when deleting a non-existent entry', async () => {
    const { status, body } = await api('DELETE', `/api/journal/${TODAY}`, {
      token: accessToken,
    });

    assert.equal(status, 404);
    assert.equal(body.success, false);
  });

  after(async () => {
    await api('DELETE', `/api/journal/${YESTERDAY}`, { token: accessToken });
  });
});

describe('Journal — auth enforcement', () => {
  it('should reject requests with no token', async () => {
    const { status, body } = await api('GET', '/api/journal');

    assert.equal(status, 401);
    assert.equal(body.success, false);
  });

  it('should reject requests with an invalid token', async () => {
    const { status, body } = await api('GET', '/api/journal', {
      token: 'not-a-real-token',
    });

    assert.equal(status, 401);
    assert.equal(body.success, false);
  });
});

describe('Journal — input validation', () => {
  it('should reject entry with missing content', async () => {
    const { status, body } = await api('POST', '/api/journal', {
      token: accessToken,
      body: { entry_date: '2026-03-08' },
    });

    assert.equal(status, 400);
    assert.equal(body.success, false);
  });

  it('should reject entry with invalid date format', async () => {
    const { status, body } = await api('POST', '/api/journal', {
      token: accessToken,
      body: { entry_date: 'March 8', content: 'Bad date' },
    });

    assert.equal(status, 400);
    assert.equal(body.success, false);
  });

  it('should reject update with empty content', async () => {
    const { status, body } = await api('PUT', '/api/journal/2026-03-08', {
      token: accessToken,
      body: { content: '' },
    });

    assert.equal(status, 400);
    assert.equal(body.success, false);
  });
});
