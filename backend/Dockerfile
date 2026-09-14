# ==============================================================================
# QUIZZBOARD BACKEND DOCKERFILE (Multi-Stage Build Spring Boot 3 & Java 21)
# ==============================================================================

# Étape 1 : Build Maven
FROM maven:3.9-eclipse-temurin-21-alpine AS builder
WORKDIR /app

# Cache des dépendances Maven
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Compilation et packaging du JAR
COPY src ./src
RUN mvn clean package -DskipTests -B

# Étape 2 : Runtime léger JRE 21
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Utilisateur non-root pour la sécurité
RUN addgroup -S spring && adduser -S spring -G spring
RUN mkdir -p /app/uploads && chown -R spring:spring /app
USER spring:spring

COPY --from=builder /app/target/*.jar app.jar

ENV SERVER_PORT=8080
EXPOSE 8080

ENTRYPOINT ["java", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
