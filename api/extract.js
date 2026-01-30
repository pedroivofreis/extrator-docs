import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// --- PROMPTS UNIFICADOS ---
const PROMPTS = {
  // --- Documentos Pessoais ---
  rg: `Analise esta imagem de RG. Extraia os dados e retorne APENAS um JSON puro (sem markdown) com as chaves em snake_case.
  Campos obrigatórios:
  - nome_completo
  - numero_doc (o número do RG)
  - orgao_emissor (ex: SSP)
  - uf_emissor (UF do órgão)
  - data_emissao (DD/MM/AAAA)
  - data_validade (DD/MM/AAAA, se houver, senão null)
  - cpf (apenas números)
  - data_nascimento (DD/MM/AAAA)
  - nome_mae
  - nome_pai (se houver, senão null)
  - naturalidade (cidade/UF)`,

  cnh: `Analise esta CNH. Extraia os dados e retorne APENAS um JSON puro (sem markdown) com as chaves em snake_case.
  Campos obrigatórios:
  - nome_completo
  - numero_doc (o número do registro da CNH, em vermelho)
  - orgao_emissor (DETRAN)
  - uf_emissor (UF do Detran)
  - data_emissao (DD/MM/AAAA)
  - data_validade (DD/MM/AAAA)
  - cpf (apenas números)
  - rg_numero
  - categoria_habilitacao
  - data_primeira_habilitacao
  - data_nascimento
  - nome_mae`,

  classe: `Analise este documento de classe (OAB, CRM, CREA, etc). Retorne APENAS um JSON puro snake_case.
  Campos obrigatórios:
  - nome_completo
  - numero_doc (número de inscrição)
  - orgao_emissor (ex: OAB, CRM)
  - uf_emissor (Seccional ou Região)
  - data_emissao (DD/MM/AAAA)
  - data_validade (DD/MM/AAAA, se houver)
  - cpf
  - tipo_documento (ex: Carteira Profissional)`,

  endereco: `Analise comprovante de residência. Retorne APENAS um JSON puro snake_case.
  Campos obrigatórios:
  - nome_completo (destinatário)
  - numero_doc (se houver matricula ou código de instalação, senão null)
  - orgao_emissor (nome da concessionária de energia/agua/banco)
  - uf_emissor (UF do endereço)
  - data_emissao (DD/MM/AAAA)
  - data_validade (geralmente data de vencimento)
  - logradouro
  - numero
  - complemento
  - bairro
  - cidade
  - uf
  - cep`,

  // --- Documentos de Formação ---
  diploma: `Analise este DIPLOMA DE GRADUAÇÃO. Extraia os dados e retorne APENAS um JSON puro snake_case. Se um campo não existir, retorne null.
  Campos Padronizados:
  - nome_completo
  - numero_doc (número do registro do diploma no verso ou frente)
  - orgao_emissor (Nome da Universidade/Faculdade)
  - uf_emissor (Estado da instituição)
  - data_emissao (Data de expedição do diploma)
  - data_validade (Geralmente null para diplomas, mas procure se houver validade explícita)
  
  Campos Específicos:
  - nome_curso (ex: Engenharia Civil)
  - grau_academico (ex: Bacharel, Licenciado)
  - data_colacao_grau (Data da conclusão/colação)
  - livro_registro (se houver)
  - folha_registro (se houver)`,

  revalidacao: `Analise este documento de REVALIDAÇÃO DE DIPLOMA ESTRANGEIRO. Retorne APENAS um JSON puro snake_case.
  Campos Padronizados:
  - nome_completo
  - numero_doc (Número do processo ou registro de revalidação)
  - orgao_emissor (Nome da Universidade Brasileira que revalidou)
  - uf_emissor (UF da universidade brasileira)
  - data_emissao (Data da revalidação)
  - data_validade (null)

  Campos Específicos:
  - instituicao_estrangeira (Onde o curso foi feito originalmente)
  - nome_curso
  - pais_origem`,

  especializacao: `Analise este CERTIFICADO DE ESPECIALIZAÇÃO/PÓS/MBA. Retorne APENAS um JSON puro snake_case.
  Campos Padronizados:
  - nome_completo
  - numero_doc (Número do certificado ou registro se houver)
  - orgao_emissor (Instituição de ensino)
  - uf_emissor (UF da instituição)
  - data_emissao (Data do certificado)
  - data_validade (Se houver validade do título, senão null)

  Campos Específicos:
  - nome_curso (Nome da especialização)
  - carga_horaria (Total de horas)
  - periodo_inicio (DD/MM/AAAA)
  - periodo_fim (DD/MM/AAAA)`,

  complementar: `Analise este CERTIFICADO DE CURSO COMPLEMENTAR/LIVRE. Retorne APENAS um JSON puro snake_case.
  Campos Padronizados:
  - nome_completo
  - numero_doc (Código de validação ou certificado)
  - orgao_emissor (Instituição ou Plataforma, ex: Udemy, Alura)
  - uf_emissor (null se for online)
  - data_emissao (Data de conclusão)
  - data_validade (Se o curso expira, ex: NR10, senão null)

  Campos Específicos:
  - nome_curso
  - carga_horaria
  - conteudo_programatico (Resumo breve se houver)`,

  curriculo: `Analise este CURRÍCULO (CV). Extraia os dados estruturados. Retorne APENAS um JSON puro snake_case.
  Campos Padronizados (Preencha o que encontrar, use null se não houver):
  - nome_completo
  - numero_doc (CPF se estiver no CV, senão null)
  - orgao_emissor (null)
  - uf_emissor (Estado de residência do candidato)
  - data_emissao (Data de atualização do CV se houver, ou data atual)
  - data_validade (null)

  Campos Específicos:
  - email
  - telefone
  - linkedin (url)
  - resumo_profissional (texto curto)
  - lista_experiencias (Array de objetos com: empresa, cargo, data_inicio, data_fim)
  - lista_formacao (Array de objetos com: instituicao, curso, ano_conclusao)`,

  // --- SAÚDE ---
  cartao_sus: `Analise este CARTÃO NACIONAL DE SAÚDE (SUS). Retorne JSON snake_case.
  Campos Padronizados:
  - nome_completo
  - numero_doc (Número do CNS - Cartão Nacional de Saúde)
  - orgao_emissor (Ministério da Saúde)
  - uf_emissor (null)
  - data_emissao (null)
  - data_validade (null)
  Campos Específicos:
  - sexo
  - data_nascimento`,

  carteira_vacinacao: `Analise esta CARTEIRA DE VACINAÇÃO. Retorne JSON snake_case.
  Campos Padronizados:
  - nome_completo
  - numero_doc (CPF ou ID da carteirinha se houver)
  - orgao_emissor (SUS / Unidade de Saúde)
  - uf_emissor
  - data_emissao (Data da última vacina visível)
  - data_validade (null)
  Campos Específicos:
  - lista_vacinas (Array de strings com nomes das vacinas identificadas, ex: ["Hepatite B", "Covid-19", "Tétano"])
  - lote_ultima_vacina (se legível)`,

  carteirinha_convenio: `Analise esta CARTEIRINHA DE CONVÊNIO/PLANO DE SAÚDE. Retorne JSON snake_case.
  Campos Padronizados:
  - nome_completo
  - numero_doc (Número da carteirinha / Matrícula)
  - orgao_emissor (Nome da Operadora, ex: Unimed, Bradesco Saúde)
  - uf_emissor (null)
  - data_emissao (null)
  - data_validade (Data de validade do cartão)
  Campos Específicos:
  - nome_plano (ex: Especial, Enfermaria)
  - tipo_acomodacao (ex: Apartamento, Enfermaria)
  - cns (se houver no cartão)`,

  // --- REGULARIDADE (CRM/COREN) ---
  certidao_etica: `Analise esta CERTIDÃO ÉTICO-PROFISSIONAL (CRM/Conselho). Retorne JSON snake_case.
  Campos Padronizados:
  - nome_completo
  - numero_doc (Número do protocolo ou código de autenticação)
  - orgao_emissor (ex: CREMESP, COREN-RJ)
  - uf_emissor
  - data_emissao
  - data_validade
  Campos Específicos:
  - numero_inscricao (CRM do médico)
  - situacao_etica (Resuma o status, ex: "Nada Consta", "Processo em andamento")
  - texto_conclusao (O texto principal que atesta a conduta)`,

  certidao_negativa_debitos: `Analise esta CERTIDÃO NEGATIVA DE DÉBITOS (Conselho de Classe). Retorne JSON snake_case.
  Campos Padronizados:
  - nome_completo
  - numero_doc (Código de autenticação)
  - orgao_emissor
  - uf_emissor
  - data_emissao
  - data_validade
  Campos Específicos:
  - situacao_financeira (ex: "Quite", "Regular", "Sem débitos")
  - ano_referencia (se especificado)`,

  // --- PESSOA JURÍDICA (PJ) ---
  cartao_cnpj: `Analise este COMPROVANTE DE INSCRIÇÃO E SITUAÇÃO CADASTRAL (Cartão CNPJ). Retorne JSON snake_case.
  Campos Padronizados:
  - nome_completo (Nome Empresarial / Razão Social)
  - numero_doc (CNPJ - apenas números)
  - orgao_emissor (Receita Federal)
  - uf_emissor (UF do endereço da empresa)
  - data_emissao (Data de abertura da empresa ou data de emissão do comprovante)
  - data_validade (null)
  Campos Específicos:
  - nome_fantasia
  - situacao_cadastral (ex: ATIVA)
  - cnae_principal_codigo
  - cnae_principal_texto (Descrição da atividade)
  - natureza_juridica`,

  contrato_social: `Analise este CONTRATO SOCIAL ou ALTERAÇÃO CONTRATUAL. Retorne JSON snake_case.
  Campos Padronizados:
  - nome_completo (Razão Social da Empresa)
  - numero_doc (CNPJ ou NIRE)
  - orgao_emissor (Junta Comercial)
  - uf_emissor
  - data_emissao (Data do registro)
  - data_validade (null)
  Campos Específicos:
  - capital_social (Valor monetário)
  - lista_socios (Array de objetos com: nome, cpf, participacao_porcentagem)
  - objeto_social (Resumo da atividade da empresa)`,

  // --- ANTECEDENTES ---
  antecedentes_criminais: `Analise este ATESTADO DE ANTECEDENTES CRIMINAIS. Retorne JSON snake_case.
  Campos Padronizados:
  - nome_completo
  - numero_doc (Número do atestado/validação)
  - orgao_emissor (ex: Polícia Federal, SSP)
  - uf_emissor
  - data_emissao
  - data_validade (se houver, geralmente 90 dias)
  Campos Específicos:
  - rg_vinculado
  - situacao (Deve buscar explicitamente termos como "NADA CONSTA", "NEGATIVO")
  - ambito (Federal ou Estadual)`,

  auto: `Analise esta imagem e IDENTIFIQUE qual tipo de documento ela é (RG, CNH, Diploma, Conta de Luz, Cartão SUS, CRM, CNPJ, etc).
  
  Retorne um JSON com a seguinte estrutura:
  {
    "tipo_detectado": "Nome do Documento Identificado (ex: RG, CNH, Diploma)",
    "confianca": "Alta/Média/Baixa",
    "dados": {
       // Extraia aqui todos os campos relevantes que encontrar no documento.
       // Use chaves em snake_case.
    }
  }`
};

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  try {
    const { imageBase64, type } = req.body;

    if (!imageBase64) return res.status(400).json({ error: "Imagem ausente" });
    
    // Limpeza do base64
    const cleanBase64 = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;
    
    // Inicializa Gemini - Ajuste para o modelo 1.5 flash para garantir compatibilidade
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); 
    
    // Seleciona o prompt ou usa RG como fallback
    const selectedPrompt = PROMPTS[type] || PROMPTS.rg;

    // Chama a IA
    const result = await model.generateContent([
      selectedPrompt,
      { inlineData: { data: cleanBase64, mimeType: "image/jpeg" } },
    ]);

    const text = result.response.text();
    // Limpeza rigorosa do JSON para evitar erros de Markdown
    const jsonString = text.replace(/```json/g, "").replace(/```/g, "").trim();

    let data;
    try {
      data = JSON.parse(jsonString);
    } catch (e) {
      console.error("Erro Parse JSON:", jsonString);
      // Tentativa de recuperação
      const match = jsonString.match(/\{[\s\S]*\}/);
      if (match) {
        data = JSON.parse(match[0]);
      } else {
         throw new Error("Falha ao interpretar resposta da IA");
      }
    }

    // Retorna os dados + a imagem original
    data.imagem_original = imageBase64.startsWith("data:") 
      ? imageBase64 
      : `data:image/jpeg;base64,${imageBase64}`;

    return res.status(200).json(data);

  } catch (error) {
    console.error("Erro API:", error);
    return res.status(500).json({ error: error.message || "Falha interna" });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};