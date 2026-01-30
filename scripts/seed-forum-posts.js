import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin SDK with service account
const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, '../src/config/serviceAccountKey.json'), 'utf8')
);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'pare-app-483321'
  });
}

const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

// Posts fixos do fórum com conteúdo profissional de psicologia
const forumPosts = [
  {
    title: "Bem-vindo à Comunidade Pare! - Seu Guia para a Recuperação",
    content: `Seja muito bem-vindo à comunidade Pare! Este é um espaço seguro e acolhedor onde você encontrará apoio, compreensão e ferramentas práticas para sua jornada de recuperação.

**Por que você está aqui?**

Reconhecer que precisa de ajuda é o primeiro e mais corajoso passo. A dependência comportamental, seja ela relacionada à pornografia, jogos, redes sociais ou outras compulsões, não é uma falha de caráter — é uma condição que pode ser tratada e superada com as estratégias certas.

**O que a ciência nos diz:**

Estudos em neurociência demonstram que comportamentos compulsivos alteram os circuitos de recompensa do cérebro, criando padrões que podem ser desafiadores de quebrar. No entanto, o cérebro possui uma característica extraordinária chamada neuroplasticidade — a capacidade de se reorganizar e formar novas conexões ao longo da vida. Isso significa que a mudança é absolutamente possível.

**Pilares da Recuperação:**

1. **Autoconhecimento**: Identifique seus gatilhos emocionais, situacionais e ambientais
2. **Rede de Apoio**: Você não precisa enfrentar isso sozinho — esta comunidade está aqui por você
3. **Estratégias Práticas**: Técnicas baseadas em evidências para gerenciar impulsos
4. **Paciência e Compaixão**: A recuperação não é linear; recaídas fazem parte do processo de aprendizado
5. **Consistência**: Pequenas ações diárias constroem grandes transformações

**Recursos Disponíveis:**

- Fórum de discussão com pessoas que entendem sua jornada
- Chat com psicólogos especializados (planos Premium e Elite)
- Sessões de videochamada com profissionais (plano Elite)
- Sistema de conquistas para celebrar seu progresso
- Contador de dias para visualizar sua evolução

Lembre-se: cada dia limpo é uma vitória. Cada momento de resistência fortalece sua capacidade de escolha. Você é mais forte do que imagina.

Com carinho e respeito pela sua coragem,
**Equipe Pare!**`,
    category: "general",
    order: 1
  },
  {
    title: "Dependência de Pornografia: Um Guia Completo para a Recuperação",
    content: `A dependência de pornografia é uma das formas mais prevalentes de compulsão comportamental na era digital. Se você está lendo isso, saiba que não está sozinho — milhões de pessoas ao redor do mundo enfrentam o mesmo desafio.

**Compreendendo o Problema:**

O consumo excessivo de pornografia pode criar um ciclo de dependência semelhante ao de substâncias químicas. O cérebro libera dopamina durante a visualização, criando uma sensação temporária de prazer que, com o tempo, requer estímulos cada vez mais intensos para produzir o mesmo efeito. Este fenômeno é conhecido como tolerância.

**Sinais de Alerta:**

- Dificuldade em controlar o tempo gasto com pornografia
- Negligência de responsabilidades, relacionamentos ou hobbies
- Sentimentos de culpa, vergonha ou ansiedade após o consumo
- Necessidade de conteúdo cada vez mais extremo
- Impacto negativo na vida sexual e nos relacionamentos íntimos
- Uso como forma de escapar de emoções difíceis

**Estratégias Baseadas em Evidências:**

**1. Identifique Seus Gatilhos**
Mantenha um diário por uma semana registrando: horários em que sente mais vontade, emoções que precedem o comportamento (solidão, tédio, estresse, ansiedade), situações ou ambientes de risco, e pensamentos automáticos que surgem.

**2. Reestruture Seu Ambiente**
Instale bloqueadores de conteúdo em todos os dispositivos, mantenha dispositivos em áreas comuns da casa, estabeleça horários específicos para uso de tecnologia, e remova aplicativos ou atalhos que facilitem o acesso.

**3. Desenvolva Alternativas Saudáveis**
Quando o impulso surgir, tenha um plano: exercício físico (mesmo uma caminhada de 10 minutos), ligar para um amigo ou familiar, técnicas de respiração (4-7-8: inspire por 4s, segure por 7s, expire por 8s), tomar um banho frio, ou sair do ambiente atual.

**4. Pratique a Técnica "Surfar o Impulso"**
Os impulsos são como ondas — eles crescem, atingem um pico e depois diminuem naturalmente. Em vez de lutar contra o impulso ou ceder a ele: observe o impulso sem julgamento, note onde você o sente no corpo, respire profundamente, e lembre-se: o impulso vai passar em 15-20 minutos.

**O Que Esperar no Processo:**

- **Primeiras 2 semanas**: Período mais desafiador, com impulsos intensos
- **Semanas 3-4**: Início da estabilização, mas ainda vulnerável
- **Meses 2-3**: Melhora significativa na clareza mental e energia
- **6 meses+**: Novos padrões neurais mais estabelecidos

**Sobre Recaídas:**

Uma recaída não apaga seu progresso. O cérebro não "reseta" — cada dia de abstinência contribuiu para a formação de novos caminhos neurais. Se acontecer: não se castigue, analise o que aconteceu e aprenda com a experiência, reforce suas estratégias de prevenção, e retome imediatamente seu compromisso.

Você merece uma vida livre dessa compulsão. A jornada pode ser difícil, mas a liberdade que você encontrará do outro lado vale cada esforço.`,
    category: "tip",
    order: 2
  },
  {
    title: "Ansiedade na Recuperação: Técnicas Práticas para Encontrar Calma",
    content: `A ansiedade é uma companheira frequente no processo de recuperação. Quando removemos um comportamento que usávamos para regular emoções, é natural que sentimentos desconfortáveis venham à tona. Isso não é um sinal de fracasso — é parte do processo de cura.

**Por Que a Ansiedade Aumenta na Recuperação:**

Comportamentos compulsivos frequentemente funcionam como uma forma de "automedicação" emocional. Quando paramos, o sistema nervoso precisa se reajustar, o que pode temporariamente intensificar sensações de ansiedade, irritabilidade e inquietação.

**Técnicas de Regulação Emocional:**

**1. Respiração Diafragmática (5 minutos)**
Sente-se confortavelmente ou deite-se. Coloque uma mão no peito e outra no abdômen. Inspire lentamente pelo nariz por 4 segundos, expandindo o abdômen. Segure por 2 segundos. Expire pela boca por 6 segundos. Repita por 5-10 ciclos. Esta técnica ativa o sistema nervoso parassimpático, reduzindo a resposta de "luta ou fuga".

**2. Técnica de Aterramento 5-4-3-2-1**
Quando a ansiedade estiver alta, use seus sentidos para se ancorar no presente: 5 coisas que você pode VER, 4 coisas que você pode TOCAR, 3 coisas que você pode OUVIR, 2 coisas que você pode CHEIRAR, 1 coisa que você pode SABOREAR.

**3. Relaxamento Muscular Progressivo**
Começando pelos pés, tensione cada grupo muscular por 5 segundos. Depois relaxe completamente por 10 segundos. Suba progressivamente: pernas, abdômen, peito, braços, mãos, pescoço, rosto. Note a diferença entre tensão e relaxamento.

**4. Journaling Estruturado**
Quando pensamentos ansiosos surgirem, escreva: O que estou sentindo agora? O que estou pensando? Esse pensamento é um fato ou uma interpretação? Qual seria uma perspectiva mais equilibrada? O que eu diria a um amigo nessa situação?

**5. Movimento Físico**
O exercício é um dos antidepressivos e ansiolíticos naturais mais poderosos: caminhada de 20-30 minutos, yoga ou alongamento, dança, qualquer atividade que eleve sua frequência cardíaca.

**Criando uma Rotina de Autocuidado:**

**Manhã:** 5 minutos de respiração consciente, definir uma intenção positiva para o dia, movimento físico leve.

**Durante o dia:** Pausas regulares para respirar, hidratação adequada, alimentação balanceada.

**Noite:** Desconectar de telas 1 hora antes de dormir, journaling ou reflexão, rotina de sono consistente.

**Quando Buscar Ajuda Profissional:**

Se a ansiedade estiver interferindo significativamente no trabalho ou relacionamentos, causando ataques de pânico frequentes, acompanhada de pensamentos de autolesão, ou persistindo intensamente por mais de 2 semanas, não hesite em conversar com um de nossos psicólogos através do chat ou agendar uma sessão de videochamada.

Lembre-se: a ansiedade é temporária. Você está desenvolvendo novas formas de lidar com emoções, e isso leva tempo. Seja paciente consigo mesmo.`,
    category: "tip",
    order: 3
  },
  {
    title: "Transformação Através de Pequenos Hábitos: A Ciência da Mudança Duradoura",
    content: `"Nós somos o que repetidamente fazemos. A excelência, portanto, não é um ato, mas um hábito." — Aristóteles

A recuperação não acontece através de grandes gestos heroicos, mas através da consistência de pequenas ações diárias. A neurociência moderna confirma o que os filósofos antigos intuíam: nossos hábitos literalmente moldam a estrutura do nosso cérebro.

**A Ciência dos Hábitos:**

Cada vez que repetimos um comportamento, fortalecemos as conexões neurais associadas a ele. É como criar um caminho em uma floresta — quanto mais você passa por ele, mais definido ele se torna. A boa notícia é que podemos criar novos caminhos intencionalmente.

**O Loop do Hábito:**

Todo hábito segue um padrão: Gatilho (o que inicia o comportamento), Rotina (o comportamento em si), Recompensa (o benefício que obtemos). Para mudar um hábito, mantenha o gatilho e a recompensa, mas substitua a rotina.

**Exemplo Prático:**
- Gatilho: Sentir-se entediado à noite
- Rotina antiga: Acessar conteúdo problemático
- Rotina nova: Fazer 10 minutos de exercício ou ligar para um amigo
- Recompensa: Alívio do tédio e sensação de bem-estar

**Hábitos Fundamentais para a Recuperação:**

**1. Hábito Matinal de Intenção (2 minutos)**
Ao acordar, antes de pegar o celular: 3 respirações profundas, declare mentalmente "Hoje escolho minha saúde e liberdade", visualize-se tendo um dia bem-sucedido.

**2. Check-in Emocional (1 minuto, 3x ao dia)**
Pause e pergunte-se: Como estou me sentindo agora? O que meu corpo precisa? Estou em risco de comportamento compulsivo?

**3. Movimento Diário (mínimo 15 minutos)**
Não precisa ser exercício intenso: caminhada, subir escadas, alongamento, dança na sala de casa.

**4. Conexão Social (diária)**
Isolamento alimenta compulsões. Comprometa-se com: uma conversa significativa por dia, participação ativa nesta comunidade, manter contato com pessoas de apoio.

**5. Ritual Noturno de Reflexão (5 minutos)**
Antes de dormir: O que fiz bem hoje? O que aprendi? Pelo que sou grato? O que posso melhorar amanhã?

**A Regra dos 2 Minutos:**

Se um hábito parece difícil demais, reduza-o até que leve apenas 2 minutos: "Meditar 20 minutos" se torna "Sentar em silêncio por 2 minutos". "Fazer exercício" se torna "Colocar a roupa de ginástica". "Escrever no diário" se torna "Escrever uma frase". O objetivo é criar consistência. Uma vez que o hábito esteja estabelecido, você pode expandi-lo gradualmente.

**Celebre Pequenas Vitórias:**

Resistiu a um impulso? Celebre. Completou uma semana? Celebre. Usou uma técnica de coping? Celebre. Pediu ajuda quando precisou? Celebre.

A mudança duradoura é construída tijolo por tijolo. Confie no processo e seja consistente. Você está criando uma nova versão de si mesmo, um pequeno hábito de cada vez.`,
    category: "motivation",
    order: 4
  },
  {
    title: "Recaídas: Como Transformar Quedas em Aprendizado",
    content: `Se você está lendo isso após uma recaída, primeiro: respire. Você não falhou. Você não perdeu todo o seu progresso. Você está aqui, buscando se levantar, e isso é o que importa.

**A Verdade Sobre Recaídas:**

Pesquisas em dependência comportamental mostram que a maioria das pessoas experimenta recaídas durante o processo de recuperação. Isso não é fraqueza — é parte do processo de aprendizado. Cada recaída, quando analisada corretamente, fornece informações valiosas para fortalecer sua recuperação.

**O Que NÃO Fazer Após uma Recaída:**

1. **Não entre em espiral de culpa** — A vergonha excessiva pode criar um ciclo: recaída → culpa → busca de alívio → recaída. Interrompa esse padrão com autocompaixão.

2. **Não pense "já que recaí, tanto faz"** — Este pensamento de "tudo ou nada" é uma armadilha cognitiva. Uma recaída não justifica abandonar seus esforços.

3. **Não se isole** — O impulso de se esconder é compreensível, mas o isolamento alimenta o problema. Busque apoio.

4. **Não ignore o que aconteceu** — Fingir que não aconteceu impede o aprendizado. Analise com curiosidade, não com julgamento.

**O Que FAZER Após uma Recaída:**

**1. Pratique Autocompaixão (Imediatamente)**
Fale consigo mesmo como falaria com um amigo querido: "Isso é difícil, e eu estou fazendo o meu melhor", "Uma recaída não define quem eu sou", "Posso aprender com isso e seguir em frente".

**2. Análise da Cadeia de Eventos (Nas próximas 24 horas)**
Reconstrua o que aconteceu: Quais foram os primeiros sinais de alerta? Que emoções você estava sentindo? Que pensamentos passaram pela sua mente? Que situação ou ambiente contribuiu? Em que momento você ainda poderia ter mudado o curso?

**3. Identifique o Ponto de Intervenção**
Com base na análise, determine: Onde no futuro você pode intervir mais cedo? Que estratégia específica você pode usar nesse ponto?

**4. Atualize Seu Plano de Prevenção**
Adicione o que aprendeu: novo gatilho identificado, nova estratégia de coping, ajuste no ambiente ou rotina.

**5. Retome Imediatamente**
Não espere "o momento certo" ou "segunda-feira". Recomece agora: reinicie seu contador (sem drama), reafirme seu compromisso, execute uma ação positiva imediata.

**Sinais de Alerta Comuns:**

HALT: Hungry (Fome), Angry (Raiva), Lonely (Solidão), Tired (Cansaço). Também: pensamentos de "só dessa vez", racionalização do comportamento, isolamento social, abandono de rotinas saudáveis, aumento de estresse sem estratégias de coping.

**Uma Perspectiva Importante:**

Imagine que você está aprendendo a andar de bicicleta. Você cai várias vezes antes de conseguir se equilibrar. Cada queda ensina algo sobre equilíbrio, velocidade, direção. Você não desiste de andar de bicicleta porque caiu — você se levanta e tenta novamente, agora com mais conhecimento.

A recuperação funciona da mesma forma. Cada tentativa, mesmo as que incluem recaídas, está construindo sua capacidade de viver livre.

Você está mais forte do que ontem. Continue.`,
    category: "tip",
    order: 5
  },
  {
    title: "Intimidade e Conexão: Reconstruindo Relacionamentos na Recuperação",
    content: `A dependência comportamental frequentemente afeta nossos relacionamentos mais importantes. Seja com parceiros românticos, família ou amigos, a recuperação oferece uma oportunidade de reconstruir conexões mais autênticas e satisfatórias.

**Como a Compulsão Afeta Relacionamentos:**

Cria segredos e distância emocional, reduz a disponibilidade para conexão genuína, pode distorcer expectativas sobre intimidade, gera culpa que interfere na presença, e consome tempo e energia que poderiam ser investidos em pessoas.

**Princípios para Relacionamentos Saudáveis:**

**1. Honestidade Gradual**
A transparência é fundamental, mas deve ser praticada com sabedoria: comece sendo honesto consigo mesmo, considere o que, quando e como compartilhar com outros, nem todos precisam saber de tudo, escolha pessoas de confiança para vulnerabilidade mais profunda.

**2. Comunicação Assertiva**
Aprenda a expressar necessidades e limites: use declarações "Eu" em vez de "Você", seja específico sobre o que precisa, ouça ativamente sem planejar sua resposta, valide os sentimentos do outro, mesmo discordando.

Em vez de: "Você nunca me entende"
Tente: "Eu me sinto incompreendido quando minhas preocupações são minimizadas. Preciso que você me ouça sem tentar resolver imediatamente."

**3. Estabelecendo Limites Saudáveis**
Limites não são muros — são cercas com portões: identifique o que você precisa para se sentir seguro, comunique seus limites claramente, mantenha-os consistentemente, respeite os limites dos outros.

**4. Reparando Confiança**
Se sua compulsão afetou relacionamentos: reconheça o impacto de suas ações, peça desculpas sinceras sem justificativas, demonstre mudança através de ações consistentes, seja paciente — confiança leva tempo para ser reconstruída, aceite que algumas pessoas podem precisar de mais tempo.

**Desenvolvendo Intimidade Genuína:**

A verdadeira intimidade vai além do físico:

**Intimidade Emocional:** Compartilhe seus medos, sonhos e vulnerabilidades. Esteja presente durante momentos difíceis do outro. Celebre conquistas juntos. Pratique empatia ativa.

**Intimidade Intelectual:** Discuta ideias e opiniões. Aprenda algo novo juntos. Respeite perspectivas diferentes.

**Intimidade Experiencial:** Criem memórias compartilhadas. Desenvolvam hobbies em comum. Enfrentem desafios juntos.

**Para Parceiros de Pessoas em Recuperação:**

Se você é parceiro de alguém em recuperação: eduque-se sobre dependência comportamental, cuide da sua própria saúde mental, estabeleça seus próprios limites, considere terapia de casal ou individual, lembre-se: você não é responsável pela recuperação do outro.

**Construindo Novas Conexões:**

Se você está reconstruindo sua vida social: participe de grupos com interesses em comum, seja proativo em manter contato, pratique vulnerabilidade gradual, qualidade sobre quantidade — algumas conexões profundas valem mais que muitas superficiais.

A recuperação não é apenas sobre parar um comportamento — é sobre construir uma vida tão rica e conectada que o comportamento antigo perde seu apelo. Invista em seus relacionamentos. Eles são parte essencial da sua cura.`,
    category: "tip",
    order: 6
  },
  {
    title: "Mindfulness: A Arte de Estar Presente na Recuperação",
    content: `Comportamentos compulsivos frequentemente nos levam para fora do momento presente — seja para fantasias, arrependimentos do passado ou ansiedades sobre o futuro. Mindfulness é a prática de retornar ao agora, e é uma das ferramentas mais poderosas para a recuperação.

**O Que é Mindfulness:**

Mindfulness é a capacidade de prestar atenção ao momento presente, com curiosidade e sem julgamento. Não é sobre esvaziar a mente ou alcançar um estado especial — é simplesmente sobre estar consciente do que está acontecendo agora.

**Por Que Funciona na Recuperação:**

1. **Cria espaço entre impulso e ação**: Em vez de reagir automaticamente, você pode observar o impulso e escolher sua resposta.
2. **Reduz a reatividade emocional**: Você aprende a sentir emoções sem ser dominado por elas.
3. **Aumenta a autoconsciência**: Você percebe gatilhos e padrões mais cedo.
4. **Diminui a ruminação**: Menos tempo preso em pensamentos sobre passado ou futuro.
5. **Melhora a regulação do sistema nervoso**: Ativa a resposta de relaxamento do corpo.

**Práticas de Mindfulness para Iniciantes:**

**1. Respiração Consciente (3 minutos)**
Sente-se confortavelmente, feche os olhos ou mantenha um olhar suave, traga a atenção para sua respiração, note a sensação do ar entrando e saindo. Quando a mente vagar (e vai), gentilmente retorne à respiração. Não há respiração "certa" — apenas observe.

**2. Body Scan (10 minutos)**
Deite-se ou sente-se confortavelmente. Comece pelos pés, notando qualquer sensação. Mova a atenção lentamente pelo corpo: pernas, quadris, abdômen, peito, costas, braços, mãos, pescoço, rosto. Apenas observe, sem tentar mudar nada. Note áreas de tensão ou conforto.

**3. Mindfulness nas Atividades Diárias**
Escolha uma atividade rotineira e faça-a com total atenção: ao escovar os dentes, sinta a escova, o gosto da pasta, o movimento; ao comer, observe cores, texturas, sabores, a sensação de mastigar; ao caminhar, sinta seus pés tocando o chão, o movimento do corpo.

**4. STOP — Técnica de Pausa Mindful**
Use quando sentir um impulso ou estresse: **S**top (Pare o que está fazendo), **T**ake a breath (Respire profundamente), **O**bserve (Observe o que está acontecendo — pensamentos, emoções, sensações), **P**roceed (Prossiga com consciência).

**5. Observação de Pensamentos**
Imagine seus pensamentos como nuvens passando no céu. Você é o céu — vasto e imutável. Os pensamentos vêm e vão; você não precisa segui-los. Note: "Estou tendo o pensamento de que..." Isso cria distância entre você e seus pensamentos.

**Mindfulness para Momentos de Impulso:**

Quando um impulso surgir: pare e reconheça "Estou tendo um impulso", observe onde você sente no corpo, descreva a sensação (é quente? fria? pulsante? apertada?), respire para a área de tensão, lembre-se que impulsos são temporários, observe o impulso diminuir naturalmente.

**Construindo uma Prática Regular:**

Comece pequeno: 3-5 minutos por dia é suficiente para começar, mesmo 1 minuto é melhor que nada, escolha um horário consistente, use aplicativos de meditação guiada se ajudar, seja paciente — é uma habilidade que se desenvolve com prática.

A mente vai vagar — isso não é falha, é oportunidade. Cada vez que você percebe que a mente vagou e gentilmente retorna, você está fortalecendo sua capacidade de escolha consciente. Essa é exatamente a habilidade que você precisa na recuperação.`,
    category: "tip",
    order: 7
  },
  {
    title: "Celebre Cada Passo: Por Que Reconhecer Seu Progresso é Essencial",
    content: `Em uma jornada de recuperação, é fácil focar no que ainda falta conquistar e esquecer de celebrar o quanto você já caminhou. Este post é um lembrete: suas vitórias importam, todas elas.

**Por Que Celebrar é Importante:**

A neurociência nos mostra que celebrar conquistas libera dopamina — o mesmo neurotransmissor envolvido em comportamentos compulsivos. Ao celebrar vitórias saudáveis, você está literalmente retreinando seu cérebro para encontrar prazer em fontes positivas.

**Tipos de Vitórias para Reconhecer:**

**Vitórias de Resistência:** Resistiu a um impulso forte, saiu de uma situação de risco, usou uma técnica de coping em vez de ceder, pediu ajuda quando precisou.

**Vitórias de Tempo:** Completou um dia limpo, alcançou uma semana, chegou a um mês — cada marco temporal é significativo.

**Vitórias de Crescimento:** Identificou um novo gatilho, aprendeu algo sobre si mesmo, teve uma conversa difícil, praticou uma nova habilidade.

**Vitórias de Conexão:** Abriu-se com alguém de confiança, apoiou outro membro da comunidade, fortaleceu um relacionamento, participou ativamente do fórum.

**Vitórias de Autocuidado:** Manteve uma rotina saudável, priorizou o sono, fez exercício, praticou mindfulness.

**O Que Suas Conquistas Significam:**

**1 dia limpo:** Você provou que é possível. Você tem a capacidade de fazer escolhas diferentes.

**1 semana:** Você está desenvolvendo novos padrões. Seu cérebro está começando a se adaptar.

**1 mês:** Você demonstrou compromisso sustentado. Novos hábitos estão se formando.

**3 meses:** Mudanças significativas estão ocorrendo em seu cérebro. Você está construindo uma nova identidade.

**6 meses:** Você está se tornando a pessoa que escolheu ser. A recuperação está se tornando seu modo de vida.

**1 ano:** Você provou que a mudança duradoura é possível. Você é uma inspiração.

**Como Celebrar de Forma Saudável:**

1. **Reconhecimento Interno:** Pause e diga a si mesmo "Eu fiz isso". Permita-se sentir orgulho. Anote a conquista em um diário.

2. **Compartilhe com Outros:** Poste sua vitória no fórum. Conte para sua rede de apoio. Aceite parabéns graciosamente.

3. **Recompensas Tangíveis:** Faça algo que você gosta. Compre algo pequeno para si. Dedique tempo a um hobby.

4. **Rituais de Celebração:** Crie um ritual pessoal para marcos. Pode ser simples: uma xícara de chá especial, uma caminhada em um lugar bonito.

**Uma Nota Sobre Comparação:**

Não compare sua jornada com a de outros. Alguém com 100 dias não é "melhor" que alguém com 10 dias. Cada pessoa enfrenta desafios únicos. O que importa é que você está aqui, tentando, crescendo.

**Para Você, Agora:**

Independentemente de onde você está na sua jornada, há algo para celebrar: se você está no dia 1, celebre a coragem de começar; se você recaiu ontem, celebre a decisão de continuar; se você está há meses limpo, celebre sua persistência.

Você está fazendo algo incrivelmente difícil. Você está escolhendo mudar padrões profundamente enraizados. Você está enfrentando desconforto em busca de uma vida melhor.

Isso merece reconhecimento. Isso merece celebração. **Você merece celebração.**

Parabéns por estar aqui. Parabéns por cada passo. Continue caminhando.`,
    category: "victory",
    order: 8
  },
  {
    title: "Terapia e Apoio Profissional: Quando e Como Buscar Ajuda",
    content: `Buscar ajuda profissional não é sinal de fraqueza — é sinal de sabedoria. Assim como você procuraria um médico para uma condição física, cuidar da saúde mental com apoio especializado é uma decisão inteligente e corajosa.

**Quando Considerar Ajuda Profissional:**

Sinais de que você pode se beneficiar de terapia: dificuldade persistente em manter a recuperação apesar de esforços consistentes, ansiedade ou depressão que interferem no dia a dia, traumas passados que parecem conectados ao comportamento compulsivo, dificuldades significativas em relacionamentos, pensamentos de autolesão ou suicídio (busque ajuda imediatamente), sensação de estar "preso" sem conseguir avançar, outros comportamentos compulsivos surgindo (transferência de dependência), isolamento social crescente.

**Tipos de Profissionais:**

**Psicólogo:** Especialista em saúde mental, oferece psicoterapia, trabalha com padrões de pensamento e comportamento, não prescreve medicação.

**Psiquiatra:** Médico especializado em saúde mental, pode prescrever medicação, indicado quando há necessidade de tratamento medicamentoso, frequentemente trabalha em conjunto com psicólogo.

**Terapeuta Sexual:** Especializado em questões de sexualidade, indicado para dependência de pornografia/sexo, trabalha com intimidade e relacionamentos.

**Abordagens Terapêuticas Eficazes:**

**Terapia Cognitivo-Comportamental (TCC):** Foca em identificar e modificar pensamentos e comportamentos problemáticos. Altamente estruturada e orientada a objetivos. Forte evidência científica para dependências comportamentais.

**Terapia de Aceitação e Compromisso (ACT):** Ensina a aceitar pensamentos e emoções difíceis. Foca em viver de acordo com valores pessoais. Útil para lidar com impulsos sem agir neles.

**Terapia Focada em Trauma:** EMDR (Dessensibilização e Reprocessamento por Movimentos Oculares), Terapia de Exposição. Indicada quando há traumas subjacentes.

**O Que Esperar da Terapia:**

**Primeiras sessões:** Avaliação inicial e histórico, estabelecimento de objetivos, construção de rapport (conexão).

**Processo terapêutico:** Exploração de padrões e gatilhos, desenvolvimento de estratégias, trabalho em questões subjacentes, prática de novas habilidades.

**Resultados:** Mudança leva tempo — seja paciente. Pode haver desconforto antes de melhora. Progresso nem sempre é linear. Comunicação aberta com o terapeuta é essencial.

**Recursos Disponíveis no Pare!:**

**Chat com Psicólogos (Plano Premium e Elite):** Acesso a profissionais especializados, suporte entre sessões, orientação e acolhimento.

**Sessões de Videochamada (Plano Elite):** Atendimento individual por vídeo, continuidade de cuidado, flexibilidade de horários.

**Superando Barreiras:**

"Não tenho dinheiro" — Explore opções de atendimento social ou universitário. Considere nossos planos com acesso a profissionais. Investir em saúde mental é investir em qualidade de vida.

"Tenho vergonha de falar sobre isso" — Profissionais são treinados para ouvir sem julgamento. Confidencialidade é garantida por lei. Você não é o primeiro nem o último a buscar ajuda para isso.

"Deveria conseguir sozinho" — Buscar ajuda é força, não fraqueza. Atletas têm técnicos; por que você não teria apoio? Algumas questões realmente precisam de orientação especializada.

Você não precisa fazer isso sozinho. Há pessoas treinadas e dispostas a ajudar. Dar esse passo pode ser o que falta para transformar sua recuperação.`,
    category: "tip",
    order: 9
  },
  {
    title: "Além da Abstinência: Construindo uma Vida Significativa",
    content: `A recuperação não é apenas sobre parar um comportamento — é sobre construir uma vida tão rica e significativa que o comportamento antigo perde seu apelo. Este é o segredo das pessoas que não apenas param, mas prosperam.

**O Vazio que a Compulsão Preenchia:**

Comportamentos compulsivos frequentemente servem como: escape de emoções difíceis, fonte de prazer e excitação, forma de lidar com tédio, maneira de se sentir no controle, fuga de uma vida que parece vazia. Simplesmente remover o comportamento deixa um vazio. A recuperação sustentável requer preencher esse vazio com algo melhor.

**Descobrindo Seus Valores:**

Valores são como uma bússola — eles guiam suas escolhas e dão direção à sua vida. Pergunte-se: O que é verdadeiramente importante para você? Que tipo de pessoa você quer ser? O que você quer que as pessoas digam sobre você? Se você tivesse tempo e recursos ilimitados, o que faria?

**Áreas de Vida para Cultivar:**

**1. Relacionamentos** (Família, amizades, relacionamento romântico, comunidade)
Pergunte: Como posso ser um melhor parceiro, amigo, filho, pai?

**2. Trabalho/Carreira** (Realização profissional, contribuição, crescimento, propósito)
Pergunte: O que me dá senso de realização? Como posso contribuir mais?

**3. Saúde** (Física, mental, emocional, espiritual)
Pergunte: Como posso cuidar melhor do meu corpo e mente?

**4. Crescimento Pessoal** (Aprendizado, habilidades, autoconhecimento, desafios)
Pergunte: O que quero aprender? Como quero crescer?

**5. Lazer e Prazer** (Hobbies, diversão, criatividade, aventura)
Pergunte: O que me traz alegria genuína?

**6. Contribuição** (Voluntariado, ajudar outros, deixar um legado, fazer diferença)
Pergunte: Como posso contribuir para algo maior que eu?

**O Papel do Propósito na Recuperação:**

Pesquisas mostram que pessoas com forte senso de propósito têm melhor saúde mental, são mais resilientes a adversidades, mantêm mudanças comportamentais por mais tempo, e relatam maior satisfação com a vida.

Seu propósito não precisa ser grandioso. Pode ser: ser o melhor pai/mãe possível, ajudar outros em recuperação, criar algo belo, fazer diferença em sua comunidade, simplesmente viver com integridade.

**Preenchendo o Tempo:**

O tempo que antes era consumido pelo comportamento compulsivo agora está disponível. Use-o intencionalmente:

**Atividades que nutrem:** Exercício físico, tempo na natureza, práticas criativas, aprendizado de novas habilidades, conexão social significativa, voluntariado, meditação/práticas espirituais.

**Atividades a evitar ou limitar:** Tempo excessivo em telas sem propósito, isolamento, ambientes de alto risco, relacionamentos tóxicos.

**Uma Reflexão Final:**

Imagine-se daqui a um ano. Você está livre do comportamento compulsivo. Como é sua vida? O que você está fazendo? Com quem você está? Como você se sente? O que você conquistou?

Essa visão é seu norte. Cada dia de recuperação é um passo em direção a ela. Cada escolha saudável está construindo essa realidade.

Você não está apenas parando algo — você está construindo algo. Uma vida com significado, conexão e propósito. Uma vida que vale a pena viver plenamente, sem precisar escapar dela.

Essa vida está ao seu alcance. Continue caminhando em direção a ela.

Com esperança e confiança em você,
**Equipe Pare!**`,
    category: "motivation",
    order: 10
  }
];

async function seedForumPosts() {
  console.log('Iniciando seed dos posts fixos do fórum...');
  
  try {
    // Primeiro, remover posts fixos existentes (se houver)
    const existingPinned = await db.collection('forum_posts')
      .where('isPinned', '==', true)
      .get();
    
    if (!existingPinned.empty) {
      console.log(`Removendo ${existingPinned.size} posts fixos existentes...`);
      const batch = db.batch();
      existingPinned.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    }
    
    // Criar os novos posts fixos
    console.log(`Criando ${forumPosts.length} posts fixos...`);
    
    for (const post of forumPosts) {
      const postData = {
        title: post.title,
        content: post.content,
        category: post.category,
        authorId: 'system',
        authorName: 'Equipe Pare!',
        authorLevel: 99,
        authorDays: 999,
        likes: [],
        likesCount: 0,
        repliesCount: 0,
        isPinned: true,
        pinnedOrder: post.order,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const docRef = await db.collection('forum_posts').add(postData);
      console.log(`✓ Post criado: "${post.title.substring(0, 50)}..." (ID: ${docRef.id})`);
    }
    
    // Atualizar estatísticas do fórum
    const statsRef = db.collection('forum_stats').doc('global');
    const statsDoc = await statsRef.get();
    
    if (statsDoc.exists) {
      const currentPosts = statsDoc.data().totalPosts || 0;
      await statsRef.update({
        totalPosts: currentPosts + forumPosts.length,
        updatedAt: new Date()
      });
    } else {
      await statsRef.set({
        totalPosts: forumPosts.length,
        totalReplies: 0,
        updatedAt: new Date()
      });
    }
    
    console.log('\\n✅ Seed concluído com sucesso!');
    console.log(`Total de posts fixos criados: ${forumPosts.length}`);
    
  } catch (error) {
    console.error('Erro ao fazer seed dos posts:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

seedForumPosts();
