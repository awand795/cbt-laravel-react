FROM node:22-alpine

# Atur working directory
WORKDIR /app

# Salin file package.json dan package-lock.json
COPY package*.json ./

# Instal dependensi NPM
RUN npm install

# Salin semua file proyek ke dalam container
COPY . .

# Expose port Vite
EXPOSE 5173

# Jalankan server Vite development (host 0.0.0.0 agar bisa diakses dari luar container)
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
