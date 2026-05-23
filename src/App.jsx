import React from "react";

export default function App() {
  return (
    <div style={{
      minHeight:"100vh",
      background:"#0f172a",
      color:"#fff",
      display:"flex",
      alignItems:"center",
      justifyContent:"center",
      fontFamily:"Arial"
    }}>
      <div style={{
        background:"#111827",
        padding:"40px",
        borderRadius:"16px",
        width:"420px",
        boxShadow:"0 0 30px rgba(0,0,0,0.35)"
      }}>
        <h1 style={{marginTop:0}}>WarsztatPro</h1>
        <p>Panel działa poprawnie.</p>

        <div style={{marginTop:"20px"}}>
          <button style={{
            width:"100%",
            padding:"12px",
            background:"#2563eb",
            color:"#fff",
            border:"none",
            borderRadius:"10px",
            fontSize:"16px"
          }}>
            Zalogowano pomyślnie
          </button>
        </div>

        <div style={{marginTop:"20px",fontSize:"14px",opacity:0.8}}>
          <p>✓ Frontend działa</p>
          <p>✓ React działa</p>
          <p>✓ Build działa</p>
        </div>
      </div>
    </div>
  );
}
