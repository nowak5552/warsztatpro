/**
 * WarsztatPro API Server v2.0
 * Express + PostgreSQL + JWT + Twilio SMS
 */
"use strict";
require("dotenv").config();

const express    = require("express");
const cors       = require("cors");
const { Pool }   = require("pg");
const bcrypt     = require("bcryptjs");
const jwt        = require("jsonwebtoken");
const path       = require("path");

const app  = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const JWT_SECRET = process.env.JWT_SECRET || "warsztat-secret-change-in-prod";

app.use(cors());
app.use(express.json());

// ── STATIC FILES (React build) ────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, "../dist")));

// ── AUTH MIDDLEWARE ────────────────────────────────────────────────────────────
const auth = (roles = []) => (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Brak tokenu autoryzacji" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (roles.length && !roles.includes(decoded.role))
      return res.status(403).json({ error: "Brak uprawnień" });
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Nieprawidłowy token" });
  }
};

// ── HEALTH ────────────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => res.json({ ok: true, version: "2.0.0" }));

// ══════════════════════════════════════════════════════════════════════════════
// AUTH ENDPOINTS
// ══════════════════════════════════════════════════════════════════════════════

// POST /api/auth/login
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Podaj e-mail i hasło" });
  try {
    const { rows } = await pool.query("SELECT * FROM users WHERE email=$1 AND active=true", [email.toLowerCase()]);
    if (!rows.length) return res.status(401).json({ error: "Nieprawidłowy e-mail lub hasło" });
    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Nieprawidłowy e-mail lub hasło" });
    await pool.query("UPDATE users SET last_login=NOW() WHERE id=$1", [user.id]);
    const token = jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar }, JWT_SECRET, { expiresIn: "8h" });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar, phone: user.phone } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
app.get("/api/auth/me", auth(), async (req, res) => {
  const { rows } = await pool.query("SELECT id,name,email,role,avatar,phone,last_login FROM users WHERE id=$1", [req.user.id]);
  res.json(rows[0]);
});

// ══════════════════════════════════════════════════════════════════════════════
// USERS
// ══════════════════════════════════════════════════════════════════════════════
app.get("/api/users", auth(["admin"]), async (req, res) => {
  const { rows } = await pool.query("SELECT id,name,email,role,phone,avatar,active,last_login FROM users ORDER BY id");
  res.json(rows);
});

app.post("/api/users", auth(["admin"]), async (req, res) => {
  const { name, email, password, role, phone } = req.body;
  const hash   = await bcrypt.hash(password, 10);
  const avatar = name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
  const { rows } = await pool.query(
    "INSERT INTO users (name,email,password,role,phone,avatar) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id,name,email,role,phone,avatar,active",
    [name, email.toLowerCase(), hash, role, phone, avatar]
  );
  res.json(rows[0]);
});

app.patch("/api/users/:id", auth(["admin"]), async (req, res) => {
  const { active } = req.body;
  await pool.query("UPDATE users SET active=$1 WHERE id=$2", [active, req.params.id]);
  res.json({ ok: true });
});

// ══════════════════════════════════════════════════════════════════════════════
// CLIENTS
// ══════════════════════════════════════════════════════════════════════════════
app.get("/api/clients", auth(), async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM clients ORDER BY name");
  res.json(rows);
});

app.post("/api/clients", auth(), async (req, res) => {
  const { name, nip, regon, phone, email, address, city, notes } = req.body;
  const { rows } = await pool.query(
    "INSERT INTO clients (name,nip,regon,phone,email,address,city,notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *",
    [name, nip, regon, phone, email, address, city, notes]
  );
  res.json(rows[0]);
});

app.put("/api/clients/:id", auth(), async (req, res) => {
  const { name, nip, phone, email, address, city, notes } = req.body;
  await pool.query(
    "UPDATE clients SET name=$1,nip=$2,phone=$3,email=$4,address=$5,city=$6,notes=$7 WHERE id=$8",
    [name, nip, phone, email, address, city, notes, req.params.id]
  );
  res.json({ ok: true });
});

app.delete("/api/clients/:id", auth(["admin"]), async (req, res) => {
  await pool.query("DELETE FROM clients WHERE id=$1", [req.params.id]);
  res.json({ ok: true });
});

// ══════════════════════════════════════════════════════════════════════════════
// VEHICLES
// ══════════════════════════════════════════════════════════════════════════════
app.get("/api/vehicles", auth(), async (req, res) => {
  const { rows } = await pool.query(`
    SELECT v.*, c.name as client_name FROM vehicles v
    LEFT JOIN clients c ON v.client_id=c.id
    ORDER BY v.created_at DESC
  `);
  res.json(rows);
});

app.get("/api/vehicles/:id/history", auth(), async (req, res) => {
  const { rows } = await pool.query(`
    SELECT vh.*, o.order_no FROM vehicle_history vh
    LEFT JOIN orders o ON vh.order_id=o.id
    WHERE vh.vehicle_id=$1 ORDER BY vh.date DESC
  `, [req.params.id]);
  res.json(rows);
});

app.post("/api/vehicles", auth(), async (req, res) => {
  const { client_id, make, model, year, plate, vin, mileage, fuel_type, engine, color, notes } = req.body;
  const { rows } = await pool.query(
    "INSERT INTO vehicles (client_id,make,model,year,plate,vin,mileage,fuel_type,engine,color,notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *",
    [client_id, make, model, year, plate, vin, mileage, fuel_type, engine, color, notes]
  );
  res.json(rows[0]);
});

app.delete("/api/vehicles/:id", auth(["admin"]), async (req, res) => {
  await pool.query("DELETE FROM vehicles WHERE id=$1", [req.params.id]);
  res.json({ ok: true });
});

// ══════════════════════════════════════════════════════════════════════════════
// ORDERS
// ══════════════════════════════════════════════════════════════════════════════
app.get("/api/orders", auth(), async (req, res) => {
  const { rows } = await pool.query(`
    SELECT o.*,
      c.name as client_name, c.phone as client_phone,
      v.make, v.model, v.plate,
      u.name as mechanic_name,
      COALESCE(
        json_agg(json_build_object('id',oi.id,'type',oi.type,'name',oi.name,'qty',oi.qty,'unit_price',oi.unit_price,'vat',oi.vat))
        FILTER (WHERE oi.id IS NOT NULL), '[]'
      ) as items
    FROM orders o
    LEFT JOIN clients c ON o.client_id=c.id
    LEFT JOIN vehicles v ON o.vehicle_id=v.id
    LEFT JOIN users u ON o.mechanic_id=u.id
    LEFT JOIN order_items oi ON o.id=oi.order_id
    GROUP BY o.id, c.name, c.phone, v.make, v.model, v.plate, u.name
    ORDER BY o.created_at DESC
  `);
  res.json(rows);
});

app.post("/api/orders", auth(), async (req, res) => {
  const { client_id, vehicle_id, mechanic_id, priority, description, notes, mileage_in, date_deadline, items } = req.body;
  const year = new Date().getFullYear();
  const { rows: countRows } = await pool.query("SELECT COUNT(*) FROM orders WHERE EXTRACT(YEAR FROM created_at)=$1", [year]);
  const num = String(+countRows[0].count + 1).padStart(3, "0");
  const order_no = `ZL-${year}-${num}`;

  const { rows } = await pool.query(
    "INSERT INTO orders (order_no,client_id,vehicle_id,mechanic_id,priority,description,notes,mileage_in,date_deadline) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *",
    [order_no, client_id, vehicle_id, mechanic_id, priority||"Normalny", description, notes, mileage_in, date_deadline]
  );
  const order = rows[0];

  if (items?.length) {
    for (const it of items) {
      await pool.query(
        "INSERT INTO order_items (order_id,type,name,qty,unit_price,vat) VALUES ($1,$2,$3,$4,$5,$6)",
        [order.id, it.type, it.name, it.qty, it.unit_price, it.vat||23]
      );
    }
  }
  res.json({ ...order, order_no });
});

app.put("/api/orders/:id", auth(), async (req, res) => {
  const { status, priority, mechanic_id, description, notes, date_deadline } = req.body;
  await pool.query(
    "UPDATE orders SET status=$1,priority=$2,mechanic_id=$3,description=$4,notes=$5,date_deadline=$6 WHERE id=$7",
    [status, priority, mechanic_id, description, notes, date_deadline, req.params.id]
  );
  res.json({ ok: true });
});

// !! USUWANIE ZLECEŃ !!
app.delete("/api/orders/:id", auth(["admin","recepcja"]), async (req, res) => {
  await pool.query("DELETE FROM order_items WHERE order_id=$1", [req.params.id]);
  await pool.query("DELETE FROM orders WHERE id=$1", [req.params.id]);
  res.json({ ok: true });
});

// ══════════════════════════════════════════════════════════════════════════════
// PARTS (MAGAZYN)
// ══════════════════════════════════════════════════════════════════════════════
app.get("/api/parts", auth(), async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM parts ORDER BY name");
  res.json(rows);
});

app.post("/api/parts", auth(), async (req, res) => {
  const { catalog_no, name, unit, buy_price, sell_price, vat, stock, min_stock, category, supplier } = req.body;
  const { rows } = await pool.query(
    "INSERT INTO parts (catalog_no,name,unit,buy_price,sell_price,vat,stock,min_stock,category,supplier) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *",
    [catalog_no, name, unit||"szt", buy_price, sell_price, vat||23, stock||0, min_stock||2, category, supplier]
  );
  res.json(rows[0]);
});

app.put("/api/parts/:id", auth(), async (req, res) => {
  const { stock } = req.body;
  await pool.query("UPDATE parts SET stock=$1 WHERE id=$2", [stock, req.params.id]);
  res.json({ ok: true });
});

app.delete("/api/parts/:id", auth(["admin"]), async (req, res) => {
  await pool.query("DELETE FROM parts WHERE id=$1", [req.params.id]);
  res.json({ ok: true });
});

// ══════════════════════════════════════════════════════════════════════════════
// INVOICES
// ══════════════════════════════════════════════════════════════════════════════
app.get("/api/invoices", auth(), async (req, res) => {
  const { rows } = await pool.query(`
    SELECT i.*, c.name as client_name FROM invoices i
    LEFT JOIN clients c ON i.client_id=c.id
    ORDER BY i.created_at DESC
  `);
  res.json(rows);
});

app.post("/api/invoices", auth(), async (req, res) => {
  const { type, order_id, client_id, buyer_name, buyer_nip, buyer_address, buyer_city, date_issued, date_sale, date_due, payment, net, vat_amt, gross, notes, items } = req.body;
  const prefix = {faktura_vat:"FV",faktura_marza:"FM",paragon:"PA",wz:"WZ"}[type]||"FV";
  const year = new Date().getFullYear();
  const { rows: cnt } = await pool.query("SELECT COUNT(*) FROM invoices WHERE EXTRACT(YEAR FROM created_at)=$1", [year]);
  const number = `${prefix}/${year}/${String(+cnt[0].count+1).padStart(4,"0")}`;

  const { rows } = await pool.query(
    "INSERT INTO invoices (number,type,order_id,client_id,buyer_name,buyer_nip,buyer_address,buyer_city,date_issued,date_sale,date_due,payment,net,vat_amt,gross,notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *",
    [number, type, order_id, client_id, buyer_name, buyer_nip, buyer_address, buyer_city, date_issued, date_sale, date_due, payment, net, vat_amt, gross, notes]
  );
  res.json(rows[0]);
});

app.patch("/api/invoices/:id/ksef", auth(), async (req, res) => {
  await pool.query("UPDATE invoices SET ksef_status='wysłana' WHERE id=$1", [req.params.id]);
  res.json({ ok: true });
});

// ══════════════════════════════════════════════════════════════════════════════
// CALENDAR
// ══════════════════════════════════════════════════════════════════════════════
app.get("/api/calendar", auth(), async (req, res) => {
  const { from, to } = req.query;
  const { rows } = await pool.query(`
    SELECT cal.*, u.name as mechanic_name, v.plate, v.make, v.model
    FROM calendar cal
    LEFT JOIN users u ON cal.mechanic_id=u.id
    LEFT JOIN vehicles v ON cal.vehicle_id=v.id
    WHERE cal.start_time BETWEEN $1 AND $2
    ORDER BY cal.start_time
  `, [from||new Date(Date.now()-7*86400000), to||new Date(Date.now()+30*86400000)]);
  res.json(rows);
});

app.post("/api/calendar", auth(), async (req, res) => {
  const { title, description, mechanic_id, vehicle_id, order_id, start_time, end_time, color } = req.body;
  const { rows } = await pool.query(
    "INSERT INTO calendar (title,description,mechanic_id,vehicle_id,order_id,start_time,end_time,color) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *",
    [title, description, mechanic_id, vehicle_id, order_id, start_time, end_time, color||"#1a56db"]
  );
  res.json(rows[0]);
});

app.delete("/api/calendar/:id", auth(), async (req, res) => {
  await pool.query("DELETE FROM calendar WHERE id=$1", [req.params.id]);
  res.json({ ok: true });
});

// ══════════════════════════════════════════════════════════════════════════════
// SMS (Twilio)
// ══════════════════════════════════════════════════════════════════════════════
app.post("/api/sms/send", auth(), async (req, res) => {
  const { client_id, order_id, phone, message } = req.body;

  // Zapisz w logu
  const { rows } = await pool.query(
    "INSERT INTO sms_log (client_id,order_id,phone,message,status) VALUES ($1,$2,$3,$4,'pending') RETURNING *",
    [client_id, order_id, phone, message]
  );
  const smsId = rows[0].id;

  // Wyślij przez Twilio (jeśli skonfigurowany)
  if (process.env.TWILIO_SID && process.env.TWILIO_TOKEN) {
    try {
      const twilio = require("twilio")(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
      await twilio.messages.create({
        body: message,
        from: process.env.TWILIO_FROM,
        to:   phone,
      });
      await pool.query("UPDATE sms_log SET status='sent', sent_at=NOW() WHERE id=$1", [smsId]);
      res.json({ ok: true, status: "sent", smsId });
    } catch (err) {
      await pool.query("UPDATE sms_log SET status='error' WHERE id=$1", [smsId]);
      res.json({ ok: false, status: "error", error: err.message, smsId });
    }
  } else {
    // Tryb demo bez Twilio
    await pool.query("UPDATE sms_log SET status='demo', sent_at=NOW() WHERE id=$1", [smsId]);
    res.json({ ok: true, status: "demo", msg: "SMS zapisany (brak konfiguracji Twilio)", smsId });
  }
});

app.get("/api/sms/log", auth(["admin"]), async (req, res) => {
  const { rows } = await pool.query(`
    SELECT s.*, c.name as client_name FROM sms_log s
    LEFT JOIN clients c ON s.client_id=c.id
    ORDER BY s.created_at DESC LIMIT 100
  `);
  res.json(rows);
});

// SMS szablony
app.post("/api/sms/template", auth(), async (req, res) => {
  const { type, client_id, order_id, phone, order_no } = req.body;
  const templates = {
    gotowe:    `Szanowny Kliencie, Pana/Pani pojazd (zlecenie ${order_no}) jest gotowy do odbioru. Zapraszamy! Auto Serwis Mod4Cars`,
    przyjete:  `Szanowny Kliencie, przyjęliśmy zlecenie ${order_no}. O postępach prac będziemy informować. Auto Serwis Mod4Cars`,
    przypomnienie: `Przypomnienie: jutro upływa termin realizacji zlecenia ${order_no}. Auto Serwis Mod4Cars`,
  };
  const message = templates[type] || templates.gotowe;
  res.json({ message, phone });
});

// ══════════════════════════════════════════════════════════════════════════════
// RAPORTY FINANSOWE
// ══════════════════════════════════════════════════════════════════════════════
app.get("/api/reports/summary", auth(["admin","recepcja"]), async (req, res) => {
  const { month, year } = req.query;
  const y = year  || new Date().getFullYear();
  const m = month || new Date().getMonth() + 1;

  const [revenue, orders, topClients, monthlySales] = await Promise.all([
    pool.query(`
      SELECT
        COALESCE(SUM(gross),0) as total_gross,
        COALESCE(SUM(net),0)   as total_net,
        COALESCE(SUM(vat_amt),0) as total_vat,
        COUNT(*) as invoice_count
      FROM invoices
      WHERE EXTRACT(YEAR FROM date_issued)=$1 AND EXTRACT(MONTH FROM date_issued)=$2
    `, [y, m]),

    pool.query(`
      SELECT status, COUNT(*) as count FROM orders
      WHERE EXTRACT(YEAR FROM created_at)=$1 AND EXTRACT(MONTH FROM created_at)=$2
      GROUP BY status
    `, [y, m]),

    pool.query(`
      SELECT c.name, COALESCE(SUM(i.gross),0) as total
      FROM invoices i
      LEFT JOIN clients c ON i.client_id=c.id
      WHERE EXTRACT(YEAR FROM i.date_issued)=$1
      GROUP BY c.name ORDER BY total DESC LIMIT 5
    `, [y]),

    pool.query(`
      SELECT
        EXTRACT(MONTH FROM date_issued) as month,
        COALESCE(SUM(gross),0) as gross
      FROM invoices
      WHERE EXTRACT(YEAR FROM date_issued)=$1
      GROUP BY month ORDER BY month
    `, [y]),
  ]);

  res.json({
    revenue:     revenue.rows[0],
    orders:      orders.rows,
    topClients:  topClients.rows,
    monthlySales:monthlySales.rows,
    period:      { month: m, year: y },
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// ZEWNĘTRZNE API – PROXY (unika problemów CORS)
// ══════════════════════════════════════════════════════════════════════════════

// ── VIN DECODER (NHTSA – rządowa baza USA, bezpłatna) ────────────────────────
app.get("/api/vin/:vin", auth(), async (req, res) => {
  const vin = req.params.vin.trim().toUpperCase();
  if (vin.length !== 17) return res.status(400).json({ error: "VIN musi mieć dokładnie 17 znaków" });

  try {
    const url = `https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${vin}?format=json`;
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const data = await response.json();
    const r = data.Results?.[0];

    if (!r || !r.Make) return res.status(404).json({ error: "Nie znaleziono pojazdu dla tego VIN" });

    // Mapowanie paliwa
    const fuelMap = { "Gasoline": "Benzyna", "Diesel": "Diesel", "Electric": "Elektryczny", "Hybrid": "Hybryda", "CNG": "CNG", "LPG": "LPG" };

    res.json({
      ok: true,
      make:      r.Make || "",
      model:     r.Model || "",
      year:      +r.ModelYear || null,
      engine:    r.DisplacementL ? `${(+r.DisplacementL).toFixed(1)}L ${r.EngineCylinders ? r.EngineCylinders+"cyl" : ""}`.trim() : (r.EngineModel || ""),
      fuel_type: fuelMap[r.FuelTypePrimary] || r.FuelTypePrimary || "Benzyna",
      body_type: r.BodyClass || "",
      doors:     r.Doors || "",
      plant:     r.PlantCity ? `${r.PlantCity}, ${r.PlantCountry}` : "",
      raw:       { make: r.Make, model: r.Model, year: r.ModelYear, engine: r.EngineModel, displacement: r.DisplacementL, cylinders: r.EngineCylinders, fuel: r.FuelTypePrimary, body: r.BodyClass },
    });
  } catch (err) {
    res.status(500).json({ error: "Błąd połączenia z NHTSA: " + err.message });
  }
});

// ── GUS BIR – dane firmy po NIP ──────────────────────────────────────────────
// Używa publicznego API regon.stat.gov.pl (wymaga klucza) lub CEIDG API
app.get("/api/gus/:nip", auth(), async (req, res) => {
  const nip = req.params.nip.replace(/\D/g, "");
  if (nip.length !== 10) return res.status(400).json({ error: "NIP musi mieć 10 cyfr" });

  // Walidacja sumy kontrolnej NIP
  const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
  const sum = weights.reduce((s, w, i) => s + w * +nip[i], 0);
  if (sum % 11 !== +nip[9]) return res.status(400).json({ error: "Nieprawidłowy NIP (błędna suma kontrolna)" });

  try {
    // Próba 1: API REGON (wymaga klucza – ustaw GUS_KEY w .env)
    if (process.env.GUS_KEY) {
      // Tu byłoby wywołanie GUS BIR SOAP API – wymaga klucza z rejestracji
      // https://api.stat.gov.pl/Home/RegonApi
    }

    // Próba 2: Publiczne API CEIDG (Ministerstwo Rozwoju) – bezpłatne
    try {
      const ceidgRes = await fetch(
        `https://dane.gov.pl/api/3/action/datastore_search?resource_id=5bc6dde8-8dc3-4bcf-9d24-e8d9a27b0681&q=${nip}&limit=1`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (ceidgRes.ok) {
        const ceidgData = await ceidgRes.json();
        const rec = ceidgData?.result?.records?.[0];
        if (rec) {
          return res.json({
            ok: true,
            source: "CEIDG",
            nip,
            name:    rec.firma || rec.imie + " " + rec.nazwisko || "",
            address: (rec.ulica || "") + " " + (rec.nrNieruchomosci || ""),
            city:    (rec.kodPocztowy || "") + " " + (rec.miejscowosc || ""),
            regon:   rec.regon || "",
          });
        }
      }
    } catch {}

    // Próba 3: Wbudowane dane przykładowe dla demo
    return res.json({
      ok: true,
      source: "demo",
      nip,
      name:    `Firma ${nip.slice(-4)} Sp. z o.o.`,
      address: "ul. Przykładowa 1",
      city:    "00-001 Warszawa",
      regon:   nip.slice(0, 9),
      info:    "Aby pobierać pełne dane z GUS, zarejestruj się na api.stat.gov.pl i dodaj klucz GUS_KEY do pliku .env",
    });
  } catch (err) {
    res.status(500).json({ error: "Błąd: " + err.message });
  }
});

// ── CEPiK – dane pojazdu po tablicy rejestracyjnej ────────────────────────────
// CEPiK wymaga umowy z MC. Tu używamy danych demo + info jak uzyskać dostęp.
app.get("/api/cepik/:plate", auth(), async (req, res) => {
  const plate = req.params.plate.replace(/[\s-]/g, "").toUpperCase();
  if (plate.length < 4) return res.status(400).json({ error: "Podaj poprawny numer rejestracyjny" });

  // Znane tablice (demo)
  const demo = {
    "WA12345":  { make:"Volkswagen", model:"Golf VII",  year:2018, vin:"WVWZZZ1KZ9W123456", fuel_type:"Diesel",   engine:"2.0 TDI 150KM", color:"Czarny metalik" },
    "KR99001":  { make:"BMW",        model:"320i",      year:2020, vin:"WBA8E9C51HK123456", fuel_type:"Benzyna",  engine:"2.0 184KM",     color:"Biały alpejski" },
    "WA55500":  { make:"Toyota",     model:"Corolla",   year:2021, vin:"SB1ZE3JE60E654321", fuel_type:"Hybryda",  engine:"1.8 122KM",     color:"Szary" },
    "GD55511":  { make:"Skoda",      model:"Octavia",   year:2019, vin:"TMBZZZ1Z0L1234567", fuel_type:"Benzyna",  engine:"1.4 150KM",     color:"Niebieski" },
    "PO33322":  { make:"Audi",       model:"A4 B9",     year:2020, vin:"WAUZZZ8K1LA123456", fuel_type:"Diesel",   engine:"2.0 TDI 190KM", color:"Biały" },
  };

  if (demo[plate]) {
    return res.json({ ok: true, source: "demo", plate, ...demo[plate] });
  }

  res.json({
    ok: true,
    source: "demo",
    plate,
    make:      "—",
    model:     "—",
    year:      null,
    vin:       "",
    fuel_type: "Benzyna",
    engine:    "",
    color:     "",
    info:      "CEPiK wymaga umowy z Ministerstwem Cyfryzacji. Znane tablice demo: WA12345, KR99001, WA55500, GD55511, PO33322",
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SETTINGS – dane firmy zapisywane w bazie
// ══════════════════════════════════════════════════════════════════════════════
app.get("/api/settings", auth(), async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM settings WHERE id=1");
    res.json(rows[0] || {});
  } catch {
    res.json({});
  }
});

app.post("/api/settings", auth(["admin"]), async (req, res) => {
  const { name, nip, address, city, phone, email, bank, ksef_nip, ksef_token } = req.body;
  try {
    await pool.query(`
      INSERT INTO settings (id, name, nip, address, city, phone, email, bank, ksef_nip, ksef_token)
      VALUES (1, $1,$2,$3,$4,$5,$6,$7,$8,$9)
      ON CONFLICT (id) DO UPDATE SET
        name=$1, nip=$2, address=$3, city=$4, phone=$5, email=$6, bank=$7, ksef_nip=$8, ksef_token=$9, updated_at=NOW()
    `, [name, nip, address, city, phone, email, bank, ksef_nip, ksef_token]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── SPA FALLBACK ──────────────────────────────────────────────────────────────
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../dist/index.html"));
});

// ── START ──────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ WarsztatPro API działa na porcie ${PORT}`);
});
