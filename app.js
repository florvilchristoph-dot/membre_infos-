

 // ======================================================
 // MEDFAH - APPLICATION
 // ======================================================

const SUPABASE_URL = window.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || "";

let clientMembresMEDFAH = null;

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

async function obtenirEntetesAuthentifiees() {
    if (!clientMembresMEDFAH) {
        throw new Error("Configuration Supabase indisponible.");
    }

    const { data, error } =
        await clientMembresMEDFAH.auth.getSession();

    if (error) throw error;

    if (!data.session) {
        throw new Error(
            "Session absente. Connectez-vous d'abord dans Administration."
        );
    }

    return {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${data.session.access_token}`
    };
}

document.addEventListener("DOMContentLoaded", () => {
    if (!clientMembresMEDFAH) {
    console.error("Configuration Supabase manquante.");

    const app = document.getElementById("app");

    if (app) {
        app.innerHTML = `
            <div class="message error">
                Configuration Supabase indisponible.
                Vérifiez config.js.
            </div>
        `;
    }

    return;
}

    const currentPage = window.location.pathname
        .split("/")
        .pop()
        .toLowerCase();

    if (currentPage === "" || currentPage === "index.html") {
        chargerStatistiques();
        return;
    }

    if (currentPage === "membre.html") {
        const app = document.getElementById("app");
        if (!app) return;

        const params = new URLSearchParams(window.location.search);
        const memberId = params.get("id");
        const recherche = params.get("q") || "";

        if (memberId) {
            chargerMembre(memberId, app);
        } else {
            chargerMembres(recherche, app);
        }
    }
});


// ======================================================
// STATISTIQUES ACCUEIL
// ======================================================

async function chargerStatistiques(){

    try{

        const url =
            `${window.SUPABASE_URL}/rest/v1/membre_infos?select=*`;

        const response =
            await fetch(
                url,
                {
                    method:"GET",

                    headers:{
                        "apikey":
                            window.SUPABASE_ANON_KEY,

                        "Authorization":
                            `Bearer ${window.SUPABASE_ANON_KEY}`
                    }
                }
            );


        if(!response.ok){

            throw new Error(
                "Erreur Supabase : " +
                response.status
            );

        }


        const membres =
            await response.json();


        // Total membres

        const totalMembers =
            document.getElementById(
                "totalMembers"
            );

        if(totalMembers){

            totalMembers.textContent =
                membres.length;

        }


        // Assemblées uniques

        const assemblees =
            new Set();


        membres.forEach(
            membre => {

                const valeur =
                    getField(
                        membre,
                        "assemblee"
                    );

                if(
                    valeur &&
                    String(valeur).trim()
                ){

                    assemblees.add(
                        String(valeur)
                            .trim()
                    );

                }

            }
        );


        const totalAssemblees =
            document.getElementById(
                "totalAssemblees"
            );


        if(totalAssemblees){

            totalAssemblees.textContent =
                assemblees.size;

        }


        // Cartes

        const cartes =
            membres.filter(
                membre => {

                    const numero =
                        getField(
                            membre,
                            "numero_carte"
                        );

                    return (
                        numero !== null &&
                        numero !== undefined &&
                        String(numero).trim() !== ""
                    );

                }
            );


        const totalCartes =
            document.getElementById(
                "totalCartes"
            );


        if(totalCartes){

            totalCartes.textContent =
                cartes.length;

        }


    }catch(error){

        console.error(
            "Erreur statistiques :",
            error
        );

    }

}


// ======================================================
// CHARGER MEMBRES
// ======================================================




async function chargerMembre(id, app) {
    app.innerHTML = `
        <div class="message">
            Chargement du dossier du membre...
        </div>
    `;

    try {
        const entetes = await obtenirEntetesAuthentifiees();

        const url =
            `${window.SUPABASE_URL}/rest/v1/membre_infos` +
            `?id=eq.${encodeURIComponent(id)}&select=*`;

        const response = await fetch(url, {
            method: "GET",
            headers: {
                ...entetes,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            const details = await response.text();
            console.error(
                "Erreur chargement membre :",
                response.status,
                details
            );
            throw new Error("Erreur Supabase : " + response.status);
        }

        const data = await response.json();

        if (!data.length) {
            app.innerHTML = `
                <div class="message error">
                    Aucun membre trouvé.
                </div>
            `;
            return;
        }

        afficherDossier(data[0], app);

    } catch (error) {
        console.error(
            "Erreur chargement dossier :",
            error
        );

        app.innerHTML = `
            <div class="message error">
                Impossible de charger le dossier du membre.
                <br><br>
                ${echapper(error.message)}
            </div>
        `;
    }
}

async function chargerMembres(recherche, app) {
    app.innerHTML = `
        <div class="message">
            Chargement des membres...
        </div>
    `;

    try {
        const url =
    `${SUPABASE_URL}/rest/v1/rpc/get_public_member_names`;

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "apikey": SUPABASE_ANON_KEY,
                "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
                "Content-Type": "application/json"
            },
            body: "{}"
        });

        if (!response.ok) {
            const details = await response.text();
            console.error("Erreur liste des membres :", details);
            throw new Error(
                "Impossible de charger les membres (" +
                response.status + ")."
            );
        }

        const membres = await response.json();
        const terme = String(recherche || "")
            .trim()
            .toLocaleLowerCase("fr");

        const resultat = membres.filter(membre => {
            const nomComplet =
                `${membre.nom || ""} ${membre.prenom || ""}`
                    .toLocaleLowerCase("fr");

            return nomComplet.includes(terme);
        });

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
                    <button id="boutonRecherchePublic" type="button">
                        Rechercher
                    </button>
                </div>
                <p class="result-info" id="nombreMembresPublic"></p>
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

        const champRecherche =
            document.getElementById("rechercheMembrePublic");

        const corps =
            document.getElementById("corpsListeMembresPublic");

        const nombre =
            document.getElementById("nombreMembresPublic");

        function afficherResultats(texte) {
            const filtre = membres.filter(membre => {
                const complet =
                    `${membre.nom || ""} ${membre.prenom || ""}`
                        .toLocaleLowerCase("fr");

                return complet.includes(
                    String(texte || "").trim().toLocaleLowerCase("fr")
                );
            });

            nombre.textContent =
                `${filtre.length} membre(s)`;

            if (!filtre.length) {
                corps.innerHTML = `
                    <tr>
                        <td colspan="2">Aucun membre trouvé.</td>
                    </tr>
                `;
                return;
            }

            corps.innerHTML = filtre.map(membre => `
                <tr>
                    <td>${echapper(membre.nom || "-")}</td>
                    <td>${echapper(membre.prenom || "-")}</td>
                </tr>
            `).join("");
        }

        champRecherche.value = recherche || "";
        afficherResultats(recherche);

        document.getElementById("boutonRecherchePublic")
            .addEventListener("click", () => {
                afficherResultats(champRecherche.value);
            });

        champRecherche.addEventListener("input", () => {
            afficherResultats(champRecherche.value);
        });

    } catch (error) {
        console.error("Chargement des membres :", error);

        app.innerHTML = `
            <div class="message error">
                Impossible de charger les membres.
                <br><br>
                ${echapper(error.message)}
            </div>
        `;
    }
}



// ======================================================
// DOSSIER
// ======================================================


function afficherDossier(membre, app) {
    // Li yon chan ak plizyè non posib san li pa pèdi done yo.
    function valè(...noms) {
        for (const nom of noms) {
            const resultat = getField(membre, nom);
            if (resultat !== null &&
                resultat !== undefined &&
                String(resultat).trim() !== "") {
                return resultat;
            }
        }
        return "-";
    }

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
                        ${champ("Code", valè("code"))}
                        ${champ("N° carte", valè("numero_carte", "carte_numerique"))}
                        ${champ("Nom", valè("nom"))}
                        ${champ("Prénom", valè("prenom"))}
                        ${champ("Sexe", valè("sexe"))}
                        ${champ("Date de naissance", valè("date_naissance"))}
                        ${champ("Lieu de naissance", valè("lieu_naissance"))}
                        ${champ("Nationalité", valè("nationaliste"))}
                        ${champ("Situation matrimoniale", valè("situation_matrimoniale"))}
                    </div>
                </section>

                <section class="section">
                    <h3>Informations familiales</h3>
                    <div class="grid">
                        ${champ("Nom du père", valè("nom_pere", "nom père"))}
                        ${champ("Nom de la mère", valè("nom_mere", "nom mere", "nom mère"))}
                        ${champ("Nom du conjoint", valè("nom_conjoint"))}
                        ${champ("Nombre d'enfants", valè("nombre_enfants"))}
                    </div>
                </section>

                <section class="section">
                    <h3>Contact</h3>
                    <div class="grid">
                        ${champ("Téléphone", valè("telephone", "telefone"))}
                        ${champ("Téléphone secondaire", valè("telephone_secondaire"))}
                        ${champ("WhatsApp", valè("whatsapp", "watsapp"))}
                        ${champ("Email", valè("email"))}
                        ${champ("Adresse", valè("adresse"))}
                        ${champ("Commune", valè("commune"))}
                        ${champ("Département", valè("departement"))}
                    </div>
                </section>

                <section class="section">
                    <h3>Ministères et responsabilités</h3>
                    <div class="grid">
                        ${champ("Fonction", valè("fonction"))}
                        ${champ("Profession", valè("profession"))}
                        ${champ("Assemblée", valè("assemblee", "assemblée"))}
                        ${champ("Statut", valè("statut", "status"))}
                        ${champ("Responsable de l'enregistrement", valè("responsable_enregistrement"))}
                    </div>
                </section>

                <section class="section">
                    <h3>Vie spirituelle</h3>
                    <div class="grid">
                        ${champ("Date d'adhésion", valè("date_adhesion"))}
                        ${champ("Date de conversion", valè("conversion_date", "date_conversion"))}
                        ${champ("Date de baptême", valè("date_bapteme", "date_bapteme"))}
                        ${champ("Pasteur responsable", valè("pasteur_responsable"))}
                        ${champ("Formation biblique", valè("formation_biblique"))}
                        ${champ("Groupe d'église", valè("groupe_eglise"))}
                    </div>
                </section>

                <section class="section">
                    <h3>Personne à contacter en cas d'urgence</h3>
                    <div class="grid">
                        ${champ("Nom", valè("personne_urgence"))}
                        ${champ("Téléphone", valè("urgence_telephonique", "telephone_urgence"))}
                        ${champ("Relation", valè("relation_urgence"))}
                    </div>
                </section>

                <section class="section">
                    <h3>Suivi / Observations</h3>
                    <div class="field">
                        <span>${echapper(
                            valè("observation", "observations") === "-"
                                ? "Aucune observation."
                                : valè("observation", "observations")
                        )}</span>
                    </div>
                </section>

                <div class="actions">
                    <button class="action-btn primary"
                            onclick="window.print()">
                        🖨 Imprimer
                    </button>

                    <button class="action-btn secondary"
                            onclick="window.location.href='membre.html'">
                        ← Retour à la liste
                    </button>

                    <button class="action-btn secondary"
                            onclick="window.location.href='index.html'">
                        Retour à l'accueil
                    </button>
                </div>
            </div>
        </div>
    `;
}



// ======================================================
// CHAMP
// ======================================================

function champ(
    label,
    valeur
){

    return `

        <div class="field">

            <strong>
                ${echapper(label)}
            </strong>

            <span>
                ${echapper(
                    valeur === null ||
                    valeur === undefined ||
                    valeur === ""
                        ? "-"
                        : valeur
                )}
            </span>

        </div>
    `;

}


// ======================================================
// GET FIELD
// ======================================================

function getField(
    data,
    fieldName
){

    if(!data){
        return "";
    }


    if(
        data[fieldName] !== undefined &&
        data[fieldName] !== null
    ){

        return data[fieldName];

    }


    const normalize =
        text =>
            String(text)
                .normalize("NFD")
                .replace(
                    /[\u0300-\u036f]/g,
                    ""
                )
                .toLowerCase()
                .replace(
                    /[_\s-]/g,
                    ""
                );


    const wanted =
        normalize(fieldName);


    const key =
        Object.keys(data).find(
            k =>
                normalize(k) === wanted
        );


    if(key){
        return data[key];
    }


    return "";

}


// ======================================================
// ESCAPE HTML
// ======================================================

function echapper(
    texte
){

    return String(
        texte ?? ""
    )
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");

}

/* ======================================================
   MEDFAH — MODULE DE PRÉSENCE
   Ajout indépendant : ne remplace pas les fonctions existantes
====================================================== */

function initialiserPresenceMEDFAH() {
   const page = location.pathname.split("/").pop().toLowerCase();

if (
    !["membre.html", "membre"].includes(page) ||
    new URLSearchParams(location.search).has("id")
) {
    return;
}

    const app = document.getElementById("app");

    if (!app || document.getElementById("modulePresenceMEDFAH")) {
        return;
    }

    const module = document.createElement("section");
    module.id = "modulePresenceMEDFAH";
    module.style.cssText =
        "margin-top:24px;padding:20px;background:white;" +
        "border-radius:14px;box-shadow:0 4px 15px #00000012;";

    module.innerHTML = `
        <h2 style="color:#0d47a1">Présences MEDFAH</h2>
        <p>Réservé aux administrateurs connectés.</p>

        <label for="presenceSessionMEDFAH">Service ouvert</label>
        <select id="presenceSessionMEDFAH"
            style="width:100%;padding:12px;margin:8px 0;border:1px solid #cbd5e1;border-radius:8px">
            <option value="">Chargement des services...</option>
        </select>

        <button type="button" id="presenceReloadMEDFAH"
            style="width:100%;padding:12px;background:#475569;color:white;border:0;border-radius:8px">
            Actualiser les services
        </button>

        <label for="presenceCardMEDFAH" style="display:block;margin-top:16px">
            Numéro de carte MEDFAH
        </label>
        <input id="presenceCardMEDFAH" type="search"
            placeholder="Ex. medfah0001" autocomplete="off"
            style="width:100%;padding:12px;margin:8px 0;border:1px solid #cbd5e1;border-radius:8px">

        <button type="button" id="presenceSearchMEDFAH"
            style="width:100%;padding:12px;background:#0d47a1;color:white;border:0;border-radius:8px">
            Rechercher le membre
        </button>

        <button type="button" id="presenceStartQRMEDFAH"
            style="width:100%;padding:12px;margin-top:10px;background:#166534;color:white;border:0;border-radius:8px">
            Scanner le QR Code
        </button>

        <button type="button" id="presenceStopQRMEDFAH" disabled
            style="width:100%;padding:12px;margin-top:8px;background:#475569;color:white;border:0;border-radius:8px">
            Arrêter la caméra
        </button>

        <div id="presenceQRReaderMEDFAH" hidden style="margin-top:12px"></div>
        <div id="presenceMemberMEDFAH" style="margin-top:12px"></div>

        <label for="presenceStatusMEDFAH" style="display:block;margin-top:16px">
            Statut
        </label>
        <select id="presenceStatusMEDFAH"
            style="width:100%;padding:12px;margin:8px 0;border:1px solid #cbd5e1;border-radius:8px">
            <option value="présent">Présent</option>
            <option value="en_retard">En retard</option>
        </select>

        <button type="button" id="presenceSaveMEDFAH" disabled
            style="width:100%;padding:13px;margin-top:10px;background:#0d47a1;color:white;border:0;border-radius:8px">
            Enregistrer la présence
        </button>

        <div id="presenceMessageMEDFAH" role="status" aria-live="polite"
            style="margin-top:12px;overflow-wrap:anywhere"></div>
    `;

    app.prepend(module);

    const byId = id => document.getElementById(id);
    const sessionSelect = byId("presenceSessionMEDFAH");
    const cardInput = byId("presenceCardMEDFAH");
    const memberBox = byId("presenceMemberMEDFAH");
    const statusSelect = byId("presenceStatusMEDFAH");
    const saveButton = byId("presenceSaveMEDFAH");
    const messageBox = byId("presenceMessageMEDFAH");
    const qrBox = byId("presenceQRReaderMEDFAH");
    const startButton = byId("presenceStartQRMEDFAH");
    const stopButton = byId("presenceStopQRMEDFAH");

    let selectedMember = null;
    let qrScanner = null;
    let scannerRunning = false;
    let saving = false;

    function message(text, error = false) {
        messageBox.textContent = text;
        messageBox.style.cssText =
            "margin-top:12px;padding:12px;border-radius:8px;overflow-wrap:anywhere;" +
            (error
                ? "background:#ffedd5;color:#9a3412"
                : "background:#dcfce7;color:#166534");
    }

    function getClient() {
        if (!clientMembresMEDFAH) {
            throw new Error("Configuration Supabase indisponible.");
        }
        return clientMembresMEDFAH;
    }

    async function authenticatedHeaders() {
        const client = getClient();
        const { data, error } = await client.auth.getSession();

        if (error) throw error;

        if (!data.session) {
            throw new Error(
                "Session administrateur absente. Connectez-vous dans Administration, puis revenez ici."
            );
        }

        return {
            apikey: SUPABASE_ANON_KEY,
            Authorization: "Bearer " + data.session.access_token,
            "Content-Type": "application/json"
        };
    }

    async function tableRequest(table, params, method = "GET", body = null) {
        const headers = await authenticatedHeaders();
        const query = params.toString();
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/${table}${query ? "?" + query : ""}`,
            {
                method,
                headers: {
                    ...headers,
                    ...(method === "POST"
                        ? { Prefer: "return=representation" }
                        : {})
                },
                body: body === null ? undefined : JSON.stringify(body)
            }
        );

        if (!response.ok) {
            const details = await response.text();
            console.error("MEDFAH présence:", table, response.status, details);
            throw new Error(
                `Erreur ${response.status} sur ${table}. ${details}`
            );
        }

        const text = await response.text();
        return text ? JSON.parse(text) : [];
    }

    function haitiDate() {
        const parts = new Intl.DateTimeFormat("en-CA", {
            timeZone: "America/Port-au-Prince",
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }).formatToParts(new Date());

        const value = type => parts.find(part => part.type === type).value;
        return `${value("year")}-${value("month")}-${value("day")}`;
    }

    async function loadSessions() {
        sessionSelect.innerHTML = "<option value=''>Chargement...</option>";

        try {
            const params = new URLSearchParams({
                select: "id,nom_services,date_service,heure_debut,heure_fin,statut",
                date_service: "eq." + haitiDate(),
                statut: "eq.ouvert",
                order: "heure_debut.asc"
            });

            const sessions = await tableRequest("sessions_presence", params);
            sessionSelect.replaceChildren();

            const first = document.createElement("option");
            first.value = "";
            first.textContent = sessions.length
                ? "Choisir un service ouvert"
                : "Aucun service ouvert aujourd'hui";
            sessionSelect.appendChild(first);

            sessions.forEach(session => {
                const option = document.createElement("option");
                option.value = session.id;
                option.textContent =
                    `${session.nom_services} — ${session.heure_debut} à ${session.heure_fin}`;
                sessionSelect.appendChild(option);
            });

            updateSaveButton();
        } catch (error) {
            sessionSelect.innerHTML = "<option value=''>Erreur de chargement</option>";
            message(error.message, true);
        }
    }

    function updateSaveButton() {
        saveButton.disabled = saving || !sessionSelect.value || !selectedMember;
    }

    async function searchMember() {
        selectedMember = null;
        memberBox.replaceChildren();
        updateSaveButton();

        const card = cardInput.value.trim();
        if (!card) {
            message("Saisissez ou scannez le numéro de carte MEDFAH.", true);
            return;
        }

        try {
            const params = new URLSearchParams({
                select: "id,nom,prenom,carte_numerique",
                carte_numerique: "eq." + card,
                limit: "1"
            });

            const rows = await tableRequest("membre_infos", params);

            if (!rows.length) {
                message("Aucun membre trouvé. Vérifiez le numéro de carte.", true);
                return;
            }

            selectedMember = rows[0];

            const name = document.createElement("strong");
            name.textContent =
                `${selectedMember.nom || ""} ${selectedMember.prenom || ""}`.trim();

            const cardInfo = document.createElement("p");
            cardInfo.textContent =
                "Carte MEDFAH : " + (selectedMember.carte_numerique || "—");

            memberBox.append(name, cardInfo);
            updateSaveButton();
            message("Membre identifié. Vérifiez le service avant d'enregistrer.");
        } catch (error) {
            message(error.message, true);
        }
    }

    function extractCardNumber(text) {
        const raw = String(text || "").trim();

        try {
            const parsed = new URL(raw);
            for (const value of parsed.searchParams.values()) {
                if (/^medfah[0-9]+$/i.test(value.trim())) return value.trim();
            }
            const match = parsed.pathname.match(/medfah[0-9]+/i);
            if (match) return match[0];
        } catch (_) {}

        const match = raw.match(/medfah[0-9]+/i);
        return match ? match[0] : raw;
    }

    async function startQR() {
        if (!window.Html5Qrcode) {
            message("Le lecteur QR ne s'est pas chargé. Vérifiez la connexion Internet.", true);
            return;
        }

        if (scannerRunning) return;

        try {
            qrBox.hidden = false;
            startButton.disabled = true;
            message("Ouverture de la caméra...");

            qrScanner = new Html5Qrcode("presenceQRReaderMEDFAH");

            await qrScanner.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 230, height: 230 } },
                async decodedText => {
                    if (!scannerRunning && !qrScanner) return;

                    const card = extractCardNumber(decodedText);
                    cardInput.value = card;
                    await stopQR();
                    await searchMember();
                },
                () => {}
            );

            scannerRunning = true;
            stopButton.disabled = false;
            message("Pointez la caméra vers le QR Code de la carte MEDFAH.");
        } catch (error) {
            scannerRunning = false;
            startButton.disabled = false;
            stopButton.disabled = true;
            qrBox.hidden = true;
            message(
                "Impossible d'ouvrir la caméra. Autorisez son accès et utilisez HTTPS. " +
                (error.message || ""),
                true
            );
        }
    }

    async function stopQR() {
        if (qrScanner && scannerRunning) {
            try {
                await qrScanner.stop();
            } catch (_) {}
        }

        scannerRunning = false;
        qrScanner = null;
        qrBox.hidden = true;
        startButton.disabled = false;
        stopButton.disabled = true;
    }

    async function saveAttendance() {
        if (saving || !sessionSelect.value || !selectedMember) {
            message("Choisissez un service et identifiez un membre.", true);
            return;
        }

        saving = true;
        updateSaveButton();

        try {
            const duplicateParams = new URLSearchParams({
                select: "id",
                session_id: "eq." + sessionSelect.value,
                membre_id: "eq." + selectedMember.id,
                limit: "1"
            });

            const existing = await tableRequest(
                "presences_eglise",
                duplicateParams
            );

            if (existing.length) {
                message("Ce membre est déjà enregistré pour ce service.", true);
                return;
            }

            await tableRequest(
                "presences_eglise",
                new URLSearchParams(),
                "POST",
                {
                    session_id: Number(sessionSelect.value),
                    membre_id: Number(selectedMember.id),
                    heure_pointage: new Date().toISOString(),
                    statut: statusSelect.value,
                    mode_pointage: "qr",
                    observation: null
                }
            );

            message("Présence enregistrée avec succès.");
            cardInput.value = "";
            selectedMember = null;
            memberBox.replaceChildren();
        } catch (error) {
            message(error.message, true);
        } finally {
            saving = false;
            updateSaveButton();
        }
    }

    byId("presenceReloadMEDFAH").addEventListener("click", loadSessions);
    byId("presenceSearchMEDFAH").addEventListener("click", searchMember);
    startButton.addEventListener("click", startQR);
    stopButton.addEventListener("click", stopQR);
    saveButton.addEventListener("click", saveAttendance);

    cardInput.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            event.preventDefault();
            searchMember();
        }
    });

    sessionSelect.addEventListener("change", updateSaveButton);

    loadSessions();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialiserPresenceMEDFAH);
} else {
    initialiserPresenceMEDFAH();
}

