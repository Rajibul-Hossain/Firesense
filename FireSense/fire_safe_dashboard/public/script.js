import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";

import { 
    getAuth,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    setPersistence,
    browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";


// ⚠️ FIREBASE CONFIG

const firebaseConfig = {

    apiKey: "AIzaSyAAl85IvWatbWiLl7MkCNydknJsttGGktk",

    authDomain: "fire-apsk.firebaseapp.com",

    databaseURL: "https://fire-apsk-default-rtdb.firebaseio.com",

    projectId: "fire-apsk",

    storageBucket: "fire-apsk.firebasestorage.app",

    messagingSenderId: "694099610438",

    appId: "1:694099610438:web:92d00fce314b8b0e49b347",

    measurementId: "G-27X628E1ZL"

};



const app = initializeApp(firebaseConfig);

const auth = getAuth(app);




// ===================================
// KEEP USER LOGGED IN
// ===================================


setPersistence(auth, browserLocalPersistence)

.then(() => {


    onAuthStateChanged(auth, (user) => {


        if (user) {


            console.log(
                "Already logged in:",
                user.email
            );


            // Direct access to dashboard

            window.location.replace(
                "Main/index.html"
            );

        }


    });


});





// ===================================
// ELEMENTS
// ===================================


const loginForm = document.getElementById('login-form');

const emailInput = document.getElementById('email-input');

const passwordInput = document.getElementById('password-input');

const submitBtn = document.getElementById('submit-btn');

const errorMsg = document.getElementById('error-msg');

const glassPanel = document.getElementById('glass-panel');





// ===================================
// LOGIN SYSTEM
// ===================================


loginForm.addEventListener(
'submit',
(e)=>{


    e.preventDefault();



    const email =
        emailInput.value.trim();



    const password =
        passwordInput.value.trim();




    if(!email || !password){

        return;

    }



    const originalText =
        submitBtn.innerText;




    // Loading UI


    submitBtn.innerText =
    "VERIFYING...";


    submitBtn.style.opacity =
    "0.8";



    signInWithEmailAndPassword(
        auth,
        email,
        password
    )



    .then((userCredential)=>{


        console.log(
            "Login success:",
            userCredential.user.email
        );



        errorMsg.classList.remove(
            "show-error"
        );



        submitBtn.innerText =
        "ACCESS GRANTED";



        submitBtn.style.background =
        "#34c759";



        submitBtn.style.opacity =
        "1";





        // Redirect

        setTimeout(()=>{


            window.location.replace(
                "Main/index.html"
            );


        },800);



    })





    .catch((error)=>{


        console.log(error);



        submitBtn.innerText =
        originalText;



        submitBtn.style.opacity =
        "1";



        errorMsg.innerText =
        "Invalid credentials. Access Denied.";



        errorMsg.classList.add(
            "show-error"
        );



        // Shake animation


        glassPanel.classList.add(
            "shake"
        );



        document
        .querySelectorAll('.input-group')
        .forEach(group=>{


            group.style.borderColor =
            "#ff3b30";


        });






        setTimeout(()=>{


            glassPanel.classList.remove(
                "shake"
            );



            document
            .querySelectorAll('.input-group')
            .forEach(group=>{


                group.style.borderColor =
                "rgba(255,255,255,0.08)";


            });



            passwordInput.value =
            "";



            passwordInput.focus();



        },500);



    });



});
// ==========================================
// PROGRESSIVE WEB APP (PWA) REGISTRATION
// ==========================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('[PWA] Service Worker registered securely.', registration.scope);
            })
            .catch(error => {
                console.error('[PWA] Service Worker registration failed:', error);
            });
    });
}