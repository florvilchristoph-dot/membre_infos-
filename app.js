// ============================================================
// MEDFAH - APPLICATION MEMBRE
// Connexion avec Supabase
// ============================================================

document.addEventListener("DOMContentLoaded", () => {

    // ----------------------------------------------------------
    // 1. CONFIGURATION SUPABASE
    // ----------------------------------------------------------

    const SUPABASE_URL =
        window.SUPABASE_URL ||
        "https://opgblcglhndfoqhjnuvp.supabase.co";

    const SUPABASE_ANON_KEY =
        window.SUPABASE_ANON_KEY || "";

    const TABLE = "membre_infos";

    // ----------------------------------------------------------
    // 2. VERIFICATION
    // ----------------------------------------------------------

    if (!SUPABASE_URL) {
        console.error("URL Supabase manquante.");
        return;
    }

    if (!SUPABASE_ANON_KEY) {
        console.error("Clé Supabase manquante.");
        afficherMessage(
            "La clé Supabase n'est pas encore configurée.",
            "error"
        );
        return;
    }

    // ----------------------------------------------------------
    // 3. RECUPERER L'ID DANS L'URL
    // Exemple : membreinfos.vercel.app/?id=12
    // ----------------------------------------------------------

    const params = new URLSearchParams(window.location.search);
    const membreId = params.get("id");

    // ----------------------------------------------------------
    // 4. CHARGER LES DONNEES
    // ----------------------------------------------------------

    if (membreId) {
        chargerMembre(membreId);
    } else {
        chargerMembres();
    }


    // ==========================================================
    // FONCTION : CHARGER UN MEMBRE
    // ==========================================================

    async function chargerMembre(id) {

        afficherMessage("Chargement du dossier du membre...");

        try {

            const url =
                `${SUPABASE_URL}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(id)}&select=*`;

            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "apikey": SUPABASE_ANON_KEY,
                    "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
                    "Content-Type": "application/json"
                }
            });

            if (!response.ok) {
                throw new Error(
                    `Erreur Supabase : ${response.status}`
                );
            }

            const data = await response.json();

            if (!data || data.length === 0) {
                afficherMessage(
                    "Aucun membre trouvé.",
                    "error"
                );
                return;
            }

            afficherDossier(data[0]);

        } catch (error) {

            console.error(error);

            afficherMessage(
                "Impossible de charger le dossier du membre.",
                "error"
            );
        }
    }


    // ==========================================================
    // FONCTION : CHARGER TOUS LES MEMBRES
    // ==========================================================

    async function chargerMembres() {

        afficherMessage("Chargement des membres...");

        try {

            const url =
                `${SUPABASE_URL}/rest/v1/${TABLE}?select=*&order=id.desc`;

            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "apikey": SUPABASE_ANON_KEY,
                    "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
                    "Content-Type": "application/json"
                }
            });

            if (!response.ok) {
                throw new Error(
                    `Erreur Supabase : ${response.status}`
                );
            }

            const data = await response.json();

            afficherListe(data);

        } catch (error) {

            console.error(error);

            afficherMessage(
                "Impossible de charger les membres.",
                "error"
            );
        }
    }


    // ==========================================================
    // AFFICHER LA LISTE
    // ==========================================================

    function afficherListe(membres) {

        const zone = obtenirZone();

        if (!membres.length) {

            zone.innerHTML = `
                <div class="message">
                    Aucun membre enregistré.
                </div>
            `;

            return;
        }

        let html = `
            <div class="medfah-header">
                <h1>MEDFAH</h1>
                <h2>DOSSIER DES MEMBRES</h2>
                <p>Mission Église de Dieu de la Foi Apostolique d'Haïti</p>
            </div>

            <div class="membre-liste">
        `;

        membres.forEach(membre => {

            html += `
                <div class="membre-card">

                    <h3>
                        ${echapper(membre.prenom || "")}
                        ${echapper(membre.nom || "")}
                    </h3>

                    <p>
                        <strong>Code :</strong>
                        ${echapper(membre.code || "-")}
                    </p>

                    <p>
                        <strong>Fonction :</strong>
                        ${echapper(membre.fonction || "-")}
                    </p>

                    <p>
                        <strong>Téléphone :</strong>
                        ${echapper(membre.telefone || "-")}
                    </p>

                    <p>
                        <strong>Status :</strong>
                        ${echapper(membre.status || "-")}
                    </p>

                    <button
                        onclick="window.location.href='?id=${membre.id}'">
                        DOSSIER DU MEMBRE
                    </button>

                </div>
            `;
        });

        html += `</div>`;

        zone.innerHTML = html;
    }


    // ==========================================================
    // AFFICHER LE DOSSIER COMPLET
    // ==========================================================

    function afficherDossier(membre) {

        const zone = obtenirZone();

        zone.innerHTML = `

            <div class="medfah-header">
                <h1>MEDFAH</h1>
                <h2>DOSSIER DU MEMBRE</h2>
                <p>
                    Mission Église de Dieu de la Foi Apostolique d'Haïti
                </p>
            </div>


            <!-- IDENTIFICATION -->

            <section class="dossier-section">

                <h2>Informations personnelles</h2>

                <div class="grid">

                    ${champ("Code", membre.code)}

                    ${champ("N° carte", membre.numero_carte)}

                    ${champ("Nom", membre.nom)}

                    ${champ("Prénom", membre.prenom)}

                    ${champ("Sexe", membre.sexe)}

                    ${champ("Date de naissance", membre.date_naissance)}

                    ${champ("Lieu de naissance", membre.lieu_naissance)}

                    ${champ("Nationalité", membre.nationalite)}

                    ${champ(
                        "Situation matrimoniale",
                        membre.situation_matrimoniale
                    )}

                </div>

            </section>


            <!-- CONTACT -->

            <section class="dossier-section">

                <h2>Contact</h2>

                <div class="grid">

                    ${champ("Téléphone", membre.telefone)}

                    ${champ(
                        "Téléphone secondaire",
                        membre.telephone_secondaire
                    )}

                    ${champ("WhatsApp", membre.whatsapp)}

                    ${champ("Email", membre.email)}

                    ${champ("Adresse", membre.adresse)}

                    ${champ("Commune", membre.commune)}

                    ${champ("Département", membre.departement)}

                </div>

            </section>


            <!-- FAMILLE -->

            <section class="dossier-section">

                <h2>Informations familiales</h2>

                <div class="grid">

                    ${champ("Nom du père", membre.nom_pere)}

                    ${champ("Nom de la mère", membre.nom_mere)}

                    ${champ("Nom du conjoint", membre.nom_conjoint)}

                    ${champ(
                        "Nombre d'enfants",
                        membre.nombre_enfants
                    )}

                </div>

            </section>


            <!-- VIE SPIRITUELLE -->

            <section class="dossier-section">

                <h2>Vie spirituelle</h2>

                <div class="grid">

                    ${champ(
                        "Date d'adhésion",
                        membre.date_adhesion
                    )}

                    ${champ(
                        "Date de conversion",
                        membre.date_conversion
                    )}

                    ${champ(
                        "Date de baptême",
                        membre.date_bapteme
                    )}

                    ${champ(
                        "Pasteur responsable",
                        membre.pasteur_responsable
                    )}

                    ${champ(
                        "Formation biblique",
                        membre.formation_biblique
                    )}

                    ${champ(
                        "Groupe d'église",
                        membre.groupe_eglise
                    )}

                </div>

            </section>


            <!-- MINISTERES -->

            <section class="dossier-section">

                <h2>Ministères et responsabilités</h2>

                <div class="grid">

                    ${champ("Fonction", membre.fonction)}

                    ${champ("Profession", membre.profession)}

                    ${champ("Assemblée", membre.assemblee)}

                    ${champ("Status", membre.status)}

                </div>

            </section>


            <!-- URGENCE -->

            <section class="dossier-section">

                <h2>Personne à contacter en cas d'urgence</h2>

                <div class="grid">

                    ${champ(
                        "Nom",
                        membre.personne_urgence
                    )}

                    ${champ(
                        "Téléphone",
                        membre.telephone_urgence
                    )}

                    ${champ(
                        "Relation",
                        membre.relation_urgence
                    )}

                </div>

            </section>


            <!-- OBSERVATIONS -->

            <section class="dossier-section">

                <h2>Suivi / Observations</h2>

                <div class="observation">

                    ${echapper(
                        membre.observations || "Aucune observation."
                    )}

                </div>

            </section>


            <div class="actions">

                <button onclick="window.print()">
                    IMPRIMER
                </button>

                <button onclick="window.history.back()">
                    RETOUR
                </button>

            </div>
        `;
    }


    // ==========================================================
    // CHAMP
    // ==========================================================

    function champ(label, valeur) {

        return `
            <div class="champ">

                <strong>${label}</strong>

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


    // ==========================================================
    // ZONE PRINCIPALE
    // ==========================================================

    function obtenirZone() {

        let zone =
            document.getElementById("app") ||
            document.getElementById("membres-container") ||
            document.getElementById("app-container");

        if (!zone) {

            zone = document.createElement("main");

            zone.id = "app";

            document.body.appendChild(zone);
        }

        return zone;
    }


    // ==========================================================
    // MESSAGE
    // ==========================================================

    function afficherMessage(message, type = "") {

        const zone = obtenirZone();

        zone.innerHTML = `
            <div class="message ${type}">
                ${echapper(message)}
            </div>
        `;
    }


    // ==========================================================
    // SECURITE HTML
    // ==========================================================

    function echapper(texte) {

        return String(texte ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

});
