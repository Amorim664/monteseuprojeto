
const $=id=>document.getElementById(id);
const KEY="porta-paletes-v1";
let data=[],editId=null,selId=null,art=null,pubT;
try{data=JSON.parse($("db").textContent||"[]")}catch(e){data=[]}
if(!data.length){try{data=JSON.parse(localStorage.getItem(KEY)||"[]")}catch(e){data=[]}}
const README=`# Estruturas Porta-Paletes

Aplicação web (HTML, CSS e JavaScript, sem servidor) para cadastrar, pesquisar e exportar estruturas de porta-paletes, com visual 3D.

## Arquitetura
- index.html: marcação da página e banco de dados embutido (bloco script#db, em JSON)
- css/estilos.css: estilos (tema claro e escuro)
- js/app.js: lógica (formulário, cálculos, desenho 3D com Three.js, listagem e pesquisa, exportação Excel com SheetJS, geração deste ZIP com JSZip)
- data/estruturas.json: cópia dos dados no momento do download

## Banco de dados
Os registros ficam dentro do próprio código (bloco JSON do index.html). Na versão publicada, cada gravação regenera o código da página já com os dados novos. Fora dela, as gravações ficam no localStorage do navegador; para torná-las permanentes, copie o conteúdo de data/estruturas.json para o bloco script#db do index.html.

## Cálculos
- Níveis = arredondar(altura total / distanciamento informado), mínimo 1
- Espaçamento ajustado = altura total / níveis
- Metragem total = comprimento do módulo x quantidade de módulos
- Com mais de uma estrutura, elas ficam lado a lado, separadas pelo distanciamento entre estruturas

## Executar
Abra index.html no navegador (requer internet para carregar Three.js, SheetJS e JSZip via cdnjs).
`;
function buildHtml(split){
  const c=document.documentElement.cloneNode(true),out={};
  c.querySelector("#db").textContent=JSON.stringify(data).replace(/</g,"\\u003c");
  c.querySelectorAll("script").forEach(x=>{const k=x.src&&x.src.startsWith("https://cdnjs.cloudflare.com");if(!k&&!x.hasAttribute("data-keep")&&x.id!=="db")x.remove()});
  c.querySelector("#tb").innerHTML="";
  const cv=c.querySelector("#c3d canvas");if(cv)cv.remove();
  ["#lab","#calc","#st"].forEach(q=>c.querySelector(q).textContent="");
  c.querySelector("#ft").textContent="Novo cadastro";c.querySelector("#save").textContent="Salvar";
  c.querySelector("#wd").setAttribute("style","display:none");
  if(split){
    const st=c.querySelector("style"),ap=c.querySelector("script[data-keep]");
    out.css=st.textContent;out.js=ap.textContent;
    const l=document.createElement("link");l.rel="stylesheet";l.href="css/estilos.css";st.replaceWith(l);
    ap.removeAttribute("data-keep");ap.textContent="";ap.setAttribute("src","js/app.js");
  }
  out.html="<!DOCTYPE html>\n"+c.outerHTML;return out;
}
async function publishSelf(){
  try{
    if(!art)art=await claude.use("artifact");
    if(!art){$("st").textContent="Salvo apenas neste navegador (publicação indisponível para este usuário).";return}
    $("st").textContent="Gravando no código da página...";
    await art.publish(buildHtml(false).html);
  }catch(e){$("st").textContent="Salvo apenas neste navegador."}
}
function persist(){
  try{localStorage.setItem(KEY,JSON.stringify(data))}catch(e){}
  clearTimeout(pubT);pubT=setTimeout(publishSelf,400);
}
async function saveFile(name,blob){
  try{
    let dl=null;try{dl=await claude.use("downloads")}catch(e){}
    if(dl){await dl.save({filename:name,data:blob});return}
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;a.click();
  }catch(e){if(!e||e.code!=="declined")alert("Não foi possível salvar o arquivo.")}
}
const n=v=>parseFloat(v)||0;
const f=v=>v.toFixed(2).replace(".",",");

function calc(d){
  const niveis=Math.max(1,Math.round(d.altura/Math.max(d.dist,0.1)));
  return {niveis,real:d.altura/niveis,total:d.comp*d.mods};
}
function cur(){return{altura:n($("altura").value),dist:n($("dist").value),comp:n($("comp").value),larg:n($("larg").value),mods:Math.max(1,Math.floor(n($("mods").value))),qtd:Math.max(1,Math.floor(n($("qtd").value))),de:n($("de").value)}}

let R,S,C,grp,az=-0.65,el=0.38,zm=1,tgt=new THREE.Vector3(),rad=10,ok=true;
function render3(){
  if(!R)return;
  C.position.set(tgt.x+rad*zm*Math.cos(el)*Math.sin(az),tgt.y+rad*zm*Math.sin(el),tgt.z+rad*zm*Math.cos(el)*Math.cos(az));
  C.lookAt(tgt);R.render(S,C);
}
function init3d(){
  const box=$("c3d");
  try{R=new THREE.WebGLRenderer({antialias:true,alpha:true})}catch(e){ok=false;box.insertAdjacentHTML("beforeend","<p style='padding:20px'>WebGL indisponível neste navegador.</p>");return}
  R.setPixelRatio(Math.min(devicePixelRatio||1,2));box.prepend(R.domElement);
  S=new THREE.Scene();C=new THREE.PerspectiveCamera(40,1,0.1,2000);
  S.add(new THREE.AmbientLight(0xffffff,0.65));
  const L=new THREE.DirectionalLight(0xffffff,0.85);L.position.set(8,14,10);S.add(L);
  grp=new THREE.Group();S.add(grp);
  const fit=()=>{const w=box.clientWidth,h=box.clientHeight;if(!w||!h)return;R.setSize(w,h,false);C.aspect=w/h;C.updateProjectionMatrix();render3()};
  new ResizeObserver(fit).observe(box);
  let pts=new Map(),pd=0;
  box.addEventListener("pointerdown",e=>{box.setPointerCapture(e.pointerId);pts.set(e.pointerId,e);box.style.cursor="grabbing"});
  box.addEventListener("pointerup",e=>{pts.delete(e.pointerId);pd=0;box.style.cursor="grab"});
  box.addEventListener("pointermove",e=>{
    if(!pts.has(e.pointerId))return;const o=pts.get(e.pointerId);
    if(pts.size===1){az-=(e.clientX-o.clientX)*0.008;el=Math.max(0.02,Math.min(1.5,el+(e.clientY-o.clientY)*0.008))}
    pts.set(e.pointerId,e);
    if(pts.size===2){const [a,b]=[...pts.values()],dd=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);if(pd)zm=Math.max(0.25,Math.min(3,zm*pd/dd));pd=dd}
    render3();
  });
  box.addEventListener("wheel",e=>{e.preventDefault();zm=Math.max(0.25,Math.min(3,zm*(e.deltaY>0?1.08:0.92)));render3()},{passive:false});
  $("rv").onclick=e=>{e.preventDefault();az=-0.65;el=0.38;zm=1;render3()};
}
function mesh(w,h,dp,col,x,y,z,tr){
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,dp),new THREE.MeshLambertMaterial(tr?{color:col,transparent:true,opacity:0.55}:{color:col}));
  m.position.set(x,y,z);grp.add(m);return m;
}
function draw(d){
  if(!R&&ok)init3d();if(!R)return;
  while(grp.children.length){const o=grp.children.pop();o.geometry.dispose();o.material.dispose()}
  if(!(d.altura>0&&d.comp>0&&d.mods>0&&d.larg>0)){render3();return}
  const c=calc(d),T=c.total,qt=d.qtd||1,de=d.de||0,TZ=qt*d.larg+(qt-1)*de,mx=Math.max(T,d.altura,TZ),u=Math.max(0.06,mx*0.011),bh=u*1.4,x0=-T/2,zf=d.larg/2;
  for(let k=0;k<qt;k++){const zc=-TZ/2+zf+k*(d.larg+de);
    for(let m=0;m<=d.mods;m++)for(const z of[-zf,zf])mesh(u,d.altura,u,0x1f5fbf,x0+m*d.comp,d.altura/2,zc+z);
    for(let l=1;l<=c.niveis;l++)for(let m=0;m<d.mods;m++)for(const z of[-zf,zf])
      mesh(d.comp,bh,u*0.8,0xf08a00,x0+(m+0.5)*d.comp,l*c.real,zc+z);
    for(let l=0;l<c.niveis;l++){const ph=Math.min(c.real*0.7,1.6),base=l*c.real+(l?bh/2:0);
      for(let m=0;m<d.mods;m++)mesh(d.comp*0.88,ph,d.larg*0.8,0xc9a36b,x0+(m+0.5)*d.comp,base+ph/2,zc,true)}
  }
  const g=new THREE.GridHelper(mx*1.8,Math.max(8,Math.round(mx*1.8)),0x888888,0xbbbbbb);g.position.y=-0.005;
  grp.add(g);g.geometry.userData={};g.material=Array.isArray(g.material)?g.material[0]:g.material;
  tgt.set(0,d.altura/2,0);rad=mx*2.1;
  $("lab").textContent=`Metragem total ${f(T)} m | Altura ${f(d.altura)} m | ${c.niveis} níveis a cada ${f(c.real)} m | Profundidade ${f(d.larg)} m${qt>1?` | ${qt} estruturas, ${f(de)} m entre elas`:""}`;
  render3();
}

function refresh(){
  const d=cur(),c=calc(d);
  $("total").value=f(c.total);$("wd").style.display=d.qtd>1?"":"none";
  $("calc").textContent=`${c.niveis} nível(is) de longarina. Espaçamento ajustado de ${f(d.dist)} m para ${f(c.real)} m para distribuir na altura total.`;
  draw(d);
}
["altura","dist","comp","larg","mods","qtd","de"].forEach(i=>$(i).addEventListener("input",()=>{selId=null;render();refresh()}));

function render(){
  const q=$("q").value.toLowerCase().trim();
  const rows=data.filter(r=>!q||[r.id,r.nome,r.altura,r.comp,r.larg,r.mods].join(" ").toLowerCase().includes(q));
  $("tb").innerHTML=rows.map(r=>{const c=calc(r);
    return `<tr class="${r.id===selId?"sel":""}"><td>${r.id}</td><td>${esc(r.nome)}</td><td>${f(r.altura)}</td><td>${f(r.comp)}</td><td>${f(r.larg)}</td><td>${r.mods}</td><td>${r.qtd||1}</td><td>${(r.qtd||1)>1?f(r.de):"-"}</td><td>${f(c.total)}</td><td>${c.niveis}</td><td>${f(c.real)}</td>
    <td><button class="sec" onclick="view(${r.id})">Ver</button> <button class="sec" onclick="edit(${r.id})">Editar</button> <button class="sec" onclick="del(${r.id})">Excluir</button></td></tr>`}).join("")
    ||`<tr><td colspan="12">Nenhum registro encontrado.</td></tr>`;
}
function esc(s){return String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))}
function fill(r){$("nome").value=r.nome;["altura","dist","comp","larg","mods"].forEach(i=>$(i).value=r[i]);$("qtd").value=r.qtd||1;$("de").value=r.de||1;refresh()}
window.view=id=>{selId=id;fill(data.find(r=>r.id===id));render()};
window.edit=id=>{editId=id;selId=id;fill(data.find(r=>r.id===id));$("ft").textContent="Editando ID "+id;$("save").textContent="Atualizar";render();window.scrollTo({top:0,behavior:"smooth"})};
window.del=id=>{if(!confirm("Excluir o registro "+id+"?"))return;data=data.filter(r=>r.id!==id);persist();render()};
function reset(){editId=null;$("ft").textContent="Novo cadastro";$("save").textContent="Salvar";$("nome").value=""}
$("clear").onclick=()=>{reset();selId=null;render()};
$("save").onclick=()=>{
  const d=cur();
  if(!(d.altura>0&&d.dist>0&&d.comp>0&&d.larg>0)){alert("Preencha todas as medidas com valores maiores que zero.");return}
  const nome=$("nome").value.trim()||"Sem identificação";
  if(editId){Object.assign(data.find(r=>r.id===editId),d,{nome})}
  else{const id=data.reduce((a,r)=>Math.max(a,r.id),0)+1;data.push({id,nome,...d});selId=id}
  persist();reset();render();
};
$("q").addEventListener("input",render);

$("xls").onclick=async()=>{
  if(!data.length){alert("Não há dados para exportar.");return}
  const rows=data.map(r=>{const c=calc(r);return{
    "ID":r.id,"Identificação":r.nome,"Altura total (m)":r.altura,"Comprimento do módulo (m)":r.comp,"Largura (m)":r.larg,
    "Qtd. módulos":r.mods,"Qtd. estruturas":r.qtd||1,"Distanciamento entre estruturas (m)":(r.qtd||1)>1?r.de:"","Total de módulos":r.mods*(r.qtd||1),"Metragem total (m)":+c.total.toFixed(2),"Distanciamento informado (m)":r.dist,
    "Níveis de longarina":c.niveis,"Espaçamento ajustado (m)":+c.real.toFixed(3)}});
  const ws=XLSX.utils.json_to_sheet(rows);
  ws["!cols"]=Object.keys(rows[0]).map(k=>({wch:Math.max(14,k.length+2)}));
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"Estruturas");
  const buf=XLSX.write(wb,{bookType:"xlsx",type:"array"});
  await saveFile("relatorio-porta-paletes.xlsx",new Blob([buf]));
};
$("zip").onclick=async()=>{
  if(!window.JSZip||!document.querySelector("style")){alert("Disponível apenas na versão publicada.");return}
  const b=buildHtml(true),z=new JSZip();
  z.file("index.html",b.html);z.file("css/estilos.css",b.css);z.file("js/app.js",b.js);
  z.file("data/estruturas.json",JSON.stringify(data,null,2));z.file("README.md",README);
  await saveFile("projeto-porta-paletes.zip",await z.generateAsync({type:"blob"}));
};
render();refresh();
