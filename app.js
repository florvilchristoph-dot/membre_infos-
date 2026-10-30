
/* =====================================================
   MEDFAH — APPLICATION PRINCIPALE
   Liste publique, dossier membre et présence
   ===================================================== */


let clientMembresMEDFAH = null;

/* INITIALISATION SUPABASE */
if (
  SUPABASE_URL &&
  SUPABASE_ANON_KEY &&
  window.supabase
) {
  clientMembresMEDFAH = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );
}

/* OUTILS */
function pageMEDFAH() {
  return (
    location.pathname.split("/").filter(Boolean).pop() ||
    "index.html"
  ).toLowerCase();
}

function echapper(valeur) {
  return String(valeur ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normaliserCle(texte) {
  return String(texte)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[_\s-]/g, "");
}

function getField(data, field) {
  if (!data) return "";

  if (
    data[field] !== undefined &&
    data[field] !== null
  ) {
    return data[field];
  }

  const cle = Object.keys(data).find(
    key => normaliserCle(key) === normaliserCle(field)
  );

  return cle ? data[cle] : "";
}

function champ(label, value) {
  return `
    <div class="field">
      <strong>${echapper(label)}</strong>
      <span>${echapper(
        value === null ||
        value === undefined ||
        value === ""
          ? "-"
          : value
      )}</span>
    </div>
  `;
}

function afficherErreur(message, element) {
  if (!element) return;

  element.innerHTML = `
    <div class="message error">
      ${echapper(message)}
    </div>
  `;
}

/* SESSION ADMINISTRATEUR */
async function obtenirEntetesAuthentifiees() {
  if (!clientMembresMEDFAH) {
    throw new Error(
      "Configuration Supabase indisponible. Vérifiez config.js."
    );
  }

  const { data, error } =
    await clientMembresMEDFAH.auth.getSession();

  if (error) throw error;

  if (!data.session) {
    throw new Error(
      "Connectez-vous d'abord dans Administration."
    );
  }

  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${data.session.access_token}`,
    "Content-Type": "application/json"
  };
}

/* DÉMARRAGE */
document.addEventListener("DOMContentLoaded", () => {
  if (!clientMembresMEDFAH) {
    const app = document.getElementById("app");

    afficherErreur(
      "Configuration Supabase indisponible. Vérifiez config.js.",
      app
    );

    console.error("Configuration Supabase manquante.");
    return;
  }

  const page = pageMEDFAH();

  if (page === "index.html" || page === "index") {
    chargerStatistiques();
  }

  if (page === "membre.html" || page === "membre") {
    const app = document.getElementById("app");

    if (!app) return;

    const params = new URLSearchParams(location.search);
    const id = params.get("id");

    if (id) {
      chargerMembre(id, app);
    } else {
      chargerMembres(params.get("q") || "", app);
    }
  }
});

/* STATISTIQUES PUBLIQUES
   Ne pas lire toutes les informations personnelles ici.
   Pour rétablir les chiffres, créer des RPC sécurisées
   qui ne renvoient que des nombres agrégés.
*/
async function chargerStatistiques() {
  const total = document.getElementById("totalMembers");
  const assemblees = document.getElementById("totalAssemblees");
  const cartes = document.getElementById("totalCartes");

  if (total) total.textContent = "—";
  if (assemblees) assemblees.textContent = "—";
  if (cartes) cartes.textContent = "—";
}

/* LISTE PUBLIQUE : NOM ET PRÉNOM UNIQUEMENT */
async function chargerMembres(recherche, app) {
  app.innerHTML = `
    <div class="message">Chargement des membres...</div>
  `;

  try {
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      15000
    );

    let response;

    try {
      response = await fetch(
        `${SUPABASE_URL}/rest/v1/rpc/get_public_member_names`,
        {
          method: "POST",
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json"
          },
          body: "{}",
          signal: controller.signal
        }
      );
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      throw new Error(
        `Erreur ${response.status}: ${await response.text()}`
      );
    }

    const membres = await response.json();

    if (!Array.isArray(membres)) {
      throw new Error(
        "La fonction get_public_member_names n'a pas renvoyé une liste."
      );
    }

    app.innerHTML = `
      <div class="topbar">
        <h2>Liste des membres MEDFAH</h2>

        <div class="search-area">
          <input
            id="rechercheMembrePublic"
            type="search"
            placeholder="Rechercher par nom ou prénom..."
            aria-label="Rechercher un membre"
          >

          <button
            id="boutonRecherchePublic"
            type="button"
          >
            Rechercher
          </button>
        </div>

        <p
          class="result-info"
          id="nombreMembresPublic"
        ></p>
      </div>

      <div class="table-wrapper">
        <table style="min-width:0">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Prénom</th>
            </tr>
          </thead>

          <tbody id="corpsListeMembresPublic"></tbody>
        </table>
      </div>
    `;

    const input = document.getElementById(
      "rechercheMembrePublic"
    );

    const body = document.getElementById(
      "corpsListeMembresPublic"
    );

    const count = document.getElementById(
      "nombreMembresPublic"
    );

    function afficher(q) {
      q = String(q || "")
        .trim()
        .toLocaleLowerCase("fr");

      const rows = membres.filter(m => {
        const nom = getField(m, "nom");
        const prenom = getField(m, "prenom");

        return `${nom} ${prenom}`
          .toLocaleLowerCase("fr")
          .includes(q);
      });

      count.textContent = `${rows.length} membre(s)`;

      body.innerHTML = rows.length
        ? rows.map(m => `
            <tr>
              <td>${echapper(getField(m, "nom") || "-")}</td>
              <td>${echapper(getField(m, "prenom") || "-")}</td>
            </tr>
          `).join("")
        : `
            <tr>
              <td colspan="2">Aucun membre trouvé.</td>
            </tr>
          `;
    }

    input.value = recherche || "";
    afficher(recherche);

    input.addEventListener("input", () => {
      afficher(input.value);
    });

    document
      .getElementById("boutonRecherchePublic")
      .addEventListener("click", () => {
        afficher(input.value);
      });

  } catch (e) {
    console.error("Chargement des membres :", e);

    const message = e.name === "AbortError"
      ? "La requête a dépassé 15 secondes. Vérifiez Supabase."
      : e.message;

    afficherErreur(
      `Impossible de charger les membres. ${message}`,
      app
    );
  }
}

/* DOSSIER COMPLET : ADMINISTRATEUR CONNECTÉ UNIQUEMENT */
async function chargerMembre(id, app) {
  app.innerHTML = `
    <div class="message">
      Chargement du dossier du membre...
    </div>
  `;

  try {
    const headers =
      await obtenirEntetesAuthentifiees();

    const url =
      `${SUPABASE_URL}/rest/v1/membre_infos` +
      `?id=eq.${encodeURIComponent(id)}&select=*`;

    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error(
        `Erreur Supabase ${response.status}: ${await response.text()}`
      );
    }

    const rows = await response.json();

    if (!rows.length) {
      afficherErreur("Aucun membre trouvé.", app);
      return;
    }

    afficherDossier(rows[0], app);

  } catch (e) {
    console.error("Erreur dossier :", e);

    afficherErreur(
      `Impossible de charger le dossier. ${e.message}`,
      app
    );
  }
}

/* AFFICHAGE DES INFORMATIONS DU DOSSIER */
function afficherDossier(m, app) {
  const v = (...keys) => {
    for (const key of keys) {
      const value = getField(m, key);

      if (
        value !== "" &&
        value !== null &&
        value !== undefined &&
        String(value).trim() !== ""
      ) {
        return value;
      }
    }

    return "-";
  };

  app.innerHTML = `
    <div class="dossier">
      <div class="dossier-header">
        <h2>Dossier du membre</h2>
        <p>MEDFAH</p>
      </div>

      <div class="dossier-body">

        <section class="section">
          <h3>Informations personnelles</h3>
          <div class="grid">
            ${champ("Code", v("code"))}
            ${champ("N° carte", v("numero_carte", "carte_numerique"))}
            ${champ("CIN", v("cin"))}
            ${champ("NIF", v("nif"))}
            ${champ("Nom", v("nom"))}
            ${champ("Prénom", v("prenom"))}
            ${champ("Sexe", v("sexe"))}
            ${champ("Date de naissance", v("date_naissance"))}
            ${champ("Lieu de naissance", v("lieu_naissance"))}
            ${champ("Nationalité", v("nationaliste", "nationalite"))}
            ${champ("Situation matrimoniale", v("situation_matrimoniale"))}
          </div>
        </section>

        <section class="section">
          <h3>Informations familiales</h3>
          <div class="grid">
            ${champ("Nom du père", v("nom_pere"))}
            ${champ("Nom de la mère", v("nom_mere"))}
            ${champ("Nom du conjoint", v("nom_conjoint"))}
            ${champ("Nombre d'enfants", v("nombre_enfants"))}
          </div>
        </section>

        <section class="section">
          <h3>Contact</h3>
          <div class="grid">
            ${champ("Téléphone", v("telephone"))}
            ${champ("Téléphone secondaire", v("telephone_secondaire"))}
            ${champ("WhatsApp", v("whatsapp", "watsapp"))}
            ${champ("Email", v("email"))}
            ${champ("Adresse", v("adresse"))}
            ${champ("Commune", v("commune"))}
            ${champ("Département", v("departement"))}
          </div>
        </section>

        <section class="section">
          <h3>Ministères et responsabilités</h3>
          <div class="grid">
            ${champ("Fonction", v("fonction"))}
            ${champ("Profession", v("profession"))}
            ${champ("Assemblée", v("assemblee"))}
            ${champ("Statut", v("statut"))}
            ${champ("Responsable de l'enregistrement", v("responsable_enregistrement"))}
          </div>
        </section>

        <section class="section">
          <h3>Vie spirituelle</h3>
          <div class="grid">
            ${champ("Date d'adhésion", v("date_adhesion"))}
            ${champ("Date de conversion", v("conversion_date"))}
            ${champ("Date de baptême", v("date_bapteme"))}
            ${champ("Pasteur responsable", v("pasteur_responsable"))}
            ${champ("Formation biblique", v("formation_biblique"))}
            ${champ("Groupe d'église", v("groupe_eglise"))}
          </div>
        </section>

        <section class="section">
          <h3>Personne à contacter en cas d'urgence</h3>
          <div class="grid">
            ${champ("Nom", v("personne_urgence"))}
            ${champ("Téléphone", v("urgence_telephonique"))}
            ${champ("Relation", v("relation_urgence"))}
          </div>
        </section>

        <section class="section">
          <h3>Suivi / Observations</h3>
          <div class="field">
            <span>${echapper(v("observation"))}</span>
          </div>
        </section>

        <div class="actions">
          <button class="action-btn primary" id="imprimerDossierMEDFAH">
            🖨 Imprimer
          </button>

          <button class="action-btn secondary" id="retourListeMEDFAH">
            ← Retour à la liste
          </button>

          <button class="action-btn secondary" id="retourAccueilMEDFAH">
            Retour à l'accueil
          </button>
        </div>

      </div>
    </div>
  `;

  document
    .getElementById("imprimerDossierMEDFAH")
    .addEventListener("click", () => window.print());

  document
    .getElementById("retourListeMEDFAH")
    .addEventListener("click", () => {
      window.location.href = "membre.html";
    });

  document
    .getElementById("retourAccueilMEDFAH")
    .addEventListener("click", () => {
      window.location.href = "index.html";
    });
}

/* =====================================================
   MODULE PRÉSENCE MEDFAH
   ===================================================== */

 /* =====================================================
   MODULE PRÉSENCE MEDFAH — VERSION CORRIGÉE
   ===================================================== */

function initialiserPresenceMEDFAH() {
  if (
    ["membre.html", "membre"].includes(pageMEDFAH()) ||
    new URLSearchParams(location.search).has("id")
  ) {
    return;
  }

  const zone = document.getElementById("presenceZoneMEDFAH");

  if (!zone || document.getElementById("modulePresenceMEDFAH")) {
    return;
  }

  const section = document.createElement("section");
  section.id = "modulePresenceMEDFAH";
  section.style.cssText =
    "margin-top:24px;padding:20px;background:white;" +
    "border-radius:14px;box-shadow:0 4px 15px #00000012;";

  section.innerHTML = `
    <h2 style="color:#0d47a1">Présences MEDFAH</h2>
    <p>Réservé aux administrateurs connectés.</p>

    <label for="presenceSessionMEDFAH">Service ouvert</label>
    <select id="presenceSessionMEDFAH"
      style="width:100%;padding:12px;margin:8px 0">
      <option value="">Chargement...</option>
    </select>

    <button id="presenceReloadMEDFAH" type="button"
      style="width:100%;padding:12px">
      Actualiser les services
    </button>

    <label for="presenceCardMEDFAH"
      style="display:block;margin-top:14px">
      Numéro de carte ou code du membre
    </label>

    <input id="presenceCardMEDFAH" type="search"
      placeholder="Ex. MEDFAH0001"
      style="width:100%;padding:12px;margin:8px 0">

    <button id="presenceSearchMEDFAH" type="button"
      style="width:100%;padding:12px">
      Rechercher le membre
    </button>

    <button id="presenceStartQRMEDFAH" type="button"
      style="width:100%;padding:12px;margin-top:8px">
      Scanner le QR Code
    </button>

    <button id="presenceStopQRMEDFAH" type="button"
      disabled style="width:100%;padding:12px;margin-top:8px">
      Arrêter la caméra
    </button>

    <div id="presenceQRReaderMEDFAH" hidden
      style="margin-top:12px"></div>

    <div id="presenceMemberMEDFAH"
      style="margin-top:12px"></div>

    <label for="presenceStatusMEDFAH"
      style="display:block;margin-top:14px">
      Statut
    </label>

    <select id="presenceStatusMEDFAH"
      style="width:100%;padding:12px">
      <option value="présent">Présent</option>
      <option value="en_retard">En retard</option>
    </select>

    <button id="presenceSaveMEDFAH" type="button"
      disabled style="width:100%;padding:12px;margin-top:10px">
      Enregistrer la présence
    </button>

    <div id="presenceMessageMEDFAH"
      role="status"
      style="margin-top:12px;overflow-wrap:anywhere"></div>
  `;

  zone.appendChild(section);

  const $ = id => document.getElementById(id);

  const session = $("presenceSessionMEDFAH");
  const card = $("presenceCardMEDFAH");
  const memberBox = $("presenceMemberMEDFAH");
  const status = $("presenceStatusMEDFAH");
  const save = $("presenceSaveMEDFAH");
  const msg = $("presenceMessageMEDFAH");
  const qrBox = $("presenceQRReaderMEDFAH");
  const start = $("presenceStartQRMEDFAH");
  const stop = $("presenceStopQRMEDFAH");

  let chosen = null;
  let scanner = null;
  let running = false;
  let saving = false;
  let pointageMode = "manuel";

  function tell(message, error = false) {
    msg.textContent = message;
    msg.style.cssText =
      "padding:10px;margin-top:12px;overflow-wrap:anywhere;" +
      (error
        ? "background:#ffedd5;color:#9a3412"
        : "background:#dcfce7;color:#166534");
  }

  function updateButton() {
    save.disabled = saving || !session.value || !chosen;
  }

  async function headers() {
    return await obtenirEntetesAuthentifiees();
  }

  async function req(table, params, method = "GET", body = null) {
    const h = await headers();
    const query = params.toString();

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/${table}` +
      (query ? `?${query}` : ""),
      {
        method,
        headers: {
          ...h,
          ...(method === "POST"
            ? { Prefer: "return=representation" }
            : {})
        },
        body: body === null ? undefined : JSON.stringify(body)
      }
    );

    if (!response.ok) {
      throw new Error(
        `Erreur ${response.status} (${table}): ${await response.text()}`
      );
    }

    const result = await response.text();
    return result ? JSON.parse(result) : [];
  }

  function today() {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Port-au-Prince",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(new Date());

    const get = type =>
      parts.find(part => part.type === type).value;

    return `${get("year")}-${get("month")}-${get("day")}`;
  }

  /* CHARGER LES SERVICES OUVERTS DU JOUR */
  async function loadSessions() {
    session.innerHTML = "<option value=''>Chargement...</option>";

    try {
      const params = new URLSearchParams({
        select: "id,nom_service,date_service,heure_debut,heure_fin,statut",
        date_service: `eq.${today()}`,
        statut: "eq.ouvert",
        order: "heure_debut.asc"
      });

      const rows = await req("sessions_presence", params);

      session.innerHTML = "";

      const first = document.createElement("option");
      first.value = "";
      first.textContent = rows.length
        ? "Choisir un service ouvert"
        : "Aucun service ouvert aujourd'hui";

      session.appendChild(first);

      rows.forEach(service => {
        const option = document.createElement("option");
        option.value = service.id;
        option.textContent =
          `${service.nom_service} — ` +
          `${service.heure_debut || ""} à ${service.heure_fin || ""}`;

        session.appendChild(option);
      });

      updateButton();

    } catch (error) {
      session.innerHTML =
        "<option value=''>Connexion requise</option>";
      tell(error.message, true);
    }
  }

  /* RECHERCHE D'UN MEMBRE */
  async function searchMember() {
    chosen = null;
    memberBox.replaceChildren();
    updateButton();

    const value = card.value.trim();

    if (!value) {
      tell("Saisissez ou scannez le numéro de carte ou le code.", true);
      return;
    }

    try {
      const params = new URLSearchParams({
        select: "id,nom,prenom,numero_carte,carte_numerique,code,qr_token",
        or:
          `(qr_token.eq.${value},` +
          `carte_numerique.eq.${value},` +
          `numero_carte.eq.${value},code.eq.${value})`,
        limit: "1"
      });

      const rows = await req("membre_infos", params);

      if (!rows.length) {
        tell("Aucun membre trouvé. Vérifiez le numéro ou le code.", true);
        return;
      }

      chosen = rows[0];

      const name = document.createElement("strong");
      name.textContent =
        `${chosen.nom || ""} ${chosen.prenom || ""}`.trim();

      const number = document.createElement("p");
      number.textContent =
        "Carte / code : " +
        (
          chosen.numero_carte ||
          chosen.carte_numerique ||
          chosen.code ||
          "—"
        );

      memberBox.append(name, number);

      updateButton();
      tell("Membre identifié. Vérifiez le service.");

    } catch (error) {
      tell(error.message, true);
    }
  }

  /* EXTRAIRE LE TOKEN DU QR CODE */
  function extractQR(text) {
    const value = String(text || "").trim();

    try {
      const url = new URL(value);
      return (
        url.searchParams.get("qr_token") ||
        url.searchParams.get("token") ||
        value
      );
    } catch (_) {
      return value;
    }
  }

  /* DÉMARRER LE SCANNER */
  async function startQR() {
    if (!window.Html5Qrcode) {
      tell("Lecteur QR non chargé. Vérifiez la bibliothèque QR Code.", true);
      return;
    }

    if (running) return;

    try {
      qrBox.hidden = false;
      start.disabled = true;

      scanner = new Html5Qrcode("presenceQRReaderMEDFAH");

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 230, height: 230 }
        },
        async text => {
          pointageMode = "qr";
          card.value = extractQR(text);

          await stopQR();
          await searchMember();
        },
        () => {}
      );

      running = true;
      stop.disabled = false;

      tell("Pointez la caméra vers le QR Code.");

    } catch (error) {
      running = false;
      scanner = null;
      start.disabled = false;
      qrBox.hidden = true;

      tell(
        "Impossible d'ouvrir la caméra. Autorisez l'accès à la caméra. " +
        (error.message || ""),
        true
      );
    }
  }

  /* ARRÊTER LE SCANNER */
  async function stopQR() {
    if (scanner && running) {
      try {
        await scanner.stop();
      } catch (error) {
        console.warn("Arrêt caméra :", error);
      }
    }

    running = false;
    scanner = null;
    qrBox.hidden = true;
    start.disabled = false;
    stop.disabled = true;
  }

  /* ENREGISTRER LA PRÉSENCE SANS DOUBLON */
  async function saveAttendance() {
    if (saving || !session.value || !chosen) {
      tell("Choisissez un service et identifiez un membre.", true);
      return;
    }

    saving = true;
    updateButton();

    try {
      const params = new URLSearchParams({
        select: "id",
        session_id: `eq.${session.value}`,
        membre_id: `eq.${chosen.id}`,
        limit: "1"
      });

      const existing = await req("presences_eglise", params);

      if (existing.length) {
        tell("Ce membre est déjà enregistré pour ce service.", true);
        return;
      }

      await req(
        "presences_eglise",
        new URLSearchParams(),
        "POST",
        {
          session_id: Number(session.value),
          membre_id: Number(chosen.id),
          heure_pointage: new Date().toISOString(),
          statut: status.value,
          mode_pointage: pointageMode,
          observation: null
        }
      );

      tell("Présence enregistrée avec succès.");

      card.value = "";
      chosen = null;
      pointageMode = "manuel";
      memberBox.replaceChildren();

    } catch (error) {
      tell(error.message, true);

    } finally {
      saving = false;
      updateButton();
    }
  }

  $("presenceReloadMEDFAH").addEventListener("click", loadSessions);
  $("presenceSearchMEDFAH").addEventListener("click", searchMember);

  start.addEventListener("click", startQR);
  stop.addEventListener("click", stopQR);
  save.addEventListener("click", saveAttendance);

  card.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      pointageMode = "manuel";
      searchMember();
    }
  });

  session.addEventListener("change", updateButton);

  loadSessions();
}

/* LANCEMENT DU MODULE DE PRÉSENCE */
if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    initialiserPresenceMEDFAH
  );
} else {
  initialiserPresenceMEDFAH();
}


