

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



async function chargerMembres(recherche, app) {
    app.innerHTML = `
        <div class="message">
            Chargement des membres...
        </div>
    `;

    try {
        // Récupérer le véritable jeton de la session administrateur
        const entetes = await obtenirEntetesAuthentifiees();

        const url =
            `${window.SUPABASE_URL}/rest/v1/membre_infos` +
            `?select=*&order=id.desc`;

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
                "Erreur Supabase :",
                response.status,
                details
            );

            throw new Error(
                "Erreur Supabase : " + response.status
            );
        }

        const membres = await response.json();

        afficherListe(
            membres,
            recherche,
            app
        );

    } catch (error) {
        console.error(
            "Chargement des membres impossible :",
            error
        );

        app.innerHTML = `
            <div class="message error">
                Impossible de charger les membres.
                <br><br>
                ${error.message ===
                "Session absente. Connectez-vous d'abord dans Administration."
                    ? "Connectez-vous d'abord dans Administration."
                    : "Vérifiez la session et les autorisations Supabase."}
            </div>
        `;
    }
}


// ======================================================
// AFFICHER LISTE
// ======================================================

function afficherListe(
    membres,
    recherche,
    app
){

    let resultat =
        filtrerMembres(
            membres,
            recherche
        );


    app.innerHTML = `

        <div class="topbar">

            <h2>
                👥 Liste des Membres
            </h2>

            <div class="search-area">

                <input
                    type="search"
                    id="searchMember"
                    placeholder="Rechercher par nom, prénom, assemblée..."
                    value="${echapper(recherche)}"
                >

                <button
                    id="searchButton"
                >
                    🔍 Rechercher
                </button>

            </div>

            <div class="result-info">
                ${resultat.length}
                membre(s) trouvé(s)
            </div>

        </div>

        <div id="tableArea"></div>
    `;


    afficherTableau(
        resultat
    );


    const input =
        document.getElementById(
            "searchMember"
        );


    const button =
        document.getElementById(
            "searchButton"
        );


    function effectuerRecherche(){

        const texte =
            input.value.trim();


        const nouvelleURL =
            texte
                ? `membre.html?q=${encodeURIComponent(texte)}`
                : "membre.html";


        window.history.replaceState(
            {},
            "",
            nouvelleURL
        );


        afficherTableau(
            filtrerMembres(
                membres,
                texte
            )
        );

    }


    button.addEventListener(
        "click",
        effectuerRecherche
    );


    input.addEventListener(
        "keydown",
        event => {

            if(event.key === "Enter"){

                effectuerRecherche();

            }

        }
    );

}


// ======================================================
// TABLEAU
// ======================================================

function afficherTableau(
    resultat
){

    const tableArea =
        document.getElementById(
            "tableArea"
        );


    const info =
        document.querySelector(
            ".result-info"
        );


    if(info){

        info.textContent =
            `${resultat.length} membre(s) trouvé(s)`;

    }


    if(!resultat.length){

        tableArea.innerHTML = `
            <div class="message">
                Aucun membre ne correspond à votre recherche.
            </div>
        `;

        return;
    }


    tableArea.innerHTML = `

        <div class="table-wrapper">

            <table>

                <thead>

                    <tr>
                        <th>Nom</th>
                        <th>Prénom</th>
                        <th>Assemblée</th>
                        <th>Téléphone</th>
                        <th>Fonction</th>
                        <th>Profession</th>
                        <th>Action</th>
                    </tr>

                </thead>

                <tbody>

                    ${resultat
                        .map(
                            membre =>
                                ligneMembre(membre)
                        )
                        .join("")}

                </tbody>

            </table>

        </div>
    `;

}


// ======================================================
// FILTRER
// ======================================================

function filtrerMembres(
    membres,
    recherche
){

    const texte =
        String(
            recherche || ""
        )
        .toLowerCase()
        .trim();


    if(!texte){

        return membres;

    }


    return membres.filter(
        membre => {

            return Object.values(
                membre
            ).some(
                valeur =>
                    String(
                        valeur ?? ""
                    )
                    .toLowerCase()
                    .includes(texte)
            );

        }
    );

}


// ======================================================
// LIGNE MEMBRE
// ======================================================

function ligneMembre(
    membre
){

    const nom =
        getField(
            membre,
            "nom"
        );


    const prenom =
        getField(
            membre,
            "prenom"
        );


    const assemblee =
        getField(
            membre,
            "assemblee"
        );


    const telephone =
        getField(
            membre,
            "telephone"
        ) ||
        getField(
            membre,
            "telefone"
        ) ||
        getField(
            membre,
            "phone"
        );


    const fonction =
        getField(
            membre,
            "fonction"
        );


    const profession =
        getField(
            membre,
            "profession"
        );


    return `

        <tr>

            <td>
                ${echapper(nom || "-")}
            </td>

            <td>
                ${echapper(prenom || "-")}
            </td>

            <td>
                ${echapper(assemblee || "-")}
            </td>

            <td>
                ${echapper(telephone || "-")}
            </td>

            <td>
                ${echapper(fonction || "-")}
            </td>

            <td>
                ${echapper(profession || "-")}
            </td>

            <td>

                <button
                    class="voir-btn"
                    onclick="window.location.href='membre.html?id=${encodeURIComponent(membre.id)}'"
                >
                    Voir
                </button>

            </td>

        </tr>
    `;

}


// ======================================================
// CHARGER UN MEMBRE
// ======================================================

async function chargerMembre(
    id,
    app
){

    app.innerHTML = `
        <div class="message">
            Chargement du dossier du membre...
        </div>
    `;


    try{const entetes = await obtenirEntetesAuthentifiees();

        const url =
            `${window.SUPABASE_URL}/rest/v1/membre_infos` +
            `?id=eq.${encodeURIComponent(id)}` +
            `&select=*`;


    
const entetes = await obtenirEntetesAuthentifiees();

const response = await fetch(url, {headers: {
    ...entetes,
    "Content-Type": "application/json"
}
    method: "GET",
    : {
        ...entetes,
        "Content-Type": "application/json"
    }
});



        if(!response.ok){

            throw new Error(
                "Erreur Supabase : " +
                response.status
            );

        }


        const data =
            await response.json();


        if(!data.length){

            app.innerHTML = `
                <div class="message error">
                    Aucun membre trouvé.
                </div>
            `;

            return;

        }


        afficherDossier(
            data[0],
            app
        );


    }catch(error){

        console.error(error);

        app.innerHTML = `
            <div class="message error">
                Impossible de charger le dossier.
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
