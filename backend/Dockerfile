# syntax=docker/dockerfile:1

# ---- build stage ----
FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -B -q dependency:go-offline
COPY src ./src
RUN mvn -B -q -DskipTests package

# ---- runtime stage ----
FROM eclipse-temurin:21-jre-jammy
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      libreoffice-impress \
      fonts-dejavu-core \
      curl \
 && rm -rf /var/lib/apt/lists/* \
 && useradd -r -u 1001 -m app \
 && mkdir -p /app/.data \
 && chown -R app:app /app

WORKDIR /app
COPY --from=build /app/target/it25patok-api-*.jar app.jar
USER app

# Spring Boot reads SPRING_PROFILES_ACTIVE; the base application.yml already
# contains production defaults (D1 cloudflare mode, Drive storage, SMTP mail).
# Without application-<profile>.yml on purpose: only base config applies.
ENV SPRING_PROFILES_ACTIVE=prod \
    PORT=8080

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=5 \
  CMD curl -fsS "http://127.0.0.1:${PORT:-8080}/actuator/health" || exit 1

ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]
