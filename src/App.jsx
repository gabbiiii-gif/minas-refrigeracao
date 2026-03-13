/**
 * ═══════════════════════════════════════════════════════
 *  MINAS REFRIGERAÇÃO — ERP v3.0
 *  App.jsx — Coloque em: src/App.jsx
 *
 *  ANTES DE RODAR, INSTALE AS DEPENDÊNCIAS:
 *  npm install gsap jspdf jspdf-autotable xlsx lucide-react recharts
 * ═══════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback, useRef } from "react";
import gsap from "gsap";
import {
  LayoutDashboard, Users, Wrench, Calendar, DollarSign,
  BarChart3, Settings, LogOut, Menu, X, Plus, Search,
  Bell, Thermometer, Wind, CheckCircle, AlertCircle,
  MapPin, Edit2, Trash2, Send, RefreshCw, Package,
  FileText, Zap, Shield, ArrowUp, Snowflake, Save,
  Download, FileSpreadsheet, MessageSquare, Phone,
  Wifi, WifiOff, ChevronRight, Star
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell
} from "recharts";

// ─── IMPORTAR SERVIÇOS (após criar os arquivos) ───────────────────────────────
// import { sendWhatsAppMessage, checkInstanceStatus, TEMPLATES } from "./services/whatsappService";
// import { gerarRelatorioPDF, gerarRelatorioExcel } from "./services/relatorioService";

// ─── MOCK DOS SERVIÇOS (funciona sem os arquivos externos) ────────────────────
const TEMPLATES = {
  lembrete6Meses: (n) => `Olá ${n}! 👋\n\nAqui é da *Minas Refrigeração* ❄️\n\nJá faz 6 meses desde a última manutenção.\n\n✔ Reduz consumo de energia\n✔ Aumenta vida útil\n✔ Evita problemas no calor\n\nGostaria de agendar? 😊`,
  lembrete12Meses: (n) => `Olá ${n}! 👋\n\nFaz 1 ano da última revisão ❄️\n\n🎁 Agende agora e ganhe *10% de desconto*!\n\nResponda aqui para marcar 📲`,
  confirmacaoAgendamento: (n, d, h, s, t) => `Olá ${n}! ✅\n\nAgendamento confirmado:\n📅 ${d} às ${h}\n🔧 ${s}\n👨‍🔧 ${t}\n\n— *Minas Refrigeração* ❄️`,
  posServico: (n) => `Olá ${n}! 😊\n\nAvalie nosso atendimento de hoje!\n\nNota de *1 a 5 ⭐* — sua opinião importa!\n\n— *Minas Refrigeração*`,
  orcamento: (n, s, v) => `Olá ${n}! 👋\n\n🔧 Serviço: ${s}\n💰 Valor: R$ ${Number(v).toFixed(2).replace(".", ",")}\n\nVálido por 7 dias. Responda para agendar! 😊`,
};

async function sendWhatsAppMessage(phone, message, config) {
  const { instanceId, token, clientToken } = config;
  if (!instanceId || !token || !clientToken) throw new Error("Configure Instance ID, Token e Client-Token da Z-API nas Configurações.");
  let p = phone.replace(/\D/g, "");
  if (!p.startsWith("55")) p = "55" + p;
  const res = await fetch(
    `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`,
    {
      method: "POST",
      headers: { 
  "Content-Type": "application/json", 
  "client-token": clientToken
},
      body: JSON.stringify({ phone: p, message }),
    }
  );
  if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e.message || `Erro ${res.status}`); }
  return res.json();
}

async function checkInstanceStatus(config) {
  const { instanceId, token, clientToken } = config;
  if (!instanceId || !token || !clientToken) return { connected: false };
  try {
    const res = await fetch(`https://api.z-api.io/instances/${instanceId}/token/${token}/status`, { headers: { "client-token": clientToken } });
    const d = await res.json();
    return { connected: d.connected === true, phone: d.phone };
  } catch { return { connected: false }; }
}

// PDF/Excel — funções que usam imports dinâmicos para não quebrar se não instalado
async function gerarRelatorioPDF(data) {
  try {
    const jsPDF = (await import("jspdf")).default;
    const { default: autoTable } = await import("jspdf-autotable");
    const { servicos, clientes, empresa } = data;
    const doc = new jsPDF();
    const nome = empresa?.nome || "Minas Refrigeração";
    const fmtM = v => `R$ ${Number(v||0).toLocaleString("pt-BR",{minimumFractionDigits:2})}`;
    const fmtD = d => d ? new Date(d+"T12:00:00").toLocaleDateString("pt-BR") : "—";

    doc.setFillColor(15,23,42); doc.rect(0,0,210,36,"F");
    doc.setTextColor(255,255,255); doc.setFontSize(18); doc.setFont("helvetica","bold");
    doc.text(nome, 14, 15);
    doc.setFontSize(9); doc.setFont("helvetica","normal"); doc.setTextColor(148,163,184);
    doc.text("Relatório de Serviços e Faturamento", 14, 23);
    doc.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")}`, 14, 30);

    const concl = servicos.filter(s=>s.status==="concluido");
    const fat = concl.reduce((a,s)=>a+Number(s.valor||0),0);
    const ticket = concl.length ? fat/concl.length : 0;

    const kpis = [
      {l:"Faturamento",v:fmtM(fat),x:14},{l:"OS Concluídas",v:String(concl.length),x:62},
      {l:"Ticket Médio",v:fmtM(ticket),x:110},{l:"Clientes",v:String(clientes.length),x:158},
    ];
    kpis.forEach(k => {
      doc.setFillColor(30,41,59); doc.roundedRect(k.x,40,40,18,2,2,"F");
      doc.setFontSize(6); doc.setTextColor(148,163,184); doc.text(k.l.toUpperCase(),k.x+2,47);
      doc.setFontSize(9); doc.setTextColor(226,232,240); doc.setFont("helvetica","bold"); doc.text(k.v,k.x+2,55);
    });

    doc.setFontSize(11); doc.setTextColor(37,99,235); doc.setFont("helvetica","bold"); doc.text("Serviços",14,72);
    autoTable(doc, {
      startY:76,
      head:[["Cliente","Tipo","Técnico","Data","Valor","Status"]],
      body: servicos.map(s=>{const c=clientes.find(x=>x.id===s.clienteId);return[c?.nome||"—",s.tipo,s.tecnico||"—",fmtD(s.data),fmtM(s.valor),s.status]}),
      theme:"grid",
      headStyles:{fillColor:[37,99,235],textColor:255,fontSize:8},
      bodyStyles:{fontSize:7,textColor:[51,65,85]},
      alternateRowStyles:{fillColor:[248,250,252]},
      foot:[["","","","TOTAL",fmtM(fat),""]],
      footStyles:{fillColor:[15,23,42],textColor:[96,165,250],fontStyle:"bold",fontSize:8},
    });
    doc.save(`relatorio-minas-${new Date().toISOString().slice(0,10)}.pdf`);
    return true;
  } catch(e) {
    throw new Error("Instale jspdf e jspdf-autotable: npm install jspdf jspdf-autotable");
  }
}

async function gerarRelatorioExcel(data) {
  try {
    const XLSX = await import("xlsx");
    const { servicos, clientes, equipamentos, empresa } = data;
    const fmtD = d => d ? new Date(d+"T12:00:00").toLocaleDateString("pt-BR") : "—";
    const wb = XLSX.utils.book_new();
    const concl = servicos.filter(s=>s.status==="concluido");
    const fat = concl.reduce((a,s)=>a+Number(s.valor||0),0);

    const svcs = [
      [`${empresa?.nome||"Minas Refrigeração"} — Relatório de Serviços`],
      [`Gerado: ${new Date().toLocaleDateString("pt-BR")}`],[],
      ["#","Cliente","Tipo","Técnico","Data","Valor (R$)","Status","Observações"],
      ...servicos.map((s,i)=>{const c=clientes.find(x=>x.id===s.clienteId);return[i+1,c?.nome||"—",s.tipo,s.tecnico||"—",fmtD(s.data),Number(s.valor||0),s.status,s.obs||""]}),
      [],[  "","","","","TOTAL:",fat],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(svcs);
    ws1["!cols"]=[{wch:4},{wch:35},{wch:28},{wch:18},{wch:14},{wch:14},{wch:14},{wch:30}];
    XLSX.utils.book_append_sheet(wb, ws1, "Serviços");

    const clis = [["Nome","Telefone","WhatsApp","Email","Cidade","Status"],...clientes.map(c=>[c.nome,c.telefone||"",c.whatsapp||"",c.email||"",c.cidade||"",c.status])];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(clis), "Clientes");

    const equips = [["Cliente","Tipo","Marca","Modelo","Potência","Instalação","Ult.Manut","Status"],...equipamentos.map(e=>{const c=clientes.find(x=>x.id===e.clienteId);return[c?.nome||"—",e.tipo,e.marca||"",e.modelo||"",e.potencia||"",fmtD(e.dataInstalacao),fmtD(e.ultimaManutencao),e.status]})];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(equips), "Equipamentos");

    const resumo = [["Indicador","Valor"],["Faturamento Total",fat],["OS Concluídas",concl.length],["Total Clientes",clientes.length],["Clientes Ativos",clientes.filter(c=>c.status==="ativo").length]];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumo), "Resumo");

    XLSX.writeFile(wb, `relatorio-minas-${new Date().toISOString().slice(0,10)}.xlsx`);
    return true;
  } catch {
    throw new Error("Instale xlsx: npm install xlsx");
  }
}

// ─── STORAGE ──────────────────────────────────────────────────────────────────
const useStorage = (key, initial) => {
  const [state, setState] = useState(() => {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : initial; }
    catch { return initial; }
  });
  const set = useCallback((val) => {
    setState(prev => {
      const next = typeof val === "function" ? val(prev) : val;
      try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [key]);
  return [state, set];
};

const newId = () => Date.now() + Math.random();

// ─── DADOS INICIAIS ───────────────────────────────────────────────────────────
const INIT_CLIENTES = [
  {id:1,nome:"Supermercado Belo Horizonte",telefone:"(31) 99201-3344",whatsapp:"(31) 99201-3344",email:"contato@superbh.com.br",cidade:"Belo Horizonte",estado:"MG",endereco:"Av. Afonso Pena, 1500",status:"ativo"},
  {id:2,nome:"Restaurante Sabor Mineiro",telefone:"(31) 98765-4321",whatsapp:"(31) 98765-4321",email:"sabor@mineiro.com",cidade:"Contagem",estado:"MG",endereco:"Rua das Flores, 200",status:"ativo"},
  {id:3,nome:"Farmácia Central",telefone:"(31) 97654-3210",whatsapp:"(31) 97654-3210",email:"central@farmacia.com",cidade:"Betim",estado:"MG",endereco:"Praça da Liberdade, 50",status:"pendente"},
];
const INIT_EQUIPS = [
  {id:1,clienteId:1,tipo:"Câmara Fria",marca:"Fricon",modelo:"CF-40",potencia:"5 HP",dataInstalacao:"2022-03-15",ultimaManutencao:"2025-09-10",status:"ok"},
  {id:2,clienteId:1,tipo:"Split",marca:"Midea",modelo:"Inverter 24000",potencia:"24000 BTU",dataInstalacao:"2023-06-20",ultimaManutencao:"2025-09-10",status:"ok"},
  {id:3,clienteId:2,tipo:"Split",marca:"Samsung",modelo:"Wind Free 18k",potencia:"18000 BTU",dataInstalacao:"2021-11-10",ultimaManutencao:"2025-11-20",status:"atencao"},
];
const INIT_SERVICOS = [
  {id:1,clienteId:1,equipamentoId:1,tipo:"Manutenção Preventiva",tecnico:"Carlos Silva",valor:"380.00",data:"2026-03-08",status:"concluido",obs:""},
  {id:2,clienteId:2,equipamentoId:3,tipo:"Limpeza Completa",tecnico:"André Souza",valor:"150.00",data:"2026-03-09",status:"concluido",obs:""},
  {id:3,clienteId:3,equipamentoId:0,tipo:"Recarga de Gás",tecnico:"Carlos Silva",valor:"220.00",data:"2026-03-10",status:"agendado",obs:""},
];
const INIT_PRECOS = [
  {id:1,servico:"Limpeza Split Até 12.000 BTU",descricao:"Higienização completa, filtros e evaporadora",valor:"120.00"},
  {id:2,servico:"Limpeza Split 18k a 24k BTU",descricao:"Higienização completa, filtros e evaporadora",valor:"150.00"},
  {id:3,servico:"Limpeza Split Acima 24k BTU",descricao:"Higienização completa, filtros e evaporadora",valor:"180.00"},
  {id:4,servico:"Manutenção Preventiva",descricao:"Revisão completa de todos os componentes",valor:"280.00"},
  {id:5,servico:"Recarga de Gás R22",descricao:"Por kg de gás refrigerante",valor:"180.00"},
  {id:6,servico:"Recarga de Gás R410A",descricao:"Por kg de gás refrigerante",valor:"160.00"},
  {id:7,servico:"Instalação Split até 24k BTU",descricao:"Suporte, tubulação até 4m e ramal elétrico",valor:"350.00"},
  {id:8,servico:"Manutenção Câmara Fria",descricao:"Revisão completa do sistema de refrigeração",valor:"450.00"},
  {id:9,servico:"Manutenção Corretiva",descricao:"Diagnóstico + reparo (peças à parte)",valor:"220.00"},
  {id:10,servico:"Visita Técnica",descricao:"Diagnóstico sem conserto incluso",valor:"80.00"},
];

// ─── DADOS MULTIEMPRESA ──────────────────────────────────────────────────────
const INIT_EMPRESAS = [
  {id:1,nome:"Minas Refrigeração",cnpj:"12.345.678/0001-90",plano:"profissional",limiteUsuarios:5,codigo:"MINAS01",createdAt:"2024-01-15"},
  {id:2,nome:"Gelo & Frio LTDA",cnpj:"98.765.432/0001-10",plano:"basico",limiteUsuarios:5,codigo:"GELO02",createdAt:"2024-03-20"},
];
const INIT_USUARIOS = [
  {id:1,empresaId:1,nome:"Administrador",email:"admin@minasrefrig.com.br",senha:"123456",tipo:"administrador",status:"ativo",createdAt:"2024-01-15"},
  {id:2,empresaId:1,nome:"Carlos Silva",email:"carlos@minasrefrig.com.br",senha:"123456",tipo:"operador",status:"ativo",createdAt:"2024-02-10"},
  {id:3,empresaId:2,nome:"Admin Gelo & Frio",email:"admin@gelofrio.com.br",senha:"123456",tipo:"administrador",status:"ativo",createdAt:"2024-03-20"},
];

// ─── ESTILOS ──────────────────────────────────────────────────────────────────
const css = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@400;500;600&display=swap');

*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
:root{
  --bg:#0a0f1e;--bg2:#0f172a;--card:#1e293b;--card2:#162032;
  --blue:#2563eb;--blue2:#3b82f6;--blue3:#60a5fa;
  --text:#e2e8f0;--text2:#94a3b8;--border:#1e3a5f;
  --green:#10b981;--amber:#f59e0b;--red:#ef4444;--purple:#8b5cf6;
  --sw:240px;--radius:10px;
}
body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;overflow-x:hidden;min-height:100vh}
.app{display:flex;min-height:100vh}

/* ── SIDEBAR ── */
.sidebar{
  width:var(--sw);background:var(--bg2);border-right:1px solid var(--border);
  display:flex;flex-direction:column;position:fixed;top:0;left:0;height:100vh;
  z-index:100;overflow-y:auto;
  transform:translateX(0);transition:transform .35s cubic-bezier(.4,0,.2,1);
  will-change:transform;
}
.sidebar.closed{transform:translateX(-105%)}
.sidebar-logo{padding:18px 14px 14px;border-bottom:1px solid var(--border)}
.logo-box{display:flex;align-items:center;gap:10px}
.logo-icon{width:36px;height:36px;background:linear-gradient(135deg,var(--blue),#1d4ed8);border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 0 20px rgba(37,99,235,.35)}
.logo-text{font-family:'Syne',sans-serif;font-weight:800;font-size:13px;line-height:1.2}
.logo-sub{font-size:9px;color:var(--blue3);font-weight:600;letter-spacing:1px;text-transform:uppercase}
.nav-section{padding:10px 10px 0}
.nav-label{font-size:9px;color:var(--text2);font-weight:700;letter-spacing:1.5px;text-transform:uppercase;padding:0 7px 6px}
.nav-item{
  display:flex;align-items:center;gap:9px;padding:9px 10px;border-radius:8px;
  cursor:pointer;color:var(--text2);font-size:13px;font-weight:500;margin-bottom:1px;
  transition:background .15s,color .15s;position:relative;user-select:none;
}
.nav-item:hover{background:rgba(37,99,235,.12);color:var(--blue3)}
.nav-item.active{background:rgba(37,99,235,.18);color:var(--blue2)}
.nav-item.active::before{content:'';position:absolute;left:0;top:20%;bottom:20%;width:3px;background:var(--blue2);border-radius:0 3px 3px 0}
.nav-item svg{width:15px;height:15px;flex-shrink:0}
.sidebar-footer{margin-top:auto;padding:10px;border-top:1px solid var(--border)}
.user-card{display:flex;align-items:center;gap:9px;padding:8px;border-radius:8px;background:var(--card2)}
.avatar{width:30px;height:30px;background:linear-gradient(135deg,var(--blue),var(--purple));border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;flex-shrink:0}
.user-name{font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.user-role{font-size:10px;color:var(--text2)}

/* ── OVERLAY ── */
.overlay{position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:99;backdrop-filter:blur(3px);opacity:0;pointer-events:none;transition:opacity .3s}
.overlay.show{opacity:1;pointer-events:all}

/* ── MAIN ── */
.main{flex:1;margin-left:var(--sw);display:flex;flex-direction:column;min-height:100vh;transition:margin .35s cubic-bezier(.4,0,.2,1)}

/* ── TOPBAR ── */
.topbar{background:var(--bg2);border-bottom:1px solid var(--border);padding:0 16px;height:54px;display:flex;align-items:center;gap:10px;position:sticky;top:0;z-index:50;backdrop-filter:blur(10px)}
.menu-btn{width:34px;height:34px;border:none;background:var(--card);color:var(--text2);border-radius:8px;cursor:pointer;display:none;align-items:center;justify-content:center;transition:all .2s;flex-shrink:0}
.menu-btn:hover,.menu-btn:active{background:var(--border);color:var(--text)}
.page-title{font-family:'Syne',sans-serif;font-weight:700;font-size:15px;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.topbar-right{display:flex;align-items:center;gap:6px;margin-left:auto}
.icon-btn{width:34px;height:34px;border:none;background:var(--card);color:var(--text2);border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s;position:relative;flex-shrink:0}
.icon-btn:hover{background:var(--border);color:var(--text)}
.notif-dot{position:absolute;top:7px;right:7px;width:6px;height:6px;background:var(--red);border-radius:50%;border:1.5px solid var(--bg2)}

/* ── CONTENT / PAGE WRAPPER ── */
.content{flex:1;padding:16px}
.page-wrap{max-width:1400px;width:100%;margin:0 auto}

/* ── PAGE HEADER ── */
.page-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px}
.page-header h2{font-family:'Syne',sans-serif;font-size:20px;font-weight:800}
.page-header p{font-size:12px;color:var(--text2);margin-top:2px}
.page-header-actions{display:flex;gap:7px;flex-wrap:wrap;align-items:center}

/* ── CARDS ── */
.card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden}
.card-header{padding:13px 15px 11px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border);flex-wrap:wrap;gap:8px}
.card-title{font-family:'Syne',sans-serif;font-weight:700;font-size:13.5px}
.card-body{padding:14px 15px}

/* ── STAT CARDS ── */
.stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px}
.stat-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:14px;position:relative;overflow:hidden;transition:transform .2s,box-shadow .25s;cursor:default}
.stat-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;border-radius:0}
.stat-card.blue::before{background:linear-gradient(90deg,var(--blue),var(--blue2))}
.stat-card.green::before{background:linear-gradient(90deg,var(--green),#34d399)}
.stat-card.amber::before{background:linear-gradient(90deg,var(--amber),#fbbf24)}
.stat-card.purple::before{background:linear-gradient(90deg,var(--purple),#a78bfa)}
.stat-card:hover{transform:translateY(-3px);box-shadow:0 12px 30px rgba(0,0,0,.35)}
.stat-top{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px}
.stat-icon{width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center}
.stat-icon.blue{background:rgba(37,99,235,.15);color:var(--blue2)}
.stat-icon.green{background:rgba(16,185,129,.15);color:var(--green)}
.stat-icon.amber{background:rgba(245,158,11,.15);color:var(--amber)}
.stat-icon.purple{background:rgba(139,92,246,.15);color:var(--purple)}
.stat-icon svg{width:17px;height:17px}
.stat-value{font-family:'Syne',sans-serif;font-size:22px;font-weight:800;line-height:1;margin-bottom:3px}
.stat-label{font-size:11px;color:var(--text2)}

/* ── TABLES ── */
.table-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch}
table{width:100%;border-collapse:collapse;font-size:13px}
th{background:rgba(30,58,95,.25);color:var(--text2);font-weight:600;font-size:10px;text-transform:uppercase;letter-spacing:.6px;padding:9px 12px;text-align:left;white-space:nowrap;user-select:none}
td{padding:10px 12px;border-bottom:1px solid rgba(30,58,95,.35);white-space:nowrap;transition:background .12s}
tr:last-child td{border-bottom:none}
tbody tr:hover td{background:rgba(37,99,235,.06)}

/* ── BADGES ── */
.badge{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:600;white-space:nowrap}
.badge-green{background:rgba(16,185,129,.15);color:#34d399}
.badge-blue{background:rgba(37,99,235,.15);color:var(--blue3)}
.badge-amber{background:rgba(245,158,11,.15);color:#fbbf24}
.badge-red{background:rgba(239,68,68,.15);color:#f87171}
.badge-gray{background:rgba(148,163,184,.1);color:var(--text2)}
.badge-dot{width:5px;height:5px;border-radius:50%;background:currentColor;flex-shrink:0}

/* ── BUTTONS ── */
.btn{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;border:none;font-family:'DM Sans',sans-serif;transition:all .18s;user-select:none;white-space:nowrap}
.btn:active{transform:scale(.97)}
.btn-primary{background:var(--blue);color:#fff;box-shadow:0 2px 8px rgba(37,99,235,.25)}
.btn-primary:hover{background:#1d4ed8;box-shadow:0 4px 16px rgba(37,99,235,.4)}
.btn-secondary{background:var(--card);color:var(--text2);border:1px solid var(--border)}
.btn-secondary:hover{background:var(--card2);color:var(--text);border-color:rgba(96,165,250,.3)}
.btn-ghost{background:transparent;color:var(--text2);padding:6px 9px}
.btn-ghost:hover{background:var(--card);color:var(--text)}
.btn-danger{background:rgba(239,68,68,.1);color:#f87171;border:1px solid rgba(239,68,68,.2)}
.btn-danger:hover{background:rgba(239,68,68,.2)}
.btn-green{background:rgba(16,185,129,.15);color:var(--green);border:1px solid rgba(16,185,129,.25)}
.btn-green:hover{background:rgba(16,185,129,.25)}
.btn-sm{padding:5px 9px;font-size:11.5px;border-radius:6px}
.btn-sm svg{width:12px;height:12px}
.btn svg{width:14px;height:14px}
.btn:disabled{opacity:.45;cursor:not-allowed;transform:none!important}

/* ── INPUTS ── */
.sw{position:relative}
.sw>svg{position:absolute;left:10px;top:50%;transform:translateY(-50%);width:14px;height:14px;color:var(--text2);pointer-events:none;z-index:1}
.input-field,.search-input,.select-field{
  background:var(--card2);border:1px solid var(--border);color:var(--text);
  border-radius:8px;padding:9px 11px;font-size:13px;width:100%;outline:none;
  font-family:'DM Sans',sans-serif;transition:border-color .2s,box-shadow .2s;
  -webkit-appearance:none;appearance:none;
}
.search-input{padding-left:32px}
.input-field:focus,.search-input:focus,.select-field:focus{border-color:var(--blue2);box-shadow:0 0 0 3px rgba(37,99,235,.12)}
.input-field::placeholder,.search-input::placeholder{color:var(--text2)}
.select-field option{background:var(--card);color:var(--text)}
.input-label{font-size:12px;color:var(--text2);margin-bottom:5px;font-weight:500;display:block}
.input-group{margin-bottom:12px}
.input-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
textarea.input-field{resize:vertical;min-height:70px;line-height:1.5}

/* ── MODAL ── */
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.78);z-index:200;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(5px)}
.modal{background:var(--card);border:1px solid var(--border);border-radius:14px;width:100%;max-width:520px;max-height:92vh;overflow-y:auto;animation:modalIn .25s cubic-bezier(.34,1.56,.64,1)}
@keyframes modalIn{from{opacity:0;transform:scale(.93) translateY(12px)}to{opacity:1;transform:scale(1) translateY(0)}}
.modal-header{padding:15px 17px 12px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;background:var(--card);z-index:1}
.modal-title{font-family:'Syne',sans-serif;font-weight:700;font-size:15px}
.modal-body{padding:15px 17px}
.modal-footer{padding:11px 17px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:7px}

/* ── WHATSAPP PANEL ── */
.wa-status{display:flex;align-items:center;gap:7px;padding:8px 12px;border-radius:8px;font-size:12px;font-weight:600}
.wa-status.connected{background:rgba(16,185,129,.1);color:var(--green);border:1px solid rgba(16,185,129,.2)}
.wa-status.disconnected{background:rgba(239,68,68,.1);color:#f87171;border:1px solid rgba(239,68,68,.2)}
.wa-send-card{background:var(--card2);border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:10px;transition:border-color .2s}
.wa-send-card:hover{border-color:rgba(96,165,250,.3)}
.msg-preview{background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:11px;font-size:12px;color:var(--text2);line-height:1.65;white-space:pre-line;max-height:140px;overflow-y:auto}

/* ── TOGGLE ── */
.toggle{width:40px;height:22px;background:var(--border);border-radius:11px;cursor:pointer;position:relative;transition:background .2s;flex-shrink:0}
.toggle.on{background:var(--blue)}
.toggle::after{content:'';position:absolute;width:16px;height:16px;background:#fff;border-radius:50%;top:3px;left:3px;transition:transform .22s cubic-bezier(.34,1.56,.64,1);box-shadow:0 2px 4px rgba(0,0,0,.3)}
.toggle.on::after{transform:translateX(18px)}

/* ── AGENDA ── */
.cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:3px}
.cal-day-name{text-align:center;font-size:10px;color:var(--text2);font-weight:700;padding:5px 0;text-transform:uppercase;letter-spacing:.5px}
.cal-day{min-height:60px;background:var(--card2);border:1px solid var(--border);border-radius:7px;padding:5px;cursor:pointer;transition:border-color .15s,background .15s;position:relative}
.cal-day:hover{border-color:rgba(96,165,250,.4);background:rgba(37,99,235,.07)}
.cal-day.today{border-color:var(--blue);background:rgba(37,99,235,.1)}
.cal-day.other-month{opacity:.28}
.cal-day-num{font-size:11px;font-weight:700;color:var(--text2);margin-bottom:3px}
.cal-day.today .cal-day-num{color:var(--blue3)}
.cal-event{font-size:8.5px;padding:2px 4px;border-radius:3px;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#fff;font-weight:700}

/* ── CHARTS ── */
.charts-grid{display:grid;grid-template-columns:2fr 1fr;gap:12px;margin-bottom:16px}
.tt{background:var(--card);border:1px solid var(--border);border-radius:8px;padding:9px 13px;font-size:12px}
.tt .tl{color:var(--text2);margin-bottom:2px;font-size:11px}
.tt .tv{font-family:'Syne',sans-serif;font-size:15px;font-weight:800}

/* ── MISC ── */
.equip-dot{width:8px;height:8px;border-radius:50%;display:inline-block;flex-shrink:0}
.equip-dot.ok{background:var(--green);box-shadow:0 0 7px var(--green)}
.equip-dot.atencao{background:var(--amber);box-shadow:0 0 7px var(--amber)}
.equip-dot.critico{background:var(--red);box-shadow:0 0 7px var(--red);animation:pulse 1.5s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
.price-item{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid rgba(30,58,95,.25);transition:background .12s}
.price-item:last-child{border-bottom:none}
.price-item:hover{background:rgba(37,99,235,.05)}
.row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.mt8{margin-top:8px}.mt12{margin-top:12px}.mt16{margin-top:16px}
.mb8{margin-bottom:8px}.mb12{margin-bottom:12px}.mb16{margin-bottom:16px}
.empty{text-align:center;padding:36px 16px;color:var(--text2)}
.empty svg{margin:0 auto 12px;display:block;opacity:.25}
.empty p{font-size:13px;margin-bottom:14px}
.info-box{border-radius:9px;padding:11px 14px;font-size:13px;display:flex;align-items:flex-start;gap:9px;line-height:1.55}
.info-box svg{flex-shrink:0;margin-top:1px}
.info-amber{background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.22);color:var(--amber)}
.info-green{background:rgba(16,185,129,.08);border:1px solid rgba(16,185,129,.22);color:var(--green)}
.info-blue{background:rgba(37,99,235,.08);border:1px solid rgba(37,99,235,.22);color:var(--blue3)}

/* ── LOADING SCREEN ── */
.loading-screen{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(135deg,#0a0f1e 0%,#0f172a 50%,#0c1929 100%);position:fixed;inset:0;z-index:9999;overflow:hidden}
.loading-screen::before{content:'';position:absolute;top:-50%;left:-50%;width:200%;height:200%;background:radial-gradient(circle at 30% 50%,rgba(14,165,233,.08) 0%,transparent 50%);animation:loadOrbit 8s linear infinite;pointer-events:none}
@keyframes loadOrbit{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
.loading-logo{display:flex;align-items:center;gap:16px;margin-bottom:40px;position:relative;overflow:hidden}
.loading-logo-icon{width:64px;height:64px;background:linear-gradient(135deg,#0ea5e9,#2563eb);border-radius:18px;display:flex;align-items:center;justify-content:center;box-shadow:0 0 40px rgba(14,165,233,.4),0 0 80px rgba(37,99,235,.2);flex-shrink:0}
.loading-logo-text{font-family:'Syne',sans-serif;font-size:36px;font-weight:800;background:linear-gradient(135deg,#e0f2fe,#7dd3fc,#0ea5e9);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.loading-shimmer{position:absolute;top:0;left:-100%;width:100%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.1),transparent);animation:shimmer 2.5s ease-in-out infinite;pointer-events:none}
@keyframes shimmer{0%{left:-100%}100%{left:200%}}
.loading-bar-wrap{width:220px;height:3px;background:rgba(30,58,95,.5);border-radius:10px;overflow:hidden;margin-bottom:24px}
.loading-bar{height:100%;background:linear-gradient(90deg,#0ea5e9,#2563eb,#7dd3fc);border-radius:10px;width:0%}
.loading-text{font-size:13px;color:#475569;letter-spacing:.5px;min-height:20px}
.loading-particles{position:absolute;inset:0;overflow:hidden;pointer-events:none}
.loading-particle{position:absolute;width:2px;height:2px;background:#0ea5e9;border-radius:50%;opacity:0}

/* ── LOGIN ── */
.login-page{min-height:100vh;background:linear-gradient(135deg,#0a0f1e 0%,#0f172a 50%,#0c1929 100%);display:flex;align-items:center;justify-content:center;padding:20px;position:relative;overflow:hidden}
.login-page::before{content:'';position:absolute;top:-30%;left:-10%;width:60%;height:60%;background:radial-gradient(circle,rgba(14,165,233,.12) 0%,transparent 70%);pointer-events:none}
.login-page::after{content:'';position:absolute;bottom:-20%;right:-10%;width:50%;height:50%;background:radial-gradient(circle,rgba(37,99,235,.1) 0%,transparent 70%);pointer-events:none}
.login-card{background:var(--card);border:1px solid var(--border);border-radius:20px;padding:36px 30px;width:100%;max-width:420px;position:relative;z-index:1;box-shadow:0 24px 60px rgba(0,0,0,.5),0 0 0 1px rgba(14,165,233,.08)}
.login-logo{display:flex;align-items:center;justify-content:center;gap:14px;margin-bottom:8px}
.login-logo-icon{width:52px;height:52px;background:linear-gradient(135deg,#0ea5e9,#2563eb);border-radius:16px;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 30px rgba(14,165,233,.4)}
.login-title-text{font-family:'Syne',sans-serif;font-size:24px;font-weight:800;background:linear-gradient(135deg,#e0f2fe,#7dd3fc);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.login-sub-text{font-size:10px;color:#0ea5e9;letter-spacing:2px;text-transform:uppercase;font-weight:700}
.login-divider{text-align:center;margin:20px 0 18px;font-size:12px;color:var(--text2)}
.login-divider span{background:var(--card);padding:0 12px;position:relative;z-index:1}
.login-divider::before{content:'';position:absolute;left:30px;right:30px;top:50%;height:1px;background:var(--border)}
.login-error{background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.25);border-radius:10px;padding:10px 14px;font-size:12.5px;color:#f87171;display:flex;align-items:center;gap:8px;margin-bottom:14px}
.login-btn{width:100%;padding:13px;background:linear-gradient(135deg,#0ea5e9,#2563eb);color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif;display:flex;align-items:center;justify-content:center;gap:8px;margin-top:16px;transition:all .25s;box-shadow:0 4px 20px rgba(14,165,233,.3)}
.login-btn:hover:not(:disabled){box-shadow:0 8px 30px rgba(14,165,233,.5);transform:translateY(-1px)}
.login-btn:active:not(:disabled){transform:scale(.98)}
.login-btn:disabled{opacity:.6;cursor:not-allowed;transform:none}
.login-link{color:#0ea5e9;font-size:12.5px;cursor:pointer;text-align:center;margin-top:16px;opacity:.7;transition:opacity .2s}
.login-link:hover{opacity:1;text-decoration:underline}

/* ── TOASTS ── */
.toast-wrap{position:fixed;top:14px;right:14px;z-index:1000;display:flex;flex-direction:column;gap:7px;pointer-events:none;max-width:320px;width:calc(100vw - 28px)}
.toast{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:11px 14px;display:flex;align-items:center;gap:9px;font-size:13px;font-weight:500;animation:toastIn .28s cubic-bezier(.34,1.56,.64,1);box-shadow:0 8px 28px rgba(0,0,0,.45);pointer-events:all}
.toast.success{border-left:3px solid var(--green)}
.toast.error{border-left:3px solid var(--red)}
.toast.info{border-left:3px solid var(--blue2)}
@keyframes toastIn{from{opacity:0;transform:translateX(20px) scale(.95)}to{opacity:1;transform:translateX(0) scale(1)}}
@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}

/* ── SCROLLBAR ── */
::-webkit-scrollbar{width:4px;height:4px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--border);border-radius:10px}

/* ═══════════ RESPONSIVO ═══════════ */
@media(max-width:900px){
  .charts-grid{grid-template-columns:1fr}
  .grid3{grid-template-columns:1fr 1fr}
}
@media(max-width:768px){
  :root{--sw:0px}
  .main{margin-left:0!important}
  .sidebar{width:270px;box-shadow:6px 0 30px rgba(0,0,0,.5)}
  .menu-btn{display:flex!important}
  .stats-grid{grid-template-columns:1fr 1fr}
  .grid2{grid-template-columns:1fr}
  .grid3{grid-template-columns:1fr 1fr}
  .content{padding:12px 10px}
  .input-row{grid-template-columns:1fr}
  td,th{padding:8px 9px;font-size:12px}
  .stat-value{font-size:20px}
  .charts-grid{grid-template-columns:1fr}
  .page-header{margin-bottom:12px}
  .page-header h2{font-size:17px}
}
@media(max-width:480px){
  .stats-grid{grid-template-columns:1fr 1fr;gap:7px}
  .stat-card{padding:11px}
  .stat-value{font-size:18px}
  .grid3{grid-template-columns:1fr 1fr}
  .modal-overlay{padding:0;align-items:flex-end}
  .modal{border-radius:16px 16px 0 0;max-height:94vh}
  .page-header-actions .btn span{display:none}
  .topbar{padding:0 10px}
}
@media(max-width:360px){
  .stats-grid{grid-template-columns:1fr}
  .grid3{grid-template-columns:1fr}
  .input-row{grid-template-columns:1fr}
}
`;

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const fmtMoney = v => `R$ ${Number(v||0).toLocaleString("pt-BR",{minimumFractionDigits:2})}`;
const fmtDate  = d => d ? new Date(d+"T12:00:00").toLocaleDateString("pt-BR") : "—";
const initials = n => n?.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase()||"?";
const STATUS_MAP = {
  ativo:["badge-green","Ativo"],concluido:["badge-green","Concluído"],agendado:["badge-blue","Agendado"],
  pendente:["badge-amber","Pendente"],inativo:["badge-gray","Inativo"],
  ok:["badge-green","OK"],atencao:["badge-amber","Atenção"],critico:["badge-red","Crítico"],
};
const Badge = ({s}) => { const [c,l]=STATUS_MAP[s]||["badge-gray",s]; return <span className={`badge ${c}`}><span className="badge-dot"/>{l}</span>; };
const Tip = ({active,payload,prefix=""}) => {
  if(!active||!payload?.length) return null;
  return <div className="tt"><div className="tl">{payload[0].name}</div><div className="tv">{prefix}{Number(payload[0].value).toLocaleString("pt-BR")}</div></div>;
};

// ─── GSAP PAGE TRANSITION ─────────────────────────────────────────────────────
function usePageTransition(page) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    // Mata qualquer animação anterior
    gsap.killTweensOf(ref.current);
    // Anima entrada da página
    gsap.fromTo(ref.current,
      { opacity: 0, y: 18, scale: 0.99 },
      { opacity: 1, y: 0, scale: 1, duration: 0.32, ease: "power3.out", clearProps: "scale" }
    );
    // Anima cards filhos com stagger
    const cards = ref.current.querySelectorAll(".stat-card, .card, .auto-card, .wa-send-card, .price-item");
    if (cards.length) {
      gsap.fromTo(cards,
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.28, stagger: 0.045, ease: "power2.out", delay: 0.08, clearProps: "all" }
      );
    }
  }, [page]);
  return ref;
}

// ─── TOAST ────────────────────────────────────────────────────────────────────
function Toasts({list}) {
  return (
    <div className="toast-wrap">
      {list.map(t=>(
        <div key={t.id} className={`toast ${t.type}`}>
          {t.type==="success"?<CheckCircle size={15} color="#10b981"/>:t.type==="error"?<AlertCircle size={15} color="#ef4444"/>:<Bell size={15} color="#3b82f6"/>}
          <span style={{flex:1}}>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

// ─── MODAL ────────────────────────────────────────────────────────────────────
function Modal({title,onClose,onSave,children,saveLabel="Salvar",saving=false}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={15}/></button>
        </div>
        <div className="modal-body">{children}</div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancelar</button>
          <button className="btn btn-primary" onClick={onSave} disabled={saving}>
            {saving ? <RefreshCw size={13} style={{animation:"spin .7s linear infinite"}}/> : <Save size={13}/>}
            {saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── LOADING SCREEN ──────────────────────────────────────────────────────────
function LoadingScreen({onFinish}) {
  const screenRef=useRef(null);
  const logoRef=useRef(null);
  const barRef=useRef(null);
  const textRef=useRef(null);

  useEffect(()=>{
    const tl=gsap.timeline({onComplete:()=>{
      gsap.to(screenRef.current,{opacity:0,duration:.4,ease:"power2.in",onComplete:onFinish});
    }});
    // Logo entrada
    tl.fromTo(logoRef.current,{opacity:0,y:30,scale:.85},{opacity:1,y:0,scale:1,duration:.7,ease:"back.out(1.4)"});
    // Barra de carregamento
    tl.to(barRef.current,{width:"100%",duration:2.2,ease:"power1.inOut"},"-=.2");
    // Textos
    const textos=["Inicializando FrostERP...","Carregando módulos...","Preparando seu ambiente...","Tudo pronto!"];
    textos.forEach((txt,i)=>{
      tl.call(()=>{if(textRef.current)textRef.current.textContent=txt;},null,0.5+i*0.55);
    });
    // Partículas
    const particles=screenRef.current?.querySelectorAll(".loading-particle");
    if(particles?.length){
      particles.forEach((p,i)=>{
        gsap.set(p,{x:Math.random()*window.innerWidth,y:Math.random()*window.innerHeight});
        gsap.to(p,{opacity:Math.random()*.5+.2,y:"-="+Math.random()*200,duration:Math.random()*3+2,repeat:-1,yoyo:true,delay:Math.random()*2,ease:"sine.inOut"});
      });
    }
    return ()=>tl.kill();
  },[onFinish]);

  return (
    <div className="loading-screen" ref={screenRef}>
      <div className="loading-particles">
        {Array.from({length:20}).map((_,i)=><div key={i} className="loading-particle"/>)}
      </div>
      <div className="loading-logo" ref={logoRef}>
        <div className="loading-logo-icon"><Snowflake size={30} color="#fff"/></div>
        <div className="loading-logo-text">FrostERP</div>
        <div className="loading-shimmer"/>
      </div>
      <div className="loading-bar-wrap"><div className="loading-bar" ref={barRef}/></div>
      <div className="loading-text" ref={textRef}>Inicializando FrostERP...</div>
    </div>
  );
}

// ─── FIELD HELPERS ────────────────────────────────────────────────────────────
const Field = ({lbl,field,form,setForm,type="text",ph="",required=false}) => (
  <div className="input-group">
    <label className="input-label">{lbl}{required&&<span style={{color:"var(--red)",marginLeft:3}}>*</span>}</label>
    <input className="input-field" type={type} placeholder={ph}
      value={form[field]||""}
      onChange={e=>setForm(p=>({...p,[field]:e.target.value}))}/>
  </div>
);

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function Login({onLogin,empresas,usuarios}) {
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [form,setForm]=useState({codigo:"",email:"",senha:""});
  const cardRef=useRef(null);

  useEffect(()=>{
    if(!cardRef.current) return;
    gsap.fromTo(cardRef.current,
      {opacity:0,y:40,scale:.93},
      {opacity:1,y:0,scale:1,duration:.6,ease:"back.out(1.5)"}
    );
  },[]);

  const handleLogin=()=>{
    setError("");
    if(!form.codigo.trim()){setError("Informe o código da empresa.");return;}
    if(!form.email.trim()){setError("Informe seu e-mail.");return;}
    if(!form.senha.trim()){setError("Informe sua senha.");return;}

    const emp=empresas.find(e=>e.codigo.toLowerCase()===form.codigo.trim().toLowerCase());
    if(!emp){setError("Empresa não encontrada. Verifique o código.");return;}

    const user=usuarios.find(u=>Number(u.empresaId)===Number(emp.id)&&u.email.toLowerCase()===form.email.trim().toLowerCase());
    if(!user){setError("Usuário não encontrado nesta empresa.");return;}
    if(user.senha.trim()!==form.senha.trim()){setError("Usuário ou senha inválidos.");return;}
    if(user.status!=="ativo"){setError("Usuário desativado. Contate o administrador.");return;}

    setLoading(true);
    gsap.to(cardRef.current,{opacity:0,y:-20,scale:.97,duration:.35,ease:"power2.in",onComplete:()=>{
      setLoading(false);
      onLogin(user,emp);
    }});
  };

  const handleKey=e=>{if(e.key==="Enter")handleLogin()};

  return (
    <div className="login-page">
      <div className="login-card" ref={cardRef}>
        <div className="login-logo">
          <div className="login-logo-icon"><Snowflake size={26} color="#fff"/></div>
          <div><div className="login-title-text">FrostERP</div><div className="login-sub-text">Sistema de Gestão</div></div>
        </div>

        <div style={{position:"relative",textAlign:"center",margin:"18px 0 20px"}}>
          <div style={{fontSize:15,fontWeight:600,color:"var(--text)"}}>Acessar Sistema</div>
          <div style={{fontSize:11.5,color:"var(--text2)",marginTop:4}}>Entre com suas credenciais</div>
          <div style={{position:"absolute",left:0,right:0,bottom:-10,height:1,background:"var(--border)"}}/>
        </div>

        {error&&<div className="login-error"><AlertCircle size={14}/>{error}</div>}

        <div className="input-group">
          <label className="input-label">Código da Empresa</label>
          <input className="input-field" placeholder="Ex: MINAS01" value={form.codigo}
            onChange={e=>setForm(p=>({...p,codigo:e.target.value.toUpperCase()}))} onKeyDown={handleKey}/>
        </div>
        <div className="input-group">
          <label className="input-label">E-mail</label>
          <input className="input-field" type="email" placeholder="seu@email.com.br" value={form.email}
            onChange={e=>setForm(p=>({...p,email:e.target.value}))} onKeyDown={handleKey}/>
        </div>
        <div className="input-group">
          <label className="input-label">Senha</label>
          <input className="input-field" type="password" placeholder="••••••" value={form.senha}
            onChange={e=>setForm(p=>({...p,senha:e.target.value}))} onKeyDown={handleKey}/>
        </div>
        <button className="login-btn" onClick={handleLogin} disabled={loading}>
          {loading
            ? <RefreshCw size={15} style={{animation:"spin .8s linear infinite"}}/>
            : <><LogOut size={15}/> Entrar</>
          }
        </button>
        <div className="login-link">Esqueci minha senha</div>

        <div style={{marginTop:20,background:"var(--card2)",border:"1px solid var(--border)",borderRadius:10,padding:12}}>
          <div style={{fontSize:10,color:"var(--text2)",fontWeight:600,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Credenciais de teste</div>
          <div style={{fontSize:11.5,color:"var(--text2)",lineHeight:1.7}}>
            <div><b style={{color:"var(--text)"}}>Empresa:</b> MINAS01</div>
            <div><b style={{color:"var(--text)"}}>E-mail:</b> admin@minasrefrig.com.br</div>
            <div><b style={{color:"var(--text)"}}>Senha:</b> 123456</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({clientes,servicos,addToast}) {
  const ref=usePageTransition("dashboard");
  const concl=servicos.filter(s=>s.status==="concluido");
  const fat=concl.reduce((a,s)=>a+Number(s.valor||0),0);
  const hoje=new Date().toISOString().slice(0,10);
  const MESES=["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  const fatMes=Array.from({length:6},(_,i)=>{
    const d=new Date();d.setMonth(d.getMonth()-5+i);
    const y=d.getFullYear(),m=d.getMonth();
    const v=concl.filter(s=>{const sd=new Date(s.data);return sd.getFullYear()===y&&sd.getMonth()===m}).reduce((a,s)=>a+Number(s.valor||0),0);
    return {mes:MESES[m],valor:v};
  });
  const tiposMap={};
  servicos.forEach(s=>{tiposMap[s.tipo]=(tiposMap[s.tipo]||0)+1});
  const pizza=Object.entries(tiposMap).slice(0,5).map(([name,value],i)=>({name,value,color:["#2563eb","#10b981","#ef4444","#f59e0b","#8b5cf6"][i]}));

  return (
    <div ref={ref}>
      <div className="page-header">
        <div><h2>Dashboard</h2><p>{new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</p></div>
        <div className="page-header-actions">
          <button className="btn btn-secondary btn-sm" onClick={()=>addToast("Exporte um relatório na aba Relatórios","info")}><FileText size={13}/><span>Relatório</span></button>
        </div>
      </div>
      <div className="stats-grid">
        {[
          {l:"Clientes Ativos",v:clientes.filter(c=>c.status==="ativo").length,i:<Users size={17}/>,c:"blue"},
          {l:"OS Concluídas",v:concl.length,i:<Wrench size={17}/>,c:"green"},
          {l:"Faturamento Total",v:fmtMoney(fat),i:<DollarSign size={17}/>,c:"amber"},
          {l:"Serviços Hoje",v:servicos.filter(s=>s.data===hoje).length,i:<Calendar size={17}/>,c:"purple"},
        ].map((s,i)=>(
          <div key={i} className={`stat-card ${s.c}`}>
            <div className="stat-top"><div className={`stat-icon ${s.c}`}>{s.i}</div></div>
            <div className="stat-value">{s.v}</div>
            <div className="stat-label">{s.l}</div>
          </div>
        ))}
      </div>
      <div className="charts-grid">
        <div className="card">
          <div className="card-header"><span className="card-title">Faturamento por Mês</span></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={190}>
              <AreaChart data={fatMes}>
                <defs><linearGradient id="gF" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2563eb" stopOpacity={.3}/><stop offset="95%" stopColor="#2563eb" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" strokeOpacity={.5}/>
                <XAxis dataKey="mes" tick={{fill:"#94a3b8",fontSize:10}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:"#94a3b8",fontSize:9}} axisLine={false} tickLine={false} tickFormatter={v=>`R$${(v/1000).toFixed(0)}k`}/>
                <Tooltip content={<Tip prefix="R$ "/>}/>
                <Area type="monotone" dataKey="valor" stroke="#3b82f6" strokeWidth={2.5} fill="url(#gF)" name="Faturamento"/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><span className="card-title">Tipos de Serviço</span></div>
          <div className="card-body">
            {pizza.length===0
              ? <div className="empty"><p>Sem dados</p></div>
              : <><ResponsiveContainer width="100%" height={130}><PieChart><Pie data={pizza} cx="50%" cy="50%" innerRadius={36} outerRadius={58} paddingAngle={3} dataKey="value">{pizza.map((e,i)=><Cell key={i} fill={e.color}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer>
                <div style={{display:"flex",flexWrap:"wrap",gap:"4px 10px",marginTop:6}}>
                  {pizza.map((t,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:"var(--text2)"}}><div style={{width:7,height:7,borderRadius:2,background:t.color,flexShrink:0}}/>{t.name}<b style={{color:"var(--text)"}}>{t.value}</b></div>)}
                </div></>
            }
          </div>
        </div>
      </div>
      <div className="card">
        <div className="card-header"><span className="card-title">Últimos Serviços</span></div>
        <div className="table-wrap">
          <table><thead><tr><th>Cliente</th><th>Tipo</th><th>Técnico</th><th>Data</th><th>Valor</th><th>Status</th></tr></thead>
          <tbody>{[...servicos].reverse().slice(0,6).map(s=>{const c=clientes.find(x=>x.id===s.clienteId);return(
            <tr key={s.id}><td style={{fontWeight:600}}>{c?.nome||"—"}</td><td><span className="badge badge-blue">{s.tipo}</span></td><td style={{color:"var(--text2)",fontSize:12}}>{s.tecnico||"—"}</td><td style={{color:"var(--text2)",fontSize:12}}>{fmtDate(s.data)}</td><td style={{fontWeight:700,color:"var(--green)"}}>{fmtMoney(s.valor)}</td><td><Badge s={s.status}/></td></tr>
          )})}</tbody></table>
        </div>
      </div>
    </div>
  );
}

// ─── CLIENTES ─────────────────────────────────────────────────────────────────
function Clientes({clientes,setClientes,equipamentos,addToast}) {
  const ref=usePageTransition("clientes");
  const [search,setSearch]=useState("");
  const [modal,setModal]=useState(false);
  const [editing,setEditing]=useState(null);
  const EMPTY={nome:"",telefone:"",whatsapp:"",email:"",endereco:"",cidade:"",estado:"MG",status:"ativo"};
  const [form,setForm]=useState(EMPTY);

  const filtered=clientes.filter(c=>c.nome.toLowerCase().includes(search.toLowerCase())||(c.cidade||"").toLowerCase().includes(search.toLowerCase()));
  const openNew=()=>{setEditing(null);setForm(EMPTY);setModal(true)};
  const openEdit=c=>{setEditing(c.id);setForm({...c});setModal(true)};
  const save=()=>{
    if(!form.nome.trim()){addToast("Nome é obrigatório","error");return}
    if(editing) setClientes(p=>p.map(c=>c.id===editing?{...form,id:editing}:c));
    else setClientes(p=>[...p,{...form,id:newId()}]);
    addToast(editing?"Cliente atualizado!":"Cliente cadastrado!","success");
    setModal(false);
  };
  const del=id=>{if(!confirm("Excluir este cliente?"))return;setClientes(p=>p.filter(c=>c.id!==id));addToast("Cliente excluído","info")};

  return (
    <div ref={ref}>
      <div className="page-header">
        <div><h2>Clientes</h2><p>{clientes.length} cadastrados</p></div>
        <button className="btn btn-primary" onClick={openNew}><Plus size={13}/>Novo Cliente</button>
      </div>
      <div className="card">
        <div className="card-header">
          <div className="sw" style={{flex:1,maxWidth:300,position:"relative"}}>
            <Search size={14} style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"var(--text2)",pointerEvents:"none"}}/>
            <input className="search-input" placeholder="Buscar nome ou cidade..." value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
        </div>
        {filtered.length===0
          ? <div className="empty"><Users size={36}/><p>Nenhum cliente encontrado.</p><button className="btn btn-primary btn-sm" onClick={openNew}><Plus size={12}/>Cadastrar</button></div>
          : <div className="table-wrap"><table>
              <thead><tr><th>Cliente</th><th>Contato</th><th>Cidade</th><th>Equip.</th><th>Status</th><th>Ações</th></tr></thead>
              <tbody>{filtered.map(c=>{
                const eq=equipamentos.filter(e=>e.clienteId===c.id).length;
                return <tr key={c.id}>
                  <td><div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{width:30,height:30,background:"linear-gradient(135deg,#2563eb,#7c3aed)",borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:11,fontWeight:800,flexShrink:0}}>{initials(c.nome)}</div>
                    <div><div style={{fontWeight:600,fontSize:13}}>{c.nome}</div><div style={{fontSize:10.5,color:"var(--text2)"}}>{c.email}</div></div>
                  </div></td>
                  <td style={{fontSize:12,color:"var(--text2)"}}>{c.telefone}</td>
                  <td style={{fontSize:12}}>{c.cidade}</td>
                  <td><span className="badge badge-blue"><Package size={10}/>{eq}</span></td>
                  <td><Badge s={c.status}/></td>
                  <td><div className="row" style={{gap:3}}>
                    <button className="btn btn-ghost btn-sm" onClick={()=>openEdit(c)}><Edit2 size={12}/></button>
                    <button className="btn btn-danger btn-sm" onClick={()=>del(c.id)}><Trash2 size={12}/></button>
                  </div></td>
                </tr>;
              })}</tbody>
            </table></div>
        }
      </div>
      {modal&&<Modal title={editing?"Editar Cliente":"Novo Cliente"} onClose={()=>setModal(false)} onSave={save}>
        <Field lbl="Nome completo" field="nome" form={form} setForm={setForm} ph="Ex: Empresa LTDA" required/>
        <div className="input-row"><Field lbl="Telefone" field="telefone" form={form} setForm={setForm} ph="(31) 99999-9999"/><Field lbl="WhatsApp" field="whatsapp" form={form} setForm={setForm} ph="(31) 99999-9999"/></div>
        <Field lbl="E-mail" field="email" form={form} setForm={setForm} type="email" ph="email@empresa.com"/>
        <Field lbl="Endereço" field="endereco" form={form} setForm={setForm} ph="Rua, número, bairro"/>
        <div className="input-row"><Field lbl="Cidade" field="cidade" form={form} setForm={setForm} ph="Belo Horizonte"/><Field lbl="Estado" field="estado" form={form} setForm={setForm} ph="MG"/></div>
        <div className="input-group">
          <label className="input-label">Status</label>
          <select className="select-field" value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))}>
            <option value="ativo">Ativo</option><option value="pendente">Pendente</option><option value="inativo">Inativo</option>
          </select>
        </div>
      </Modal>}
    </div>
  );
}

// ─── EQUIPAMENTOS ─────────────────────────────────────────────────────────────
function Equipamentos({equipamentos,setEquipamentos,clientes,addToast}) {
  const ref=usePageTransition("equip");
  const [search,setSearch]=useState("");
  const [modal,setModal]=useState(false);
  const [editing,setEditing]=useState(null);
  const EMPTY={clienteId:"",tipo:"Split",marca:"",modelo:"",potencia:"",dataInstalacao:"",ultimaManutencao:"",status:"ok"};
  const [form,setForm]=useState(EMPTY);

  const filtered=equipamentos.filter(e=>{const c=clientes.find(x=>x.id===e.clienteId);const q=search.toLowerCase();return e.tipo.toLowerCase().includes(q)||e.marca.toLowerCase().includes(q)||(c?.nome||"").toLowerCase().includes(q)});
  const openNew=()=>{setEditing(null);setForm(EMPTY);setModal(true)};
  const openEdit=e=>{setEditing(e.id);setForm({...e,clienteId:String(e.clienteId)});setModal(true)};
  const save=()=>{
    if(!form.clienteId){addToast("Selecione um cliente","error");return}
    if(!form.tipo.trim()){addToast("Tipo é obrigatório","error");return}
    const data={...form,clienteId:Number(form.clienteId)};
    if(editing) setEquipamentos(p=>p.map(e=>e.id===editing?{...data,id:editing}:e));
    else setEquipamentos(p=>[...p,{...data,id:newId()}]);
    addToast(editing?"Equipamento atualizado!":"Equipamento cadastrado!","success");
    setModal(false);
  };
  const del=id=>{if(!confirm("Excluir equipamento?"))return;setEquipamentos(p=>p.filter(e=>e.id!==id));addToast("Excluído","info")};

  return (
    <div ref={ref}>
      <div className="page-header">
        <div><h2>Equipamentos</h2><p>{equipamentos.length} registrados</p></div>
        <button className="btn btn-primary" onClick={openNew}><Plus size={13}/>Novo Equipamento</button>
      </div>
      <div className="card">
        <div className="card-header">
          <div style={{position:"relative",flex:1,maxWidth:300}}>
            <Search size={14} style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"var(--text2)",pointerEvents:"none"}}/>
            <input className="search-input" placeholder="Buscar tipo, marca ou cliente..." value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
        </div>
        {filtered.length===0
          ? <div className="empty"><Thermometer size={36}/><p>Nenhum equipamento.</p><button className="btn btn-primary btn-sm" onClick={openNew}><Plus size={12}/>Cadastrar</button></div>
          : <div className="table-wrap"><table>
              <thead><tr><th>Tipo</th><th>Cliente</th><th>Marca/Modelo</th><th>Potência</th><th>Instalação</th><th>Ult. Manut.</th><th>Status</th><th>Ações</th></tr></thead>
              <tbody>{filtered.map(e=>{const c=clientes.find(x=>x.id===e.clienteId);return(
                <tr key={e.id}>
                  <td><div style={{display:"flex",alignItems:"center",gap:7}}>
                    <div style={{width:27,height:27,background:"rgba(37,99,235,.12)",borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center"}}>{e.tipo==="Split"||e.tipo==="VRF"?<Wind size={13} color="#3b82f6"/>:<Thermometer size={13} color="#3b82f6"/>}</div>
                    <span style={{fontWeight:600,fontSize:13}}>{e.tipo}</span>
                  </div></td>
                  <td style={{fontSize:12}}>{c?.nome||"—"}</td>
                  <td style={{fontSize:12}}>{e.marca} <span style={{color:"var(--text2)"}}>{e.modelo}</span></td>
                  <td style={{fontSize:12,color:"var(--text2)"}}>{e.potencia}</td>
                  <td style={{fontSize:12,color:"var(--text2)"}}>{fmtDate(e.dataInstalacao)}</td>
                  <td style={{fontSize:12,color:"var(--text2)"}}>{fmtDate(e.ultimaManutencao)}</td>
                  <td><div style={{display:"flex",alignItems:"center",gap:5}}><span className={`equip-dot ${e.status}`}/><Badge s={e.status}/></div></td>
                  <td><div className="row" style={{gap:3}}>
                    <button className="btn btn-ghost btn-sm" onClick={()=>openEdit(e)}><Edit2 size={12}/></button>
                    <button className="btn btn-danger btn-sm" onClick={()=>del(e.id)}><Trash2 size={12}/></button>
                  </div></td>
                </tr>
              )})}</tbody>
            </table></div>
        }
      </div>
      {modal&&<Modal title={editing?"Editar Equipamento":"Novo Equipamento"} onClose={()=>setModal(false)} onSave={save}>
        <div className="input-group">
          <label className="input-label">Cliente <span style={{color:"var(--red)"}}>*</span></label>
          <select className="select-field" value={form.clienteId} onChange={e=>setForm(p=>({...p,clienteId:e.target.value}))}>
            <option value="">Selecione o cliente...</option>
            {clientes.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
        <div className="input-row">
          <div className="input-group">
            <label className="input-label">Tipo <span style={{color:"var(--red)"}}>*</span></label>
            <select className="select-field" value={form.tipo} onChange={e=>setForm(p=>({...p,tipo:e.target.value}))}>
              {["Split","VRF","Câmara Fria","Freezer","Chiller","Fancoil","Outro"].map(t=><option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="input-group">
            <label className="input-label">Status</label>
            <select className="select-field" value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))}>
              <option value="ok">OK</option><option value="atencao">Atenção</option><option value="critico">Crítico</option>
            </select>
          </div>
        </div>
        <div className="input-row">
          <Field lbl="Marca" field="marca" form={form} setForm={setForm} ph="Ex: Midea"/>
          <Field lbl="Modelo" field="modelo" form={form} setForm={setForm} ph="Ex: Inverter 24k"/>
        </div>
        <Field lbl="Potência" field="potencia" form={form} setForm={setForm} ph="Ex: 24000 BTU"/>
        <div className="input-row">
          <Field lbl="Data Instalação" field="dataInstalacao" form={form} setForm={setForm} type="date"/>
          <Field lbl="Última Manutenção" field="ultimaManutencao" form={form} setForm={setForm} type="date"/>
        </div>
      </Modal>}
    </div>
  );
}

// ─── SERVIÇOS ─────────────────────────────────────────────────────────────────
function Servicos({servicos,setServicos,clientes,equipamentos,addToast}) {
  const ref=usePageTransition("servicos");
  const [filter,setFilter]=useState("todos");
  const [modal,setModal]=useState(false);
  const [editing,setEditing]=useState(null);
  const [tecnicos]=useStorage("minas_tecnicos",[{id:1,nome:"Carlos Silva"},{id:2,nome:"André Souza"},{id:3,nome:"Pedro Lima"}]);
  const EMPTY={clienteId:"",equipamentoId:"",tipo:"Manutenção Preventiva",tecnico:"",valor:"",data:new Date().toISOString().slice(0,10),status:"agendado",obs:""};
  const [form,setForm]=useState(EMPTY);

  const list=filter==="todos"?servicos:servicos.filter(s=>s.status===filter);
  const equipsCliente=equipamentos.filter(e=>e.clienteId===Number(form.clienteId));

  const openNew=()=>{setEditing(null);setForm({...EMPTY,data:new Date().toISOString().slice(0,10)});setModal(true)};
  const openEdit=s=>{setEditing(s.id);setForm({...s,clienteId:String(s.clienteId),equipamentoId:String(s.equipamentoId||"")});setModal(true)};
  const save=()=>{
    if(!form.clienteId){addToast("Selecione um cliente","error");return}
    if(!form.tipo){addToast("Selecione o tipo de serviço","error");return}
    if(!form.data){addToast("Informe a data","error");return}
    const data={...form,clienteId:Number(form.clienteId),equipamentoId:Number(form.equipamentoId)||0};
    if(editing) setServicos(p=>p.map(s=>s.id===editing?{...data,id:editing}:s));
    else setServicos(p=>[...p,{...data,id:newId()}]);
    addToast(editing?"OS atualizada com sucesso!":"OS criada com sucesso!","success");
    setModal(false);
  };
  const del=id=>{if(!confirm("Excluir esta OS?"))return;setServicos(p=>p.filter(s=>s.id!==id));addToast("OS excluída","info")};
  const total=list.reduce((a,s)=>a+Number(s.valor||0),0);

  return (
    <div ref={ref}>
      <div className="page-header">
        <div><h2>Serviços</h2><p>Ordens de serviço</p></div>
        <button className="btn btn-primary" onClick={openNew}><Plus size={13}/>Nova OS</button>
      </div>
      <div className="card">
        <div className="card-header">
          <div className="row" style={{gap:5,flexWrap:"wrap"}}>
            {["todos","agendado","pendente","concluido"].map(o=>(
              <button key={o} className={`btn btn-sm ${filter===o?"btn-primary":"btn-secondary"}`} onClick={()=>setFilter(o)}>
                {o==="todos"?"Todos":o.charAt(0).toUpperCase()+o.slice(1)}
              </button>
            ))}
          </div>
        </div>
        {list.length===0
          ? <div className="empty"><Wrench size={36}/><p>Nenhuma OS encontrada.</p><button className="btn btn-primary btn-sm" onClick={openNew}><Plus size={12}/>Criar OS</button></div>
          : <>
              <div className="table-wrap"><table>
                <thead><tr><th>#</th><th>Cliente</th><th>Tipo</th><th>Técnico</th><th>Data</th><th>Valor</th><th>Status</th><th>Ações</th></tr></thead>
                <tbody>{list.map((s,i)=>{const c=clientes.find(x=>x.id===s.clienteId);return(
                  <tr key={s.id}>
                    <td style={{color:"var(--text2)",fontSize:11}}>{String(i+1).padStart(3,"0")}</td>
                    <td style={{fontWeight:600,fontSize:13}}>{c?.nome||"—"}</td>
                    <td><span className="badge badge-blue">{s.tipo}</span></td>
                    <td style={{fontSize:12,color:"var(--text2)"}}>{s.tecnico||"—"}</td>
                    <td style={{fontSize:12,color:"var(--text2)"}}>{fmtDate(s.data)}</td>
                    <td style={{fontWeight:700,color:"var(--green)"}}>{fmtMoney(s.valor)}</td>
                    <td><Badge s={s.status}/></td>
                    <td><div className="row" style={{gap:3}}>
                      <button className="btn btn-ghost btn-sm" onClick={()=>openEdit(s)}><Edit2 size={12}/></button>
                      <button className="btn btn-danger btn-sm" onClick={()=>del(s.id)}><Trash2 size={12}/></button>
                    </div></td>
                  </tr>
                )})}</tbody>
              </table></div>
              <div style={{padding:"10px 14px",borderTop:"1px solid var(--border)",display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:6}}>
                <span style={{fontSize:12,color:"var(--text2)"}}>{list.length} registros</span>
                <span style={{fontSize:13,fontWeight:700,color:"var(--green)"}}>Total: {fmtMoney(total)}</span>
              </div>
            </>
        }
      </div>
      {modal&&<Modal title={editing?"Editar OS":"Nova Ordem de Serviço"} onClose={()=>setModal(false)} onSave={save}>
        <div className="input-group">
          <label className="input-label">Cliente <span style={{color:"var(--red)"}}>*</span></label>
          <select className="select-field" value={form.clienteId} onChange={e=>setForm(p=>({...p,clienteId:e.target.value,equipamentoId:""}))}>
            <option value="">Selecione o cliente...</option>
            {clientes.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
        <div className="input-group">
          <label className="input-label">Equipamento</label>
          <select className="select-field" value={form.equipamentoId} onChange={e=>setForm(p=>({...p,equipamentoId:e.target.value}))}>
            <option value="">Nenhum / Geral</option>
            {equipsCliente.map(e=><option key={e.id} value={e.id}>{e.tipo} — {e.marca} {e.modelo}</option>)}
          </select>
        </div>
        <div className="input-row">
          <div className="input-group">
            <label className="input-label">Tipo de Serviço <span style={{color:"var(--red)"}}>*</span></label>
            <select className="select-field" value={form.tipo} onChange={e=>setForm(p=>({...p,tipo:e.target.value}))}>
              {["Manutenção Preventiva","Manutenção Corretiva","Limpeza Completa","Recarga de Gás","Instalação","Visita Técnica","Outro"].map(t=><option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="input-group">
            <label className="input-label">Técnico</label>
            <select className="select-field" value={form.tecnico} onChange={e=>setForm(p=>({...p,tecnico:e.target.value}))}>
              <option value="">Selecione...</option>
              {tecnicos.map(t=><option key={t.id}>{t.nome}</option>)}
            </select>
          </div>
        </div>
        <div className="input-row">
          <div className="input-group">
            <label className="input-label">Valor (R$)</label>
            <input className="input-field" type="number" step="0.01" min="0" placeholder="0,00" value={form.valor} onChange={e=>setForm(p=>({...p,valor:e.target.value}))}/>
          </div>
          <div className="input-group">
            <label className="input-label">Data <span style={{color:"var(--red)"}}>*</span></label>
            <input className="input-field" type="date" value={form.data} onChange={e=>setForm(p=>({...p,data:e.target.value}))}/>
          </div>
        </div>
        <div className="input-group">
          <label className="input-label">Status</label>
          <select className="select-field" value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))}>
            <option value="agendado">Agendado</option><option value="pendente">Pendente</option><option value="concluido">Concluído</option>
          </select>
        </div>
        <div className="input-group">
          <label className="input-label">Observações</label>
          <textarea className="input-field" rows={3} placeholder="Detalhes, peças usadas, próximos passos..." value={form.obs} onChange={e=>setForm(p=>({...p,obs:e.target.value}))}/>
        </div>
      </Modal>}
    </div>
  );
}

// ─── AGENDA ───────────────────────────────────────────────────────────────────
function Agenda({servicos,clientes}) {
  const ref=usePageTransition("agenda");
  const [cur,setCur]=useState(new Date());
  const y=cur.getFullYear(),m=cur.getMonth();
  const MESES=["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  const DIAS=["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
  const first=new Date(y,m,1).getDay(),total=new Date(y,m+1,0).getDate(),prev=new Date(y,m,0).getDate();
  const cells=[];
  for(let i=0;i<first;i++) cells.push({day:prev-first+i+1,cur:false});
  for(let i=1;i<=total;i++) cells.push({day:i,cur:true});
  while(cells.length%7!==0) cells.push({day:cells.length-total-first+1,cur:false});
  const today=new Date();
  const COLORS=["#2563eb","#10b981","#ef4444","#f59e0b","#8b5cf6","#06b6d4"];
  const getSvcs=d=>{const ds=`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;return servicos.filter(s=>s.data===ds)};
  const mesSvcs=servicos.filter(s=>{const sd=new Date(s.data);return sd.getFullYear()===y&&sd.getMonth()===m}).sort((a,b)=>a.data.localeCompare(b.data));

  return (
    <div ref={ref}>
      <div className="page-header"><div><h2>Agenda</h2><p>Calendário de serviços</p></div></div>
      <div className="card mb12">
        <div className="card-header">
          <button className="btn btn-ghost btn-sm" onClick={()=>setCur(new Date(y,m-1,1))}>← Anterior</button>
          <span className="card-title">{MESES[m]} {y}</span>
          <button className="btn btn-ghost btn-sm" onClick={()=>setCur(new Date(y,m+1,1))}>Próximo →</button>
        </div>
        <div className="card-body">
          <div className="cal-grid" style={{marginBottom:4}}>{DIAS.map(d=><div key={d} className="cal-day-name">{d}</div>)}</div>
          <div className="cal-grid">{cells.map((c,i)=>{
            const svcs=c.cur?getSvcs(c.day):[];
            const isToday=c.cur&&c.day===today.getDate()&&m===today.getMonth()&&y===today.getFullYear();
            return(
              <div key={i} className={`cal-day ${!c.cur?"other-month":""} ${isToday?"today":""}`}>
                <div className="cal-day-num">{c.day}</div>
                {svcs.slice(0,2).map((s,si)=>{const cli=clientes.find(x=>x.id===s.clienteId);return<div key={si} className="cal-event" style={{background:COLORS[si%COLORS.length]}}>{cli?.nome?.split(" ")[0]||"OS"}</div>})}
                {svcs.length>2&&<div style={{fontSize:8,color:"var(--text2)"}}>+{svcs.length-2}</div>}
              </div>
            );
          })}</div>
        </div>
      </div>
      <div className="card">
        <div className="card-header"><span className="card-title">Serviços do Mês</span><span className="badge badge-blue"><span className="badge-dot"/>{mesSvcs.length} OS</span></div>
        {mesSvcs.length===0
          ? <div className="empty" style={{padding:"24px 0"}}><Calendar size={32}/><p>Nenhum serviço neste mês</p></div>
          : <div className="table-wrap"><table>
              <thead><tr><th>Data</th><th>Cliente</th><th>Tipo</th><th>Técnico</th><th>Valor</th><th>Status</th></tr></thead>
              <tbody>{mesSvcs.map(s=>{const c=clientes.find(x=>x.id===s.clienteId);return(
                <tr key={s.id}>
                  <td style={{fontSize:12,color:"var(--text2)"}}>{fmtDate(s.data)}</td>
                  <td style={{fontWeight:600,fontSize:13}}>{c?.nome||"—"}</td>
                  <td><span className="badge badge-blue">{s.tipo}</span></td>
                  <td style={{fontSize:12,color:"var(--text2)"}}>{s.tecnico||"—"}</td>
                  <td style={{fontWeight:700,color:"var(--green)"}}>{fmtMoney(s.valor)}</td>
                  <td><Badge s={s.status}/></td>
                </tr>
              )})}</tbody>
            </table></div>
        }
      </div>
    </div>
  );
}

// ─── TABELA DE PREÇOS ─────────────────────────────────────────────────────────
function TabelaPrecos({precos,setPrecos,addToast}) {
  const ref=usePageTransition("precos");
  const [modal,setModal]=useState(false);
  const [editing,setEditing]=useState(null);
  const EMPTY={servico:"",descricao:"",valor:""};
  const [form,setForm]=useState(EMPTY);

  const openNew=()=>{setEditing(null);setForm(EMPTY);setModal(true)};
  const openEdit=p=>{setEditing(p.id);setForm({...p});setModal(true)};
  const save=()=>{
    if(!form.servico.trim()){addToast("Nome do serviço é obrigatório","error");return}
    if(editing) setPrecos(p=>p.map(x=>x.id===editing?{...form,id:editing}:x));
    else setPrecos(p=>[...p,{...form,id:newId()}]);
    addToast(editing?"Preço atualizado!":"Serviço adicionado!","success");
    setModal(false);
  };
  const del=id=>{if(!confirm("Excluir este serviço?"))return;setPrecos(p=>p.filter(x=>x.id!==id));addToast("Excluído","info")};

  return (
    <div ref={ref}>
      <div className="page-header">
        <div><h2>Tabela de Preços</h2><p>{precos.length} serviços</p></div>
        <button className="btn btn-primary" onClick={openNew}><Plus size={13}/>Novo Serviço</button>
      </div>
      <div className="card">
        <div className="card-header"><span className="card-title">Serviços e Valores</span></div>
        {precos.length===0
          ? <div className="empty"><DollarSign size={36}/><p>Nenhum preço cadastrado</p><button className="btn btn-primary btn-sm" onClick={openNew}><Plus size={12}/>Adicionar</button></div>
          : precos.map(p=>(
              <div key={p.id} className="price-item">
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13.5,fontWeight:600,color:"var(--text)"}}>{p.servico}</div>
                  <div style={{fontSize:11.5,color:"var(--text2)",marginTop:2}}>{p.descricao}</div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0,marginLeft:12}}>
                  <span style={{fontFamily:"'Syne',sans-serif",fontSize:15,fontWeight:800,color:"var(--green)"}}>{fmtMoney(p.valor)}</span>
                  <button className="btn btn-ghost btn-sm" onClick={()=>openEdit(p)}><Edit2 size={12}/></button>
                  <button className="btn btn-danger btn-sm" onClick={()=>del(p.id)}><Trash2 size={12}/></button>
                </div>
              </div>
            ))
        }
      </div>
      {modal&&<Modal title={editing?"Editar Preço":"Novo Serviço"} onClose={()=>setModal(false)} onSave={save}>
        <Field lbl="Nome do Serviço" field="servico" form={form} setForm={setForm} ph="Ex: Limpeza Split 12.000 BTU" required/>
        <Field lbl="Descrição" field="descricao" form={form} setForm={setForm} ph="O que está incluso no serviço..."/>
        <div className="input-group">
          <label className="input-label">Valor (R$)</label>
          <input className="input-field" type="number" step="0.01" min="0" placeholder="0,00" value={form.valor} onChange={e=>setForm(p=>({...p,valor:e.target.value}))}/>
        </div>
      </Modal>}
    </div>
  );
}

// ─── RELATÓRIOS ───────────────────────────────────────────────────────────────
function Relatorios({servicos,clientes,equipamentos,empresa,addToast}) {
  const ref=usePageTransition("relatorios");
  const [loading,setLoading]=useState({pdf:false,excel:false});
  const concl=servicos.filter(s=>s.status==="concluido");
  const fat=concl.reduce((a,s)=>a+Number(s.valor||0),0);
  const ticket=concl.length?fat/concl.length:0;
  const MESES=["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  const fatMes=Array.from({length:6},(_,i)=>{const d=new Date();d.setMonth(d.getMonth()-5+i);const y2=d.getFullYear(),m2=d.getMonth();const v=concl.filter(s=>{const sd=new Date(s.data);return sd.getFullYear()===y2&&sd.getMonth()===m2}).reduce((a,s)=>a+Number(s.valor||0),0);return{mes:MESES[m2],valor:v}});
  const tecMap={};servicos.forEach(s=>{if(s.tecnico){if(!tecMap[s.tecnico])tecMap[s.tecnico]={os:0,fat:0};tecMap[s.tecnico].os++;tecMap[s.tecnico].fat+=Number(s.valor||0)}});
  const tecs=Object.entries(tecMap).sort((a,b)=>b[1].os-a[1].os);
  const C=["#2563eb","#10b981","#f59e0b","#8b5cf6"];

  const handlePDF=async()=>{
    setLoading(p=>({...p,pdf:true}));
    try{await gerarRelatorioPDF({servicos,clientes,equipamentos,empresa});addToast("PDF gerado e baixado!","success")}
    catch(e){addToast(String(e.message||"Erro ao gerar PDF"),"error")}
    finally{setLoading(p=>({...p,pdf:false}))};
  };
  const handleExcel=async()=>{
    setLoading(p=>({...p,excel:true}));
    try{await gerarRelatorioExcel({servicos,clientes,equipamentos,empresa});addToast("Excel gerado e baixado!","success")}
    catch(e){addToast(String(e.message||"Erro ao gerar Excel"),"error")}
    finally{setLoading(p=>({...p,excel:false}))};
  };

  return (
    <div ref={ref}>
      <div className="page-header">
        <div><h2>Relatórios</h2><p>Indicadores e exportações</p></div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={handlePDF} disabled={loading.pdf}>
            {loading.pdf?<RefreshCw size={13} style={{animation:"spin .7s linear infinite"}}/>:<Download size={13}/>}
            <span>PDF</span>
          </button>
          <button className="btn btn-primary" onClick={handleExcel} disabled={loading.excel}>
            {loading.excel?<RefreshCw size={13} style={{animation:"spin .7s linear infinite"}}/>:<FileSpreadsheet size={13}/>}
            <span>Excel</span>
          </button>
        </div>
      </div>

      <div className="info-box info-blue mb16">
        <AlertCircle size={15}/>
        <span>Para gerar PDF/Excel, instale primeiro: <code style={{background:"rgba(255,255,255,.1)",padding:"1px 6px",borderRadius:4}}>npm install jspdf jspdf-autotable xlsx</code></span>
      </div>

      <div className="grid3 mb16">
        {[
          {l:"Faturamento Total",v:fmtMoney(fat),c:"var(--green)"},
          {l:"OS Concluídas",v:concl.length,c:"var(--blue2)"},
          {l:"Ticket Médio",v:fmtMoney(ticket),c:"var(--amber)"},
          {l:"Total de Clientes",v:clientes.length,c:"var(--purple)"},
          {l:"Clientes Ativos",v:clientes.filter(c=>c.status==="ativo").length,c:"var(--green)"},
          {l:"Total de OS",v:servicos.length,c:"var(--text2)"},
        ].map((m,i)=>(
          <div key={i} style={{background:"var(--card2)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:14}}>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:22,fontWeight:800,color:m.c}}>{m.v}</div>
            <div style={{fontSize:11.5,color:"var(--text2)",marginTop:4}}>{m.l}</div>
          </div>
        ))}
      </div>
      <div className="charts-grid">
        <div className="card">
          <div className="card-header"><span className="card-title">Faturamento Mensal</span></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={fatMes}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" strokeOpacity={.5}/>
                <XAxis dataKey="mes" tick={{fill:"#94a3b8",fontSize:10}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:"#94a3b8",fontSize:9}} axisLine={false} tickLine={false} tickFormatter={v=>`R$${(v/1000).toFixed(0)}k`}/>
                <Tooltip content={<Tip prefix="R$ "/>}/>
                <Bar dataKey="valor" fill="#2563eb" radius={[4,4,0,0]} name="Faturamento"/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><span className="card-title">Produtividade Técnicos</span></div>
          <div className="card-body">
            {tecs.length===0
              ? <div className="empty" style={{padding:"20px 0"}}><p>Nenhum técnico com OS registrada</p></div>
              : tecs.map(([nome,d],i)=>{const max=tecs[0][1].os||1;return(
                  <div key={i} style={{marginBottom:14}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                      <div style={{display:"flex",alignItems:"center",gap:7}}>
                        <div style={{width:26,height:26,background:C[i%4],borderRadius:50,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:"#fff"}}>{nome[0]}</div>
                        <div><div style={{fontSize:12,fontWeight:600}}>{nome}</div><div style={{fontSize:10.5,color:"var(--text2)"}}>{d.os} OS · {fmtMoney(d.fat)}</div></div>
                      </div>
                      <span style={{fontSize:12,fontWeight:700,color:"var(--text2)"}}>{d.os}</span>
                    </div>
                    <div style={{height:5,background:"var(--border)",borderRadius:10,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${(d.os/max)*100}%`,background:C[i%4],borderRadius:10}}/>
                    </div>
                  </div>
                )})
            }
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── AUTOMAÇÃO + WHATSAPP ─────────────────────────────────────────────────────
function Automacao({clientes,addToast}) {
  const ref=usePageTransition("automacao");
  const [autos,setAutos]=useStorage("minas_autos",{a1:true,a2:true,a3:false,a4:true});
  const [apiConfig]=useStorage("minas_api",{instanceId:"",token:"",clientToken:"",numero:""});
  const [waStatus,setWaStatus]=useState(null); // null=checking, {connected,phone}
  const [sending,setSending]=useState({});
  const [modalWA,setModalWA]=useState(null); // {cliente, template}
  const [msgEdit,setMsgEdit]=useState("");

  // Checa status da instância
  useEffect(()=>{
    setWaStatus(null);
    checkInstanceStatus({instanceId:apiConfig.instanceId,token:apiConfig.token,clientToken:apiConfig.clientToken})
      .then(s=>setWaStatus(s))
      .catch(()=>setWaStatus({connected:false}));
  },[apiConfig.instanceId,apiConfig.token]);

  const toggle=k=>{setAutos(p=>{const n={...p,[k]:!p[k]};addToast(n[k]?"Automação ativada!":"Automação pausada","info");return n})};

  const openSendModal=(cliente,templateKey)=>{
    const fn=TEMPLATES[templateKey];
    const hoje=new Date().toLocaleDateString("pt-BR");
    const msg=fn(cliente.nome,hoje,"14:00","Manutenção Preventiva","Carlos Silva");
    setMsgEdit(msg);
    setModalWA({cliente,templateKey});
  };

  const sendReal=async()=>{
    if(!modalWA) return;
    const {cliente}=modalWA;
    const phone=cliente.whatsapp||cliente.telefone;
    if(!phone){addToast("Cliente sem WhatsApp cadastrado","error");return}
    setSending(p=>({...p,[cliente.id]:true}));
    try{
      await sendWhatsAppMessage(phone,msgEdit,{instanceId:apiConfig.instanceId,token:apiConfig.token,clientToken:apiConfig.clientToken});
      addToast(`✅ Mensagem enviada para ${cliente.nome}!`,"success");
      setModalWA(null);
    }catch(e){
      addToast(`Erro: ${e.message}`,"error");
    }finally{
      setSending(p=>({...p,[cliente.id]:false}));
    }
  };

  const ITEMS=[
    {k:"a1",title:"🔔 Lembrete 6 Meses",sub:"Para clientes sem manutenção há 6 meses",color:"var(--blue2)",templateKey:"lembrete6Meses"},
    {k:"a2",title:"⏰ Lembrete 12 Meses",sub:"Para clientes sem manutenção há 12 meses",color:"var(--amber)",templateKey:"lembrete12Meses"},
    {k:"a3",title:"✅ Confirmação de Agendamento",sub:"Enviado ao confirmar uma visita técnica",color:"var(--green)",templateKey:"confirmacaoAgendamento"},
    {k:"a4",title:"⭐ Pesquisa Pós-Serviço",sub:"Enviado 24h após conclusão do serviço",color:"var(--purple)",templateKey:"posServico"},
  ];

  return (
    <div ref={ref}>
      <div className="page-header">
        <div><h2>Automação WhatsApp</h2><p>Integração real com Z-API</p></div>
        <div className="row">
          {waStatus===null
            ? <span className="badge badge-gray"><span className="badge-dot"/>Verificando...</span>
            : waStatus.connected
              ? <span className="badge badge-green"><span className="badge-dot"/>Conectado {waStatus.phone?`(${waStatus.phone})`:""}</span>
              : <span className="badge badge-red"><span className="badge-dot"/>Desconectado — Configure nas Configurações</span>
          }
        </div>
      </div>

      {!waStatus?.connected && (
        <div className="info-box info-amber mb16">
          <AlertCircle size={15}/>
          <div><b>Configure a Z-API para envios reais:</b> Vá em Configurações → API WhatsApp e informe seu Instance ID, Token e Client-Token da Z-API. <a href="https://app.z-api.io" target="_blank" rel="noreferrer" style={{color:"var(--blue3)"}}>Acesse app.z-api.io →</a></div>
        </div>
      )}

      {/* Envio manual por cliente */}
      <div className="card mb16">
        <div className="card-header"><span className="card-title">📱 Envio Manual por Cliente</span></div>
        <div className="card-body">
          <div style={{display:"grid",gap:8}}>
            {clientes.slice(0,5).map(c=>(
              <div key={c.id} className="wa-send-card">
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{width:34,height:34,background:"linear-gradient(135deg,#2563eb,#7c3aed)",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:12,fontWeight:800,flexShrink:0}}>{initials(c.nome)}</div>
                    <div>
                      <div style={{fontWeight:600,fontSize:13}}>{c.nome}</div>
                      <div style={{fontSize:11,color:"var(--text2)"}}>{c.whatsapp||c.telefone||"Sem WhatsApp"}</div>
                    </div>
                  </div>
                  <div className="row" style={{gap:5,flexWrap:"wrap"}}>
                    <button className="btn btn-secondary btn-sm" onClick={()=>openSendModal(c,"lembrete6Meses")}><MessageSquare size={11}/>Lembrete</button>
                    <button className="btn btn-green btn-sm" onClick={()=>openSendModal(c,"posServico")}><Star size={11}/>Pós-Serviço</button>
                    <button className="btn btn-primary btn-sm" onClick={()=>openSendModal(c,"orcamento")}><Send size={11}/>Orçamento</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Automações */}
      {ITEMS.map(item=>(
        <div key={item.k} style={{background:"var(--card2)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:14,marginBottom:10}} className="auto-card">
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:10,gap:10}}>
            <div>
              <div style={{fontWeight:700,fontSize:14,color:autos[item.k]?item.color:"var(--text2)"}}>{item.title}</div>
              <div style={{fontSize:11.5,color:"var(--text2)",marginTop:3}}>{item.sub}</div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
              <div className={`toggle ${autos[item.k]?"on":""}`} onClick={()=>toggle(item.k)}/>
            </div>
          </div>
          {autos[item.k]
            ? <div style={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:8,padding:11,fontSize:12,color:"var(--text2)",lineHeight:1.65,whiteSpace:"pre-line",maxHeight:130,overflowY:"auto"}}>{TEMPLATES[item.templateKey]("Nome do Cliente","10/03/2026","14:00","Manutenção","Carlos")}</div>
            : <div style={{fontSize:12,color:"var(--text2)",padding:"8px 12px",background:"rgba(0,0,0,.2)",borderRadius:8,textAlign:"center"}}>⏸ Automação pausada</div>
          }
        </div>
      ))}

      {/* Modal de envio */}
      {modalWA&&(
        <Modal title={`Enviar para ${modalWA.cliente.nome}`} onClose={()=>setModalWA(null)} onSave={sendReal} saveLabel="Enviar Agora" saving={!!sending[modalWA.cliente.id]}>
          <div style={{marginBottom:12}}>
            <div style={{fontSize:12,color:"var(--text2)",marginBottom:4}}>Para: <b style={{color:"var(--text)"}}>{modalWA.cliente.whatsapp||modalWA.cliente.telefone}</b></div>
          </div>
          <div className="input-group">
            <label className="input-label">Mensagem (editável antes de enviar)</label>
            <textarea className="input-field" rows={8} value={msgEdit} onChange={e=>setMsgEdit(e.target.value)}/>
          </div>
          {!waStatus?.connected&&<div className="info-box info-amber"><AlertCircle size={14}/>Configure a Z-API nas Configurações para envios reais.</div>}
        </Modal>
      )}
    </div>
  );
}

// ─── CONFIGURAÇÕES ────────────────────────────────────────────────────────────
function Configuracoes({addToast,currentUser,currentEmpresa,usuarios,setUsuarios}) {
  const ref=usePageTransition("config");
  const [empresa,setEmpresa]=useStorage("minas_empresa",{nome:"Minas Refrigeração",cnpj:"",telefone:"",email:"",endereco:""});
  const [api,setApi]=useStorage("minas_api",{instanceId:"",token:"",clientToken:"",numero:"",webhook:""});
  const [tecnicos,setTecnicos]=useStorage("minas_tecnicos",[{id:1,nome:"Carlos Silva"},{id:2,nome:"André Souza"},{id:3,nome:"Pedro Lima"}]);
  const [novoTec,setNovoTec]=useState("");
  const [testando,setTestando]=useState(false);
  const [waStatus,setWaStatus]=useState(null);
  const [userModal,setUserModal]=useState(false);
  const [userForm,setUserForm]=useState({nome:"",email:"",senha:"",confirmarSenha:"",tipo:"operador"});

  const isAdmin=currentUser?.tipo==="administrador";
  const empresaUsers=usuarios.filter(u=>Number(u.empresaId)===Number(currentEmpresa?.id));
  const limite=currentEmpresa?.limiteUsuarios||5;

  const saveEmpresa=()=>addToast("Dados da empresa salvos!","success");
  const saveApi=async()=>{
    addToast("Configuração salva! Verificando conexão...","info");
    setTestando(true);
    const s=await checkInstanceStatus({instanceId:api.instanceId,token:api.token,clientToken:api.clientToken}).catch(()=>({connected:false}));
    setWaStatus(s);
    setTestando(false);
    if(s.connected) addToast(`Z-API conectado! Número: ${s.phone||"—"}`,"success");
    else addToast("Z-API não conectada. Verifique Instance ID, Token e Client-Token.","error");
  };
  const addTec=()=>{if(!novoTec.trim())return;setTecnicos(p=>[...p,{id:newId(),nome:novoTec}]);setNovoTec("");addToast("Técnico adicionado!","success")};
  const delTec=id=>{if(!confirm("Remover técnico?"))return;setTecnicos(p=>p.filter(t=>t.id!==id));addToast("Técnico removido","info")};

  const openUserModal=()=>{
    if(empresaUsers.length>=limite){addToast(`Limite de ${limite} usuários atingido para esta empresa.`,"error");return;}
    setUserForm({nome:"",email:"",senha:"",confirmarSenha:"",tipo:"operador"});
    setUserModal(true);
  };
  const saveUser=()=>{
    if(!userForm.nome.trim()){addToast("Nome é obrigatório","error");return;}
    if(!userForm.email.trim()){addToast("E-mail é obrigatório","error");return;}
    if(!userForm.senha||userForm.senha.length<6){addToast("Senha deve ter pelo menos 6 caracteres","error");return;}
    if(userForm.senha!==userForm.confirmarSenha){addToast("Senhas não coincidem","error");return;}
    if(usuarios.find(u=>u.email.toLowerCase()===userForm.email.trim().toLowerCase()&&Number(u.empresaId)===Number(currentEmpresa?.id))){addToast("E-mail já cadastrado nesta empresa","error");return;}
    setUsuarios(p=>[...p,{id:newId(),empresaId:Number(currentEmpresa?.id),nome:userForm.nome,email:userForm.email.trim(),senha:userForm.senha,tipo:userForm.tipo,status:"ativo",createdAt:new Date().toISOString().slice(0,10)}]);
    addToast("Usuário cadastrado com sucesso!","success");
    setUserModal(false);
  };
  const toggleUserStatus=(id)=>{setUsuarios(p=>p.map(u=>u.id===id?{...u,status:u.status==="ativo"?"inativo":"ativo"}:u));addToast("Status atualizado!","info")};
  const delUser=id=>{if(id===currentUser?.id){addToast("Você não pode excluir a si mesmo","error");return;}if(!confirm("Excluir este usuário?"))return;setUsuarios(p=>p.filter(u=>u.id!==id));addToast("Usuário excluído","info")};

  return (
    <div ref={ref}>
      <div className="page-header"><div><h2>Configurações</h2><p>Empresa, integrações, técnicos e usuários</p></div></div>

      {/* ── GESTÃO DE USUÁRIOS (só admin) ── */}
      {isAdmin&&(
        <div className="card mb16">
          <div className="card-header">
            <span className="card-title">Usuários da Empresa</span>
            <div className="row" style={{gap:8}}>
              <span className="badge badge-blue"><span className="badge-dot"/>{empresaUsers.length}/{limite}</span>
              <button className="btn btn-primary btn-sm" onClick={openUserModal}><Plus size={12}/>Novo Usuário</button>
            </div>
          </div>
          <div className="table-wrap"><table>
            <thead><tr><th>Usuário</th><th>E-mail</th><th>Tipo</th><th>Status</th><th>Desde</th><th>Ações</th></tr></thead>
            <tbody>{empresaUsers.map(u=>(
              <tr key={u.id}>
                <td><div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:28,height:28,background:u.tipo==="administrador"?"linear-gradient(135deg,#0ea5e9,#2563eb)":"linear-gradient(135deg,#2563eb,#7c3aed)",borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:10,fontWeight:800,flexShrink:0}}>{initials(u.nome)}</div>
                  <span style={{fontWeight:600,fontSize:13}}>{u.nome}{u.id===currentUser?.id?<span style={{fontSize:10,color:"var(--text2)",marginLeft:6}}>(você)</span>:null}</span>
                </div></td>
                <td style={{fontSize:12,color:"var(--text2)"}}>{u.email}</td>
                <td><span className={`badge ${u.tipo==="administrador"?"badge-blue":"badge-gray"}`}><span className="badge-dot"/>{u.tipo==="administrador"?"Admin":"Operador"}</span></td>
                <td><Badge s={u.status}/></td>
                <td style={{fontSize:12,color:"var(--text2)"}}>{fmtDate(u.createdAt)}</td>
                <td><div className="row" style={{gap:3}}>
                  {u.id!==currentUser?.id&&<><button className="btn btn-ghost btn-sm" onClick={()=>toggleUserStatus(u.id)} title={u.status==="ativo"?"Desativar":"Ativar"}><Shield size={12}/></button>
                  <button className="btn btn-danger btn-sm" onClick={()=>delUser(u.id)}><Trash2 size={11}/></button></>}
                </div></td>
              </tr>
            ))}</tbody>
          </table></div>
        </div>
      )}

      <div className="grid2">
        <div className="card">
          <div className="card-header"><span className="card-title">Dados da Empresa</span></div>
          <div className="card-body">
            {currentEmpresa&&<div className="info-box info-blue mb12"><AlertCircle size={14}/><div><b>Código da empresa:</b> {currentEmpresa.codigo} · <b>Plano:</b> {currentEmpresa.plano}</div></div>}
            {[["Nome da Empresa","nome","Minas Refrigeração"],["CNPJ","cnpj","00.000.000/0001-00"],["Telefone","telefone","(31) 3333-4444"],["E-mail","email","contato@empresa.com"],["Endereço","endereco","Rua, número — Cidade/UF"]].map(([lbl,field,ph])=>(
              <div key={field} className="input-group">
                <label className="input-label">{lbl}</label>
                <input className="input-field" placeholder={ph} value={empresa[field]||""} onChange={e=>setEmpresa(p=>({...p,[field]:e.target.value}))} disabled={!isAdmin}/>
              </div>
            ))}
            {isAdmin&&<button className="btn btn-primary" onClick={saveEmpresa}><Save size={13}/>Salvar</button>}
          </div>
        </div>
        <div>
          <div className="card mb12">
            <div className="card-header">
              <span className="card-title">Z-API WhatsApp</span>
              {waStatus!==null&&(waStatus.connected
                ? <span className="badge badge-green"><span className="badge-dot"/>Conectado</span>
                : <span className="badge badge-red"><span className="badge-dot"/>Desconectado</span>)}
            </div>
            <div className="card-body">
              <div className="info-box info-green mb12">
                <CheckCircle size={14}/>
                <div>Crie sua conta em <a href="https://app.z-api.io" target="_blank" rel="noreferrer" style={{color:"var(--blue3)",fontWeight:600}}>app.z-api.io</a>, crie uma instância, copie o <b>Instance ID</b>, o <b>Token</b> e o <b>Client-Token</b> e cole abaixo.</div>
              </div>
              {[["Instance ID","instanceId","Informe o Instance ID"],["Token","token","Informe o Token"],["Client-Token","clientToken","Token de Segurança da Conta Z-API"],["Número WhatsApp","numero","5531999990000"],["Webhook URL (opcional)","webhook","https://seusite.com/webhook"]].map(([lbl,field,ph])=>(
                <div key={field} className="input-group">
                  <label className="input-label">{lbl}</label>
                  <input className="input-field" placeholder={ph} value={api[field]||""} onChange={e=>setApi(p=>({...p,[field]:e.target.value}))}/>
                </div>
              ))}
              <div className="row">
                <button className="btn btn-primary" onClick={saveApi} disabled={testando}>
                  {testando?<RefreshCw size={13} style={{animation:"spin .7s linear infinite"}}/>:<Shield size={13}/>}
                  Salvar e Testar Conexão
                </button>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-header"><span className="card-title">Técnicos</span></div>
            <div className="card-body">
              {tecnicos.map(t=>(
                <div key={t.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:"1px solid rgba(30,58,95,.25)"}}>
                  <div style={{width:28,height:28,background:"var(--blue)",borderRadius:50,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:"#fff",flexShrink:0}}>{t.nome[0]}</div>
                  <div style={{flex:1,fontSize:13,fontWeight:500}}>{t.nome}</div>
                  <button className="btn btn-danger btn-sm" onClick={()=>delTec(t.id)}><Trash2 size={11}/></button>
                </div>
              ))}
              <div style={{display:"flex",gap:7,marginTop:12}}>
                <input className="input-field" placeholder="Nome do técnico..." value={novoTec} onChange={e=>setNovoTec(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addTec()}/>
                <button className="btn btn-primary" style={{flexShrink:0}} onClick={addTec}><Plus size={13}/></button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal cadastro de usuário */}
      {userModal&&<Modal title="Novo Usuário" onClose={()=>setUserModal(false)} onSave={saveUser}>
        <Field lbl="Nome completo" field="nome" form={userForm} setForm={setUserForm} ph="Nome do usuário" required/>
        <Field lbl="E-mail" field="email" form={userForm} setForm={setUserForm} type="email" ph="email@empresa.com" required/>
        <div className="input-row">
          <div className="input-group">
            <label className="input-label">Senha <span style={{color:"var(--red)"}}>*</span></label>
            <input className="input-field" type="password" placeholder="Mín. 6 caracteres" value={userForm.senha} onChange={e=>setUserForm(p=>({...p,senha:e.target.value}))}/>
          </div>
          <div className="input-group">
            <label className="input-label">Confirmar Senha <span style={{color:"var(--red)"}}>*</span></label>
            <input className="input-field" type="password" placeholder="Repita a senha" value={userForm.confirmarSenha} onChange={e=>setUserForm(p=>({...p,confirmarSenha:e.target.value}))}/>
          </div>
        </div>
        <div className="input-group">
          <label className="input-label">Tipo de Usuário</label>
          <select className="select-field" value={userForm.tipo} onChange={e=>setUserForm(p=>({...p,tipo:e.target.value}))}>
            <option value="operador">Operador</option>
            <option value="administrador">Administrador</option>
          </select>
        </div>
        <div className="info-box info-blue" style={{marginTop:8}}>
          <AlertCircle size={14}/>
          <div style={{fontSize:12}}><b>Operador:</b> cria OS, vê clientes, registra atendimentos. <b>Admin:</b> acesso total + gestão de usuários.</div>
        </div>
      </Modal>}
    </div>
  );
}

// ─── NAV ──────────────────────────────────────────────────────────────────────
const NAV=[
  {id:"dashboard",  label:"Dashboard",       icon:<LayoutDashboard/>,  section:"Principal"},
  {id:"clientes",   label:"Clientes",        icon:<Users/>,            section:"Principal"},
  {id:"equipamentos",label:"Equipamentos",   icon:<Thermometer/>,      section:"Gestão"},
  {id:"servicos",   label:"Serviços",        icon:<Wrench/>,           section:"Gestão"},
  {id:"agenda",     label:"Agenda",          icon:<Calendar/>,         section:"Gestão"},
  {id:"precos",     label:"Tabela de Preços",icon:<DollarSign/>,       section:"Gestão"},
  {id:"relatorios", label:"Relatórios",      icon:<BarChart3/>,        section:"Análise"},
  {id:"automacao",  label:"Automação WA",    icon:<MessageSquare/>,    section:"Análise"},
  {id:"config",     label:"Configurações",   icon:<Settings/>,         section:"Sistema"},
];

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [phase,setPhase]               = useState("loading"); // "loading" | "login" | "app"
  const [currentUser,setCurrentUser]   = useState(null);
  const [currentEmpresa,setCurrentEmpresa] = useState(null);
  const [page,setPage]                 = useState("dashboard");
  const [sideOpen,setSideOpen]         = useState(()=>window.innerWidth>768);
  const [toasts,setToasts]             = useState([]);
  const [clientes,setClientes]         = useStorage("minas_clientes",    INIT_CLIENTES);
  const [equips,setEquips]             = useStorage("minas_equipamentos", INIT_EQUIPS);
  const [servicos,setServicos]         = useStorage("minas_servicos",     INIT_SERVICOS);
  const [precos,setPrecos]             = useStorage("minas_precos",       INIT_PRECOS);
  const [empresa]                      = useStorage("minas_empresa",      {nome:"Minas Refrigeração"});
  const [empresas,setEmpresas]         = useStorage("frost_empresas",     INIT_EMPRESAS);
  const [usuarios,setUsuarios]         = useStorage("frost_usuarios",     INIT_USUARIOS);
  const sideRef                        = useRef(null);
  const sideMounted                    = useRef(false);

  const addToast=(msg,type="info")=>{
    const id=newId();
    setToasts(t=>[...t,{id,msg,type}]);
    setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),4000);
  };

  // Anima sidebar no mobile (ignora montagem inicial)
  useEffect(()=>{
    if(!sideRef.current) return;
    if(!sideMounted.current) { sideMounted.current=true; return; }
    if(sideOpen) { gsap.fromTo(sideRef.current,{x:-280},{x:0,duration:.32,ease:"power3.out"}); }
  },[sideOpen]);

  const handleLogin=(user,emp)=>{
    setCurrentUser(user);
    setCurrentEmpresa(emp);
    setPhase("app");
  };

  const handleLogout=()=>{
    setCurrentUser(null);
    setCurrentEmpresa(null);
    setPhase("login");
    setPage("dashboard");
  };

  const go=id=>{setPage(id);setSideOpen(false)};
  const grouped=NAV.reduce((a,n)=>{if(!a[n.section])a[n.section]=[];a[n.section].push(n);return a},{});
  const pageLabel=NAV.find(n=>n.id===page)?.label||"";

  const props={clientes,setClientes,equipamentos:equips,setEquipamentos:setEquips,servicos,setServicos,precos,setPrecos,empresa,addToast,currentUser,currentEmpresa,usuarios,setUsuarios};

  const renderPage=()=>{
    switch(page){
      case "dashboard":     return <Dashboard {...props}/>;
      case "clientes":      return <Clientes {...props}/>;
      case "equipamentos":  return <Equipamentos {...props}/>;
      case "servicos":      return <Servicos {...props}/>;
      case "agenda":        return <Agenda {...props}/>;
      case "precos":        return <TabelaPrecos {...props}/>;
      case "relatorios":    return <Relatorios {...props}/>;
      case "automacao":     return <Automacao {...props}/>;
      case "config":        return <Configuracoes {...props}/>;
      default: return null;
    }
  };

  // ── FASE: LOADING ──
  if(phase==="loading") return <><style>{css}</style><LoadingScreen onFinish={()=>setPhase("login")}/></>;

  // ── FASE: LOGIN ──
  if(phase==="login") return <><style>{css}</style><Login onLogin={handleLogin} empresas={empresas} usuarios={usuarios}/><Toasts list={toasts}/></>;

  // ── FASE: APP ──
  const userInitials=currentUser?initials(currentUser.nome):"??";

  return (
    <>
      <style>{css}</style>
      <div className="app">
        <div className={`overlay ${sideOpen?"show":""}`} onClick={()=>setSideOpen(false)}/>
        <aside className={`sidebar ${sideOpen?"":"closed"}`} ref={sideRef}>
          <div className="sidebar-logo">
            <div className="logo-box">
              <div className="logo-icon" style={{background:"linear-gradient(135deg,#0ea5e9,#2563eb)"}}><Snowflake size={19} color="#fff"/></div>
              <div><div className="logo-text">FrostERP</div><div className="logo-sub">{currentEmpresa?.nome||"Sistema"}</div></div>
            </div>
          </div>
          {Object.entries(grouped).map(([sec,items])=>(
            <div key={sec} className="nav-section">
              <div className="nav-label">{sec}</div>
              {items.map(n=>(
                <div key={n.id} className={`nav-item ${page===n.id?"active":""}`} onClick={()=>go(n.id)}>
                  {n.icon}<span style={{flex:1}}>{n.label}</span>
                </div>
              ))}
            </div>
          ))}
          <div className="sidebar-footer">
            <div className="user-card">
              <div className="avatar">{userInitials}</div>
              <div style={{flex:1,minWidth:0}}>
                <div className="user-name">{currentUser?.nome||"Usuário"}</div>
                <div className="user-role">{currentUser?.tipo==="administrador"?"Admin":"Operador"} · {currentEmpresa?.nome||""}</div>
              </div>
              <button className="btn btn-ghost btn-sm" style={{padding:5,flexShrink:0}} onClick={handleLogout} title="Sair"><LogOut size={13}/></button>
            </div>
          </div>
        </aside>
        <div className="main">
          <header className="topbar">
            <button className="menu-btn" onClick={()=>setSideOpen(!sideOpen)}>
              {sideOpen?<X size={17}/>:<Menu size={17}/>}
            </button>
            <span className="page-title">{pageLabel}</span>
            <div className="topbar-right">
              <button className="icon-btn" onClick={()=>addToast(`${servicos.filter(s=>s.status==="agendado").length} OS agendadas · ${clientes.length} clientes`,"info")}>
                <Bell size={15}/><span className="notif-dot"/>
              </button>
              <div className="avatar" style={{width:30,height:30,fontSize:11,cursor:"pointer"}} onClick={()=>go("config")}>{userInitials}</div>
            </div>
          </header>
          <div className="content">
            <div className="page-wrap">{renderPage()}</div>
          </div>
        </div>
      </div>
      <Toasts list={toasts}/>
    </>
  );
}
