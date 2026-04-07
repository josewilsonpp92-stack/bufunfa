const firebaseConfig = {
    apiKey: "AIzaSyAFL1zl2j0pHd9ubLdVhQYkmgasWcXxS4w",
    authDomain: "bufunfa-28f2c.firebaseapp.com",
    projectId: "bufunfa-28f2c",
    storageBucket: "bufunfa-28f2c.firebasestorage.app",
    messagingSenderId: "468890025543",
    appId: "1:468890025543:web:8d238c709fe0982da97b62",
    measurementId: "G-YXGWBEW544"
};

// Iniciar a Arquitetura em Modo Nativo Compatível (Funciona sem necessidade de Servidores Locais Node.js)
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

window.CloudApp = {
    auth, db, 
    userId: null,
    
    login: () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        document.getElementById('login-spinner').style.display = 'flex';
        document.getElementById('btn-google-login').style.display = 'none';
        
        auth.signInWithPopup(provider).catch(err => {
            console.error(err);
            alert("Erro durante Autenticação. Você está rodando a partir da nuvem ou do disco local puro? - Erro: " + err.message);
            document.getElementById('login-spinner').style.display = 'none';
            document.getElementById('btn-google-login').style.display = 'flex';
        });
    },
    
    logout: () => {
        auth.signOut();
    },
    
    syncDataUp: async (txList) => {
        if(!window.CloudApp.userId) return;
        try {
            await db.collection("users").doc(window.CloudApp.userId).set({ transactions: txList });
            console.log("Cloud Backup Realizado com Sucesso!");
        } catch(e) {
            console.error("Falha ao reter backup:", e);
        }
    }
};

// Monitor de Sessão em Nuvem
auth.onAuthStateChanged(async (user) => {
    const overlay = document.getElementById('login-overlay');
    
    if (user) {
        window.CloudApp.userId = user.uid;
        document.getElementById('login-spinner').style.display = 'flex';
        document.getElementById('btn-google-login').style.display = 'none';

        try {
            const docSnap = await db.collection("users").doc(user.uid).get();
            if (docSnap.exists) {
                const data = docSnap.data();
                if(data.transactions) {
                    window.transactions = data.transactions;
                    localStorage.setItem('bufunfa_transactions', JSON.stringify(window.transactions));
                }
            } else {
                await window.CloudApp.syncDataUp(window.transactions);
            }
        } catch(e) { 
            console.error("Cloud Fetch error: ", e); 
        }

        overlay.style.transform = 'translateY(-100%)';
        setTimeout(() => overlay.style.display = 'none', 450);
        if (typeof updateUI === 'function') updateUI();
    } else {
        window.CloudApp.userId = null;
        overlay.style.display = 'flex';
        setTimeout(() => overlay.style.transform = 'translateY(0)', 10);
        document.getElementById('login-spinner').style.display = 'none';
        document.getElementById('btn-google-login').style.display = 'flex';
        
        if (typeof closeDrawer === 'function') closeDrawer();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btn-google-login').addEventListener('click', window.CloudApp.login);
    document.getElementById('btn-logout').addEventListener('click', window.CloudApp.logout);
});
