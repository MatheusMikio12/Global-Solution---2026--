# Dockerfile — Frontend (React + Vite)
FROM node:20-slim

WORKDIR /app

# Instala dependências primeiro (cache layer)
COPY package.json package-lock.json* ./
RUN npm install

# Copia o restante do código
COPY . .

EXPOSE 3000

# Vite precisa de --host 0.0.0.0 para ser acessível fora do container
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
