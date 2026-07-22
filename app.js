import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    doc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// CONFIGURAÇÃO DO FIREBASE
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
let solicitacoes = [];
const FOTO_PADRAO = "https://cdn-icons-png.flaticon.com/512/149/149071.png";

// FORMATAR MOEDA
function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ABRIR / FECHAR HEADER
window.toggleHeader = function() {
    const header = document.getElementById("meuHeader");
    if (header) {
        header.classList.toggle("escondido");
    }
};

// VISUALIZADOR DE IMAGEM EM TELA CHEIA
window.abrirModalImagem = function(src) {
    if (!src) return;
    const modal = document.getElementById("modalImagem");
    const imgModal = document.getElementById("imgModalExpandida");
    if (modal && imgModal) {
        imgModal.src = src;
        modal.classList.add("ativo");
    }
};

window.fecharModalImagem = function() {
    const modal = document.getElementById("modalImagem");
    if (modal) {
        modal.classList.remove("ativo");
    }
};

// CONVERTER E COMPACTAR IMAGEM PARA BASE64
function converterImagemParaBase64(file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            resolve("");
            return;
        }
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800;
                let width = img.width;
                let height = img.height;

                if (width > MAX_WIDTH) {
                    height = Math.round((height * MAX_WIDTH) / width);
                    width = MAX_WIDTH;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, width, height);

                resolve(canvas.toDataURL("image/jpeg", 0.6));
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (error) => reject(error);
    });
}

// CALCULAR DIAS PASSADOS E PARCELAS EM ATRASO
function calcularAtraso(cliente) {
    if (!cliente.data) return { atraso: 0, esperadas: 0, status: 'verde' };

    const [ano, mes, dia] = cliente.data.split('-').map(Number);
    const dataInicio = new Date(ano, mes - 1, dia);
    
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    if (hoje <= dataInicio) {
        return { atraso: 0, esperadas: 0, status: 'verde' };
    }

    let diasAnteriores = 0;
    let dataAtual = new Date(dataInicio);
    dataAtual.setDate(dataAtual.getDate() + 1);

    while (dataAtual < hoje) {
        if (dataAtual.getDay() !== 0) {
            diasAnteriores++;
        }
        dataAtual.setDate(dataAtual.getDate() + 1);
    }

    const hojeEhDiaUtil = (hoje.getDay() !== 0);
    const esperadasAteHoje = diasAnteriores + (hojeEhDiaUtil ? 1 : 0);

    const pagas = Number(cliente.pagas) || 0;

    let atraso = diasAnteriores - pagas;
    if (atraso < 0) atraso = 0;

    let status = 'verde';

    if (atraso > 0) {
        status = 'vermelho';
    } else if (pagas < esperadasAteHoje) {
        status = 'amarelo';
    } else {
        status = 'verde';
    }

    return { atraso, esperadas: esperadasAteHoje, status };
}

// NAVEGAÇÃO ENTRE TELAS
function abrirTela(idTela) {
    document.querySelectorAll('.tela').forEach(tela => {
        tela.classList.remove('ativa');
    });

    const telaAlvo = document.getElementById(idTela);
    if (telaAlvo) {
        telaAlvo.classList.add('ativa');
    }
}

// CADASTRAR CLIENTE DIRETO VIA APP
async function salvarCliente() {
    try {
        let nome = document.getElementById("nome")?.value || "";
        let cpf = document.getElementById("cpf")?.value || "";
        let telefone = document.getElementById("telefone")?.value || "";
        let chavePix = document.getElementById("chavePix")?.value || "";
        let endereco = document.getElementById("endereco")?.value || "";
        let linkLocalizacao = document.getElementById("linkLocalizacao")?.value || "";
        let placaVeiculo = document.getElementById("placaVeiculo")?.value || "";
        let valor = Number(document.getElementById("valor")?.value || 0);
        let data = document.getElementById("data")?.value || "";
        
        let ref1 = document.getElementById("ref1")?.value || "";
        let ref2 = document.getElementById("ref2")?.value || "";
        let ref3 = document.getElementById("ref3")?.value || "";

        let fotoPerfilFile = document.getElementById("fotoCliente")?.files[0];
        let docFrenteVersoFile = document.getElementById("docFrenteVerso")?.files[0];
        let fotoResidenciaFile = document.getElementById("fotoResidencia")?.files[0];
        let printGanhosFile = document.getElementById("printGanhos")?.files[0];

        if (nome === "" || telefone === "" || data === "") {
            alert("Preencha Nome, Telefone e Data do Empréstimo!");
            return;
        }

        let fotoBase64 = await converterImagemParaBase64(fotoPerfilFile);
        let docBase64 = await converterImagemParaBase64(docFrenteVersoFile);
        let resBase64 = await converterImagemParaBase64(fotoResidenciaFile);
        let printBase64 = await converterImagemParaBase64(printGanhosFile);

        const tabelaParcelas = {
            300: 17, 400: 22, 500: 28, 600: 33, 700: 39, 800: 44, 900: 50, 1000: 56
        };

        let parcela = tabelaParcelas[valor] || Math.round((valor * 1.35) / 24);

        await addDoc(collection(db, "clientes"), {
            nome, cpf, telefone, chavePix, endereco, linkLocalizacao, placaVeiculo,
            referencias: [ref1, ref2, ref3],
            valor, parcela, totalParcelas: 24, pagas: 0, data,
            foto: fotoBase64, docFoto: docBase64, resFoto: resBase64, printFoto: printBase64
        });

        limpar();
        await mostrarClientes();
        abrirTela('clientes');
        alert("Empréstimo cadastrado com sucesso!");

    } catch (error) {
        console.error("Erro ao salvar:", error);
        alert("Erro ao salvar: " + error.message);
    }
}

// LISTAR CLIENTES E SOLICITAÇÕES PENDENTES
async function mostrarClientes() {
    try {
        clientes = [];
        solicitacoes = [];

        // 1. Busca Clientes Ativos
        const querySnapshot = await getDocs(collection(db, "clientes"));
        querySnapshot.forEach((documento) => {
            clientes.push({ id: documento.id, ...documento.data() });
        });

        // 2. Busca Solicitações Pendentes enviadas da Web
        const querySol = await getDocs(collection(db, "solicitacoes_pendentes"));
        querySol.forEach((documento) => {
            solicitacoes.push({ id: documento.id, ...documento.data() });
        });

        atualizarDashboard();

        // Renderiza Solicitações Pendentes
        let listaSol = document.getElementById("listaSolicitacoes");
        if (listaSol) {
            listaSol.innerHTML = "";
            if (solicitacoes.length === 0) {
                listaSol.innerHTML = "<p style='color:#888; padding:10px;'>Nenhuma solicitação pendente no momento.</p>";
            } else {
                solicitacoes.forEach(sol => {
                    let urlFoto = sol.foto ? sol.foto : FOTO_PADRAO;
                    listaSol.innerHTML += `
                        <div class="cliente" style="border-left: 4px solid #f39c12; margin-bottom: 12px; padding: 10px; background: #222; border-radius: 8px;">
                            <div class="cliente-header" onclick="abrirSolicitacao('${sol.id}')" style="cursor: pointer;">
                                <img src="${urlFoto}" class="avatar-cliente" alt="Foto">
                                <div>
                                    <h3>⏳ ${sol.nome}</h3>
                                    <p>CPF: ${sol.cpf || 'N/A'}</p>
                                    <p>📞 ${sol.telefone || 'N/A'}</p>
                                    <p>💰 Solicitado: <strong>${formatarMoeda(sol.valor)}</strong></p>
                                </div>
                            </div>
                            <div style="display:flex; gap:10px; margin-top:10px;">
                                <button onclick="aprovarSolicitacao('${sol.id}')" style="background:#27ae60; flex:1; padding:8px; border:none; border-radius:4px; color:#fff; font-weight:bold;">✅ Aprovar</button>
                                <button onclick="recusarSolicitacao('${sol.id}')" style="background:#c0392b; flex:1; padding:8px; border:none; border-radius:4px; color:#fff; font-weight:bold;">❌ Recusar</button>
                            </div>
                        </div>
                    `;
                });
            }
        }

        // Renderiza Clientes
        let lista = document.getElementById("listaClientes");
        if (!lista) return;
        lista.innerHTML = "";

        if (clientes.length === 0) {
            lista.innerHTML = "<p style='padding:10px;'>Nenhum cliente cadastrado.</p>";
            return;
        }

        clientes.forEach(cliente => {
            const { atraso, status } = calcularAtraso(cliente);
            let iconeStatus = '🟢';
            let textoAtraso = 'Em dia';

            if (status === 'vermelho') {
                iconeStatus = '🔴';
                textoAtraso = `<strong style="color: #ff5555;">${atraso} parcelas em atraso</strong>`;
            } else if (status === 'amarelo') {
                iconeStatus = '🟡';
                textoAtraso = 'Em aberto (Hoje)';
            }

            let urlFoto = cliente.foto ? cliente.foto : FOTO_PADRAO;

            lista.innerHTML += `
                <div class="cliente" onclick="abrirCliente('${cliente.id}')">
                    <div class="cliente-header">
                        <img src="${urlFoto}" class="avatar-cliente" alt="Foto">
                        <div>
                            <h3>${iconeStatus} ${cliente.nome}</h3>
                            <p>CPF: ${cliente.cpf || 'Não informado'}</p>
                            <p>🚘 Placa: ${cliente.placaVeiculo || 'N/A'}</p>
                        </div>
                    </div>
                    <p>💰 Empréstimo: ${formatarMoeda(cliente.valor)}</p>
                    <p>🗓️ ${cliente.pagas}/${cliente.totalParcelas} pagas | Status: ${textoAtraso}</p>
                </div>
            `;
        });

    } catch (error) {
        console.error("Erro ao buscar dados:", error);
    }
}

// VISUALIZAR DETALHES DE UMA SOLICITAÇÃO PENDENTE
function abrirSolicitacao(id) {
    let sol = solicitacoes.find(s => s.id === id);
    if (!sol) return;

    let detalhes = document.getElementById("detalhes");
    if (!detalhes) return;

    let urlFoto = sol.foto ? sol.foto : FOTO_PADRAO;
    let refsHtml = (sol.referencias || []).filter(r => r).map(r => `<li>${r}</li>`).join('') || '<li>Nenhuma referência</li>';

    let linkLocHtml = sol.linkLocalizacao 
        ? `<p style="text-align: left;">📍 <strong>Localização:</strong> <a href="${sol.linkLocalizacao}" target="_blank" style="color: #d4af37;">Abrir no Maps</a></p>`
        : '';

    let docImg = sol.docFoto ? `<p><strong>Documento (RG/CNH):</strong> 🔍 <em>(clique p/ ampliar)</em></p><img src="${sol.docFoto}" class="img-anexo" onclick="abrirModalImagem('${sol.docFoto}')">` : '';
    let resImg = sol.resFoto ? `<p><strong>Residência / Comprovante:</strong> 🔍 <em>(clique p/ ampliar)</em></p><img src="${sol.resFoto}" class="img-anexo" onclick="abrirModalImagem('${sol.resFoto}')">` : '';
    let printImg = sol.printFoto ? `<p><strong>Print Ganhos / App:</strong> 🔍 <em>(clique p/ ampliar)</em></p><img src="${sol.printFoto}" class="img-anexo" onclick="abrirModalImagem('${sol.printFoto}')">` : '';

    detalhes.innerHTML = `
    <div class="card" style="text-align: center;">
        <img src="${urlFoto}" class="avatar-detalhe" alt="Foto Perfil" onclick="abrirModalImagem('${urlFoto}')">
        <h2>⏳ Solicitação: ${sol.nome}</h2>
        <p style="text-align: left;"><strong>CPF:</strong> ${sol.cpf || 'Não informado'}</p>
        <p style="text-align: left;"><strong>Telefone:</strong> ${sol.telefone}</p>
        <p style="text-align: left;"><strong>Chave PIX:</strong> ${sol.chavePix || 'Não informada'}</p>
        <p style="text-align: left;"><strong>Endereço:</strong> ${sol.endereco || 'Não informado'}</p>
        ${linkLocHtml}
        <p style="text-align: left;">🚘 <strong>Placa do Veículo:</strong> ${sol.placaVeiculo || 'Não informada'}</p>
        
        <hr style="margin: 10px 0; border-color: #333;">
        
        <p style="text-align: left;">📞 <strong>Contatos de Referência:</strong></p>
        <ul style="text-align: left; margin-left: 20px; font-size: 13px; color: #ccc;">
            ${refsHtml}
        </ul>

        <hr style="margin: 10px 0; border-color: #333;">

        <p style="text-align: left;">💰 <strong>Valor Pedido:</strong> ${formatarMoeda(sol.valor)}</p>
        <p style="text-align: left;">💵 <strong>Parcela Diária Estimada:</strong> ${formatarMoeda(sol.parcela)}/dia</p>
        
        <div style="display:flex; gap:10px; margin-top:15px;">
            <button onclick="aprovarSolicitacao('${sol.id}')" style="background:#27ae60; flex:1;">✅ Aprovar Solicitação</button>
            <button onclick="recusarSolicitacao('${sol.id}')" style="background:#c0392b; flex:1;">❌ Recusar</button>
        </div>

        <div style="text-align: left; margin-top: 14px;">
            ${docImg}
            ${resImg}
            ${printImg}
        </div>

        <button onclick="abrirTela('solicitacoes')" style="margin-top:15px;">⬅ Voltar para Solicitações</button>
    </div>
    `;

    abrirTela('detalhesCliente');
}

// APROVAR SOLICITAÇÃO
async function aprovarSolicitacao(id) {
    let sol = solicitacoes.find(s => s.id === id);
    if (!sol) return;

    let dataHoje = new Date().toISOString().split('T')[0];

    if (!confirm(`Aprovar empréstimo de ${formatarMoeda(sol.valor)} para ${sol.nome}?`)) return;

    try {
        await addDoc(collection(db, "clientes"), {
            nome: sol.nome || "",
            cpf: sol.cpf || "",
            telefone: sol.telefone || "",
            chavePix: sol.chavePix || "",
            endereco: sol.endereco || "",
            linkLocalizacao: sol.linkLocalizacao || "",
            placaVeiculo: sol.placaVeiculo || "",
            referencias: sol.referencias || [],
            valor: Number(sol.valor || 0),
            parcela: Number(sol.parcela || 0),
            totalParcelas: Number(sol.totalParcelas || 24),
            pagas: 0,
            data: dataHoje,
            foto: sol.foto || "",
            docFoto: sol.docFoto || "",
            resFoto: sol.resFoto || "",
            printFoto: sol.printFoto || ""
        });

        await deleteDoc(doc(db, "solicitacoes_pendentes", id));

        alert("Solicitação Aprovada! O cliente já está na lista de ativos.");
        await mostrarClientes();
        abrirTela('clientes');
    } catch (error) {
        console.error("Erro ao aprovar:", error);
        alert("Erro ao aprovar solicitação.");
    }
}

// RECUSAR SOLICITAÇÃO
async function recusarSolicitacao(id) {
    if (!confirm("Deseja recusar e excluir esta solicitação?")) return;

    try {
        await deleteDoc(doc(db, "solicitacoes_pendentes", id));
        alert("Solicitação removida.");
        await mostrarClientes();
        abrirTela('solicitacoes');
    } catch (error) {
        console.error("Erro ao recusar:", error);
    }
}

// DETALHES DO CLIENTE ATIVO
function abrirCliente(id) {
    let cliente = clientes.find(c => c.id === id);
    if (!cliente) return;

    const { atraso, status } = calcularAtraso(cliente);
    let detalhes = document.getElementById("detalhes");
    if (!detalhes) return;

    let textoStatus = '🟢 Em Dia';
    if (status === 'vermelho') textoStatus = `🔴 ATRASADO (${atraso} diária(s) pendentes)`;
    if (status === 'amarelo') textoStatus = '🟡 Em aberto hoje';

    let urlFoto = cliente.foto ? cliente.foto : FOTO_PADRAO;
    let refsHtml = (cliente.referencias || []).filter(r => r).map(r => `<li>${r}</li>`).join('') || '<li>Nenhuma referência</li>';

    let linkLocHtml = cliente.linkLocalizacao 
        ? `<p style="text-align: left;">📍 <strong>Localização:</strong> <a href="${cliente.linkLocalizacao}" target="_blank" style="color: #d4af37;">Abrir no Maps</a></p>`
        : '';

    let docImg = cliente.docFoto ? `<p><strong>Documento (RG/CNH):</strong> 🔍 <em>(clique p/ ampliar)</em></p><img src="${cliente.docFoto}" class="img-anexo" onclick="abrirModalImagem('${cliente.docFoto}')">` : '';
    let resImg = cliente.resFoto ? `<p><strong>Residência / Comprovante:</strong> 🔍 <em>(clique p/ ampliar)</em></p><img src="${cliente.resFoto}" class="img-anexo" onclick="abrirModalImagem('${cliente.resFoto}')">` : '';
    let printImg = cliente.printFoto ? `<p><strong>Print Ganhos / App:</strong> 🔍 <em>(clique p/ ampliar)</em></p><img src="${cliente.printFoto}" class="img-anexo" onclick="abrirModalImagem('${cliente.printFoto}')">` : '';

    detalhes.innerHTML = `
    <div class="card" style="text-align: center;">
        <img src="${urlFoto}" class="avatar-detalhe" alt="Foto Perfil" onclick="abrirModalImagem('${urlFoto}')">
        <h2>${cliente.nome}</h2>
        <p style="text-align: left;"><strong>Status:</strong> ${textoStatus}</p>
        <p style="text-align: left;"><strong>CPF:</strong> ${cliente.cpf || 'Não informado'}</p>
        <p style="text-align: left;"><strong>Telefone:</strong> ${cliente.telefone}</p>
        <p style="text-align: left;"><strong>Chave PIX:</strong> ${cliente.chavePix || 'Não informada'}</p>
        <p style="text-align: left;"><strong>Endereço:</strong> ${cliente.endereco || 'Não informado'}</p>
        ${linkLocHtml}
        <p style="text-align: left;">🚘 <strong>Placa do Veículo:</strong> ${cliente.placaVeiculo || 'Não informada'}</p>
        
        <hr style="margin: 10px 0; border-color: #333;">
        
        <p style="text-align: left;">📞 <strong>Contatos de Referência:</strong></p>
        <ul style="text-align: left; margin-left: 20px; font-size: 13px; color: #ccc;">
            ${refsHtml}
        </ul>

        <hr style="margin: 10px 0; border-color: #333;">

        <p style="text-align: left;">💰 <strong>Empréstimo:</strong> ${formatarMoeda(cliente.valor)}</p>
        <p style="text-align: left;">💵 <strong>Valor Diário Atual:</strong> ${formatarMoeda(cliente.parcela)}/dia</p>
        <p style="text-align: left;">🗓️ <strong>Progresso:</strong> ${cliente.pagas}/${cliente.totalParcelas} dias pagos</p>
        
        <br>
        <button onclick="pagar('${cliente.id}')">✅ Registrar Pagamento Diário</button>
        <button onclick="aplicarMulta('${cliente.id}')" style="background: #e67e22; color: #fff;">➕ Aplicar Multa (+ R$ 1,50 na parcela)</button>
        <button onclick="whatsapp('${cliente.telefone}','${cliente.nome}','${cliente.parcela}','${atraso}')">📲 Cobrar WhatsApp</button>
        <button onclick="comprovante('${cliente.id}')">📄 Comprovante</button>
        
        <div style="text-align: left; margin-top: 14px;">
            ${docImg}
            ${resImg}
            ${printImg}
        </div>

        <button onclick="excluirCliente('${cliente.id}')" style="margin-top:15px; background:#c0392b;">🗑️ Excluir Cliente</button>
        <button onclick="abrirTela('clientes')" style="margin-top:10px;">⬅ Voltar para Clientes</button>
    </div>
    `;

    abrirTela('detalhesCliente');
}

// APLICAR MULTA
async function aplicarMulta(id) {
    let cliente = clientes.find(c => c.id === id);
    if (!cliente) return;

    if (!confirm(`Deseja adicionar R$ 1,50 no valor diário de ${cliente.nome}? (Valor atual: ${formatarMoeda(cliente.parcela)})`)) return;

    try {
        let novaParcela = cliente.parcela + 1.50;
        await updateDoc(doc(db, "clientes", id), { parcela: novaParcela });
        cliente.parcela = novaParcela;
        alert(`Multa aplicada! Novo valor diário: ${formatarMoeda(novaParcela)}`);
        abrirCliente(id);
    } catch (error) {
        console.error("Erro multa:", error);
        alert("Erro ao aplicar multa.");
    }
}

// REGISTRAR PAGAMENTO
async function pagar(id) {
    try {
        let cliente = clientes.find(c => c.id === id);
        if (!cliente) return;

        if (cliente.pagas >= cliente.totalParcelas) {
            alert("Este contrato já foi quitado!");
            return;
        }

        let novasPagas = cliente.pagas + 1;
        await updateDoc(doc(db, "clientes", id), { pagas: novasPagas });

        cliente.pagas = novasPagas;
        atualizarDashboard();
        mostrarClientes();
        abrirCliente(id);
    } catch (error) {
        console.error("Erro pagamento:", error);
        alert("Erro ao processar pagamento.");
    }
}

// COBRANÇA WHATSAPP
function whatsapp(numero, nome, valorDiaria, atraso) {
    let numLimpo = (numero || '').replace(/\D/g, '');
    let textoAtraso = atraso > 0 ? `\n\n⚠️ *Atenção:* Você possui *${atraso} diária(s) em atraso*.` : '';
    let mensagem = `Olá ${nome}, passando para lembrar da sua diária de ${formatarMoeda(valorDiaria)} da DM Financeira.${textoAtraso}\n\n⏰ *Lembrete:* Os pagamentos devem ser realizados até às 18h.`;
    let url = `https://wa.me/55${numLimpo}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, "_blank");
}

// COMPROVANTE WHATSAPP
function comprovante(id) {
    let cliente = clientes.find(c => c.id === id);
    if (!cliente) return;

    let numLimpo = (cliente.telefone || '').replace(/\D/g, '');
    let restantes = cliente.totalParcelas - cliente.pagas;
    const { atraso } = calcularAtraso(cliente);
    let textoAtraso = atraso > 0 ? `\n⚠️ *Diárias em Atraso:* ${atraso}` : `\n✅ *Situação:* Em dia`;

    let mensagem = `📄 *COMPROVANTE DE PAGAMENTO DIÁRIO*

🏦 *DM Financeira*
_Crédito rápido, solução na hora._

👤 *Cliente:* ${cliente.nome}
💰 *Empréstimo:* ${formatarMoeda(cliente.valor)}
💵 *Valor por dia:* ${formatarMoeda(cliente.parcela)}
🗓️ *Dias pagos:* ${cliente.pagas}/${cliente.totalParcelas} dias
⌛ *Dias restantes:* ${restantes} dias${textoAtraso}

Obrigado por manter seus pagamentos em dia!

⚠️ *Horário de pagamento:* Todos os pagamentos devem ser realizados até às 18h.`;

    let url = `https://wa.me/55${numLimpo}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, "_blank");
}

// EXCLUIR CLIENTE
async function excluirCliente(id) {
    if (!confirm("Deseja realmente excluir este cliente?")) return;

    try {
        await deleteDoc(doc(db, "clientes", id));
        alert("Cliente excluído com sucesso!");
        await mostrarClientes();
        abrirTela('clientes');
    } catch (error) {
        console.error(error);
        alert("Erro ao excluir cliente.");
    }
}

// LIMPAR FORMULÁRIO
function limpar() {
    const ids = ["nome", "cpf", "telefone", "chavePix", "endereco", "linkLocalizacao", "placaVeiculo", "data", "ref1", "ref2", "ref3", "fotoCliente", "docFrenteVerso", "fotoResidencia", "printGanhos"];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });

    const valorEl = document.getElementById("valor");
    if (valorEl) valorEl.value = "300";
}

// ATUALIZAR DASHBOARD
function atualizarDashboard() {
    let totalClientes = clientes.length;
    let emprestado = 0;
    let recebido = 0;
    let aberto = 0;

    clientes.forEach(cliente => {
        let v = Number(cliente.valor) || 0;
        let p = Number(cliente.parcela) || 0;
        let pagas = Number(cliente.pagas) || 0;
        let totalP = Number(cliente.totalParcelas) || 24;

        emprestado += v;
        recebido += p * pagas;
        aberto += (p * totalP) - (p * pagas);
    });

    const elTotal = document.getElementById("totalClientes");
    const elEmp = document.getElementById("totalEmprestado");
    const elRec = document.getElementById("totalRecebido");
    const elAbe = document.getElementById("totalAberto");

    if (elTotal) elTotal.innerText = totalClientes;
    if (elEmp) elEmp.innerText = formatarMoeda(emprestado);
    if (elRec) elRec.innerText = formatarMoeda(recebido);
    if (elAbe) elAbe.innerText = formatarMoeda(aberto);
}

// EXPOSIÇÃO GLOBAL PARA O HTML
window.salvarCliente = salvarCliente;
window.pagar = pagar;
window.aplicarMulta = aplicarMulta;
window.whatsapp = whatsapp;
window.comprovante = comprovante;
window.excluirCliente = excluirCliente;
window.mostrarClientes = mostrarClientes;
window.abrirCliente = abrirCliente;
window.abrirSolicitacao = abrirSolicitacao;
window.abrirTela = abrirTela;
window.aprovarSolicitacao = aprovarSolicitacao;
window.recusarSolicitacao = recusarSolicitacao;

// CARREGAR DADOS INICIALMENTE
mostrarClientes();
