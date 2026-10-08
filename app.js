// ======================================================
// MEDFAH - GESTION DES MEMBRES
// Connexion Supabase
// ======================================================

document.addEventListener("DOMContentLoaded", () => {

    // --------------------------------------------------
    // CONFIGURATION
    // --------------------------------------------------

    const SUPABASE_URL =
        window.SUPABASE_URL ||
        "https://opgblcglhndfoqhjnuvp.supabase.co";

    const SUPABASE_ANON_KEY =
        window.SUPABASE_ANON_KEY || "";

    const TABLE = "membre_infos";

    // --------------------------------------------------
    // IMPORTANT :
    // app.js ne doit pas modifier index.html.
    // Il travaille seulement sur membres.html.
    // --------------------------------------------------

    const currentPage =
        window.location.pathname
            .split("/")
            .pop()
            .toLowerCase();

    if (currentPage !== "membres.html") {
        return;
    }

    const app =
        document.getElementById("app");

    if (!app) {
        return;
    }

    if (!SUPABASE_ANON_KEY) {
        afficherMessage(
            "La clé Supabase n'est pas configurée.",
            true
        );
        return;
    }

    // --------------------------------------------------
    // PARAMÈTRES URL
    // --------------------------------------------------

    const params =
        new URLSearchParams(window.location.search);

    const memberId =
        params.get("id");

    const rechercheURL =
        params.get("q") || "";

    // --------------------------------------------------
    // DEMARRAGE
    // --------------------------------------------------

    if (memberId) {
        chargerMembre(memberId);
    } else {
        chargerMembres(rechercheURL);
    }

    // ==================================================
    // CHARGER TOUS LES MEMBRES
    // ==================================================

    async function chargerMembres(recherche = "") {

        afficherMessage(
            "Chargement des membres..."
        );

        try {

            const url =
                `${SUPABASE_URL}/rest/v1/${TABLE}` +
                `?select=*&order=id.desc`;

            const response =
                await fetch(url, {
                    method: "GET",

                    headers: {
                        "apikey": SUPABASE_ANON_KEY,
                        "Authorization":
                            `Bearer ${SUPABASE_ANON_KEY}`,
                        "Content-Type":
                            "application/json"
                    }
                });

            if (!response.ok) {

                throw new Error(
                    `Erreur Supabase : ${response.status}`
                );
            }

            const membres =
                await response.json();

            console.log(
                "MEMBRES RECUS :",
                membres
            );

            afficherListe(
                membres,
                recherche
            );

        } catch (error) {

            console.error(
                "ERREUR MEMBRES :",
                error
            );

            afficherMessage(
                "Impossible de charger les membres.",
                true
            );
        }
    }

    // ==================================================
    // AFFICHER LA LISTE
    // ==================================================

    function afficherListe(
        membres,
        recherche = ""
    ) {

        let resultat =
            filtrerMembres(
                membres,
                recherche
            );

        app.innerHTML = `

            <div class="topbar">

                <h2>👥 Liste des Membres</h2>

                <div class="search-area">

                    <input
                        type="search"
                        id="searchMember"
                        placeholder="Rechercher par nom, prénom, assemblée, téléphone..."
                        value="${echapper(recherche)}"
                    >

                    <button id="searchButton">
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

        const tableArea =
            document.getElementById("tableArea");

        if (!resultat.length) {

            tableArea.innerHTML = `
                <div class="message">
                    Aucun membre ne correspond à votre recherche.
                </div>
            `;

        } else {

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

                            ${resultat.map(
                                membre => ligneMembre(membre)
                            ).join("")}

                        </tbody>

                    </table>

                </div>
            `;
        }

        const input =
            document.getElementById(
                "searchMember"
            );

        const button =
            document.getElementById(
                "searchButton"
            );

        function effectuerRecherche() {

            const texte =
                input.value.trim();

            const nouvelleURL =
                texte
                    ? `membres.html?q=${encodeURIComponent(texte)}`
                    : "membres.html";

            window.history.replaceState(
                {},
                "",
                nouvelleURL
            );

            afficherListe(
                membres,
                texte
            );
        }

        button.addEventListener(
            "click",
            effectuerRecherche
        );

        input.addEventListener(
            "keydown",
            event => {

                if (event.key === "Enter") {
                    effectuerRecherche();
                }

            }
        );

        input.addEventListener(
            "input",
            () => {

                const texte =
                    input.value.trim();

                const resultatLive =
                    filtrerMembres(
                        membres,
                        texte
                    );

                const info =
                    document.querySelector(
                        ".result-info"
                    );

                if (info) {
                    info.textContent =
                        `${resultatLive.length} membre(s) trouvé(s)`;
                }

                const table =
                    document.querySelector(
                        "#tableArea"
                    );

                if (table) {

                    if (!resultatLive.length) {

                        table.innerHTML = `
                            <div class="message">
                                Aucun membre ne correspond à votre recherche.
                            </div>
                        `;

                    } else {

                        table.innerHTML = `
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
                                        ${resultatLive.map(
                                            membre =>
                                                ligneMembre(membre)
                                        ).join("")}
                                    </tbody>

                                </table>

                            </div>
                        `;
                    }
                }

            }
        );
    }

    // ==================================================
    // FILTRER LES MEMBRES
    // ==================================================

    function filtrerMembres(
        membres,
        recherche
    ) {

        const texte =
            String(recherche || "")
                .toLowerCase()
                .trim();

        if (!texte) {
            return membres;
        }

        return membres.filter(
            membre => {

                const valeurs =
                    Object.values(membre);

                return valeurs.some(
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

    // ==================================================
    // UNE LIGNE DU TABLEAU
    // ==================================================

    function ligneMembre(membre) {

        const nom =
            getField(membre, "nom");

        const prenom =
            getField(membre, "prenom");

        const assemblee =
            getField(membre, "assemblee");

        const telephone =
            getField(membre, "telephone") ||
            getField(membre, "telefone") ||
            getField(membre, "phone");

        const fonction =
            getField(membre, "fonction");

        const profession =
            getField(membre, "profession");

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
                        onclick="window.location.href='membres.html?id=${encodeURIComponent(membre.id)}'"
                    >
                        Voir
                    </button>

                </td>

            </tr>
        `;
    }

    // ==================================================
    // CHARGER UN MEMBRE
    // ==================================================

    async function chargerMembre(id) {

        afficherMessage(
            "Chargement du dossier du membre..."
        );

        try {

            const url =
                `${SUPABASE_URL}/rest/v1/${TABLE}` +
                `?id=eq.${encodeURIComponent(id)}` +
                `&select=*`;

            const response =
                await fetch(url, {
                    method: "GET",

                    headers: {
                        "apikey": SUPABASE_ANON_KEY,
                        "Authorization":
                            `Bearer ${SUPABASE_ANON_KEY}`,
                        "Content-Type":
                            "application/json"
                    }
                });

            if (!response.ok) {

                throw new Error(
                    `Erreur Supabase : ${response.status}`
                );
            }

            const data =
                await response.json();

            if (!data.length) {

                afficherMessage(
                    "Aucun membre trouvé.",
                    true
                );

                return;
            }

            afficherDossier(
                data[0]
            );

        } catch (error) {

            console.error(
                "ERREUR DOSSIER :",
                error
            );

            afficherMessage(
                "Impossible de charger le dossier du membre.",
                true
            );
        }
    }

    // ==================================================
    // DOSSIER COMPLET
    // ==================================================

    function afficherDossier(membre) {

        app.innerHTML = `

            <div class="dossier">

                <div class="dossier-header">

                    <h2>
                        Dossier du membre
                    </h2>

                    <p>
                        MEDFAH
                    </p>

                </div>

                <div class="dossier-body">

                    <section class="section">

                        <h3>
                            Informations personnelles
                        </h3>

                        <div class="grid">

                            ${champ(
                                "Code",
                                getField(membre, "code")
                            )}

                            ${champ(
                                "N° carte",
                                getField(
                                    membre,
                                    "numero_carte"
                                )
                            )}

                            ${champ(
                                "Nom",
                                getField(membre, "nom")
                            )}

                            ${champ(
                                "Prénom",
                                getField(
                                    membre,
                                    "prenom"
                                )
                            )}

                            ${champ(
                                "Sexe",
                                getField(
                                    membre,
                                    "sexe"
                                )
                            )}

                            ${champ(
                                "Date de naissance",
                                getField(
                                    membre,
                                    "date_naissance"
                                )
                            )}

                            ${champ(
                                "Lieu de naissance",
                                getField(
                                    membre,
                                    "lieu_naissance"
                                )
                            )}

                            ${champ(
                                "Nationalité",
                                getField(
                                    membre,
                                    "nationalite"
                                )
                            )}

                            ${champ(
                                "Situation matrimoniale",
                                getField(
                                    membre,
                                    "situation_matrimoniale"
                                )
                            )}

                        </div>

                    </section>


                    <section class="section">

                        <h3>
                            Contact
                        </h3>

                        <div class="grid">

                            ${champ(
                                "Téléphone",
                                getField(
                                    membre,
                                    "telephone"
                                )
                            )}

                            ${champ(
                                "Téléphone secondaire",
                                getField(
                                    membre,
                                    "telephone_secondaire"
                                )
                            )}

                            ${champ(
                                "WhatsApp",
                                getField(
                                    membre,
                                    "whatsapp"
                                )
                            )}

                            ${champ(
                                "Email",
                                getField(
                                    membre,
                                    "email"
                                )
                            )}

                            ${champ(
                                "Adresse",
                                getField(
                                    membre,
                                    "adresse"
                                )
                            )}

                            ${champ(
                                "Commune",
                                getField(
                                    membre,
                                    "commune"
                                )
                            )}

                            ${champ(
                                "Département",
                                getField(
                                    membre,
                                    "departement"
                                )
                            )}

                        </div>

                    </section>


                    <section class="section">

                        <h3>
                            Ministères et responsabilités
                        </h3>

                        <div class="grid">

                            ${champ(
                                "Fonction",
                                getField(
                                    membre,
                                    "fonction"
                                )
                            )}

                            ${champ(
                                "Profession",
                                getField(
                                    membre,
                                    "profession"
                                )
                            )}

                            ${champ(
                                "Assemblée",
                                getField(
                                    membre,
                                    "assemblee"
                                )
                            )}

                            ${champ(
                                "Status",
                                getField(
                                    membre,
                                    "status"
                                )
                            )}

                        </div>

                    </section>


                    <section class="section">

                        <h3>
                            Vie spirituelle
                        </h3>

                        <div class="grid">

                            ${champ(
                                "Date d'adhésion",
                                getField(
                                    membre,
                                    "date_adhesion"
                                )
                            )}

                            ${champ(
                                "Date de conversion",
                                getField(
                                    membre,
                                    "date_conversion"
                                )
                            )}

                            ${champ(
                                "Date de baptême",
                                getField(
                                    membre,
                                    "date_bapteme"
                                )
                            )}

                            ${champ(
                                "Pasteur responsable",
                                getField(
                                    membre,
                                    "pasteur_responsable"
                                )
                            )}

                            ${champ(
                                "Formation biblique",
                                getField(
                                    membre,
                                    "formation_biblique"
                                )
                            )}

                            ${champ(
                                "Groupe d'église",
                                getField(
                                    membre,
                                    "groupe_eglise"
                                )
                            )}

                        </div>

                    </section>


                    <section class="section">

                        <h3>
                            Personne à contacter en cas d'urgence
                        </h3>

                        <div class="grid">

                            ${champ(
                                "Nom",
                                getField(
                                    membre,
                                    "personne_urgence"
                                )
                            )}

                            ${champ(
                                "Téléphone",
                                getField(
                                    membre,
                                    "telephone_urgence"
                                )
                            )}

                            ${champ(
                                "Relation",
                                getField(
                                    membre,
                                    "relation_urgence"
                                )
                            )}

                        </div>

                    </section>


                    <section class="section">

                        <h3>
                            Suivi / Observations
                        </h3>

                        <div class="field">
                            <span>
                                ${echapper(
                                    getField(
                                        membre,
                                        "observations"
                                    ) ||
                                    "Aucune observation."
                                )}
                            </span>
                        </div>

                    </section>


                    <div class="actions">

                        <button
                            class="action-btn primary"
                            onclick="window.print()"
                        >
                            🖨 Imprimer
                        </button>

                        <button
                            class="action-btn secondary"
                            onclick="window.location.href='membres.html'"
                        >
                            ← Retour à la liste
                        </button>

                    </div>

                </div>

            </div>
        `;
    }

    // ==================================================
    // CHAMP DOSSIER
    // ==================================================

    function champ(
        label,
        valeur
    ) {

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

    // ==================================================
    // MESSAGE
    // ==================================================

    function afficherMessage(
        message,
        erreur = false
    ) {

        app.innerHTML = `

            <div class="message ${erreur ? "error" : ""}">
                ${echapper(message)}
            </div>

        `;
    }

    // ==================================================
    // TROUVER UNE COLONNE
    // ==================================================

    function getField(
        data,
        fieldName
    ) {

        if (!data) {
            return "";
        }

        if (
            data[fieldName] !== undefined &&
            data[fieldName] !== null
        ) {
            return data[fieldName];
        }

        const normalize =
            text => String(text)
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

        if (key) {
            return data[key];
        }

        return "";
    }

    // ==================================================
    // PROTECTION CONTRE HTML INJECTÉ
    // ==================================================

    function echapper(texte) {

        return String(
            texte ?? ""
        )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
    }

});
