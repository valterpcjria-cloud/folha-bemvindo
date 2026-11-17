# FOLHA BEM VINDO — imagem da aplicação (tela React + API PHP)
# Mesmo desenho da Hostgator: tela na raiz do site, API em /backend/v1 (os .htaccess continuam valendo).

# ---- 1) Monta a tela (React/Vite) ----
FROM node:22-alpine AS tela
WORKDIR /app
COPY package.json package-lock.json ./
# --legacy-peer-deps: conflito antigo jspdf-autotable x jspdf 4 (mesma instalação da Frimelo)
RUN npm ci --no-audit --no-fund --legacy-peer-deps
COPY . .
RUN npx vite build

# ---- 2) Servidor: Apache + PHP 8.3 ----
FROM php:8.3-apache

ENV TZ=America/Sao_Paulo
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone \
    && docker-php-ext-install pdo_mysql \
    && a2enmod rewrite headers remoteip \
    && mv "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini"

COPY docker/php-bemvindo.ini "$PHP_INI_DIR/conf.d/zz-bemvindo.ini"
COPY docker/apache-bemvindo.conf /etc/apache2/conf-available/zz-bemvindo.conf
# "zz-" para ser lido depois do security.conf padrão (senão a versão do Apache volta a aparecer)
RUN a2enconf zz-bemvindo

WORKDIR /var/www/html
COPY --from=tela /app/dist/ ./
COPY backend/ ./backend/
# Scripts de linha de comando (fora do site: não acessíveis pelo navegador)
COPY docker/scripts/ /opt/bemvindo-scripts/

# Logs de erro do PHP/banco gravados pela aplicação
RUN mkdir -p backend/v1/sys_logs \
    && chown -R www-data:www-data backend/v1/sys_logs

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD curl -fsS http://127.0.0.1/backend/v1/status > /dev/null || exit 1
