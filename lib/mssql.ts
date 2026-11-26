import sql from 'mssql';
import { Transaction, CategoryBudget, MyAccount } from './types';

let pool: sql.ConnectionPool | null = null;
let poolPromise: Promise<sql.ConnectionPool> | null = null;
let initialized = false;

function getEnv(keys: string[]): string | undefined {
  for (const k of keys) {
    if (process.env[k]) return process.env[k];
  }
  return undefined;
}

export function isMssqlConfigured(): boolean {
  const connStr = getEnv(['MSSQL_CONNECTION_STRING', 'DATABASE_URL', 'CONNECTION_STRING']);
  if (connStr && (connStr.toLowerCase().startsWith('server=') || connStr.toLowerCase().startsWith('mssql://') || connStr.toLowerCase().startsWith('sqlserver://'))) {
    return true;
  }
  const server = getEnv(['MSSQL_SERVER', 'DB_SERVER', 'DB_HOST', 'SERVER']);
  const database = getEnv(['MSSQL_DATABASE', 'DB_NAME', 'DATABASE_NAME', 'DATABASE']);
  const user = getEnv(['MSSQL_USER', 'DB_USER', 'DB_USERNAME', 'USER']);
  return !!(server && database && user);
}

function parseMssqlConfig(): sql.config {
  const connStr = getEnv(['MSSQL_CONNECTION_STRING', 'DATABASE_URL', 'CONNECTION_STRING']);

  if (connStr && (connStr.toLowerCase().startsWith('server=') || connStr.toLowerCase().startsWith('mssql://') || connStr.toLowerCase().startsWith('sqlserver://'))) {
    if (connStr.toLowerCase().startsWith('server=')) {
      const parts = connStr.split(';').reduce((acc: Record<string, string>, part) => {
        const [k, ...v] = part.split('=');
        if (k && v.length) acc[k.trim().toLowerCase()] = v.join('=').trim();
        return acc;
      }, {});

      const serverVal = parts['server'] || parts['data source'] || 'localhost';
      const hasPort = serverVal.includes(',');
      const [srv, prt] = serverVal.split(',');

      const config: sql.config = {
        server: srv.trim(),
        database: parts['database'] || parts['initial catalog'] || '',
        user: parts['user id'] || parts['uid'] || parts['user'] || '',
        password: parts['password'] || parts['pwd'] || '',
        options: {
          encrypt: parts['encrypt'] === 'true' || parts['encrypt'] === 'yes',
          trustServerCertificate: parts['trustservercertificate'] !== 'false'
        }
      };

      if (hasPort && prt) {
        config.port = parseInt(prt.trim(), 10);
      }
      return config;
    } else {
      const parsed = new URL(connStr.replace(/^sqlserver:\/\//, 'mssql://'));
      const config: sql.config = {
        server: parsed.hostname,
        database: parsed.pathname.replace(/^\//, ''),
        user: decodeURIComponent(parsed.username),
        password: decodeURIComponent(parsed.password),
        options: {
          encrypt: parsed.searchParams.get('encrypt') === 'true',
          trustServerCertificate: parsed.searchParams.get('trustServerCertificate') !== 'false'
        }
      };

      if (parsed.port) {
        config.port = parseInt(parsed.port, 10);
      }
      return config;
    }
  }

  const server = (getEnv(['MSSQL_SERVER', 'DB_SERVER', 'DB_HOST', 'SERVER']) || 'localhost').trim();
  const database = (getEnv(['MSSQL_DATABASE', 'DB_NAME', 'DATABASE_NAME', 'DATABASE']) || 'cashflow').trim();
  const user = (getEnv(['MSSQL_USER', 'DB_USER', 'DB_USERNAME', 'USER']) || 'sa').trim();
  const password = getEnv(['MSSQL_PASSWORD', 'DB_PASSWORD', 'DB_PASS', 'PASSWORD']) || '';
  const portStr = getEnv(['MSSQL_PORT', 'DB_PORT', 'PORT']);
  const encryptStr = getEnv(['MSSQL_ENCRYPT', 'DB_ENCRYPT']);

  const config: sql.config = {
    server,
    database,
    user,
    password,
    options: {
      encrypt: encryptStr === 'true',
      trustServerCertificate: true // Always trust for flexible setups
    }
  };

  // Only add port if explicitly specified and server is not a named instance
  if (portStr && !server.includes('\\')) {
    config.port = parseInt(portStr, 10);
  }

  return config;
}

// Automatically create database if it doesn't exist, then connect and create tables
async function ensureDatabaseAndTables(config: sql.config): Promise<sql.ConnectionPool> {
  const targetDb = config.database;

  // Step 1: Try to create Database via 'master' (if we have admin access)
  if (targetDb && targetDb.toLowerCase() !== 'master') {
    try {
      const masterConfig: sql.config = {
        ...config,
        database: 'master'
      };
      const masterPool = new sql.ConnectionPool(masterConfig);
      await masterPool.connect();
      // Sanitize db name (alphanumeric and underscores)
      const safeDbName = targetDb.replace(/[^a-zA-Z0-9_]/g, '');
      if (safeDbName) {
        await masterPool.request().query(`
          IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = '${safeDbName}')
          BEGIN
            CREATE DATABASE [${safeDbName}];
          END
        `);
      }
      await masterPool.close();
      console.log(`[MSSQL] Database "${safeDbName}" verified or created.`);
    } catch (err: any) {
      console.log('[MSSQL] Note: Master DB check skipped or not allowed, connecting directly to target DB:', err?.message || err);
    }
  }

  // Step 2: Connect to target DB and ensure Tables exist
  const targetPool = new sql.ConnectionPool(config);
  await targetPool.connect();

  await targetPool.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='transactions' AND xtype='U')
    CREATE TABLE transactions (
      id NVARCHAR(100) PRIMARY KEY,
      date NVARCHAR(50) NOT NULL,
      amount DECIMAL(18,2) NOT NULL,
      type NVARCHAR(20) NOT NULL,
      category NVARCHAR(100) NOT NULL,
      merchant NVARCHAR(200) NOT NULL,
      account NVARCHAR(50) NULL,
      reference NVARCHAR(100) NULL,
      raw_sms NVARCHAR(MAX) NULL,
      sender NVARCHAR(100) NULL,
      notes NVARCHAR(MAX) NULL,
      created_at DATETIME2 DEFAULT GETDATE()
    );

    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='my_accounts' AND xtype='U')
    CREATE TABLE my_accounts (
      id NVARCHAR(100) PRIMARY KEY,
      name NVARCHAR(100) NOT NULL,
      identifier NVARCHAR(100) NOT NULL,
      created_at DATETIME2 DEFAULT GETDATE()
    );

    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='budgets' AND xtype='U')
    CREATE TABLE budgets (
      category NVARCHAR(100) PRIMARY KEY,
      monthly_limit DECIMAL(18,2) NOT NULL
    );
  `);

  initialized = true;
  console.log('[MSSQL] Tables transactions, my_accounts, budgets verified / created successfully.');
  return targetPool;
}

export async function getMssqlPool(): Promise<sql.ConnectionPool> {
  if (pool && pool.connected) return pool;

  if (!poolPromise) {
    const config = parseMssqlConfig();

    poolPromise = ensureDatabaseAndTables(config)
      .then(p => {
        pool = p;
        return p;
      })
      .catch(err => {
        poolPromise = null;
        console.error('MSSQL Connection Error:', err);
        throw err;
      });
  }

  const p = await poolPromise;
  if (!p) throw new Error('Could not establish MSSQL connection pool');
  return p;
}

export async function initMssqlTables() {
  await getMssqlPool();
}

export async function mssqlGetTransactions(): Promise<Transaction[]> {
  const p = await getMssqlPool();
  const res = await p.request().query(`
    SELECT id, date, amount, type, category, merchant, account, reference, raw_sms, sender, notes, created_at
    FROM transactions
    ORDER BY date DESC, created_at DESC;
  `);

  return res.recordset.map((r: any) => ({
    id: r.id,
    date: r.date,
    amount: Number(r.amount),
    type: r.type,
    category: r.category,
    merchant: r.merchant,
    account: r.account || undefined,
    reference: r.reference || undefined,
    raw_sms: r.raw_sms || undefined,
    sender: r.sender || undefined,
    notes: r.notes || undefined,
    created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString()
  }));
}

export async function mssqlAddTransaction(tx: Transaction): Promise<void> {
  const p = await getMssqlPool();
  const req = p.request();
  req.input('id', sql.NVarChar(100), tx.id);
  req.input('date', sql.NVarChar(50), tx.date);
  req.input('amount', sql.Decimal(18, 2), tx.amount);
  req.input('type', sql.NVarChar(20), tx.type);
  req.input('category', sql.NVarChar(100), tx.category);
  req.input('merchant', sql.NVarChar(200), tx.merchant);
  req.input('account', sql.NVarChar(50), tx.account || null);
  req.input('reference', sql.NVarChar(100), tx.reference || null);
  req.input('raw_sms', sql.NVarChar(sql.MAX), tx.raw_sms || null);
  req.input('sender', sql.NVarChar(100), tx.sender || null);
  req.input('notes', sql.NVarChar(sql.MAX), tx.notes || null);

  await req.query(`
    INSERT INTO transactions (id, date, amount, type, category, merchant, account, reference, raw_sms, sender, notes)
    VALUES (@id, @date, @amount, @type, @category, @merchant, @account, @reference, @raw_sms, @sender, @notes);
  `);
}

export async function mssqlUpdateTransaction(id: string, updates: Partial<Transaction>): Promise<void> {
  const p = await getMssqlPool();
  const req = p.request();
  req.input('id', sql.NVarChar(100), id);

  const setClauses: string[] = [];
  if (updates.type !== undefined) {
    req.input('type', sql.NVarChar(20), updates.type);
    setClauses.push('type = @type');
  }
  if (updates.category !== undefined) {
    req.input('category', sql.NVarChar(100), updates.category);
    setClauses.push('category = @category');
  }
  if (updates.merchant !== undefined) {
    req.input('merchant', sql.NVarChar(200), updates.merchant);
    setClauses.push('merchant = @merchant');
  }
  if (updates.amount !== undefined) {
    req.input('amount', sql.Decimal(18, 2), updates.amount);
    setClauses.push('amount = @amount');
  }

  if (setClauses.length > 0) {
    await req.query(`UPDATE transactions SET ${setClauses.join(', ')} WHERE id = @id;`);
  }
}

export async function mssqlDeleteTransaction(id: string): Promise<void> {
  const p = await getMssqlPool();
  const req = p.request();
  req.input('id', sql.NVarChar(100), id);
  await req.query('DELETE FROM transactions WHERE id = @id;');
}

export async function mssqlClearAllTransactions(): Promise<void> {
  const p = await getMssqlPool();
  await p.request().query('DELETE FROM transactions;');
}

export async function mssqlGetBudgets(): Promise<CategoryBudget[]> {
  const p = await getMssqlPool();
  const res = await p.request().query('SELECT category, monthly_limit FROM budgets;');
  return res.recordset.map((r: any) => ({
    category: r.category,
    monthly_limit: Number(r.monthly_limit)
  }));
}

export async function mssqlSaveBudgets(budgets: CategoryBudget[]): Promise<void> {
  const p = await getMssqlPool();
  for (const b of budgets) {
    const req = p.request();
    req.input('category', sql.NVarChar(100), b.category);
    req.input('limit', sql.Decimal(18, 2), b.monthly_limit);
    await req.query(`
      IF EXISTS (SELECT 1 FROM budgets WHERE category = @category)
        UPDATE budgets SET monthly_limit = @limit WHERE category = @category;
      ELSE
        INSERT INTO budgets (category, monthly_limit) VALUES (@category, @limit);
    `);
  }
}

export async function mssqlGetMyAccounts(): Promise<MyAccount[]> {
  const p = await getMssqlPool();
  const res = await p.request().query('SELECT id, name, identifier FROM my_accounts;');
  return res.recordset.map((r: any) => ({
    id: r.id,
    name: r.name,
    identifier: r.identifier
  }));
}

export async function mssqlAddMyAccount(acc: MyAccount): Promise<void> {
  const p = await getMssqlPool();
  const req = p.request();
  req.input('id', sql.NVarChar(100), acc.id);
  req.input('name', sql.NVarChar(100), acc.name);
  req.input('identifier', sql.NVarChar(100), acc.identifier);
  await req.query(`
    INSERT INTO my_accounts (id, name, identifier)
    VALUES (@id, @name, @identifier);
  `);
}

export async function mssqlDeleteMyAccount(id: string): Promise<void> {
  const p = await getMssqlPool();
  const req = p.request();
  req.input('id', sql.NVarChar(100), id);
  await req.query('DELETE FROM my_accounts WHERE id = @id;');
}
