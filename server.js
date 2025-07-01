// server.js atualizado para calcular frequência mensal consolidada
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

const filePath = path.join(__dirname, 'data', 'frequencia.json');

if (!fs.existsSync(filePath)) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, '[]');
}

function lerDados() {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function salvarDados(dados) {
  fs.writeFileSync(filePath, JSON.stringify(dados, null, 2));
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/frequencia', (req, res) => {
  const dados = lerDados();
  res.json(dados);
});

app.post('/api/frequencia', async (req, res) => {
  try {
    const { aluno, totalAulas, faltas } = req.body;
    const dados = lerDados();

    const hoje = new Date();
    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();

    // Acumula dados do mês atual
    let totalMes = totalAulas;
    let faltasMes = faltas;

    dados.forEach(item => {
      const dataItem = new Date(item.data);
      if (item.aluno === aluno && dataItem.getMonth() === mesAtual && dataItem.getFullYear() === anoAtual) {
        totalMes += item.totalAulas;
        faltasMes += item.faltas;
      }
    });

    const frequenciaMensal = ((totalMes - faltasMes) / totalMes) * 100;

    const nova = {
      id: uuidv4(),
      aluno,
      totalAulas,
      faltas,
      frequencia: ((totalAulas - faltas) / totalAulas * 100).toFixed(1),
      data: new Date()
    };

    dados.push(nova);
    salvarDados(dados);

    // Se a frequência mensal estiver abaixo de 80%, dispara buscativa
    // Dentro do app.post('/api/frequencia'... já existente

// Se a frequência mensal estiver abaixo de 80%, dispara buscativa com valor real
if (frequenciaMensal < 80) {
  try {
    const resposta = await fetch('https://buscativa.onrender.com/api/buscativa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        aluno: aluno,
        serie: "Não informado",
        dataFalta: hoje.toISOString().split("T")[0],
        tipoContato: "A definir",
        responsavel: "Sistema Frequência",
        resultado: `Frequência mensal: ${frequenciaMensal.toFixed(1)}%`,
        observacoes: "Gerado automaticamente a partir de todos os registros do mês"
      })
    });

    const resultado = await resposta.json();
    console.log("✅ Buscativa enviada:", resultado);

    if (!resposta.ok) {
      console.error("❌ Falha ao enviar buscativa:", resultado);
    }
  } catch (erro) {
    console.error("❌ Erro de comunicação com buscativa:", erro.message || erro);
  }
}


    res.status(201).json(nova);
  } catch (erro) {
    console.error('Erro:', erro);
    res.status(500).json({ error: 'Erro ao registrar frequência.' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
