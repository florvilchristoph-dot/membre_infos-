// Aplikasyon prensipal pou MEDFAH
document.addEventListener('DOMContentLoaded', () => {
    console.log("Platfòm MEDFAH chaje ak siksè!");

    // Ou ka ajoute lòt fonksyonalite global isit la si w bezwen yo
    // Pa egzanp, verifye si kle Supabase yo byen mete
    if (typeof SUPABASE_URL !== 'undefined') {
        console.log("Supabase konekte sou URL la.");
    }
});
