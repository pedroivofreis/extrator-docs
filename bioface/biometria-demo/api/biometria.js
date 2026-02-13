import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

export default async function handler(req, res) {
  // 1. Configuração de CORS (Permitir que o front fale com o back)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Responde rápido se for apenas uma verificação de pré-voo do navegador
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { mode, image1, image2 } = req.body;

    // Inicializa o modelo rápido (Flash)
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // MODO: COMPARAÇÃO (Foto Documento vs Selfie)
    if (mode === 'compare') {
      if (!image1 || !image2) {
        return res.status(400).json({ error: "Faltam imagens para comparar" });
      }

      const prompt = `
        Atue como um perito forense em biometria facial.
        Compare as duas imagens fornecidas:
        1. A primeira imagem é um documento de identificação (Referência).
        2. A segunda imagem é uma selfie ao vivo (Prova de vida).
        
        Analise a estrutura óssea, distância entre os olhos, formato do nariz e boca.
        Ignore diferenças de iluminação, barba, maquiagem ou idade.
        
        Responda ESTRITAMENTE com este JSON (sem markdown):
        {
          "match": boolean (true se for a mesma pessoa, false se não),
          "score": number (0 a 100 indicando grau de semelhança),
          "confidence": "Alta" | "Média" | "Baixa",
          "details": "Uma frase curta explicando a conclusão técnica."
        }
      `;

      // Limpeza das Strings Base64 (Remove "data:image/jpeg;base64,")
      const clean1 = image1.includes(",") ? image1.split(',')[1] : image1;
      const clean2 = image2.includes(",") ? image2.split(',')[1] : image2;

      // Envia para a IA
      const result = await model.generateContent([
        prompt,
        { inlineData: { data: clean1, mimeType: "image/jpeg" } },
        { inlineData: { data: clean2, mimeType: "image/jpeg" } }
      ]);

      // Tratamento da resposta para garantir JSON puro
      const text = result.response.text().replace(/```json|```/g, "").trim();
      const jsonResponse = JSON.parse(text);

      return res.status(200).json(jsonResponse);
    }

    return res.status(400).json({ error: "Modo inválido ou não especificado" });

  } catch (error) {
    console.error("Erro na API:", error);
    return res.status(500).json({ error: "Erro interno ao processar biometria" });
  }
}