/**
 * WarsztatPro – Migracja bazy danych PostgreSQL
 * Uruchom: node server/migrate.js
 */
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  console.log("🗄️  Migracja bazy danych WarsztatPro...");

  await pool.query(`
    -- USTAWIENIA FIRMY
    CREATE TABLE IF NOT EXISTS settings (
      id          INTEGER PRIMARY KEY DEFAULT 1,
      name        VARCHAR(200),
      nip         VARCHAR(20),
      address     VARCHAR(200),
      city        VARCHAR(100),
      phone       VARCHAR(30),
      email       VARCHAR(100),
      bank        VARCHAR(50),
      ksef_nip    VARCHAR(20),
      ksef_token  TEXT,
      updated_at  TIMESTAMP DEFAULT NOW(),
      CONSTRAINT single_row CHECK (id = 1)
    );

    -- Domyślne ustawienia (puste – admin wypełni)
    INSERT INTO settings (id) VALUES (1) ON CONFLICT DO NOTHING;

    -- WARSZTATY (SaaS multi-tenant)
    CREATE TABLE IF NOT EXISTS tenants (
      id          SERIAL PRIMARY KEY,
      name        VARCHAR(200) NOT NULL,
      slug        VARCHAR(50) UNIQUE NOT NULL,
      nip         VARCHAR(20),
      address     VARCHAR(200),
      city        VARCHAR(100),
      phone       VARCHAR(30),
      email       VARCHAR(100),
      bank        VARCHAR(50),
      plan        VARCHAR(20) DEFAULT 'trial' CHECK (plan IN ('trial','basic','pro','enterprise')),
      plan_expires TIMESTAMP DEFAULT (NOW() + INTERVAL '14 days'),
      active      BOOLEAN DEFAULT true,
      logo_url    TEXT,
      ksef_nip    VARCHAR(20),
      ksef_token  TEXT,
      agent_url   VARCHAR(200) DEFAULT 'http://localhost:8765',
      posnet_port VARCHAR(20) DEFAULT 'COM3',
      terminal_id VARCHAR(50),
      terminal_key TEXT,
      created_at  TIMESTAMP DEFAULT NOW()
    );

    -- Domyślny tenant (istniejący warsztat)
    INSERT INTO tenants (id, name, slug, email) VALUES (1, 'mod4cars', 'mod4cars', 'admin@mod4cars.eu') ON CONFLICT DO NOTHING;

    -- UŻYTKOWNICY
    CREATE TABLE IF NOT EXISTS users (
      id          SERIAL PRIMARY KEY,
      tenant_id   INTEGER REFERENCES tenants(id) ON DELETE CASCADE DEFAULT 1,
      name        VARCHAR(100) NOT NULL,
      email       VARCHAR(100) NOT NULL,
      password    VARCHAR(255) NOT NULL,
      role        VARCHAR(20) NOT NULL DEFAULT 'mechanik' CHECK (role IN ('superadmin','admin','mechanik','recepcja')),
      phone       VARCHAR(20),
      avatar      VARCHAR(4),
      active      BOOLEAN DEFAULT true,
      last_login  TIMESTAMP,
      created_at  TIMESTAMP DEFAULT NOW(),
      UNIQUE(tenant_id, email)
    );

    -- KLIENCI
    CREATE TABLE IF NOT EXISTS clients (
      id          SERIAL PRIMARY KEY,
      name        VARCHAR(150) NOT NULL,
      nip         VARCHAR(20),
      regon       VARCHAR(20),
      phone       VARCHAR(20),
      email       VARCHAR(100),
      address     VARCHAR(200),
      city        VARCHAR(100),
      notes       TEXT,
      created_at  TIMESTAMP DEFAULT NOW()
    );

    -- POJAZDY
    CREATE TABLE IF NOT EXISTS vehicles (
      id          SERIAL PRIMARY KEY,
      client_id   INTEGER REFERENCES clients(id) ON DELETE CASCADE,
      make        VARCHAR(50) NOT NULL,
      model       VARCHAR(50) NOT NULL,
      year        INTEGER,
      plate       VARCHAR(20) UNIQUE NOT NULL,
      vin         VARCHAR(20),
      mileage     INTEGER DEFAULT 0,
      fuel_type   VARCHAR(20),
      engine      VARCHAR(50),
      color       VARCHAR(50),
      notes       TEXT,
      created_at  TIMESTAMP DEFAULT NOW()
    );

    -- ZLECENIA SERWISOWE
    CREATE TABLE IF NOT EXISTS orders (
      id            SERIAL PRIMARY KEY,
      order_no      VARCHAR(20) UNIQUE NOT NULL,
      client_id     INTEGER REFERENCES clients(id),
      vehicle_id    INTEGER REFERENCES vehicles(id),
      mechanic_id   INTEGER REFERENCES users(id),
      status        VARCHAR(20) DEFAULT 'Nowe' CHECK (status IN ('Nowe','W trakcie','Gotowe','Wydane','Anulowane')),
      priority      VARCHAR(20) DEFAULT 'Normalny' CHECK (priority IN ('Pilny','Normalny','Niski')),
      description   TEXT NOT NULL,
      notes         TEXT,
      mileage_in    INTEGER,
      date_created  TIMESTAMP DEFAULT NOW(),
      date_deadline DATE,
      date_done     TIMESTAMP,
      invoice_id    INTEGER,
      created_at    TIMESTAMP DEFAULT NOW()
    );

    -- POZYCJE ZLECENIA
    CREATE TABLE IF NOT EXISTS order_items (
      id          SERIAL PRIMARY KEY,
      order_id    INTEGER REFERENCES orders(id) ON DELETE CASCADE,
      type        VARCHAR(20) NOT NULL CHECK (type IN ('part','labor')),
      name        VARCHAR(200) NOT NULL,
      qty         NUMERIC(10,3) DEFAULT 1,
      unit_price  NUMERIC(10,2) NOT NULL,
      vat         INTEGER DEFAULT 23,
      created_at  TIMESTAMP DEFAULT NOW()
    );

    -- MAGAZYN
    CREATE TABLE IF NOT EXISTS parts (
      id          SERIAL PRIMARY KEY,
      catalog_no  VARCHAR(50),
      name        VARCHAR(200) NOT NULL,
      unit        VARCHAR(10) DEFAULT 'szt',
      buy_price   NUMERIC(10,2) DEFAULT 0,
      sell_price  NUMERIC(10,2) DEFAULT 0,
      vat         INTEGER DEFAULT 23,
      stock       INTEGER DEFAULT 0,
      min_stock   INTEGER DEFAULT 2,
      category    VARCHAR(50),
      supplier    VARCHAR(100),
      created_at  TIMESTAMP DEFAULT NOW()
    );

    -- FAKTURY / DOKUMENTY
    CREATE TABLE IF NOT EXISTS invoices (
      id            SERIAL PRIMARY KEY,
      number        VARCHAR(30) UNIQUE NOT NULL,
      type          VARCHAR(20) NOT NULL,
      order_id      INTEGER REFERENCES orders(id),
      client_id     INTEGER REFERENCES clients(id),
      buyer_name    VARCHAR(150),
      buyer_nip     VARCHAR(20),
      buyer_address VARCHAR(200),
      buyer_city    VARCHAR(100),
      date_issued   DATE NOT NULL,
      date_sale     DATE,
      date_due      DATE,
      payment       VARCHAR(30),
      net           NUMERIC(12,2),
      vat_amt       NUMERIC(12,2),
      gross         NUMERIC(12,2),
      notes         TEXT,
      ksef_status   VARCHAR(20) DEFAULT 'oczekuje',
      created_at    TIMESTAMP DEFAULT NOW()
    );

    -- HISTORIA SERWISOWA POJAZDÓW
    CREATE TABLE IF NOT EXISTS vehicle_history (
      id          SERIAL PRIMARY KEY,
      vehicle_id  INTEGER REFERENCES vehicles(id) ON DELETE CASCADE,
      order_id    INTEGER REFERENCES orders(id),
      mileage     INTEGER,
      description TEXT,
      date        DATE DEFAULT NOW(),
      mechanic    VARCHAR(100),
      cost        NUMERIC(10,2),
      created_at  TIMESTAMP DEFAULT NOW()
    );

    -- KALENDARZ / HARMONOGRAM
    CREATE TABLE IF NOT EXISTS calendar (
      id          SERIAL PRIMARY KEY,
      title       VARCHAR(200) NOT NULL,
      description TEXT,
      mechanic_id INTEGER REFERENCES users(id),
      vehicle_id  INTEGER REFERENCES vehicles(id),
      order_id    INTEGER REFERENCES orders(id),
      start_time  TIMESTAMP NOT NULL,
      end_time    TIMESTAMP NOT NULL,
      color       VARCHAR(20) DEFAULT '#1a56db',
      created_at  TIMESTAMP DEFAULT NOW()
    );

    -- POWIADOMIENIA SMS
    CREATE TABLE IF NOT EXISTS sms_log (
      id          SERIAL PRIMARY KEY,
      client_id   INTEGER REFERENCES clients(id),
      order_id    INTEGER REFERENCES orders(id),
      phone       VARCHAR(20),
      message     TEXT,
      status      VARCHAR(20) DEFAULT 'pending',
      provider    VARCHAR(20) DEFAULT 'twilio',
      sent_at     TIMESTAMP,
      created_at  TIMESTAMP DEFAULT NOW()
    );
  `);

  // Domyślni użytkownicy
  const bcrypt = require("bcryptjs");
  const adminPass = await bcrypt.hash("Admin123!", 10);
  const mechPass  = await bcrypt.hash("Mechanik123!", 10);
  const recPass   = await bcrypt.hash("Recepcja123!", 10);

  await pool.query(`
    INSERT INTO users (name, email, password, role, phone, avatar) VALUES
      ('Patryk Nowakowski', 'admin@mod4cars.eu', $1, 'admin', '600 100 200', 'PN'),
      ('Piotr Wiśniewski',  'piotr@mod4cars.eu', $2, 'mechanik', '601 200 300', 'PW'),
      ('Marek Adamski',     'marek@mod4cars.eu', $2, 'mechanik', '602 300 400', 'MA'),
      ('Anna Nowak',        'anna@mod4cars.eu',  $3, 'recepcja', '603 400 500', 'AN')
    ON CONFLICT (email) DO NOTHING;
  `, [adminPass, mechPass, recPass]);

  // Przykładowi klienci
  await pool.query(`
    INSERT INTO clients (name, nip, phone, email, address, city) VALUES
      ('Jan Kowalski', '1234567890', '600 100 200', 'jan@example.pl', 'ul. Lipowa 5', '00-001 Warszawa'),
      ('AUTO SERWIS Nowak Sp. z o.o.', '9876543210', '500 200 300', 'biuro@autonowak.pl', 'ul. Motorowa 12', '30-001 Kraków')
    ON CONFLICT DO NOTHING;
  `);

    -- KSEF KOLEJKA
    CREATE TABLE IF NOT EXISTS ksef_queue (
      id          SERIAL PRIMARY KEY,
      tenant_id   INTEGER REFERENCES tenants(id) DEFAULT 1,
      invoice_id  INTEGER REFERENCES invoices(id),
      status      VARCHAR(20) DEFAULT 'pending',
      ksef_number VARCHAR(100),
      ksef_ref    VARCHAR(200),
      error_msg   TEXT,
      sent_at     TIMESTAMP,
      created_at  TIMESTAMP DEFAULT NOW()
    );

    -- Dodaj tenant_id do istniejacych tabel (jezeli nie istnieje)
    ALTER TABLE clients ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;
    ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;
    ALTER TABLE parts ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;
    ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;
    ALTER TABLE calendar ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;
    ALTER TABLE sms_log ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;
    ALTER TABLE settings ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;
  `);

  console.log("✅ Migracja zakończona pomyślnie!");
  await pool.end();
}

migrate().catch(err => { console.error("❌ Błąd migracji:", err); process.exit(1); });
