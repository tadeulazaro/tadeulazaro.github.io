const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const paginate = require('mongoose-paginate-v2');
const app = express();
const port = 3000;

// Conexão com o banco de dados MongoDB
mongoose.connect('mongodb://localhost:27017/ControleLT', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'Erro na conexão com o MongoDB:'));
db.once('open', () => {
  console.log('Conectado ao MongoDB!');
});

// Definir o esquema para a coleção "despesas"
const despesaSchema = new mongoose.Schema({
  nome: String,
  tipoPagamento: String,
  tipoGasto: String,
  valorGasto: Number,
  dataDespesa: String ,// Campo para a data da despesa
 
});
const Despesa = mongoose.model('Despesa', despesaSchema);

const tiposGastoSchema = new mongoose.Schema({
  gastos: String
});

const TipoGasto = mongoose.model('tipoGasto', tiposGastoSchema, 'tipoGasto');


despesaSchema.plugin(paginate);


// Função para calcular o total das despesas do mês atual
function calcularTotalDespesas(despesas) {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth(); // Obtém o índice do mês atual (0 a 11)
  const currentYear = currentDate.getFullYear(); // Obtém o ano atual

  const despesasMesAtual = despesas.filter(despesa => {
    const despesaDate = new Date(despesa.dataDespesa);
    const despesaMonth = despesaDate.getMonth();
    const despesaYear = despesaDate.getFullYear();

    return despesaMonth === currentMonth && despesaYear === currentYear;
  });





  let total = 0;
  despesasMesAtual.forEach(despesa => {
    total += despesa.valorGasto;
  });

  return total.toFixed(2);
}

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

// Função para calcular o total das despesas por mês
function calcularTotalDespesasPorMes(despesas) {
  const totalPorMes = {}; // Um objeto para armazenar o total por mês

  // Obtém a data atual
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth(); // Obtém o índice do mês atual (0 a 11)
  const currentYear = currentDate.getFullYear(); // Obtém o ano atual

  // Obtém a data da primeira despesa registrada
  const primeiraDespesa = new Date(despesas[despesas.length - 1].dataDespesa);
  const primeiraDespesaMonth = primeiraDespesa.getMonth();
  const primeiraDespesaYear = primeiraDespesa.getFullYear();

  // Preenche o objeto totalPorMes com todos os meses entre a primeira despesa e o mês atual
  for (let year = primeiraDespesaYear; year <= currentYear; year++) {
    const startMonth = year === primeiraDespesaYear ? primeiraDespesaMonth : 0;
    const endMonth = year === currentYear ? currentMonth : 11;

    for (let month = startMonth; month <= endMonth; month++) {
      const chaveMes = `${year}-${month + 1}`; // Usamos despesaMonth + 1 para corresponder aos meses 1-12

      if (!totalPorMes[chaveMes]) {
        totalPorMes[chaveMes] = 0; // Inicializa o total para o mês se ainda não existir
      }
    }
  }

  // Agora, atualize o objeto totalPorMes com os valores das despesas
  despesas.forEach(despesa => {
    const despesaDate = new Date(despesa.dataDespesa);
    const despesaMonth = despesaDate.getMonth();
    const despesaYear = despesaDate.getFullYear();
    const chaveMes = `${despesaYear}-${despesaMonth + 1}`; // Usamos despesaMonth + 1 para corresponder aos meses 1-12

    totalPorMes[chaveMes] += despesa.valorGasto;
  });

  return totalPorMes;
}






app.get('/despesas', async (req, res) => {
  try {
    const despesas = await Despesa.find().sort({ dataDespesa: -1 })
    const tiposDeGastos = await TipoGasto.find().sort({ gastos: 1 });
    const totalDespesasMesAtual = calcularTotalDespesas(despesas);
    const totalDespesasPorMes = calcularTotalDespesasPorMes(despesas);

    res.render('despesas', { despesas, tiposDeGastos, totalDespesasMesAtual, totalDespesasPorMes });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao obter despesas' });
  }
});


app.post('/despesas', async (req, res) => {
  const { nome, tipoPagamento, tipoGasto, valorGasto, dataDespesa } = req.body;

  const novaDespesa = new Despesa({
    nome,
    tipoPagamento,
    tipoGasto,
    valorGasto,
    dataDespesa // Inclui a data da despesa
  });

  try {
    await novaDespesa.save();
    res.redirect('/despesas');
  } catch (error) {
    console.error('Erro ao adicionar despesa:', error);
    res.status(500).json({ error: 'Erro ao adicionar despesa' });
  }
});


app.get('/editarDespesa', async (req, res) => {
  const id = req.query.id; // Obtenha o ID da despesa da consulta

  try {
    // Use o modelo do Mongoose (Despesa) para buscar a despesa com base no ID
    const despesa = await Despesa.findById(id);

    if (!despesa) {
      // Se a despesa com o ID fornecido não foi encontrada, você pode lidar com isso
      // por exemplo, redirecionando o usuário de volta à lista de despesas com uma mensagem de erro
      return res.redirect('/despesas?error=Despesa não encontrada');
    }

    // Renderize a página de edição, passando a despesa encontrada como contexto
    res.render('editarDespesa', { despesa,id });
  } catch (error) {
    // Lide com erros de consulta de banco de dados aqui, por exemplo, enviando uma resposta de erro
    res.status(500).json({ error: 'Erro ao buscar despesa para edição' });
  }
});


// Rota para processar a edição da despesa
app.post('/editarDespesa', async (req, res) => {
  const { id, nome, tipoPagamento, tipoGasto, valorGasto, dataDespesa } = req.body;

  try {
    // Use o modelo do Mongoose (Despesa) para buscar a despesa com base no ID
    const despesa = await Despesa.findById(id);

    if (!despesa) {
      // Se a despesa com o ID fornecido não foi encontrada, você pode lidar com isso
      // por exemplo, redirecionando o usuário de volta à lista de despesas com uma mensagem de erro
      return res.redirect('/despesas?error=Despesa não encontrada');
    }

    // Atualize os campos da despesa com os novos valores
    despesa.nome = nome;
    despesa.tipoPagamento = tipoPagamento;
    despesa.tipoGasto = tipoGasto;
    despesa.valorGasto = valorGasto;
    despesa.dataDespesa = dataDespesa;

    // Salve as alterações no banco de dados
    await despesa.save();

    // Redirecione o usuário de volta à lista de despesas com uma mensagem de sucesso
    return res.redirect('/despesas?success=Despesa atualizada com sucesso');
  } catch (error) {
    // Lide com erros de consulta de banco de dados aqui, por exemplo, enviando uma resposta de erro
    res.status(500).json({ error: 'Erro ao atualizar despesa' });
  }
});

app.delete('/apagarDespesa/_id:despesaId', async (req, res) => {
  const despesaId = req.params.despesaId;
  
  try {
    // Use o ID da despesa para encontrar e excluir a despesa no banco de dados
    const despesa = await Despesa.findByIdAndRemove( despesaId);

    if (!despesa) {
      // Se a despesa não for encontrada, retorne um erro 404
      return res.status(404).json({ error: 'Despesa não encontrada' });
    }  

    // Envie uma resposta adequada (por exemplo, um status 204 No Content para indicar sucesso)
    res.status(204).send();
  } catch (error) {
    // Se ocorrer um erro durante a exclusão, retorne um erro 500
    console.error(error);
    res.status(500).json({ error: 'Erro ao excluir a despesa' });
  }
});


app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});