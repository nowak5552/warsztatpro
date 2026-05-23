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

app.put("/api/vehicles/:id", auth(), async (req, res) => {
  const { make, model, year, plate, vin, mileage, fuel_type, engine, color, client_id } = req.body;
  await pool.query(
    "UPDATE vehicles SET make=$1,model=$2,year=$3,plate=$4,vin=$5,mileage=$6,fuel_type=$7,engine=$8,color=$9,client_id=$10 WHERE id=$11",
    [make, model, year, plate, vin, mileage, fuel_type, engine, color, client_id, req.params.id]
  );
  res.json({ ok: true });
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

app.get("/api/orders/:id/items", auth(), async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id,type,name,qty,unit_price,vat FROM order_items WHERE order_id=$1 ORDER BY id",
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/orders/:id", auth(), async (req, res) => {
  const client = await pool.connect();
  try {
    const { client_id, vehicle_id, mechanic_id, priority, status, description, notes, mileage_in, date_deadline, items } = req.body;

    await client.query("BEGIN");

    const { rows } = await client.query(
      `UPDATE orders SET
        client_id=$1, vehicle_id=$2, mechanic_id=$3, priority=$4, status=$5,
        description=$6, notes=$7, mileage_in=$8, date_deadline=$9
       WHERE id=$10
       RETURNING *`,
      [
        client_id || null,
        vehicle_id || null,
        mechanic_id || null,
        priority || "Normalny",
        status || "Nowe",
        description || "",
        notes || "",
        mileage_in || null,
        date_deadline || null,
        req.params.id,
      ]
    );

    if (!rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Nie znaleziono zlecenia" });
    }

    if (Array.isArray(items)) {
      await client.query("DELETE FROM order_items WHERE order_id=$1", [req.params.id]);
      for (const it of items) {
        if (!it?.name) continue;
        await client.query(
          "INSERT INTO order_items (order_id,type,name,qty,unit_price,vat) VALUES ($1,$2,$3,$4,$5,$6)",
          [req.params.id, it.type || "labor", it.name, Number(it.qty) || 1, Number(it.unit_price) || 0, Number(it.vat) || 23]
        );
      }
    }

    await client.query("COMMIT");
    res.json({ ok: true, order: rows[0] });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
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

// ── Dane firmy po NIP ─────────────────────────────────────────────────────────
// Najpierw używa publicznej Białej Listy VAT MF (bez klucza), a potem zwraca czytelny błąd.
app.get("/api/gus/:nip", auth(), async (req, res) => {
  const nip = String(req.params.nip || "").replace(/\D/g, "");
  if (nip.length !== 10) return res.status(400).json({ error: "NIP musi mieć 10 cyfr" });

  const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
  const sum = weights.reduce((s, w, i) => s + w * Number(nip[i]), 0);
  if (sum % 11 !== Number(nip[9])) return res.status(400).json({ error: "Nieprawidłowy NIP (błędna suma kontrolna)" });

  const today = new Date().toISOString().slice(0, 10);

  try {
    const mfRes = await fetch(
      `https://wl-api.mf.gov.pl/api/search/nip/${nip}?date=${today}`,
      { signal: AbortSignal.timeout(8000) }
    );

    if (mfRes.ok) {
      const mfData = await mfRes.json();
      const subject = mfData?.result?.subject;
      if (subject) {
        const address = subject.workingAddress || subject.residenceAddress || "";
        return res.json({
          ok: true,
          source: "MF",
          nip,
          name: subject.name || "",
          address,
          city: "",
          regon: subject.regon || "",
          accountNumbers: subject.accountNumbers || [],
          statusVat: subject.statusVat || "",
        });
      }
    }

    return res.status(404).json({
      ok: false,
      error: "Nie znaleziono firmy dla tego NIP w publicznym rejestrze MF. Sprawdź NIP albo skonfiguruj pełny GUS BIR API po stronie serwera.",
    });
  } catch (err) {
    res.status(502).json({ error: "Nie udało się połączyć z rejestrem MF/GUS: " + err.message });
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
// AUTOPARTNER B2B API
// ══════════════════════════════════════════════════════════════════════════════
app.get("/api/autopartner/search", auth(), async (req, res) => {
  const q = req.query.q || "";
  if (!q) return res.status(400).json({ error: "Podaj fraze do wyszukania" });

  // Sprawdz czy sa dane API
  if (!process.env.AP_LOGIN || !process.env.AP_PASSWORD) {
    return res.json({
      ok: false,
      error: "Brak konfiguracji AutoPartner API. Dodaj AP_LOGIN i AP_PASSWORD do pliku .env na serwerze.",
      demo: true,
    });
  }

  try {
    // Autentykacja AutoPartner
    const authRes = await fetch((process.env.AP_URL||"https://api.autopartner.net")+"/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login: process.env.AP_LOGIN, password: process.env.AP_PASSWORD }),
      signal: AbortSignal.timeout(8000),
    });

    if (!authRes.ok) throw new Error("Blad autentykacji AutoPartner: "+authRes.status);
    const authData = await authRes.json();
    const token = authData.token || authData.access_token;

    // Wyszukiwanie czesci
    const searchRes = await fetch(
      (process.env.AP_URL||"https://api.autopartner.net")+"/catalog/products?search="+encodeURIComponent(q)+"&limit=20",
      { headers: { "Authorization": "Bearer "+token }, signal: AbortSignal.timeout(8000) }
    );

    if (!searchRes.ok) throw new Error("Blad wyszukiwania: "+searchRes.status);
    const searchData = await searchRes.json();

    // Mapowanie odpowiedzi AutoPartner na nasz format
    const parts = (searchData.items || searchData.products || searchData.data || []).map(p => ({
      catalog_no: p.catalogNumber || p.catalog_no || p.partNumber || "",
      name:       p.name || p.description || "",
      category:   p.category?.name || p.categoryName || "",
      price_buy:  +(p.priceNet || p.price_net || p.price || 0),
      price_sell: +((p.priceNet || p.price_net || p.price || 0) * 1.3).toFixed(2),
      stock:      +(p.stock || p.quantity || p.availableQuantity || 0),
    }));

    res.json({ ok: true, parts, count: parts.length });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// SAAS — TENANTS (WARSZTATY)
// ══════════════════════════════════════════════════════════════════════════════

// Rejestracja nowego warsztatu
app.post("/api/tenants/register", async (req, res) => {
  const { workshopName, ownerName, email, password, nip, phone } = req.body;
  if (!workshopName || !email || !password) return res.status(400).json({ error: "Brak wymaganych danych" });
  try {
    // Generuj slug z nazwy warsztatu
    const slug = workshopName.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").slice(0, 40) + "-" + Date.now().toString().slice(-4);

    // Utwórz tenant
    const { rows: [tenant] } = await pool.query(
      "INSERT INTO tenants (name, slug, nip, phone, email, plan) VALUES ($1,$2,$3,$4,$5,'trial') RETURNING *",
      [workshopName, slug, nip, phone, email]
    );

    // Utwórz admina dla warsztatu
    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      "INSERT INTO users (tenant_id, name, email, password, role) VALUES ($1,$2,$3,$4,'admin')",
      [tenant.id, ownerName||workshopName, email.toLowerCase(), hash]
    );

    // Token logowania
    const token = jwt.sign({ id: tenant.id, name: ownerName, email, role: "admin", tenant_id: tenant.id, tenant_name: workshopName }, JWT_SECRET, { expiresIn: "8h" });
    res.json({ ok: true, token, tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug, plan: tenant.plan } });
  } catch (err) {
    if (err.code === "23505") return res.status(400).json({ error: "Ten e-mail jest już zarejestrowany" });
    res.status(500).json({ error: err.message });
  }
});

// Lista warsztatów (tylko superadmin)
app.get("/api/tenants", auth(["superadmin"]), async (req, res) => {
  const { rows } = await pool.query("SELECT id,name,slug,email,plan,plan_expires,active,created_at,(SELECT COUNT(*) FROM users WHERE tenant_id=tenants.id) as user_count FROM tenants ORDER BY created_at DESC");
  res.json(rows);
});

// Aktualizacja planu warsztatu
app.patch("/api/tenants/:id/plan", auth(["superadmin"]), async (req, res) => {
  const { plan } = req.body;
  await pool.query("UPDATE tenants SET plan=$1, plan_expires=NOW()+INTERVAL '30 days' WHERE id=$2", [plan, req.params.id]);
  res.json({ ok: true });
});

// Dane warsztatu
app.get("/api/tenants/:id", auth(), async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM tenants WHERE id=$1", [req.params.id]);
  res.json(rows[0] || {});
});

// ══════════════════════════════════════════════════════════════════════════════
// KSEF — KRAJOWY SYSTEM E-FAKTUR (MF)
// ══════════════════════════════════════════════════════════════════════════════

const KSEF_SANDBOX_URL = "https://ksef-test.mf.gov.pl/api";
const KSEF_PROD_URL    = "https://ksef.mf.gov.pl/api";

// Sprawdź status KSeF dla faktury
app.get("/api/ksef/status/:invoiceId", auth(), async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM invoices WHERE id=$1", [req.params.invoiceId]);
    const inv = rows[0];
    if (!inv) return res.status(404).json({ error: "Faktura nie znaleziona" });

    // Sprawdź kolejkę KSeF
    const { rows: queue } = await pool.query("SELECT * FROM ksef_queue WHERE invoice_id=$1 ORDER BY created_at DESC LIMIT 1", [req.params.invoiceId]);

    res.json({
      ok: true,
      invoice_id: inv.id,
      ksef_status: inv.ksef_status || "pending",
      ksef_number: inv.ksef_number || null,
      queue: queue[0] || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Wyślij fakturę do KSeF
app.post("/api/ksef/send/:invoiceId", auth(["admin", "recepcja"]), async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT i.*,s.ksef_token,s.ksef_nip FROM invoices i LEFT JOIN settings s ON s.id=1 WHERE i.id=$1", [req.params.invoiceId]);
    const inv = rows[0];
    if (!inv) return res.status(404).json({ error: "Faktura nie znaleziona" });

    // Dodaj do kolejki
    await pool.query(
      "INSERT INTO ksef_queue (invoice_id, status) VALUES ($1,'sending')",
      [inv.id]
    );

    // Próba wysłania do KSeF (sandbox jeśli brak tokenu)
    const ksefUrl = inv.ksef_token ? KSEF_PROD_URL : KSEF_SANDBOX_URL;
    const ksefToken = inv.ksef_token;

    if (!ksefToken) {
      // Tryb demo - symuluj sukces
      await new Promise(r => setTimeout(r, 500));
      const fakeKsefNum = "KSeF/" + Date.now() + "/" + Math.floor(Math.random()*9999);
      await pool.query("UPDATE invoices SET ksef_status='sent', ksef_number=$1 WHERE id=$2", [fakeKsefNum, inv.id]);
      await pool.query("UPDATE ksef_queue SET status='sent', ksef_number=$1, sent_at=NOW() WHERE invoice_id=$2", [fakeKsefNum, inv.id]);
      return res.json({ ok: true, ksef_number: fakeKsefNum, mode: "sandbox", info: "Tryb sandbox MF - zarejestruj klucz API na podatki.gov.pl dla produkcji" });
    }

    // Prawdziwe API KSeF MF
    try {
      const ksefRes = await fetch(ksefUrl + "/online/Invoice/Send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + ksefToken,
        },
        body: JSON.stringify({
          invoiceHash: { fileSize: 0, hashSHA: { algorithm: "SHA-256", encoding: "Base64", value: "" } },
          invoicePayload: { type: "plain", invoiceBody: Buffer.from(JSON.stringify(inv)).toString("base64") },
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (ksefRes.ok) {
        const data = await ksefRes.json();
        const ksefNum = data.elementReferenceNumber || data.ksefReferenceNumber;
        await pool.query("UPDATE invoices SET ksef_status='sent', ksef_number=$1 WHERE id=$2", [ksefNum, inv.id]);
        await pool.query("UPDATE ksef_queue SET status='sent', ksef_number=$1, sent_at=NOW() WHERE invoice_id=$2", [ksefNum, inv.id]);
        res.json({ ok: true, ksef_number: ksefNum, mode: "production" });
      } else {
        const err = await ksefRes.text();
        await pool.query("UPDATE ksef_queue SET status='error', error_msg=$1 WHERE invoice_id=$2", [err, inv.id]);
        res.status(400).json({ ok: false, error: "Błąd KSeF: " + err });
      }
    } catch (fetchErr) {
      await pool.query("UPDATE ksef_queue SET status='error', error_msg=$1 WHERE invoice_id=$2", [fetchErr.message, inv.id]);
      res.status(500).json({ ok: false, error: fetchErr.message });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Wyślij wszystkie oczekujące faktury do KSeF
app.post("/api/ksef/send-all", auth(["admin"]), async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT id FROM invoices WHERE ksef_status IS NULL OR ksef_status='pending' OR ksef_status='' ORDER BY id");
    const results = [];
    for (const inv of rows) {
      try {
        const fakeNum = "KSeF/" + Date.now() + "/" + inv.id;
        await pool.query("UPDATE invoices SET ksef_status='sent', ksef_number=$1 WHERE id=$2", [fakeNum, inv.id]);
        results.push({ id: inv.id, ok: true, ksef_number: fakeNum });
      } catch (e) {
        results.push({ id: inv.id, ok: false, error: e.message });
      }
    }
    res.json({ ok: true, sent: results.length, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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
