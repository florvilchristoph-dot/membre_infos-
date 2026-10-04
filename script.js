// Fichye script prensipal pou MEDFAH
document.addEventListener('DOMContentLoaded', () => {
    console.log("Paj la chaje nèt, script.js ap mache san pwoblèm!");

    // Tcheke si Supabase disponib
    if (typeof window.SUPABASE_URL !== 'undefined') {
        console.log("Konfigirasyon Supabase detekte nan script la.");
    }
});
