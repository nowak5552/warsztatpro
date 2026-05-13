import { useState, useEffect, useRef } from "react";

/* ═══════════════════════════════════════════════════════════════════════════
   WarsztatPro v2  ·  Clean white UI  ·  Full document creator
   ═══════════════════════════════════════════════════════════════════════════ */

// ── TOKENS ───────────────────────────────────────────────────────────────────
const T = {
  white:   "#ffffff",
  bg:      "#f4f6f9",
  card:    "#ffffff",
  border:  "#e4e9f0",
  borderHover: "#cbd5e1",
  brand:   "#1a56db",        // rich blue
  brandDk: "#1344b5",
  brandLt: "#eff4ff",
  orange:  "#f97316",
  green:   "#16a34a",
  greenLt: "#f0fdf4",
  red:     "#dc2626",
  redLt:   "#fef2f2",
  yellow:  "#d97706",
  yellowLt:"#fffbeb",
  purple:  "#7c3aed",
  purpleLt:"#f5f3ff",
  cyan:    "#0891b2",
  cyanLt:  "#ecfeff",
  text:    "#111827",
  textSm:  "#374151",
  textMut: "#6b7280",
  textXs:  "#9ca3af",
  sh1:     "0 1px 3px rgba(0,0,0,.07),0 1px 2px rgba(0,0,0,.04)",
  sh2:     "0 4px 16px rgba(0,0,0,.08)",
  sh3:     "0 12px 40px rgba(0,0,0,.13)",
  shBrand: "0 4px 14px rgba(26,86,219,.35)",
};

// ── HELPERS ───────────────────────────────────────────────────────────────────
const fmt     = n => new Intl.NumberFormat("pl-PL",{minimumFractionDigits:2,maximumFractionDigits:2}).format(+n||0);
const fmtDate = d => { try { return new Date(d).toLocaleDateString("pl-PL"); } catch{ return d; } };
const today   = () => new Date().toISOString().slice(0,10);
const addDays = (n) => { const d=new Date(); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); };
const uid     = () => Math.random().toString(36).slice(2,8).toUpperCase();
const VAT     = [23,8,5,0];
const calcTotals = items => {
  const net    = items.reduce((s,i)=>s+(+i.qty)*(+i.unitPrice),0);
  const vatAmt = items.reduce((s,i)=>s+(+i.qty)*(+i.unitPrice)*((+i.vat)/100),0);
  return { net, vatAmt, gross: net+vatAmt };
};
const docNum = (prefix) => `${prefix}/${new Date().getFullYear()}/${String(Math.floor(Math.random()*9000)+1000)}`;

// ── SEED DATA ─────────────────────────────────────────────────────────────────
const SEED_FIRM = { name:"Auto Serwis XYZ Sp. z o.o.", nip:"1234598760", address:"ul. Warsztatowa 15", city:"00-001 Warszawa", phone:"22 100 200 300", email:"biuro@autoserwisxyz.pl", bank:"PL61 1090 1014 0000 0712 1981 2874", ksefToken:"••••••••••••••••••••••••" };

const SEED_CLIENTS = [
  { id:"C001", name:"Jan Kowalski", nip:"8881234560", phone:"600 100 200", email:"jan@example.pl", address:"ul. Lipowa 5", city:"00-002 Warszawa", regon:"123456789" },
  { id:"C002", name:"AUTO SERWIS Nowak Sp. z o.o.", nip:"9876543210", phone:"500 200 300", email:"biuro@autonowak.pl", address:"ul. Motorowa 12", city:"30-001 Kraków", regon:"987654321" },
  { id:"C003", name:"Agnieszka Wiśniewska", nip:"", phone:"601 700 800", email:"agnieszka@example.pl", address:"ul. Różana 3", city:"02-001 Warszawa", regon:"" },
];
const SEED_CARS = [
  { id:"V001", clientId:"C001", make:"Volkswagen", model:"Golf VII", year:2018, plate:"WA12345", vin:"WVWZZZ1KZ9W123456", mileage:145000, fuelType:"Diesel", engine:"2.0 TDI 150KM", color:"Czarny metalik" },
  { id:"V002", clientId:"C002", make:"BMW", model:"320i", year:2020, plate:"KR99001", vin:"WBA8E9C51HK123456", mileage:87000, fuelType:"Benzyna", engine:"2.0 184KM", color:"Biały alpejski" },
  { id:"V003", clientId:"C003", make:"Toyota", model:"Corolla", year:2021, plate:"WA55500", vin:"SB1ZE3JE60E654321", mileage:42000, fuelType:"Hybryda", engine:"1.8 Hybrid 122KM", color:"Szary" },
];
const SEED_PARTS = [
  { id:"P001", catalogNo:"VW-OIL-FILTER", name:"Filtr oleju VW/Audi 2.0 TDI", unit:"szt", buyPrice:18.5, sellPrice:35, vat:23, stock:12, minStock:5, category:"Filtry", supplier:"Inter Cars" },
  { id:"P002", catalogNo:"BOSCH-BRAKE-F", name:"Klocki hamulcowe przód Bosch", unit:"kpl", buyPrice:89, sellPrice:159, vat:23, stock:1, minStock:2, category:"Hamulce", supplier:"Motointegrator" },
  { id:"P003", catalogNo:"MOB1-5W40-4L",  name:"Olej silnikowy Mobil1 5W-40 4L", unit:"szt", buyPrice:62, sellPrice:115, vat:23, stock:8, minStock:3, category:"Oleje", supplier:"Inter Cars" },
  { id:"P004", catalogNo:"GATES-BELT-KIT", name:"Pasek rozrządu Gates (komplet)", unit:"kpl", buyPrice:220, sellPrice:390, vat:23, stock:2, minStock:1, category:"Rozrząd", supplier:"Motointegrator" },
  { id:"P005", catalogNo:"BOSCH-SPARK-4",  name:"Świece zapłonowe Bosch (4 szt)", unit:"kpl", buyPrice:45, sellPrice:89, vat:23, stock:6, minStock:4, category:"Zapłon", supplier:"Inter Cars" },
];
const SEED_ORDERS = [
  { id:"ZL-2026-001", clientId:"C001", vehicleId:"V001", status:"W trakcie", priority:"Normalny", dateCreated:"2026-05-10", dateDeadline:"2026-05-14", mechanic:"Piotr Wiśniewski", description:"Wymiana oleju i filtrów + przegląd ogólny", items:[{type:"part",name:"Filtr oleju VW/Audi",qty:1,unitPrice:35,vat:23},{type:"part",name:"Olej Mobil1 5W-40 4L",qty:1,unitPrice:115,vat:23},{type:"labor",name:"Robocizna – wymiana oleju",qty:1,unitPrice:90,vat:23}], notes:"Klient prosi o kontakt po diagnostyce. Sprawdzić też hamulce." },
  { id:"ZL-2026-002", clientId:"C002", vehicleId:"V002", status:"Nowe", priority:"Pilny", dateCreated:"2026-05-12", dateDeadline:"2026-05-12", mechanic:"Marek Adamski", description:"Wymiana klocków hamulcowych przód + tarcze", items:[{type:"part",name:"Klocki hamulcowe przód Bosch",qty:1,unitPrice:159,vat:23},{type:"labor",name:"Robocizna – wymiana hamulców",qty:1,unitPrice:140,vat:23}], notes:"Auto zostawione rano, odbiór do 17:00." },
  { id:"ZL-2026-003", clientId:"C003", vehicleId:"V003", status:"Gotowe", priority:"Niski", dateCreated:"2026-05-08", dateDeadline:"2026-05-11", mechanic:"Piotr Wiśniewski", description:"Wymiana świec zapłonowych + inspekcja", items:[{type:"part",name:"Świece Bosch 4szt",qty:1,unitPrice:89,vat:23},{type:"labor",name:"Robocizna – świece",qty:1,unitPrice:60,vat:23}], notes:"" },
];

// ── STATUS / DOC CONFIG ───────────────────────────────────────────────────────
const STATUS_CFG = {
  "Nowe":      { color:T.brand,  bg:T.brandLt },
  "W trakcie": { color:T.yellow, bg:T.yellowLt },
  "Gotowe":    { color:T.green,  bg:T.greenLt },
  "Wydane":    { color:T.textMut,bg:"#f9fafb" },
  "Anulowane": { color:T.red,    bg:T.redLt },
};
const PRI_CFG = {
  "Pilny":    { color:T.red,    bg:T.redLt },
  "Normalny": { color:T.yellow, bg:T.yellowLt },
  "Niski":    { color:T.textMut,bg:"#f9fafb" },
};
const DOC_CFG = {
  faktura_vat:   { label:"Faktura VAT",       short:"FV",  color:T.brand,  bg:T.brandLt },
  faktura_marza: { label:"Faktura VAT Marża", short:"FM",  color:T.purple, bg:T.purpleLt },
  paragon:       { label:"Paragon",           short:"PA",  color:T.green,  bg:T.greenLt },
  wz:            { label:"Dokument WZ",       short:"WZ",  color:T.cyan,   bg:T.cyanLt },
};

// ── GUS / CEPIK MOCKS ────────────────────────────────────────────────────────
const GUS_DB = {
  "8881234560":{ name:"Jan Kowalski Serwis", address:"ul. Lipowa 5", city:"00-002 Warszawa", regon:"123456789", pkd:"45.20.Z" },
  "9876543210":{ name:"AUTO SERWIS Nowak Sp. z o.o.", address:"ul. Motorowa 12", city:"30-001 Kraków", regon:"987654321", pkd:"45.20.Z" },
};
const fetchGUS = async (nip) => {
  await new Promise(r=>setTimeout(r,900));
  const k = nip.replace(/\D/g,"");
  if (GUS_DB[k]) return { ok:true, data:{...GUS_DB[k],nip:k} };
  if (k.length===10) return { ok:true, data:{nip:k,name:"Firma "+k.slice(-4)+" Sp. z o.o.",address:"ul. Przykładowa 1",city:"00-001 Warszawa",regon:k.slice(0,9),pkd:"45.20.Z"} };
  return { ok:false, error:"Nie znaleziono NIP w bazie GUS" };
};
const CEPIK_DB = {
  "WA12345": { make:"Volkswagen", model:"Golf VII", year:2018, vin:"WVWZZZ1KZ9W123456", fuelType:"Diesel", engine:"1968 cm³ / 150 KM", color:"Czarny metalik" },
  "KR99001": { make:"BMW", model:"320i", year:2020, vin:"WBA8E9C51HK123456", fuelType:"Benzyna", engine:"1998 cm³ / 184 KM", color:"Biały alpejski" },
  "WA55500": { make:"Toyota", model:"Corolla", year:2021, vin:"SB1ZE3JE60E654321", fuelType:"Hybryda", engine:"1798 cm³ / 122 KM", color:"Szary" },
  "GD55511": { make:"Skoda", model:"Octavia", year:2019, vin:"TMBZZZ1Z0L1234567", fuelType:"Benzyna", engine:"1395 cm³ / 150 KM", color:"Niebieski" },
};
const fetchCEPiK = async (plate) => {
  await new Promise(r=>setTimeout(r,1100));
  const k = plate.replace(/[\s-]/g,"").toUpperCase();
  if (CEPIK_DB[k]) return { ok:true, data:{...CEPIK_DB[k],plate:k} };
  const makes=["Ford","Opel","Renault","Peugeot","Hyundai"]; const idx=k.charCodeAt(0)%5;
  return { ok:true, data:{plate:k,make:makes[idx],model:["Focus","Astra","Clio","208","i30"][idx],year:2016+idx*2,vin:"SIMULATED"+k,fuelType:"Benzyna",engine:"1600 cm³ / 120 KM",color:"Srebrny"} };
};

// ══════════════════════════════════════════════════════════════════════════════
// BASE UI COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

// ── LOGO SVG ──────────────────────────────────────────────────────────────────
const LogoSVG = ({ size=32 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <rect width="40" height="40" rx="10" fill="url(#lg)"/>
    <defs>
      <linearGradient id="lg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#1a56db"/>
        <stop offset="100%" stopColor="#1344b5"/>
      </linearGradient>
    </defs>
    {/* Wrench */}
    <path d="M26 8c-2.8 0-5 2.2-5 5 0 .6.1 1.2.3 1.7L9.7 26.3a1 1 0 000 1.4l2.6 2.6a1 1 0 001.4 0L25.3 18.7c.5.2 1.1.3 1.7.3 2.8 0 5-2.2 5-5 0-.5-.1-1-.2-1.4l-2.9 2.9-2.1-.7-.7-2.1 2.9-2.9C28 9.7 27.1 8 26 8z" fill="white" opacity=".95"/>
    {/* Gear teeth small */}
    <circle cx="12.5" cy="27.5" r="2" fill="white" opacity=".6"/>
  </svg>
);

const Logo = ({ collapsed }) => (
  <div style={{display:"flex",alignItems:"center",gap:10}}>
    <LogoSVG size={36}/>
    {!collapsed && (
      <div>
        <div style={{fontSize:17,fontWeight:900,letterSpacing:"-0.04em",lineHeight:1,color:T.text}}>
          Warsztat<span style={{color:T.brand}}>Pro</span>
        </div>
        <div style={{fontSize:10,color:T.textXs,letterSpacing:"0.12em",fontWeight:700,textTransform:"uppercase"}}>SYSTEM SERWISOWY</div>
      </div>
    )}
  </div>
);

// ── BADGE ────────────────────────────────────────────────────────────────────
const Badge = ({color,bg,children,dot}) => (
  <span style={{display:"inline-flex",alignItems:"center",gap:5,background:bg||color+"18",color,border:`1px solid ${color}28`,borderRadius:6,padding:"3px 9px",fontSize:11,fontWeight:700,letterSpacing:"0.04em",whiteSpace:"nowrap"}}>
    {dot && <span style={{width:5,height:5,borderRadius:"50%",background:color,display:"inline-block"}}/>}
    {children}
  </span>
);

// ── BUTTON ───────────────────────────────────────────────────────────────────
const Btn = ({onClick,color=T.brand,outline,ghost,children,full,sm,disabled,icon,danger}) => {
  const col = danger ? T.red : color;
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display:"inline-flex",alignItems:"center",justifyContent:"center",gap:6,
      background: ghost?"transparent": outline?"transparent":col,
      color: ghost?T.textMut: outline?col:"#fff",
      border: ghost?"none":`1.5px solid ${outline?col:col}`,
      borderRadius:8, padding: sm?"6px 14px":"10px 20px",
      fontFamily:"inherit",fontWeight:700,fontSize:sm?12:14,
      cursor:disabled?"not-allowed":"pointer",opacity:disabled?.5:1,
      width:full?"100%":"auto",transition:"all .15s",
      boxShadow: outline||ghost?"none":`0 2px 8px ${col}30`,
      letterSpacing:"0.01em",
    }}>{icon&&<span style={{fontSize:sm?13:15}}>{icon}</span>}{children}</button>
  );
};

// ── INPUT / SELECT ────────────────────────────────────────────────────────────
const Field = ({label,value,onChange,type="text",placeholder,options,required,hint,suffix,addonLabel,addonLoading,onAddon,rows}) => (
  <div style={{display:"flex",flexDirection:"column",gap:5}}>
    {label && <label style={{fontSize:11,color:T.textMut,fontWeight:700,letterSpacing:"0.07em",textTransform:"uppercase"}}>{label}{required&&<span style={{color:T.red}}> *</span>}</label>}
    <div style={{display:"flex",position:"relative"}}>
      {rows ? (
        <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows} style={{...fld,resize:"vertical",borderRadius:8}}/>
      ) : options ? (
        <select value={value} onChange={e=>onChange(e.target.value)} style={{...fld,borderRadius:addonLabel?"8px 0 0 8px":8}}>
          {options.map(o=><option key={o.v||o} value={o.v||o}>{o.l||o}</option>)}
        </select>
      ) : (
        <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
          style={{...fld,borderRadius:addonLabel?"8px 0 0 8px":8,paddingRight:suffix?36:13}}/>
      )}
      {suffix && <span style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",fontSize:13,color:T.textXs,fontWeight:600,pointerEvents:"none"}}>{suffix}</span>}
      {addonLabel && (
        <button onClick={onAddon} disabled={addonLoading||!value} style={{padding:"0 14px",background:addonLoading?T.textXs:T.brand,color:"#fff",border:"none",borderRadius:"0 8px 8px 0",fontFamily:"inherit",fontWeight:700,fontSize:12,cursor:"pointer",whiteSpace:"nowrap",minWidth:90,opacity:addonLoading||!value?.6:1}}>
          {addonLoading?"⏳ …":addonLabel}
        </button>
      )}
    </div>
    {hint&&<div style={{fontSize:11,color:T.textXs,marginTop:1}}>{hint}</div>}
  </div>
);
const fld = {background:T.white,border:`1.5px solid ${T.border}`,color:T.text,padding:"9px 13px",fontSize:14,fontFamily:"inherit",outline:"none",width:"100%",boxSizing:"border-box",transition:"border-color .15s"};

// ── CARD ─────────────────────────────────────────────────────────────────────
const Card = ({children,onClick,style,noPad}) => (
  <div onClick={onClick} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:noPad?0:20,boxShadow:T.sh1,cursor:onClick?"pointer":"default",transition:"box-shadow .15s,border-color .15s",...style}}
    onMouseEnter={e=>{if(onClick){e.currentTarget.style.boxShadow=T.sh2;e.currentTarget.style.borderColor=T.borderHover;}}}
    onMouseLeave={e=>{if(onClick){e.currentTarget.style.boxShadow=T.sh1;e.currentTarget.style.borderColor=T.border;}}}>
    {children}
  </div>
);

// ── MODAL ────────────────────────────────────────────────────────────────────
const Modal = ({title,sub,onClose,children,wide,xl}) => (
  <div style={{position:"fixed",inset:0,background:"rgba(17,24,39,.55)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16,backdropFilter:"blur(6px)"}} onClick={onClose}>
    <div onClick={e=>e.stopPropagation()} style={{background:T.white,borderRadius:16,width:"100%",maxWidth:xl?1000:wide?740:520,maxHeight:"93vh",overflowY:"auto",boxShadow:T.sh3,display:"flex",flexDirection:"column"}}>
      {/* Header */}
      <div style={{padding:"22px 28px 18px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexShrink:0}}>
        <div>
          <h2 style={{margin:0,fontSize:19,fontWeight:900,color:T.text}}>{title}</h2>
          {sub&&<div style={{fontSize:13,color:T.textMut,marginTop:2}}>{sub}</div>}
        </div>
        <button onClick={onClose} style={{background:"#f1f5f9",border:"none",color:T.textMut,fontSize:16,cursor:"pointer",borderRadius:8,width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>✕</button>
      </div>
      <div style={{padding:"22px 28px 24px",flex:1,overflowY:"auto"}}>{children}</div>
    </div>
  </div>
);

// ── SECTION HEADER ────────────────────────────────────────────────────────────
const SH = ({title,count,action,actionLabel,actionIcon,actionColor=T.brand,sub}) => (
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
    <div>
      <h1 style={{margin:0,fontSize:22,fontWeight:900,color:T.text,letterSpacing:"-0.02em"}}>
        {title} {count!==undefined&&<span style={{fontSize:16,color:T.textXs,fontWeight:600}}>({count})</span>}
      </h1>
      {sub&&<p style={{margin:"4px 0 0",fontSize:13,color:T.textMut}}>{sub}</p>}
    </div>
    {action&&<Btn onClick={action} icon={actionIcon||"＋"} color={actionColor}>{actionLabel}</Btn>}
  </div>
);

// ── STAT CARD ────────────────────────────────────────────────────────────────
const Stat = ({label,value,color,icon,sub,trend}) => (
  <Card>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:11,color:T.textXs,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>{label}</div>
        <div style={{fontSize:24,fontWeight:900,color:color||T.text,letterSpacing:"-0.02em",lineHeight:1}}>{value}</div>
        {sub&&<div style={{fontSize:12,color:T.textMut,marginTop:4}}>{sub}</div>}
        {trend&&<div style={{fontSize:12,color:trend>0?T.green:T.red,marginTop:4,fontWeight:600}}>{trend>0?"↑":"↓"} {Math.abs(trend)}% vs poprzedni mies.</div>}
      </div>
      <div style={{width:44,height:44,borderRadius:12,background:color?color+"15":"#f1f5f9",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{icon}</div>
    </div>
  </Card>
);

// ── TABLE ────────────────────────────────────────────────────────────────────
const Tbl = ({headers,children,minW}) => (
  <div style={{overflowX:"auto"}}>
    <table style={{width:"100%",borderCollapse:"collapse",minWidth:minW||500}}>
      <thead>
        <tr style={{borderBottom:`2px solid ${T.border}`,background:"#f9fafb"}}>
          {headers.map(h=><th key={h} style={{padding:"10px 14px",textAlign:"left",fontSize:11,color:T.textMut,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em",whiteSpace:"nowrap"}}>{h}</th>)}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  </div>
);
const TR = ({children,onClick}) => (
  <tr onClick={onClick} style={{borderBottom:`1px solid ${T.border}`,cursor:onClick?"pointer":"default",transition:"background .1s"}}
    onMouseEnter={e=>{if(onClick)e.currentTarget.style.background="#f8fafc";}}
    onMouseLeave={e=>{if(onClick)e.currentTarget.style.background="transparent";}}>
    {children}
  </tr>
);
const TD = ({children,bold,muted,right,nowrap}) => (
  <td style={{padding:"12px 14px",fontSize:13,color:muted?T.textMut:T.text,fontWeight:bold?700:400,textAlign:right?"right":"left",whiteSpace:nowrap?"nowrap":"normal"}}>
    {children}
  </td>
);

// ── ALERT ────────────────────────────────────────────────────────────────────
const Alert = ({color,children}) => (
  <div style={{background:color+"12",border:`1px solid ${color}30`,borderRadius:9,padding:"10px 14px",fontSize:13,color,display:"flex",gap:8,alignItems:"flex-start",marginTop:4}}>
    {children}
  </div>
);

// ── DIVIDER ──────────────────────────────────────────────────────────────────
const Div = ({label}) => (
  <div style={{display:"flex",alignItems:"center",gap:12,margin:"18px 0 14px"}}>
    <div style={{flex:1,height:1,background:T.border}}/>
    {label&&<span style={{fontSize:11,color:T.textXs,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",whiteSpace:"nowrap"}}>{label}</span>}
    <div style={{flex:1,height:1,background:T.border}}/>
  </div>
);

// ── PILL FILTER ───────────────────────────────────────────────────────────────
const Pill = ({active,color=T.brand,bg,onClick,children}) => (
  <button onClick={onClick} style={{padding:"6px 14px",borderRadius:20,border:`1.5px solid ${active?color:T.border}`,background:active?bg||color+"15":T.white,color:active?color:T.textMut,fontWeight:600,cursor:"pointer",fontFamily:"inherit",fontSize:12,whiteSpace:"nowrap",transition:"all .15s"}}>
    {children}
  </button>
);

// ══════════════════════════════════════════════════════════════════════════════
// SCREENS
// ══════════════════════════════════════════════════════════════════════════════

// ── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({orders,parts,invoices,clients,setModal,isMobile}) {
  const active   = orders.filter(o=>!["Wydane","Anulowane"].includes(o.status));
  const urgent   = orders.filter(o=>o.priority==="Pilny"&&o.status!=="Wydane");
  const lowStock = parts.filter(p=>p.stock<=p.minStock);
  const revenue  = invoices.reduce((s,i)=>s+(i.gross||0),0);

  return (
    <div>
      <div style={{marginBottom:28}}>
        <h1 style={{margin:"0 0 4px",fontSize:26,fontWeight:900,color:T.text,letterSpacing:"-0.03em"}}>Dzień dobry 👋</h1>
        <p style={{margin:0,color:T.textMut,fontSize:14}}>{new Date().toLocaleDateString("pl-PL",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</p>
      </div>

      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:14,marginBottom:28}}>
        <Stat label="Aktywne zlecenia" value={active.length} color={T.brand} icon="🔧" sub={`${urgent.length} pilnych`}/>
        <Stat label="Do realizacji dziś" value={orders.filter(o=>o.dateDeadline===today()&&o.status!=="Wydane").length} color={T.red} icon="📅"/>
        <Stat label="Niski stan mag." value={lowStock.length} color={T.yellow} icon="⚠️" sub={lowStock.map(p=>p.name.split(" ").slice(0,2).join(" ")).join(", ")||"OK"}/>
        <Stat label="Przychód – faktury" value={`${fmt(revenue)} zł`} color={T.green} icon="💰" trend={12}/>
      </div>

      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"2fr 1fr",gap:20}}>
        <Card>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <h3 style={{margin:0,fontSize:16,fontWeight:800,color:T.text}}>Ostatnie zlecenia</h3>
            <Badge color={T.brand} bg={T.brandLt} dot>{active.length} aktywnych</Badge>
          </div>
          {orders.slice(0,6).map(o=>{
            const sc=STATUS_CFG[o.status]||{};
            const cl=clients.find(c=>c.id===o.clientId);
            return (
              <div key={o.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 0",borderBottom:`1px solid ${T.border}`}}>
                <div>
                  <span style={{fontWeight:800,fontSize:13,color:T.brand,marginRight:8}}>{o.id}</span>
                  <Badge color={sc.color} bg={sc.bg}>{o.status}</Badge>
                  <div style={{fontSize:12,color:T.textMut,marginTop:3}}>{cl?.name} · {o.description.slice(0,40)}{o.description.length>40?"…":""}</div>
                </div>
                <div style={{fontWeight:800,color:T.green,fontSize:14,flexShrink:0,marginLeft:12}}>{fmt(calcTotals(o.items).gross)} zł</div>
              </div>
            );
          })}
        </Card>

        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <Card>
            <h3 style={{margin:"0 0 12px",fontSize:15,fontWeight:800,color:T.text}}>Integracje systemowe</h3>
            {[{label:"GUS BIR API",color:T.green,status:"Aktywna"},{label:"CEPiK API",color:T.green,status:"Aktywna"},{label:"KSeF MF",color:T.green,status:"Aktywna"},{label:"Inter Cars API",color:T.yellow,status:"Skonfiguruj"}].map(a=>(
              <div key={a.label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:`1px solid ${T.border}`}}>
                <span style={{fontSize:13,fontWeight:600,color:T.textSm}}>{a.label}</span>
                <Badge color={a.color} dot>{a.status}</Badge>
              </div>
            ))}
          </Card>
          {lowStock.length>0&&(
            <Card style={{borderColor:T.yellow+"66"}}>
              <h3 style={{margin:"0 0 12px",fontSize:15,fontWeight:800,color:T.yellow}}>⚠ Niski stan magazynu</h3>
              {lowStock.map(p=>(
                <div key={p.id} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${T.border}`}}>
                  <span style={{fontSize:13}}>{p.name.slice(0,26)}</span>
                  <span style={{color:T.red,fontWeight:800,fontSize:13}}>{p.stock} szt</span>
                </div>
              ))}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ── ORDERS ────────────────────────────────────────────────────────────────────
function Orders({orders,setOrders,clients,cars,invoices,setModal,isMobile}) {
  const [filter,setFilter]=useState("Wszystkie");
  const statuses=["Wszystkie","Nowe","W trakcie","Gotowe","Wydane","Anulowane"];
  const filtered=filter==="Wszystkie"?orders:orders.filter(o=>o.status===filter);

  return (
    <div>
      <SH title="Zlecenia serwisowe" count={orders.length} action={()=>setModal({type:"new_order"})} actionLabel="Nowe zlecenie" actionIcon="＋" sub="Lista wszystkich zleceń serwisowych"/>
      <div style={{display:"flex",gap:6,marginBottom:18,overflowX:"auto",paddingBottom:4,flexWrap:isMobile?"nowrap":"wrap"}}>
        {statuses.map(s=>{const sc=STATUS_CFG[s]||{color:T.brand,bg:T.brandLt};return(
          <Pill key={s} active={filter===s} color={sc.color} bg={sc.bg} onClick={()=>setFilter(s)}>{s} {filter===s&&"("+(s==="Wszystkie"?orders.length:orders.filter(o=>o.status===s).length)+")"}</Pill>
        );})}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {filtered.map(o=>{
          const cl=clients.find(c=>c.id===o.clientId);
          const car=cars.find(v=>v.id===o.vehicleId);
          const {gross}=calcTotals(o.items);
          const sc=STATUS_CFG[o.status]||{};
          const pc=PRI_CFG[o.priority]||{};
          const hasInv=invoices.some(i=>i.orderId===o.id);
          return (
            <Card key={o.id} onClick={()=>setModal({type:"order_detail",order:o})}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:16}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",gap:6,marginBottom:8,flexWrap:"wrap",alignItems:"center"}}>
                    <span style={{fontWeight:900,color:T.brand,fontSize:14}}>{o.id}</span>
                    <Badge color={sc.color} bg={sc.bg}>{o.status}</Badge>
                    <Badge color={pc.color} bg={pc.bg}>{o.priority}</Badge>
                    {hasInv&&<Badge color={T.green} bg={T.greenLt}>✓ Faktura</Badge>}
                  </div>
                  <div style={{fontWeight:700,fontSize:15,color:T.text,marginBottom:3}}>{cl?.name||"—"}</div>
                  {car&&<div style={{fontSize:13,color:T.textMut,marginBottom:3}}>🚗 {car.make} {car.model} · <strong style={{color:T.textSm}}>{car.plate}</strong> · {car.mileage?.toLocaleString()} km</div>}
                  <div style={{fontSize:13,color:T.textSm}}>{o.description}</div>
                  <div style={{display:"flex",gap:16,marginTop:6,fontSize:12,color:T.textMut}}>
                    <span>👤 {o.mechanic}</span>
                    <span>📅 Termin: <strong style={{color:new Date(o.dateDeadline)<new Date()&&o.status!=="Wydane"?T.red:T.textSm}}>{fmtDate(o.dateDeadline)}</strong></span>
                  </div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontWeight:900,fontSize:19,color:T.green}}>{fmt(gross)} zł</div>
                  <div style={{fontSize:11,color:T.textXs,marginBottom:10}}>brutto</div>
                  {!hasInv&&o.status!=="Anulowane"&&(
                    <Btn sm outline color={T.brand} onClick={e=>{e.stopPropagation();setModal({type:"new_invoice",order:o});}}>🧾 Wystaw dok.</Btn>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
        {filtered.length===0&&<div style={{textAlign:"center",color:T.textXs,padding:48,fontSize:15}}>Brak zleceń w tej kategorii</div>}
      </div>
    </div>
  );
}

// ── DOCUMENTS (FULL MODULE) ───────────────────────────────────────────────────
function Documents({invoices,setInvoices,orders,clients,setModal,isMobile}) {
  const [filter,setFilter]=useState("Wszystkie");
  const filtered=filter==="Wszystkie"?invoices:invoices.filter(i=>i.type===filter);
  const revenue=invoices.reduce((s,i)=>s+(i.gross||0),0);

  return (
    <div>
      <SH title="Dokumenty sprzedaży" count={invoices.length}
        action={()=>setModal({type:"new_doc_standalone"})} actionLabel="Nowy dokument" actionIcon="＋"
        sub="Faktury VAT, paragony, WZ, faktury VAT marża"/>

      {/* STATS ROW */}
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:12,marginBottom:20}}>
        {Object.entries(DOC_CFG).map(([k,v])=>(
          <div key={k} style={{background:v.bg,border:`1px solid ${v.color}30`,borderRadius:12,padding:14}}>
            <div style={{fontSize:11,color:v.color,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>{v.label}</div>
            <div style={{fontSize:26,fontWeight:900,color:v.color}}>{invoices.filter(i=>i.type===k).length}</div>
            <div style={{fontSize:12,color:T.textMut,marginTop:2}}>{fmt(invoices.filter(i=>i.type===k).reduce((s,i)=>s+i.gross,0))} zł</div>
          </div>
        ))}
      </div>

      {/* FILTER */}
      <div style={{display:"flex",gap:6,marginBottom:16,overflowX:"auto",paddingBottom:4}}>
        <Pill active={filter==="Wszystkie"} onClick={()=>setFilter("Wszystkie")}>Wszystkie</Pill>
        {Object.entries(DOC_CFG).map(([k,v])=>(
          <Pill key={k} active={filter===k} color={v.color} bg={v.bg} onClick={()=>setFilter(k)}>{v.label}</Pill>
        ))}
      </div>

      <Card noPad>
        <Tbl headers={["Numer","Typ","Klient","Data wyst.","Termin płat.","Netto","VAT","Brutto","KSeF","Akcje"]} minW={800}>
          {filtered.map(inv=>{
            const cl=clients.find(c=>c.id===inv.clientId);
            const dc=DOC_CFG[inv.type];
            return (
              <TR key={inv.id} onClick={()=>setModal({type:"print_invoice",inv})}>
                <TD bold><span style={{color:T.brand}}>{inv.number}</span></TD>
                <TD><Badge color={dc?.color||T.textMut} bg={dc?.bg}>{dc?.label||inv.type}</Badge></TD>
                <TD>{cl?.name||"—"}</TD>
                <TD muted nowrap>{fmtDate(inv.dateIssued)}</TD>
                <TD muted nowrap>{fmtDate(inv.dateDue)}</TD>
                <TD muted>{fmt(inv.net)} zł</TD>
                <TD muted>{fmt(inv.vatAmt)} zł</TD>
                <TD bold><span style={{color:T.green}}>{fmt(inv.gross)} zł</span></TD>
                <TD><Badge color={inv.ksefStatus==="wysłana"?T.green:T.yellow} bg={inv.ksefStatus==="wysłana"?T.greenLt:T.yellowLt} dot>{inv.ksefStatus==="wysłana"?"Wysłana":"Oczekuje"}</Badge></TD>
                <TD nowrap>
                  <div style={{display:"flex",gap:6}} onClick={e=>e.stopPropagation()}>
                    <Btn sm outline color={T.brand} onClick={()=>setModal({type:"print_invoice",inv})}>Podgląd</Btn>
                    {inv.ksefStatus!=="wysłana"&&inv.type==="faktura_vat"&&(
                      <Btn sm outline color={T.green} onClick={()=>setInvoices(p=>p.map(i=>i.id===inv.id?{...i,ksefStatus:"wysłana"}:i))}>KSeF</Btn>
                    )}
                  </div>
                </TD>
              </TR>
            );
          })}
          {filtered.length===0&&(
            <tr><td colSpan={10} style={{padding:40,textAlign:"center",color:T.textXs,fontSize:14}}>
              Brak dokumentów. Kliknij „Nowy dokument" aby wystawić fakturę, paragon lub WZ.
            </td></tr>
          )}
        </Tbl>
      </Card>
    </div>
  );
}

// ── WAREHOUSE ────────────────────────────────────────────────────────────────
function Warehouse({parts,setParts,setModal,isMobile}) {
  const [search,setSearch]=useState("");
  const [syncing,setSyncing]=useState(false);
  const [syncMsg,setSyncMsg]=useState("");
  const filtered=parts.filter(p=>p.name.toLowerCase().includes(search.toLowerCase())||p.catalogNo.toLowerCase().includes(search.toLowerCase()));
  const syncApi=()=>{setSyncing(true);setSyncMsg("");setTimeout(()=>{setSyncing(false);setSyncMsg("✓ Zsynchronizowano 5 pozycji z Inter Cars");},1800);};

  return (
    <div>
      <SH title="Magazyn części" count={parts.length} action={()=>setModal({type:"new_part"})} actionLabel="Dodaj część" sub="Stan magazynowy i ceny części"/>

      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:12,marginBottom:18}}>
        <Stat label="Pozycji" value={parts.length} color={T.brand} icon="📋"/>
        <Stat label="Niski stan" value={parts.filter(p=>p.stock<=p.minStock).length} color={T.red} icon="⚠️"/>
        <Stat label="Wartość zakup" value={`${fmt(parts.reduce((s,p)=>s+p.buyPrice*p.stock,0))} zł`} color={T.textSm} icon="💳"/>
        <Stat label="Wartość sprzed." value={`${fmt(parts.reduce((s,p)=>s+p.sellPrice*p.stock,0))} zł`} color={T.green} icon="💰"/>
      </div>

      <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap"}}>
        <div style={{flex:1,minWidth:200}}>
          <Field value={search} onChange={setSearch} placeholder="🔍 Szukaj po nazwie lub numerze katalogowym…"/>
        </div>
        <Btn outline color={T.cyan} onClick={syncApi} icon="🔄" sm>{syncing?"Synchronizacja…":"Sync z hurtownią (API)"}</Btn>
      </div>
      {syncMsg&&<Alert color={T.green}><span>{syncMsg}</span></Alert>}

      <Card noPad style={{marginTop:12}}>
        <Tbl headers={["Nr kat.","Nazwa","Kat.","Stan","Min","C. zakupu","C. sprzedaży","VAT","Dostawca",""]} minW={700}>
          {filtered.map(p=>(
            <TR key={p.id}>
              <TD muted><span style={{fontFamily:"monospace",fontSize:12}}>{p.catalogNo}</span></TD>
              <TD bold>{p.name}</TD>
              <TD><Badge color={T.brand} bg={T.brandLt}>{p.category}</Badge></TD>
              <TD bold><span style={{color:p.stock<=p.minStock?T.red:T.green}}>{p.stock} {p.unit}</span></TD>
              <TD muted>{p.minStock}</TD>
              <TD muted>{fmt(p.buyPrice)} zł</TD>
              <TD bold>{fmt(p.sellPrice)} zł</TD>
              <TD muted>{p.vat}%</TD>
              <TD muted>{p.supplier}</TD>
              <TD><Btn sm ghost danger onClick={()=>{if(window.confirm(`Usunąć ${p.name}?`))setParts(prev=>prev.filter(x=>x.id!==p.id));}}>Usuń</Btn></TD>
            </TR>
          ))}
        </Tbl>
      </Card>

      <Card style={{marginTop:18}}>
        <h3 style={{margin:"0 0 14px",fontSize:15,fontWeight:800}}>🔗 Integracje z hurtowniami (API)</h3>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)",gap:10}}>
          {[{name:"Inter Cars",status:"Połączona",color:T.green},{name:"Motointegrator",status:"Konfiguracja",color:T.yellow},{name:"Autopart",status:"Niepodłączona",color:T.textXs}].map(a=>(
            <div key={a.name} style={{background:T.bg,border:`1px solid ${T.border}`,borderRadius:10,padding:14}}>
              <div style={{fontWeight:700,marginBottom:8,fontSize:14}}>{a.name}</div>
              <Badge color={a.color} dot>{a.status}</Badge>
              <div style={{marginTop:10}}><Btn sm outline color={T.brand}>Konfiguruj</Btn></div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── CLIENTS ───────────────────────────────────────────────────────────────────
function Clients({clients,setClients,cars,setCars,setModal,isMobile}) {
  const [search,setSearch]=useState("");
  const filtered=clients.filter(c=>c.name.toLowerCase().includes(search.toLowerCase())||(c.nip||"").includes(search));
  return (
    <div>
      <SH title="Klienci i pojazdy" count={clients.length} action={()=>setModal({type:"new_client"})} actionLabel="Nowy klient" sub="Baza klientów z pojazdami"/>
      <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}}>
        <div style={{flex:1,minWidth:200}}><Field value={search} onChange={setSearch} placeholder="🔍 Szukaj klienta po nazwie lub NIP…"/></div>
        <Btn outline color={T.blue||T.brand} icon="🚗" onClick={()=>setModal({type:"new_car"})}>Dodaj pojazd</Btn>
      </div>
      {filtered.map(c=>{
        const cCars=cars.filter(v=>v.clientId===c.id);
        return (
          <Card key={c.id} style={{marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}>
              <div style={{flex:1}}>
                <div style={{fontWeight:900,fontSize:16,color:T.text,marginBottom:6}}>{c.name}</div>
                <div style={{display:"flex",gap:20,flexWrap:"wrap",fontSize:13,color:T.textMut}}>
                  {c.nip&&<span>🏢 NIP: <strong style={{color:T.textSm}}>{c.nip}</strong></span>}
                  {c.regon&&<span>REGON: {c.regon}</span>}
                  <span>📞 {c.phone}</span>
                  <span>✉ {c.email}</span>
                  <span>📍 {c.address}, {c.city}</span>
                </div>
              </div>
              <Btn sm ghost danger onClick={()=>{if(window.confirm(`Usunąć ${c.name}?`))setClients(p=>p.filter(x=>x.id!==c.id));}}>Usuń</Btn>
            </div>
            {cCars.length>0&&(
              <div style={{marginTop:12,display:"flex",gap:8,flexWrap:"wrap"}}>
                {cCars.map(v=>(
                  <div key={v.id} style={{background:T.brandLt,border:`1px solid ${T.brand}22`,borderRadius:9,padding:"7px 13px",fontSize:12,color:T.brand}}>
                    🚗 <strong>{v.make} {v.model}</strong> · <strong style={{color:T.brand}}>{v.plate}</strong> · {v.year} · {v.mileage?.toLocaleString()} km · {v.fuelType}
                  </div>
                ))}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

// ── KSEF ──────────────────────────────────────────────────────────────────────
function KSeF({invoices,setInvoices,isMobile}) {
  const [testSt,setTestSt]=useState("idle");
  const pending=invoices.filter(i=>i.ksefStatus!=="wysłana");
  const sent=invoices.filter(i=>i.ksefStatus==="wysłana");
  return (
    <div>
      <SH title="KSeF – e-Faktury" sub="Krajowy System e-Faktur · Ministerstwo Finansów"/>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(3,1fr)",gap:12,marginBottom:20}}>
        <Stat label="Do wysłania" value={pending.length} color={T.yellow} icon="📤"/>
        <Stat label="Wysłane" value={sent.length} color={T.green} icon="✅"/>
        <Stat label="Błędy" value={0} color={T.red} icon="❌"/>
      </div>
      <Card style={{marginBottom:16}}>
        <h3 style={{margin:"0 0 16px",fontSize:15,fontWeight:800}}>Konfiguracja połączenia</h3>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12}}>
          <Field label="NIP firmy" value="1234598760" onChange={()=>{}}/>
          <Field label="Środowisko" value="Produkcja" onChange={()=>{}} options={["Produkcja","Test (demo)"]}/>
          <div style={{gridColumn:isMobile?"auto":"1 / -1"}}>
            <Field label="Token autoryzacyjny KSeF" value="••••••••••••••••••••••••••••••••" onChange={()=>{}}/>
          </div>
        </div>
        <div style={{marginTop:14,display:"flex",gap:10,alignItems:"center"}}>
          <Btn onClick={()=>{setTestSt("testing");setTimeout(()=>setTestSt("ok"),1800);}}>
            {testSt==="testing"?"⏳ Testowanie…":"Testuj połączenie"}
          </Btn>
          {testSt==="ok"&&<Badge color={T.green} bg={T.greenLt} dot>Połączono z KSeF</Badge>}
        </div>
      </Card>
      <Card>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
          <h3 style={{margin:0}}>Faktury oczekujące na wysyłkę</h3>
          <Btn disabled={pending.length===0} onClick={()=>setInvoices(p=>p.map(i=>({...i,ksefStatus:"wysłana"})))}>Wyślij wszystkie ({pending.length})</Btn>
        </div>
        {pending.length===0&&<div style={{color:T.green,textAlign:"center",padding:20,fontWeight:600}}>✓ Wszystkie faktury wysłane do KSeF</div>}
        {pending.map(inv=>(
          <div key={inv.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderBottom:`1px solid ${T.border}`,flexWrap:"wrap",gap:8}}>
            <div><div style={{fontWeight:800,color:T.brand}}>{inv.number}</div><div style={{fontSize:12,color:T.textMut}}>{fmtDate(inv.dateIssued)} · {fmt(inv.gross)} zł brutto</div></div>
            <Btn sm onClick={()=>setInvoices(p=>p.map(i=>i.id===inv.id?{...i,ksefStatus:"wysłana"}:i))}>Wyślij</Btn>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ── SETTINGS ──────────────────────────────────────────────────────────────────
function Settings({firm,setFirm,isMobile}) {
  const [saved,setSaved]=useState(false);
  const set=k=>v=>setFirm(p=>({...p,[k]:v}));
  return (
    <div>
      <SH title="Ustawienia" sub="Dane firmy, pracownicy, integracje"/>
      <Card style={{maxWidth:640,marginBottom:16}}>
        <h3 style={{margin:"0 0 16px",fontSize:15,fontWeight:800}}>Dane firmy (nagłówek dokumentów)</h3>
        <div style={{display:"grid",gap:12}}>
          <Field label="Nazwa firmy" value={firm.name} onChange={set("name")} required/>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12}}>
            <Field label="NIP" value={firm.nip} onChange={set("nip")}/>
            <Field label="Telefon" value={firm.phone} onChange={set("phone")}/>
          </div>
          <Field label="Adres" value={firm.address} onChange={set("address")}/>
          <Field label="Kod pocztowy i miasto" value={firm.city} onChange={set("city")}/>
          <Field label="E-mail" value={firm.email} onChange={set("email")}/>
          <Field label="Numer konta bankowego (IBAN)" value={firm.bank} onChange={set("bank")}/>
          <Field label="Token KSeF" value={firm.ksefToken} onChange={set("ksefToken")}/>
        </div>
        <div style={{marginTop:16,display:"flex",gap:10,alignItems:"center"}}>
          <Btn onClick={()=>{setSaved(true);setTimeout(()=>setSaved(false),2500);}}>Zapisz ustawienia</Btn>
          {saved&&<Badge color={T.green} bg={T.greenLt} dot>Zapisano</Badge>}
        </div>
      </Card>
      <Card style={{maxWidth:640}}>
        <h3 style={{margin:"0 0 14px",fontSize:15,fontWeight:800}}>Pracownicy</h3>
        {["Piotr Wiśniewski – Mechanik","Marek Adamski – Mechanik","Anna Nowak – Recepcja / Admin"].map(u=>(
          <div key={u} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${T.border}`}}>
            <span style={{fontSize:14,color:T.textSm}}>{u}</span>
            <Badge color={T.green} bg={T.greenLt} dot>Aktywny</Badge>
          </div>
        ))}
        <div style={{marginTop:12}}><Btn outline color={T.brand} icon="＋">Dodaj pracownika</Btn></div>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MODAL: DOCUMENT CREATOR (standalone — pełny formularz)
// ══════════════════════════════════════════════════════════════════════════════
function DocCreatorModal({clients,firm,onClose,onSave,prefillOrder,prefillClient}) {
  const [type,setType]=useState("faktura_vat");
  const [clientId,setClientId]=useState(prefillClient||clients[0]?.id||"");
  const [buyerManual,setBuyerManual]=useState(!prefillClient);
  const [buyer,setBuyer]=useState({name:"",nip:"",address:"",city:""});
  const [payment,setPayment]=useState("Przelew");
  const [dateIssued,setDateIssued]=useState(today());
  const [dateSale,setDateSale]=useState(today());
  const [dateDue,setDateDue]=useState(addDays(14));
  const [items,setItems]=useState(
    prefillOrder ? prefillOrder.items.map(i=>({...i}))
    : [{type:"labor",name:"",qty:1,unitPrice:0,vat:23}]
  );
  const [notes,setNotes]=useState("");
  const [gusLoading,setGusLoading]=useState(false);
  const [gusMsg,setGusMsg]=useState(null);

  const dc=DOC_CFG[type];
  const number=docNum(dc.short);
  const {net,vatAmt,gross}=calcTotals(items);
  const selectedClient=clients.find(c=>c.id===clientId);

  const setItem=(i,k,v)=>setItems(p=>p.map((x,j)=>j===i?{...x,[k]:v}:x));
  const addItem=t=>setItems(p=>[...p,{type:t,name:"",qty:1,unitPrice:0,vat:23}]);
  const delItem=i=>setItems(p=>p.filter((_,j)=>j!==i));

  const lookupGUS=async()=>{
    const nip=buyer.nip;if(!nip)return;
    setGusLoading(true);setGusMsg(null);
    const res=await fetchGUS(nip);setGusLoading(false);
    if(res.ok){setBuyer(p=>({...p,name:res.data.name,address:res.data.address,city:res.data.city}));setGusMsg({ok:true,txt:"✓ Dane pobrane z GUS BIR"});}
    else setGusMsg({ok:false,txt:"✗ "+res.error});
  };

  const save=()=>{
    const inv={id:uid(),type,number,clientId:buyerManual?"":clientId,
      buyerName:buyerManual?buyer.name:selectedClient?.name,
      buyerNip:buyerManual?buyer.nip:selectedClient?.nip,
      buyerAddress:buyerManual?buyer.address:selectedClient?.address,
      buyerCity:buyerManual?buyer.city:selectedClient?.city,
      orderId:prefillOrder?.id||null,dateIssued,dateSale,dateDue,payment,items,net,vatAmt,gross,notes,ksefStatus:"oczekuje"};
    onSave(inv);
  };

  return (
    <Modal title={`Nowy dokument – ${dc.label}`} sub={`Nr: ${number}`} onClose={onClose} xl>
      {/* TYPE SELECTOR */}
      <div style={{marginBottom:20}}>
        <div style={{fontSize:11,color:T.textMut,fontWeight:700,letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:8}}>Typ dokumentu</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {Object.entries(DOC_CFG).map(([k,v])=>(
            <button key={k} onClick={()=>setType(k)} style={{padding:"9px 18px",borderRadius:9,border:`2px solid ${type===k?v.color:T.border}`,background:type===k?v.bg:T.white,color:type===k?v.color:T.textMut,fontWeight:700,cursor:"pointer",fontFamily:"inherit",fontSize:13,transition:"all .15s",display:"flex",alignItems:"center",gap:6}}>
              {type===k&&<span>✓</span>}{v.label}
            </button>
          ))}
        </div>
        {type==="faktura_marza" && <Alert color={T.purple}><span>Faktura VAT marża – VAT naliczany tylko od marży (różnicy ceny zakupu i sprzedaży). Stosowana przy sprzedaży używanych części/pojazdów.</span></Alert>}
        {type==="wz" && <Alert color={T.cyan}><span>Dokument WZ – Wydanie Zewnętrzne. Nie jest dokumentem rozliczeniowym, lecz magazynowym potwierdzającym wydanie towaru.</span></Alert>}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
        {/* LEFT: BUYER */}
        <div>
          <Div label="Nabywca"/>
          <div style={{display:"flex",gap:8,marginBottom:12}}>
            <Pill active={!buyerManual} onClick={()=>setBuyerManual(false)}>Z bazy klientów</Pill>
            <Pill active={buyerManual} onClick={()=>setBuyerManual(true)}>Wpisz ręcznie / GUS</Pill>
          </div>
          {!buyerManual ? (
            <Field label="Wybierz klienta" value={clientId} onChange={setClientId}
              options={clients.map(c=>({v:c.id,l:c.name}))}/>
          ) : (
            <div style={{display:"grid",gap:10}}>
              <Field label="NIP nabywcy" value={buyer.nip} onChange={v=>setBuyer(p=>({...p,nip:v}))} placeholder="0000000000" addonLabel="Pobierz z GUS" addonLoading={gusLoading} onAddon={lookupGUS} hint="Wpisz NIP i kliknij aby auto-uzupełnić dane z GUS"/>
              {gusMsg&&<Alert color={gusMsg.ok?T.green:T.red}><span>{gusMsg.txt}</span></Alert>}
              <Field label="Nazwa / Imię i nazwisko" value={buyer.name} onChange={v=>setBuyer(p=>({...p,name:v}))} required/>
              <Field label="Adres" value={buyer.address} onChange={v=>setBuyer(p=>({...p,address:v}))}/>
              <Field label="Kod i miasto" value={buyer.city} onChange={v=>setBuyer(p=>({...p,city:v}))}/>
            </div>
          )}

          {/* Show selected client info */}
          {!buyerManual&&selectedClient&&(
            <div style={{background:T.brandLt,border:`1px solid ${T.brand}25`,borderRadius:9,padding:"10px 14px",marginTop:10,fontSize:13,color:T.textSm}}>
              <div style={{fontWeight:700}}>{selectedClient.name}</div>
              {selectedClient.nip&&<div>NIP: {selectedClient.nip}</div>}
              <div>{selectedClient.address}, {selectedClient.city}</div>
            </div>
          )}
        </div>

        {/* RIGHT: DATES & PAYMENT */}
        <div>
          <Div label="Daty i płatność"/>
          <div style={{display:"grid",gap:10}}>
            <Field label="Data wystawienia" value={dateIssued} onChange={setDateIssued} type="date"/>
            <Field label="Data sprzedaży" value={dateSale} onChange={setDateSale} type="date"/>
            <Field label="Termin płatności" value={dateDue} onChange={setDateDue} type="date"/>
            <Field label="Forma płatności" value={payment} onChange={setPayment} options={["Przelew","Gotówka","Karta","BLIK","Kompensata"]}/>
          </div>

          {/* Seller preview */}
          <div style={{background:"#f8fafc",border:`1px solid ${T.border}`,borderRadius:9,padding:"10px 14px",marginTop:14,fontSize:12,color:T.textMut}}>
            <div style={{fontWeight:700,fontSize:13,color:T.textSm,marginBottom:4}}>Sprzedawca (Twoja firma)</div>
            <div>{firm.name}</div>
            <div>{firm.address}, {firm.city}</div>
            <div>NIP: {firm.nip}</div>
          </div>
        </div>
      </div>

      {/* ITEMS */}
      <Div label="Pozycje dokumentu"/>
      <div style={{background:"#f9fafb",border:`1px solid ${T.border}`,borderRadius:10,overflow:"hidden",marginBottom:12}}>
        {/* Table header */}
        <div style={{display:"grid",gridTemplateColumns:"2fr 80px 110px 70px 90px 32px",gap:8,padding:"8px 12px",background:T.border+"40",fontSize:11,color:T.textMut,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>
          <span>Nazwa</span><span>Ilość</span><span>Cena netto</span><span>VAT</span><span style={{textAlign:"right"}}>Brutto</span><span/>
        </div>
        {items.map((it,i)=>(
          <div key={i} style={{display:"grid",gridTemplateColumns:"2fr 80px 110px 70px 90px 32px",gap:8,padding:"8px 12px",borderBottom:`1px solid ${T.border}`,alignItems:"center"}}>
            <div>
              <div style={{marginBottom:4}}><Badge color={it.type==="part"?T.brand:T.purple} bg={it.type==="part"?T.brandLt:T.purpleLt} small>{it.type==="part"?"Część":"Robocizna"}</Badge></div>
              <Field value={it.name} onChange={v=>setItem(i,"name",v)} placeholder="Opis pozycji…"/>
            </div>
            <Field value={it.qty} onChange={v=>setItem(i,"qty",v)} type="number" placeholder="1"/>
            <Field value={it.unitPrice} onChange={v=>setItem(i,"unitPrice",v)} type="number" placeholder="0.00" suffix="zł"/>
            <Field value={it.vat} onChange={v=>setItem(i,"vat",v)} options={VAT.map(String)}/>
            <div style={{textAlign:"right",fontWeight:700,fontSize:14,color:T.green,paddingTop:24}}>{fmt((+it.qty)*(+it.unitPrice)*(1+(+it.vat)/100))} zł</div>
            <button onClick={()=>delItem(i)} style={{background:"none",border:"none",color:T.red,cursor:"pointer",fontSize:18,paddingTop:20}}>×</button>
          </div>
        ))}
      </div>
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        <Btn sm outline color={T.purple} icon="＋" onClick={()=>addItem("labor")}>Robocizna</Btn>
        <Btn sm outline color={T.brand} icon="＋" onClick={()=>addItem("part")}>Część / Towar</Btn>
      </div>

      {/* TOTALS */}
      <div style={{background:"linear-gradient(135deg,#f0f7ff,#e8f5e9)",border:`1px solid ${T.brand}20`,borderRadius:12,padding:16,marginBottom:14}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,textAlign:"center"}}>
          <div><div style={{fontSize:11,color:T.textMut,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>Netto</div><div style={{fontSize:20,fontWeight:900,color:T.textSm}}>{fmt(net)} zł</div></div>
          <div><div style={{fontSize:11,color:T.textMut,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>VAT</div><div style={{fontSize:20,fontWeight:900,color:T.yellow}}>{fmt(vatAmt)} zł</div></div>
          <div style={{background:T.white,borderRadius:10,padding:"8px 0",border:`2px solid ${T.green}30`}}><div style={{fontSize:11,color:T.green,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>Do zapłaty</div><div style={{fontSize:22,fontWeight:900,color:T.green}}>{fmt(gross)} zł</div></div>
        </div>
      </div>

      <Field label="Uwagi / informacje dodatkowe" value={notes} onChange={setNotes} placeholder="Np. zamówienie nr 123, uwagi do faktury…" rows={2}/>

      {type==="faktura_vat"&&<Alert color={T.brand}><span>📋 Faktura zostanie dodana do kolejki wysyłki KSeF po zapisaniu.</span></Alert>}

      <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:20}}>
        <Btn outline color={T.textMut} onClick={onClose}>Anuluj</Btn>
        <Btn onClick={save} disabled={items.every(i=>!i.name)} color={dc.color}>Wystaw {dc.label}</Btn>
      </div>
    </Modal>
  );
}

// ── MODAL: ORDER DETAIL ───────────────────────────────────────────────────────
function OrderDetailModal({order,clients,cars,invoices,onClose,onUpdate,setModal}) {
  const [o,setO]=useState({...order});
  const cl=clients.find(c=>c.id===o.clientId);
  const car=cars.find(v=>v.id===o.vehicleId);
  const {net,vatAmt,gross}=calcTotals(o.items);
  const hasInv=invoices.some(i=>i.orderId===o.id);
  return (
    <Modal title={`Zlecenie ${o.id}`} sub={cl?.name} onClose={onClose} wide>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
        <Field label="Status" value={o.status} onChange={v=>setO(p=>({...p,status:v}))} options={["Nowe","W trakcie","Gotowe","Wydane","Anulowane"]}/>
        <Field label="Priorytet" value={o.priority} onChange={v=>setO(p=>({...p,priority:v}))} options={["Pilny","Normalny","Niski"]}/>
        <Field label="Mechanik" value={o.mechanic} onChange={v=>setO(p=>({...p,mechanic:v}))}/>
        <Field label="Termin realizacji" value={o.dateDeadline} onChange={v=>setO(p=>({...p,dateDeadline:v}))} type="date"/>
        <div style={{gridColumn:"1 / -1"}}><Field label="Opis prac" value={o.description} onChange={v=>setO(p=>({...p,description:v}))}/></div>
        <div style={{gridColumn:"1 / -1"}}><Field label="Notatki" value={o.notes} onChange={v=>setO(p=>({...p,notes:v}))} rows={2}/></div>
      </div>
      {car&&<Alert color={T.brand}><span>🚗 {car.make} {car.model} · {car.plate} · {car.year} · {car.mileage?.toLocaleString()} km · {car.fuelType}</span></Alert>}
      <Div label="Pozycje zlecenia"/>
      {o.items.map((it,i)=>(
        <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",background:T.bg,borderRadius:10,marginBottom:6,border:`1px solid ${T.border}`}}>
          <div>
            <Badge color={it.type==="part"?T.brand:T.purple} bg={it.type==="part"?T.brandLt:T.purpleLt}>{it.type==="part"?"Część":"Robocizna"}</Badge>
            <div style={{fontWeight:600,fontSize:14,marginTop:4,color:T.text}}>{it.name}</div>
            <div style={{fontSize:12,color:T.textMut}}>{it.qty} × {fmt(it.unitPrice)} zł netto + {it.vat}% VAT</div>
          </div>
          <div style={{fontWeight:800,color:T.green,fontSize:15}}>{fmt(it.qty*it.unitPrice*(1+it.vat/100))} zł</div>
        </div>
      ))}
      <div style={{background:`linear-gradient(135deg,${T.brandLt},${T.greenLt})`,border:`1px solid ${T.brand}20`,borderRadius:12,padding:14,margin:"14px 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:13,color:T.textMut}}>Netto: {fmt(net)} zł &nbsp;·&nbsp; VAT: {fmt(vatAmt)} zł</span>
        <span style={{fontWeight:900,color:T.green,fontSize:22}}>BRUTTO: {fmt(gross)} zł</span>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:10,flexWrap:"wrap"}}>
        <Btn outline color={T.textMut} onClick={onClose}>Zamknij</Btn>
        {!hasInv&&o.status!=="Anulowane"&&<Btn outline color={T.brand} onClick={()=>{onClose();setModal({type:"new_doc_standalone",prefillOrder:o,prefillClient:o.clientId});}}>🧾 Wystaw dokument</Btn>}
        <Btn onClick={()=>onUpdate(o)}>Zapisz zmiany</Btn>
      </div>
    </Modal>
  );
}

// ── MODAL: NEW ORDER ──────────────────────────────────────────────────────────
function NewOrderModal({clients,cars,onClose,onSave}) {
  const [clientId,setClientId]=useState(clients[0]?.id||"");
  const [vehicleId,setVehicleId]=useState("");
  const [description,setDescription]=useState("");
  const [notes,setNotes]=useState("");
  const [mechanic,setMechanic]=useState("Piotr Wiśniewski");
  const [priority,setPriority]=useState("Normalny");
  const [deadline,setDeadline]=useState(addDays(3));
  const [items,setItems]=useState([{type:"labor",name:"",qty:1,unitPrice:100,vat:23}]);
  const cCars=cars.filter(v=>v.clientId===clientId);
  const {net,vatAmt,gross}=calcTotals(items);
  const orderId=`ZL-${new Date().getFullYear()}-${String(Math.floor(Math.random()*900)+100)}`;
  const setItem=(i,k,v)=>setItems(p=>p.map((x,j)=>j===i?{...x,[k]:v}:x));

  return (
    <Modal title="Nowe zlecenie serwisowe" onClose={onClose} wide>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
        <Field label="Klient *" value={clientId} onChange={v=>{setClientId(v);setVehicleId("");}} options={clients.map(c=>({v:c.id,l:c.name}))} required/>
        <Field label="Pojazd" value={vehicleId} onChange={setVehicleId} options={[{v:"",l:"— wybierz pojazd —"},...cCars.map(v=>({v:v.id,l:`${v.make} ${v.model} (${v.plate})`}))]}/>
        <Field label="Mechanik" value={mechanic} onChange={setMechanic} options={["Piotr Wiśniewski","Marek Adamski"]}/>
        <Field label="Priorytet" value={priority} onChange={setPriority} options={["Pilny","Normalny","Niski"]}/>
        <div style={{gridColumn:"1 / -1"}}><Field label="Termin realizacji" value={deadline} onChange={setDeadline} type="date"/></div>
        <div style={{gridColumn:"1 / -1"}}><Field label="Opis prac *" value={description} onChange={setDescription} placeholder="Krótki opis zlecenia…" required/></div>
        <div style={{gridColumn:"1 / -1"}}><Field label="Notatki" value={notes} onChange={setNotes} placeholder="Uwagi klienta, szczegóły…" rows={2}/></div>
      </div>
      <Div label="Pozycje zlecenia"/>
      {items.map((it,i)=>(
        <div key={i} style={{background:T.bg,border:`1px solid ${T.border}`,borderRadius:10,padding:"10px 12px",marginBottom:8}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
            <Badge color={it.type==="part"?T.brand:T.purple} bg={it.type==="part"?T.brandLt:T.purpleLt}>{it.type==="part"?"Część":"Robocizna"}</Badge>
            <button onClick={()=>setItems(p=>p.filter((_,j)=>j!==i))} style={{background:"none",border:"none",color:T.red,cursor:"pointer",fontSize:18}}>×</button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 70px 100px 70px",gap:8}}>
            <Field value={it.name} onChange={v=>setItem(i,"name",v)} placeholder="Nazwa pozycji…"/>
            <Field value={it.qty} onChange={v=>setItem(i,"qty",v)} type="number" placeholder="1"/>
            <Field value={it.unitPrice} onChange={v=>setItem(i,"unitPrice",v)} type="number" placeholder="Cena"/>
            <Field value={it.vat} onChange={v=>setItem(i,"vat",v)} options={VAT.map(String)}/>
          </div>
        </div>
      ))}
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        <Btn sm outline color={T.purple} icon="＋" onClick={()=>setItems(p=>[...p,{type:"labor",name:"",qty:1,unitPrice:100,vat:23}])}>Robocizna</Btn>
        <Btn sm outline color={T.brand} icon="＋" onClick={()=>setItems(p=>[...p,{type:"part",name:"",qty:1,unitPrice:0,vat:23}])}>Część</Btn>
      </div>
      <div style={{background:`linear-gradient(135deg,${T.brandLt},${T.greenLt})`,borderRadius:12,padding:14,marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:13,color:T.textMut}}>Netto: {fmt(net)} zł &nbsp;·&nbsp; VAT: {fmt(vatAmt)} zł</span>
        <span style={{fontWeight:900,color:T.green,fontSize:20}}>BRUTTO: {fmt(gross)} zł</span>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:10}}>
        <Btn outline color={T.textMut} onClick={onClose}>Anuluj</Btn>
        <Btn onClick={()=>onSave({id:orderId,clientId,vehicleId,status:"Nowe",priority,dateCreated:today(),dateDeadline:deadline,mechanic,description,items,notes})} disabled={!description||!clientId}>Utwórz zlecenie</Btn>
      </div>
    </Modal>
  );
}

// ── MODAL: NEW CLIENT ─────────────────────────────────────────────────────────
function NewClientModal({onClose,onSave}) {
  const [f,setF]=useState({name:"",nip:"",phone:"",email:"",address:"",city:"",regon:""});
  const [gusL,setGusL]=useState(false);const [gusM,setGusM]=useState(null);
  const set=k=>v=>setF(p=>({...p,[k]:v}));
  const lookupGUS=async()=>{setGusL(true);setGusM(null);const res=await fetchGUS(f.nip);setGusL(false);if(res.ok){setF(p=>({...p,name:res.data.name,address:res.data.address,city:res.data.city,regon:res.data.regon}));setGusM({ok:true,txt:"✓ Pobrano dane z GUS BIR"});}else setGusM({ok:false,txt:"✗ "+res.error});};
  return (
    <Modal title="Nowy klient" sub="Pobierz dane firmy z GUS BIR" onClose={onClose}>
      <div style={{display:"grid",gap:12}}>
        <Field label="NIP firmy" value={f.nip} onChange={set("nip")} placeholder="0000000000" addonLabel="Pobierz z GUS" addonLoading={gusL} onAddon={lookupGUS} hint="Wpisz NIP i kliknij aby auto-uzupełnić dane firmy z bazy GUS"/>
        {gusM&&<Alert color={gusM.ok?T.green:T.red}><span>{gusM.txt}</span></Alert>}
        <Field label="Nazwa / Imię i nazwisko *" value={f.name} onChange={set("name")} required/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Field label="REGON" value={f.regon} onChange={set("regon")}/>
          <Field label="Telefon" value={f.phone} onChange={set("phone")} type="tel"/>
          <Field label="E-mail" value={f.email} onChange={set("email")} type="email"/>
        </div>
        <Field label="Adres (ulica i numer)" value={f.address} onChange={set("address")}/>
        <Field label="Kod pocztowy i miasto" value={f.city} onChange={set("city")}/>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:20}}>
        <Btn outline color={T.textMut} onClick={onClose}>Anuluj</Btn>
        <Btn onClick={()=>onSave({...f,id:"C"+uid()})} disabled={!f.name}>Dodaj klienta</Btn>
      </div>
    </Modal>
  );
}

// ── MODAL: NEW CAR ────────────────────────────────────────────────────────────
function NewCarModal({clients,onClose,onSave}) {
  const [f,setF]=useState({clientId:clients[0]?.id||"",make:"",model:"",year:2020,plate:"",vin:"",mileage:0,fuelType:"Benzyna",engine:"",color:""});
  const [cepL,setCepL]=useState(false);const [cepM,setCepM]=useState(null);
  const set=k=>v=>setF(p=>({...p,[k]:v}));
  const lookupCEPiK=async()=>{setCepL(true);setCepM(null);const res=await fetchCEPiK(f.plate);setCepL(false);if(res.ok){setF(p=>({...p,make:res.data.make,model:res.data.model,year:res.data.year,vin:res.data.vin,fuelType:res.data.fuelType,engine:res.data.engine,color:res.data.color}));setCepM({ok:true,txt:`✓ Pobrano dane z CEPiK dla ${f.plate}`});}else setCepM({ok:false,txt:"✗ Nie znaleziono pojazdu"});};
  return (
    <Modal title="Dodaj pojazd" sub="Pobierz dane z bazy CEPiK po tablicy rejestracyjnej" onClose={onClose} wide>
      <div style={{display:"grid",gap:12}}>
        <Field label="Właściciel *" value={f.clientId} onChange={set("clientId")} options={clients.map(c=>({v:c.id,l:c.name}))} required/>
        <Field label="Numer rejestracyjny" value={f.plate} onChange={v=>set("plate")(v.toUpperCase())} placeholder="np. WA12345" addonLabel="Pobierz z CEPiK" addonLoading={cepL} onAddon={lookupCEPiK} hint="Wpisz tablicę i kliknij aby auto-uzupełnić dane pojazdu z CEPiK"/>
        {cepM&&<Alert color={cepM.ok?T.green:T.red}><span>{cepM.txt}</span></Alert>}
        <Div label="Dane pojazdu"/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Field label="Marka *" value={f.make} onChange={set("make")}/>
          <Field label="Model *" value={f.model} onChange={set("model")}/>
          <Field label="Rok produkcji" value={f.year} onChange={set("year")} type="number"/>
          <Field label="Paliwo" value={f.fuelType} onChange={set("fuelType")} options={["Benzyna","Diesel","Hybryda","Elektryczny","LPG","CNG"]}/>
          <Field label="Silnik / Moc" value={f.engine} onChange={set("engine")} placeholder="np. 1968 cm³ / 150 KM"/>
          <Field label="Kolor" value={f.color} onChange={set("color")}/>
          <Field label="Przebieg (km)" value={f.mileage} onChange={set("mileage")} type="number"/>
        </div>
        <Field label="VIN (17 znaków)" value={f.vin} onChange={set("vin")} placeholder="WVWZZZ…"/>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:20}}>
        <Btn outline color={T.textMut} onClick={onClose}>Anuluj</Btn>
        <Btn onClick={()=>onSave({...f,id:"V"+uid()})} disabled={!f.make||!f.model||!f.plate}>Dodaj pojazd</Btn>
      </div>
    </Modal>
  );
}

// ── MODAL: NEW PART ───────────────────────────────────────────────────────────
function NewPartModal({onClose,onSave}) {
  const [f,setF]=useState({catalogNo:"",name:"",unit:"szt",buyPrice:0,sellPrice:0,vat:23,stock:0,minStock:2,category:"Ogólne",supplier:""});
  const set=k=>v=>setF(p=>({...p,[k]:v}));
  return (
    <Modal title="Nowa część / towar" onClose={onClose}>
      <div style={{display:"grid",gap:12}}>
        <Field label="Nazwa *" value={f.name} onChange={set("name")} required/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Field label="Nr katalogowy" value={f.catalogNo} onChange={set("catalogNo")}/>
          <Field label="Kategoria" value={f.category} onChange={set("category")} options={["Filtry","Oleje","Hamulce","Rozrząd","Zapłon","Zawieszenie","Elektryka","Ogólne"]}/>
          <Field label="Cena zakupu netto (zł)" value={f.buyPrice} onChange={set("buyPrice")} type="number"/>
          <Field label="Cena sprzedaży netto (zł)" value={f.sellPrice} onChange={set("sellPrice")} type="number"/>
          <Field label="Stawka VAT (%)" value={f.vat} onChange={set("vat")} options={VAT.map(String)}/>
          <Field label="Jednostka" value={f.unit} onChange={set("unit")} options={["szt","kpl","L","kg","m"]}/>
          <Field label="Stan magazynowy" value={f.stock} onChange={set("stock")} type="number"/>
          <Field label="Stan minimalny" value={f.minStock} onChange={set("minStock")} type="number"/>
        </div>
        <Field label="Dostawca" value={f.supplier} onChange={set("supplier")}/>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:20}}>
        <Btn outline color={T.textMut} onClick={onClose}>Anuluj</Btn>
        <Btn onClick={()=>onSave({...f,id:"P"+uid()})} disabled={!f.name}>Dodaj część</Btn>
      </div>
    </Modal>
  );
}

// ── MODAL: PRINT INVOICE ──────────────────────────────────────────────────────
function PrintModal({inv,firm,onClose}) {
  const dc=DOC_CFG[inv.type]||{label:inv.type,color:T.brand};
  const buyerName=inv.buyerName||"—";
  const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  *{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;font-size:13px;padding:48px;color:#111;background:#fff}
  .logo{display:flex;align-items:center;gap:10;margin-bottom:4px}.logobox{width:38px;height:38px;background:linear-gradient(135deg,#1a56db,#1344b5);border-radius:9px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px}
  .logotxt{font-size:18px;font-weight:900;letter-spacing:-0.03em}.logotxt span{color:#1a56db}
  .sub{font-size:10px;color:#9ca3af;letter-spacing:.1em;text-transform:uppercase}
  h1{font-size:22px;font-weight:900;margin-bottom:6px;color:#1a56db}
  .head{display:flex;justify-content:space-between;margin-bottom:32px;gap:40px}
  .block{flex:1}.label{font-size:10px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px}
  .company{font-size:15px;font-weight:700;margin-bottom:4px}.line{font-size:13px;color:#374151;margin-bottom:2px}
  table{width:100%;border-collapse:collapse;margin-top:20px}
  th{background:#f8fafc;padding:10px 12px;text-align:left;border-bottom:2px solid #e4e9f0;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#6b7280}
  td{padding:11px 12px;border-bottom:1px solid #f1f5f9;font-size:13px}
  .totals{margin-top:24px;background:linear-gradient(135deg,#eff4ff,#f0fdf4);border-radius:12px;padding:18px;text-align:right}
  .tot-row{font-size:13px;color:#6b7280;margin-bottom:4px}.tot-big{font-size:22px;font-weight:900;color:#16a34a;margin-top:8px}
  .info{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:24px}
  .info-item{background:#f8fafc;border-radius:8px;padding:10px 14px}.info-label{font-size:10px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px}
  .info-val{font-size:14px;font-weight:600;color:#111}
  .footer{margin-top:40px;padding-top:16px;border-top:1px solid #e4e9f0;font-size:11px;color:#9ca3af;text-align:center}
  @media print{body{padding:20px}}
  </style></head><body>
  <div class="head">
    <div class="block">
      <div class="logo"><div class="logobox">⚙</div><div><div class="logotxt">Warsztat<span>Pro</span></div><div class="sub">System serwisowy</div></div></div>
      <div style="margin-top:16px"><div class="label">Sprzedawca</div>
        <div class="company">${firm.name}</div>
        <div class="line">${firm.address}, ${firm.city}</div>
        <div class="line">NIP: ${firm.nip}</div>
        <div class="line">${firm.phone} · ${firm.email}</div>
      </div>
    </div>
    <div style="text-align:right">
      <h1>${dc.label}</h1>
      <div style="font-size:16px;font-weight:700;color:#374151;margin-bottom:12px">${inv.number}</div>
      <div class="label">Nabywca</div>
      <div class="company">${buyerName}</div>
      ${inv.buyerNip?`<div class="line">NIP: ${inv.buyerNip}</div>`:""}
      ${inv.buyerAddress?`<div class="line">${inv.buyerAddress}, ${inv.buyerCity||""}</div>`:""}
    </div>
  </div>
  <div class="info">
    <div class="info-item"><div class="info-label">Data wystawienia</div><div class="info-val">${fmtDate(inv.dateIssued)}</div></div>
    <div class="info-item"><div class="info-label">Termin płatności</div><div class="info-val">${fmtDate(inv.dateDue)}</div></div>
    <div class="info-item"><div class="info-label">Forma płatności</div><div class="info-val">${inv.payment}</div></div>
    <div class="info-item"><div class="info-label">Nr konta (przelew)</div><div class="info-val" style="font-size:12px">${firm.bank}</div></div>
  </div>
  <table><thead><tr><th>#</th><th>Nazwa / opis</th><th>Ilość</th><th>Cena netto</th><th>VAT</th><th style="text-align:right">Wartość brutto</th></tr></thead><tbody>
  ${(inv.items||[]).map((it,i)=>`<tr><td style="color:#9ca3af">${i+1}</td><td><strong>${it.name}</strong></td><td>${it.qty} szt</td><td>${fmt(it.unitPrice)} zł</td><td>${it.vat}%</td><td style="text-align:right;font-weight:700">${fmt((+it.qty)*(+it.unitPrice)*(1+(+it.vat)/100))} zł</td></tr>`).join("")}
  </tbody></table>
  <div class="totals">
    <div class="tot-row">Wartość netto: <strong>${fmt(inv.net)} zł</strong></div>
    <div class="tot-row">Podatek VAT: <strong>${fmt(inv.vatAmt)} zł</strong></div>
    <div class="tot-big">Do zapłaty: ${fmt(inv.gross)} zł</div>
  </div>
  ${inv.notes?`<div style="margin-top:20px;background:#f8fafc;border-radius:8px;padding:12px;font-size:13px;color:#374151"><strong>Uwagi:</strong> ${inv.notes}</div>`:""}
  <div class="footer">Dokument wygenerowany przez WarsztatPro &nbsp;·&nbsp; KSeF: ${inv.ksefStatus} &nbsp;·&nbsp; ${new Date().toLocaleDateString("pl-PL")}</div>
  </body></html>`;

  return (
    <Modal title={`${dc.label} – ${inv.number}`} sub={`${buyerName} · ${fmt(inv.gross)} zł brutto`} onClose={onClose} xl>
      <div style={{display:"flex",gap:12,marginBottom:16,justifyContent:"flex-end"}}>
        <Badge color={dc.color} bg={dc.bg}>{dc.label}</Badge>
        <Badge color={inv.ksefStatus==="wysłana"?T.green:T.yellow} dot>{inv.ksefStatus==="wysłana"?"KSeF: wysłana":"KSeF: oczekuje"}</Badge>
      </div>
      <iframe srcDoc={html} style={{width:"100%",height:500,border:`1px solid ${T.border}`,borderRadius:12,marginBottom:16}}/>
      <div style={{display:"flex",justifyContent:"flex-end",gap:10}}>
        <Btn outline color={T.textMut} onClick={onClose}>Zamknij</Btn>
        <Btn icon="🖨️" onClick={()=>{const w=window.open("","_blank");w.document.write(html);w.document.close();setTimeout(()=>w.print(),400);}}>Drukuj / Zapisz PDF</Btn>
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// NAVIGATION
// ══════════════════════════════════════════════════════════════════════════════
const TABS=[
  {id:"dashboard",icon:"📊",label:"Pulpit"},
  {id:"orders",   icon:"🔧",label:"Zlecenia"},
  {id:"docs",     icon:"🧾",label:"Dokumenty"},
  {id:"warehouse",icon:"📦",label:"Magazyn"},
  {id:"clients",  icon:"👤",label:"Klienci"},
  {id:"ksef",     icon:"🏛️",label:"KSeF"},
  {id:"settings", icon:"⚙️",label:"Ustawienia"},
];

function Sidebar({tab,setTab,invoices}) {
  const pendingKSef=invoices.filter(i=>i.ksefStatus!=="wysłana"&&i.type==="faktura_vat").length;
  return (
    <nav style={{width:230,background:T.white,borderRight:`1px solid ${T.border}`,display:"flex",flexDirection:"column",padding:"0 10px",position:"fixed",top:0,bottom:0,left:0,zIndex:100,boxShadow:"2px 0 16px rgba(0,0,0,.05)"}}>
      <div style={{padding:"22px 10px 20px",borderBottom:`1px solid ${T.border}`,marginBottom:8}}><Logo/></div>
      <div style={{flex:1,overflowY:"auto",padding:"4px 0"}}>
        {TABS.map(t=>{
          const active=tab===t.id;
          return (
            <button key={t.id} onClick={()=>setTab(t.id)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,padding:"10px 12px",borderRadius:10,border:"none",background:active?"linear-gradient(135deg,"+T.brandLt+",#e8f5ff)":"transparent",color:active?T.brand:T.textMut,fontWeight:active?700:500,fontSize:14,cursor:"pointer",textAlign:"left",width:"100%",marginBottom:2,transition:"all .15s",fontFamily:"inherit",borderLeft:`3px solid ${active?T.brand:"transparent"}`}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:16}}>{t.icon}</span>{t.label}
              </div>
              {t.id==="ksef"&&pendingKSef>0&&<span style={{background:T.red,color:"#fff",borderRadius:20,fontSize:10,fontWeight:800,padding:"1px 6px",minWidth:18,textAlign:"center"}}>{pendingKSef}</span>}
            </button>
          );
        })}
      </div>
      <div style={{padding:"14px 10px",borderTop:`1px solid ${T.border}`,fontSize:11,color:T.textXs}}>
        <div style={{fontWeight:700,marginBottom:4}}>WarsztatPro v2.0</div>
        <div style={{color:T.green}}>● GUS BIR aktywny</div>
        <div style={{color:T.green}}>● CEPiK aktywny</div>
        <div style={{color:T.green}}>● KSeF aktywny</div>
      </div>
    </nav>
  );
}

function BottomNav({tab,setTab,invoices}) {
  const pendingKSef=invoices.filter(i=>i.ksefStatus!=="wysłana"&&i.type==="faktura_vat").length;
  const mTabs=TABS.filter(t=>t.id!=="settings");
  return (
    <nav style={{position:"fixed",bottom:0,left:0,right:0,background:T.white,borderTop:`1px solid ${T.border}`,display:"flex",zIndex:100,boxShadow:"0 -4px 20px rgba(0,0,0,.07)"}}>
      {mTabs.map(t=>(
        <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"8px 2px 10px",background:"none",border:"none",cursor:"pointer",color:tab===t.id?T.brand:T.textXs,fontFamily:"inherit",transition:"all .15s",position:"relative"}}>
          <span style={{fontSize:tab===t.id?21:18,transition:"font-size .15s"}}>{t.icon}</span>
          <span style={{fontSize:9,fontWeight:tab===t.id?800:500,marginTop:2}}>{t.label}</span>
          {tab===t.id&&<div style={{position:"absolute",bottom:0,left:"50%",transform:"translateX(-50%)",width:22,height:3,background:T.brand,borderRadius:"2px 2px 0 0"}}/>}
          {t.id==="ksef"&&pendingKSef>0&&<span style={{position:"absolute",top:6,right:"calc(50% - 16px)",background:T.red,color:"#fff",borderRadius:20,fontSize:9,fontWeight:800,padding:"0 4px",minWidth:14,textAlign:"center"}}>{pendingKSef}</span>}
        </button>
      ))}
    </nav>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ROOT
// ══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [tab,setTab]=useState("dashboard");
  const [firm,setFirm]=useState(SEED_FIRM);
  const [clients,setClients]=useState(SEED_CLIENTS);
  const [cars,setCars]=useState(SEED_CARS);
  const [parts,setParts]=useState(SEED_PARTS);
  const [orders,setOrders]=useState(SEED_ORDERS);
  const [invoices,setInvoices]=useState([]);
  const [modal,setModal]=useState(null);
  const [isMobile,setIsMobile]=useState(window.innerWidth<768);

  useEffect(()=>{const h=()=>setIsMobile(window.innerWidth<768);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[]);

  const closeModal=()=>setModal(null);
  const sp={isMobile,setModal,clients,cars,parts,orders,setOrders,invoices,setInvoices};

  const saveInvoice=(inv)=>{
    setInvoices(p=>[...p,inv]);
    if(modal?.prefillOrder) setOrders(p=>p.map(o=>o.id===modal.prefillOrder.id?{...o,status:"Gotowe"}:o));
    closeModal();
  };

  return (
    <div style={{display:"flex",minHeight:"100vh",background:T.bg,color:T.text,fontFamily:"'Inter','Segoe UI',sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box} input,select,textarea{font-family:inherit}
        input:focus,select:focus,textarea:focus{outline:none;border-color:${T.brand}!important;box-shadow:0 0 0 3px ${T.brand}18}
        ::-webkit-scrollbar{width:6px;height:6px} ::-webkit-scrollbar-track{background:#f1f5f9} ::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:3px}
      `}</style>

      {!isMobile&&<Sidebar tab={tab} setTab={setTab} invoices={invoices}/>}

      <main style={{marginLeft:isMobile?0:230,flex:1,maxWidth:isMobile?"100vw":"calc(100vw - 230px)",minHeight:"100vh"}}>
        {isMobile&&(
          <div style={{background:T.white,borderBottom:`1px solid ${T.border}`,padding:"14px 16px",position:"sticky",top:0,zIndex:50,boxShadow:T.sh1}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <Logo/><Badge color={T.green} bg={T.greenLt} dot>KSeF aktywny</Badge>
            </div>
          </div>
        )}
        <div style={{padding:isMobile?"20px 16px 96px":"28px 32px"}}>
          {tab==="dashboard"&&<Dashboard {...sp} setClients={setClients}/>}
          {tab==="orders"   &&<Orders    {...sp}/>}
          {tab==="docs"     &&<Documents {...sp}/>}
          {tab==="warehouse"&&<Warehouse {...sp} setParts={setParts}/>}
          {tab==="clients"  &&<Clients   {...sp} setClients={setClients} setCars={setCars}/>}
          {tab==="ksef"     &&<KSeF      {...sp}/>}
          {tab==="settings" &&<Settings  firm={firm} setFirm={setFirm} isMobile={isMobile}/>}
        </div>
      </main>

      {isMobile&&<BottomNav tab={tab} setTab={setTab} invoices={invoices}/>}

      {/* MODALS */}
      {modal?.type==="new_order"&&<NewOrderModal clients={clients} cars={cars} onClose={closeModal} onSave={o=>{setOrders(p=>[...p,o]);closeModal();}}/>}
      {modal?.type==="order_detail"&&<OrderDetailModal order={modal.order} clients={clients} cars={cars} invoices={invoices} onClose={closeModal} setModal={setModal} onUpdate={u=>{setOrders(p=>p.map(o=>o.id===u.id?u:o));closeModal();}}/>}
      {modal?.type==="new_doc_standalone"&&<DocCreatorModal clients={clients} firm={firm} onClose={closeModal} onSave={saveInvoice} prefillOrder={modal.prefillOrder||null} prefillClient={modal.prefillClient||null}/>}
      {modal?.type==="new_client"&&<NewClientModal onClose={closeModal} onSave={c=>{setClients(p=>[...p,c]);closeModal();}}/>}
      {modal?.type==="new_car"&&<NewCarModal clients={clients} onClose={closeModal} onSave={v=>{setCars(p=>[...p,v]);closeModal();}}/>}
      {modal?.type==="new_part"&&<NewPartModal onClose={closeModal} onSave={p=>{setParts(prev=>[...prev,p]);closeModal();}}/>}
      {modal?.type==="print_invoice"&&<PrintModal inv={modal.inv} firm={firm} onClose={closeModal}/>}
    </div>
  );
}
