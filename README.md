# desafio-essentia-tecnologies

# TechX - To Do List

## Tecnologias
- Angular
- Node.js
- TypeScript
- MySQL
- Prisma ORM
- JWT (Auth)

## Variáveis de ambiente
- RENOMEIE o arquivo `.env.example` para `.env` na raiz do diretório `desafio-essentia-tecnologies`.
- RENOMEIE o arquivo `.env.example` para `.env` na raiz do diretório `backend`.

## Como rodar o banco de dados
na raiz do diretório `desafio-essentia-tecnologies`, execute:
```bash
docker compose --env-file .env up -d
```
## Como rodar o backend
```bash
cd backend
npm install
npm run prisma:migrate
npm run dev
```

## Como rodar o frontend
```bash
cd frontend
npm install
npm start
```

## Imagens

![Login](assets/login.png)

![Visual](assets/visual.png)

