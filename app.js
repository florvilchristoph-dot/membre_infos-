from pathlib import Path

app = r'''// MEDFAH - APPLICATION
const SUPABASE_URL = window.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || "";
let clientMembresMEDFAH = null;

if (SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase) {
  clientMembresMEDFAH = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

function pageMEDFAH() {
  return (location.pathname.split("/").filter(Boolean).pop() || "index.html").toLowerCase();
}
function echapper(t) {
  return String(t ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
}
function getField(data, field) {
  if (!data) return "";
  if (data[field] !== undefined && data[field] !== null) return data[field];
  const norm = s => String(s).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[_\s-]/g,"");
  const key = Object.keys(data).find(k => norm(k) === norm(field));
  return key ? data[key] : "";
}
function champ(label, value) {
  return `<div class="field"><strong>${echapper(label)}</strong><span>${echapper(value === null || value === undefined || value === "" ? "-" : value)}</span></div>`;
}
async function obtenirEntetesAuthentifiees() {
  if (!clientMembresMEDFAH) throw new Error("Configuration Supabase indisponible. Vérifiez config.js.");
  const {data,error} = await clientMembresMEDFAH.auth.getSession();
  if (error) throw error;
  if (!data.session) throw new Error("Session absente. Connectez-vous d'abord dans Administration.");
  return {apikey:SUPABASE_ANON_KEY, Authorization:`Bearer ${data.session.access_token}`, "Content-Type":"application/json"};
}

document.addEventListener("DOMContentLoaded", () => {
  if (!clientMembresMEDFAH) {
    const app = document.getElementById("app");
    if (app) app.innerHTML = `<div class="message error">Configuration Supabase indisponible. Vérifiez config.js.</div>`;
    console.error("Configuration Supabase manquante.");
    return;
  }
  const page = pageMEDFAH();
  if (page === "index.html" || page === "index") chargerStatistiques();
  if (page === "membre.html" || page === "membre") {
    const app = document.getElementById("app");
    if (!app) return;
    const p = new URLSearchParams(location.search);
    if (p.get("id")) chargerMembre(p.get("id"), app);
    else chargerMembres(p.get("q") || "", app);
  }
});

async function chargerStatistiques() {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/membre_infos?select=*`, {headers:{apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${SUPABASE_ANON_KEY}`}});
    if (!r.ok) throw new Error(`Supabase ${r.status}`);
    const ms = await r.json();
    const el = document.getElementById("totalMembers"); if (el) el.textContent = ms.length;
    const as = new Set(ms.map(m=>getField(m,"assemblee")).filter(v=>v && String(v).trim()));
    const ea = document.getElementById("totalAssemblees"); if (ea) ea.textContent = as.size;
    const cards = ms.filter(m=>String(getField(m,"numero_carte") || getField(m,"carte_numerique") || "").trim());
    const ec = document.getElementById("totalCartes"); if (ec) ec.textContent = cards.length;
  } catch(e) { console.error("Erreur statistiques:",e); }
}

async function chargerMembres(recherche, app) {
  app.innerHTML = `<div class="message">Chargement des membres...</div>`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(()=>controller.abort(),15000);
    let response;
    try {
      response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_public_member_names`, {
        method:"POST",
        headers:{apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${SUPABASE_ANON_KEY}`,"Content-Type":"application/json"},
        body:"{}", signal:controller.signal
      });
    } finally { clearTimeout(timer); }
    if (!response.ok) throw new Error(`Erreur ${response.status}: ${await response.text()}`);
    const membres = await response.json();
    if (!Array.isArray(membres)) throw new Error("La fonction get_public_member_names n'a pas renvoyé une liste.");
    app.innerHTML = `<div class="topbar"><h2>Liste des membres MEDFAH</h2><div class="search-area"><input id="rechercheMembrePublic" type="search" placeholder="Rechercher par nom ou prénom..." aria-label="Rechercher un membre"><button id="boutonRecherchePublic" type="button">Rechercher</button></div><p class="result-info" id="nombreMembresPublic"></p></div><div class="table-wrapper"><table style="min-width:0"><thead><tr><th>Nom</th><th>Prénom</th></tr></thead><tbody id="corpsListeMembresPublic"></tbody></table></div>`;
    const input=document.getElementById("rechercheMembrePublic"), body=document.getElementById("corpsListeMembresPublic"), count=document.getElementById("nombreMembresPublic");
    function afficher(q) {
      q=String(q||"").trim().toLocaleLowerCase("fr");
    const rows=membres.filter(m=>`${m.nom||""} ${m.prenom||m["prénom"]||""}`.toLocaleLowerCase("fr").includes(q));
      count.textContent=`${rows.length} membre(s)`;
      body.innerHTML=rows.length ? rows.map(m=>`<tr><td>${echapper(m.nom||"-")}</td><td>${echapper(m.prenom||"-")}</td></tr>`).join("") : `<tr><td colspan="2">Aucun membre trouvé.</td></tr>`;
    }
    input.value=recherche||""; afficher(recherche);
    input.addEventListener("input",()=>afficher(input.value));
    document.getElementById("boutonRecherchePublic").addEventListener("click",()=>afficher(input.value));
  } catch(e) {
    console.error("Chargement des membres:",e);
    app.innerHTML=`<div class="message error">Impossible de charger les membres.<br><br>${echapper(e.name==="AbortError" ? "La requête a dépassé 15 secondes. Vérifiez Supabase et get_public_member_names." : e.message)}</div>`;
  }
}

async function chargerMembre(id, app) {
  app.innerHTML=`<div class="message">Chargement du dossier du membre...</div>`;
  try {
    const headers=await obtenirEntetesAuthentifiees();
    const r=await fetch(`${SUPABASE_URL}/rest/v1/membre_infos?id=eq.${encodeURIComponent(id)}&select=*`,{headers});
    if(!r.ok) throw new Error(`Erreur Supabase ${r.status}: ${await r.text()}`);
    const rows=await r.json();
    if(!rows.length) {app.innerHTML=`<div class="message error">Aucun membre trouvé.</div>`;return;}
    afficherDossier(rows[0],app);
  } catch(e) {
    console.error("Erreur dossier:",e);
    app.innerHTML=`<div class="message error">Impossible de charger le dossier du membre.<br><br>${echapper(e.message)}</div>`;
  }
}

function afficherDossier(m, app) {
  const v=(...keys)=>{for(const k of keys){const x=getField(m,k);if(x!==""&&x!==null&&x!==undefined&&String(x).trim()!=="")return x;}return "-";};
  app.innerHTML=`<div class="dossier"><div class="dossier-header"><h2>Dossier du membre</h2><p>MEDFAH</p></div><div class="dossier-body">
  <section class="section"><h3>Informations personnelles</h3><div class="grid">
  ${champ("Code",v("code"))}${champ("N° carte",v("numero_carte","carte_numerique"))}${champ("CIN",v("cin"))}${champ("NIF",v("nif"))}${champ("Nom",v("nom"))}${champ("Prénom",v("prenom"))}${champ("Sexe",v("sexe"))}${champ("Date de naissance",v("date_naissance"))}${champ("Lieu de naissance",v("lieu_naissance"))}${champ("Nationalité",v("nationaliste","nationalite"))}${champ("Situation matrimoniale",v("situation_matrimoniale"))}</div></section>
  <section class="section"><h3>Informations familiales</h3><div class="grid">${champ("Nom du père",v("nom_pere","nom père"))}${champ("Nom de la mère",v("nom_mere","nom mere","nom mère"))}${champ("Nom du conjoint",v("nom_conjoint"))}${champ("Nombre d'enfants",v("nombre_enfants"))}</div></section>
  <section class="section"><h3>Contact</h3><div class="grid">${champ("Téléphone",v("telephone","telefone"))}${champ("Téléphone secondaire",v("telephone_secondaire"))}${champ("WhatsApp",v("whatsapp","watsapp"))}${champ("Email",v("email"))}${champ("Adresse",v("adresse"))}${champ("Commune",v("commune"))}${champ("Département",v("departement"))}</div></section>
  <section class="section"><h3>Ministères et responsabilités</h3><div class="grid">${champ("Fonction",v("fonction"))}${champ("Profession",v("profession"))}${champ("Assemblée",v("assemblee","assemblée"))}${champ("Statut",v("statut","status"))}${champ("Responsable de l'enregistrement",v("responsable_enregistrement"))}</div></section>
  <section class="section"><h3>Vie spirituelle</h3><div class="grid">${champ("Date d'adhésion",v("date_adhesion"))}${champ("Date de conversion",v("conversion_date","date_conversion"))}${champ("Date de baptême",v("date_bapteme"))}${champ("Pasteur responsable",v("pasteur_responsable"))}${champ("Formation biblique",v("formation_biblique"))}${champ("Groupe d'église",v("groupe_eglise"))}</div></section>
  <section class="section"><h3>Personne à contacter en cas d'urgence</h3><div class="grid">${champ("Nom",v("personne_urgence"))}${champ("Téléphone",v("urgence_telephonique","telephone_urgence"))}${champ("Relation",v("relation_urgence"))}</div></section>
  <section class="section"><h3>Suivi / Observations</h3><div class="field"><span>${echapper(v("observation","observations")==="-"?"Aucune observation.":v("observation","observations"))}</span></div></section>
  <div class="actions"><button class="action-btn primary" onclick="window.print()">🖨 Imprimer</button><button class="action-btn secondary" onclick="window.location.href='membre.html'">← Retour à la liste</button><button class="action-btn secondary" onclick="window.location.href='index.html'">Retour à l'accueil</button></div>
  </div></div>`;
}

// MODULE DE PRÉSENCE : zone indépendante de la liste publique
function initialiserPresenceMEDFAH() {
  if (!["membre.html","membre"].includes(pageMEDFAH()) || new URLSearchParams(location.search).has("id")) return;
  const zone=document.getElementById("presenceZoneMEDFAH");
  if(!zone || document.getElementById("modulePresenceMEDFAH")) return;
  const section=document.createElement("section"); section.id="modulePresenceMEDFAH";
  section.style.cssText="margin-top:24px;padding:20px;background:white;border-radius:14px;box-shadow:0 4px 15px #00000012;";
  section.innerHTML=`<h2 style="color:#0d47a1">Présences MEDFAH</h2><p>Réservé aux administrateurs connectés.</p>
  <label for="presenceSessionMEDFAH">Service ouvert</label><select id="presenceSessionMEDFAH" style="width:100%;padding:12px;margin:8px 0"><option value="">Chargement...</option></select>
  <button id="presenceReloadMEDFAH" type="button" style="width:100%;padding:12px">Actualiser les services</button>
  <label for="presenceCardMEDFAH" style="display:block;margin-top:14px">Numéro de carte MEDFAH</label><input id="presenceCardMEDFAH" type="search" placeholder="Ex. medfah0001" style="width:100%;padding:12px;margin:8px 0">
  <button id="presenceSearchMEDFAH" type="button" style="width:100%;padding:12px">Rechercher le membre</button>
  <button id="presenceStartQRMEDFAH" type="button" style="width:100%;padding:12px;margin-top:8px">Scanner le QR Code</button>
  <button id="presenceStopQRMEDFAH" type="button" disabled style="width:100%;padding:12px;margin-top:8px">Arrêter la caméra</button>
  <div id="presenceQRReaderMEDFAH" hidden style="margin-top:12px"></div><div id="presenceMemberMEDFAH" style="margin-top:12px"></div>
  <label for="presenceStatusMEDFAH" style="display:block;margin-top:14px">Statut</label><select id="presenceStatusMEDFAH" style="width:100%;padding:12px"><option value="présent">Présent</option><option value="en_retard">En retard</option></select>
  <button id="presenceSaveMEDFAH" type="button" disabled style="width:100%;padding:12px;margin-top:10px">Enregistrer la présence</button><div id="presenceMessageMEDFAH" role="status" style="margin-top:12px;overflow-wrap:anywhere"></div>`;
  zone.appendChild(section);
  const $=id=>document.getElementById(id), session=$("presenceSessionMEDFAH"), card=$("presenceCardMEDFAH"), memberBox=$("presenceMemberMEDFAH"), status=$("presenceStatusMEDFAH"), save=$("presenceSaveMEDFAH"), msg=$("presenceMessageMEDFAH"), qrBox=$("presenceQRReaderMEDFAH"), start=$("presenceStartQRMEDFAH"), stop=$("presenceStopQRMEDFAH");
  let chosen=null, scanner=null, running=false, saving=false;
  const tell=(t,err=false)=>{msg.textContent=t;msg.style.cssText="padding:10px;margin-top:12px;overflow-wrap:anywhere;"+(err?"background:#ffedd5;color:#9a3412":"background:#dcfce7;color:#166534");};
  const update=()=>save.disabled=saving||!session.value||!chosen;
  async function headers(){if(!clientMembresMEDFAH)throw Error("Configuration Supabase indisponible.");const {data,error}=await clientMembresMEDFAH.auth.getSession();if(error)throw error;if(!data.session)throw Error("Connectez-vous d'abord dans Administration.");return {apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${data.session.access_token}`,"Content-Type":"application/json"};}
  async function req(table,params,method="GET",body=null){const h=await headers(),q=params.toString(),r=await fetch(`${SUPABASE_URL}/rest/v1/${table}${q?"?"+q:""}`,{method,headers:{...h,...(method==="POST"?{Prefer:"return=representation"}:{})},body:body===null?undefined:JSON.stringify(body)});if(!r.ok)throw Error(`Erreur ${r.status} (${table}): ${await r.text()}`);const t=await r.text();return t?JSON.parse(t):[];}
  function today(){const p=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Port-au-Prince",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());const g=x=>p.find(a=>a.type===x).value;return `${g("year")}-${g("month")}-${g("day")}`;}
  async function loadSessions(){session.innerHTML="<option value=''>Chargement...</option>";try{const p=new URLSearchParams({select:"id,nom_services,date_service,heure_debut,heure_fin,statut",date_service:"eq."+today(),statut:"eq.ouvert",order:"heure_debut.asc"});const rows=await req("sessions_presence",p);session.innerHTML="";const first=document.createElement("option");first.value="";first.textContent=rows.length?"Choisir un service ouvert":"Aucun service ouvert aujourd'hui";session.appendChild(first);rows.forEach(s=>{const o=document.createElement("option");o.value=s.id;o.textContent=`${s.nom_services} — ${s.heure_debut} à ${s.heure_fin}`;session.appendChild(o);});update();}catch(e){session.innerHTML="<option value=''>Connexion requise</option>";tell(e.message,true);}}
  async function searchMember(){chosen=null;memberBox.replaceChildren();update();const value=card.value.trim();if(!value){tell("Saisissez ou scannez le numéro de carte.",true);return;}try{const p=new URLSearchParams({select:"id,nom,prenom,carte_numerique",carte_numerique:"eq."+value,limit:"1"});const rows=await req("membre_infos",p);if(!rows.length){tell("Aucun membre trouvé. Vérifiez le numéro de carte.",true);return;}chosen=rows[0];const n=document.createElement("strong");n.textContent=`${chosen.nom||""} ${chosen.prenom||""}`.trim();const c=document.createElement("p");c.textContent="Carte MEDFAH : "+(chosen.carte_numerique||"—");memberBox.append(n,c);update();tell("Membre identifié. Vérifiez le service.");}catch(e){tell(e.message,true);}}
  function extract(text){const s=String(text||"").trim();const m=s.match(/medfah[0-9]+/i);return m?m[0]:s;}
  async function startQR(){if(!window.Html5Qrcode){tell("Lecteur QR non chargé. Vérifiez la connexion Internet.",true);return;}if(running)return;try{qrBox.hidden=false;start.disabled=true;scanner=new Html5Qrcode("presenceQRReaderMEDFAH");await scanner.start({facingMode:"environment"},{fps:10,qrbox:{width:230,height:230}},async txt=>{card.value=extract(txt);await stopQR();await searchMember();},()=>{});running=true;stop.disabled=false;tell("Pointez la caméra vers le QR Code.");}catch(e){start.disabled=false;qrBox.hidden=true;tell("Impossible d'ouvrir la caméra. Autorisez l'accès à la caméra. "+(e.message||""),true);}}
  async function stopQR(){if(scanner&&running){try{await scanner.stop();}catch(_){}}running=false;scanner=null;qrBox.hidden=true;start.disabled=false;stop.disabled=true;}
  async function saveAttendance(){if(saving||!session.value||!chosen){tell("Choisissez un service et identifiez un membre.",true);return;}saving=true;update();try{const p=new URLSearchParams({select:"id",session_id:"eq."+session.value,membre_id:"eq."+chosen.id,limit:"1"});const old=await req("presences_eglise",p);if(old.length){tell("Ce membre est déjà enregistré pour ce service.",true);return;}await req("presences_eglise",new URLSearchParams(),"POST",{session_id:Number(session.value),membre_id:Number(chosen.id),heure_pointage:new Date().toISOString(),statut:status.value,mode_pointage:"qr",observation:null});tell("Présence enregistrée avec succès.");card.value="";chosen=null;memberBox.replaceChildren();}catch(e){tell(e.message,true);}finally{saving=false;update();}}
  $("presenceReloadMEDFAH").addEventListener("click",loadSessions);$("presenceSearchMEDFAH").addEventListener("click",searchMember);start.addEventListener("click",startQR);stop.addEventListener("click",stopQR);save.addEventListener("click",saveAttendance);card.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();searchMember();}});session.addEventListener("change",update);loadSessions();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialiserPresenceMEDFAH);else initialiserPresenceMEDFAH();
'''

html = r'''<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>MEDFAH - Membres</title>
<style>
*{box-sizing:border-box;font-family:"Segoe UI",Arial,sans-serif}
body{margin:0;min-height:100vh;background:linear-gradient(rgba(255,255,255,.93),rgba(255,255,255,.93)),url("image.png") center center/cover fixed no-repeat;color:#1f2937}
header{background:#0d47a1;color:white;padding:22px;text-align:center}header h1{margin:0 0 6px}header p{margin:0;opacity:.9}
.container{width:95%;max-width:1200px;margin:25px auto}.topbar{background:white;padding:20px;border-radius:15px;box-shadow:0 4px 15px #00000012;margin-bottom:20px}.topbar h2{margin:0 0 15px;color:#0d47a1}
.search-area{display:flex;gap:10px}.search-area input{flex:1;padding:14px;border:1px solid #cbd5e1;border-radius:9px;font-size:16px}.search-area button{border:0;background:#0d47a1;color:white;padding:0 22px;border-radius:9px;cursor:pointer;font-weight:bold}.result-info{margin-top:12px;color:#64748b;font-size:14px}
.table-wrapper{background:white;border-radius:15px;box-shadow:0 4px 15px #00000012;overflow-x:auto}table{width:100%;border-collapse:collapse;min-width:0}th{background:#f1f5f9;color:#334155;text-align:left;padding:15px;font-size:14px}td{padding:14px 15px;border-top:1px solid #e2e8f0;font-size:14px}
.message{background:white;padding:30px;text-align:center;border-radius:15px;color:#64748b;box-shadow:0 4px 15px #00000012}.error{color:#b91c1c}.back{display:inline-block;margin-top:20px;padding:11px 18px;background:white;color:#0d47a1;text-decoration:none;border-radius:8px;box-shadow:0 3px 10px #00000014}
.dossier{background:white;border-radius:16px;box-shadow:0 4px 18px #00000014;overflow:hidden}.dossier-header{background:#0d47a1;color:white;padding:25px}.dossier-header h2{margin:0 0 5px}.dossier-body{padding:22px}.section{margin-bottom:25px}.section h3{color:#0d47a1;border-bottom:2px solid #e2e8f0;padding-bottom:9px;margin-bottom:15px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px}.field{background:#f8fafc;padding:13px;border-radius:8px}.field strong{display:block;color:#64748b;font-size:12px;margin-bottom:5px}.field span{color:#1e293b}.actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:20px}.action-btn{border:0;padding:11px 18px;border-radius:8px;cursor:pointer;font-weight:bold}.primary{background:#0d47a1;color:white}.secondary{background:#e2e8f0;color:#334155}
@media(max-width:650px){.search-area{flex-direction:column}.search-area button{padding:13px}}
</style>
</head>
<body>
<header><h1>MEDFAH</h1><p>Gestion des membres</p></header>
<div class="container">
  <div id="app"><div class="message">Chargement des membres...</div></div>
  <div id="presenceZoneMEDFAH"></div>
  <a href="index.html" class="back">← Retour à l'accueil</a>
</div>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="https://unpkg.com/html5-qrcode"></script>
<script src="config.js"></script>
<script src="app.js"></script>
</body>
</html>
'''
p=Path("/mnt/data")
(p/"app.js").write_text(app,encoding="utf-8")
(p/"membre.html").write_text(html,encoding="utf-8")
print("Fichiers prêts :")
print(f"app.js — {len(app)} caractères")
print(f"membre.html — {len(html)} caractères")
