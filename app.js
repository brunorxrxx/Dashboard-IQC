/* ════ GLOBAL ERROR CATCHER ════ */
window.onerror=function(msg,src,line,col,err){
  alert("Erro JS ["+line+":"+col+"]\n"+msg+"\n"+(err&&err.stack?err.stack.split("\n")[0]:""));
  return false;
};

Chart.defaults.color="#ffffff";

/* ════ STATUS NORMALIZE ════ */
function ns(s){
  const u=String(s||"").toUpperCase().trim();
  if(u.includes("APPROV")||u.includes("APROV")||u==="OK"||u==="PASS")return"APROVADO";
  if(u.includes("REJECT")||u.includes("REPROV")||u.includes("FAIL")||u==="NOK")return"REPROVADO";
  if(u==="")return"—";return u;
}

/* ════ COLUMN MAP ════ */
const CM={
  data:       ["data date","data dat","date","data"],
  mes:        ["month mes","month","mes","mês"],
  semana:     ["week seman","semana","week"],
  turno:      ["shift turn","turno","shift"],
  client:     ["client client","client clien","client","cliente"],
  planta:     ["plant plan","plant planta","planta","plant"],
  modelo:     ["modelo model","modelo  model","modelo","model"],
  suNumber:   ["su number","nº da su","su num"],
  qtdReceb:   ["total received total","total received","total recebido","received"],
  qtdInsp:    ["total inspected total","total inspected","total inspecionado","inspected"],
  sampleSize: ["sample size","tamanho da amostra","sample"],
  status:     ["inspection status","status da inspe","status"],
  falhaDesc:  ["failure description","descrição da falha","failure desc"],
  falhas:     ["qty. of failures","qty. de falhas","qty of failures","falhas","failures"],
  inspetor:   ["inspector    inspetor","inspector inspetor","inspetor","inspector"],
  fornecedor: ["supplier      forn","supplier","fornecedor"],
  codMaterial:["material code","código do material","cod material"],
  samplingSwitch:["sampling switching","comutação de amostragem","sampling switch"],
  loteCode:   ["lote code","lote"],
  boardingNum:["boarding number","nº do embarque","boarding num"],
};

/* ════ CLIENT COLORS ════ */
const CS={
  ACER:{bg:"#1a6630"},ASROCK:{bg:"#1e3a8a"},ASUS:{bg:"#1565c0"},COMPAL:{bg:"#006eba"},
  HP:{bg:"#0096d6"},HUAWEI:{bg:"#cf0a2c"},MAGUS:{bg:"#2e7d32"},ROKU:{bg:"#6b21a8"},
};

const TC={backgroundColor:"#0c1526",borderColor:"#1a3260",borderWidth:1,titleColor:"#fff",bodyColor:"#fff",padding:10};
const INSP_COLORS=["#1a7fe8","#22c55e","#f59e0b","#a855f7","#ef4444","#06b6d4","#f97316","#84cc16"];

let raw=[],fil=[],pie=null,bars={},trendChart=null,samplingChart=null,inspMonthChart=null,monthlyBar=null,fornBarChart=null,fornRecebChart=null,inspEvolChart=null;
let suSortCol=-1,suSortDir=1;

/* ════ HEADER ════ */
document.getElementById("btnSidebar").addEventListener("click",()=>{
  const sb=document.getElementById("sidebar");
  if(!sb.classList.contains("visible"))return;
  sb.classList.toggle("collapsed");
});

function toggleFS(){
  if(!document.fullscreenElement){
    document.documentElement.requestFullscreen().catch(()=>{});
    if(raw.length>0)startPresentation();
  }else{
    stopPresentation();
    document.exitFullscreen();
  }
}
document.addEventListener("fullscreenchange",()=>{
  if(!document.fullscreenElement)stopPresentation();
});

/* ════ PRESENTATION ════ */
const PRES_SLIDES=[
  ["dash","Dashboard",10],
  ["tend","Tendência",10],
  ["insp","Inspetores",10],
  ["forn","Fornecedores",10],
  ["su","Matriz SU",10],
];
let presTimer=null,presSlide=0;
function startPresentation(){
  presSlide=0;
  document.getElementById("presBar").classList.add("visible");
  const sb=document.getElementById("sidebar");
  if(sb.classList.contains("visible"))sb.classList.add("collapsed");
  showPresSlide();
}
function showPresSlide(){
  const[tab,label,dur]=PRES_SLIDES[presSlide];
  switchTab(tab);
  document.getElementById("presLabel").textContent=`▶ ${label}`;
  document.getElementById("presStep").textContent=`${label} · ${dur}s`;
  document.getElementById("presFill").style.transition="none";
  document.getElementById("presFill").style.width="0%";
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    document.getElementById("presFill").style.transition=`width ${dur}s linear`;
    document.getElementById("presFill").style.width="100%";
  }));
  clearTimeout(presTimer);
  presTimer=setTimeout(()=>{presSlide=(presSlide+1)%PRES_SLIDES.length;showPresSlide();},dur*1000);
}
function stopPresentation(){
  clearTimeout(presTimer);
  document.getElementById("presBar").classList.remove("visible");
}

/* ════ TABS ════ */
const TABS=["dash","tend","insp","forn","su"];
function switchTab(t){
  document.querySelectorAll(".tab-btn").forEach((b,i)=>b.classList.toggle("active",TABS[i]===t));
  TABS.forEach(id=>{
    const el=document.getElementById(id+"Page");
    if(el)el.style.display="none";
  });
  const page=document.getElementById(t+"Page");
  if(page){
    page.style.display="flex";
    safeAnimate(page);
  }
  if(t==="insp")renderInspProfile();
  if(t==="su")renderSuMatrix();
  if(t==="forn")renderFornecedores();
  if(t==="tend")renderTendencia();
}

const GSAP=typeof gsap!=="undefined"?gsap:null;
function safeAnimate(page){if(!GSAP||!page)return;try{animatePage(page);}catch(e){}}
function animatePage(page){
  GSAP.from(page.querySelectorAll(".kpi-card,.ikpi,.forn-kpi"),{
    y:24,opacity:0,stagger:0.06,duration:0.45,ease:"power2.out",clearProps:"all"
  });
  GSAP.from(page.querySelectorAll(".panel"),{
    y:18,opacity:0,stagger:0.07,duration:0.4,ease:"power2.out",delay:0.05,clearProps:"all"
  });
  GSAP.from(page.querySelectorAll(".cc"),{
    scale:0.92,opacity:0,stagger:0.04,duration:0.35,ease:"back.out(1.4)",delay:0.08,clearProps:"all"
  });
}

/* ════ FILE ════ */
const drop=document.getElementById("dropArea"),fi=document.getElementById("fileInput");
fi.addEventListener("change",e=>{if(e.target.files[0])load(e.target.files[0]);});
// Click em qualquer lugar do card abre o seletor
drop.addEventListener("click",e=>{if(e.target.tagName!=="LABEL"&&e.target.tagName!=="INPUT")fi.click();});
drop.addEventListener("dragover",e=>{e.preventDefault();drop.classList.add("drag-over");});
drop.addEventListener("dragleave",()=>drop.classList.remove("drag-over"));
drop.addEventListener("drop",e=>{e.preventDefault();drop.classList.remove("drag-over");if(e.dataTransfer.files[0])load(e.dataTransfer.files[0]);});

function resetToUpload(){
  raw=[];fil=[];
  stopPresentation();
  if(document.fullscreenElement)document.exitFullscreen();
  TABS.forEach(id=>{const el=document.getElementById(id+"Page");if(el)el.style.display="none";});
  document.getElementById("uploadZone").style.display="flex";
  document.getElementById("tabBtns").style.display="none";
  const sb=document.getElementById("sidebar");
  sb.classList.remove("visible");sb.classList.remove("collapsed");
  document.getElementById("fileInput").value="";
  [pie,trendChart,samplingChart,inspMonthChart,monthlyBar,fornBarChart,fornRecebChart,inspEvolChart].forEach(c=>{if(c){c.destroy();}});
  pie=trendChart=samplingChart=inspMonthChart=monthlyBar=fornBarChart=fornRecebChart=inspEvolChart=null;
  Object.keys(bars).forEach(k=>{if(bars[k]){bars[k].destroy();bars[k]=null;}});
}

function hideOverlay(){document.getElementById("loadingOverlay").classList.remove("visible");}
function load(file){
  document.getElementById("loadingOverlay").classList.add("visible");
  const r=new FileReader();
  r.onload=ev=>{
    setTimeout(()=>{
      try{
        const wb=XLSX.read(ev.target.result,{type:"array",cellDates:false,raw:true,dense:true});
        const ws=wb.Sheets[wb.SheetNames[0]];
        const arr=XLSX.utils.sheet_to_json(ws,{header:1,defval:"",raw:true});
        parseData(arr,file.name);
      }catch(e){
        hideOverlay();
        alert("Erro ao carregar arquivo: "+e.message);
      }
    },50);
  };
  r.onerror=()=>{hideOverlay();alert("Erro ao ler o arquivo.");};
  r.readAsArrayBuffer(file);
}

/* ════ PARSE ════ */
function fc(hdr,keys){
  const lh=hdr.map(h=>String(h).toLowerCase().trim());
  for(const k of keys){const i=lh.findIndex(h=>h.includes(k));if(i!==-1)return i;}
  return -1;
}
function tn(v){
  if(!v&&v!==0)return 0;
  const n=parseFloat(String(v).replace(/\s/g,"").replace(/\./g,"").replace(",",".").replace(/[^\d.-]/g,""));
  return isNaN(n)?0:n;
}
function pd(val){
  if(!val&&val!==0)return{str:"",ano:"",mes:"",semana:"",dateObj:null};
  let d=null;
  if(typeof val==="number"){
    const ms=(val-25569)*86400000;
    d=new Date(ms);
    if(isNaN(d.getTime()))return{str:String(val),ano:"",mes:"",semana:"",dateObj:null};
  }else{
    const s=String(val).trim();
    if(/^\d{4}-\d{2}-\d{2}/.test(s))d=new Date(s);
    else if(/^\d{1,2}\/\d{1,2}\/\d{4}/.test(s)){const[dd,mm,yy]=s.split("/");d=new Date(+yy,+mm-1,+dd);}
    else if(/^\d{1,2}-[a-zA-Z]{3}/.test(s))d=new Date(s.replace(/-/g," "));
    else d=new Date(s);
    if(!d||isNaN(d.getTime()))return{str:s,ano:s.slice(-4)||s,mes:s,semana:"W01",dateObj:null};
  }
  const M=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const mn=d.getMonth(),yr=String(d.getFullYear());
  const mes=String(mn+1).padStart(2,"0")+"."+M[mn];
  const tmp=new Date(Date.UTC(d.getFullYear(),mn,d.getDate()));
  tmp.setUTCDate(tmp.getUTCDate()+4-(tmp.getUTCDay()||7));
  const wk=Math.ceil((((tmp-new Date(Date.UTC(tmp.getUTCFullYear(),0,1)))/86400000)+1)/7);
  return{str:`${String(d.getDate()).padStart(2,"0")}/${String(mn+1).padStart(2,"0")}/${yr}`,ano:yr,mes,semana:"W"+String(wk).padStart(2,"0"),dateObj:d};
}

function parseData(data,fileName){
  if(data.length<3){alert("Esperado: header linha 2, dados linha 3+.");return;}
  const hdr=data[1];const c={};
  for(const[f,keys]of Object.entries(CM))c[f]=fc(hdr,keys);
  raw=data.slice(2).filter(r=>r.some(v=>v!==""&&v!==null&&v!==undefined)).map(r=>{
    const dp=pd(r[c.data]);
    return{
      dataStr:dp.str,dateObj:dp.dateObj,ano:dp.ano,
      mes:(c.mes>=0?String(r[c.mes]??"").trim():"")||dp.mes,
      semana:(c.semana>=0?String(r[c.semana]??"").trim():"")||dp.semana,
      turno:         String(r[c.turno]??"").trim(),
      client:        String(r[c.client]??"").trim().toUpperCase(),
      planta:        String(r[c.planta]??"").trim(),
      modelo:        String(r[c.modelo]??"").trim(),
      suNumber:      String(r[c.suNumber]??"").trim(),
      qtdInsp:       tn(r[c.qtdInsp]),qtdReceb:tn(r[c.qtdReceb]),
      sampleSize:    tn(r[c.sampleSize]),
      status:        ns(r[c.status]),
      falhaDesc:     String(r[c.falhaDesc]??"").trim(),
      falhas:        tn(r[c.falhas]),
      inspetor:      String(r[c.inspetor]??"").trim().toUpperCase(),
      fornecedor:    String(r[c.fornecedor]??"").trim(),
      codMaterial:   String(r[c.codMaterial]??"").trim(),
      samplingSwitch:String(r[c.samplingSwitch]??"").trim().toUpperCase(),
      loteCode:      String(r[c.loteCode]??"").trim(),
      boardingNum:   String(r[c.boardingNum]??"").trim(),
    };
  }).filter(r=>r.client||r.modelo||r.dataStr);

  document.getElementById("lastFile").textContent=fileName;
  document.getElementById("statusText").textContent=`${raw.length.toLocaleString("pt-BR")} registros carregados`;
  buildFilters();
  ["fAno","fMes","fSemana","fTurno","fClient","fStatus"].forEach(id=>document.getElementById(id).value="Todos");
  buildInspSel();
  // Mostra UI ANTES de renderizar para garantir que aparece mesmo se animação falhar
  document.getElementById("uploadZone").style.display="none";
  document.getElementById("dashPage").style.display="flex";
  document.getElementById("tabBtns").style.display="flex";
  const sb=document.getElementById("sidebar");sb.classList.add("visible");sb.classList.remove("collapsed");
  document.getElementById("loadingOverlay").classList.remove("visible");
  applyFilters();
  safeAnimate(document.getElementById("dashPage"));
}

/* ════ FILTERS ════ */
function uniq(arr){return["Todos",...new Set(arr.filter(v=>v&&String(v).trim()&&v!=="—"))].sort();}
function fsel(id,opts){
  const cur=document.getElementById(id).value;
  document.getElementById(id).innerHTML=opts.map(o=>`<option value="${o}">${o}</option>`).join("");
  if(opts.includes(cur))document.getElementById(id).value=cur;
}
function buildFilters(){
  fsel("fAno",uniq(raw.map(r=>r.ano)));
  fsel("fMes",uniq(raw.map(r=>r.mes)));
  fsel("fSemana",uniq(raw.map(r=>r.semana)));
  fsel("fTurno",uniq(raw.map(r=>r.turno)));
  fsel("fClient",uniq(raw.map(r=>r.client)));
  fsel("fStatus",uniq(raw.map(r=>r.status)));
}
function clearFilters(){
  ["fAno","fMes","fSemana","fTurno","fClient","fStatus"].forEach(id=>document.getElementById(id).value="Todos");
  applyFilters();
}
function gv(id){return document.getElementById(id).value;}
function applyFilters(){
  const[ano,mes,sem,t,cli,st]=[gv("fAno"),gv("fMes"),gv("fSemana"),gv("fTurno"),gv("fClient"),gv("fStatus")];
  fil=raw.filter(r=>
    (ano==="Todos"||r.ano===ano)&&
    (mes==="Todos"||r.mes===mes)&&
    (sem==="Todos"||r.semana===sem)&&
    (t==="Todos"||r.turno===t)&&
    (cli==="Todos"||r.client===cli)&&
    (st==="Todos"||r.status===st)
  );
  renderDash();
}

/* ════ RENDER DASH ════ */
function renderDash(){renderKPI();renderClients();renderPie();renderInspTbl();renderBars();}

function renderKPI(){
  const tot=fil.length;
  const aprov=fil.filter(r=>r.status==="APROVADO").length;
  const reprov=fil.filter(r=>r.status==="REPROVADO").length;
  const taxaA=tot?aprov/tot*100:0;
  const totF=fil.reduce((s,r)=>s+r.falhas,0);
  const totIQ=fil.reduce((s,r)=>s+r.qtdInsp,0);
  const ppm=totIQ?(totF/totIQ)*1e6:0;
  const severa=fil.filter(r=>r.samplingSwitch==="SEVERA").length;

  // CORRIGIDO: usa max data dos dados, não new Date()
  let dias=0;
  const allDates=fil.filter(r=>r.dateObj).map(r=>r.dateObj);
  const maxDate=allDates.length?new Date(Math.max(...allDates)):null;
  const rd=fil.filter(r=>r.status==="REPROVADO"&&r.dateObj).map(r=>r.dateObj);
  if(!rd.length){
    const minDate=allDates.length?new Date(Math.min(...allDates)):null;
    if(maxDate&&minDate)dias=Math.floor((maxDate-minDate)/86400000);
  }else{
    if(maxDate)dias=Math.floor((maxDate-new Date(Math.max(...rd)))/86400000);
  }

  animateCounter("kpiTotal",tot);
  animateCounter("kpiAprov",aprov);
  animateCounter("kpiRej",reprov);
  document.getElementById("kpiTaxaA").textContent=fp(taxaA);
  document.getElementById("kpiPPM").textContent=Math.round(ppm).toLocaleString("pt-BR");
  animateCounter("kpiDias",dias);
  animateCounter("kpiSevera",severa);
}

function animateCounter(id,target){
  const el=document.getElementById(id);
  if(!el)return;
  const start=parseInt(el.textContent.replace(/\D/g,""))||0;
  const obj={val:start};
  if(!GSAP){el.textContent=fn(target);return;}
  GSAP.to(obj,{val:target,duration:0.7,ease:"power2.out",onUpdate:()=>{
    el.textContent=fn(Math.round(obj.val));
  }});
}

function renderClients(){
  const clients=[...new Set(raw.map(r=>r.client))].filter(Boolean).sort();
  const fm={},sm={};
  fil.forEach(r=>{
    fm[r.client]=(fm[r.client]||0)+r.falhas;
    sm[r.client]=(sm[r.client]||0)+1;
  });
  document.getElementById("clientGrid").innerHTML=clients.map((c,idx)=>{
    const f=fm[c]||0,sus=sm[c]||0;
    const bg=(CS[c]||{bg:"#1e3a8a"}).bg;
    const lineColor=f>0?"var(--red)":bg;
    return`<div class="cc ${f>0?"fail":""}" style="animation-delay:${idx*0.04}s">
      <div class="cc-line" style="background:${lineColor}"></div>
      <div class="cc-badge" style="background:${bg}">${c}</div>
      <div class="cc-mid">
        <div class="cc-num ${f>0?"r":""}">${f}</div>
        <div class="cc-sub">Falhas</div>
      </div>
      <div class="cc-sep"></div>
      <div class="cc-sus">
        <div class="cc-sus-num">${fn(sus)}</div>
        <div class="cc-sub">sus</div>
      </div>
    </div>`;
  }).join("");
}

/* ── PIE ── */
function renderPie(){
  const tm={};fil.forEach(r=>{const t=ntu(r.turno);tm[t]=(tm[t]||0)+r.qtdInsp;});
  const labels=Object.keys(tm),values=Object.values(tm);
  const total=values.reduce((s,v)=>s+v,0)||1;
  if(pie)pie.destroy();
  const insideLabel={id:"insideLabel",afterDraw(chart){
    const{ctx}=chart;const ds=chart.getDatasetMeta(0);
    ds.data.forEach((arc,i)=>{
      const v=chart.data.datasets[0].data[i];if(v===0)return;
      const pct=(v/total*100).toFixed(1);
      const midAngle=(arc.startAngle+arc.endAngle)/2;
      const r2=(arc.innerRadius+arc.outerRadius)/2;
      const x=arc.x+Math.cos(midAngle)*r2,y=arc.y+Math.sin(midAngle)*r2;
      ctx.save();ctx.font="600 12px 'Barlow Condensed'";ctx.fillStyle="#ffffff";
      ctx.textAlign="center";ctx.textBaseline="middle";
      ctx.shadowColor="rgba(0,0,0,.9)";ctx.shadowBlur=5;
      ctx.fillText(`${chart.data.labels[i]}  ${pct}%`,x,y);ctx.restore();
    });
  }};
  pie=new Chart(document.getElementById("pieChart"),{
    type:"doughnut",
    data:{labels,datasets:[{data:values,backgroundColor:["#1a7fe8","#0d47a1","#22c55e","#f59e0b"],borderColor:"#070c18",borderWidth:3,hoverOffset:6}]},
    options:{responsive:true,maintainAspectRatio:false,cutout:"45%",layout:{padding:8},
      plugins:{
        legend:{position:"bottom",labels:{color:"#fff",font:{family:"'Barlow Condensed'",size:13,weight:"600"},padding:16,boxWidth:14,
          generateLabels(chart){return chart.data.labels.map((l,i)=>({text:`${l}  •  ${(chart.data.datasets[0].data[i]/total*100).toFixed(1)}%`,fillStyle:chart.data.datasets[0].backgroundColor[i],strokeStyle:"transparent",lineWidth:0,index:i,hidden:false,fontColor:"#fff",color:"#fff"}));}}},
        tooltip:{...TC,callbacks:{label:ctx=>`${ctx.label}: ${fn(ctx.raw)} (${(ctx.raw/total*100).toFixed(2)}%)`}}
      }},plugins:[insideLabel]
  });
}
function ntu(t){const s=String(t).trim();if(/1/.test(s))return"1º";if(/2/.test(s))return"2º";if(/3/.test(s))return"3º";return s||"—";}

/* ── INSPECTOR TABLE ── */
function renderInspTbl(){
  const map={};
  fil.forEach(r=>{
    const k=r.inspetor||"—";
    if(!map[k])map[k]={sus:0,vol:0,smpl:0,days:new Set()};
    map[k].sus++;map[k].vol+=r.qtdInsp;map[k].smpl+=r.sampleSize;
    if(r.dataStr)map[k].days.add(r.dataStr);
  });
  let tS=0,tV=0,tSm=0;
  const rows=Object.entries(map).map(([n,v])=>{
    tS+=v.sus;tV+=v.vol;tSm+=v.smpl;
    return{n,sus:v.sus,vol:v.vol,smpl:v.smpl,avg:v.sus/Math.max(v.days.size,1)};
  }).sort((a,b)=>b.sus-a.sus);
  document.getElementById("inspBody").innerHTML=rows.map(r=>{
    const p=tS?r.sus/tS*100:0;
    return`<tr>
      <td>${r.n}</td><td class="r">${fn(r.sus)}</td><td class="r">${fn(r.vol)}</td>
      <td class="r">${fn(r.smpl)}</td><td class="r">${fn(Math.round(r.avg))}</td>
      <td class="r"><div class="pb"><div class="pt2"><div class="pf" style="width:${p}%"></div></div><span>${fp(p)}</span></div></td>
    </tr>`;
  }).join("");
  document.getElementById("inspFoot").innerHTML=`<tr>
    <td>Total</td><td class="r">${fn(tS)}</td><td class="r">${fn(tV)}</td>
    <td class="r">${fn(tSm)}</td><td class="r">—</td><td class="r">100,0%</td></tr>`;
}

/* ── BAR CHARTS ── */
const tlp={id:"tl",afterDatasetDraw(chart){
  const{ctx,data,scales:{x,y}}=chart;if(!x||!y)return;
  data.datasets[0].data.forEach((v,i)=>{
    const xp=x.getPixelForValue(i),yp=y.getPixelForValue(v)-6;
    ctx.save();ctx.font="10px 'Share Tech Mono'";ctx.fillStyle="#fff";
    ctx.textAlign="center";ctx.textBaseline="bottom";
    ctx.fillText(fn(v),xp,yp);ctx.restore();
  });
}};

function renderBars(){
  const im={},rm={};
  fil.forEach(r=>{im[r.client]=(im[r.client]||0)+r.qtdInsp;rm[r.client]=(rm[r.client]||0)+r.qtdReceb;});
  mkBar("barInsp",im,"Vol. Insp.");mkBar("barReceb",rm,"Vol. Receb.");
}
function mkBar(id,map,label){
  const s=Object.entries(map).sort((a,b)=>b[1]-a[1]);
  const lbls=s.map(x=>x[0]),vals=s.map(x=>x[1]);
  if(bars[id])bars[id].destroy();
  bars[id]=new Chart(document.getElementById(id),{
    type:"bar",
    data:{labels:lbls,datasets:[{label,data:vals,
      backgroundColor:lbls.map(l=>(CS[l]||{bg:"#2196f3"}).bg),
      borderRadius:4,borderSkipped:false}]},
    options:{responsive:true,maintainAspectRatio:false,layout:{padding:{top:22}},
      plugins:{legend:{display:false},tooltip:{...TC,callbacks:{label:ctx=>`${label}: ${fn(ctx.raw)}`}}},
      scales:{
        x:{ticks:{color:"#fff",font:{size:10,family:"'Share Tech Mono'"}},grid:{color:"rgba(26,50,96,.3)"},border:{color:"rgba(26,50,96,.5)"}},
        y:{ticks:{color:"#fff",font:{size:10,family:"'Share Tech Mono'"},callback:v=>v>=1e6?(v/1e6).toFixed(1)+"M":v>=1e3?(v/1e3).toFixed(0)+"K":v},grid:{color:"rgba(26,50,96,.3)"},border:{color:"rgba(26,50,96,.5)"}}
      }},plugins:[tlp]
  });
}

/* ════ TENDÊNCIA PAGE ════ */
function renderTendencia(){
  renderTrend();
  renderSamplingChart();
  renderMonthlyBar();
  renderInspMonthChart();
}

function renderTrend(){
  const wkMap={};
  fil.forEach(r=>{
    const s=r.semana||"";if(!s)return;
    if(!wkMap[s])wkMap[s]={sus:0,vol:0};
    wkMap[s].sus++;wkMap[s].vol+=r.qtdInsp;
  });
  const weeks=Object.keys(wkMap).filter(w=>wkMap[w].vol>100).sort((a,b)=>{
    const na=parseInt(a.replace(/\D/g,""))||0,nb=parseInt(b.replace(/\D/g,""))||0;return na-nb;
  });
  if(!weeks.length)return;
  const suVals=weeks.map(w=>wkMap[w].sus),volVals=weeks.map(w=>wkMap[w].vol);
  if(trendChart)trendChart.destroy();
  const ctx=document.getElementById("trendChart").getContext("2d");
  const gSU=ctx.createLinearGradient(0,0,0,260);
  gSU.addColorStop(0,"rgba(26,127,232,.30)");gSU.addColorStop(1,"rgba(26,127,232,0)");
  const gVol=ctx.createLinearGradient(0,0,0,260);
  gVol.addColorStop(0,"rgba(34,197,94,.20)");gVol.addColorStop(1,"rgba(34,197,94,0)");
  const pointLabelPlugin={id:"pointLabels",afterDatasetsDraw(chart){
    const{ctx:c,chartArea:{left,right,top,bottom},data}=chart;
    data.datasets.forEach((ds,di)=>{
      const meta=chart.getDatasetMeta(di);const isSU=di===0;
      const color=isSU?"#1a7fe8":"#22c55e";
      meta.data.forEach((pt,i)=>{
        const val=ds.data[i];if(val==null||val===0)return;
        const txt=Math.round(val).toLocaleString("pt-BR");
        c.save();c.font=`600 10px 'Share Tech Mono',monospace`;c.fillStyle=color;
        c.shadowColor="rgba(0,0,0,.9)";c.shadowBlur=5;
        const tw=c.measureText(txt).width;let ax=pt.x,align="center";
        if(pt.x-tw/2<left+2){ax=left+tw/2+2;align="left";}
        else if(pt.x+tw/2>right-2){ax=right-tw/2-2;align="right";}
        c.textAlign=align;
        let ay=isSU?pt.y-14:pt.y+16;
        if(isSU&&ay<top+8)ay=pt.y+14;
        if(!isSU&&ay>bottom-4)ay=pt.y-14;
        c.fillText(txt,ax,ay);c.restore();
      });
    });
  }};
  trendChart=new Chart(ctx,{
    type:"line",plugins:[pointLabelPlugin],
    data:{labels:weeks,datasets:[
      {label:"SUs",data:suVals,yAxisID:"ySU",borderColor:"#1a7fe8",backgroundColor:gSU,borderWidth:2.5,pointRadius:5,pointHoverRadius:9,pointBackgroundColor:"#1a7fe8",pointBorderColor:"#070c18",pointBorderWidth:2,fill:true,tension:.35},
      {label:"Vol. Insp.",data:volVals,yAxisID:"yVol",borderColor:"#22c55e",backgroundColor:gVol,borderWidth:2.5,borderDash:[6,4],pointRadius:5,pointHoverRadius:9,pointBackgroundColor:"#22c55e",pointBorderColor:"#070c18",pointBorderWidth:2,fill:true,tension:.35}
    ]},
    options:{responsive:true,maintainAspectRatio:false,interaction:{mode:"index",intersect:false},
      layout:{padding:{top:32,right:20,bottom:22,left:4}},
      plugins:{legend:{display:false},tooltip:{...TC,callbacks:{label:ctx=>{
        if(ctx.datasetIndex===0)return` SUs: ${Math.round(ctx.raw).toLocaleString("pt-BR")}`;
        return` Volume: ${Math.round(ctx.raw).toLocaleString("pt-BR")}`;
      }}}},
      scales:{
        x:{ticks:{color:"#fff",font:{size:11,family:"'Share Tech Mono'"},maxRotation:0},grid:{color:"rgba(26,50,96,.25)"},border:{color:"rgba(26,50,96,.4)"}},
        ySU:{type:"linear",position:"left",ticks:{color:"#1a7fe8",font:{size:10,family:"'Share Tech Mono'"},callback:v=>Number.isInteger(v)?Math.round(v).toLocaleString("pt-BR"):""},grid:{color:"rgba(26,127,232,.12)"},border:{color:"rgba(26,127,232,.3)"},title:{display:true,text:"SUs",color:"rgba(26,127,232,.7)",font:{size:10,family:"'Share Tech Mono'"}}},
        yVol:{type:"linear",position:"right",ticks:{color:"#22c55e",font:{size:10,family:"'Share Tech Mono'"},callback:v=>fns(v)},grid:{drawOnChartArea:false},border:{color:"rgba(34,197,94,.3)"},title:{display:true,text:"Volume",color:"rgba(34,197,94,.7)",font:{size:10,family:"'Share Tech Mono'"}}}
      }}
  });
}

function renderSamplingChart(){
  const sm={};fil.forEach(r=>{const s=r.samplingSwitch||"N/D";sm[s]=(sm[s]||0)+1;});
  const labels=Object.keys(sm),values=Object.values(sm);
  const total=values.reduce((a,b)=>a+b,0)||1;
  if(samplingChart)samplingChart.destroy();
  const insideLbl={id:"insideLbl2",afterDraw(chart){
    const{ctx}=chart;const ds=chart.getDatasetMeta(0);
    ds.data.forEach((arc,i)=>{
      const v=chart.data.datasets[0].data[i];if(v===0)return;
      const pct=(v/total*100).toFixed(1);
      const midAngle=(arc.startAngle+arc.endAngle)/2;
      const r2=(arc.innerRadius+arc.outerRadius)/2;
      const x=arc.x+Math.cos(midAngle)*r2,y=arc.y+Math.sin(midAngle)*r2;
      ctx.save();ctx.font="600 12px 'Barlow Condensed'";ctx.fillStyle="#fff";
      ctx.textAlign="center";ctx.textBaseline="middle";
      ctx.shadowColor="rgba(0,0,0,.9)";ctx.shadowBlur=5;
      ctx.fillText(`${chart.data.labels[i]}  ${pct}%`,x,y);ctx.restore();
    });
  }};
  samplingChart=new Chart(document.getElementById("samplingChart"),{
    type:"doughnut",
    data:{labels,datasets:[{data:values,backgroundColor:["#ef4444","#22c55e","#f59e0b","#1a7fe8"],borderColor:"#070c18",borderWidth:3,hoverOffset:6}]},
    options:{responsive:true,maintainAspectRatio:false,cutout:"45%",layout:{padding:8},
      plugins:{
        legend:{position:"bottom",labels:{color:"#fff",font:{family:"'Barlow Condensed'",size:13,weight:"600"},padding:14,boxWidth:14,
          generateLabels(chart){return chart.data.labels.map((l,i)=>({text:`${l}  •  ${(chart.data.datasets[0].data[i]/total*100).toFixed(1)}%`,fillStyle:chart.data.datasets[0].backgroundColor[i],strokeStyle:"transparent",lineWidth:0,index:i,hidden:false,fontColor:"#fff",color:"#fff"}));}}},
        tooltip:{...TC,callbacks:{label:ctx=>`${ctx.label}: ${fn(ctx.raw)} (${(ctx.raw/total*100).toFixed(1)}%)`}}
      }},plugins:[insideLbl]
  });
}

function renderMonthlyBar(){
  const mm={};
  fil.forEach(r=>{if(r.mes)mm[r.mes]=(mm[r.mes]||0)+1;});
  const sorted=Object.entries(mm).sort((a,b)=>a[0].localeCompare(b[0]));
  const lbls=sorted.map(x=>x[0]),vals=sorted.map(x=>x[1]);
  if(monthlyBar)monthlyBar.destroy();
  monthlyBar=new Chart(document.getElementById("monthlyBar"),{
    type:"bar",
    data:{labels:lbls,datasets:[{label:"SUs",data:vals,
      backgroundColor:lbls.map((_,i)=>`hsl(${210+i*25},70%,${45+i*5}%)`),
      borderRadius:5,borderSkipped:false}]},
    options:{responsive:true,maintainAspectRatio:false,layout:{padding:{top:22}},
      plugins:{legend:{display:false},tooltip:{...TC,callbacks:{label:ctx=>`SUs: ${fn(ctx.raw)}`}}},
      scales:{
        x:{ticks:{color:"#fff",font:{size:11,family:"'Share Tech Mono'"}},grid:{color:"rgba(26,50,96,.3)"},border:{color:"rgba(26,50,96,.5)"}},
        y:{ticks:{color:"#fff",font:{size:10,family:"'Share Tech Mono'"}},grid:{color:"rgba(26,50,96,.3)"},border:{color:"rgba(26,50,96,.5)"}}
      }},plugins:[tlp]
  });
}

function renderInspMonthChart(){
  const inspetores=[...new Set(fil.map(r=>r.inspetor))].filter(Boolean).sort();
  const meses=[...new Set(fil.map(r=>r.mes))].filter(Boolean).sort();
  const datasets=inspetores.map((insp,i)=>{
    const color=INSP_COLORS[i%INSP_COLORS.length];
    return{
      label:insp,
      data:meses.map(m=>fil.filter(r=>r.inspetor===insp&&r.mes===m).length),
      borderColor:color,backgroundColor:color+"33",
      borderWidth:2,pointRadius:4,pointHoverRadius:7,
      pointBackgroundColor:color,tension:.35,fill:false
    };
  });
  if(inspMonthChart)inspMonthChart.destroy();
  inspMonthChart=new Chart(document.getElementById("inspMonthChart"),{
    type:"line",
    data:{labels:meses,datasets},
    options:{responsive:true,maintainAspectRatio:false,interaction:{mode:"index",intersect:false},
      layout:{padding:{top:16,right:16}},
      plugins:{
        legend:{position:"bottom",labels:{color:"#fff",font:{family:"'Barlow Condensed'",size:12},padding:12,boxWidth:14}},
        tooltip:{...TC}
      },
      scales:{
        x:{ticks:{color:"#fff",font:{size:11,family:"'Share Tech Mono'"}},grid:{color:"rgba(26,50,96,.25)"},border:{color:"rgba(26,50,96,.4)"}},
        y:{ticks:{color:"#fff",font:{size:10,family:"'Share Tech Mono'"},callback:v=>Number.isInteger(v)?v:""},grid:{color:"rgba(26,50,96,.25)"},border:{color:"rgba(26,50,96,.4)"}}
      }}
  });
}

/* ════ INSPECTOR PROFILE ════ */
function buildInspSel(){
  const ins=[...new Set(raw.map(r=>r.inspetor))].filter(Boolean).sort();
  document.getElementById("inspSelect").innerHTML=ins.map(i=>`<option value="${i}">${i}</option>`).join("");
}
function renderInspProfile(){
  const nome=document.getElementById("inspSelect").value;if(!nome)return;
  const d=raw.filter(r=>r.inspetor===nome);if(!d.length)return;
  const tot=d.length,vi=d.reduce((s,r)=>s+r.qtdInsp,0),vr=d.reduce((s,r)=>s+r.qtdReceb,0);
  const ap=d.filter(r=>r.status==="APROVADO").length,rp=d.filter(r=>r.status==="REPROVADO").length;
  const ta=tot?ap/tot*100:0,dias=[...new Set(d.filter(r=>r.dataStr).map(r=>r.dataStr))].length;
  const sevI=d.filter(r=>r.samplingSwitch==="SEVERA").length;
  document.getElementById("inspKpiRow").innerHTML=`
    <div class="ikpi"><div class="ic">🔍</div><div class="iv">${fn(tot)}</div><div class="il">Total SUs</div></div>
    <div class="ikpi"><div class="ic">📦</div><div class="iv">${fn(vi)}</div><div class="il">Vol. Inspecionado</div></div>
    <div class="ikpi"><div class="ic">📬</div><div class="iv">${fn(vr)}</div><div class="il">Vol. Recebido</div></div>
    <div class="ikpi"><div class="ic">✅</div><div class="iv g">${fp(ta)}</div><div class="il">Taxa Aprovação</div></div>
    <div class="ikpi"><div class="ic">❌</div><div class="iv r">${fn(rp)}</div><div class="il">Rejeitados</div></div>
    <div class="ikpi"><div class="ic">📅</div><div class="iv">${fn(Math.round(tot/Math.max(dias,1)))}</div><div class="il">Média Diária</div></div>
    <div class="ikpi"><div class="ic">🔬</div><div class="iv c">${fn(sevI)}</div><div class="il">Inspeção Severa</div></div>`;
  const turnos=[...new Set(d.map(r=>r.turno))].filter(Boolean).join(", ");
  const cls=[...new Set(d.map(r=>r.client))].filter(Boolean).sort().join(", ");
  document.getElementById("inspInfo").innerHTML=`
    <div class="info-row"><span class="ik">Clientes</span><span class="iw" style="font-size:10px;">${cls}</span></div>
    <div class="info-row"><span class="ik">Turnos</span><span class="iw">${turnos}</span></div>
    <div class="info-row"><span class="ik">Vol. Inspecionado</span><span class="iw">${fn(vi)}</span></div>
    <div class="info-row"><span class="ik">Vol. Recebido</span><span class="iw">${fn(vr)}</span></div>
    <div class="info-row"><span class="ik">Inspeção Severa</span><span class="iw">${fn(sevI)} (${fp(tot?sevI/tot*100:0)})</span></div>`;
  const cm={};d.forEach(r=>{cm[r.client]=(cm[r.client]||0)+1;});
  const cst=Object.entries(cm).sort((a,b)=>b[1]-a[1]);const mx=cst[0]?.[1]||1;
  document.getElementById("inspClients").innerHTML=cst.map(([c,n])=>`
    <div class="cbar"><div class="cbar-name">${c}</div>
      <div class="cbar-track"><div class="cbar-fill" style="width:${(n/mx*100).toFixed(1)}%"></div></div>
      <div class="cbar-pct">${fn(n)} (${(n/tot*100).toFixed(1)}%)</div></div>`).join("");

  // Evolução mensal do inspetor
  const meses=[...new Set(raw.map(r=>r.mes))].filter(Boolean).sort();
  const evol=meses.map(m=>d.filter(r=>r.mes===m).length);
  if(inspEvolChart)inspEvolChart.destroy();
  const color="#1a7fe8";
  const ctx2=document.getElementById("inspEvolChart").getContext("2d");
  const g=ctx2.createLinearGradient(0,0,0,200);
  g.addColorStop(0,"rgba(26,127,232,.3)");g.addColorStop(1,"rgba(26,127,232,0)");
  inspEvolChart=new Chart(ctx2,{
    type:"line",
    data:{labels:meses,datasets:[{label:"SUs",data:evol,borderColor:color,backgroundColor:g,borderWidth:2.5,pointRadius:5,pointHoverRadius:8,pointBackgroundColor:color,pointBorderColor:"#070c18",pointBorderWidth:2,fill:true,tension:.35}]},
    options:{responsive:true,maintainAspectRatio:false,interaction:{mode:"index",intersect:false},layout:{padding:{top:20,right:16}},
      plugins:{legend:{display:false},tooltip:{...TC,callbacks:{label:ctx=>`SUs: ${Math.round(ctx.raw)}`}}},
      scales:{
        x:{ticks:{color:"#fff",font:{size:11,family:"'Share Tech Mono'"}},grid:{color:"rgba(26,50,96,.25)"},border:{color:"rgba(26,50,96,.4)"}},
        y:{ticks:{color:"#fff",font:{size:10,family:"'Share Tech Mono'"},callback:v=>Number.isInteger(v)?v:""},grid:{color:"rgba(26,50,96,.25)"},border:{color:"rgba(26,50,96,.4)"}}
      }}
  });

  const sorted=[...d].sort((a,b)=>(!a.dateObj?1:!b.dateObj?-1:b.dateObj-a.dateObj));
  document.getElementById("inspRecent").innerHTML=sorted.map(r=>`
    <tr>
      <td>${r.dataStr||"—"}</td><td>${r.client||"—"}</td>
      <td title="${r.modelo||""}">${r.modelo||"—"}</td>
      <td class="r">${ntu(r.turno)}</td><td class="r">${fn(r.qtdInsp)}</td>
      <td><span class="${r.status==="APROVADO"?"tok":"tnok"}">${r.status}</span></td>
      <td title="${r.suNumber||""}">${r.suNumber||"—"}</td>
      <td title="${r.falhaDesc||""}" style="opacity:.8;">${r.falhaDesc||"Não houve falhas"}</td>
    </tr>`).join("");
}

/* ════ FORNECEDORES PAGE ════ */
function renderFornecedores(){
  const map={};
  fil.forEach(r=>{
    const f=r.fornecedor||"N/D";
    if(!map[f])map[f]={sus:0,vol:0,receb:0,smpl:0};
    map[f].sus++;map[f].vol+=r.qtdInsp;map[f].receb+=r.qtdReceb;map[f].smpl+=r.sampleSize;
  });
  const sorted=Object.entries(map).sort((a,b)=>b[1].vol-a[1].vol);
  const totalSus=sorted.reduce((s,[,v])=>s+v.sus,0)||1;
  const totalForn=sorted.length;
  const topForn=sorted[0]?.[0]||"—";
  const totalVol=sorted.reduce((s,[,v])=>s+v.vol,0);

  document.getElementById("fornKpiRow").innerHTML=`
    <div class="forn-kpi"><div class="ic">🏭</div><div class="iv">${fn(totalForn)}</div><div class="il">Total Fornecedores</div></div>
    <div class="forn-kpi"><div class="ic">📦</div><div class="iv">${fns(totalVol)}</div><div class="il">Vol. Total Inspecionado</div></div>
    <div class="forn-kpi"><div class="ic">🥇</div><div class="iv" style="font-size:14px;line-height:1.2;">${topForn.slice(0,25)}</div><div class="il">Maior Volume</div></div>`;

  // Bar chart top 15 — horizontal, labels completos
  const top15=sorted.slice(0,15);
  const lbls=top15.map(([k])=>k.length>30?k.slice(0,28)+"…":k);
  const vals=top15.map(([,v])=>v.vol);
  const hlp={id:"hl",afterDatasetDraw(chart){
    const{ctx,data,scales:{x,y}}=chart;if(!x||!y)return;
    data.datasets[0].data.forEach((v,i)=>{
      const xp=x.getPixelForValue(v)+5,yp=y.getPixelForValue(i);
      ctx.save();ctx.font="bold 10px 'Share Tech Mono'";ctx.fillStyle="#fff";
      ctx.textAlign="left";ctx.textBaseline="middle";
      ctx.fillText(fns(v),xp,yp);ctx.restore();
    });
  }};
  if(fornBarChart)fornBarChart.destroy();
  fornBarChart=new Chart(document.getElementById("fornBarChart"),{
    type:"bar",
    data:{labels:lbls,datasets:[{label:"Vol. Insp.",data:vals,
      backgroundColor:vals.map((_,i)=>`hsl(${200+i*8},65%,${50-i*1.5}%)`),
      borderRadius:4,borderSkipped:false}]},
    options:{responsive:true,maintainAspectRatio:false,indexAxis:"y",
      layout:{padding:{right:110}},
      plugins:{legend:{display:false},tooltip:{...TC,callbacks:{label:ctx=>`Vol. Insp.: ${fn(ctx.raw)}`}}},
      scales:{
        x:{ticks:{color:"#fff",font:{size:9,family:"'Share Tech Mono'"},callback:v=>fn(v),maxTicksLimit:6},grid:{color:"rgba(26,50,96,.25)"},border:{color:"rgba(26,50,96,.4)"}},
        y:{ticks:{color:"#fff",font:{size:10,family:"'Share Tech Mono'"}},grid:{color:"rgba(26,50,96,.15)"},border:{color:"rgba(26,50,96,.4)"},afterFit(s){s.width=210;}}
      }},plugins:[hlp]
  });

  // Table
  document.getElementById("fornBody").innerHTML=sorted.map(([nome,v])=>{
    const p=totalSus?v.sus/totalSus*100:0;
    const nomeCurto=nome.length>35?nome.slice(0,33)+"…":nome;
    return`<tr>
      <td title="${nome}">${nomeCurto}</td>
      <td class="r">${fn(v.sus)}</td>
      <td class="r">${fns(v.vol)}</td>
      <td class="r">${fns(v.receb)}</td>
      <td class="r"><div class="pb"><div class="pt2"><div class="pf" style="width:${p}%"></div></div><span>${Math.round(p)}%</span></div></td>
    </tr>`;
  }).join("");
}

/* ════ SU MATRIX ════ */
const SU_COLS=[
  {k:"dataStr",   l:"Data"},
  {k:"suNumber",  l:"SU Number"},
  {k:"client",    l:"Cliente"},
  {k:"modelo",    l:"Modelo"},
  {k:"turno",     l:"Turno"},
  {k:"inspetor",  l:"Inspetor"},
  {k:"status",    l:"Status"},
  {k:"qtdInsp",   l:"Qtd. Insp.",r:true,num:true},
  {k:"qtdReceb",  l:"Qtd. Receb.",r:true,num:true},
  {k:"sampleSize",l:"Amostra",r:true,num:true},
  {k:"falhas",    l:"Falhas",r:true,num:true},
  {k:"falhaDesc", l:"Descrição da Falha"},
  {k:"fornecedor",l:"Fornecedor"},
  {k:"loteCode",  l:"Lote Code"},
  {k:"boardingNum",l:"Boarding Nº"},
  {k:"samplingSwitch",l:"Sampling"},
  {k:"codMaterial",l:"Cód. Material"},
];
function renderSuMatrix(){
  const q=(document.getElementById("suSearch").value||"").toLowerCase().trim();
  // CORRIGIDO: busca em fil (filtrado) não em raw
  let data=q?fil.filter(r=>Object.values(r).some(v=>String(v).toLowerCase().includes(q))):fil;
  document.getElementById("suCount").textContent=`${data.length.toLocaleString("pt-BR")} registros`;
  document.getElementById("suHead").innerHTML=SU_COLS.map((c,i)=>`
    <th class="${c.r?"r":""} ${suSortCol===i?"sorted":""}" onclick="sortSu(${i})" style="cursor:pointer;">
      ${c.l} <span class="sort-ico">${suSortCol===i?(suSortDir===1?"▲":"▼"):"⇅"}</span>
    </th>`).join("");
  const show=data.slice(0,500);
  document.getElementById("suBody").innerHTML=show.map(r=>`<tr>${
    SU_COLS.map(c=>{
      let v=r[c.k];
      if(c.k==="status")return`<td><span class="${v==="APROVADO"?"tok":v==="REPROVADO"?"tnok":""}" style="font-size:9px;">${v}</span></td>`;
      if(c.k==="samplingSwitch")return`<td><span class="samp-badge ${v==="SEVERA"?"samp-sev":"samp-nor"}">${v||"—"}</span></td>`;
      if(c.num)return`<td class="r">${fn(v)}</td>`;
      return`<td class="${c.r?"r":""}" title="${v}">${v||"—"}</td>`;
    }).join("")
  }</tr>`).join("");
  if(data.length>500){
    document.getElementById("suBody").innerHTML+=`<tr><td colspan="${SU_COLS.length}" style="text-align:center;opacity:.5;padding:10px;font-size:10px;">Mostrando 500 de ${fn(data.length)} — use filtros ou pesquisa para refinar</td></tr>`;
  }
}
function sortSu(i){
  const c=SU_COLS[i];
  if(suSortCol===i)suSortDir*=-1;else{suSortCol=i;suSortDir=1;}
  // CORRIGIDO: ordena fil não raw
  fil.sort((a,b)=>{
    let va=a[c.k],vb=b[c.k];
    if(c.num)return(va-vb)*suSortDir;
    return String(va||"").localeCompare(String(vb||""))*suSortDir;
  });
  renderSuMatrix();
}

/* ════ UTILS ════ */
function fn(n){return Math.round(n).toLocaleString("pt-BR");}
function fp(n){return n.toFixed(1).replace(".",",")+"%";}
function fns(n){return fn(n);}
