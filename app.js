import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import { 
    getFirestore,
    collection,
    addDoc,
    getDocs,
    updateDoc,
    doc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


const firebaseConfig = {

  apiKey: "AIzaSyC4NYw4bewHQ4M_TctHVQzq1BkJFWJb9W4",

  authDomain: "dm-financeira.firebaseapp.com",

  projectId: "dm-financeira",

  storageBucket: "dm-financeira.firebasestorage.app",

  messagingSenderId: "167583421460",

  appId: "1:167583421460:web:1a34d6d2b8f90973ae8301",

  measurementId: "G-Q4NEDP6435"

};


const app = initializeApp(firebaseConfig);

const db = getFirestore(app);



let clientes = [];



// CADASTRAR CLIENTE

async function salvarCliente(){


    let nome = document.getElementById("nome").value;

    let cpf = document.getElementById("cpf").value;

    let telefone = document.getElementById("telefone").value;

    let endereco = document.getElementById("endereco").value;


    let valor = Number(
        document.getElementById("valor").value
    );


    let data = document.getElementById("data").value;



    if(nome === "" || telefone === ""){

        alert("Preencha nome e telefone");

        return;

    }



    let parcela = 0;


    if(valor == 300) parcela = 17;
    if(valor == 400) parcela = 22;
    if(valor == 500) parcela = 28;
    if(valor == 600) parcela = 33;
    if(valor == 700) parcela = 39;
    if(valor == 800) parcela = 44;
    if(valor == 900) parcela = 50;
    if(valor == 1000) parcela = 56;



    await addDoc(collection(db,"clientes"),{


        nome,

        cpf,

        telefone,

        endereco,

        valor,

        parcela,

        totalParcelas:24,

        pagas:0,

        data


    });



    limpar();


    mostrarClientes();


    alert("Cliente salvo no Firebase!");

}



// BUSCAR CLIENTES

async function mostrarClientes(){


    clientes = [];


    const querySnapshot = await getDocs(
        collection(db,"clientes")
    );



    querySnapshot.forEach((doc)=>{


        clientes.push({

            id:doc.id,

            ...doc.data()

        });


    });



    let lista = document.getElementById(
        "listaClientes"
    );



    lista.innerHTML="";



    if(clientes.length == 0){

        lista.innerHTML=
        "<p>Nenhum cliente cadastrado</p>";

        return;

    }



    clientes.forEach(cliente=>{


        lista.innerHTML += `


        <div class="cliente">


        <h3>${cliente.nome}</h3>


        <p>Telefone: ${cliente.telefone}</p>


        <p>
        Empréstimo: R$ ${cliente.valor}
        </p>


        <p>
        Parcela: R$ ${cliente.parcela}
        </p>


        <p>
        Pagamento:
        ${cliente.pagas}/${cliente.totalParcelas}
        </p>



        <button onclick="pagar('${cliente.id}')">

        Registrar pagamento

        </button>



        <button onclick="whatsapp('${cliente.telefone}','${cliente.nome}')">

        Cobrar WhatsApp

        </button>



        </div>


        `;


    });


}





// REGISTRAR PAGAMENTO

async function pagar(id){


    let cliente = clientes.find(
        c=>c.id===id
    );



    if(cliente.pagas < cliente.totalParcelas){

        cliente.pagas++;

    }



    await updateDoc(
        doc(db,"clientes",id),
        {

            pagas:cliente.pagas

        }
    );



    mostrarClientes();


}




function whatsapp(numero,nome){


    let mensagem =
`Olá ${nome}, passando para lembrar da sua parcela da DM Financeira.`;



    let url =
    "https://wa.me/55"+numero+
    "?text="+
    encodeURIComponent(mensagem);



    window.open(url);


}





function limpar(){


document.getElementById("nome").value="";

document.getElementById("cpf").value="";

document.getElementById("telefone").value="";

document.getElementById("endereco").value="";


}




// deixar funções disponíveis para os botões HTML

window.salvarCliente = salvarCliente;

window.pagar = pagar;

window.whatsapp = whatsapp;



mostrarClientes();
