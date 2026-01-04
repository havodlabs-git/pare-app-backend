# Pare! Backend API

Backend API REST para o aplicativo **Pare!** - Controle de vícios.

## 🚀 Tecnologias

- **Node.js** com ES Modules
- **Express.js** - Framework web
- **MongoDB** com Mongoose - Banco de dados
- **JWT** - Autenticação
- **bcryptjs** - Hash de senhas
- **Helmet** - Segurança HTTP
- **CORS** - Cross-Origin Resource Sharing
- **Rate Limiting** - Proteção contra abuso
- **Morgan** - Logging de requisições

## 📦 Instalação

```bash
# Instalar dependências
npm install

# Copiar arquivo de ambiente
cp .env.example .env

# Editar variáveis de ambiente
nano .env
```

## ⚙️ Configuração

Edite o arquivo `.env` com suas configurações:

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/pare-app
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173,https://pare-app-483321.web.app
```

## 🏃 Executar

```bash
# Desenvolvimento (com nodemon)
npm run dev

# Produção
npm start
```

## 📚 Estrutura do Projeto

```
pare-app-backend/
├── src/
│   ├── config/
│   │   └── database.js          # Configuração do MongoDB
│   ├── controllers/
│   │   └── auth.controller.js   # Lógica de autenticação
│   ├── middleware/
│   │   └── auth.middleware.js   # Middleware de autenticação
│   ├── models/
│   │   ├── User.model.js        # Modelo de usuário
│   │   └── Module.model.js      # Modelo de módulo
│   ├── routes/
│   │   ├── auth.routes.js       # Rotas de autenticação
│   │   ├── user.routes.js       # Rotas de usuário
│   │   ├── module.routes.js     # Rotas de módulos
│   │   ├── achievement.routes.js # Rotas de conquistas
│   │   └── forum.routes.js      # Rotas de fórum
│   ├── utils/                   # Utilitários
│   └── server.js                # Arquivo principal
├── .env.example                 # Exemplo de variáveis de ambiente
├── .gitignore
├── package.json
└── README.md
```

## 🔐 Autenticação

A API usa **JWT (JSON Web Tokens)** para autenticação.

### Endpoints de Autenticação

#### Registro
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "João Silva",
  "email": "joao@example.com",
  "password": "senha123"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "joao@example.com",
  "password": "senha123"
}
```

#### Obter Usuário Atual
```http
GET /api/auth/me
Authorization: Bearer {token}
```

## 📡 Endpoints da API

### Autenticação (`/api/auth`)
- `POST /register` - Registrar novo usuário
- `POST /login` - Fazer login
- `GET /me` - Obter dados do usuário atual (protegido)

### Usuários (`/api/users`)
- `GET /profile` - Obter perfil do usuário (protegido)
- `PUT /profile` - Atualizar perfil (protegido)
- `DELETE /account` - Deletar conta (protegido)
- `PUT /password` - Alterar senha (protegido)

### Módulos (`/api/modules`)
- `GET /` - Listar todos os módulos do usuário (protegido)
- `POST /` - Criar novo módulo (protegido)
- `GET /:id` - Obter módulo específico (protegido)
- `PUT /:id` - Atualizar módulo (protegido)
- `DELETE /:id` - Deletar módulo (protegido)
- `POST /:id/relapse` - Registrar recaída (protegido)
- `POST /:id/checkin` - Check-in manual (protegido)

### Conquistas (`/api/achievements`)
- `GET /` - Listar todas as conquistas (protegido)
- `GET /user` - Obter conquistas do usuário (protegido)
- `POST /unlock/:id` - Desbloquear conquista (protegido)

### Fórum (`/api/forum`)
- `GET /posts` - Listar posts (protegido)
- `POST /posts` - Criar post (protegido)
- `GET /posts/:id` - Obter post específico (protegido)
- `PUT /posts/:id` - Atualizar post (protegido)
- `DELETE /posts/:id` - Deletar post (protegido)
- `POST /posts/:id/comments` - Adicionar comentário (protegido)
- `POST /posts/:id/like` - Curtir/descurtir post (protegido)

## 🔒 Segurança

- **Helmet** - Headers de segurança HTTP
- **Rate Limiting** - Limite de requisições por IP
- **CORS** - Controle de origens permitidas
- **JWT** - Tokens com expiração
- **bcrypt** - Hash de senhas com salt
- **Validação de inputs** - Proteção contra injeção

## 🗄️ Modelos de Dados

### User (Usuário)
```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  plan: String (free|premium|elite),
  planExpiresAt: Date,
  isActive: Boolean,
  lastLogin: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Module (Módulo)
```javascript
{
  user: ObjectId (ref: User),
  moduleId: String (pornography|social_media|smoking|alcohol|shopping),
  startDate: Date,
  dayCount: Number,
  level: Number,
  points: Number,
  longestStreak: Number,
  currentStreak: Number,
  totalRelapses: Number,
  lastCheckIn: Date,
  relapseHistory: [{
    date: Date,
    daysSinceLast: Number,
    notes: String
  }],
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

## 🚧 TODO

- [ ] Implementar controllers completos para módulos
- [ ] Implementar sistema de conquistas
- [ ] Implementar fórum comunitário
- [ ] Adicionar validação de inputs com express-validator
- [ ] Implementar upload de avatar
- [ ] Adicionar testes unitários e de integração
- [ ] Implementar notificações push
- [ ] Adicionar sistema de amigos/accountability partners
- [ ] Implementar chat em tempo real (Socket.io)
- [ ] Adicionar integração com pagamentos (Stripe)
- [ ] Implementar sistema de relatórios
- [ ] Adicionar logs estruturados
- [ ] Implementar cache com Redis
- [ ] Adicionar documentação com Swagger/OpenAPI

## 📝 Licença

Este projeto está em desenvolvimento.

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor, abra uma issue ou pull request.

## 📧 Contato

Para dúvidas ou sugestões, entre em contato.
