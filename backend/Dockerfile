# Stage 1: build the jar (tests already ran in the Jenkins "Backend Tests" stage)
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn -q -B -DskipTests package

# Stage 2: slim runtime, non-root
FROM eclipse-temurin:17-jre
RUN useradd --system --uid 10001 spendwise
WORKDIR /app
COPY --from=build /app/target/spendwise.jar app.jar
USER spendwise
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
