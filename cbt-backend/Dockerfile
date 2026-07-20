FROM php:8.4-cli

# Instal dependensi sistem
RUN apt-get update && apt-get install -y \
    git \
    curl \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    zip \
    unzip \
    libpq-dev \
    postgresql-client

# Bersihkan cache apt
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

# Instal ekstensi PHP (pgsql untuk PostgreSQL)
RUN docker-php-ext-install pdo pdo_pgsql mbstring exif pcntl bcmath gd

# Instal Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Atur working directory
WORKDIR /var/www

# Salin file proyek ke dalam container
COPY . /var/www

# Instal dependensi Laravel (abaikan error script jika belum siap)
RUN composer install --no-interaction --optimize-autoloader

# Expose port 8000
EXPOSE 8000

# Perintah untuk menjalankan server lokal Laravel
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
