import { useState, useEffect, useCallback, useRef } from "react";

/* ═══════════════════════════════════════════════════════════════════════════
   WarsztatPro v3.0  ·  Pełna aplikacja z backendem
   Moduły: Logowanie · Zlecenia · Faktury · Magazyn · Klienci · 
           Kalendarz · Historia pojazdów · Raporty · SMS · KSeF
═══════════════════════════════════════════════════════════════════════════ */

const API = "/api";
// T is set dynamically based on theme (see LIGHT/DARK above)
// ── DARK THEME ────────────────────────────────────────────────────────────────
const DARK = {
  bg:"#0f172a",white:"#1e293b",card:"#1e293b",border:"#334155",
  brand:"#3b82f6",brandDk:"#2563eb",brandLt:"rgba(59,130,246,.15)",
  green:"#22c55e",greenLt:"rgba(34,197,94,.12)",greenDk:"#16a34a",
  red:"#f87171",redLt:"rgba(248,113,113,.12)",
  yellow:"#fbbf24",yellowLt:"rgba(251,191,36,.12)",
  purple:"#a78bfa",purpleLt:"rgba(167,139,250,.12)",
  cyan:"#22d3ee",cyanLt:"rgba(34,211,238,.12)",
  orange:"#fb923c",orangeLt:"rgba(251,146,60,.12)",
  text:"#f1f5f9",textSm:"#cbd5e1",textMut:"#94a3b8",textXs:"#64748b",
  sh1:"0 1px 3px rgba(0,0,0,.3)",sh2:"0 4px 6px rgba(0,0,0,.4)",sh3:"0 20px 60px rgba(0,0,0,.6)",
  sidebar:"#020617",sidebarHover:"#0f172a",sidebarActive:"#1e40af",sidebarText:"#64748b",sidebarTextActive:"#f1f5f9",
};
const LIGHT = {
  bg:"#f1f5f9",white:"#ffffff",card:"#ffffff",border:"#e2e8f0",
  brand:"#2563eb",brandDk:"#1d4ed8",brandLt:"#eff6ff",
  green:"#16a34a",greenLt:"#f0fdf4",greenDk:"#15803d",
  red:"#dc2626",redLt:"#fef2f2",
  yellow:"#d97706",yellowLt:"#fffbeb",
  purple:"#7c3aed",purpleLt:"#f5f3ff",
  cyan:"#0891b2",cyanLt:"#ecfeff",
  orange:"#ea580c",orangeLt:"#fff7ed",
  text:"#0f172a",textSm:"#334155",textMut:"#64748b",textXs:"#94a3b8",
  sh1:"0 1px 3px rgba(0,0,0,.06),0 1px 2px rgba(0,0,0,.04)",sh2:"0 4px 6px rgba(0,0,0,.07)",sh3:"0 20px 60px rgba(0,0,0,.15)",
  sidebar:"#0f172a",sidebarHover:"#1e293b",sidebarActive:"#1e40af",sidebarText:"#94a3b8",sidebarTextActive:"#ffffff",
};

// Global theme state
let _theme = localStorage.getItem("wp_theme")||"light";
let T = _theme==="dark" ? {...DARK} : {...LIGHT};

const fmt = n => new Intl.NumberFormat("pl-PL",{minimumFractionDigits:2,maximumFractionDigits:2}).format(+n||0);
const fmtDate = d => d ? new Date(d).toLocaleDateString("pl-PL") : "—";
const today = () => new Date().toISOString().slice(0,10);
const uid = () => Math.random().toString(36).slice(2,8).toUpperCase();
const calcTotals = items => {
  const net=items.reduce((s,i)=>s+(+i.qty)*(+i.unit_price||+i.unitPrice||0),0);
  const vatAmt=items.reduce((s,i)=>s+(+i.qty)*(+i.unit_price||+i.unitPrice||0)*((+i.vat)/100),0);
  return {net,vatAmt,gross:net+vatAmt};
};

const ROLE_CFG = {
  admin:    {label:"Administrator",color:T.brand,  bg:T.brandLt,  icon:"👑",modules:["dashboard","orders","docs","warehouse","clients","vehicles","calendar","reports","sms","payments","ksef","users","settings"]},
  mechanik: {label:"Mechanik",     color:T.green,  bg:T.greenLt,  icon:"🔧",modules:["dashboard","orders","warehouse","vehicles","calendar"]},
  recepcja: {label:"Recepcja",     color:T.purple, bg:T.purpleLt, icon:"📋",modules:["dashboard","orders","docs","clients","vehicles","calendar","reports","payments"]},
};

// ── API HELPER ────────────────────────────────────────────────────────────────
async function apiFetch(path, opts={}) {
  const token = localStorage.getItem("wp_token") || sessionStorage.getItem("wp_token");
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    ...(opts.headers || {}),
  };
  const res = await fetch(API + path, {
    ...opts,
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (res.status === 401) {
    // Token wygasł — wyloguj
    localStorage.removeItem("wp_token");
    sessionStorage.removeItem("wp_token");
    window.location.reload();
    return;
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Błąd serwera" }));
    throw new Error(err.error || "Błąd API");
  }
  return res.json();
}

// ── BASE COMPONENTS ────────────────────────────────────────────────────────────
const Badge = ({color,bg,children,dot,lg}) => (
  <span style={{display:"inline-flex",alignItems:"center",gap:5,background:bg||color+"18",color,border:`1px solid ${color}28`,borderRadius:lg?8:6,padding:lg?"5px 12px":"3px 9px",fontSize:lg?13:11,fontWeight:700,whiteSpace:"nowrap"}}>
    {dot&&<span style={{width:6,height:6,borderRadius:"50%",background:color,display:"inline-block",flexShrink:0}}/>}
    {children}
  </span>
);

const Btn = ({onClick,color=T.brand,outline,ghost,children,full,sm,disabled,icon,loading,danger}) => {
  const col=danger?T.red:color;
  return (
    <button onClick={onClick} disabled={disabled||loading} style={{display:"inline-flex",alignItems:"center",justifyContent:"center",gap:7,background:ghost||outline?"transparent":col,color:ghost?T.textMut:outline?col:"#fff",border:ghost?"none":`1.5px solid ${col}`,borderRadius:9,padding:sm?"7px 16px":"11px 22px",fontFamily:"inherit",fontWeight:700,fontSize:sm?13:14,cursor:disabled||loading?"not-allowed":"pointer",opacity:disabled?.5:1,width:full?"100%":"auto",transition:"all .15s",boxShadow:ghost||outline?"none":`0 2px 8px ${col}30`}}>
      {loading&&<span style={{width:14,height:14,border:`2px solid ${outline?col:"#fff"}40`,borderTopColor:outline?col:"#fff",borderRadius:"50%",animation:"spin .7s linear infinite",display:"inline-block"}}/>}
      {icon&&!loading&&<span>{icon}</span>}{children}
    </button>
  );
};

const Field = ({label,value,onChange,type="text",placeholder,options,required,hint,rows}) => (
  <div style={{display:"flex",flexDirection:"column",gap:5}}>
    {label&&<label style={{fontSize:11,color:T.textMut,fontWeight:700,letterSpacing:"0.07em",textTransform:"uppercase"}}>{label}{required&&<span style={{color:T.red}}> *</span>}</label>}
    {rows?(<textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows} style={fldSt}/>):
     options?(<select value={value} onChange={e=>onChange(e.target.value)} style={fldSt}>{options.map(o=><option key={o.v||o} value={o.v||o}>{o.l||o}</option>)}</select>):
     (<input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={fldSt}/>)}
    {hint&&<div style={{fontSize:11,color:T.textXs}}>{hint}</div>}
  </div>
);
const fldSt={background:T.white,border:`1.5px solid ${T.border}`,borderRadius:9,color:T.text,padding:"10px 13px",fontSize:14,fontFamily:"inherit",outline:"none",width:"100%",boxSizing:"border-box",resize:"vertical"};

const Card = ({children,style,onClick}) => (
  <div onClick={onClick} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:14,padding:20,boxShadow:T.sh1,cursor:onClick?"pointer":"default",transition:"box-shadow .15s,border-color .15s",...style}}
    onMouseEnter={e=>{if(onClick){e.currentTarget.style.boxShadow=T.sh2;e.currentTarget.style.borderColor=T.brand+"44";}}}
    onMouseLeave={e=>{if(onClick){e.currentTarget.style.boxShadow=T.sh1;e.currentTarget.style.borderColor=T.border;}}}>
    {children}
  </div>
);

const Modal = ({title,sub,onClose,children,wide,xl}) => (
  <div style={{position:"fixed",inset:0,background:"rgba(17,24,39,.55)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16,backdropFilter:"blur(6px)"}} onClick={onClose}>
    <div onClick={e=>e.stopPropagation()} style={{background:T.white,borderRadius:16,width:"100%",maxWidth:xl?960:wide?700:520,maxHeight:"93vh",overflowY:"auto",boxShadow:T.sh3}}>
      <div style={{padding:"22px 28px 18px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"flex-start",position:"sticky",top:0,background:T.white,zIndex:1}}>
        <div>
          <h2 style={{margin:0,fontSize:19,fontWeight:900,color:T.text}}>{title}</h2>
          {sub&&<div style={{fontSize:13,color:T.textMut,marginTop:2}}>{sub}</div>}
        </div>
        <button onClick={onClose} style={{background:"#f1f5f9",border:"none",color:T.textMut,fontSize:16,cursor:"pointer",borderRadius:8,width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
      </div>
      <div style={{padding:"22px 28px 24px"}}>{children}</div>
    </div>
  </div>
);

const Alert = ({color,children}) => (
  <div style={{background:color+"12",border:`1px solid ${color}30`,borderRadius:9,padding:"10px 14px",fontSize:13,color,display:"flex",gap:8,alignItems:"flex-start",marginTop:8}}>
    {children}
  </div>
);

const SH = ({title,count,action,actionLabel,actionIcon="+",sub,actionColor=T.brand}) => (
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
    <div>
      <h1 style={{margin:"0 0 4px",fontSize:22,fontWeight:900,color:T.text,letterSpacing:"-0.02em"}}>
        {title} {count!==undefined&&<span style={{fontSize:16,color:T.textXs,fontWeight:600}}>({count})</span>}
      </h1>
      {sub&&<p style={{margin:0,fontSize:13,color:T.textMut}}>{sub}</p>}
    </div>
    {action&&<Btn onClick={action} icon={actionIcon} color={actionColor}>{actionLabel}</Btn>}
  </div>
);

const Stat = ({label,value,color,icon,sub}) => (
  <Card>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
      <div>
        <div style={{fontSize:11,color:T.textXs,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>{label}</div>
        <div style={{fontSize:24,fontWeight:900,color:color||T.text,lineHeight:1}}>{value}</div>
        {sub&&<div style={{fontSize:12,color:T.textMut,marginTop:4}}>{sub}</div>}
      </div>
      <div style={{width:44,height:44,borderRadius:12,background:color?color+"15":"#f1f5f9",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{icon}</div>
    </div>
  </Card>
);

const STATUS_CFG={
  "Nowe":      {color:T.brand,  bg:T.brandLt},
  "W trakcie": {color:T.yellow, bg:T.yellowLt},
  "Gotowe":    {color:T.green,  bg:T.greenLt},
  "Wydane":    {color:T.textMut,bg:"#f9fafb"},
  "Anulowane": {color:T.red,    bg:T.redLt},
};
const PRI_CFG={
  "Pilny":    {color:T.red,    bg:T.redLt},
  "Normalny": {color:T.yellow, bg:T.yellowLt},
  "Niski":    {color:T.textMut,bg:"#f9fafb"},
};

// ══════════════════════════════════════════════════════════════════════════════
// LOGIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
function LoginPage({onLogin}) {
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [showPass,setShowPass]=useState(false);

  const handleLogin=async()=>{
    setError("");
    if(!email||!password){setError("Wpisz e-mail i hasło");return;}
    setLoading(true);
    try {
      const data = await apiFetch("/auth/login",{method:"POST",body:{email,password}});
      localStorage.setItem("wp_token", data.token);
      sessionStorage.setItem("wp_token", data.token);
      onLogin(data.user);
    } catch(err){
      setError(err.message||"Błąd logowania");
    }
    setLoading(false);
  };

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#0f1729,#1a2f5c,#0f1729)",display:"flex",alignItems:"center",justifyContent:"center",padding:20,fontFamily:"'Inter','Segoe UI',sans-serif",position:"relative",overflow:"hidden"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');@keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}.fade-up{animation:fadeUp .5s ease both}`}</style>
      <div style={{position:"absolute",width:400,height:400,borderRadius:"50%",background:"rgba(26,86,219,.08)",top:-100,right:-100,pointerEvents:"none"}}/>
      <div style={{position:"absolute",width:300,height:300,borderRadius:"50%",background:"rgba(26,86,219,.06)",bottom:-80,left:-80,pointerEvents:"none"}}/>
      <div style={{width:"100%",maxWidth:420}}>
        <div className="fade-up" style={{textAlign:"center",marginBottom:32}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:12,marginBottom:8}}>
            <div style={{width:52,height:52,background:"linear-gradient(135deg,#1a56db,#1344b5)",borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 8px 24px rgba(26,86,219,.4)"}}>
              <svg width="28" height="28" viewBox="0 0 40 40" fill="none"><path d="M26 8c-2.8 0-5 2.2-5 5 0 .6.1 1.2.3 1.7L9.7 26.3a1 1 0 000 1.4l2.6 2.6a1 1 0 001.4 0L25.3 18.7c.5.2 1.1.3 1.7.3 2.8 0 5-2.2 5-5 0-.5-.1-1-.2-1.4l-2.9 2.9-2.1-.7-.7-2.1 2.9-2.9C28 9.7 27.1 8 26 8z" fill="white"/></svg>
            </div>
            <div style={{textAlign:"left"}}>
              <div style={{fontSize:26,fontWeight:900,color:"#fff",letterSpacing:"-0.04em",lineHeight:1}}>Warsztat<span style={{color:"#60a5fa"}}>Pro</span></div>
              <div style={{fontSize:11,color:"rgba(255,255,255,.4)",letterSpacing:"0.12em",fontWeight:600,textTransform:"uppercase"}}>SYSTEM SERWISOWY</div>
            </div>
          </div>
        </div>
        <div className="fade-up" style={{animationDelay:".1s",background:"rgba(255,255,255,.97)",borderRadius:20,padding:36,boxShadow:"0 24px 80px rgba(0,0,0,.3)"}}>
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <Field label="Adres e-mail" value={email} onChange={setEmail} type="email" placeholder="twoj@mod4cars.eu" required/>
            <div style={{display:"flex",flexDirection:"column",gap:5}}>
              <label style={{fontSize:11,color:T.textMut,fontWeight:700,letterSpacing:"0.07em",textTransform:"uppercase"}}>Hasło <span style={{color:T.red}}>*</span></label>
              <div style={{position:"relative"}}>
                <input type={showPass?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&handleLogin()} placeholder="••••••••"
                  style={{...fldSt,paddingRight:44}}/>
                <button onClick={()=>setShowPass(p=>!p)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:T.textMut,fontSize:16,padding:4}}>{showPass?"🙈":"👁️"}</button>
              </div>
            </div>
            {error&&<Alert color={T.red}><span>⚠ {error}</span></Alert>}
            <Btn full onClick={handleLogin} loading={loading} icon={loading?null:"🔐"}>{loading?"Logowanie...":"Zaloguj się"}</Btn>
          </div>
          <div style={{marginTop:24,paddingTop:20,borderTop:`1px solid ${T.border}`}}>
            <div style={{fontSize:11,color:T.textXs,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:10,textAlign:"center"}}>Konta demo</div>
            {[{role:"admin",email:"admin@mod4cars.eu",pass:"Admin123!",label:"Administrator",color:T.brand},{role:"mechanik",email:"piotr@mod4cars.eu",pass:"Mechanik123!",label:"Mechanik",color:T.green},{role:"recepcja",email:"anna@mod4cars.eu",pass:"Recepcja123!",label:"Recepcja",color:T.purple}].map(d=>(
              <button key={d.role} onClick={()=>{setEmail(d.email);setPassword(d.pass);setError("");}}
                style={{display:"flex",justifyContent:"space-between",alignItems:"center",width:"100%",background:d.color+"10",border:`1px solid ${d.color}25`,borderRadius:8,padding:"8px 12px",cursor:"pointer",fontFamily:"inherit",marginBottom:6}}>
                <span style={{fontSize:12,fontWeight:700,color:d.color}}>{ROLE_CFG[d.role].icon} {d.label}</span>
                <span style={{fontSize:11,color:T.textXs,fontFamily:"monospace"}}>{d.email}</span>
              </button>
            ))}
          </div>
        </div>
        <div style={{textAlign:"center",marginTop:20,fontSize:12,color:"rgba(255,255,255,.3)"}}>WarsztatPro v3.0 · mod4cars.eu · 🔒 SSL</div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
function Dashboard({user,orders,invoices,parts,isMobile}) {
  const rc=ROLE_CFG[user.role]||{};
  const active=orders.filter(o=>!["Wydane","Anulowane"].includes(o.status));
  const urgent=orders.filter(o=>o.priority==="Pilny"&&o.status!=="Wydane");
  const lowStock=parts.filter(p=>p.stock<=p.min_stock);
  const revenue=invoices.reduce((s,i)=>s+(+i.gross||0),0);
  const h=new Date().getHours();
  const greeting=h<12?"Dzień dobry":h<18?"Dzień dobry":"Dobry wieczór";

  return (
    <div>
      <div style={{marginBottom:24}}>
        <h1 style={{margin:"0 0 4px",fontSize:isMobile?20:26,fontWeight:900,color:T.text}}>{greeting}, {user.name.split(" ")[0]}! {rc.icon}</h1>
        <p style={{margin:0,color:T.textMut,fontSize:14}}>{new Date().toLocaleDateString("pl-PL",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</p>
      </div>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:14,marginBottom:24}}>
        <Stat label="Aktywne zlecenia" value={active.length} color={T.brand} icon="🔧" sub={`${urgent.length} pilnych`}/>
        <Stat label="Niski stan mag." value={lowStock.length} color={T.yellow} icon="⚠️"/>
        <Stat label="Przychód" value={`${fmt(revenue)} zł`} color={T.green} icon="💰"/>
        <Stat label="Wystawione faktury" value={invoices.length} color={T.purple} icon="🧾"/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"2fr 1fr",gap:20}}>
        <Card>
          <div style={{fontWeight:800,fontSize:15,marginBottom:14}}>Ostatnie zlecenia</div>
          {orders.slice(0,6).map(o=>{
            const sc=STATUS_CFG[o.status]||{};
            return (
              <div key={o.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${T.border}`}}>
                <div>
                  <span style={{fontWeight:800,fontSize:13,color:T.brand,marginRight:8}}>{o.order_no}</span>
                  <Badge color={sc.color} bg={sc.bg}>{o.status}</Badge>
                  <div style={{fontSize:12,color:T.textMut,marginTop:2}}>{o.client_name} · {o.make} {o.model}</div>
                </div>
                <div style={{fontWeight:800,color:T.green,fontSize:14}}>{fmt(calcTotals(o.items||[]).gross)} zł</div>
              </div>
            );
          })}
          {orders.length===0&&<div style={{color:T.textXs,textAlign:"center",padding:20}}>Brak zleceń</div>}
        </Card>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {lowStock.length>0&&(
            <Card style={{borderColor:T.yellow+"44"}}>
              <div style={{fontWeight:800,fontSize:14,color:T.yellow,marginBottom:10}}>⚠ Niski stan magazynu</div>
              {lowStock.slice(0,4).map(p=>(
                <div key={p.id} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${T.border}`}}>
                  <span style={{fontSize:12,color:T.textSm}}>{p.name.slice(0,24)}</span>
                  <span style={{color:T.red,fontWeight:700,fontSize:12}}>{p.stock} szt</span>
                </div>
              ))}
            </Card>
          )}
          <Card>
            <div style={{fontWeight:800,fontSize:14,marginBottom:10}}>Integracje</div>
            {[{l:"PostgreSQL",s:"Online",c:T.green},{l:"KSeF MF",s:"Aktywny",c:T.green},{l:"SMS Twilio",s:"Demo",c:T.yellow},{l:"GUS BIR",s:"Aktywny",c:T.green}].map(a=>(
              <div key={a.l} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${T.border}`}}>
                <span style={{fontSize:13,fontWeight:600}}>{a.l}</span><Badge color={a.c} dot>{a.s}</Badge>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ORDERS
// ══════════════════════════════════════════════════════════════════════════════
function Orders({orders,setOrders,clients,vehicles,users,setModal,invoices,isMobile}) {
  const [filter,setFilter]=useState("Wszystkie");
  const statuses=["Wszystkie","Nowe","W trakcie","Gotowe","Wydane","Anulowane"];
  const filtered=filter==="Wszystkie"?orders:orders.filter(o=>o.status===filter);

  const deleteOrder=async(id,orderNo)=>{
    if(!window.confirm(`Usunąć zlecenie ${orderNo}? Tej operacji nie można cofnąć.`)) return;
    try {
      await apiFetch(`/orders/${id}`,{method:"DELETE"});
      setOrders(p=>p.filter(o=>o.id!==id));
    } catch(err){ alert("Błąd: "+err.message); }
  };

  return (
    <div>
      <SH title="Zlecenia serwisowe" count={orders.length} action={()=>setModal({type:"new_order"})} actionLabel="Nowe zlecenie" sub="Lista wszystkich zleceń"/>
      <div style={{display:"flex",gap:6,marginBottom:16,overflowX:"auto",paddingBottom:4}}>
        {statuses.map(s=>{const sc=STATUS_CFG[s]||{color:T.brand,bg:T.brandLt};return(
          <button key={s} onClick={()=>setFilter(s)} style={{padding:"6px 14px",borderRadius:20,border:`1.5px solid ${filter===s?sc.color:T.border}`,background:filter===s?sc.bg:T.white,color:filter===s?sc.color:T.textMut,fontWeight:600,cursor:"pointer",fontFamily:"inherit",fontSize:12,whiteSpace:"nowrap",transition:"all .15s"}}>
            {s} {filter===s&&`(${filtered.length})`}
          </button>
        );})}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {filtered.map(o=>{
          const sc=STATUS_CFG[o.status]||{};
          const pc=PRI_CFG[o.priority]||{};
          const {gross}=calcTotals(o.items||[]);
          const hasInv=invoices.some(i=>i.order_id===o.id);
          return (
            <Card key={o.id} onClick={()=>setModal({type:"order_detail",order:o})}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}}>
                <div style={{flex:1}}>
                  <div style={{display:"flex",gap:6,marginBottom:8,flexWrap:"wrap",alignItems:"center"}}>
                    <span style={{fontWeight:900,color:T.brand,fontSize:14}}>{o.order_no}</span>
                    <Badge color={sc.color} bg={sc.bg}>{o.status}</Badge>
                    <Badge color={pc.color} bg={pc.bg}>{o.priority}</Badge>
                    {hasInv&&<Badge color={T.green} bg={T.greenLt}>✓ Faktura</Badge>}
                  </div>
                  <div style={{fontWeight:700,fontSize:15,marginBottom:3}}>{o.client_name}</div>
                  {o.plate&&<div style={{fontSize:13,color:T.textMut,marginBottom:3}}>🚗 {o.make} {o.model} · <strong>{o.plate}</strong></div>}
                  <div style={{fontSize:13,color:T.textSm}}>{o.description}</div>
                  <div style={{fontSize:12,color:T.textMut,marginTop:5}}>👤 {o.mechanic_name||"—"} · 📅 {fmtDate(o.date_deadline)}</div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontWeight:900,fontSize:19,color:T.green}}>{fmt(gross)} zł</div>
                  <div style={{display:"flex",gap:6,marginTop:8,justifyContent:"flex-end",flexWrap:"wrap"}}>
                    {!hasInv&&o.status!=="Anulowane"&&(
                      <Btn sm outline color={T.brand} onClick={e=>{e.stopPropagation();setModal({type:"new_invoice",order:o});}}>🧾 Dok.</Btn>
                    )}
                    <Btn sm outline color={T.red} danger onClick={e=>{e.stopPropagation();deleteOrder(o.id,o.order_no);}}>🗑️</Btn>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
        {filtered.length===0&&<div style={{textAlign:"center",color:T.textXs,padding:48,fontSize:15}}>Brak zleceń</div>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CALENDAR
// ══════════════════════════════════════════════════════════════════════════════
function CalendarView({events,setEvents,users,vehicles,orders,isMobile}) {
  const [view,setView]=useState("week");
  const [currentDate,setCurrentDate]=useState(new Date());
  const [showAdd,setShowAdd]=useState(false);
  const [newEvent,setNewEvent]=useState({title:"",mechanic_id:"",start_time:"",end_time:"",color:"#1a56db",description:""});
  const [saving,setSaving]=useState(false);

  const weekDays=["Pon","Wt","Śr","Czw","Pt","Sob","Nie"];
  const hours=Array.from({length:11},(_,i)=>i+8);

  const getWeekDates=()=>{
    const start=new Date(currentDate);
    const day=start.getDay();
    const diff=day===0?-6:1-day;
    start.setDate(start.getDate()+diff);
    return Array.from({length:7},(_,i)=>{const d=new Date(start);d.setDate(d.getDate()+i);return d;});
  };

  const weekDates=getWeekDates();

  const getEventsForDay=(date)=>events.filter(e=>{
    const ed=new Date(e.start_time);
    return ed.toDateString()===date.toDateString();
  });

  const addEvent=async()=>{
    if(!newEvent.title||!newEvent.start_time||!newEvent.end_time)return;
    setSaving(true);
    try {
      const data=await apiFetch("/calendar",{method:"POST",body:newEvent});
      setEvents(p=>[...p,data]);
      setShowAdd(false);
      setNewEvent({title:"",mechanic_id:"",start_time:"",end_time:"",color:"#1a56db",description:""});
    } catch(err){alert("Błąd: "+err.message);}
    setSaving(false);
  };

  const deleteEvent=async(id)=>{
    if(!window.confirm("Usunąć wydarzenie?"))return;
    await apiFetch(`/calendar/${id}`,{method:"DELETE"});
    setEvents(p=>p.filter(e=>e.id!==id));
  };

  const set=k=>v=>setNewEvent(p=>({...p,[k]:v}));
  const mechanics=users.filter(u=>u.role==="mechanik"||u.role==="admin");

  return (
    <div>
      <SH title="Harmonogram pracy" sub="Kalendarz mechaników i rezerwacje"/>
      <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
        <div style={{display:"flex",gap:6}}>
          {["week","list"].map(v=>(
            <button key={v} onClick={()=>setView(v)} style={{padding:"7px 16px",borderRadius:8,border:`1.5px solid ${view===v?T.brand:T.border}`,background:view===v?T.brandLt:T.white,color:view===v?T.brand:T.textMut,fontWeight:600,cursor:"pointer",fontFamily:"inherit",fontSize:13}}>
              {v==="week"?"📅 Tydzień":"📋 Lista"}
            </button>
          ))}
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <Btn sm outline color={T.brand} onClick={()=>{const d=new Date(currentDate);d.setDate(d.getDate()-7);setCurrentDate(d);}}>←</Btn>
          <span style={{fontWeight:700,fontSize:14,minWidth:160,textAlign:"center"}}>
            {weekDates[0].toLocaleDateString("pl-PL",{day:"numeric",month:"long"})} – {weekDates[6].toLocaleDateString("pl-PL",{day:"numeric",month:"long",year:"numeric"})}
          </span>
          <Btn sm outline color={T.brand} onClick={()=>{const d=new Date(currentDate);d.setDate(d.getDate()+7);setCurrentDate(d);}}>→</Btn>
          <Btn sm outline color={T.brand} onClick={()=>setCurrentDate(new Date())}>Dziś</Btn>
        </div>
        <Btn onClick={()=>setShowAdd(p=>!p)} icon="＋">Dodaj</Btn>
      </div>

      {showAdd&&(
        <Card style={{marginBottom:16}}>
          <div style={{fontWeight:800,fontSize:15,marginBottom:14}}>Nowe wydarzenie</div>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12}}>
            <div style={{gridColumn:isMobile?"auto":"1 / -1"}}>
              <Field label="Tytuł *" value={newEvent.title} onChange={set("title")} placeholder="np. Wymiana oleju – Jan K."/>
            </div>
            <Field label="Mechanik" value={newEvent.mechanic_id} onChange={set("mechanic_id")} options={[{v:"",l:"— wybierz —"},...mechanics.map(u=>({v:u.id,l:u.name}))]}/>
            <Field label="Kolor" value={newEvent.color} onChange={set("color")} type="color"/>
            <Field label="Początek *" value={newEvent.start_time} onChange={set("start_time")} type="datetime-local"/>
            <Field label="Koniec *" value={newEvent.end_time} onChange={set("end_time")} type="datetime-local"/>
            <div style={{gridColumn:isMobile?"auto":"1 / -1"}}>
              <Field label="Opis" value={newEvent.description} onChange={set("description")} rows={2}/>
            </div>
          </div>
          <div style={{marginTop:14,display:"flex",gap:10}}>
            <Btn onClick={addEvent} loading={saving} disabled={!newEvent.title||!newEvent.start_time||!newEvent.end_time}>Zapisz</Btn>
            <Btn outline color={T.textMut} onClick={()=>setShowAdd(false)}>Anuluj</Btn>
          </div>
        </Card>
      )}

      {view==="week"?(
        <Card noPad style={{overflowX:"auto"}}>
          <div style={{display:"grid",gridTemplateColumns:`60px repeat(7,1fr)`,minWidth:600}}>
            <div style={{background:"#f9fafb",borderRight:`1px solid ${T.border}`,borderBottom:`2px solid ${T.border}`,padding:"10px 0"}}/>
            {weekDates.map((d,i)=>{
              const isToday=d.toDateString()===new Date().toDateString();
              return (
                <div key={i} style={{background:isToday?T.brandLt:"#f9fafb",borderRight:`1px solid ${T.border}`,borderBottom:`2px solid ${T.border}`,padding:"10px 8px",textAlign:"center"}}>
                  <div style={{fontSize:11,color:T.textMut,fontWeight:600}}>{weekDays[i]}</div>
                  <div style={{fontSize:16,fontWeight:isToday?900:600,color:isToday?T.brand:T.text}}>{d.getDate()}</div>
                </div>
              );
            })}
            {hours.map(h=>(
              <>
                <div key={`h${h}`} style={{borderRight:`1px solid ${T.border}`,borderBottom:`1px solid ${T.border}40`,padding:"8px 4px",fontSize:11,color:T.textXs,textAlign:"right",background:"#fafafa"}}>{h}:00</div>
                {weekDates.map((d,di)=>{
                  const dayEvents=getEventsForDay(d).filter(e=>new Date(e.start_time).getHours()===h);
                  return (
                    <div key={`${h}-${di}`} style={{borderRight:`1px solid ${T.border}`,borderBottom:`1px solid ${T.border}40`,minHeight:50,padding:2,position:"relative"}}>
                      {dayEvents.map(e=>(
                        <div key={e.id} onClick={()=>deleteEvent(e.id)} style={{background:e.color||T.brand,color:"#fff",borderRadius:4,padding:"2px 6px",fontSize:11,fontWeight:600,cursor:"pointer",marginBottom:2,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}} title={`${e.title}\n${e.mechanic_name||""}\nKliknij aby usunąć`}>
                          {e.title}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </>
            ))}
          </div>
        </Card>
      ):(
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {events.length===0&&<div style={{textAlign:"center",color:T.textXs,padding:40}}>Brak wydarzeń w kalendarzu</div>}
          {events.sort((a,b)=>new Date(a.start_time)-new Date(b.start_time)).map(e=>(
            <Card key={e.id}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}}>
                <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
                  <div style={{width:14,height:14,borderRadius:4,background:e.color||T.brand,flexShrink:0,marginTop:3}}/>
                  <div>
                    <div style={{fontWeight:700,fontSize:15}}>{e.title}</div>
                    <div style={{fontSize:13,color:T.textMut}}>👤 {e.mechanic_name||"—"} · 🚗 {e.plate||"—"}</div>
                    <div style={{fontSize:12,color:T.textXs}}>{new Date(e.start_time).toLocaleString("pl-PL")} – {new Date(e.end_time).toLocaleTimeString("pl-PL",{hour:"2-digit",minute:"2-digit"})}</div>
                    {e.description&&<div style={{fontSize:13,color:T.textSm,marginTop:4}}>{e.description}</div>}
                  </div>
                </div>
                <Btn sm ghost danger onClick={()=>deleteEvent(e.id)}>🗑️</Btn>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// VEHICLE HISTORY (Karta serwisowa)
// ══════════════════════════════════════════════════════════════════════════════
function VehicleHistory({vehicleId,vehicleName,onClose}) {
  const [history,setHistory]=useState([]);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    apiFetch(`/vehicles/${vehicleId}/history`).then(setHistory).catch(console.error).finally(()=>setLoading(false));
  },[vehicleId]);

  if(loading) return <div style={{textAlign:"center",padding:40,color:T.textMut}}>⏳ Ładowanie historii…</div>;

  return (
    <Modal title={`Karta serwisowa`} sub={vehicleName} onClose={onClose} wide>
      {history.length===0?(
        <div style={{textAlign:"center",padding:40,color:T.textXs}}>
          <div style={{fontSize:40,marginBottom:12}}>🚗</div>
          <div>Brak historii serwisowej dla tego pojazdu</div>
        </div>
      ):(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {history.map((h,i)=>(
            <div key={i} style={{background:T.bg,border:`1px solid ${T.border}`,borderRadius:10,padding:14}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <div style={{fontWeight:700}}>{h.order_no||"Wpis ręczny"}</div>
                <div style={{fontSize:12,color:T.textMut}}>{fmtDate(h.date)}</div>
              </div>
              <div style={{fontSize:13,color:T.textSm,marginBottom:4}}>{h.description}</div>
              <div style={{display:"flex",gap:16,fontSize:12,color:T.textMut}}>
                {h.mileage&&<span>🏁 {h.mileage.toLocaleString()} km</span>}
                {h.mechanic&&<span>👤 {h.mechanic}</span>}
                {h.cost&&<span style={{color:T.green,fontWeight:700}}>💰 {fmt(h.cost)} zł</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
// VEHICLES SCREEN
// ══════════════════════════════════════════════════════════════════════════════
function EditVehicleModal({vehicle,clients,onClose,onSave}) {
  const [f,setF]=useState({...vehicle});
  const [saving,setSaving]=useState(false);
  const set=k=>v=>setF(p=>({...p,[k]:v}));

  const save=async()=>{
    setSaving(true);
    try {
      await apiFetch("/vehicles/"+vehicle.id,{method:"PUT",body:f});
      onSave({...f,id:vehicle.id});
      onClose();
    } catch(err){alert("Blad: "+err.message);}
    setSaving(false);
  };

  return (
    <Modal title="Edytuj pojazd" sub={vehicle.plate} onClose={onClose} wide>
      <div style={{display:"grid",gap:12}}>
        <Field label="Wlasciciel" value={f.client_id} onChange={set("client_id")} options={clients.map(c=>({v:c.id,l:c.name}))}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Field label="Marka *" value={f.make} onChange={set("make")} required/>
          <Field label="Model *" value={f.model} onChange={set("model")} required/>
          <Field label="Rok" value={f.year} onChange={set("year")} type="number"/>
          <Field label="Paliwo" value={f.fuel_type} onChange={set("fuel_type")} options={["Benzyna","Diesel","Hybryda","Elektryczny","LPG","CNG"]}/>
          <Field label="Tablica rejestracyjna *" value={f.plate} onChange={v=>set("plate")(v.toUpperCase())} required/>
          <Field label="Przebieg (km)" value={f.mileage} onChange={set("mileage")} type="number"/>
          <Field label="Silnik / Moc" value={f.engine} onChange={set("engine")} placeholder="np. 2.0 TDI 150KM"/>
          <Field label="Kolor" value={f.color} onChange={set("color")}/>
        </div>
        <Field label="VIN (17 znakow)" value={f.vin} onChange={set("vin")} placeholder="WVWZZZ1KZ9W123456"/>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:20}}>
        <Btn outline color={T.textMut} onClick={onClose}>Anuluj</Btn>
        <Btn onClick={save} loading={saving} disabled={!f.make||!f.model||!f.plate}>Zapisz zmiany</Btn>
      </div>
    </Modal>
  );
}

function Vehicles({vehicles,setVehicles,clients,setModal,isMobile}) {
  const [search,setSearch]=useState("");
  const [editVehicle,setEditVehicle]=useState(null);
  const filtered=vehicles.filter(v=>
    v.plate.toLowerCase().includes(search.toLowerCase())||
    v.make.toLowerCase().includes(search.toLowerCase())||
    v.model.toLowerCase().includes(search.toLowerCase())||
    (v.vin||"").toLowerCase().includes(search.toLowerCase())
  );

  const deleteVehicle=async(id,plate)=>{
    if(!window.confirm("Usunac pojazd "+plate+"? Ta operacja jest nieodwracalna."))return;
    try {
      await apiFetch("/vehicles/"+id,{method:"DELETE"});
      setVehicles(p=>p.filter(v=>v.id!==id));
    } catch(err){alert("Blad: "+err.message);}
  };

  return (
    <div>
      <SH title="Pojazdy" count={vehicles.length} action={()=>setModal({type:"new_car"})} actionLabel="Dodaj pojazd" actionIcon="+" sub="Wszystkie zarejestrowane pojazdy — kliknij aby edytowac"/>
      <div style={{marginBottom:14}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Szukaj po tablicy, marce, modelu lub VIN..." style={{...fldSt}}/>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {filtered.map(v=>{
          const client=clients.find(c=>c.id===v.client_id);
          return (
            <Card key={v.id} onClick={()=>setEditVehicle(v)} style={{cursor:"pointer"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:16,flexWrap:"wrap"}}>
                <div style={{flex:1}}>
                  <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:8,flexWrap:"wrap"}}>
                    <span style={{fontWeight:900,fontSize:18,color:T.brand}}>{v.plate}</span>
                    <Badge color={T.green} bg={T.greenLt}>{v.fuel_type||"—"}</Badge>
                    {v.year&&<Badge color={T.textMut} bg="#f9fafb">{v.year}</Badge>}
                  </div>
                  <div style={{fontWeight:700,fontSize:16,marginBottom:4}}>{v.make} {v.model}</div>
                  <div style={{display:"flex",gap:16,flexWrap:"wrap",fontSize:13,color:T.textMut}}>
                    {client&&<span>Wlasciciel: <strong style={{color:T.textSm}}>{client.name}</strong></span>}
                    {v.mileage>0&&<span>Przebieg: <strong>{(+v.mileage).toLocaleString()} km</strong></span>}
                    {v.engine&&<span>Silnik: {v.engine}</span>}
                    {v.color&&<span>Kolor: {v.color}</span>}
                  </div>
                  {v.vin&&<div style={{fontSize:12,color:T.textXs,marginTop:4,fontFamily:"monospace"}}>VIN: {v.vin}</div>}
                </div>
                <div style={{display:"flex",gap:8,alignItems:"flex-start",flexShrink:0}} onClick={e=>e.stopPropagation()}>
                  <Btn sm outline color={T.brand} onClick={()=>setEditVehicle(v)}>Edytuj</Btn>
                  <Btn sm ghost danger onClick={()=>deleteVehicle(v.id,v.plate)}>Usun</Btn>
                </div>
              </div>
            </Card>
          );
        })}
        {filtered.length===0&&<div style={{textAlign:"center",color:T.textXs,padding:48,fontSize:15}}>Brak pojazdow. Kliknij "Dodaj pojazd" aby dodac pierwszy pojazd.</div>}
      </div>

      {editVehicle&&(
        <EditVehicleModal
          vehicle={editVehicle}
          clients={clients}
          onClose={()=>setEditVehicle(null)}
          onSave={(updated)=>setVehicles(p=>p.map(v=>v.id===updated.id?{...v,...updated}:v))}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CLIENTS
// ══════════════════════════════════════════════════════════════════════════════
function EditClientModal({client,onClose,onSave}) {
  const [f,setF]=useState({...client});
  const [saving,setSaving]=useState(false);
  const set=k=>v=>setF(p=>({...p,[k]:v}));

  const save=async()=>{
    setSaving(true);
    try {
      await apiFetch("/clients/"+client.id,{method:"PUT",body:f});
      onSave({...f,id:client.id});
      onClose();
    } catch(err){alert("Blad: "+err.message);}
    setSaving(false);
  };

  return (
    <Modal title="Edytuj klienta" sub={client.name} onClose={onClose}>
      <div style={{display:"grid",gap:12}}>
        <Field label="Nazwa / Imie i nazwisko *" value={f.name} onChange={set("name")} required/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Field label="NIP" value={f.nip||""} onChange={set("nip")} placeholder="0000000000"/>
          <Field label="REGON" value={f.regon||""} onChange={set("regon")} placeholder="123456789"/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Field label="Telefon" value={f.phone||""} onChange={set("phone")} type="tel"/>
          <Field label="E-mail" value={f.email||""} onChange={set("email")} type="email"/>
        </div>
        <Field label="Adres" value={f.address||""} onChange={set("address")} placeholder="ul. Przykladowa 1"/>
        <Field label="Kod pocztowy i miasto" value={f.city||""} onChange={set("city")} placeholder="00-001 Warszawa"/>
        <Field label="Notatki" value={f.notes||""} onChange={set("notes")} rows={2}/>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:20}}>
        <Btn outline color={T.textMut} onClick={onClose}>Anuluj</Btn>
        <Btn onClick={save} loading={saving} disabled={!f.name}>Zapisz zmiany</Btn>
      </div>
    </Modal>
  );
}

function Clients({clients,setClients,vehicles,setModal,isMobile}) {
  const [search,setSearch]=useState("");
  const [historyVehicle,setHistoryVehicle]=useState(null);
  const [editClient,setEditClient]=useState(null);
  const filtered=clients.filter(c=>
    c.name.toLowerCase().includes(search.toLowerCase())||
    (c.nip||"").includes(search)||
    (c.phone||"").includes(search)
  );

  const deleteClient=async(id,name)=>{
    if(!window.confirm("Usunac klienta "+name+"?"))return;
    try {
      await apiFetch("/clients/"+id,{method:"DELETE"});
      setClients(p=>p.filter(c=>c.id!==id));
    } catch(err){alert("Blad: "+err.message);}
  };

  return (
    <div>
      <SH title="Klienci" count={clients.length} action={()=>setModal({type:"new_client"})} actionLabel="Nowy klient" sub="Baza klientow — kliknij aby edytowac"/>
      <div style={{marginBottom:14}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Szukaj po nazwie, NIP lub telefonie..." style={{...fldSt}}/>
      </div>
      {filtered.map(c=>{
        const cVehicles=vehicles.filter(v=>v.client_id===c.id);
        return (
          <Card key={c.id} style={{marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}>
              <div style={{flex:1}}>
                <div style={{fontWeight:900,fontSize:16,marginBottom:6}}>{c.name}</div>
                <div style={{display:"flex",gap:16,flexWrap:"wrap",fontSize:13,color:T.textMut}}>
                  {c.nip&&<span>NIP: <strong>{c.nip}</strong></span>}
                  {c.phone&&<span>Tel: <strong>{c.phone}</strong></span>}
                  {c.email&&<span>{c.email}</span>}
                  {c.city&&<span>{c.address}, {c.city}</span>}
                </div>
                {c.notes&&<div style={{fontSize:12,color:T.textXs,marginTop:4}}>{c.notes}</div>}
              </div>
              <div style={{display:"flex",gap:8,flexShrink:0}}>
                <Btn sm outline color={T.brand} onClick={()=>setEditClient(c)}>Edytuj</Btn>
                <Btn sm ghost danger onClick={()=>deleteClient(c.id,c.name)}>Usun</Btn>
              </div>
            </div>
            {cVehicles.length>0&&(
              <div style={{marginTop:12,display:"flex",gap:8,flexWrap:"wrap"}}>
                {cVehicles.map(v=>(
                  <div key={v.id} style={{background:T.brandLt,border:"1px solid "+T.brand+"22",borderRadius:9,padding:"7px 13px",fontSize:12,color:T.brand,cursor:"pointer",display:"flex",gap:8,alignItems:"center"}}
                    onClick={()=>setHistoryVehicle(v)}>
                    🚗 <strong>{v.make} {v.model}</strong> · {v.plate} {v.year?"("+v.year+")":""}
                    <span style={{fontSize:10,opacity:.7}}>historia</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        );
      })}
      {filtered.length===0&&<div style={{textAlign:"center",color:T.textXs,padding:40}}>Brak klientow</div>}
      {historyVehicle&&(
        <VehicleHistory vehicleId={historyVehicle.id} vehicleName={historyVehicle.make+" "+historyVehicle.model+" ("+historyVehicle.plate+")"} onClose={()=>setHistoryVehicle(null)}/>
      )}
      {editClient&&(
        <EditClientModal
          client={editClient}
          onClose={()=>setEditClient(null)}
          onSave={(updated)=>setClients(p=>p.map(c=>c.id===updated.id?{...c,...updated}:c))}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// REPORTS
// ══════════════════════════════════════════════════════════════════════════════
function Reports({isMobile}) {
  const [data,setData]=useState(null);
  const [loading,setLoading]=useState(true);
  const [month,setMonth]=useState(new Date().getMonth()+1);
  const [year,setYear]=useState(new Date().getFullYear());

  const load=useCallback(async()=>{
    setLoading(true);
    try {
      const d=await apiFetch(`/reports/summary?month=${month}&year=${year}`);
      setData(d);
    } catch(err){console.error(err);}
    setLoading(false);
  },[month,year]);

  useEffect(()=>{load();},[load]);

  const months=["Styczeń","Luty","Marzec","Kwiecień","Maj","Czerwiec","Lipiec","Sierpień","Wrzesień","Październik","Listopad","Grudzień"];

  if(loading) return <div style={{textAlign:"center",padding:60,color:T.textMut}}>⏳ Ładowanie raportów…</div>;

  return (
    <div>
      <SH title="Raporty finansowe" sub="Przychody, zlecenia i statystyki"/>
      <div style={{display:"flex",gap:10,marginBottom:20,flexWrap:"wrap",alignItems:"center"}}>
        <Field value={month} onChange={v=>setMonth(+v)} options={months.map((m,i)=>({v:i+1,l:m}))}/>
        <Field value={year} onChange={v=>setYear(+v)} options={[2024,2025,2026].map(y=>({v:y,l:y}))}/>
        <Btn outline color={T.brand} onClick={load}>Odśwież</Btn>
      </div>

      {data&&(
        <>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:14,marginBottom:24}}>
            <Stat label="Przychód brutto" value={`${fmt(data.revenue.total_gross)} zł`} color={T.green} icon="💰"/>
            <Stat label="Przychód netto" value={`${fmt(data.revenue.total_net)} zł`} color={T.brand} icon="📊"/>
            <Stat label="VAT" value={`${fmt(data.revenue.total_vat)} zł`} color={T.yellow} icon="🏛️"/>
            <Stat label="Wystawionych faktur" value={data.revenue.invoice_count} color={T.purple} icon="🧾"/>
          </div>

          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:20,marginBottom:20}}>
            <Card>
              <div style={{fontWeight:800,fontSize:15,marginBottom:14}}>Status zleceń ({months[month-1]} {year})</div>
              {data.orders.length===0&&<div style={{color:T.textXs}}>Brak zleceń w tym okresie</div>}
              {data.orders.map(o=>(
                <div key={o.status} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${T.border}`}}>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <Badge color={(STATUS_CFG[o.status]||{}).color||T.textMut} bg={(STATUS_CFG[o.status]||{}).bg||"#f9fafb"}>{o.status}</Badge>
                  </div>
                  <div style={{fontWeight:700}}>{o.count} szt</div>
                </div>
              ))}
            </Card>

            <Card>
              <div style={{fontWeight:800,fontSize:15,marginBottom:14}}>Top 5 klientów ({year})</div>
              {data.topClients.length===0&&<div style={{color:T.textXs}}>Brak danych</div>}
              {data.topClients.map((c,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${T.border}`,alignItems:"center"}}>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <div style={{width:24,height:24,borderRadius:"50%",background:T.brandLt,color:T.brand,fontWeight:900,fontSize:11,display:"flex",alignItems:"center",justifyContent:"center"}}>{i+1}</div>
                    <span style={{fontSize:13,fontWeight:600}}>{c.name||"Nieznany"}</span>
                  </div>
                  <span style={{fontWeight:800,color:T.green,fontSize:13}}>{fmt(c.total)} zł</span>
                </div>
              ))}
            </Card>
          </div>

          <Card>
            <div style={{fontWeight:800,fontSize:15,marginBottom:14}}>Przychody miesięczne {year}</div>
            <div style={{display:"flex",gap:2,alignItems:"flex-end",height:120}}>
              {months.map((m,i)=>{
                const monthData=data.monthlySales.find(s=>+s.month===i+1);
                const val=+monthData?.gross||0;
                const max=Math.max(...data.monthlySales.map(s=>+s.gross||0),1);
                const h=Math.max((val/max)*100,2);
                const isCurrentMonth=i+1===month;
                return (
                  <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                    <div style={{fontSize:9,color:T.textXs,fontWeight:600}}>{val>0?`${Math.round(val/1000)}k`:""}</div>
                    <div style={{width:"100%",height:`${h}%`,background:isCurrentMonth?T.brand:T.brandLt,borderRadius:"3px 3px 0 0",transition:"height .3s",minHeight:3}}/>
                    <div style={{fontSize:9,color:isCurrentMonth?T.brand:T.textXs,fontWeight:isCurrentMonth?700:400}}>{m.slice(0,3)}</div>
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SMS MODULE
// ══════════════════════════════════════════════════════════════════════════════
function SMSModule({clients,orders,isMobile}) {
  const [clientId,setClientId]=useState("");
  const [orderId,setOrderId]=useState("");
  const [phone,setPhone]=useState("");
  const [message,setMessage]=useState("");
  const [template,setTemplate]=useState("gotowe");
  const [sending,setSending]=useState(false);
  const [result,setResult]=useState(null);

  const loadTemplate=async()=>{
    if(!orderId||!clientId)return;
    const order=orders.find(o=>o.id===+orderId);
    if(!order)return;
    try {
      const data=await apiFetch("/sms/template",{method:"POST",body:{type:template,client_id:+clientId,order_id:+orderId,phone,order_no:order.order_no}});
      setMessage(data.message);
    } catch(err){console.error(err);}
  };

  const sendSMS=async()=>{
    if(!phone||!message){alert("Podaj numer telefonu i treść SMS");return;}
    setSending(true);setResult(null);
    try {
      const data=await apiFetch("/sms/send",{method:"POST",body:{client_id:+clientId||null,order_id:+orderId||null,phone,message}});
      setResult(data);
    } catch(err){setResult({ok:false,error:err.message});}
    setSending(false);
  };

  const clientOrders=orders.filter(o=>o.client_id===+clientId);

  return (
    <div>
      <SH title="Powiadomienia SMS" sub="Wysyłaj SMS do klientów przez Twilio"/>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:20}}>
        <Card>
          <div style={{fontWeight:800,fontSize:15,marginBottom:16}}>Wyślij SMS</div>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <Field label="Klient" value={clientId} onChange={v=>{setClientId(v);const c=clients.find(c=>c.id===+v);if(c)setPhone(c.phone||"");}} options={[{v:"",l:"— wybierz klienta —"},...clients.map(c=>({v:c.id,l:c.name}))]}/>
            {clientId&&<Field label="Zlecenie" value={orderId} onChange={setOrderId} options={[{v:"",l:"— wybierz zlecenie —"},...clientOrders.map(o=>({v:o.id,l:`${o.order_no} – ${o.status}`}))]}/>}
            <Field label="Nr telefonu *" value={phone} onChange={setPhone} type="tel" placeholder="+48 600 100 200"/>
            <div>
              <div style={{fontSize:11,color:T.textMut,fontWeight:700,letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:6}}>Szablon SMS</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
                {[{v:"gotowe",l:"Gotowy do odbioru"},{v:"przyjete",l:"Przyjęto zlecenie"},{v:"przypomnienie",l:"Przypomnienie"}].map(t=>(
                  <button key={t.v} onClick={()=>setTemplate(t.v)} style={{padding:"5px 12px",borderRadius:8,border:`1.5px solid ${template===t.v?T.brand:T.border}`,background:template===t.v?T.brandLt:T.white,color:template===t.v?T.brand:T.textMut,fontWeight:600,cursor:"pointer",fontFamily:"inherit",fontSize:12}}>
                    {t.l}
                  </button>
                ))}
              </div>
              <Btn sm outline color={T.brand} onClick={loadTemplate} disabled={!orderId}>Wczytaj szablon</Btn>
            </div>
            <Field label="Treść SMS *" value={message} onChange={setMessage} rows={4} placeholder="Wpisz treść wiadomości…"/>
            <div style={{fontSize:12,color:T.textMut}}>{message.length}/160 znaków {message.length>160&&<span style={{color:T.red}}>({Math.ceil(message.length/160)} SMS)</span>}</div>
            {result&&<Alert color={result.ok?T.green:T.red}><span>{result.ok?`✓ SMS ${result.status==="demo"?"zapisany (tryb demo)":"wysłany pomyślnie!"}` : `✗ Błąd: ${result.error}`}</span></Alert>}
            <Btn full onClick={sendSMS} loading={sending} disabled={!phone||!message} icon="📱">{sending?"Wysyłanie…":"Wyślij SMS"}</Btn>
          </div>
        </Card>
        <Card>
          <div style={{fontWeight:800,fontSize:15,marginBottom:14}}>Informacje o SMS</div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <Alert color={T.yellow}><span>⚠ SMS działają w trybie <strong>demo</strong>. Aby wysyłać prawdziwe SMS, skonfiguruj Twilio w pliku <code>.env</code> na serwerze.</span></Alert>
            <div style={{background:T.bg,borderRadius:10,padding:14,fontSize:13}}>
              <div style={{fontWeight:700,marginBottom:8}}>Konfiguracja Twilio (.env):</div>
              <code style={{fontSize:11,display:"block",lineHeight:2,color:T.textSm}}>
                TWILIO_SID=ACxxxxxxxx<br/>
                TWILIO_TOKEN=xxxxxxxx<br/>
                TWILIO_FROM=+48XXXXXXXXX
              </code>
            </div>
            <div style={{background:T.greenLt,border:`1px solid ${T.green}30`,borderRadius:10,padding:14,fontSize:13}}>
              <div style={{fontWeight:700,color:T.green,marginBottom:6}}>Cennik Twilio (orientacyjny):</div>
              <div>SMS do Polski: ~0,05 zł/SMS</div>
              <div>Konto startowe: 15 USD gratis</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// WAREHOUSE
// ══════════════════════════════════════════════════════════════════════════════
function Warehouse({parts,setParts,setModal,isMobile}) {
  const [search,setSearch]=useState("");
  const [apSearch,setApSearch]=useState("");
  const [apResults,setApResults]=useState([]);
  const [apLoading,setApLoading]=useState(false);
  const [apMsg,setApMsg]=useState(null);
  const [activeTab,setActiveTab]=useState("magazyn");
  const filtered=parts.filter(p=>p.name.toLowerCase().includes(search.toLowerCase())||(p.catalog_no||"").toLowerCase().includes(search.toLowerCase()));

  const deletePart=async(id,name)=>{
    if(!window.confirm("Usunac "+name+"?"))return;
    try {
      await apiFetch("/parts/"+id,{method:"DELETE"});
      setParts(p=>p.filter(x=>x.id!==id));
    } catch(err){alert("Blad: "+err.message);}
  };

  const searchAutoPartner=async()=>{
    if(!apSearch){return;}
    setApLoading(true);setApMsg(null);setApResults([]);
    try {
      const data=await apiFetch("/autopartner/search?q="+encodeURIComponent(apSearch));
      if(data.ok&&data.parts){
        setApResults(data.parts);
        setApMsg({ok:true,txt:"Znaleziono "+data.parts.length+" czesci w AutoPartner"});
      } else {
        setApMsg({ok:false,txt:data.error||"Nie znaleziono czesci"});
      }
    } catch(err){
      setApMsg({ok:false,txt:"Blad: "+err.message+". Skonfiguruj klucz AutoPartner API w ustawieniach serwera."});
    }
    setApLoading(false);
  };

  const importPart=async(part)=>{
    try {
      const d=await apiFetch("/parts",{method:"POST",body:{
        catalog_no:part.catalog_no,
        name:part.name,
        buy_price:part.price_buy||0,
        sell_price:part.price_sell||0,
        vat:23,
        stock:0,
        min_stock:2,
        category:part.category||"AutoPartner",
        supplier:"AutoPartner",
        unit:"szt",
      }});
      setParts(p=>[...p,d]);
      alert("Dodano do magazynu: "+part.name);
    } catch(err){alert("Blad: "+err.message);}
  };

  return (
    <div>
      <SH title="Magazyn czesci" count={parts.length} action={()=>setModal({type:"new_part"})} actionLabel="Dodaj czesc" sub="Stan magazynowy, ceny i integracja z hurtowniami"/>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:12,marginBottom:16}}>
        <Stat label="Pozycji" value={parts.length} color={T.brand} icon="📋"/>
        <Stat label="Niski stan" value={parts.filter(p=>p.stock<=p.min_stock).length} color={T.red} icon="⚠️"/>
        <Stat label="Wartosc zakup" value={fmt(parts.reduce((s,p)=>s+(+p.buy_price)*(+p.stock),0))+" zl"} color={T.textMut} icon="💳"/>
        <Stat label="Wartosc sprzed." value={fmt(parts.reduce((s,p)=>s+(+p.sell_price)*(+p.stock),0))+" zl"} color={T.green} icon="💰"/>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:6,marginBottom:14}}>
        {[{id:"magazyn",l:"Moj magazyn"},{id:"autopartner",l:"AutoPartner"},{id:"intercars",l:"Inter Cars"}].map(t=>(
          <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{padding:"7px 16px",borderRadius:8,border:"1.5px solid "+(activeTab===t.id?T.brand:T.border),background:activeTab===t.id?T.brandLt:T.white,color:activeTab===t.id?T.brand:T.textMut,fontWeight:600,cursor:"pointer",fontFamily:"inherit",fontSize:13}}>
            {t.l}
          </button>
        ))}
      </div>

      {/* MOJ MAGAZYN */}
      {activeTab==="magazyn"&&(
        <>
          <div style={{marginBottom:14}}><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Szukaj po nazwie lub nr kat..." style={{...fldSt}}/></div>
          <Card>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",minWidth:600}}>
                <thead>
                  <tr style={{borderBottom:"2px solid "+T.border,background:"#f9fafb"}}>
                    {["Nr kat.","Nazwa","Kat.","Stan","Min","C. zakupu","C. sprzedazy","VAT","Dostawca",""].map(h=>(
                      <th key={h} style={{padding:"8px 10px",textAlign:"left",fontSize:11,color:T.textMut,fontWeight:700,textTransform:"uppercase"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p=>(
                    <tr key={p.id} style={{borderBottom:"1px solid "+T.border}}>
                      <td style={{padding:"10px",fontSize:12,color:T.textMut,fontFamily:"monospace"}}>{p.catalog_no}</td>
                      <td style={{padding:"10px",fontWeight:600,fontSize:14}}>{p.name}</td>
                      <td style={{padding:"10px"}}><Badge color={T.brand} bg={T.brandLt}>{p.category}</Badge></td>
                      <td style={{padding:"10px",fontWeight:800,color:+p.stock<=(+p.min_stock)?T.red:T.green}}>{p.stock} {p.unit}</td>
                      <td style={{padding:"10px",color:T.textMut}}>{p.min_stock}</td>
                      <td style={{padding:"10px",fontSize:13}}>{fmt(p.buy_price)} zl</td>
                      <td style={{padding:"10px",fontWeight:700}}>{fmt(p.sell_price)} zl</td>
                      <td style={{padding:"10px"}}>{p.vat}%</td>
                      <td style={{padding:"10px",fontSize:12}}>{p.supplier}</td>
                      <td style={{padding:"10px"}}><button onClick={()=>deletePart(p.id,p.name)} style={{background:"none",border:"none",color:T.red,cursor:"pointer",fontSize:16}}>🗑️</button></td>
                    </tr>
                  ))}
                  {filtered.length===0&&<tr><td colSpan={10} style={{padding:30,textAlign:"center",color:T.textXs}}>Brak czesci w magazynie</td></tr>}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* AUTOPARTNER */}
      {activeTab==="autopartner"&&(
        <Card>
          <div style={{fontWeight:800,fontSize:15,marginBottom:4}}>AutoPartner B2B</div>
          <div style={{fontSize:13,color:T.textMut,marginBottom:14}}>Wyszukaj czesc w hurtowni AutoPartner i dodaj do swojego magazynu</div>
          <div style={{display:"flex",gap:0,marginBottom:12}}>
            <input value={apSearch} onChange={e=>setApSearch(e.target.value)} onKeyDown={e=>e.key==="Enter"&&searchAutoPartner()}
              placeholder="Wpisz nazwe lub nr katalogowy czesci..." style={{...fldSt,borderRadius:"9px 0 0 9px",flex:1}}/>
            <button onClick={searchAutoPartner} disabled={apLoading||!apSearch}
              style={{padding:"0 20px",background:T.brand,color:"#fff",border:"none",borderRadius:"0 9px 9px 0",fontFamily:"inherit",fontWeight:700,fontSize:14,cursor:"pointer",opacity:!apSearch?.5:1}}>
              {apLoading?"...":"Szukaj"}
            </button>
          </div>
          {apMsg&&<div style={{padding:"8px 12px",background:apMsg.ok?T.greenLt:T.yellowLt,borderRadius:8,fontSize:13,color:apMsg.ok?T.green:T.yellow,fontWeight:600,marginBottom:12}}>{apMsg.txt}</div>}
          {apResults.length===0&&!apLoading&&(
            <div style={{background:T.bg,borderRadius:10,padding:16,fontSize:13,color:T.textMut}}>
              <div style={{fontWeight:700,marginBottom:8}}>Aby korzystac z AutoPartner API:</div>
              <div>1. Skontaktuj sie z opiekunem handlowym AutoPartner</div>
              <div>2. Popros o dostep do API B2B (login i haslo API)</div>
              <div>3. Dodaj do pliku .env na serwerze:</div>
              <code style={{display:"block",background:"#1e293b",color:"#e2e8f0",padding:"10px 14px",borderRadius:8,marginTop:8,fontSize:12}}>
                AP_URL=https://api.autopartner.pl<br/>
                AP_LOGIN=twoj_login<br/>
                AP_PASSWORD=twoje_haslo
              </code>
            </div>
          )}
          {apResults.map((p,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderBottom:"1px solid "+T.border,gap:12}}>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:14}}>{p.name}</div>
                <div style={{fontSize:12,color:T.textMut,fontFamily:"monospace"}}>Nr kat: {p.catalog_no} · {p.category}</div>
                <div style={{fontSize:13,marginTop:2}}>
                  <span style={{color:T.textMut}}>Zakup: </span><strong>{fmt(p.price_buy)} zl</strong>
                  <span style={{color:T.textMut,marginLeft:12}}>Sprzedaz: </span><strong style={{color:T.green}}>{fmt(p.price_sell)} zl</strong>
                  <span style={{color:T.textMut,marginLeft:12}}>Stan: </span><strong style={{color:p.stock>0?T.green:T.red}}>{p.stock} szt</strong>
                </div>
              </div>
              <Btn sm onClick={()=>importPart(p)} color={T.green}>+ Do magazynu</Btn>
            </div>
          ))}
        </Card>
      )}

      {/* INTER CARS */}
      {activeTab==="intercars"&&(
        <Card>
          <div style={{fontWeight:800,fontSize:15,marginBottom:4}}>Inter Cars B2B</div>
          <div style={{fontSize:13,color:T.textMut,marginBottom:14}}>Wyszukaj czesc w hurtowni Inter Cars</div>
          <div style={{background:T.bg,borderRadius:10,padding:16,fontSize:13,color:T.textMut}}>
            <div style={{fontWeight:700,marginBottom:8}}>Aby korzystac z Inter Cars API:</div>
            <div>1. Zadzwon do opiekuna Inter Cars i popros o dostep do API B2B</div>
            <div>2. Otrzymasz login, haslo i URL do API</div>
            <div>3. Dodaj do pliku .env na serwerze:</div>
            <code style={{display:"block",background:"#1e293b",color:"#e2e8f0",padding:"10px 14px",borderRadius:8,marginTop:8,fontSize:12}}>
              IC_URL=https://api.intercars.pl<br/>
              IC_LOGIN=twoj_login<br/>
              IC_PASSWORD=twoje_haslo
            </code>
          </div>
        </Card>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SIMPLE SCREENS
// ══════════════════════════════════════════════════════════════════════════════
function Invoices({invoices,clients,setModal,isMobile}) {
  const DOC_CFG={faktura_vat:{label:"Faktura VAT",color:T.brand,bg:T.brandLt},faktura_marza:{label:"VAT Marża",color:T.purple,bg:T.purpleLt},paragon:{label:"Paragon",color:T.green,bg:T.greenLt},wz:{label:"WZ",color:T.cyan,bg:T.cyanLt}};
  return (
    <div>
      <SH title="Dokumenty sprzedaży" count={invoices.length} action={()=>setModal({type:"new_doc_standalone"})} actionLabel="Nowy dokument" sub="Faktury VAT, paragony, WZ"/>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:12,marginBottom:16}}>
        {Object.entries(DOC_CFG).map(([k,v])=>(
          <div key={k} style={{background:v.bg,border:`1px solid ${v.color}30`,borderRadius:12,padding:14}}>
            <div style={{fontSize:11,color:v.color,fontWeight:700,textTransform:"uppercase",marginBottom:4}}>{v.label}</div>
            <div style={{fontSize:26,fontWeight:900,color:v.color}}>{invoices.filter(i=>i.type===k).length}</div>
          </div>
        ))}
      </div>
      <Card>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:600}}>
            <thead><tr style={{borderBottom:`2px solid ${T.border}`,background:"#f9fafb"}}>
              {["Numer","Typ","Klient","Data","Brutto","KSeF"].map(h=><th key={h} style={{padding:"8px 12px",textAlign:"left",fontSize:11,color:T.textMut,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>{h}</th>)}
            </tr></thead>
            <tbody>
              {invoices.map(inv=>{
                const dc=DOC_CFG[inv.type]||{label:inv.type,color:T.textMut,bg:"#f9fafb"};
                return (
                  <tr key={inv.id} style={{borderBottom:`1px solid ${T.border}`}}>
                    <td style={{padding:"12px",fontWeight:800,color:T.brand}}>{inv.number}</td>
                    <td style={{padding:"12px"}}><Badge color={dc.color} bg={dc.bg}>{dc.label}</Badge></td>
                    <td style={{padding:"12px",fontSize:13}}>{inv.client_name||inv.buyer_name||"—"}</td>
                    <td style={{padding:"12px",color:T.textMut,fontSize:13}}>{fmtDate(inv.date_issued)}</td>
                    <td style={{padding:"12px",fontWeight:800,color:T.green}}>{fmt(inv.gross)} zł</td>
                    <td style={{padding:"12px"}}><Badge color={inv.ksef_status==="wysłana"?T.green:T.yellow} bg={inv.ksef_status==="wysłana"?T.greenLt:T.yellowLt} dot>{inv.ksef_status==="wysłana"?"Wysłana":"Oczekuje"}</Badge></td>
                  </tr>
                );
              })}
              {invoices.length===0&&<tr><td colSpan={6} style={{padding:40,textAlign:"center",color:T.textXs}}>Brak dokumentów</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PAYMENTS
// ══════════════════════════════════════════════════════════════════════════════
function Payments({invoices,clients,isMobile}) {
  const [selectedInv,setSelectedInv]=useState("");
  const [payLink,setPayLink]=useState("");
  const [generating,setGenerating]=useState(false);
  const unpaid=invoices.filter(i=>!i.paid&&+i.gross>0);

  const generateLink=async()=>{
    if(!selectedInv)return;
    setGenerating(true);
    await new Promise(r=>setTimeout(r,800));
    const inv=invoices.find(i=>i.id===+selectedInv);
    if(inv){
      const link="https://pay.mod4cars.eu/pay/"+inv.number.replace(/[/]/g,"-")+"?amount="+inv.gross;
      setPayLink(link);
    }
    setGenerating(false);
  };

  return (
    <div>
      <SH title="Platnosci online" sub="Generuj linki do platnosci – Przelewy24, Stripe, PayU"/>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:20,marginBottom:20}}>
        <Card>
          <div style={{fontWeight:800,fontSize:15,marginBottom:14}}>Generuj link do platnosci</div>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <Field label="Wybierz fakture" value={selectedInv} onChange={setSelectedInv}
              options={[{v:"",l:"— wybierz —"},...unpaid.map(i=>({v:i.id,l:i.number+" · "+fmt(i.gross)+" zl"}))]}/>
            <Btn full onClick={generateLink} loading={generating} disabled={!selectedInv} icon="🔗">
              Generuj link
            </Btn>
            {payLink&&(
              <div style={{background:T.greenLt,border:"1px solid "+T.green+"30",borderRadius:10,padding:14}}>
                <div style={{fontWeight:700,color:T.green,marginBottom:8}}>Link wygenerowany!</div>
                <div style={{fontSize:11,fontFamily:"monospace",wordBreak:"break-all",background:T.white,padding:8,borderRadius:6,border:"1px solid "+T.border,marginBottom:10}}>{payLink}</div>
                <div style={{display:"flex",gap:8}}>
                  <Btn sm outline color={T.brand} onClick={()=>navigator.clipboard.writeText(payLink).then(()=>alert("Skopiowano!"))}>Kopiuj</Btn>
                  <Btn sm outline color={T.green} onClick={()=>window.open("mailto:?subject=Link+platnosc&body="+encodeURIComponent(payLink))}>E-mail</Btn>
                </div>
              </div>
            )}
          </div>
        </Card>
        <Card>
          <div style={{fontWeight:800,fontSize:15,marginBottom:14}}>Bramki platnosci</div>
          {[
            {name:"Przelewy24",desc:"BLIK, karty, przelewy – najpopularniejsza w PL",logo:"🏦",color:T.red,url:"https://www.przelewy24.pl"},
            {name:"PayU",desc:"BLIK, raty, platnosci dla firm",logo:"💳",color:T.brand,url:"https://payu.pl"},
            {name:"Stripe",desc:"Karty, Apple Pay, Google Pay",logo:"💰",color:T.purple,url:"https://stripe.com"},
          ].map(p=>(
            <div key={p.name} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderBottom:"1px solid "+T.border}}>
              <div style={{display:"flex",gap:10,alignItems:"center"}}>
                <div style={{fontSize:22}}>{p.logo}</div>
                <div>
                  <div style={{fontWeight:700,fontSize:14}}>{p.name}</div>
                  <div style={{fontSize:11,color:T.textMut}}>{p.desc}</div>
                </div>
              </div>
              <Btn sm outline color={p.color} onClick={()=>window.open(p.url,"_blank")}>Rejestracja</Btn>
            </div>
          ))}
          <div style={{marginTop:12,fontSize:12,color:T.textMut,background:T.bg,borderRadius:8,padding:10}}>
            Po rejestracji skontaktuj sie z nami – podepniemy API i platnosci beda dzialac automatycznie.
          </div>
        </Card>
      </div>
    </div>
  );
}

function KSeF({invoices,setInvoices,isMobile}) {
  const pending=invoices.filter(i=>i.ksef_status!=="wysłana");
  return (
    <div>
      <SH title="KSeF – e-Faktury" sub="Krajowy System e-Faktur · Ministerstwo Finansów"/>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(3,1fr)",gap:12,marginBottom:20}}>
        <Stat label="Do wysłania" value={pending.length} color={T.yellow} icon="📤"/>
        <Stat label="Wysłane" value={invoices.filter(i=>i.ksef_status==="wysłana").length} color={T.green} icon="✅"/>
        <Stat label="Błędy" value={0} color={T.red} icon="❌"/>
      </div>
      <Card>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div style={{fontWeight:800}}>Oczekujące na wysyłkę</div>
          <Btn disabled={pending.length===0} onClick={async()=>{for(const inv of pending){try{await apiFetch(`/invoices/${inv.id}/ksef`,{method:"PATCH"});}catch{}}setInvoices(p=>p.map(i=>({...i,ksef_status:"wysłana"})));}}>Wyślij wszystkie ({pending.length})</Btn>
        </div>
        {pending.length===0&&<div style={{color:T.green,textAlign:"center",padding:20,fontWeight:600}}>✓ Wszystkie faktury wysłane do KSeF</div>}
        {pending.map(inv=>(
          <div key={inv.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderBottom:`1px solid ${T.border}`}}>
            <div><div style={{fontWeight:800,color:T.brand}}>{inv.number}</div><div style={{fontSize:12,color:T.textMut}}>{fmtDate(inv.date_issued)} · {fmt(inv.gross)} zł</div></div>
            <Btn sm onClick={async()=>{try{await apiFetch(`/invoices/${inv.id}/ksef`,{method:"PATCH"});setInvoices(p=>p.map(i=>i.id===inv.id?{...i,ksef_status:"wysłana"}:i));}catch(err){alert("Błąd: "+err.message);}}}>Wyślij</Btn>
          </div>
        ))}
      </Card>
    </div>
  );
}

function UsersScreen({currentUser}) {
  const [users,setUsers]=useState([]);
  const [loading,setLoading]=useState(true);
  const [showAdd,setShowAdd]=useState(false);
  const [newUser,setNewUser]=useState({name:"",email:"",password:"",role:"mechanik",phone:""});
  const set=k=>v=>setNewUser(p=>({...p,[k]:v}));

  useEffect(()=>{apiFetch("/users").then(setUsers).catch(console.error).finally(()=>setLoading(false));},[]);

  const addUser=async()=>{
    try {
      const u=await apiFetch("/users",{method:"POST",body:newUser});
      setUsers(p=>[...p,u]);
      setShowAdd(false);
      setNewUser({name:"",email:"",password:"",role:"mechanik",phone:""});
    } catch(err){alert("Błąd: "+err.message);}
  };

  const toggleActive=async(id,active)=>{
    try {
      await apiFetch(`/users/${id}`,{method:"PATCH",body:{active:!active}});
      setUsers(p=>p.map(u=>u.id===id?{...u,active:!active}:u));
    } catch(err){alert("Błąd: "+err.message);}
  };

  return (
    <div>
      <SH title="Użytkownicy systemu" count={users.length} action={()=>setShowAdd(p=>!p)} actionLabel="Nowy użytkownik"/>
      {showAdd&&(
        <Card style={{marginBottom:16}}>
          <div style={{fontWeight:800,fontSize:15,marginBottom:14}}>Dodaj użytkownika</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Field label="Imię i nazwisko *" value={newUser.name} onChange={set("name")} required/>
            <Field label="E-mail *" value={newUser.email} onChange={set("email")} type="email" required/>
            <Field label="Hasło *" value={newUser.password} onChange={set("password")} type="password" required/>
            <Field label="Telefon" value={newUser.phone} onChange={set("phone")} type="tel"/>
            <Field label="Rola" value={newUser.role} onChange={set("role")} options={[{v:"admin",l:"👑 Administrator"},{v:"mechanik",l:"🔧 Mechanik"},{v:"recepcja",l:"📋 Recepcja"}]}/>
          </div>
          <div style={{marginTop:14,display:"flex",gap:10}}>
            <Btn onClick={addUser} disabled={!newUser.name||!newUser.email||!newUser.password}>Dodaj</Btn>
            <Btn outline color={T.textMut} onClick={()=>setShowAdd(false)}>Anuluj</Btn>
          </div>
        </Card>
      )}
      {loading?<div style={{textAlign:"center",padding:40,color:T.textMut}}>⏳ Ładowanie…</div>:(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {users.map(u=>{
            const rc=ROLE_CFG[u.role]||{};
            return (
              <Card key={u.id}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                  <div style={{display:"flex",alignItems:"center",gap:14}}>
                    <div style={{width:44,height:44,borderRadius:12,background:`linear-gradient(135deg,${rc.color},${rc.color}bb)`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:900,fontSize:15,flexShrink:0}}>{u.avatar}</div>
                    <div>
                      <div style={{fontWeight:800,fontSize:15}}>{u.name} {u.id===currentUser.id&&<span style={{fontSize:11,color:T.brand}}>(Ty)</span>}</div>
                      <div style={{fontSize:13,color:T.textMut,marginBottom:4}}>{u.email} · {u.phone}</div>
                      <div style={{display:"flex",gap:6}}>
                        <Badge color={rc.color} bg={rc.bg} dot>{rc.icon} {rc.label}</Badge>
                        <Badge color={u.active?T.green:T.red} bg={u.active?T.greenLt:T.redLt} dot>{u.active?"Aktywny":"Nieaktywny"}</Badge>
                      </div>
                    </div>
                  </div>
                  {u.id!==currentUser.id&&(
                    <Btn sm outline color={u.active?T.red:T.green} danger={u.active} onClick={()=>toggleActive(u.id,u.active)}>
                      {u.active?"Dezaktywuj":"Aktywuj"}
                    </Btn>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PWA INSTALL BUTTON
// ══════════════════════════════════════════════════════════════════════════════
function PWAInstallButton() {
  const [canInstall,setCanInstall]=useState(false);
  const [installed,setInstalled]=useState(false);

  useEffect(()=>{
    // Check if already installed
    if(window.matchMedia("(display-mode: standalone)").matches){
      setInstalled(true);return;
    }
    // Check if install prompt is available
    const checkPrompt=()=>{
      if(window.pwaInstallPrompt) setCanInstall(true);
    };
    checkPrompt();
    const interval=setInterval(checkPrompt,1000);
    return ()=>clearInterval(interval);
  },[]);

  const install=async()=>{
    if(!window.pwaInstallPrompt)return;
    window.pwaInstallPrompt.prompt();
    const result=await window.pwaInstallPrompt.userChoice;
    if(result.outcome==="accepted"){
      setInstalled(true);setCanInstall(false);
      window.pwaInstallPrompt=null;
    }
  };

  if(installed) return (
    <div style={{fontSize:11,color:"#22c55e",fontWeight:600,textAlign:"center",padding:"4px 0"}}>
      ✓ Zainstalowano na urządzeniu
    </div>
  );

  if(!canInstall) return (
    <div style={{fontSize:11,color:"#64748b",textAlign:"center",padding:"4px 0"}}>
      📱 Dodaj do ekranu głównego
    </div>
  );

  return (
    <button onClick={install} style={{width:"100%",background:"rgba(37,99,235,.2)",border:"1px solid rgba(37,99,235,.4)",borderRadius:8,color:"#60a5fa",padding:"7px",fontFamily:"inherit",fontWeight:700,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
      📲 Zainstaluj aplikację
    </button>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// THEME TOGGLE COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
function ThemeToggle() {
  const [dark,setDark]=useState(localStorage.getItem("wp_theme")==="dark");

  const toggle=()=>{
    const newTheme=dark?"light":"dark";
    localStorage.setItem("wp_theme",newTheme);
    // Update global T object
    const newT=newTheme==="dark"?{...DARK}:{...LIGHT};
    Object.assign(T,newT);
    setDark(!dark);
    // Force re-render of whole app
    window.location.reload();
  };

  return (
    <button onClick={toggle} style={{
      display:"flex",alignItems:"center",gap:3,
      background:dark?"#1e293b":"#f1f5f9",
      border:"2px solid "+(dark?"#334155":"#e2e8f0"),
      borderRadius:30,padding:"4px 6px",cursor:"pointer",
      transition:"all .2s",
    }}>
      <span style={{fontSize:16}}>{dark?"🌙":"☀️"}</span>
      <div style={{
        width:36,height:20,background:dark?"#3b82f6":"#d1d5db",
        borderRadius:10,position:"relative",transition:"background .2s",
      }}>
        <div style={{
          width:16,height:16,background:"#fff",borderRadius:"50%",
          position:"absolute",top:2,left:dark?18:2,transition:"left .2s",
          boxShadow:"0 1px 3px rgba(0,0,0,.2)",
        }}/>
      </div>
      <span style={{fontSize:16}}>{dark?"☀️":"🌙"}</span>
    </button>
  );
}

function Settings({user,onLogout}) {
  const [firm,setFirm]=useState({name:"",nip:"",address:"",city:"",phone:"",email:"",bank:"",ksef_nip:"",ksef_token:""});
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [saved,setSaved]=useState(false);
  const setF=k=>v=>setFirm(p=>({...p,[k]:v}));

  useEffect(()=>{
    apiFetch("/settings").then(d=>{ if(d) setFirm(d); }).catch(()=>{}).finally(()=>setLoading(false));
  },[]);

  const save=async()=>{
    setSaving(true);
    try {
      await apiFetch("/settings",{method:"POST",body:firm});
      setSaved(true);
      setTimeout(()=>setSaved(false),3000);
    } catch(err){ alert("Blad zapisywania: "+err.message); }
    setSaving(false);
  };

  if(loading) return <div style={{textAlign:"center",padding:40,color:T.textMut}}>Ladowanie ustawien...</div>;

  return (
    <div>
      <SH title="Ustawienia" sub="Dane firmy widoczne na fakturach i dokumentach"/>
      <Card style={{maxWidth:640,marginBottom:16}}>
        <div style={{fontWeight:800,fontSize:15,marginBottom:16}}>Dane firmy (naglowek faktur i paragonow)</div>
        <div style={{display:"grid",gap:12}}>
          <Field label="Nazwa firmy *" value={firm.name} onChange={setF("name")} placeholder="np. Auto Serwis XYZ Sp. z o.o." required/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Field label="NIP *" value={firm.nip} onChange={setF("nip")} placeholder="0000000000" required/>
            <Field label="Telefon" value={firm.phone} onChange={setF("phone")} placeholder="+48 22 123 45 67"/>
          </div>
          <Field label="Adres (ulica i numer)" value={firm.address} onChange={setF("address")} placeholder="ul. Warsztatowa 1"/>
          <Field label="Kod pocztowy i miasto" value={firm.city} onChange={setF("city")} placeholder="00-001 Warszawa"/>
          <Field label="E-mail" value={firm.email} onChange={setF("email")} type="email" placeholder="biuro@twojfirma.pl"/>
          <Field label="Numer konta bankowego (IBAN)" value={firm.bank} onChange={setF("bank")} placeholder="PL61 1090 1014 0000 0712 1981 2874"/>
        </div>
        <div style={{fontWeight:800,fontSize:15,marginBottom:12,marginTop:20}}>Konfiguracja KSeF (opcjonalna)</div>
        <div style={{display:"grid",gap:12}}>
          <Field label="NIP do KSeF" value={firm.ksef_nip} onChange={setF("ksef_nip")} placeholder="NIP firmy w KSeF"/>
          <Field label="Token autoryzacyjny KSeF" value={firm.ksef_token} onChange={setF("ksef_token")} placeholder="Token z portalu podatki.gov.pl" type="password"/>
        </div>
        <div style={{marginTop:16,display:"flex",gap:10,alignItems:"center"}}>
          <Btn onClick={save} loading={saving}>Zapisz ustawienia</Btn>
          {saved&&<Badge color={T.green} bg={T.greenLt} dot>Zapisano pomyslnie</Badge>}
        </div>
      </Card>
      <Card style={{maxWidth:640,marginBottom:16}}>
        <div style={{fontWeight:800,fontSize:15,marginBottom:12}}>Drukarka fiskalna i terminal platniczy</div>
        <div style={{background:T.yellowLt,border:"1px solid "+T.yellow+"44",borderRadius:10,padding:12,marginBottom:12,fontSize:13,color:T.yellow,fontWeight:600}}>
          Wymaga uruchomienia WarsztatPro Agent na komputerze w warsztacie (port 8765)
        </div>
        <div style={{display:"grid",gap:12}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Field label="Adres agenta (domyslnie)" value={firm.agent_url||"http://localhost:8765"} onChange={setF("agent_url")} placeholder="http://localhost:8765"/>
            <Field label="Port drukarki Posnet (COM)" value={firm.posnet_port||"COM3"} onChange={setF("posnet_port")} placeholder="COM3"/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Field label="ID terminala platniczego" value={firm.terminal_id||""} onChange={setF("terminal_id")} placeholder="T-POS-0042"/>
            <Field label="Klucz API terminala" value={firm.terminal_key||""} onChange={setF("terminal_key")} placeholder="Z umowy z eService" type="password"/>
          </div>
        </div>
        <div style={{marginTop:12,display:"flex",gap:8}}>
          <Btn sm outline color={T.cyan} onClick={()=>window.open("http://localhost:8765","_blank")}>Otworz dashboard agenta</Btn>
          <Btn sm outline color={T.green} onClick={()=>fetch("http://localhost:8765/api/status").then(r=>r.json()).then(d=>alert("Agent: "+(d.ok?"Online":"Offline"))).catch(()=>alert("Agent offline – uruchom start.bat na komputerze warsztatu"))}>Test polaczenia</Btn>
        </div>
      </Card>
      <Card style={{maxWidth:640,marginBottom:16}}>
        <div style={{fontWeight:800,fontSize:15,marginBottom:12}}>Twoje konto</div>
        <div style={{fontSize:13,color:T.textMut,marginBottom:4}}>Zalogowany jako: <strong>{user.name}</strong></div>
        <div style={{fontSize:13,color:T.textMut,marginBottom:14}}>Rola: <Badge color={(ROLE_CFG[user.role]||{}).color||T.brand} bg={(ROLE_CFG[user.role]||{}).bg||T.brandLt}>{(ROLE_CFG[user.role]||{}).icon} {(ROLE_CFG[user.role]||{}).label}</Badge></div>
        <Btn outline color={T.red} danger onClick={onLogout} icon="🚪">Wyloguj sie</Btn>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ROOT APP
// ══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [user,setUser]=useState(null);
  const [tab,setTab]=useState("dashboard");
  const [modal,setModal]=useState(null);
  const [loading,setLoading]=useState(true);
  const [isMobile,setIsMobile]=useState(window.innerWidth<768);

  // Data state
  const [orders,setOrders]=useState([]);
  const [clients,setClients]=useState([]);
  const [vehicles,setVehicles]=useState([]);
  const [parts,setParts]=useState([]);
  const [invoices,setInvoices]=useState([]);
  const [calEvents,setCalEvents]=useState([]);
  const [users,setUsers]=useState([]);

  useEffect(()=>{
    const h=()=>setIsMobile(window.innerWidth<768);
    window.addEventListener("resize",h);
    return ()=>window.removeEventListener("resize",h);
  },[]);

  // Check existing session
  useEffect(()=>{
    const token=localStorage.getItem("wp_token")||sessionStorage.getItem("wp_token");
    if(token){
      fetch("/api/auth/me",{headers:{"Authorization":"Bearer "+token,"Content-Type":"application/json"}})
        .then(r=>r.ok?r.json():null)
        .then(u=>{ if(u) setUser(u); else { localStorage.removeItem("wp_token"); sessionStorage.removeItem("wp_token"); } })
        .catch(()=>{ localStorage.removeItem("wp_token"); sessionStorage.removeItem("wp_token"); })
        .finally(()=>setLoading(false));
    } else setLoading(false);
  },[]);

  // Load data when logged in
  useEffect(()=>{
    if(!user)return;
    const rc=ROLE_CFG[user.role]||{};
    const token=localStorage.getItem("wp_token")||sessionStorage.getItem("wp_token");
    const load=(path,setter)=>{
      fetch("/api"+path,{headers:{"Authorization":"Bearer "+token,"Content-Type":"application/json"}})
        .then(r=>r.ok?r.json():[])
        .then(setter)
        .catch(()=>setter([]));
    };
    if(rc.modules.includes("orders"))    load("/orders",    setOrders);
    if(rc.modules.includes("clients"))   load("/clients",   setClients);
    if(rc.modules.includes("clients"))   load("/vehicles",  setVehicles);
    if(rc.modules.includes("warehouse")) load("/parts",     setParts);
    if(rc.modules.includes("docs"))      load("/invoices",  setInvoices);
    if(rc.modules.includes("calendar"))  load("/calendar",  setCalEvents);
  },[user]);

  const handleLogin=(u)=>{ setUser(u); };
  const handleLogout=()=>{ localStorage.removeItem("wp_token"); setUser(null); setTab("dashboard"); };

  if(loading) return <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Inter',sans-serif",color:T.textMut}}>⏳ Ładowanie WarsztatPro…</div>;
  if(!user) return <LoginPage onLogin={handleLogin}/>;

  const rc=ROLE_CFG[user.role]||{};
  const TABS=[
    {id:"dashboard",icon:"📊",label:"Pulpit"},
    {id:"orders",   icon:"🔧",label:"Zlecenia"},
    {id:"docs",     icon:"🧾",label:"Dokumenty"},
    {id:"warehouse",icon:"📦",label:"Magazyn"},
    {id:"clients",  icon:"👤",label:"Klienci"},
    {id:"vehicles", icon:"🚗",label:"Pojazdy"},
    {id:"calendar", icon:"📅",label:"Kalendarz"},
    {id:"reports",  icon:"📊",label:"Raporty"},
    {id:"sms",      icon:"📱",label:"SMS"},
    {id:"payments",  icon:"💳",label:"Platnosci"},
    {id:"ksef",     icon:"🏛️",label:"KSeF"},
    {id:"users",    icon:"👥",label:"Użytkownicy"},
    {id:"settings", icon:"⚙️",label:"Ustawienia"},
  ].filter(t=>rc.modules.includes(t.id));

  const sp={orders,setOrders,clients,setClients,vehicles,setVehicles,parts,setParts,invoices,setInvoices,users,setUsers,isMobile,setModal};

  return (
    <div style={{display:"flex",minHeight:"100vh",background:T.bg,fontFamily:"'Inter','Segoe UI',sans-serif",color:T.text}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');*{box-sizing:border-box}@keyframes spin{to{transform:rotate(360deg)}}::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-track{background:#f1f5f9}::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:3px}input:focus,select:focus,textarea:focus{outline:none;border-color:#1a56db!important;box-shadow:0 0 0 3px #1a56db18}`}</style>

      {/* SIDEBAR */}
      {!isMobile&&(
        <nav style={{width:230,background:T.white,borderRight:`1px solid ${T.border}`,display:"flex",flexDirection:"column",padding:"0 10px",position:"fixed",top:0,bottom:0,left:0,zIndex:100,boxShadow:"2px 0 16px rgba(0,0,0,.04)"}}>
          <div style={{padding:"20px 10px 16px",borderBottom:`1px solid ${T.border}`,marginBottom:8,display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:34,height:34,background:"linear-gradient(135deg,#1a56db,#1344b5)",borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <svg width="20" height="20" viewBox="0 0 40 40" fill="none"><path d="M26 8c-2.8 0-5 2.2-5 5 0 .6.1 1.2.3 1.7L9.7 26.3a1 1 0 000 1.4l2.6 2.6a1 1 0 001.4 0L25.3 18.7c.5.2 1.1.3 1.7.3 2.8 0 5-2.2 5-5 0-.5-.1-1-.2-1.4l-2.9 2.9-2.1-.7-.7-2.1 2.9-2.9C28 9.7 27.1 8 26 8z" fill="white"/></svg>
            </div>
            <div><div style={{fontSize:16,fontWeight:900,letterSpacing:"-0.03em"}}>Warsztat<span style={{color:T.brand}}>Pro</span></div><div style={{fontSize:9,color:T.textXs,letterSpacing:".1em",fontWeight:700,textTransform:"uppercase"}}>SYSTEM v2.0</div></div>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:"4px 0"}}>
            {TABS.map(t=>{const active=tab===t.id;return(
              <button key={t.id} onClick={()=>setTab(t.id)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:10,border:"none",background:active?T.brandLt:"transparent",color:active?T.brand:T.textMut,fontWeight:active?700:500,fontSize:14,cursor:"pointer",textAlign:"left",width:"100%",marginBottom:2,transition:"all .15s",fontFamily:"inherit",borderLeft:`3px solid ${active?T.brand:"transparent"}`}}>
                <span style={{fontSize:16}}>{t.icon}</span>{t.label}
              </button>
            );})}
          </div>
          <div style={{padding:"14px 10px",borderTop:`1px solid ${T.border}`}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              <div style={{width:36,height:36,borderRadius:10,background:`linear-gradient(135deg,${rc.color},${rc.color}bb)`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:900,fontSize:13,flexShrink:0}}>{user.avatar}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.name}</div>
                <Badge color={rc.color} bg={rc.bg}>{rc.icon} {rc.label}</Badge>
              </div>
            </div>
            <button onClick={handleLogout} style={{width:"100%",background:T.redLt,border:`1px solid ${T.red}30`,borderRadius:8,color:T.red,padding:"8px",fontFamily:"inherit",fontWeight:700,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>🚪 Wyloguj się</button>
          </div>
        </nav>
      )}

      <main style={{marginLeft:isMobile?0:230,flex:1,padding:isMobile?"0 0 80px":"28px 32px"}}>
        {isMobile&&(
          <div style={{background:T.white,borderBottom:`1px solid ${T.border}`,padding:"14px 16px",position:"sticky",top:0,zIndex:50,boxShadow:T.sh1}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:16,fontWeight:900}}>Warsztat<span style={{color:T.brand}}>Pro</span></div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <Badge color={rc.color} bg={rc.bg}>{rc.icon} {rc.label}</Badge>
                <button onClick={handleLogout} style={{background:"none",border:"none",color:T.red,cursor:"pointer",fontSize:20}}>🚪</button>
              </div>
            </div>
          </div>
        )}
        <div style={{padding:isMobile?"16px":0}}>
          {tab==="dashboard" &&<Dashboard user={user} {...sp}/>}
          {tab==="orders"    &&<Orders {...sp}/>}
          {tab==="docs"      &&<Invoices invoices={invoices} clients={clients} setModal={setModal} isMobile={isMobile}/>}
          {tab==="warehouse" &&<Warehouse {...sp}/>}
          {tab==="clients"   &&<Clients {...sp}/>}
          {tab==="vehicles"  &&<Vehicles vehicles={vehicles} setVehicles={setVehicles} clients={clients} setModal={setModal} isMobile={isMobile}/>}
          {tab==="calendar"  &&<CalendarView events={calEvents} setEvents={setCalEvents} users={users} vehicles={vehicles} orders={orders} isMobile={isMobile}/>}
          {tab==="reports"   &&<Reports isMobile={isMobile}/>}
          {tab==="sms"       &&<SMSModule clients={clients} orders={orders} isMobile={isMobile}/>}
          {tab==="payments"  &&<Payments invoices={invoices} clients={clients} isMobile={isMobile}/>}
          {tab==="ksef"      &&<KSeF invoices={invoices} setInvoices={setInvoices} isMobile={isMobile}/>}
          {tab==="users"     &&<UsersScreen currentUser={user}/>}
          {tab==="settings"  &&<Settings user={user} onLogout={handleLogout}/>}
        </div>
      </main>

      {isMobile&&(
        <nav style={{position:"fixed",bottom:0,left:0,right:0,background:T.white,borderTop:`1px solid ${T.border}`,display:"flex",zIndex:100,boxShadow:"0 -4px 20px rgba(0,0,0,.07)"}}>
          {TABS.slice(0,6).map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",padding:"8px 2px 10px",background:"none",border:"none",cursor:"pointer",color:tab===t.id?T.brand:T.textXs,fontFamily:"inherit",transition:"all .15s"}}>
              <span style={{fontSize:tab===t.id?21:18}}>{t.icon}</span>
              <span style={{fontSize:9,fontWeight:tab===t.id?800:500,marginTop:2}}>{t.label}</span>
              {tab===t.id&&<div style={{width:18,height:2.5,background:T.brand,borderRadius:"2px 2px 0 0",marginTop:3}}/>}
            </button>
          ))}
        </nav>
      )}

      {/* MODALS */}
      {modal?.type==="new_order"&&<NewOrderModal clients={clients} vehicles={vehicles} users={users} onClose={()=>setModal(null)} onSave={async o=>{try{const d=await apiFetch("/orders",{method:"POST",body:o});setOrders(p=>[d,...p]);}catch(err){alert("Blad: "+err.message);}setModal(null);}}/>}
      {modal?.type==="new_client"&&<NewClientModal onClose={()=>setModal(null)} onSave={async c=>{try{const d=await apiFetch("/clients",{method:"POST",body:c});setClients(p=>[...p,d]);}catch(err){alert("Blad: "+err.message);}setModal(null);}}/>}
      {modal?.type==="new_car"&&<NewCarModal clients={clients} onClose={()=>setModal(null)} onSave={async v=>{try{const d=await apiFetch("/vehicles",{method:"POST",body:v});setVehicles(p=>[...p,d]);}catch(err){alert("Blad: "+err.message);}setModal(null);}}/>}
      {modal?.type==="new_part"&&<NewPartModal onClose={()=>setModal(null)} onSave={async p=>{try{const d=await apiFetch("/parts",{method:"POST",body:p});setParts(prev=>[...prev,d]);}catch(err){alert("Blad: "+err.message);}setModal(null);}}/>}
      {modal?.type==="new_invoice"&&<NewInvoiceModal order={modal.order} clients={clients} onClose={()=>setModal(null)} onSave={async inv=>{try{const d=await apiFetch("/invoices",{method:"POST",body:inv});setInvoices(p=>[d,...p]);}catch(err){alert("Blad: "+err.message);}setModal(null);}}/>}
      {modal?.type==="new_doc_standalone"&&<NewInvoiceModal order={null} clients={clients} onClose={()=>setModal(null)} onSave={async inv=>{try{const d=await apiFetch("/invoices",{method:"POST",body:inv});setInvoices(p=>[d,...p]);}catch(err){alert("Blad: "+err.message);}setModal(null);}}/>}
    </div>
  );
}

// ── MODAL COMPONENTS ──────────────────────────────────────────────────────────

// ── INLINE VEHICLE FORM (w formularzu zlecenia) ──────────────────────────────
function InlineVehicleForm({clientId,onSave}) {
  const [f,setF]=useState({make:"",model:"",year:new Date().getFullYear(),plate:"",vin:"",fuel_type:"Benzyna",engine:"",color:"",mileage:0});
  const [vinLoading,setVinLoading]=useState(false);
  const [msg,setMsg]=useState(null);
  const set=k=>v=>setF(p=>({...p,[k]:v}));

  const fetchVIN=async()=>{
    const vin=f.vin.trim().toUpperCase();
    if(vin.length!==17){setMsg({ok:false,txt:"VIN musi miec 17 znakow"});return;}
    setVinLoading(true);setMsg(null);
    try {
      const data=await apiFetch("/vin/"+vin);
      if(data.ok&&data.make){
        setF(p=>({...p,
          make:data.make||p.make,
          model:data.model||p.model,
          year:data.year||p.year,
          engine:data.engine||p.engine,
          fuel_type:data.fuel_type||p.fuel_type,
        }));
        setMsg({ok:true,txt:"Dane z NHTSA: "+data.make+" "+data.model+" "+data.year});
      } else {
        setMsg({ok:false,txt:data.error||"Nie znaleziono pojazdu dla tego VIN"});
      }
    } catch(err){setMsg({ok:false,txt:"Blad pobierania VIN: "+err.message});}
    setVinLoading(false);
  };

  return (
    <div style={{background:T.brandLt,border:"1.5px solid "+T.brand+"44",borderRadius:10,padding:14,marginTop:8}}>
      <div style={{fontWeight:700,fontSize:13,color:T.brand,marginBottom:10}}>Nowy pojazd dla tego klienta</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        <div style={{gridColumn:"1 / -1"}}>
          <div style={{fontSize:11,color:T.textMut,fontWeight:700,textTransform:"uppercase",letterSpacing:".06em",marginBottom:4}}>VIN (opcjonalny – auto-uzupelni dane)</div>
          <div style={{display:"flex"}}>
            <input value={f.vin} onChange={e=>set("vin")(e.target.value.toUpperCase())} placeholder="17-znakowy VIN" maxLength={17}
              style={{...fldSt,borderRadius:"9px 0 0 9px",flex:1,fontFamily:"monospace",fontSize:13}}/>
            <button onClick={fetchVIN} disabled={vinLoading||f.vin.length!==17}
              style={{padding:"0 12px",background:T.green,color:"#fff",border:"none",borderRadius:"0 9px 9px 0",fontFamily:"inherit",fontWeight:700,fontSize:11,cursor:"pointer",opacity:f.vin.length!==17?.4:1}}>
              {vinLoading?"...":"Dekoduj"}
            </button>
          </div>
          {msg&&<div style={{marginTop:4,fontSize:12,color:msg.ok?T.green:T.red,fontWeight:600}}>{msg.txt}</div>}
        </div>
        <Field label="Tablica *" value={f.plate} onChange={v=>set("plate")(v.toUpperCase())} placeholder="WA12345"/>
        <Field label="Marka *" value={f.make} onChange={set("make")} placeholder="np. Volkswagen"/>
        <Field label="Model *" value={f.model} onChange={set("model")} placeholder="np. Golf"/>
        <Field label="Rok" value={f.year} onChange={set("year")} type="number"/>
        <Field label="Paliwo" value={f.fuel_type} onChange={set("fuel_type")} options={["Benzyna","Diesel","Hybryda","Elektryczny","LPG"]}/>
        <Field label="Silnik" value={f.engine} onChange={set("engine")} placeholder="np. 2.0 TDI 150KM"/>
        <Field label="Przebieg (km)" value={f.mileage} onChange={set("mileage")} type="number"/>
      </div>
      <div style={{marginTop:10,display:"flex",gap:8}}>
        <Btn sm onClick={()=>onSave(f)} disabled={!f.make||!f.model||!f.plate} color={T.green}>Dodaj i wybierz pojazd</Btn>
      </div>
    </div>
  );
}

function NewOrderModal({clients,vehicles,users,onClose,onSave}) {
  const [clientId,setClientId]=useState(clients[0]?.id||"");
  const [vehicleId,setVehicleId]=useState("");
  const [mechanicId,setMechanicId]=useState("");
  const [description,setDescription]=useState("");
  const [notes,setNotes]=useState("");
  const [priority,setPriority]=useState("Normalny");
  const [deadline,setDeadline]=useState(today());
  const [items,setItems]=useState([{type:"labor",name:"",qty:1,unit_price:100,vat:23}]);
  const [showAddVehicle,setShowAddVehicle]=useState(false);
  const [newVehicles,setNewVehicles]=useState([]);
  const cVehicles=[...vehicles.filter(v=>v.client_id===+clientId),...newVehicles.filter(v=>v.client_id===+clientId)];
  const mechanics=(users||[]).filter(u=>u.role==="mechanik"||u.role==="admin");
  const {net,vatAmt,gross}=calcTotals(items);
  const setItem=(i,k,v)=>setItems(p=>p.map((x,j)=>j===i?{...x,[k]:v}:x));
  return (
    <Modal title="Nowe zlecenie serwisowe" onClose={onClose} wide>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
        <Field label="Klient *" value={clientId} onChange={v=>{setClientId(v);setVehicleId("");}} options={[{v:"",l:"— wybierz klienta —"},...clients.map(c=>({v:c.id,l:c.name}))]} required/>
        <div>
          <div style={{fontSize:11,color:T.textMut,fontWeight:700,letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:5}}>Pojazd</div>
          <div style={{display:"flex",gap:6}}>
            <select value={vehicleId} onChange={e=>setVehicleId(e.target.value)} style={{...fldSt,flex:1}}>
              <option value="">— wybierz pojazd —</option>
              {cVehicles.map(v=><option key={v.id} value={v.id}>{v.make} {v.model} ({v.plate})</option>)}
            </select>
            {clientId&&<button onClick={()=>setShowAddVehicle(p=>!p)} style={{padding:"0 12px",background:showAddVehicle?T.brand:T.brandLt,color:showAddVehicle?"#fff":T.brand,border:"1.5px solid "+T.brand,borderRadius:9,fontFamily:"inherit",fontWeight:700,fontSize:12,cursor:"pointer",whiteSpace:"nowrap"}}>
              {showAddVehicle?"Anuluj":"+ Nowy pojazd"}
            </button>}
          </div>
          {showAddVehicle&&(
            <InlineVehicleForm clientId={clientId} onSave={async(v)=>{
              try {
                const d=await apiFetch("/vehicles",{method:"POST",body:{...v,client_id:+clientId}});
                setNewVehicles(p=>[...p,d]);
                setVehicleId(d.id);
                setShowAddVehicle(false);
              } catch(err){alert("Blad dodawania pojazdu: "+err.message);}
            }}/>
          )}
        </div>
        <Field label="Mechanik" value={mechanicId} onChange={setMechanicId} options={[{v:"",l:"— wybierz mechanika —"},...mechanics.map(u=>({v:u.id,l:u.name}))]}/>
        <Field label="Priorytet" value={priority} onChange={setPriority} options={["Pilny","Normalny","Niski"]}/>
        <Field label="Termin realizacji" value={deadline} onChange={setDeadline} type="date"/>
        <div style={{gridColumn:"1 / -1"}}><Field label="Opis prac *" value={description} onChange={setDescription} placeholder="Krótki opis zlecenia..." required/></div>
        <div style={{gridColumn:"1 / -1"}}><Field label="Notatki" value={notes} onChange={setNotes} placeholder="Uwagi klienta..." rows={2}/></div>
      </div>
      <div style={{fontSize:11,color:T.textMut,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:8}}>Pozycje zlecenia</div>
      {items.map((it,i)=>(
        <div key={i} style={{background:T.bg,border:"1px solid "+T.border,borderRadius:10,padding:"10px 12px",marginBottom:8}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
            <div style={{display:"flex",gap:6}}>
              <button onClick={()=>setItem(i,"type","labor")} style={{padding:"3px 10px",borderRadius:6,border:"1.5px solid "+(it.type==="labor"?T.purple:T.border),background:it.type==="labor"?T.purpleLt:T.white,color:it.type==="labor"?T.purple:T.textMut,fontFamily:"inherit",cursor:"pointer",fontSize:12,fontWeight:600}}>Robocizna</button>
              <button onClick={()=>setItem(i,"type","part")} style={{padding:"3px 10px",borderRadius:6,border:"1.5px solid "+(it.type==="part"?T.brand:T.border),background:it.type==="part"?T.brandLt:T.white,color:it.type==="part"?T.brand:T.textMut,fontFamily:"inherit",cursor:"pointer",fontSize:12,fontWeight:600}}>Czesc</button>
            </div>
            <button onClick={()=>setItems(p=>p.filter((_,j)=>j!==i))} style={{background:"none",border:"none",color:T.red,cursor:"pointer",fontSize:18}}>x</button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 80px 110px 70px",gap:8}}>
            <Field value={it.name} onChange={v=>setItem(i,"name",v)} placeholder="Nazwa pozycji..."/>
            <Field value={it.qty} onChange={v=>setItem(i,"qty",+v)} type="number"/>
            <Field value={it.unit_price} onChange={v=>setItem(i,"unit_price",+v)} type="number"/>
            <Field value={it.vat} onChange={v=>setItem(i,"vat",+v)} options={["23","8","5","0"]}/>
          </div>
        </div>
      ))}
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        <Btn sm outline color={T.purple} onClick={()=>setItems(p=>[...p,{type:"labor",name:"",qty:1,unit_price:100,vat:23}])}>+ Robocizna</Btn>
        <Btn sm outline color={T.brand} onClick={()=>setItems(p=>[...p,{type:"part",name:"",qty:1,unit_price:0,vat:23}])}>+ Czesc</Btn>
      </div>
      <div style={{background:T.brandLt,borderRadius:12,padding:14,marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:13,color:T.textMut}}>Netto: {fmt(net)} zl  VAT: {fmt(vatAmt)} zl</span>
        <span style={{fontWeight:900,color:T.green,fontSize:20}}>Brutto: {fmt(gross)} zl</span>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:10}}>
        <Btn outline color={T.textMut} onClick={onClose}>Anuluj</Btn>
        <Btn onClick={()=>onSave({client_id:+clientId,vehicle_id:+vehicleId||null,mechanic_id:+mechanicId||null,priority,description,notes,date_deadline:deadline,items})} disabled={!description||!clientId}>Utworz zlecenie</Btn>
      </div>
    </Modal>
  );
}

function NewClientModal({onClose,onSave}) {
  const [f,setF]=useState({name:"",nip:"",phone:"",email:"",address:"",city:"",regon:""});
  const [gusLoading,setGusLoading]=useState(false);
  const [gusMsg,setGusMsg]=useState(null);
  const set=k=>v=>setF(p=>({...p,[k]:v}));

  const fetchGUS=async()=>{
    const nip=f.nip.replace(/\D/g,"");
    if(nip.length!==10){setGusMsg({ok:false,txt:"Wpisz poprawny NIP (10 cyfr)"});return;}
    setGusLoading(true);setGusMsg(null);
    try {
      const data=await apiFetch("/gus/"+nip);
      if(data.ok){
        setF(p=>({...p,name:data.name||p.name,address:data.address||p.address,city:data.city||p.city,regon:data.regon||p.regon}));
        const src=data.source==="CEIDG"?"CEIDG (Ministerstwo Rozwoju)":"GUS";
        setGusMsg({ok:true,txt:"Dane pobrane z "+src+" dla NIP: "+nip+(data.info?" – "+data.info:"")});
      } else {
        setGusMsg({ok:false,txt:data.error||"Nie znaleziono firmy"});
      }
    } catch(err){
      setGusMsg({ok:false,txt:"Blad: "+err.message});
    }
    setGusLoading(false);
  };

  return (
    <Modal title="Nowy klient" sub="Pobierz dane z GUS BIR po NIP" onClose={onClose}>
      <div style={{display:"grid",gap:12}}>
        <div>
          <div style={{fontSize:11,color:T.textMut,fontWeight:700,letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:5}}>NIP firmy</div>
          <div style={{display:"flex"}}>
            <input value={f.nip} onChange={e=>set("nip")(e.target.value)} placeholder="0000000000"
              style={{...fldSt,borderRadius:"9px 0 0 9px",flex:1}}/>
            <button onClick={fetchGUS} disabled={gusLoading||!f.nip}
              style={{padding:"0 14px",background:gusLoading?T.textXs:T.brand,color:"#fff",border:"none",borderRadius:"0 9px 9px 0",fontFamily:"inherit",fontWeight:700,fontSize:12,cursor:"pointer",whiteSpace:"nowrap",opacity:!f.nip?.5:1}}>
              {gusLoading?"...":"Pobierz z GUS"}
            </button>
          </div>
          {gusMsg&&<div style={{marginTop:6,padding:"8px 12px",background:gusMsg.ok?T.greenLt:T.redLt,borderRadius:8,fontSize:13,color:gusMsg.ok?T.green:T.red,fontWeight:600}}>{gusMsg.txt}</div>}
        </div>
        <Field label="Nazwa / Imie i nazwisko *" value={f.name} onChange={set("name")} required placeholder="np. Jan Kowalski lub Firma XYZ Sp. z o.o."/>
        <Field label="REGON" value={f.regon} onChange={set("regon")} placeholder="123456789"/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Field label="Telefon" value={f.phone} onChange={set("phone")} type="tel" placeholder="+48 600 100 200"/>
          <Field label="E-mail" value={f.email} onChange={set("email")} type="email" placeholder="email@firma.pl"/>
        </div>
        <Field label="Adres (ulica i numer)" value={f.address} onChange={set("address")} placeholder="ul. Przykladowa 1"/>
        <Field label="Kod pocztowy i miasto" value={f.city} onChange={set("city")} placeholder="00-001 Warszawa"/>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:20}}>
        <Btn outline color={T.textMut} onClick={onClose}>Anuluj</Btn>
        <Btn onClick={()=>onSave(f)} disabled={!f.name}>Dodaj klienta</Btn>
      </div>
    </Modal>
  );
}

function NewCarModal({clients,onClose,onSave}) {
  const [f,setF]=useState({client_id:clients[0]?.id||"",make:"",model:"",year:2020,plate:"",vin:"",mileage:0,fuel_type:"Benzyna",engine:"",color:""});
  const [vinLoading,setVinLoading]=useState(false);
  const [vinMsg,setVinMsg]=useState(null);
  const [plateLoading,setPlateLoading]=useState(false);
  const set=k=>v=>setF(p=>({...p,[k]:v}));

  // VIN Decoder – pobieranie danych pojazdu po numerze VIN
  const fetchVIN=async()=>{
    const vin=f.vin.trim().toUpperCase();
    if(vin.length!==17){setVinMsg({ok:false,txt:"VIN musi miec dokladnie 17 znakow"});return;}
    setVinLoading(true);setVinMsg(null);
    try {
      const data=await apiFetch("/vin/"+vin);
      if(data.ok){
        setF(p=>({...p,make:data.make||p.make,model:data.model||p.model,year:data.year||p.year,engine:data.engine||p.engine,fuel_type:data.fuel_type||p.fuel_type}));
        setVinMsg({ok:true,txt:"Dane z NHTSA (baza USA): "+data.make+" "+data.model+" "+data.year+(data.body_type?" · "+data.body_type:"")});
      } else {
        setVinMsg({ok:false,txt:data.error||"Nie znaleziono VIN"});
      }
    } catch(err){
      setVinMsg({ok:false,txt:"Blad: "+err.message});
    }
    setVinLoading(false);
  };

  // CEPiK – pobieranie danych po tablicy rejestracyjnej (symulacja)
  const fetchPlate=async()=>{
    const plate=f.plate.trim().toUpperCase();
    if(!plate){setVinMsg({ok:false,txt:"Wpisz numer rejestracyjny"});return;}
    setPlateLoading(true);setVinMsg(null);
    try {
      const data=await apiFetch("/cepik/"+plate);
      if(data.ok){
        setF(p=>({...p,make:data.make||p.make,model:data.model||p.model,year:data.year||p.year,vin:data.vin||p.vin,fuel_type:data.fuel_type||p.fuel_type,engine:data.engine||p.engine,color:data.color||p.color,plate}));
        if(data.info){
          setVinMsg({ok:false,txt:"CEPiK: "+data.info});
        } else {
          setVinMsg({ok:true,txt:"Dane z CEPiK dla tablicy: "+plate+" · "+data.make+" "+data.model+" "+data.year});
        }
      } else {
        setVinMsg({ok:false,txt:data.error||"Nie znaleziono pojazdu"});
      }
    } catch(err){
      setVinMsg({ok:false,txt:"Blad: "+err.message});
    }
    setPlateLoading(false);
  };

  return (
    <Modal title="Dodaj pojazd" sub="Pobierz dane po VIN lub tablicy rejestracyjnej" onClose={onClose} wide>
      <div style={{display:"grid",gap:12}}>
        <Field label="Wlasciciel *" value={f.client_id} onChange={set("client_id")} options={clients.map(c=>({v:c.id,l:c.name}))} required/>

        {/* VIN z przyciskiem */}
        <div>
          <div style={{fontSize:11,color:T.textMut,fontWeight:700,letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:5}}>Numer VIN (17 znakow)</div>
          <div style={{display:"flex"}}>
            <input value={f.vin} onChange={e=>set("vin")(e.target.value.toUpperCase())} placeholder="np. WVWZZZ1KZ9W123456" maxLength={17}
              style={{...fldSt,borderRadius:"9px 0 0 9px",flex:1,fontFamily:"monospace"}}/>
            <button onClick={fetchVIN} disabled={vinLoading||f.vin.length!==17}
              style={{padding:"0 14px",background:vinLoading?T.textXs:T.green,color:"#fff",border:"none",borderRadius:"0 9px 9px 0",fontFamily:"inherit",fontWeight:700,fontSize:12,cursor:"pointer",whiteSpace:"nowrap",opacity:f.vin.length!==17?.5:1}}>
              {vinLoading?"...":"Dekoduj VIN"}
            </button>
          </div>
          <div style={{fontSize:11,color:T.textXs,marginTop:3}}>Wpisz 17-znakowy VIN aby auto-uzupelnic dane pojazdu (NHTSA)</div>
        </div>

        {/* Tablica z CEPiK */}
        <div>
          <div style={{fontSize:11,color:T.textMut,fontWeight:700,letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:5}}>Numer rejestracyjny *</div>
          <div style={{display:"flex"}}>
            <input value={f.plate} onChange={e=>set("plate")(e.target.value.toUpperCase())} placeholder="np. WA12345"
              style={{...fldSt,borderRadius:"9px 0 0 9px",flex:1}}/>
            <button onClick={fetchPlate} disabled={plateLoading||!f.plate}
              style={{padding:"0 14px",background:plateLoading?T.textXs:T.brand,color:"#fff",border:"none",borderRadius:"0 9px 9px 0",fontFamily:"inherit",fontWeight:700,fontSize:12,cursor:"pointer",whiteSpace:"nowrap",opacity:!f.plate?.5:1}}>
              {plateLoading?"...":"Pobierz CEPiK"}
            </button>
          </div>
          <div style={{fontSize:11,color:T.textXs,marginTop:3}}>Wpisz tablice i kliknij aby pobrac dane z bazy CEPiK</div>
        </div>

        {vinMsg&&<div style={{padding:"8px 12px",background:vinMsg.ok?T.greenLt:T.redLt,borderRadius:8,fontSize:13,color:vinMsg.ok?T.green:T.red,fontWeight:600}}>{vinMsg.txt}</div>}

        <div style={{fontSize:11,color:T.textMut,fontWeight:700,letterSpacing:"0.07em",textTransform:"uppercase",marginTop:4}}>Dane pojazdu</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Field label="Marka *" value={f.make} onChange={set("make")} placeholder="np. Volkswagen"/>
          <Field label="Model *" value={f.model} onChange={set("model")} placeholder="np. Golf VII"/>
          <Field label="Rok produkcji" value={f.year} onChange={set("year")} type="number"/>
          <Field label="Paliwo" value={f.fuel_type} onChange={set("fuel_type")} options={["Benzyna","Diesel","Hybryda","Elektryczny","LPG","CNG"]}/>
          <Field label="Silnik / Moc" value={f.engine} onChange={set("engine")} placeholder="np. 1968 cm3 150 KM"/>
          <Field label="Kolor" value={f.color} onChange={set("color")} placeholder="np. Czarny metalik"/>
          <Field label="Przebieg (km)" value={f.mileage} onChange={set("mileage")} type="number"/>
        </div>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:20}}>
        <Btn outline color={T.textMut} onClick={onClose}>Anuluj</Btn>
        <Btn onClick={()=>onSave(f)} disabled={!f.make||!f.model||!f.plate}>Dodaj pojazd</Btn>
      </div>
    </Modal>
  );
}

function NewPartModal({onClose,onSave}) {
  const [f,setF]=useState({catalog_no:"",name:"",unit:"szt",buy_price:0,sell_price:0,vat:23,stock:0,min_stock:2,category:"Ogolne",supplier:""});
  const set=k=>v=>setF(p=>({...p,[k]:v}));
  return (
    <Modal title="Nowa czesc / towar" onClose={onClose}>
      <div style={{display:"grid",gap:12}}>
        <Field label="Nazwa *" value={f.name} onChange={set("name")} required/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Field label="Nr katalogowy" value={f.catalog_no} onChange={set("catalog_no")}/>
          <Field label="Kategoria" value={f.category} onChange={set("category")} options={["Filtry","Oleje","Hamulce","Rozrzad","Zaplon","Zawieszenie","Elektryka","Ogolne"]}/>
          <Field label="Cena zakupu netto (zl)" value={f.buy_price} onChange={set("buy_price")} type="number"/>
          <Field label="Cena sprzedazy netto (zl)" value={f.sell_price} onChange={set("sell_price")} type="number"/>
          <Field label="Stawka VAT (%)" value={f.vat} onChange={set("vat")} options={["23","8","5","0"]}/>
          <Field label="Jednostka" value={f.unit} onChange={set("unit")} options={["szt","kpl","L","kg","m"]}/>
          <Field label="Stan magazynowy" value={f.stock} onChange={set("stock")} type="number"/>
          <Field label="Stan minimalny" value={f.min_stock} onChange={set("min_stock")} type="number"/>
        </div>
        <Field label="Dostawca" value={f.supplier} onChange={set("supplier")}/>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:20}}>
        <Btn outline color={T.textMut} onClick={onClose}>Anuluj</Btn>
        <Btn onClick={()=>onSave(f)} disabled={!f.name}>Dodaj czesc</Btn>
      </div>
    </Modal>
  );
}

function NewInvoiceModal({order,clients,onClose,onSave}) {
  const [type,setType]=useState("faktura_vat");
  const [clientId,setClientId]=useState(order?.client_id||clients[0]?.id||"");
  const [payment,setPayment]=useState("Przelew");
  const [dateDue,setDateDue]=useState(()=>{const d=new Date();d.setDate(d.getDate()+14);return d.toISOString().slice(0,10);});
  const [notes,setNotes]=useState("");
  const items=order?.items||[];
  const {net,vatAmt,gross}=calcTotals(items);
  const types=[{v:"faktura_vat",l:"Faktura VAT"},{v:"faktura_marza",l:"VAT Marza"},{v:"paragon",l:"Paragon"},{v:"wz",l:"WZ"}];
  return (
    <Modal title="Wystaw dokument sprzedazy" onClose={onClose}>
      <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
        {types.map(t=>(
          <button key={t.v} onClick={()=>setType(t.v)} style={{padding:"7px 14px",borderRadius:8,border:"1.5px solid "+(type===t.v?T.brand:T.border),background:type===t.v?T.brandLt:T.white,color:type===t.v?T.brand:T.textMut,fontWeight:600,cursor:"pointer",fontFamily:"inherit",fontSize:13}}>
            {t.l}
          </button>
        ))}
      </div>
      <div style={{display:"grid",gap:12,marginBottom:14}}>
        <Field label="Klient" value={clientId} onChange={setClientId} options={clients.map(c=>({v:c.id,l:c.name}))}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Field label="Data wystawienia" value={today()} onChange={()=>{}} type="date"/>
          <Field label="Termin platnosci" value={dateDue} onChange={setDateDue} type="date"/>
        </div>
        <Field label="Forma platnosci" value={payment} onChange={setPayment} options={["Przelew","Gotowka","Karta","BLIK"]}/>
        <Field label="Uwagi" value={notes} onChange={setNotes} rows={2}/>
      </div>
      <div style={{background:T.brandLt,borderRadius:12,padding:14,marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:13,color:T.textMut}}>Netto: {fmt(net)} zl  VAT: {fmt(vatAmt)} zl</span>
        <span style={{fontWeight:900,color:T.green,fontSize:18}}>{fmt(gross)} zl</span>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:10}}>
        <Btn outline color={T.textMut} onClick={onClose}>Anuluj</Btn>
        <Btn onClick={()=>onSave({type,client_id:+clientId,order_id:order?.id||null,buyer_name:clients.find(c=>c.id===+clientId)?.name,buyer_nip:clients.find(c=>c.id===+clientId)?.nip,date_issued:today(),date_sale:today(),date_due:dateDue,payment,net,vat_amt:vatAmt,gross,notes,items})}>
          Wystaw dokument
        </Btn>
      </div>
    </Modal>
  );
}
